"use client";
import FestivalOverlay from "@/components/FestivalOverlay";
import { useEffect, useState } from "react";

export default function DebugPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div className="w-screen h-screen bg-neutral-900 text-white p-10 font-mono">
            <h1 className="text-2xl mb-4 text-yellow-500">Debug Festival Overlay</h1>
            <p>If the overlay works, it should appear on top of this page right now (assuming it's ON in Firebase).</p>
            
            {mounted && <FestivalOverlay isPoweredOn={true} />}
        </div>
    );
}
