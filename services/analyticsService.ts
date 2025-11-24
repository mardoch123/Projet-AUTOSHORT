
import { SocialPlatform, VideoAnalytics, FacebookPage } from '../types';

interface GlobalStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

const calculatePerformance = (views: number): 'VIRAL' | 'GOOD' | 'AVERAGE' | 'POOR' => {
    if (views >= 10000) return 'VIRAL';
    if (views >= 2000) return 'GOOD';
    if (views >= 500) return 'AVERAGE';
    return 'POOR';
}

export const fetchYoutubeAnalytics = async (token: string): Promise<{ global: any, videos: VideoAnalytics[] }> => {
  try {
    // 1. Get Channel ID and Uploads Playlist
    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&mine=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!channelRes.ok) throw new Error(`YouTube API Error: ${channelRes.status}`);
    
    const channelData = await channelRes.json();
    if (!channelData.items?.[0]) return { global: null, videos: [] };

    const channelItem = channelData.items[0];
    const uploadsId = channelItem.contentDetails.relatedPlaylists.uploads;
    
    // 2. Get Recent Videos from Uploads Playlist
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const playlistData = await playlistRes.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
        return { global: channelItem.statistics, videos: [] };
    }

    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    
    // 3. Get Video Statistics
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const videosData = await videosRes.json();

    const mappedVideos: VideoAnalytics[] = videosData.items.map((item: any) => ({
      id: item.id,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      title: item.snippet.title,
      platform: SocialPlatform.YOUTUBE,
      postedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
      stats: {
        views: parseInt(item.statistics.viewCount || '0'),
        likes: parseInt(item.statistics.likeCount || '0'),
        shares: 0, // YouTube API does not provide public share count
        comments: parseInt(item.statistics.commentCount || '0')
      },
      performance: calculatePerformance(parseInt(item.statistics.viewCount || '0'))
    }));

    return { global: channelItem.statistics, videos: mappedVideos };
  } catch (error) {
    console.error("YouTube Analytics Error:", error);
    return { global: null, videos: [] };
  }
};

export const fetchTikTokAnalytics = async (token: string): Promise<VideoAnalytics[]> => {
    // Note: TikTok Display API v2 implementation.
    // Real-world usage often requires a backend proxy to handle CORS and specific scopes.
    try {
        const query = new URLSearchParams({
            fields: 'id,title,cover_image_url,create_time,view_count,like_count,share_count,comment_count'
        });

        const res = await fetch(`https://open.tiktokapis.com/v2/video/list/?${query.toString()}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ max_count: 10 })
        });
        
        if (!res.ok) throw new Error(`TikTok API Error: ${res.status}`);

        const data = await res.json();
        
        if (data.error && data.error.code !== 0) {
            console.warn("TikTok API reported error:", data.error);
            return [];
        }
        
        return (data.data?.videos || []).map((v: any) => ({
             id: v.id,
             thumbnail: v.cover_image_url,
             title: v.title,
             platform: SocialPlatform.TIKTOK,
             postedAt: new Date(v.create_time * 1000).toLocaleDateString(),
             stats: {
                 views: v.view_count || 0,
                 likes: v.like_count || 0,
                 shares: v.share_count || 0,
                 comments: v.comment_count || 0
             },
             performance: calculatePerformance(v.view_count || 0)
        }));
    } catch (e) {
        console.warn("TikTok Analytics fetch failed (Network/CORS):", e);
        return [];
    }
};

export const fetchFacebookPages = async (token: string): Promise<FacebookPage[]> => {
    try {
        const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=name,access_token,category,id&access_token=${token}`);
        if (!res.ok) throw new Error(`Facebook API Error: ${res.status}`);
        const data = await res.json();
        return data.data || [];
    } catch (e) {
        console.error("Error fetching FB pages:", e);
        return [];
    }
};
