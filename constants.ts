

import { Type } from "@google/genai";

export const MODELS = {
  TEXT: 'gemini-2.5-flash',
  TTS: 'gemini-2.5-flash-preview-tts',
  VIDEO: 'veo-3.1-fast-generate-preview',
};

export const AD_FREQUENCY = 3; // Insert ad every 3rd video

export const EDU_EASY_AD_SCRIPT = `
[SCÈNE PUBLICITAIRE - À INSÉRER AU MILIEU]
Narration : "Pause ! Tu veux que ton école passe de Zéro à Héros ?"
Visuel : Un graphique de notes qui monte en flèche, style dynamique, texte "0 à Héro" à l'écran.
Narration : "Découvre EduEasy sur edueasy.net. C'est l'outil de gestion tout-en-un."
Visuel : Logo EduEasy moderne, interface d'application propre sur un téléphone.
Narration : "Notre slogan ? Zéro échec scolaire. Infos sur WhatsApp au 01 57 66 08 74 !"
Visuel : Le numéro WhatsApp 0157660874 affiché en gros avec le texte "0 échec scolaire".
`;

// Nouveaux Hooks agressifs pour le mode Viral
export const VIRAL_HOOKS = [
  "Arrête de scroller si tu veux réussir !",
  "Ce secret que les profs ne te disent pas...",
  "99% des gens se trompent sur ça.",
  "La vérité dérangeante sur ton avenir.",
  "Tu perds ton temps si tu fais ça.",
  "Regarde ça avant qu'il soit trop tard.",
  "Ton cerveau te ment, voici la preuve.",
  "Ne regarde pas ça seul le soir...",
  "Tu préfères A ou B ? Choisis vite !",
  "Cette pensée va t'empêcher de dormir."
];

// Nouveaux CTAs pour l'engagement
export const VIRAL_CTAS = [
  "Et toi, t'en penses quoi ? Dis-le en comm !",
  "Tag un pote qui a besoin de voir ça 👇",
  "Abonne-toi pour devenir plus intelligent demain.",
  "Enregistre la vidéo pour pas oublier, c'est important.",
  "Mets un 🔥 si tu valides !",
  "Dis-moi ton choix en commentaire !",
  "Envoie ça à quelqu'un qui doit savoir."
];

export const SYSTEM_INSTRUCTION_SCRIPT = `
Tu es un expert en création de contenu viral pour TikTok/Reels en France.
Ta mission est de créer une vidéo courte optimisée pour la RÉTENTION (Watchtime) et l'ENGAGEMENT (Commentaires).

RÈGLES DE STRUCTURE GÉNÉRALE :
1. **SCÈNE 1 (LE HOOK - 0 à 3s) :** Agressif, visuel, immédiat.
2. **CORPS :** Valeur, Histoire ou Dilemme.
3. **FIN :** Call-to-Action clair.

SPECIFICITÉS SELON LE TYPE :

1. **SCHOOL_TIPS / MOTIVATION :**
   - Ton : Mentor, Coach.
   - Visuel : Dynamique, studieux, réussite.

2. **SCARY_STORY (Horreur) :** 👻
   - Ton : Lent, grave, mystérieux.
   - Structure : Fait réel effrayant ou légende urbaine courte.
   - Visuels : Sombres, ombres, atmosphère "liminal spaces", inquiétant.

3. **WOULD_YOU_RATHER (Tu préfères) :** ⚖️
   - Ton : Provocateur, rapide.
   - Structure :
     - S1 : "Tu préfères..."
     - S2 : Option A (Situation extrême/drôle).
     - S3 : Option B (Situation encore pire/meilleure).
     - S4 : "Dis-moi ton choix en commentaire !"
   - Visuels : Split screen conceptuel, couleurs opposées (Rouge vs Bleu).

4. **SHOWER_THOUGHTS (Pensées de douche) :** 🚿
   - Ton : "Mind blown", philosophique, lent.
   - Structure : "Réalisation soudaine" sur la vie quotidienne.
   - Visuels : Abstraits, satisfaisants, boucles visuelles, eau, espace.

Format de Sortie (JSON uniquement) :
- "trending_topic": Titre Clickbait.
- "character_description": Description visuelle.
- "full_script": Le script complet.
- "scenes": Tableau d'objets :
   - "visual_prompt": Description pour Veo. Cinématique, haute qualité.
   - "narration": Texte lu.
`;

export const RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      trending_topic: { type: Type.STRING },
      character_description: { type: Type.STRING },
      full_script: { type: Type.STRING },
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            visual_prompt: { type: Type.STRING },
            narration: { type: Type.STRING }
          },
          required: ["visual_prompt", "narration"]
        }
      }
    },
    required: ["trending_topic", "character_description", "full_script", "scenes"]
};