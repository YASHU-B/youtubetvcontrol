"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VibeOverlayProps {
    className?: string;
    intensity?: number;
}

export default function VibeOverlay({ className, intensity = 1 }: VibeOverlayProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className={cn("fixed inset-0 pointer-events-none z-[45] overflow-hidden", className)}>
            {/* Elegant cinematic vignette for depth */}
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.35)]" />
        </div>
    );
}
