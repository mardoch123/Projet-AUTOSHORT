
import React, { useEffect, useState } from 'react';
import { LucideTrophy, LucideStar, LucideZap, LucideCrown } from 'lucide-react';
import { GamificationStats } from '../types';

interface GamificationProps {
  stats: GamificationStats;
}

export const Gamification: React.FC<GamificationProps> = ({ stats }) => {
  const [prevLevel, setPrevLevel] = useState(stats.level);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // XP needed for next level: Level * 100
  const xpForNextLevel = (stats.level + 1) * 100;
  const xpProgress = (stats.xp % 100); // Simplified for visual (assuming 100xp per level blocks)

  useEffect(() => {
    if (stats.level > prevLevel) {
      setShowLevelUp(true);
      const timer = setTimeout(() => setShowLevelUp(false), 5000);
      setPrevLevel(stats.level);
      return () => clearTimeout(timer);
    }
  }, [stats.level, prevLevel]);

  return (
    <div className="relative mb-8">
      {/* Level Up Overlay */}
      {showLevelUp && (
        <div className="absolute inset-0 -top-20 z-50 flex flex-col items-center justify-center animate-bounce">
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg">
            LEVEL UP!
          </div>
          <div className="text-white font-bold text-lg">Niveau {stats.level} atteint</div>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between shadow-lg relative overflow-hidden group">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 p-16 bg-primary-500/5 blur-3xl rounded-full group-hover:bg-primary-500/10 transition-all duration-500"></div>

        <div className="flex items-center space-x-4 z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-primary-500 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
               {stats.level >= 10 ? <LucideCrown className="text-yellow-400" size={28} /> : 
                stats.level >= 5 ? <LucideTrophy className="text-purple-400" size={28} /> :
                <LucideZap className="text-primary-400" size={28} />}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
              {stats.level}
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold text-lg flex items-center">
              {stats.title}
              <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full border border-slate-600">
                Série: {stats.streak} 🔥
              </span>
            </h3>
            <div className="flex items-center text-xs text-slate-400 mt-1">
              <LucideStar size={12} className="text-yellow-500 mr-1" />
              <span>{stats.xp} XP Total</span>
            </div>
          </div>
        </div>

        <div className="flex-1 mx-8 z-10">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progression</span>
            <span>{xpProgress} / 100 XP</span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-primary-600 via-primary-400 to-purple-400 relative"
              style={{ width: `${xpProgress}%`, transition: 'width 1s ease-out' }}
            >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
