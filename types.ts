

export enum JobStatus {
  IDLE = 'IDLE',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  GENERATING_STORYBOARD = 'GENERATING_STORYBOARD',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  MERGING_VIDEO = 'MERGING_VIDEO',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum SocialPlatform {
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube Shorts',
  FACEBOOK = 'Facebook Reels',
}

// Updated Categories with FUN new formats
export type VideoType = 
  | 'SCHOOL_TIPS' 
  | 'GENERAL_CULTURE' 
  | 'BUSINESS_SUCCESS' 
  | 'MOTIVATION'
  | 'SCARY_STORY'      // Horreur
  | 'WOULD_YOU_RATHER' // Tu préfères ?
  | 'SHOWER_THOUGHTS'; // Pensées de douche

export interface GeneratedContent {
  trendingTopic?: string;
  characterDescription?: string;
  script: string;
  audioBase64: string | null;
  videoUris: string[]; 
  scenes: { narration: string; visual_prompt: string }[];
  mergedVideoUri?: string;
}

export interface VideoJob {
  id: string;
  prompt: string;
  type: VideoType;
  createdAt: number;
  status: JobStatus;
  content: GeneratedContent;
  platforms: SocialPlatform[];
  injectAd: boolean;
  autoSchedule?: boolean;
  viralMode?: boolean; // NEW: Indicates if Viral Boost was active
}

export interface VideoAnalytics {
  id: string;
  thumbnail: string;
  title: string;
  platform: SocialPlatform;
  postedAt: string;
  stats: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  performance: 'VIRAL' | 'GOOD' | 'AVERAGE' | 'POOR';
}

export interface UserSettings {
  tiktokConnected: boolean;
  youtubeConnected: boolean;
  facebookConnected: boolean;
  totalVideosGenerated: number;
}

export interface BlueprintSection {
  title: string;
  content: string;
  code?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

// --- GAMIFICATION & AUTOMATION TYPES ---

export interface GamificationStats {
  xp: number;
  level: number;
  streak: number;
  title: string;
}

export interface AutomationConfig {
  active: boolean;
  morningSlot: string; // "08:00"
  eveningSlot: string; // "18:00"
  lastMorningRun: string | null; // ISO Date String YYYY-MM-DD
  lastEveningRun: string | null; // ISO Date String YYYY-MM-DD
}