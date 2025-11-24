
import React from 'react';
import { LucideServer, LucideDatabase, LucideCloud, LucideClock, LucideZap } from 'lucide-react';

export const ArchitectureBlueprint: React.FC = () => {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Technical Blueprint v3.0 (Vercel Serverless)</h2>
        <p className="text-slate-400 mt-2">
          Hybrid Architecture: Client-Side Interactive Studio + Vercel Serverless Automation.
        </p>
      </div>

      {/* 1. High Level Architecture Diagram */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-primary-400 mb-6 flex items-center">
          <LucideCloud className="mr-2" /> Vercel Cloud Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
          <div className="p-4 bg-slate-900 rounded-lg border border-purple-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] px-1">NEW</div>
            <div className="font-bold text-white">Vercel Cron</div>
            <div className="text-xs text-slate-400">scheduler</div>
            <div className="mt-2 text-xs bg-slate-800 p-1 rounded font-mono">08:00 & 18:00</div>
          </div>
          <div className="hidden md:flex items-center justify-center text-slate-500">➔ POST ➔</div>
          <div className="p-4 bg-slate-900 rounded-lg border border-emerald-500">
            <div className="font-bold text-white">/api/cron</div>
            <div className="text-xs text-slate-400">Serverless Fn</div>
            <div className="mt-2 text-xs bg-emerald-900/50 text-emerald-200 p-1 rounded">Node.js Env</div>
          </div>
           <div className="hidden md:flex items-center justify-center text-slate-500">➔ Call ➔</div>
          <div className="p-4 bg-slate-900 rounded-lg border border-primary-600">
            <div className="font-bold text-white">Gemini + Veo</div>
            <div className="text-xs text-slate-400">AI Models</div>
            <div className="mt-2 text-xs bg-slate-800 p-1 rounded">API_KEY (Server)</div>
          </div>
          <div className="hidden md:flex items-center justify-center text-slate-500">➔ Client ➔</div>
           <div className="p-4 bg-slate-900 rounded-lg border border-blue-500 opacity-50">
            <div className="font-bold text-white">LocalStorage</div>
            <div className="text-xs text-slate-400">Browser State</div>
          </div>
        </div>
      </div>

      {/* 3. Backend Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
            <LucideServer className="mr-2" /> Server-Side (Vercel)
            </h3>
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    The <code>/api/cron.ts</code> function runs in a secure Node.js environment.
                </p>
                <div className="bg-slate-950 p-3 rounded text-xs text-emerald-200 font-mono overflow-x-auto">
{`// vercel.json
{
  "crons": [
    { "path": "/api/cron", "schedule": "0 8 * * *" }
  ]
}

// api/cron.ts
export default async function handler(req) {
  const ai = new GoogleGenAI({ key: process.env.API_KEY });
  const video = await ai.models.generateVideos({...});
  // Logic to save video to DB would go here
  return Response.json({ success: true });
}`}
                </div>
            </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
            <LucideZap className="mr-2" /> Client-Side (Fallback)
            </h3>
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    The React App still maintains the "Smart Catch-up" logic. If the server fails or if you are running locally without Vercel emulation, the browser takes over.
                </p>
                <div className="bg-slate-950 p-3 rounded text-xs text-blue-200 font-mono">
{`// App.tsx
useEffect(() => {
   // Check if we missed the morning slot
   // Triggers local generation if needed
   if (missedMorningSlot) runCatchUp();
}, []);`}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
