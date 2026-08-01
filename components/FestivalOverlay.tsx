import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Robust Overlay using the proven createPortal approach that matches DedicationOverlay
export default function FestivalOverlay({ isPoweredOn }: { isPoweredOn: boolean }) {
    const [mounted, setMounted] = useState(false);
    const [festivalState, setFestivalState] = useState<{ isActive: boolean, label?: string } | null>(null);
    const [isCycleVisible, setIsCycleVisible] = useState(true);
    
    useEffect(() => {
        setMounted(true);
        
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('festival').eq('id', 'main').single();
            if (data) setFestivalState(data.festival as any || null);
        };
        fetchInitial();

        // Listen DIRECTLY to Supabase to bypass any hook-level state issues
        const channel = supabase.channel(`festival-changes-${Math.random()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' },
                (payload) => {
                    const data = payload.new as any;
                    setFestivalState(data.festival || null);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // 60-second cycle: Show for 10s, Hide for 50s
    useEffect(() => {
        if (!festivalState?.isActive) return;

        // Reset visibility to true when activated
        setIsCycleVisible(true);

        const cycleLength = 60000; // 60s
        const showDuration = 10000; // 10s

        let timeout: ReturnType<typeof setTimeout>;

        const runCycle = () => {
            setIsCycleVisible(true);
            timeout = setTimeout(() => {
                setIsCycleVisible(false);
            }, showDuration);
        };

        // Start cycle timer
        runCycle();
        const interval = setInterval(runCycle, cycleLength);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [festivalState?.isActive]);

    const isActive = !!festivalState?.isActive;
    const label = festivalState?.label || "FESTIVE THEME ACTIVE";
    
    if (!mounted || !isActive || !isPoweredOn || !isCycleVisible) return null;

    return createPortal(
        <div 
            id="festival-root-portal"
            style={{ 
                position: "fixed",
                inset: 0,
                zIndex: 2147483647, // Max 32-bit integer
                pointerEvents: 'none',
                overflow: 'hidden',
                display: 'block',
                transform: 'translateZ(0)', // Force GPU hardware acceleration layer on TVs
                WebkitTransform: 'translateZ(0)'
            }}
        >
            {/* Drifting Sparks Background */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
                {Array.from({ length: 15 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-yellow-400 rounded-full shadow-[0_0_8px_white]"
                        style={{
                            position: "absolute",
                            width: (Math.random() * 5 + 2) + 'px',
                            height: (Math.random() * 5 + 2) + 'px',
                            left: (Math.random() * 100) + '%',
                            top: (Math.random() * 100) + '%',
                            filter: 'blur(1px)',
                            animation: `float-spark ${Math.random() * 3 + 4}s linear infinite`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            {/* Top-Center Banner - Premium TV Broadcast Style */}
            <div className="animate-bg-expand" style={{
                position: "absolute",
                top: "4rem",
                left: "50%",
                padding: "0.6rem 1.6rem",
                background: "linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(25,25,25,0.85) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(234,179,8,0.3)",
                borderLeft: "4px solid #eab308",
                borderRight: "4px solid #eab308",
                borderRadius: "0.5rem",
                boxShadow: "0 10px 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(234,179,8,0.2)",
                overflow: "hidden"
            }}>
                {/* Shine effect passing over the box */}
                <div className="animate-shine-sweep" style={{
                    position: "absolute",
                    top: 0, bottom: 0,
                    width: "40px",
                    background: "linear-gradient(90deg, transparent, rgba(234,179,8,0.5), transparent)",
                    transform: "skewX(-25deg)",
                    zIndex: 0
                }} />

                <div className="animate-content-reveal" style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    zIndex: 1
                }}>
                    <div className="animate-spin-slow">
                        <Star color="#facc15" fill="#facc15" size={18} />
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{
                            fontSize: "7.5px",
                            color: "#fcd34d",
                            fontFamily: "system-ui, sans-serif",
                            letterSpacing: "0.4em",
                            textTransform: "uppercase",
                            marginBottom: "0.15rem",
                            opacity: 0.9
                        }}>Live Special</span>
                        <h2 style={{
                            fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
                            fontWeight: 800,
                            fontFamily: "system-ui, sans-serif",
                            letterSpacing: "0.05em",
                            color: "#ffffff",
                            textTransform: "uppercase",
                            textShadow: "0 2px 15px rgba(234,179,8,0.4)"
                        }}>
                            {label}
                        </h2>
                    </div>

                    <div className="animate-pulse">
                        <Sparkles color="#facc15" size={16} />
                    </div>
                </div>
            </div>

            {/* TV-style bottom decorative bar */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(to right, transparent, #eab308, transparent)",
                opacity: 0.5,
                boxShadow: "0 0 20px rgba(234,179,8,0.5)"
            }} />

            <style>{`
                @keyframes float-spark {
                    0% { transform: translateY(110vh) translateX(0) scale(0); opacity: 0; }
                    20% { opacity: 0.8; transform: translateY(80vh) translateX(10px) scale(1); }
                    80% { opacity: 0.8; transform: translateY(20vh) translateX(-10px) scale(1); }
                    100% { transform: translateY(-10vh) translateX(20px) scale(0); opacity: 0; }
                }
                @keyframes bg-expand {
                    0% { transform: translateX(-50%) scaleX(0); opacity: 0; }
                    5% { transform: translateX(-50%) scaleX(1); opacity: 1; }
                    95% { transform: translateX(-50%) scaleX(1); opacity: 1; }
                    100% { transform: translateX(-50%) scaleX(0); opacity: 0; }
                }
                @keyframes content-reveal {
                    0%, 5% { transform: scale(0.8) translateY(10px); opacity: 0; filter: blur(4px); }
                    10% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
                    90% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
                    95%, 100% { transform: scale(0.9) translateY(10px); opacity: 0; filter: blur(4px); }
                }
                @keyframes shine-sweep {
                    0%, 15% { left: -50px; opacity: 0; }
                    20% { opacity: 1; }
                    40% { left: 120%; opacity: 0; }
                    100% { left: 120%; opacity: 0; }
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-bg-expand {
                    animation: bg-expand 10s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-content-reveal {
                    animation: content-reveal 10s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-shine-sweep {
                    animation: shine-sweep 10s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
