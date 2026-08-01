"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

interface VideoInfo {
    id: string;
    title: string;
    artist?: string;
    duration: number;
}

interface ChannelData {
    status: string;
    videoId: string;
    title: string;
    artist: string;
    duration: number;
    startedAt: number;
    nextVideo: VideoInfo | null;
    isLooping: boolean;
    isLive: boolean;
    mediaType: string;
}

function getThumb(id: string): string {
    if (!id || id.startsWith("http")) return "";
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

export default function ComingUpNextOverlay({ isPoweredOn }: { isPoweredOn: boolean }) {
    const [mounted, setMounted] = useState(false);
    const [channel, setChannel] = useState<ChannelData | null>(null);
    const [show, setShow] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Mount guard (required for createPortal + SSR)
    useEffect(() => {
        setMounted(true);
    }, []);

    // Self-contained Supabase listener
    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('*').eq('id', 'main').single();
            if (data && data.status === 'playing') {
                setChannel({
                    status: data.status,
                    videoId: data.videoId,
                    title: data.title || "",
                    artist: data.artist || "",
                    duration: data.duration || 0,
                    startedAt: Number(data.startedAt) || Date.now(),
                    nextVideo: data.nextVideo ?? null,
                    isLooping: !!data.isLooping,
                    isLive: !!data.isLive,
                    mediaType: data.mediaType || "youtube",
                });
            } else {
                setChannel(null);
            }
        };
        fetchInitial();

        const sub = supabase.channel(`coming-up-changes-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' },
                (payload) => {
                    const data = payload.new as any;
                    if (data.status !== "playing") { setChannel(null); return; }
                    setChannel({
                        status: data.status,
                        videoId: data.videoId,
                        title: data.title || "",
                        artist: data.artist || "",
                        duration: data.duration || 0,
                        startedAt: Number(data.startedAt) || Date.now(),
                        nextVideo: data.nextVideo ?? null,
                        isLooping: !!data.isLooping,
                        isLive: !!data.isLive,
                        mediaType: data.mediaType || "youtube",
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    // Unified ticker: re-evaluate show + countdown every 500ms using live elapsed time.
    // This is critical — the show condition depends on Date.now(), not on Firestore updates
    // (which only happen when the admin makes changes, not every second mid-song).
    useEffect(() => {
        if (tickRef.current) clearInterval(tickRef.current);

        if (!channel || channel.isLive || channel.duration <= 0 || !isPoweredOn) {
            setShow(false);
            setCountdown(null);
            setProgress(0);
            return;
        }

        const tick = () => {
            const elapsed = (Date.now() - channel.startedAt) / 1000;
            const remaining = channel.duration - elapsed;
            const hasNext = !!channel.nextVideo || channel.isLooping;
            const triggerWindow = hasNext ? 12 : 2;

            if (remaining <= triggerWindow && remaining >= -3) {
                setShow(true);
                setCountdown(Math.ceil(Math.max(0, remaining)));
                setProgress(Math.min(elapsed / channel.duration, 1));
            } else {
                setShow(false);
                setCountdown(null);
                setProgress(0);
            }
        };

        tick(); // run immediately
        tickRef.current = setInterval(tick, 500);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [channel, isPoweredOn]);

    if (!mounted) return null;

    // What to display as "next"
    const displayVideo: VideoInfo | null = channel?.nextVideo ?? (
        channel?.isLooping
            ? { id: channel.videoId, title: channel.title, artist: channel.artist, duration: channel.duration }
            : null
    );

    const isVisible = show && !!channel;
    const thumbId = displayVideo?.id && !displayVideo.id.startsWith("http") ? displayVideo.id : null;
    const showCountdown = countdown !== null && countdown <= 12;

    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2147483600,
                pointerEvents: "none",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 0.8s ease-in-out",
                overflow: "hidden",
            }}
            aria-hidden={!isVisible}
        >
            {/* Only render internals when visible to avoid wasted paint */}
            {isVisible && (
                <>
                    {/* Blurred thumbnail background */}
                    {thumbId ? (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage: `url(${getThumb(thumbId)})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                filter: "blur(30px) brightness(0.25) saturate(1.5)",
                                transform: "scale(1.1)",
                            }}
                        />
                    ) : (
                        <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
                    )}

                    {/* Gradient overlays */}
                    <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.9) 100%)",
                    }} />
                    <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(to right, rgba(0,0,0,0.6), transparent, rgba(0,0,0,0.6))",
                    }} />

                    {/* Scanlines */}
                    <div style={{
                        position: "absolute", inset: 0,
                        backgroundImage: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.4) 50%)",
                        backgroundSize: "100% 3px",
                        opacity: 0.12,
                    }} />

                    {/* Channel watermark */}
                    <div style={{
                        position: "absolute", top: 32, right: 32, opacity: 0.3,
                        display: "flex", flexDirection: "column", alignItems: "flex-end",
                        fontFamily: "system-ui, sans-serif",
                    }}>
                        <span style={{ color: "white", fontWeight: 900, fontStyle: "italic", fontSize: 18, letterSpacing: "-0.04em", lineHeight: 1 }}>
                            YASHUBEATZ<span style={{ color: "#dc2626" }}>TV</span>
                        </span>
                        <span style={{ color: "#737373", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 3 }}>
                            Broadcast Center
                        </span>
                    </div>

                    {/* Main content */}
                    <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 32, padding: "0 32px",
                        animation: "comingUpFadeIn 0.8s ease-out both",
                    }}>
                        {/* "Coming Up Next" label */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                                display: "inline-block", animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
                            }} />
                            <span style={{
                                color: "#f87171", fontSize: 12, fontWeight: 900, textTransform: "uppercase",
                                letterSpacing: "0.35em", fontFamily: "monospace",
                            }}>
                                Coming Up Next
                            </span>
                            <span style={{
                                width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                                display: "inline-block", animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite 0.2s",
                            }} />
                        </div>

                        {/* Song card */}
                        {displayVideo && (
                            <div style={{
                                display: "flex", flexDirection: "row", alignItems: "center",
                                gap: 40, maxWidth: 800, width: "100%",
                                flexWrap: "wrap", justifyContent: "center",
                            }}>
                                {/* Thumbnail */}
                                {thumbId && (
                                    <div style={{
                                        flexShrink: 0, width: 200, height: 130,
                                        borderRadius: 12, overflow: "hidden",
                                        boxShadow: "0 0 60px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)",
                                    }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getThumb(thumbId)}
                                            alt={displayVideo.title}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    </div>
                                )}

                                {/* Text */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: thumbId ? "left" : "center", flex: 1, minWidth: 200 }}>
                                    {channel?.isLooping && (
                                        <span style={{
                                            display: "inline-flex", alignItems: "center", gap: 4,
                                            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em",
                                            background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.4)",
                                            color: "#fde047", padding: "4px 10px", borderRadius: 999, fontFamily: "monospace",
                                            width: "fit-content",
                                        }}>
                                            🔁 Now Looping
                                        </span>
                                    )}
                                    <h2 style={{
                                        color: "white", fontWeight: 900, margin: 0,
                                        fontSize: "clamp(1.4rem, 4vw, 2.8rem)",
                                        letterSpacing: "-0.02em", lineHeight: 1.2,
                                        textShadow: "0 4px 20px rgba(0,0,0,0.8)",
                                        fontFamily: "system-ui, sans-serif",
                                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                                    }}>
                                        {displayVideo.title}
                                    </h2>
                                    {displayVideo.artist && (
                                        <p style={{
                                            color: "rgba(212,212,212,0.85)", margin: 0,
                                            fontSize: "clamp(1rem, 2.5vw, 1.4rem)", fontWeight: 500,
                                            letterSpacing: "0.02em", fontFamily: "system-ui, sans-serif",
                                        }}>
                                            {displayVideo.artist}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Progress bar + countdown */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: 360 }}>
                            {/* Track */}
                            <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", width: `${progress * 100}%`,
                                    background: "linear-gradient(to right, #dc2626, #f87171, rgba(255,255,255,0.8))",
                                    borderRadius: 999,
                                    boxShadow: "0 0 8px rgba(220,38,38,0.8)",
                                    transition: "width 0.5s linear",
                                }} />
                            </div>

                            {/* Countdown */}
                            {showCountdown && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ color: "#737373", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                                        Switching in
                                    </span>
                                    <span style={{
                                        color: countdown !== null && countdown <= 3 ? "#f87171" : "white",
                                        fontWeight: 900, fontFamily: "monospace", fontSize: 28,
                                        letterSpacing: "-0.02em",
                                        animation: countdown !== null && countdown <= 3 ? "pulse 1s ease-in-out infinite" : "none",
                                    }}>
                                        {countdown !== null ? String(countdown).padStart(2, "0") : "--"}
                                    </span>
                                    <span style={{ color: "#737373", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                                        sec
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom accent line */}
                    <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
                        background: "linear-gradient(to right, transparent, rgba(220,38,38,0.6), transparent)",
                    }} />
                </>
            )}

            <style>{`
                @keyframes comingUpFadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>,
        document.body
    );
}
