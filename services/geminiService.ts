import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTION_SCRIPT, RESPONSE_SCHEMA, VIRAL_HOOKS, VIRAL_CTAS } from "../constants";

// --- SAFE ENVIRONMENT ACCESS ---

/**
 * Safely retrieves environment variables in both Browser (Vite) and Server (Node) environments.
 * Prevents "ReferenceError: process is not defined" crashes on Vercel.
 */
const getEnv = () => {
  const env: Record<string, string | undefined> = {};

  // 1. Vite / Browser Context (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      env.API_KEY = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
      // @ts-ignore
      env.API_KEYS = import.meta.env.VITE_API_KEYS || import.meta.env.API_KEYS;
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not available
  }

  // 2. Node.js / Vercel Serverless Context (process.env)
  // We must access specific properties safely to allow bundlers to replace them if needed
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.API_KEY) env.API_KEY = process.env.API_KEY;
      if (process.env.API_KEYS) env.API_KEYS = process.env.API_KEYS;
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }

  return env;
};

const { API_KEY, API_KEYS } = getEnv();

// --- API KEY ROTATION LOGIC ---

const getAvailableKeys = (): string[] => {
  const keys: string[] = [];
  
  // Prioritize list of keys
  if (API_KEYS) {
    keys.push(...API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0));
  }
  
  // Add single key if not already in list
  if (API_KEY && !keys.includes(API_KEY.trim())) {
    keys.push(API_KEY.trim());
  }

  return keys;
};

const ALL_KEYS = getAvailableKeys();

// Global index for session (starts random to distribute load across keys on fresh loads)
let currentKeyIndex = ALL_KEYS.length > 0 ? Math.floor(Math.random() * ALL_KEYS.length) : 0;

// --- HELPER FUNCTIONS ---

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

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

async function runWithRotation<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  if (ALL_KEYS.length === 0) {
      console.error("CRITICAL: No API Keys found.");
      throw new Error("Configuration Manquante : Aucune clé API trouvée. Ajoutez 'API_KEYS' dans les réglages Vercel (Environment Variables).");
  }

  const maxAttempts = ALL_KEYS.length * 2; // Try each key twice if needed
  let attempts = 0;
  let lastError: any;

  while (attempts < maxAttempts) {
    const keyToUse = ALL_KEYS[currentKeyIndex]; 
    const ai = new GoogleGenAI({ apiKey: keyToUse });

    try {
      return await operation(ai);
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      const isQuotaError = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      
      if (isQuotaError) {
        console.warn(`⚠️ Quota hit on Key ending in ...${keyToUse.slice(-4)}. Switching key...`);
        // Switch to next key
        currentKeyIndex = (currentKeyIndex + 1) % ALL_KEYS.length;
        attempts++;
        // Small delay to allow platform to recover if transient
        await new Promise(r => setTimeout(r, 1000)); 
      } else {
        // If it's not a quota error, throw immediately (e.g., Bad Request)
        throw error; 
      }
      lastError = error;
    }
  }
  
  throw new Error(`Toutes les clés API (${ALL_KEYS.length}) ont échoué ou atteint leur quota (429). Dernière erreur: ${lastError?.message}`);
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
        1. FORCE ce Hook précis pour la Scène 1 : "${randomHook}"
        2. FORCE ce Call-To-Action précis pour la fin : "${randomCTA}"
        3. Ton CHOC et RAPIDE.
        `;
    } else {
        finalPrompt += `\n\nTon : Naturel, Engageant.`;
    }

    if (injectAd) {
      finalPrompt += `\n\nIMPORTANT: Tu DOIS générer 5 SCÈNES. La scène 3 DOIT être cette pub :\n${adContent}`;
    } else {
      finalPrompt += `\n\nGénère exactement 4 scènes.`;
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

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (videoUri) {
            // Use current key for download
            const currentKey = ALL_KEYS[currentKeyIndex]; 

            const separator = videoUri.includes('?') ? '&' : '?';
            const downloadUrl = `${videoUri}${separator}key=${currentKey}`;
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`Veo download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            // Force MIME type for browser compatibility
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