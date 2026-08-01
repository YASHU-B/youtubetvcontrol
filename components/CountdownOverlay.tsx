"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownData {
    endsAt: number;
    label?: string;
}

export default function CountdownOverlay() {
    const [mounted, setMounted] = useState(false);
    const [countdown, setCountdown] = useState<CountdownData | null>(null);
    const [remaining, setRemaining] = useState(0);
    const [showtime, setShowtime] = useState(false);

    // Listen to Supabase
    useEffect(() => {
        setMounted(true);
        
        // Fetch initial data
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('countdown').eq('id', 'main').single();
            if (data) {
                setCountdown(data.countdown ?? null);
            }
        };
        fetchInitial();

        // Subscribe to changes
        const channel = supabase.channel(`countdown-changes-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' },
                (payload) => {
                    const newData = payload.new as any;
                    setCountdown(newData.countdown ?? null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Ticker
    useEffect(() => {
        if (!countdown) {
            setRemaining(0);
            setShowtime(false);
            return;
        }

        const tick = () => {
            const rem = Math.max(0, Math.round((countdown.endsAt - Date.now()) / 1000));
            setRemaining(rem);

            if (rem === 0) {
                setShowtime(true);
                // Auto-clear after 4 seconds
                setTimeout(async () => {
                    try {
                        await supabase.from('channels').update({ countdown: null }).eq('id', 'main');
                    } catch (_) {}
                    setShowtime(false);
                }, 4000);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [countdown]);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const isLow = remaining <= 10 && remaining > 0;
    const isVisible = !!countdown && (remaining > 0 || showtime);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="countdown-root"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 2147483630,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <AnimatePresence mode="wait">
                        {showtime ? (
                            // Showtime celebration
                            <motion.div
                                key="showtime"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    textAlign: "center",
                                }}
                            >
                                <span style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}>🎉</span>
                                <span style={{
                                    color: "white",
                                    fontWeight: 900,
                                    fontSize: "clamp(2rem, 7vw, 4.5rem)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    textShadow: "0 0 40px rgba(250,204,21,0.8), 0 4px 16px rgba(0,0,0,0.9)",
                                    fontFamily: "system-ui, sans-serif",
                                }}>
                                    It&apos;s Showtime!
                                </span>
                            </motion.div>
                        ) : (
                            // Countdown display
                            <motion.div
                                key="clock"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                }}
                            >
                                {/* Label */}
                                {countdown?.label && (
                                    <motion.span
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            color: "rgba(255,255,255,0.7)",
                                            fontSize: "clamp(0.85rem, 2.5vw, 1.25rem)",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.25em",
                                            fontFamily: "monospace",
                                            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                                        }}
                                    >
                                        {countdown.label}
                                    </motion.span>
                                )}

                                {/* Big clock */}
                                <motion.div
                                    key={remaining}
                                    initial={{ scale: isLow ? 1.15 : 1.03, opacity: 0.7 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.25 }}
                                    style={{
                                        color: isLow ? "#f87171" : "white",
                                        fontWeight: 900,
                                        fontSize: "clamp(4rem, 18vw, 11rem)",
                                        lineHeight: 1,
                                        fontFamily: "'Courier New', monospace",
                                        letterSpacing: "-0.02em",
                                        textShadow: isLow
                                            ? "0 0 60px rgba(248,113,113,0.7), 0 4px 20px rgba(0,0,0,0.9)"
                                            : "0 0 40px rgba(255,255,255,0.2), 0 4px 20px rgba(0,0,0,0.9)",
                                        transition: "color 0.3s",
                                    }}
                                >
                                    {timeStr}
                                </motion.div>

                                {/* Subtitle */}
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    transition={{ delay: 0.3 }}
                                    style={{
                                        color: "white",
                                        fontSize: "clamp(0.65rem, 1.5vw, 0.85rem)",
                                        fontFamily: "monospace",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.35em",
                                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                                    }}
                                >
                                    {isLow ? "⚡ Almost time!" : "Get ready..."}
                                </motion.span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
