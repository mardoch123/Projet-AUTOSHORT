

import React, { useState, useEffect, useRef } from 'react';
import { VideoJob, JobStatus, SocialPlatform, VideoType, GamificationStats } from '../types';
import { generateStructuredScript, generateVoiceover, generateAllScenes } from '../services/geminiService';
import { AD_FREQUENCY, EDU_EASY_AD_SCRIPT } from '../constants';
import { Gamification } from './Gamification';
import { LucideWand2, LucideLoader, LucideCheckCircle, LucideDownload, LucideCalendarClock, LucideShare2, LucideSparkles, LucideGraduationCap, LucideBriefcase, LucideBookOpen, LucideLightbulb, LucideVideo, LucideFacebook, LucideYoutube, LucideDice5, LucideZap, LucideFlame, LucideRocket, LucideGhost, LucideGitCompare, LucideCloudRain } from 'lucide-react';

interface CreateStudioProps {
  totalVideos: number;
  incrementTotal: () => void;
  addJob: (job: VideoJob) => void;
  tiktokConnected: boolean;
  gamificationStats: GamificationStats;
  onGainXp: (amount: number) => void;
  pendingAutoTask: 'morning' | 'evening' | null; // NEW: Task received from App
  onAutoTaskComplete: (slot: 'morning' | 'evening') => void; // NEW: Callback when done
}

export const CreateStudio: React.FC<CreateStudioProps> = ({ 
    totalVideos, 
    incrementTotal, 
    addJob, 
    tiktokConnected, 
    gamificationStats, 
    onGainXp,
    pendingAutoTask,
    onAutoTaskComplete
}) => {
  const [videoType, setVideoType] = useState<VideoType>('SCHOOL_TIPS');
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [viralMode, setViralMode] = useState(false); // NEW STATE FOR VIRAL MODE
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([SocialPlatform.TIKTOK]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generatedJob, setGeneratedJob] = useState<VideoJob | null>(null);
  const [progress, setProgress] = useState(0);

  // --- SEAMLESS PLAYER STATE ---
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- AUTOMATION LISTENER ---
  useEffect(() => {
    if (pendingAutoTask && !isProcessing) {
        // Determine type based on slot
        // Morning = School Tips, Evening = Business/Motivation
        const targetType: VideoType = pendingAutoTask === 'morning' ? 'SCHOOL_TIPS' : 'BUSINESS_SUCCESS';
        console.log(`🚀 Starting Auto-Task for ${pendingAutoTask} slot: ${targetType}`);
        
        // Ensure we have at least one platform selected for auto-mode
        if (selectedPlatforms.length === 0) {
            setSelectedPlatforms([SocialPlatform.TIKTOK]);
        }
        
        // Auto tasks always try to be viral for performance
        setViralMode(true);
        handleAutoGenerate(targetType, pendingAutoTask);
    }
  }, [pendingAutoTask]);

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // --- MAGIC MODE (RANDOMIZER) ---
  const handleMagicMode = () => {
      const types: VideoType[] = [
          'SCHOOL_TIPS', 'BUSINESS_SUCCESS', 'GENERAL_CULTURE', 'MOTIVATION',
          'SCARY_STORY', 'WOULD_YOU_RATHER', 'SHOWER_THOUGHTS'
      ];
      const randomType = types[Math.floor(Math.random() * types.length)];
      setVideoType(randomType);
      // Randomly enable viral mode for fun
      setViralMode(Math.random() > 0.5);
      
      // Visual feedback
      const btn = document.getElementById('magic-btn');
      if(btn) {
          btn.classList.add('animate-spin');
          setTimeout(() => btn.classList.remove('animate-spin'), 500);
      }
  };

  // --- MERGING UTILS ---
  const mergeVideosToSingleFile = async (videoUrls: string[]): Promise<string | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 720; // Veo standard
            canvas.height = 1280;
            const ctx = canvas.getContext('2d');
            const dest = canvas.captureStream(30); // 30 FPS
            const mediaRecorder = new MediaRecorder(dest, { mimeType: 'video/webm;codecs=vp9' });
            
            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                resolve(url);
            };

            mediaRecorder.start();

            // Hidden player for recording
            const hiddenVideo = document.createElement('video');
            hiddenVideo.crossOrigin = "anonymous";
            hiddenVideo.muted = true;
            
            for (const url of videoUrls) {
                hiddenVideo.src = url;
                await new Promise<void>((r) => {
                    hiddenVideo.onloadeddata = () => {
                        hiddenVideo.play();
                        
                        const draw = () => {
                            if (hiddenVideo.paused || hiddenVideo.ended) return;
                            ctx?.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                            requestAnimationFrame(draw);
                        };
                        draw();
                    };
                    hiddenVideo.onended = () => r();
                });
            }
            
            mediaRecorder.stop();
        } catch (e) {
            console.error("Merge failed", e);
            resolve(undefined); 
        }
    });
  };

  // Modified to accept optional overrideType for Automation
  const handleAutoGenerate = async (overrideType?: VideoType, autoSlot?: 'morning' | 'evening') => {
    const finalType = overrideType || videoType;
    // Default platforms if none selected (shouldn't happen in UI but good for safety)
    const activePlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : [SocialPlatform.TIKTOK];

    try {
      const win = window as any;
      if (win.aistudio) {
         const hasKey = await win.aistudio.hasSelectedApiKey();
         if (!hasKey) await win.aistudio.openSelectKey();
      }
    } catch (e) { console.error("API Key check failed", e); }

    setIsProcessing(true);
    setGeneratedJob(null);
    setSceneIndex(0);
    setActivePlayer('A');
    setProgress(5);

    const nextCount = totalVideos + 1;
    const injectAd = nextCount > 0 && nextCount % AD_FREQUENCY === 0;

    const newJob: VideoJob = {
      id: crypto.randomUUID(),
      prompt: `Auto-Trend: ${finalType}`,
      type: finalType,
      createdAt: Date.now(),
      status: JobStatus.GENERATING_SCRIPT,
      content: { script: '', audioBase64: null, videoUris: [], scenes: [] },
      platforms: activePlatforms,
      injectAd,
      autoSchedule,
      viralMode: viralMode, // Save state
    };

    try {
      // 1. Script
      const categoryName = finalType === 'SCHOOL_TIPS' ? 'Conseils Scolaires (Étudiants)' : 
                          finalType === 'BUSINESS_SUCCESS' ? 'Histoire de Marque/Succès Business' :
                          finalType === 'GENERAL_CULTURE' ? 'Culture Générale Éducative' :
                          finalType === 'MOTIVATION' ? 'Motivation Travail' :
                          finalType === 'SCARY_STORY' ? 'Horreur & Creepypasta' :
                          finalType === 'WOULD_YOU_RATHER' ? 'Tu préfères ? (Dilemme)' :
                          'Pensées de Douche';
                          
      setCurrentStep(`[AUTO] Recherche sujet viral ${viralMode ? '🔥' : ''} : ${categoryName}...`);
      
      // PASS VIRAL MODE TO SERVICE
      const structuredData = await generateStructuredScript(finalType, injectAd, EDU_EASY_AD_SCRIPT, viralMode);
      
      newJob.prompt = structuredData.trending_topic; 
      newJob.content.script = structuredData.full_script;
      newJob.content.scenes = structuredData.scenes;
      newJob.content.trendingTopic = structuredData.trending_topic;
      newJob.content.characterDescription = structuredData.character_description;
      setProgress(25);

      // 2. Audio
      setCurrentStep('Synthèse vocale (Kore - Voix Naturelle)...');
      newJob.status = JobStatus.GENERATING_AUDIO;
      const audioData = await generateVoiceover(structuredData.full_script);
      newJob.content.audioBase64 = audioData;
      setProgress(40);

      // 3. Videos
      newJob.status = JobStatus.GENERATING_VIDEO;
      setCurrentStep(`Génération de ${structuredData.scenes.length} scènes HD (Veo)...`);
      const videos = await generateAllScenes(structuredData.scenes);
      newJob.content.videoUris = videos;
      setProgress(90);

      // 4. Finishing
      setCurrentStep('Préparation du lecteur unifié...');
      newJob.status = JobStatus.READY_TO_PUBLISH;
      incrementTotal();
      addJob(newJob);
      setGeneratedJob(newJob);
      
      // GAMIFICATION REWARD
      // Bonus XP for Viral Mode
      onGainXp(viralMode ? 75 : 50);

      if (videoRefA.current && videos.length > 0) {
          videoRefA.current.src = videos[0];
          videoRefA.current.load();
      }
      if (videoRefB.current && videos.length > 1) {
          videoRefB.current.src = videos[1];
          videoRefB.current.load();
      }

      setCurrentStep(`Terminé ! +${viralMode ? '75' : '50'} XP 🌟`);
      setProgress(100);

      // Notify App that auto-task is done
      if (autoSlot) {
          onAutoTaskComplete(autoSlot);
      }

    } catch (error: any) {
      setCurrentStep('Erreur lors de la génération.');
      console.error(error);
      const errorMessage = JSON.stringify(error) + (error.message || "");
      
      if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
        setCurrentStep("Erreur : Clé API invalide. Sélectionnez une clé payante.");
        const win = window as any;
        if (win.aistudio) await win.aistudio.openSelectKey();
      } else if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
         setCurrentStep("Erreur : Quota API dépassé (429).");
         alert("⚠️ QUOTA DÉPASSÉ\n\nVous avez atteint la limite de requêtes de l'API Google Gemini/Veo.\n\nLe système a tenté de réessayer, mais le serveur est toujours saturé. Veuillez attendre 1 à 2 minutes avant de réessayer.");
      } else {
         setCurrentStep("Erreur technique. Voir console.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- SEAMLESS PLAYBACK LOGIC ---
  const playAll = () => {
      setIsPlaying(true);
      setSceneIndex(0);
      setActivePlayer('A');
      
      if (videoRefA.current && generatedJob) {
          videoRefA.current.src = generatedJob.content.videoUris[0];
          videoRefA.current.currentTime = 0;
          videoRefA.current.play().catch(e => console.error("Play error", e));
      }
      if (videoRefB.current && generatedJob && generatedJob.content.videoUris.length > 1) {
          videoRefB.current.src = generatedJob.content.videoUris[1];
          videoRefB.current.load();
      }
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Audio error", e));
      }
  };

  const handleVideoEnded = (player: 'A' | 'B') => {
      if (!generatedJob) return;
      
      const nextIndex = sceneIndex + 1;
      
      if (nextIndex < generatedJob.content.videoUris.length) {
          const nextPlayer = player === 'A' ? 'B' : 'A';
          setActivePlayer(nextPlayer);
          setSceneIndex(nextIndex);
          
          const videoToPlay = nextPlayer === 'A' ? videoRefA.current : videoRefB.current;
          videoToPlay?.play();

          const followingIndex = nextIndex + 1;
          if (followingIndex < generatedJob.content.videoUris.length) {
              const videoToLoad = player === 'A' ? videoRefA.current : videoRefB.current;
              if (videoToLoad) {
                  videoToLoad.src = generatedJob.content.videoUris[followingIndex];
                  videoToLoad.load();
              }
          }
      } else {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
      }
  };

  const handleDownloadMerged = async () => {
    if (!generatedJob) return;
    
    if (!generatedJob.content.mergedVideoUri) {
        const btn = document.getElementById('dl-btn');
        if (btn) btn.innerText = "Fusion en cours (Patientez)...";
        
        const mergedUrl = await mergeVideosToSingleFile(generatedJob.content.videoUris);
        
        if (mergedUrl) {
            generatedJob.content.mergedVideoUri = mergedUrl;
        }
    }

    if (generatedJob.content.mergedVideoUri) {
        const a = document.createElement('a');
        a.href = generatedJob.content.mergedVideoUri;
        a.download = `autoshorts-${generatedJob.content.trendingTopic?.replace(/\s+/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        const btn = document.getElementById('dl-btn');
        if (btn) btn.innerHTML = '<span class="mr-2">📥</span> Vidéo Combinée Téléchargée';
    } else {
        alert("Erreur de fusion. Téléchargement de la scène 1.");
         const a = document.createElement('a');
        a.href = generatedJob.content.videoUris[0];
        a.download = `scene-1.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Gamification Header */}
      <Gamification stats={gamificationStats} />

      {/* AUTO TASK NOTIFICATION */}
      {pendingAutoTask && (
          <div className="mb-6 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-500 rounded-lg p-4 flex items-center animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <div className="bg-emerald-500 rounded-full p-2 mr-4">
                  <LucideZap className="text-white" size={24} />
              </div>
              <div>
                  <h4 className="text-emerald-400 font-bold text-lg">🚀 Rattrapage Temporel Activé !</h4>
                  <p className="text-emerald-200 text-sm">
                      Vous étiez absent pour le créneau du <strong>{pendingAutoTask === 'morning' ? 'Matin' : 'Soir'}</strong>. 
                      L'IA génère votre vidéo maintenant pour combler le retard.
                  </p>
              </div>
          </div>
      )}

      <div className="mb-8 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold text-white">Studio Création</h2>
            <p className="text-slate-400 mt-2">Générez automatiquement des vidéos virales (Éducation & Divertissement).</p>
        </div>
        <button 
            onClick={handleMagicMode}
            className="flex items-center text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors bg-pink-900/20 px-4 py-2 rounded-full border border-pink-500/30"
        >
            <LucideDice5 id="magic-btn" className="mr-2" /> Mode "J'ai de la chance"
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-primary-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <LucideSparkles className="mr-2 text-yellow-400" />
                1. Choisissez le format
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-2">
                <button
                    onClick={() => setVideoType('SCHOOL_TIPS')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'SCHOOL_TIPS' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideGraduationCap className="mb-1" size={20} />
                    <span>École</span>
                </button>
                
                <button
                    onClick={() => setVideoType('BUSINESS_SUCCESS')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'BUSINESS_SUCCESS' 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideBriefcase className="mb-1" size={20} />
                    <span>Business</span>
                </button>

                <button
                    onClick={() => setVideoType('GENERAL_CULTURE')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'GENERAL_CULTURE' 
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideBookOpen className="mb-1" size={20} />
                    <span>Culture G</span>
                </button>
            </div>
            
            {/* NEW FUN FORMATS ROW */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                 <button
                    onClick={() => setVideoType('SCARY_STORY')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'SCARY_STORY' 
                        ? 'bg-red-900 border-red-500 text-red-100 shadow-lg shadow-red-900/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideGhost className="mb-1" size={20} />
                    <span>Horreur 👻</span>
                </button>

                 <button
                    onClick={() => setVideoType('WOULD_YOU_RATHER')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'WOULD_YOU_RATHER' 
                        ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideGitCompare className="mb-1" size={20} />
                    <span>Tu Préfères ?</span>
                </button>

                 <button
                    onClick={() => setVideoType('SHOWER_THOUGHTS')}
                    className={`text-xs font-bold py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        videoType === 'SHOWER_THOUGHTS' 
                        ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                >
                    <LucideCloudRain className="mb-1" size={20} />
                    <span>Pensées 🚿</span>
                </button>
            </div>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <LucideRocket className="mr-2 text-primary-400" />
                2. Boost & Diffusion
            </h3>

            {/* VIRAL MODE TOGGLE */}
            <div className={`mb-6 rounded-lg p-4 border transition-all ${viralMode ? 'bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-500/50 shadow-lg shadow-red-900/20' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-colors ${viralMode ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                            <LucideFlame size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white flex items-center">
                                Mode Viral (Hooks Explosifs)
                                {viralMode && <span className="ml-2 text-[10px] bg-red-500 text-white px-2 rounded-full uppercase">Activé</span>}
                            </div>
                            <p className="text-xs text-slate-400">
                                {viralMode ? "Génère des accroches agressives et des appels à l'action forcés." : "Mode standard, ton équilibré."}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViralMode(!viralMode)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${viralMode ? 'bg-red-500' : 'bg-slate-700'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${viralMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
                <button 
                  onClick={() => togglePlatform(SocialPlatform.TIKTOK)}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-all ${selectedPlatforms.includes(SocialPlatform.TIKTOK) ? 'bg-[#000000] border-slate-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                    <span className="text-xs font-bold">TikTok</span>
                </button>
                <button 
                  onClick={() => togglePlatform(SocialPlatform.YOUTUBE)}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-all ${selectedPlatforms.includes(SocialPlatform.YOUTUBE) ? 'bg-[#FF0000]/10 border-red-500 text-red-500 shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    <LucideYoutube className="w-5 h-5 mr-2" />
                    <span className="text-xs font-bold">Shorts</span>
                </button>
                 <button 
                  onClick={() => togglePlatform(SocialPlatform.FACEBOOK)}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-all ${selectedPlatforms.includes(SocialPlatform.FACEBOOK) ? 'bg-[#1877F2]/10 border-blue-500 text-blue-500 shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    <LucideFacebook className="w-5 h-5 mr-2" />
                    <span className="text-xs font-bold">Facebook</span>
                </button>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-6">
                <h4 className="text-xs text-slate-500 font-bold uppercase mb-2">Planning Automatique (Mode Rattrapage)</h4>
                <div className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-600/50">
                    <div className="flex items-center">
                        <LucideCalendarClock className="text-primary-400 mr-2" size={16}/>
                        <div className="text-xs">
                            <span className="text-white block font-bold">2 Vidéos / Jour</span>
                            <span className="text-slate-400">08:00 (École) & 18:00 (Business)</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setAutoSchedule(!autoSchedule)}
                        className={`text-xs px-2 py-1 rounded font-bold transition-colors ${autoSchedule ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                    >
                        {autoSchedule ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500">
                Prochaine Pub (1/3) dans : <span className="text-white font-mono">{AD_FREQUENCY - (totalVideos % AD_FREQUENCY)}</span> vidéos
              </div>
              <button
                onClick={() => handleAutoGenerate()}
                disabled={isProcessing}
                className={`flex items-center px-8 py-4 rounded-xl font-bold text-white text-lg transition-all shadow-xl ${
                  isProcessing
                    ? 'bg-slate-700 cursor-wait'
                    : viralMode 
                        ? 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:shadow-red-500/40 hover:scale-105 animate-pulse-slow'
                        : 'bg-gradient-to-r from-pink-600 via-purple-600 to-primary-600 hover:shadow-primary-500/40 hover:scale-105'
                }`}
              >
                {isProcessing ? (
                  <>
                    <LucideLoader className="animate-spin mr-2" size={20} /> Production...
                  </>
                ) : (
                  <>
                    <LucideWand2 className="mr-2" size={20} /> {viralMode ? 'CRÉER (VIRAL)' : 'CRÉER'}
                  </>
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="mt-6 animate-pulse">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="text-primary-400 font-bold">{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${viralMode ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'}`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-5">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg min-h-[600px] flex flex-col relative">
            {!generatedJob ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                <LucideVideo size={64} className="mb-4" />
                <p className="text-center font-medium">Zone de Prévisualisation<br/><span className="text-xs">Le résultat apparaîtra ici</span></p>
                </div>
            ) : (
                <div className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                        <h3 className="font-bold text-white flex items-center">
                        <LucideCheckCircle className="text-emerald-500 mr-2" size={20} />
                        Généré avec succès
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate">{generatedJob.content.trendingTopic}</p>
                    </div>
                    <div className="flex space-x-2">
                         {generatedJob.viralMode && (
                             <span className="text-xs px-2 py-1 rounded-full font-bold flex items-center bg-red-900/40 text-red-400 border border-red-900/50">
                                 <LucideFlame size={12} className="mr-1" /> VIRAL
                             </span>
                         )}
                         <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center shadow-lg ${tiktokConnected ? 'bg-[#FE2C55] text-white shadow-red-900/20' : 'bg-slate-700 text-slate-400'}`}>
                             <LucideShare2 size={12} className="mr-1" /> {tiktokConnected ? 'Connecté' : 'Hors Ligne'}
                         </span>
                    </div>
                </div>

                {/* Seamless Player Container */}
                <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto bg-black rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl">
                    <video
                        ref={videoRefA}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${activePlayer === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        onEnded={() => handleVideoEnded('A')}
                        playsInline
                        muted
                    />
                    <video
                        ref={videoRefB}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${activePlayer === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        onEnded={() => handleVideoEnded('B')}
                        playsInline
                        muted
                    />

                    <div className="absolute bottom-1 left-1 right-1 flex space-x-1 z-20">
                         {generatedJob.content.videoUris.map((_, idx) => (
                            <div key={idx} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${idx === sceneIndex ? 'bg-white' : idx < sceneIndex ? 'bg-white/60' : 'bg-white/20'}`}></div>
                         ))}
                    </div>

                    {!isPlaying && (
                        <div 
                            onClick={playAll}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 cursor-pointer hover:bg-black/30 transition-colors"
                        >
                             <LucideVideo className="text-white drop-shadow-lg scale-150" size={48} />
                        </div>
                    )}

                    {generatedJob.content.audioBase64 && (
                        <audio 
                            ref={audioRef} 
                            src={`data:audio/wav;base64,${generatedJob.content.audioBase64}`}
                            className="hidden" 
                        />
                    )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                     <button id="dl-btn" onClick={handleDownloadMerged} className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-3 rounded-lg font-bold border border-slate-600 flex justify-center items-center">
                        <LucideDownload size={16} className="mr-2" /> Télécharger Vidéo Complète
                     </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono border border-slate-700 max-h-32">
                    <p className="text-slate-500 mb-1 font-bold">Narration Scène {sceneIndex + 1}:</p>
                    {generatedJob.content.scenes[sceneIndex]?.narration}
                </div>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};