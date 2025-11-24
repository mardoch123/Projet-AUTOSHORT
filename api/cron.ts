import { GoogleGenAI } from "@google/genai";

const MODELS = {
  TEXT: 'gemini-2.5-flash',
  VIDEO: 'veo-3.1-fast-generate-preview',
};

const SYSTEM_INSTRUCTION = `
Tu es un expert en création de contenu viral pour TikTok/Reels (Short Form Content).
Ta mission est de maximiser la RÉTENTION (Watchtime) et l'ENGAGEMENT.

MODE VIRAL : ACTIVÉ PAR DÉFAUT.
1. HOOK (0-3s) : Doit être agressif, surprenant ou contrintuitif.
2. TON : Rapide, dynamique, sans mots inutiles.
3. FIN : Oblige l'utilisateur à commenter (Question dilemme, défi, avis tranché).

Format de sortie JSON attendu :
{ 
  "topic": "Titre Clickbait", 
  "script": "Script complet avec indications de voix off", 
  "visual_prompt": "Description visuelle cinématique pour IA vidéo (Veo)" 
}
`;

// Helper: Rotation Server-Side
async function runWithServerRotation(apiKeys: string[], operation: (ai: GoogleGenAI) => Promise<any>) {
    let lastError;
    // On essaie chaque clé une par une en cas d'erreur
    for (const key of apiKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            return await operation(ai);
        } catch (error: any) {
            console.warn(`[CRON] Key ending in ...${key.slice(-4)} failed: ${error.message}`);
            lastError = error;
            // Si erreur Quota, on continue la boucle pour tester la clé suivante
            const msg = error.message || "";
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                continue;
            }
            throw error; // Autre erreur fatale
        }
    }
    throw new Error(`All keys exhausted. Last error: ${lastError?.message}`);
}

export default async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Supporte API_KEYS (liste) ou API_KEY (unique)
  const keysString = process.env.API_KEYS || process.env.API_KEY || "";
  const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ error: "No API_KEYS configured on server" }), { status: 500 });
  }

  const hour = new Date().getHours();
  const category = hour < 12 ? 'SCHOOL_TIPS' : 'BUSINESS_SUCCESS';
  
  console.log(`[SERVER CRON] Starting Job: ${category} with ${apiKeys.length} available keys.`);

  try {
    // 1. Script Gen
    const scriptData = await runWithServerRotation(apiKeys, async (ai) => {
        const prompt = `Génère une vidéo virale courte pour la catégorie : ${category}. Mode Viral Activé.`;
        const res = await ai.models.generateContent({
            model: MODELS.TEXT,
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                temperature: 0.9,
            },
        });
        return JSON.parse(res.text || '{}');
    });

    console.log('[SERVER CRON] Script generated:', scriptData.topic);

    // 2. Video Gen
    const videoUri = await runWithServerRotation(apiKeys, async (ai) => {
        let operation = await ai.models.generateVideos({
            model: MODELS.VIDEO,
            prompt: `${scriptData.visual_prompt}, cinematic, 4k, photorealistic`,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });

        let attempts = 0;
        while (!operation.done && attempts < 15) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            // @ts-ignore
            operation = await ai.operations.getVideosOperation({ operation: operation });
            attempts++;
        }
        return operation.response?.generatedVideos?.[0]?.video?.uri;
    });

    return new Response(JSON.stringify({
        success: true,
        category,
        topic: scriptData.topic,
        videoUri: videoUri || "Timeout",
        usedRotation: true
    }), { status: 200 });

  } catch (error: any) {
    console.error('[SERVER CRON] Global Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
