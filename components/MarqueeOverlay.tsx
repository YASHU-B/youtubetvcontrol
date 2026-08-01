"use client";

import { useChannelSync } from "../hooks/useChannelSync";

export default function MarqueeOverlay() {
    const syncState = useChannelSync();

    if (!syncState?.marquee) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-[calc(1.75rem+env(safe-area-inset-top))] sm:h-[calc(2.25rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-[env(safe-area-inset-right)] bg-black/40 backdrop-blur-xl border-b border-white/5 z-[110] flex items-center overflow-hidden pointer-events-none">
            <div className="whitespace-nowrap animate-marquee-single w-full">
                <span className="text-white font-medium text-[10px] sm:text-xs uppercase tracking-[0.3em] px-4 opacity-90 pl-[env(safe-area-inset-left)]">
                    {syncState.marquee}
                </span>
            </div>

            <style jsx>{`
                .animate-marquee-single {
                    display: inline-block;
                    padding-left: 100%;
                    animation: marquee-single 20s linear infinite;
                }

                @keyframes marquee-single {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
