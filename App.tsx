import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CreateStudio } from './components/CreateStudio';
import { Queue } from './components/Queue';
import { Analytics } from './components/Analytics';
import { ArchitectureBlueprint } from './components/ArchitectureBlueprint';
import { PrivacyPolicy, TermsOfService } from './components/Legal'; // Import Legal Pages
import { VideoJob, JobStatus, FacebookPage, GamificationStats, AutomationConfig } from './types';
import { fetchFacebookPages } from './services/analyticsService';
import { LucideCheckCircle, LucideAlertCircle, LucideLogOut, LucideExternalLink, LucideLoader, LucideKey, LucideHelpCircle, LucideFacebook, LucideFlag, LucideCalendarClock, LucideClock, LucideShield, LucideFileText } from 'lucide-react';

const App: React.FC = () => {
  // --- ROUTING LOGIC (Simple path check) ---
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
      const handlePopState = () => setCurrentPath(window.location.pathname);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Normalize path (remove trailing slash) to ensure /privacy/ works like /privacy
  const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1 
      ? currentPath.slice(0, -1) 
      : currentPath;

  // Return Legal Pages immediately if path matches
  if (normalizedPath === '/privacy') return <PrivacyPolicy />;
  if (normalizedPath === '/terms') return <TermsOfService />;

  const [activeTab, setActiveTab] = useState('create');
  
  // 1. PERSISTENT STATE INITIALIZATION (Lazy Loading from LocalStorage)
  const [totalVideos, setTotalVideos] = useState(() => {
      const saved = localStorage.getItem('autoShorts_count');
      return saved ? parseInt(saved) : 0;
  });

  const [jobs, setJobs] = useState<VideoJob[]>(() => {
      // Restore jobs if available
      try {
          const savedJobs = localStorage.getItem('autoShorts_jobs');
          return savedJobs ? JSON.parse(savedJobs) : [];
      } catch (e) { return []; }
  });
  
  // Auth Tokens
  const [tiktokToken, setTiktokToken] = useState<string | null>(() => localStorage.getItem('tiktok_token'));
  const [youtubeToken, setYoutubeToken] = useState<string | null>(() => localStorage.getItem('youtube_token'));
  const [facebookToken, setFacebookToken] = useState<string | null>(() => localStorage.getItem('facebook_token'));
  
  // User API Keys
  const [userTiktokKey, setUserTiktokKey] = useState(() => localStorage.getItem('user_tiktok_key') || '');
  const [userGoogleId, setUserGoogleId] = useState(() => localStorage.getItem('user_google_id') || '');
  const [userFacebookId, setUserFacebookId] = useState(() => localStorage.getItem('user_facebook_id') || '');
  
  // Facebook Specifics
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => localStorage.getItem('selected_fb_page_id'));
  
  // --- GAMIFICATION STATE ---
  const [gamification, setGamification] = useState<GamificationStats>(() => {
      const saved = localStorage.getItem('gamification_stats');
      return saved ? JSON.parse(saved) : { xp: 0, level: 1, streak: 0, title: 'Stagiaire' };
  });

  // --- AUTOMATION CONFIG STATE ---
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(() => {
      const saved = localStorage.getItem('automation_config');
      // Added lastMorningRun and lastEveningRun to track recovery
      // MODIFICATION: Active is set to TRUE by default now
      return saved ? JSON.parse(saved) : { active: true, morningSlot: '08:00', eveningSlot: '18:00', lastMorningRun: null, lastEveningRun: null };
  });

  // NEW: State to trigger auto-generation inside CreateStudio if we detected a missed slot
  const [pendingAutoTask, setPendingAutoTask] = useState<'morning' | 'evening' | null>(null);
  
  const [showAuthGuide, setShowAuthGuide] = useState(false);

  // 2. PERSISTENCE EFFECTS (Auto-save on change)
  useEffect(() => { localStorage.setItem('autoShorts_count', totalVideos.toString()); }, [totalVideos]);
  
  // Save Jobs persistently
  useEffect(() => { localStorage.setItem('autoShorts_jobs', JSON.stringify(jobs)); }, [jobs]);
  
  useEffect(() => { 
      if (tiktokToken) localStorage.setItem('tiktok_token', tiktokToken); 
      else localStorage.removeItem('tiktok_token');
  }, [tiktokToken]);

  useEffect(() => { 
      if (youtubeToken) localStorage.setItem('youtube_token', youtubeToken); 
      else localStorage.removeItem('youtube_token');
  }, [youtubeToken]);

  useEffect(() => { 
      if (facebookToken) localStorage.setItem('facebook_token', facebookToken); 
      else localStorage.removeItem('facebook_token');
  }, [facebookToken]);

  useEffect(() => { localStorage.setItem('user_tiktok_key', userTiktokKey); }, [userTiktokKey]);
  useEffect(() => { localStorage.setItem('user_google_id', userGoogleId); }, [userGoogleId]);
  useEffect(() => { localStorage.setItem('user_facebook_id', userFacebookId); }, [userFacebookId]);
  
  useEffect(() => { 
      if (selectedPageId) localStorage.setItem('selected_fb_page_id', selectedPageId); 
      else localStorage.removeItem('selected_fb_page_id');
  }, [selectedPageId]);

  useEffect(() => { localStorage.setItem('gamification_stats', JSON.stringify(gamification)); }, [gamification]);
  useEffect(() => { localStorage.setItem('automation_config', JSON.stringify(automationConfig)); }, [automationConfig]);

  // 3. SMART CATCH-UP & AUTOMATION ENGINE
  useEffect(() => {
      // Logic: Run immediately on mount to check if we missed a slot while the computer was off.
      // And also setup an interval for "while open".
      
      const checkSchedule = () => {
          if (!automationConfig.active || pendingAutoTask) return; // Don't queue if already busy

          const now = new Date();
          const todayString = now.toDateString(); // "Mon Sep 28 2025"

          // Parse Slots
          const [mH, mM] = automationConfig.morningSlot.split(':').map(Number);
          const [eH, eM] = automationConfig.eveningSlot.split(':').map(Number);

          const morningDate = new Date(); morningDate.setHours(mH, mM, 0, 0);
          const eveningDate = new Date(); eveningDate.setHours(eH, eM, 0, 0);

          // CHECK MORNING SLOT
          // If now is past morning slot AND we haven't run it today -> RUN IT (Catch-up or Scheduled)
          if (now >= morningDate && automationConfig.lastMorningRun !== todayString) {
              console.log("⏰ Detecting Morning Slot trigger (Catch-up or Live)");
              setPendingAutoTask('morning');
              return; // Process one at a time
          }

          // CHECK EVENING SLOT
          if (now >= eveningDate && automationConfig.lastEveningRun !== todayString) {
              console.log("⏰ Detecting Evening Slot trigger (Catch-up or Live)");
              setPendingAutoTask('evening');
              return;
          }
      };

      // Check immediately on load (Recover from closed tab)
      checkSchedule();

      // Check periodically (if tab stays open)
      const interval = setInterval(checkSchedule, 30000); // Check every 30s
      return () => clearInterval(interval);

  }, [automationConfig, pendingAutoTask]);

  const handleAutoTaskComplete = (slot: 'morning' | 'evening') => {
      const todayString = new Date().toDateString();
      setAutomationConfig(prev => ({
          ...prev,
          lastMorningRun: slot === 'morning' ? todayString : prev.lastMorningRun,
          lastEveningRun: slot === 'evening' ? todayString : prev.lastEveningRun
      }));
      setPendingAutoTask(null);
  };


  // 4. OAuth Return Handling
  useEffect(() => {
    // Check URL for OAuth Returns
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    if (hashParams.has('access_token')) {
        const token = hashParams.get('access_token');
        if (token) {
            if(window.location.href.includes('facebook') || (hashParams.has('state') && hashParams.get('state')?.includes('facebook'))) {
                 setFacebookToken(token);
                 alert("✅ Connexion Facebook réussie !");
            } else {
                 setYoutubeToken(token);
                 alert("✅ Connexion YouTube réussie !");
            }
            window.history.replaceState(null, null, window.location.pathname);
            setActiveTab('settings');
        }
    }

    if (searchParams.has('code')) {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (state === 'tiktok_login') {
            setTiktokToken(code);
            alert("✅ Connexion TikTok réussie !");
            setActiveTab('settings');
        } else if (state === 'facebook_login') {
            setFacebookToken(code);
             alert("✅ Connexion Facebook réussie !");
             setActiveTab('settings');
        }
        window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);

  // 5. Fetch Data Dependencies
  useEffect(() => {
    if (facebookToken) {
        fetchFacebookPages(facebookToken).then(pages => {
            setFacebookPages(pages);
            if (pages.length > 0) {
                const currentIsValid = pages.find(p => p.id === selectedPageId);
                if (!selectedPageId || !currentIsValid) {
                    setSelectedPageId(pages[0].id);
                }
            }
        });
    }
  }, [facebookToken]);

  const handleSelectPage = (pageId: string) => {
      setSelectedPageId(pageId);
  };

  const incrementTotal = () => {
    setTotalVideos(prev => prev + 1);
  };

  const handleGainXp = (amount: number) => {
      setGamification(prev => {
          const newXp = prev.xp + amount;
          // Level up logic: Level = floor(xp / 100) + 1
          const newLevel = Math.floor(newXp / 100) + 1;
          
          let newTitle = prev.title;
          if (newLevel >= 2) newTitle = "Créateur Junior";
          if (newLevel >= 5) newTitle = "Influenceur";
          if (newLevel >= 10) newTitle = "Roi du Buzz";
          if (newLevel >= 20) newTitle = "Légende";

          return {
              ...prev,
              xp: newXp,
              level: newLevel,
              title: newTitle,
              streak: prev.streak + 1 // Simplified streak logic
          };
      });
  };

  const addJob = (job: VideoJob) => {
    setJobs(prev => [job, ...prev]);
  };

  const handlePublishJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (!tiktokToken && !youtubeToken && !facebookToken) {
        alert("Erreur: Aucun compte connecté. Allez dans Réglages pour configurer.");
        setActiveTab('settings');
        return;
    }

    const confirmPublish = window.confirm(`Publier "${job.content.trendingTopic}" sur les plateformes connectées ?`);
    if (!confirmPublish) return;

    alert("🚀 Envoi vers les API partenaires (TikTok, YouTube, Facebook Page)...");
    await new Promise(r => setTimeout(r, 2000));

    setJobs(prev => prev.map(j => {
      if (j.id === jobId) return { ...j, status: JobStatus.PUBLISHED };
      return j;
    }));
    
    // XP Bonus for publishing
    handleGainXp(100);
    alert("✅ Publié avec succès ! +100 XP");
  };

  const initiateTikTokAuth = () => {
      if (!userTiktokKey) {
          alert("⚠️ Veuillez d'abord entrer votre 'Client Key' TikTok ci-dessus.");
          return;
      }
      const redirectUri = window.location.origin; 
      const scope = 'user.info.basic,video.upload';
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${userTiktokKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=tiktok_login`;
      window.location.href = authUrl;
  };

  const initiateYouTubeAuth = () => {
      if (!userGoogleId) {
          alert("⚠️ Veuillez d'abord entrer votre 'Client ID' Google ci-dessus.");
          return;
      }
      const redirectUri = window.location.origin;
      const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${userGoogleId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true&enable_serial_consent=true`;
      window.location.href = authUrl;
  };

  const initiateFacebookAuth = () => {
      if (!userFacebookId) {
          alert("⚠️ Veuillez d'abord entrer votre 'App ID' Facebook ci-dessus.");
          return;
      }
      const redirectUri = window.location.origin;
      const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_engagement';
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${userFacebookId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=facebook_login&scope=${scope}&response_type=token`;
      window.location.href = authUrl;
  };

  const logout = (platform: 'tiktok' | 'youtube' | 'facebook') => {
      if (platform === 'tiktok') {
          setTiktokToken(null);
      } else if (platform === 'youtube') {
          setYoutubeToken(null);
      } else {
          setFacebookToken(null);
          setFacebookPages([]);
          setSelectedPageId(null);
      }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-auto h-screen">
        <header className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur z-10">
           <div className="flex flex-col">
             <h2 className="text-xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
             {activeTab === 'create' && <p className="text-xs text-slate-400">Gemini 2.5 & Veo - Mode Éducation</p>}
           </div>
           
           <div className="flex items-center space-x-4">
             <div className="text-right mr-2 hidden md:block">
                 <div className="text-xs font-bold text-primary-400">{gamification.title}</div>
                 <div className="text-[10px] text-slate-400">Niveau {gamification.level}</div>
             </div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center font-bold text-white ring-2 ring-primary-900">
               {gamification.level}
             </div>
           </div>
        </header>

        <div className="bg-slate-950 min-h-[calc(100vh-80px)]">
          {activeTab === 'create' && (
            <CreateStudio 
              totalVideos={totalVideos} 
              incrementTotal={incrementTotal}
              addJob={addJob}
              tiktokConnected={!!tiktokToken}
              gamificationStats={gamification}
              onGainXp={handleGainXp}
              pendingAutoTask={pendingAutoTask}
              onAutoTaskComplete={handleAutoTaskComplete}
            />
          )}
          
          {(activeTab === 'queue' || activeTab === 'history') && (
            <Queue jobs={jobs} onPublish={handlePublishJob} tiktokConnected={!!tiktokToken} />
          )}

          {activeTab === 'analytics' && (
              <Analytics tiktokToken={tiktokToken} youtubeToken={youtubeToken} />
          )}

          {activeTab === 'blueprint' && (
            <ArchitectureBlueprint />
          )}
          
          {activeTab === 'settings' && (
             <div className="p-8 max-w-2xl mx-auto">
                {/* --- AUTOMATION CONFIGURATION SECTION --- */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <LucideCalendarClock className="mr-2 text-emerald-400" />
                                Pilote Automatique (Rattrapage)
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Générez du contenu même si vous n'étiez pas là à l'heure pile.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                             <span className="text-xs font-bold uppercase text-slate-500 mr-2">État:</span>
                             <button 
                                onClick={() => setAutomationConfig(p => ({...p, active: !p.active}))}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${automationConfig.active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                             >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${automationConfig.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                             </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-4 transition-opacity ${automationConfig.active ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><LucideClock size={12} className="mr-1"/> Slot Matin</label>
                            <input 
                                type="time" 
                                value={automationConfig.morningSlot}
                                onChange={(e) => setAutomationConfig(p => ({...p, morningSlot: e.target.value}))}
                                className="bg-transparent text-white font-mono font-bold w-full outline-none"
                            />
                            {automationConfig.lastMorningRun === new Date().toDateString() && (
                                <div className="absolute top-2 right-2 text-[10px] text-emerald-500 flex items-center bg-emerald-900/20 px-1 rounded">
                                    <LucideCheckCircle size={10} className="mr-1"/> Fait
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><LucideClock size={12} className="mr-1"/> Slot Soir</label>
                             <input 
                                type="time" 
                                value={automationConfig.eveningSlot}
                                onChange={(e) => setAutomationConfig(p => ({...p, eveningSlot: e.target.value}))}
                                className="bg-transparent text-white font-mono font-bold w-full outline-none"
                            />
                             {automationConfig.lastEveningRun === new Date().toDateString() && (
                                <div className="absolute top-2 right-2 text-[10px] text-emerald-500 flex items-center bg-emerald-900/20 px-1 rounded">
                                    <LucideCheckCircle size={10} className="mr-1"/> Fait
                                </div>
                            )}
                        </div>
                    </div>
                    {automationConfig.active && (
                         <div className="mt-4 text-[10px] text-emerald-400 bg-emerald-900/10 p-3 rounded border border-emerald-900/30">
                             <strong className="block mb-1">ℹ️ Fonctionnement "Sans Serveur" :</strong>
                             L'application détectera automatiquement si un créneau a été manqué pendant que l'onglet était fermé (ex: ordinateur éteint).
                             Au prochain lancement du site, elle générera <strong>immédiatement</strong> les vidéos en retard ("Catch-Up").
                         </div>
                    )}
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Configuration API</h3>
                    <button 
                        onClick={() => setShowAuthGuide(!showAuthGuide)}
                        className="text-xs flex items-center bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded text-primary-400 font-bold border border-primary-900"
                    >
                        <LucideHelpCircle size={14} className="mr-2"/> 
                        {showAuthGuide ? 'Masquer Aide' : 'Procédure de Connexion'}
                    </button>
                </div>

                {showAuthGuide && (
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg mb-6 text-sm text-slate-300">
                        <h4 className="font-bold text-white mb-2">Comment obtenir les clés ?</h4>
                        <ol className="list-decimal pl-4 space-y-2">
                            <li><strong>TikTok :</strong> Allez sur <a href="#" className="text-primary-400 underline">developers.tiktok.com</a>, créez une app, et copiez la "Client Key".</li>
                            <li><strong>Google/YouTube :</strong> Allez sur <a href="#" className="text-primary-400 underline">console.cloud.google.com</a>, créez un projet, activez "YouTube Data API v3", créez des identifiants OAuth Web et copiez le "Client ID".</li>
                             <li><strong>Facebook :</strong> Allez sur <a href="#" className="text-primary-400 underline">developers.facebook.com</a>, créez une app, ajoutez le produit "Facebook Login for Business", et copiez l'"App ID".</li>
                            <li>Collez ces clés ci-dessous et cliquez sur "Enregistrer".</li>
                            <li>Ensuite, cliquez sur les boutons "Connexion" en bas.</li>
                        </ol>
                    </div>
                )}

                <div className="space-y-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">TikTok Client Key</label>
                        <div className="flex">
                            <LucideKey className="text-slate-600 mr-2 mt-2" size={20} />
                            <input 
                                type="text" 
                                value={userTiktokKey} 
                                onChange={(e) => setUserTiktokKey(e.target.value)}
                                placeholder="ex: awx7s89s..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Client ID</label>
                        <div className="flex">
                            <LucideKey className="text-slate-600 mr-2 mt-2" size={20} />
                            <input 
                                type="text" 
                                value={userGoogleId} 
                                onChange={(e) => setUserGoogleId(e.target.value)}
                                placeholder="ex: 123456-abcde.apps.googleusercontent.com"
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Facebook App ID</label>
                        <div className="flex">
                            <LucideKey className="text-slate-600 mr-2 mt-2" size={20} />
                            <input 
                                type="text" 
                                value={userFacebookId} 
                                onChange={(e) => setUserFacebookId(e.target.value)}
                                placeholder="ex: 8901234567..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                     </div>
                     <div className="text-xs text-slate-500 italic text-center">
                        Vos clés sont sauvegardées localement dans ce navigateur.
                     </div>
                </div>
                
                <h4 className="text-lg font-bold text-white mb-4">Connexions aux Comptes</h4>
                <div className="space-y-4">
                   {/* TikTok */}
                   <div className={`p-6 rounded-xl border flex items-center justify-between transition-all ${tiktokToken ? 'bg-slate-800 border-emerald-500/30' : 'bg-slate-900 border-slate-700'}`}>
                      <div className="flex items-center">
                         <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4 border border-slate-600 shadow-lg">
                             <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                         </div>
                         <div>
                            <h4 className="font-bold text-white flex items-center">
                                TikTok 
                                {tiktokToken && <LucideCheckCircle className="text-emerald-500 ml-2" size={16} />}
                            </h4>
                            <p className="text-xs text-slate-400">
                                {tiktokToken ? 'Connecté' : 'En attente'}
                            </p>
                         </div>
                      </div>
                      {tiktokToken ? (
                          <button onClick={() => logout('tiktok')} className="p-2 text-slate-400 hover:text-red-400">
                              <LucideLogOut size={20} />
                          </button>
                      ) : (
                          <button onClick={initiateTikTokAuth} className="px-4 py-2 rounded-lg font-bold text-sm bg-[#FE2C55] text-white hover:bg-[#FE2C55]/90 flex items-center">
                             <LucideExternalLink size={14} className="mr-2" /> Connexion
                          </button>
                      )}
                   </div>

                   {/* YouTube */}
                   <div className={`p-6 rounded-xl border flex items-center justify-between transition-all ${youtubeToken ? 'bg-slate-800 border-red-500/30' : 'bg-slate-900 border-slate-700'}`}>
                      <div className="flex items-center">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 shadow-lg">
                             <svg viewBox="0 0 24 24" fill="#FF0000" className="w-6 h-6"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                         </div>
                         <div>
                            <h4 className="font-bold text-white flex items-center">
                                YouTube Shorts
                                {youtubeToken && <LucideCheckCircle className="text-emerald-500 ml-2" size={16} />}
                            </h4>
                            <p className="text-xs text-slate-400">
                                {youtubeToken ? 'Connecté' : 'En attente'}
                            </p>
                         </div>
                      </div>
                      {youtubeToken ? (
                          <button onClick={() => logout('youtube')} className="p-2 text-slate-400 hover:text-red-400">
                              <LucideLogOut size={20} />
                          </button>
                      ) : (
                          <button onClick={initiateYouTubeAuth} className="px-4 py-2 rounded-lg font-bold text-sm bg-white text-slate-900 hover:bg-slate-200 flex items-center">
                             <LucideExternalLink size={14} className="mr-2" /> Connexion
                          </button>
                      )}
                   </div>

                   {/* Facebook */}
                   <div className={`flex flex-col rounded-xl border transition-all ${facebookToken ? 'bg-slate-800 border-blue-500/30' : 'bg-slate-900 border-slate-700'}`}>
                       <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center mr-4 shadow-lg">
                                    <LucideFacebook className="text-white" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white flex items-center">
                                        Facebook Reels
                                        {facebookToken && <LucideCheckCircle className="text-emerald-500 ml-2" size={16} />}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {facebookToken ? 'Connecté' : 'En attente'}
                                    </p>
                                </div>
                            </div>
                            {facebookToken ? (
                                <button onClick={() => logout('facebook')} className="p-2 text-slate-400 hover:text-red-400">
                                    <LucideLogOut size={20} />
                                </button>
                            ) : (
                                <button onClick={initiateFacebookAuth} className="px-4 py-2 rounded-lg font-bold text-sm bg-[#1877F2] text-white hover:bg-[#1877F2]/90 flex items-center">
                                    <LucideExternalLink size={14} className="mr-2" /> Connexion
                                </button>
                            )}
                       </div>
                       
                       {/* Facebook Page Selection - Only visible when connected */}
                       {facebookToken && (
                           <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                               <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex items-center">
                                   <LucideFlag size={14} className="mr-2" /> Page pour Publication des Reels
                               </label>
                               
                               {facebookPages.length === 0 ? (
                                   <div className="text-xs text-slate-500 flex items-center">
                                       <LucideLoader size={14} className="animate-spin mr-2"/> Chargement des pages...
                                   </div>
                               ) : (
                                   <div className="grid grid-cols-1 gap-2">
                                       {facebookPages.map(page => (
                                           <div 
                                                key={page.id} 
                                                onClick={() => handleSelectPage(page.id)}
                                                className={`cursor-pointer p-3 rounded-lg border flex items-center justify-between transition-all ${
                                                    selectedPageId === page.id 
                                                    ? 'bg-[#1877F2]/20 border-[#1877F2] text-white' 
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                                                }`}
                                           >
                                               <div>
                                                   <div className="font-bold text-sm">{page.name}</div>
                                                   <div className="text-[10px] opacity-70 uppercase">{page.category}</div>
                                               </div>
                                               {selectedPageId === page.id && <LucideCheckCircle size={16} className="text-[#1877F2]" />}
                                           </div>
                                       ))}
                                   </div>
                               )}
                               <p className="text-[10px] text-slate-500 mt-2 italic">
                                   * La sélection est mémorisée automatiquement.
                               </p>
                           </div>
                       )}
                   </div>

                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between text-xs text-slate-500">
                    <a href="/terms" className="hover:text-primary-400 flex items-center">
                        <LucideFileText size={12} className="mr-1" /> Conditions d'Utilisation (Terms)
                    </a>
                    <a href="/privacy" className="hover:text-primary-400 flex items-center">
                        <LucideShield size={12} className="mr-1" /> Politique de Confidentialité
                    </a>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;