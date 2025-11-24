import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTION_SCRIPT, RESPONSE_SCHEMA, VIRAL_HOOKS, VIRAL_CTAS } from "../constants";

// --- API KEY ROTATION LOGIC ---

// Helper pour accéder à l'environnement de manière sécurisée (évite le crash "process is not defined" dans le navigateur)
const getEnvVar = (key: string): string | undefined => {
  try {
    // Vérifie si process existe (Node.js) ou si c'est injecté par le build (Vite/Webpack)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    // Fallback pour certains environnements Vite récents
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// Récupération des clés depuis l'environnement. 
// Supporte soit une liste séparée par des virgules (API_KEYS), soit une clé unique (API_KEY)
const getAvailableKeys = (): string[] => {
  const keysString = getEnvVar('API_KEYS') || getEnvVar('API_KEY') || "";
  return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
};

const ALL_KEYS = getAvailableKeys();

// Index global pour la session (commence aléatoirement pour répartir la charge si plusieurs utilisateurs)
let currentKeyIndex = Math.floor(Math.random() * (ALL_KEYS.length || 1));

const getNextKey = (): string => {
  if (ALL_KEYS.length === 0) {
      console.warn("⚠️ Aucune clé API trouvée dans les variables d'environnement. Assurez-vous d'avoir configuré API_KEYS sur Vercel.");
      // On retourne une chaine vide pour ne pas faire crasher l'app au démarrage, l'erreur surviendra à l'appel
      return "";
  }
  const key = ALL_KEYS[currentKeyIndex];
  // Préparer l'index pour le prochain appel (Round Robin simple)
  currentKeyIndex = (currentKeyIndex + 1) % ALL_KEYS.length;
  return key;
};

// --- HELPER FUNCTIONS ---

// Helper: Convert Base64 string to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Convert Uint8Array to Base64 string
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Helper: Add WAV Header to raw PCM data
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Uint8Array => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wavData = new Uint8Array(header.byteLength + pcmData.length);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, header.byteLength);
  
  return wavData;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

interface ScriptResponse {
    trending_topic: string;
    character_description: string;
    full_script: string;
    scenes: { visual_prompt: string; narration: string }[];
}

// --- SMART RETRY & ROTATION SYSTEM ---

// Cette fonction encapsule les appels API. 
// Elle gère la création de l'instance AI avec la clé courante,
// et tente de changer de clé en cas d'erreur 429 (Quota).
async function runWithRotation<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  if (ALL_KEYS.length === 0) {
      throw new Error("Configuration Manquante : Aucune clé API trouvée. Ajoutez 'API_KEYS' dans les réglages Vercel.");
  }

  const maxAttempts = ALL_KEYS.length * 2; // On permet de faire 2 tours de liste complets
  let attempts = 0;
  let lastError: any;

  while (attempts < maxAttempts) {
    // 1. Sélectionner une clé (Failover dynamique via l'index global)
    const keyToUse = ALL_KEYS[currentKeyIndex]; 
    const ai = new GoogleGenAI({ apiKey: keyToUse });

    try {
      // 2. Tenter l'opération
      return await operation(ai);
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      const isQuotaError = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      
      if (isQuotaError) {
        console.warn(`⚠️ Quota hit on Key ending in ...${keyToUse.slice(-4)}. Switching project...`);
        // 3. En cas de quota, on passe à la clé suivante IMMÉDIATEMENT
        currentKeyIndex = (currentKeyIndex + 1) % ALL_KEYS.length;
        attempts++;
        // Petit délai pour laisser respirer le réseau
        await new Promise(r => setTimeout(r, 500)); 
      } else {
        // Si c'est une autre erreur (ex: 500, invalid argument), on ne retry pas indéfiniment
        throw error; 
      }
      lastError = error;
    }
  }
  
  throw new Error(`Toutes les clés API (${ALL_KEYS.length}) ont échoué ou atteint leur quota. Dernière erreur: ${lastError?.message}`);
}

// 1. Generate Structured Script
export const generateStructuredScript = async (
  category: string,
  injectAd: boolean,
  adContent: string,
  viralMode: boolean = false
): Promise<ScriptResponse> => {
  
  return runWithRotation(async (ai) => {
    let finalPrompt = `Trouve une tendance virale pour la catégorie : "${category}". Génère la vidéo.`;
  
    if (viralMode) {
        const randomHook = VIRAL_HOOKS[Math.floor(Math.random() * VIRAL_HOOKS.length)];
        const randomCTA = VIRAL_CTAS[Math.floor(Math.random() * VIRAL_CTAS.length)];
        
        finalPrompt += `\n\n[MODE VIRAL ACTIVÉ] :
        1. FORCE ce Hook précis pour la Scène 1 (c'est impératif) : "${randomHook}"
        2. FORCE ce Call-To-Action précis pour la dernière scène : "${randomCTA}"
        3. Le ton doit être CHOC, RAPIDE et PROVOCANT. Pas de phrases molles.
        `;
    } else {
        finalPrompt += `\n\nTon : Naturel, Engageant mais bienveillant.`;
    }

    if (injectAd) {
      finalPrompt += `\n\nIMPORTANT: Tu DOIS générer 5 SCÈNES au total. La scène 3 DOIT être cette publicité (ne change pas les infos clés : EduEasy, edueasy.net, 0157660874, "0 échec scolaire", "0 à Héro") :\n${adContent}`;
    } else {
      finalPrompt += `\n\nGénère exactement 4 scènes pour une structure virale rapide.`;
    }

    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: finalPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_SCRIPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: viralMode ? 1.0 : 0.85,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const data = JSON.parse(text) as ScriptResponse;
    data.scenes = data.scenes.map(scene => ({
      ...scene,
      visual_prompt: `(${data.character_description}), ${scene.visual_prompt}`
    }));

    return data;
  });
};

// 2. Generate Audio
export const generateVoiceover = async (text: string): Promise<string | null> => {
  try {
    return await runWithRotation(async (ai) => {
        const response = await ai.models.generateContent({
          model: MODELS.TTS,
          contents: [{ parts: [{ text: text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            const pcmBytes = base64ToUint8Array(audioData);
            const wavBytes = addWavHeader(pcmBytes, 24000, 1);
            return uint8ArrayToBase64(wavBytes);
        }
        return null;
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

// 3. Generate Single Video Clip
const generateSingleClip = async (visualPrompt: string): Promise<string> => {
    // Note: Video generation is long, retry logic needs to be careful not to restart expensive operations too easily,
    // but for 429 on initiation, it's fine.
    
    return runWithRotation(async (ai) => {
        let operation = await ai.models.generateVideos({
            model: MODELS.VIDEO,
            prompt: visualPrompt + ", cinematic, 4k, high quality, photorealistic, french atmosphere",
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (videoUri) {
            // We need to use the KEY used for generation to fetch the result
            // @ts-ignore - Accessing private/internal key if possible or assume process.env
            // Since we are inside runWithRotation, 'ai' instance has the correct key.
            // We need to extract the key from the AI instance or pass it down.
            // WORKAROUND: The download URL needs A key. We can use any valid key, but best to use the current one.
            // Since we can't easily extract the key from the 'ai' instance safely in TS, 
            // we will use the global 'ALL_KEYS[currentKeyIndex]' which corresponds to the current successful rotation.
            
            // Note: If index rotated during wait (unlikely in single thread JS but conceptually possible), we might pick wrong key.
            // But usually safe enough.
            const currentKey = ALL_KEYS[(currentKeyIndex === 0 ? ALL_KEYS.length : currentKeyIndex) - 1] || ALL_KEYS[currentKeyIndex]; 

            const separator = videoUri.includes('?') ? '&' : '?';
            const downloadUrl = `${videoUri}${separator}key=${currentKey}`;
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                // If fetching fails with 403/404, it might be the key.
                throw new Error(`Veo download failed: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && (contentType.includes('application/json') || contentType.includes('text/xml'))) {
                const errText = await response.text();
                throw new Error(`Veo returned non-video content: ${errText}`);
            }

            const blob = await response.blob();
            const videoBlob = new Blob([blob], { type: 'video/mp4' });

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoBlob);
            });
        }
        throw new Error("No video URI returned from Veo");
    });
}

// 4. Orchestrator
export const generateAllScenes = async (scenes: { visual_prompt: string }[]): Promise<string[]> => {
    const videos: string[] = [];
    for (const scene of scenes) {
        const videoData = await generateSingleClip(scene.visual_prompt);
        videos.push(videoData);
    }
    return videos;
};