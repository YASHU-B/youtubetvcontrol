"use client";

import { useChannelSync } from "../hooks/useChannelSync";
import { useViewerCount } from "../hooks/useViewerCount";
import { Radio, Users, Bell, BellRing, Loader2 } from "lucide-react"; // Added Bell icons
import clsx from 'clsx';
import { useFCM } from "../hooks/useFCM"; // Import hook
import { useState } from "react";

export default function ChannelOSD() {
    const syncState = useChannelSync();
    const viewerCount = useViewerCount(true);
    const { requestPermission, permission, fcmToken, isSupported } = useFCM();
    const [subscribing, setSubscribing] = useState(false);

    const video = syncState?.video;

    const handleSubscribe = async () => {
        if (!isSupported) {
            alert("Your browser/device doesn't support Web Notifications. Try using a modern browser like Chrome or installing this app to your Home Screen (PWA).");
            return;
        }
        
        setSubscribing(true);
        const success = await requestPermission();
        setSubscribing(false);
        
        if (success) {
            alert("Success! You'll now receive alerts for new live broadcasts.");
        } else if (Notification.permission === 'denied') {
            alert("Notification permission was denied. Please enable it in your browser settings to get notified.");
        }
    };

    return (
        <div className="fixed top-0 left-0 w-full p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] flex flex-col justify-start z-[500] pointer-events-none">
            {/* Compact Top Left Section */}
            <div className="flex items-center gap-3 px-4 py-3 pointer-events-auto"> {/* Enable pointer events for button */}
                <Radio className={clsx("w-5 h-5 drop-shadow-md shrink-0", video ? "text-red-500 animate-pulse" : "text-neutral-500")} />

                <div className="flex flex-col justify-center gap-0.5 drop-shadow-md">
                    <h1 className="font-bold text-white tracking-widest text-xs sm:text-sm uppercase leading-none font-mono shadow-black drop-shadow-lg">
                        YashuBeatz
                    </h1>
                    {video && (
                        <div className="flex items-center gap-4 sm:gap-3">
                            <span className="text-[10px] sm:text-xs text-neutral-300 font-mono font-medium tracking-wide uppercase tabular-nums leading-none">
                                LIVE • <span className="text-white font-bold">{viewerCount}</span> <span className="hidden xs:inline">Watching</span>
                            </span>

                            {/* Subscribe Button - Enhanced Mobile Target */}
                            {permission !== 'granted' && !fcmToken && (
                                <button
                                    onClick={handleSubscribe}
                                    disabled={subscribing}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 pointer-events-auto shadow-lg"
                                >
                                    {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                    <span className="hidden xs:inline">Get Notified</span>
                                    <span className="xs:hidden">Notify</span>
                                </button>
                            )}
                            {permission === 'granted' && (
                                <span className="flex items-center gap-1.5 text-green-400 text-[10px] sm:text-xs font-mono uppercase tracking-wider">
                                    <BellRing className="w-3 h-3" /> <span className="hidden xs:inline">Subscribed</span><span className="xs:hidden">On</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Subtle Gradient for readability */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-[-1]" />
        </div>
    );
}
