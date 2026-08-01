"use client";

import { Radio } from "lucide-react";

export default function StayTuned() {
    return (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center text-white z-40">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none" />

            <div className="relative flex flex-col items-center gap-6 animate-fade-in">
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Radio size={32} className="text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-full opacity-50 animate-pulse" />
                </div>

                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Stay Tuned
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase">
                        More on YashuBeatz
                    </p>
                </div>
            </div>

            {/* Retro scanline overlap */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] bg-[length:100%_2px,3px_100%]" />
        </div>
    );
}
