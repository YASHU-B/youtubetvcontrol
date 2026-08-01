"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function SpotlightOverlay() {
    const [mounted, setMounted] = useState(false);
    const [text, setText] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('spotlight').eq('id', 'main').single();
            if (data) {
                const s = data.spotlight as any;
                setText(s?.text ?? null);
            }
        };
        fetchInitial();

        const channel = supabase.channel(`spotlight-changes-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' },
                (payload) => {
                    const data = payload.new as any;
                    const s = data.spotlight;
                    setText(s?.text ?? null);

                    // Auto-clear from Supabase after 6 seconds
                    if (s?.text && s?.sentAt) {
                        const age = Date.now() - s.sentAt;
                        const remaining = Math.max(0, 6000 - age);
                        const timer = setTimeout(async () => {
                            try {
                                await supabase.from('channels').update({ spotlight: null }).eq('id', 'main');
                            } catch (_) {}
                        }, remaining);
                        // Can't easily cleanup timer on unmount from inside listener, but it's safe.
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {text && (
                <motion.div
                    key={text}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 2147483620,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2rem",
                        pointerEvents: "none",
                    }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05, y: -20 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                >
                    {/* Radial glow behind text */}
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />

                    <motion.p
                        style={{
                            position: "relative",
                            color: "white",
                            fontWeight: 900,
                            fontSize: "clamp(2rem, 8vw, 5.5rem)",
                            lineHeight: 1.2,
                            textAlign: "center",
                            textShadow: "0 0 60px rgba(255,255,255,0.2), 0 4px 24px rgba(0,0,0,1)",
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            letterSpacing: "-0.01em",
                            maxWidth: "85vw",
                        }}
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {text}
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
