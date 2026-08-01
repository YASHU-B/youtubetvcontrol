"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface Poll {
    question: string;
    options: string[];
    votes: Record<string, number>;
    showOnScreen: boolean;
}

// Animated bar
function VoteBar({ label, votes, total, color }: { label: string; votes: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: "clamp(0.85rem, 2.5vw, 1.15rem)" }}>{label}</span>
                <span style={{ color, fontWeight: 800, fontSize: "clamp(0.85rem, 2.5vw, 1.2rem)", fontFamily: "monospace" }}>{pct}%</span>
            </div>
            <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                <motion.div
                    style={{ height: "100%", borderRadius: "999px", background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", fontFamily: "monospace" }}>{votes} votes</span>
        </div>
    );
}

const BAR_COLORS = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"];

export default function PollResultsOverlay() {
    const [mounted, setMounted] = useState(false);
    const [poll, setPoll] = useState<Poll | null>(null);

    useEffect(() => {
        setMounted(true);
        
        const fetchState = async () => {
            const { data: channelData } = await supabase.from('channels').select('poll').eq('id', 'main').single();
            if (channelData?.poll) {
                const p = channelData.poll as any;
                if (p.showOnScreen) {
                    // Also fetch live votes to override potentially stale JSON
                    const { data: votesData } = await supabase.from('poll_votes').select('optionIndex');
                    const aggregatedVotes: Record<string, number> = {};
                    votesData?.forEach(v => {
                        aggregatedVotes[String(v.optionIndex)] = (aggregatedVotes[String(v.optionIndex)] || 0) + 1;
                    });
                    setPoll({ ...p, votes: aggregatedVotes });
                } else {
                    setPoll(null);
                }
            }
        };

        fetchState();

        // Listen to channel changes (for visibility and question)
        const channelSub = supabase.channel(`poll-changes-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, () => {
                fetchState();
            })
            .subscribe();

        // Listen to votes directly
        const votesSub = supabase.channel(`votes-realtime-${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, () => {
                fetchState();
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channelSub);
            supabase.removeChannel(votesSub);
        };
    }, []);

    const total = poll ? Object.values(poll.votes || {}).reduce((a, b) => a + b, 0) : 0;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {poll && (
                <motion.div
                    key="poll-overlay"
                    style={{
                        position: "fixed",
                        bottom: "6rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 2147483610,
                        width: "min(92vw, 520px)",
                        pointerEvents: "none",
                    }}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ type: "spring", stiffness: 180, damping: 22 }}
                >
                    {/* Card */}
                    <div style={{
                        background: "rgba(0,0,0,0.82)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "1.25rem",
                        padding: "1.25rem 1.5rem",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.2em", fontFamily: "monospace" }}>
                                🗳️ LIVE POLL
                            </span>
                            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>· {total} votes</span>
                        </div>

                        {/* Question */}
                        <p style={{
                            color: "white",
                            fontWeight: 800,
                            fontSize: "clamp(1rem, 3vw, 1.35rem)",
                            marginBottom: "1rem",
                            lineHeight: 1.3,
                        }}>
                            {poll.question}
                        </p>

                        {/* Bars */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {poll.options.map((opt, i) => (
                                <VoteBar
                                    key={i}
                                    label={opt}
                                    votes={poll.votes?.[String(i)] || 0}
                                    total={total}
                                    color={BAR_COLORS[i % BAR_COLORS.length]}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
