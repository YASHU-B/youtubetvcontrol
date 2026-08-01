"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";

interface Reaction {
    id: string;
    emoji: string;
    x: number;
}

export default function ReactionsOverlay() {
    const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const channel = supabase.channel(`reactions-insert-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reactions' },
                (payload) => {
                    const data = payload.new as any;
                    const id = data.id;
                    const newReaction: Reaction = {
                        id,
                        emoji: data.type || data.emoji,
                        // Stack them randomly in the right 15% of the screen
                        x: Math.random() * 10 + 82,
                    };

                    setActiveReactions((prev) => [...prev, newReaction]);

                    setTimeout(() => {
                        setActiveReactions((prev) => prev.filter((r) => r.id !== id));
                    }, 4500);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 2147483647, // max possible z-index
                overflow: "hidden",
            }}
        >
            <AnimatePresence>
                {activeReactions.map((reaction) => (
                    <motion.div
                        key={reaction.id}
                        style={{
                            position: "absolute",
                            bottom: "5%",
                            left: `${reaction.x}%`,
                            fontSize: "1.6rem",
                            userSelect: "none",
                            lineHeight: 1,
                            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                        }}
                        initial={{ y: 0, opacity: 0, scale: 0.5 }}
                        animate={{
                            y: -400,
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1.1, 1],
                            rotate: [0, 10, -10, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3.5, ease: "easeOut" }}
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
}
