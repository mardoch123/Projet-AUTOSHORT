
import React from 'react';
import { LucideLayoutDashboard, LucideVideo, LucideSettings, LucideHistory, LucideCpu, LucideBarChart3 } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'create', label: 'Studio Création', icon: LucideVideo },
    { id: 'queue', label: 'File d\'attente', icon: LucideLayoutDashboard },
    { id: 'analytics', label: 'Statistiques', icon: LucideBarChart3 }, // New Tab
    { id: 'blueprint', label: 'Blueprint (Tech)', icon: LucideCpu },
    { id: 'settings', label: 'Réglages & API', icon: LucideSettings },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-purple-500">
          AutoShorts AI
        </h1>
        <p className="text-xs text-slate-500 mt-1">v2.1 Education Edition</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase font-bold mb-2">État du Système</p>
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Gemini 2.5
            </span>
            <span>Actif</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-400 mt-1">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Veo Video
            </span>
            <span>Actif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
