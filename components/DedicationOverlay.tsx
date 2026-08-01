"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface DedicationData {
    id?: string;
    from: string;
    to: string;
    song_name?: string;
    message: string;
    isVisible?: boolean;
    vibe?: 'love' | 'mass'; // controls particle style
}

const LOVE_PARTICLES = ["💗", "❤️", "💕", "🌹", "💖", "💌", "🫶", "💞", "💝"];
const MASS_PARTICLES = ["🔥", "💥", "🎉", "⚡", "🤘", "🎊", "💫", "🏆"];

function FloatingParticle({ index, vibe }: { index: number; vibe: 'love' | 'mass' }) {
    const pool = vibe === 'mass' ? MASS_PARTICLES : LOVE_PARTICLES;
    const emoji = pool[index % pool.length];
    const left = 5 + (index * 17 + index * 9) % 90;
    const delay = (index * 0.2) % 2.0;
    const duration = 2.0 + (index % 3) * 0.5;
    const size = 11 + (index % 3) * 4; // Compact sizes: 11px to 19px
    return (
        <motion.span
            className="absolute pointer-events-none select-none"
            style={{ left: `${left}%`, bottom: "0%", fontSize: size }}
            animate={{ y: [0, -75], opacity: [0, 0.9, 0.9, 0], scale: [0.8, 1.1, 1.1, 0.8] }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
        >
            {emoji}
        </motion.span>
    );
}

export default function DedicationOverlay() {
    const [mounted, setMounted] = useState(false);
    const [dedication, setDedication] = useState<DedicationData | null>(null);

    useEffect(() => {
        setMounted(true);

        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('currentDedication').eq('id', 'main').single();
            if (data) {
                const d = data.currentDedication as any;
                if (d && d.isVisible !== false) setDedication(d);
            }
        };
        fetchInitial();

        const channel = supabase.channel(`dedication-changes-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' },
                (payload) => {
                    const data = payload.new as any;
                    const d = data.currentDedication;
                    if (d && d.isVisible !== false) {
                        setDedication(d);
                    } else {
                        setDedication(null);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {dedication && (
                <motion.div
                    key={dedication.id || 'dedication-root'}
                    className="fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] left-[calc(1.2rem+env(safe-area-inset-left))] md:top-auto md:right-auto md:left-6 md:bottom-6 z-[2147483640] pointer-events-none select-none max-w-[calc(100vw-2rem)] w-[205px] md:w-[260px]"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                >
                    {/* Compact Card container */}
                    <div className="relative w-full pointer-events-auto">
                        {/* Glow background matches vibe */}
                        <div 
                            className="absolute -inset-1 rounded-lg opacity-60 blur-md transition-all duration-300"
                            style={{
                                background: dedication.vibe === 'mass'
                                    ? "radial-gradient(circle, rgba(251,146,60,0.45) 0%, transparent 80%)"
                                    : "radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 80%)",
                            }}
                        />

                        {/* Localized Floating particles */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 rounded-lg">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <FloatingParticle key={i} index={i} vibe={dedication.vibe ?? 'love'} />
                            ))}
                        </div>

                        {/* Premium Card body */}
                        <div 
                            className="relative px-2.5 py-1.5 md:py-2 rounded-lg border flex flex-col gap-0.5 shadow-lg backdrop-blur-md"
                            style={{
                                background: "rgba(10, 10, 10, 0.85)",
                                borderColor: dedication.vibe === 'mass'
                                    ? "rgba(251, 146, 60, 0.45)"
                                    : "rgba(236, 72, 153, 0.4)",
                                boxShadow: dedication.vibe === 'mass'
                                    ? "0 4px 15px rgba(251, 146, 60, 0.15)"
                                    : "0 4px 15px rgba(236, 72, 153, 0.15)",
                            }}
                        >
                            {/* Header row (Vibe badge & optional song tag) */}
                            <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-1">
                                <div className="flex items-center gap-0.5">
                                    <span className="text-[8px] md:text-[9px]">{dedication.vibe === 'mass' ? '🔥' : '💖'}</span>
                                    <span 
                                        className="text-[7.5px] md:text-[8px] font-bold uppercase tracking-wider font-mono"
                                        style={{ color: dedication.vibe === 'mass' ? '#fb923c' : '#f472b6' }}
                                    >
                                        {dedication.vibe === 'mass' ? 'Mass' : 'Special'}
                                    </span>
                                </div>
                                {dedication.song_name && (
                                    <div className="flex items-center gap-0.5 max-w-[55%] overflow-hidden text-ellipsis whitespace-nowrap">
                                        <span className="text-[8px] md:text-[9px] text-blue-400">🎵</span>
                                        <span className="text-[7.5px] md:text-[8px] font-mono text-blue-300 font-medium truncate uppercase tracking-wide">
                                            {dedication.song_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Message text */}
                            <p className="text-[10px] md:text-[11px] text-white italic font-serif leading-tight py-0.5">
                                "{dedication.message}"
                            </p>

                            {/* From → To block */}
                            <div className="flex items-center justify-between gap-1 mt-0.5 pt-1 border-t border-white/5 text-[8px] md:text-[9px] font-mono uppercase tracking-wide">
                                <span className="text-white/40">From: <strong className="text-white font-semibold">{dedication.from}</strong></span>
                                <span className="text-white/20">→</span>
                                <span 
                                    className="font-semibold"
                                    style={{ color: dedication.vibe === 'mass' ? '#fdba74' : '#f9a8d4' }}
                                >
                                    To: {dedication.to}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
