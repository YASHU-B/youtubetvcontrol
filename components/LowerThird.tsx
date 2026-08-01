"use client";

import { useEffect, useState, useMemo } from "react";
import { Music2 } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface LowerThirdProps {
    title: string;
    artist?: string;
    trigger: any; // Used to reset animation
}

export default function LowerThird({ title, artist, trigger }: LowerThirdProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!title) return;
        
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 11000); // 11s (1s entry + 10s show)

        return () => clearTimeout(timer);
    }, [trigger, title]);

    if (!title) return null;

    // Advanced Motion Variants
    const boxVariants: Variants = {
        hidden: { scaleY: 0, opacity: 0, transformOrigin: "bottom" },
        visible: { 
            scaleY: 1, 
            opacity: 1,
            transition: { 
                delay: 0.5, 
                duration: 0.5, 
                ease: [0.175, 0.885, 0.32, 1.1] // Elastic overshoot
            }
        },
        exit: { 
            scaleY: 0, 
            opacity: 0, 
            transition: { duration: 0.3, ease: "anticipate" } 
        }
    };

    const glitchTextVariants: Variants = {
        hidden: { opacity: 0, filter: "blur(12px)", y: 10 },
        visible: { 
            opacity: 1, 
            filter: "blur(0px)", 
            y: 0,
            transition: { 
                delay: 0.8,
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    const rgbSplitVariants: Variants = {
        initial: { x: 0 },
        glitch: { 
            x: [-1, 1, -1, 0],
            transition: { 
                delay: 0.8,
                duration: 0.2,
                repeat: 0
            }
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.8rem+env(safe-area-inset-bottom))] left-[calc(1.2rem+env(safe-area-inset-left))] sm:left-[calc(1.5rem+env(safe-area-inset-left))] z-[60] flex flex-col items-start pointer-events-none"
                >
                    {/* Top Tab Label - Ultra Minimal & Faded */}
                    <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 0.5, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-1 mb-0.5 ml-0.5"
                    >
                        <div className="w-[2.5px] h-[2.5px] bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,1)]" />
                        <span className="text-white text-[7px] font-black uppercase tracking-[0.35em] font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                            Now Playing
                        </span>
                    </motion.div>

                    {/* Metadata Content - Text Only (No Box) */}
                    <div className="relative">
                        <motion.h2 
                            variants={glitchTextVariants}
                            className="text-white text-[13px] sm:text-sm font-black truncate max-w-[180px] sm:max-w-[240px] drop-shadow-[0_2px_8px_rgba(0,0,0,1)] italic tracking-tighter uppercase leading-none"
                        >
                            {title}
                        </motion.h2>

                        {/* Faded Accent Underline */}
                        <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.8, duration: 1.2 }}
                            className="h-[1px] w-full bg-gradient-to-r from-red-600/40 via-red-600/5 to-transparent mt-0.5 origin-left"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
