"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Gift, X, Loader2, User, Music, Heart, MessageSquare } from "lucide-react";
import { clsx } from "clsx";

interface Message {
    id: string;
    text: string;
    author?: string;
    created_at: string;
    receivedAt?: number; // Local timestamp for accurate visibility timing
}

const safeLocalStorage = {
    getItem: (key: string): string | null => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return localStorage.getItem(key);
            }
        } catch (e) {
            console.warn("localStorage.getItem failed:", e);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn("localStorage.setItem failed:", e);
        }
    }
};

const safeSessionStorage = {
    getItem: (key: string): string | null => {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return sessionStorage.getItem(key);
            }
        } catch (e) {
            console.warn("sessionStorage.getItem failed:", e);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                sessionStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn("sessionStorage.setItem failed:", e);
        }
    }
};

// Memory fallback for environments where storage is blocked (e.g. TV Browsers/private tabs)
let memorySessionId: string | null = null;
const getSessionId = (): string => {
    const existing = safeSessionStorage.getItem('tv_session_id');
    if (existing) return existing;
    if (memorySessionId) return memorySessionId;
    memorySessionId = 'anon_' + Math.random().toString(36).substring(2, 15);
    safeSessionStorage.setItem('tv_session_id', memorySessionId);
    return memorySessionId;
};

let memoryUserName: string | null = null;

export default function LiveChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Dedication State
    const [isDedicationMode, setIsDedicationMode] = useState(false);
    const [dedicationFrom, setDedicationFrom] = useState("");
    const [dedicationTo, setDedicationTo] = useState("");
    const [dedicationSong, setDedicationSong] = useState("");
    const [dedicationMessage, setDedicationMessage] = useState("");

    // Poll State
    const [activePoll, setActivePoll] = useState<{ question: string; options: string[]; votes: Record<string, number>; isActive?: boolean } | null>(null);
    const [myVote, setMyVote] = useState<number | null>(null);
    const [isVoting, setIsVoting] = useState(false);

    // Offline mode — dedications blocked
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    
    // Dedication toggle override
    const [dedicationsEnabled, setDedicationsEnabled] = useState(true);

    // Load userName from localStorage
    useEffect(() => {
        const savedName = safeLocalStorage.getItem("chat_user_name") || memoryUserName;
        if (savedName) setUserName(savedName);
    }, []);

    // Initial fetch and subscribe to messages
    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (data) {
                const msgsWithTime = (data as Message[]).map(m => ({ ...m, receivedAt: Date.now() }));
                setMessages(msgsWithTime.reverse());
            }
        };
        fetchInitial();

        const channel = supabase.channel(`messages-insert-${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = { ...(payload.new as Message), receivedAt: Date.now() };
                setMessages(prev => {
                    const newMsgs = [...prev, newMsg];
                    // keep only last 50 maybe
                    return newMsgs.slice(-50);
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Listen to active poll + offline mode
    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('poll, isOfflineMode, dedicationsEnabled').eq('id', 'main').single();
            if (data) {
                const p = data.poll as any;
                setActivePoll((p && p.isActive) ? p : null);
                setIsOfflineMode(!!data.isOfflineMode);
                setDedicationsEnabled(data.dedicationsEnabled ?? true);
            }
        };
        fetchInitial();

        const channel = supabase.channel(`channel-changes-chat-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                const data = payload.new as any;
                const p = data.poll;
                setActivePoll((p && p.isActive) ? p : null);
                setIsOfflineMode(!!data.isOfflineMode);
                setDedicationsEnabled(data.dedicationsEnabled ?? true);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Check if viewer already voted
    useEffect(() => {
        if (!activePoll) { setMyVote(null); return; }
        const sessionId = getSessionId();
        supabase.from('poll_votes').select('optionIndex').eq('id', sessionId).single().then(({ data }) => {
            if (data) setMyVote(data.optionIndex);
            else setMyVote(null);
        });
    }, [activePoll?.question]);

    const handleVote = async (optionIndex: number) => {
        if (myVote !== null || isVoting || !activePoll) return;
        setIsVoting(true);
        try {
            const sessionId = getSessionId();
            await supabase.from('poll_votes').upsert({ id: sessionId, optionIndex });
            setMyVote(optionIndex);

            // Increment vote count on the channel doc
            const currentVotes = activePoll.votes || {};
            const newVotes = { ...currentVotes, [String(optionIndex)]: (currentVotes[String(optionIndex)] || 0) + 1 };
            
            await supabase.from('channels').update({
                poll: {
                    ...activePoll,
                    votes: newVotes
                }
            }).eq('id', 'main');
        } catch (e) {
            console.error(e);
        } finally {
            setIsVoting(false);
        }
    };

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isSending) return;

        // If no user name, prompt for one
        if (!userName) {
            const name = prompt("Please enter a nickname to chat:");
            if (name?.trim()) {
                const trimmedName = name.trim().slice(0, 15);
                safeLocalStorage.setItem("chat_user_name", trimmedName);
                memoryUserName = trimmedName;
                setUserName(trimmedName);
                // Continue with sending after setting name locally
                sendMessage(trimmedName);
            }
            return;
        }

        sendMessage(userName);
    };

    const sendMessage = async (name: string) => {
        setIsSending(true);
        try {
            await supabase.from('messages').insert({
                text: inputText.trim(),
                author: name
            });
            setInputText("");
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    }

    const handleDedicationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dedicationsEnabled || !dedicationFrom || !dedicationTo || !dedicationMessage || isSending) return;

        setIsSending(true);
        try {
            await supabase.from('dedications').insert({
                from: dedicationFrom.trim(),
                to: dedicationTo.trim(),
                song_name: dedicationSong.trim(),
                message: dedicationMessage.trim(),
                status: "pending"
            });

            // Save the 'from' name as user name if they don't have one
            if (!userName) {
                safeLocalStorage.setItem("chat_user_name", dedicationFrom.trim());
                memoryUserName = dedicationFrom.trim();
                setUserName(dedicationFrom.trim());
            }

            // Reset and close
            setDedicationFrom("");
            setDedicationTo("");
            setDedicationSong("");
            setDedicationMessage("");
            setIsDedicationMode(false);
        } catch (error) {
            console.error("Error sending dedication:", error);
        } finally {
            setIsSending(false);
        }
    };

    const lastReactionTime = useRef(0);
    const handleReaction = async (emoji: string) => {
        const nowTime = Date.now();
        if (nowTime - lastReactionTime.current < 200) return; // 200ms throttle
        lastReactionTime.current = nowTime;

        console.log("Sending reaction:", emoji);
        try {
            await supabase.from('reactions').insert({
                type: emoji
            });
            console.log("Reaction sent successfully!");
        } catch (error) {
            console.error("Error sending reaction:", error);
        }
    };

    // Filter messages to only show those from the last 15 seconds
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const visibleMessages = messages.filter(msg => {
        const arrival = msg.receivedAt || new Date(msg.created_at).getTime();
        return (now - arrival) < 10000; // 10 seconds
    });

    return (
        <div
            className="flex flex-col justify-end fade-in animate-in duration-500 rounded-3xl p-3 md:p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent fixed bottom-4 right-4 md:bottom-8 md:right-8 w-[280px] sm:w-[320px] max-h-[50vh] md:max-h-[60vh] z-[99999] pointer-events-none"
        >
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto flex flex-col gap-2 p-2 pointer-events-auto no-scrollbar mask-image-linear-to-t"
                style={{ maskImage: "linear-gradient(to bottom, transparent, black 10%)" }}
            >
                {visibleMessages.map((msg) => (
                    <div key={msg.id} className="self-end px-2 py-1 animate-in slide-in-from-right-10 fade-in duration-300 text-right">
                        <p className="text-white text-base font-bold break-words font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wide leading-tight">
                            {msg.author && <span className="text-white/60 text-xs mr-2 font-normal uppercase tracking-widest">{msg.author}:</span>}
                            {msg.text}
                        </p>
                    </div>
                ))}
            </div>

            {/* Dedication / Input Area */}
            {isDedicationMode ? (
                <form 
                    onSubmit={handleDedicationSubmit} 
                    className="mt-2 pointer-events-auto bg-black/60 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white/10 flex flex-col gap-4 animate-in slide-in-from-bottom-8 fade-in duration-500 shadow-2xl shadow-black/40"
                >
                    <div className="flex justify-between items-center mb-0.5">
                        <div className="px-3 py-1 bg-pink-500/20 rounded-full border border-pink-500/30 flex items-center gap-2">
                            <Gift size={14} className="text-pink-400 animate-pulse" />
                            <span className="text-pink-400 font-bold text-[10px] uppercase tracking-[0.2em]">Dedication Portal</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDedicationMode(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 relative group">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-pink-400 transition-colors" />
                            <input
                                className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all w-full"
                                placeholder="From"
                                value={dedicationFrom}
                                onChange={e => setDedicationFrom(e.target.value)}
                                maxLength={20}
                                required
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <div className="flex-1 relative group">
                            <Heart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-pink-400 transition-colors" />
                            <input
                                className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all w-full"
                                placeholder="To"
                                value={dedicationTo}
                                onChange={e => setDedicationTo(e.target.value)}
                                maxLength={20}
                                required
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <Music size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-full"
                            placeholder="Song Request (Optional)"
                            value={dedicationSong}
                            onChange={e => setDedicationSong(e.target.value)}
                            maxLength={40}
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="relative group">
                        <MessageSquare size={14} className="absolute left-4 top-4 text-white/30 group-focus-within:text-pink-400 transition-colors" />
                        <textarea
                            className="bg-white/5 border border-white/10 rounded-3xl pl-11 pr-4 py-4 text-base text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all w-full resize-none h-24"
                            placeholder="Your Dedication Message..."
                            value={dedicationMessage}
                            onChange={e => setDedicationMessage(e.target.value)}
                            maxLength={80}
                            required
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSending}
                        className="relative group overflow-hidden bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold py-4 rounded-3xl text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-pink-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {isSending ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Gift size={16} />
                                <span>Send Request</span>
                            </>
                        )}
                        {/* Subtle shine effect on hover */}
                        <div className="absolute inset-0 bg-white/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full blur-2xl" />
                    </button>
                </form>
            ) : (
                <div className="mt-2 pointer-events-auto flex flex-col gap-2">
                    {/* 🗳️ Active Poll */}
                    {activePoll && (
                        <div className="bg-blue-950/60 border border-blue-500/20 rounded-xl p-3 flex flex-col gap-2 backdrop-blur-md">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-blue-400 text-[9px] font-bold uppercase tracking-widest font-mono">Live Poll</span>
                                <span className="text-white/30 text-[9px] font-mono ml-auto">
                                    {Object.values(activePoll.votes || {}).reduce((a, b) => a + b, 0)} votes
                                </span>
                            </div>
                            <p className="text-white text-xs font-semibold leading-tight">{activePoll.question}</p>
                            <div className="flex flex-col gap-1.5">
                                {activePoll.options.map((opt, i) => {
                                    const total = Object.values(activePoll.votes || {}).reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? Math.round(((activePoll.votes?.[String(i)] || 0) / total) * 100) : 0;
                                    const voted = myVote === i;
                                    const hasVoted = myVote !== null;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleVote(i)}
                                            disabled={hasVoted || isVoting}
                                            className={clsx(
                                                "relative w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-all overflow-hidden border",
                                                voted ? "border-blue-400 text-white" : "border-white/10 text-white/80",
                                                !hasVoted && "hover:border-blue-400/60 hover:text-white cursor-pointer",
                                                hasVoted && "cursor-default"
                                            )}
                                        >
                                            {/* Progress bar fill */}
                                            {hasVoted && (
                                                <div
                                                    className={clsx("absolute inset-0 opacity-30 transition-all duration-700", voted ? "bg-blue-500" : "bg-white/10")}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center justify-between">
                                                <span>{opt}</span>
                                                {hasVoted && <span className="font-mono text-white/60">{pct}%</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {myVote !== null && (
                                <p className="text-white/40 text-[9px] font-mono text-center">✓ Your vote is counted!</p>
                            )}
                        </div>
                    )}

                    {/* Reaction Bar */}
                    <div className="flex justify-center gap-2 py-0.5">
                        {["❤️", "😂", "🔥", "😮", "😢", "🙌"].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className="text-base hover:scale-125 active:scale-90 transition-transform duration-150"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 group relative">
                    {/* Dedication Toggle — manually controlled by Admin */}
                    {!dedicationsEnabled ? (
                        <div className="p-3 rounded-full text-white/20 border border-white/5 cursor-not-allowed" title="Dedications are currently closed">
                            <Gift className="w-4 h-4" />
                        </div>
                    ) : (
                    <button
                        type="button"
                        onClick={() => setIsDedicationMode(true)}
                        className="bg-white/10 hover:bg-pink-500/20 hover:text-pink-400 p-3 rounded-full text-white/70 transition-all border border-white/5 hover:border-pink-500/50"
                        title="Dedications"
                    >
                        <Gift className="w-4 h-4" />
                    </button>
                    )}

                    <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={userName ? `Love as ${userName}...` : "Send love..."}
                                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-5 py-3 text-base text-white font-medium placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-black/40 transition-all font-sans pr-4 shadow-xl ring-1 ring-white/10"
                                maxLength={100}
                                style={{ fontSize: '16px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-full text-white transition-colors border border-white/5"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
            )}
        </div>
    );
}
