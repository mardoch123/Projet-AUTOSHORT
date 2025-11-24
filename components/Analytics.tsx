
import React, { useEffect, useState } from 'react';
import { SocialPlatform, VideoAnalytics } from '../types';
import { fetchYoutubeAnalytics, fetchTikTokAnalytics } from '../services/analyticsService';
import { LucideBarChart2, LucideTrendingUp, LucideEye, LucideHeart, LucideLoader, LucideAlertCircle, LucideVideo } from 'lucide-react';

interface AnalyticsProps {
    tiktokToken: string | null;
    youtubeToken: string | null;
}

export const Analytics: React.FC<AnalyticsProps> = ({ tiktokToken, youtubeToken }) => {
    const [videos, setVideos] = useState<VideoAnalytics[]>([]);
    const [loading, setLoading] = useState(false);
    const [globalStats, setGlobalStats] = useState({ views: 0, likes: 0, engagement: 0 });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!tiktokToken && !youtubeToken) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const allVideos: VideoAnalytics[] = [];
                let totalViews = 0;
                let totalLikes = 0;
                let totalComments = 0;

                // 1. Fetch YouTube
                if (youtubeToken) {
                    const ytData = await fetchYoutubeAnalytics(youtubeToken);
                    if (ytData.videos) {
                        allVideos.push(...ytData.videos);
                        // If channel stats available, use them, otherwise sum videos
                        if (ytData.global) {
                            totalViews += parseInt(ytData.global.viewCount || '0');
                            // YouTube global stats don't give total likes easily, so we sum from recent videos or ignore
                        } 
                    }
                }

                // 2. Fetch TikTok
                if (tiktokToken) {
                    const ttVideos = await fetchTikTokAnalytics(tiktokToken);
                    allVideos.push(...ttVideos);
                }

                // Sort by Date (newest first)
                allVideos.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
                setVideos(allVideos);

                // Calculate Totals from fetched videos if global API didn't cover everything
                const currentViews = allVideos.reduce((acc, v) => acc + v.stats.views, 0);
                const currentLikes = allVideos.reduce((acc, v) => acc + v.stats.likes, 0);
                const currentComments = allVideos.reduce((acc, v) => acc + v.stats.comments, 0);
                
                // Use the larger number (API global or Sum of recent)
                setGlobalStats({
                    views: Math.max(totalViews, currentViews),
                    likes: currentLikes,
                    engagement: currentLikes + currentComments
                });

            } catch (err) {
                console.error(err);
                setError("Erreur lors du chargement des statistiques. Vérifiez vos connexions.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tiktokToken, youtubeToken]);

    if (!tiktokToken && !youtubeToken) {
        return (
            <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center h-[60vh] text-center">
                <LucideAlertCircle size={64} className="text-slate-600 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Aucun compte connecté</h2>
                <p className="text-slate-400">Veuillez connecter TikTok ou YouTube dans l'onglet "Réglages" pour voir vos statistiques réelles.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Performances Réelles</h2>
                    <p className="text-slate-400 mt-2">Données synchronisées depuis vos comptes.</p>
                </div>
                {loading && (
                    <div className="flex items-center text-primary-400 bg-primary-400/10 px-4 py-2 rounded-lg">
                        <LucideLoader className="animate-spin mr-2" size={20} />
                        <span className="text-sm font-bold">Synchronisation...</span>
                    </div>
                )}
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-bold uppercase">Vues Totales</h3>
                        <LucideEye className="text-primary-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white">{globalStats.views.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center">
                        <span className="text-slate-400">Cumulé sur {videos.length} vidéos récentes</span>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-bold uppercase">J'aime (Likes)</h3>
                        <LucideHeart className="text-pink-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white">{globalStats.likes.toLocaleString()}</div>
                    <div className="text-xs text-emerald-400 mt-2 flex items-center">
                        <LucideTrendingUp size={12} className="mr-1" /> Engagement Actif
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-bold uppercase">Viralité Moyenne</h3>
                        <LucideBarChart2 className="text-purple-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {videos.length > 0 ? (globalStats.views / videos.length).toFixed(0) : 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Vues moyennes / vidéo</div>
                </div>
            </div>

            {/* Video List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden min-h-[200px]">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white">Dernières Publications (Live API)</h3>
                    {error && <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900">{error}</span>}
                </div>
                
                {loading && videos.length === 0 ? (
                    <div className="p-12 flex justify-center text-slate-500">
                         Chargement des données...
                    </div>
                ) : videos.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                        <LucideVideo size={48} className="mb-4 opacity-50" />
                        <p>Aucune vidéo trouvée ou erreur de connexion API.</p>
                        <p className="text-xs mt-2">Vérifiez que vous avez publié des vidéos sur les comptes connectés.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700">
                        {videos.map((vid) => (
                            <div key={vid.id} className="p-4 hover:bg-slate-750 transition-colors flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-24 bg-black rounded-lg border border-slate-600 flex-shrink-0 relative overflow-hidden group">
                                         {vid.thumbnail ? (
                                             <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                                                <LucideVideo size={20} />
                                            </div>
                                         )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm line-clamp-2">{vid.title}</h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${vid.platform === SocialPlatform.TIKTOK ? 'bg-black border-slate-600 text-white' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
                                                {vid.platform}
                                            </span>
                                            <span className="text-xs text-slate-500">• {vid.postedAt}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-6 text-sm">
                                    <div className="flex flex-col items-center w-16">
                                        <span className="text-slate-400 text-[10px] uppercase">Vues</span>
                                        <span className="font-bold text-white">{vid.stats.views.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center w-16">
                                        <span className="text-slate-400 text-[10px] uppercase">Likes</span>
                                        <span className="font-bold text-white">{vid.stats.likes.toLocaleString()}</span>
                                    </div>
                                    <div className="hidden md:flex flex-col items-center w-16">
                                        <span className="text-slate-400 text-[10px] uppercase">Comms</span>
                                        <span className="font-bold text-white">{vid.stats.comments.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <div className="hidden md:block">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        vid.performance === 'VIRAL' ? 'bg-purple-900 text-purple-200' :
                                        vid.performance === 'GOOD' ? 'bg-emerald-900 text-emerald-200' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {vid.performance}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
