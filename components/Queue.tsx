
import React from 'react';
import { VideoJob, JobStatus, SocialPlatform } from '../types';
import { LucideUploadCloud, LucideCheck, LucideClock, LucideAlertCircle, LucideExternalLink } from 'lucide-react';

interface QueueProps {
  jobs: VideoJob[];
  onPublish: (id: string) => void;
  tiktokConnected: boolean;
}

export const Queue: React.FC<QueueProps> = ({ jobs, onPublish, tiktokConnected }) => {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">File d'attente & Historique</h2>
        {!tiktokConnected && (
            <div className="flex items-center bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-lg">
                <LucideAlertCircle size={16} className="text-yellow-500 mr-2" />
                <span className="text-xs text-yellow-200">Connectez TikTok dans les réglages pour publier.</span>
            </div>
        )}
      </div>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">ID</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Sujet</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Type</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Statut</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Plateformes</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucune vidéo générée. Allez dans le Studio de Création.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-750 transition-colors">
                  <td className="p-4 text-xs font-mono text-slate-500">#{job.id.slice(0, 6)}</td>
                  <td className="p-4 text-sm text-white font-medium truncate max-w-[200px]">
                    {job.content.trendingTopic || job.prompt}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${job.injectAd ? 'bg-purple-900 text-purple-200' : 'bg-slate-700 text-slate-300'}`}>
                      {job.injectAd ? 'Publicité Incluse' : 'Standard'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {job.status === JobStatus.PUBLISHED && <LucideCheck className="text-emerald-400" size={16} />}
                      {job.status === JobStatus.READY_TO_PUBLISH && <LucideCheck className="text-blue-400" size={16} />}
                      {(job.status === JobStatus.GENERATING_VIDEO || job.status === JobStatus.MERGING_VIDEO) && <LucideClock className="text-yellow-400 animate-pulse" size={16} />}
                      <span className="text-sm text-slate-300 capitalize">
                          {job.status === JobStatus.PUBLISHED ? 'Publié' : 
                           job.status === JobStatus.READY_TO_PUBLISH ? 'Prêt' : 
                           job.status === JobStatus.MERGING_VIDEO ? 'Fusion...' : 'En cours'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      {job.platforms.map(p => (
                        <span key={p} className={`text-[10px] border px-1 rounded ${
                            p === SocialPlatform.TIKTOK ? 'bg-black border-slate-600 text-white' : 
                            p === SocialPlatform.YOUTUBE ? 'bg-red-900/20 border-red-500/50 text-red-400' :
                            'bg-blue-900/20 border-blue-500/50 text-blue-400'
                        }`}>
                          {p === SocialPlatform.TIKTOK ? 'TT' : p === SocialPlatform.YOUTUBE ? 'YT' : 'FB'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {job.status === JobStatus.PUBLISHED ? (
                        <a href="#" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center">
                            <LucideExternalLink size={14} className="mr-1" /> Voir
                        </a>
                    ) : job.status === JobStatus.READY_TO_PUBLISH ? (
                         <button 
                            onClick={() => {
                                onPublish(job.id);
                            }}
                            className={`text-sm flex items-center font-bold text-primary-400 hover:text-primary-300`}
                         >
                            <LucideUploadCloud size={14} className="mr-1" /> Publier
                        </button>
                    ) : (
                        <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
