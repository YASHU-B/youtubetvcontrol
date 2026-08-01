"use client";

import { useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import { supabase } from '@/lib/supabase';
import { PLAYLIST, VideoItem } from '@/data/playlist';
import { Loader2, Play, Radio, Tv, Link as LinkIcon, AlertCircle, Power, Lock, ListPlus, RefreshCcw, Heart, X, Music, Eye, EyeOff, Trash2, Bell, Upload, FileVideo, Shuffle, Sparkles, Send, Clock, UploadCloud } from 'lucide-react';
import { parseVideoMetadata } from '@/lib/metadata';
import { useChannelSync } from '../../hooks/useChannelSync';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes if not already global
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Helper to parse media item delimited name metadata
function parseMediaItem(item: any) {
    if (!item) return null;
    if (typeof item.name === 'string' && item.name.includes(' ||| ')) {
        const parts = item.name.split(' ||| ');
        return {
            ...item,
            title: parts[0]?.trim() || 'Untitled',
            artist: parts[1]?.trim() || 'Direct Upload',
            duration: parseFloat(parts[2]) || 0
        };
    }
    return {
        ...item,
        title: item.name || 'Untitled',
        artist: 'Direct Upload',
        duration: 0
    };
}

// Small inline component for admin preview of active countdown
function CountdownAdminPreview() {
    const [data, setData] = useState<{ endsAt: number; label?: string } | null>(null);
    const [rem, setRem] = useState(0);

    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('countdown').eq('id', 'main').single();
            setData(data?.countdown ?? null);
        };
        fetchInitial();
        
        const channel = supabase.channel(`countdown-admin-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                setData((payload.new as any).countdown ?? null);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (!data) { setRem(0); return; }
        const tick = () => setRem(Math.max(0, Math.round((data.endsAt - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [data]);

    if (!data) return (
        <div className="text-neutral-600 text-xs font-mono uppercase tracking-widest text-center">No countdown active</div>
    );

    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-yellow-400 text-xs font-mono uppercase tracking-widest">{data.label || 'Countdown'}</span>
            <span className={clsx("font-mono font-black tabular-nums", rem <= 10 ? "text-red-400 text-4xl" : "text-white text-4xl")}>
                {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </span>
            <span className="text-neutral-500 text-xs font-mono">{rem > 0 ? 'counting down...' : '🎉 Showtime!'}</span>
        </div>
    );
}

// ─── Offline Song (single video set by admin) ───
const OFFLINE_SONG: VideoItem = {
  id: 'T-0ZiZMtagM',
  title: 'Telugu Songs',
  artist: 'YashuBeatz',
  duration: 0, // auto-discovered
};

// ─── Custom Channel Bumpers & Idents ───
const BUMPER_VIDEOS = [
    { id: '1n7GItpD_8k', title: 'Channel Bumper 1' }, // Replace with your own short 5-10s clips!
    { id: 'K3Qzzggn--s', title: 'Channel Bumper 2' },
    { id: 'hTWKbfoikeg', title: 'Channel Bumper 3' }
];

export default function AdminPage() {
    const syncState = useChannelSync(); // Listen to channel state
    const syncStateRef = useRef(syncState);

    useEffect(() => {
        syncStateRef.current = syncState;
    }, [syncState]);

    const telecastLock = useRef(false); // Prevent double-firing

    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [queueingId, setQueueingId] = useState<string | null>(null);
    const [customUrl, setCustomUrl] = useState('');
    const [isTelecastingCustom, setIsTelecastingCustom] = useState(false);
    const [isQueueingCustom, setIsQueueingCustom] = useState(false);
    const [isLiveMode, setIsLiveMode] = useState(false); // New state for Live Toggle
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [customArtist, setCustomArtist] = useState('');

    // Promo State
    const [promoUrl, setPromoUrl] = useState('');
    const [promoTitle, setPromoTitle] = useState('Commercial Break');
    const [isInsertingPromo, setIsInsertingPromo] = useState(false);

    // Bumper State
    const [isAutoBumpers, setIsAutoBumpers] = useState(false);
    const videosSinceBumperRef = useRef<number>(0);

    // ---------- CLEAN AUTOMATION LOGIC ----------
    const [debugStatus, setDebugStatus] = useState<string>("Initializing...");
    const [lastTriggered, setLastTriggered] = useState<string>("None");
    const [diag, setDiag] = useState<string>("Initializing...");
    const lastProcessedStartedAt = useRef<number>(0);

    // Dedication State
    const [dedications, setDedications] = useState<any[]>([]);
    const dedicationsRef = useRef(dedications);

    useEffect(() => {
        dedicationsRef.current = dedications;
    }, [dedications]);

    // Marquee State
    const [marqueeText, setMarqueeText] = useState('');
    const [isUpdatingMarquee, setIsUpdatingMarquee] = useState(false);

    // Auto-Dedication State
    const [isAutoDedications, setIsAutoDedications] = useState(false);
    const lastAutoDedicationTrigger = useRef<number>(0);
    const [autoDedicationStatus, setAutoDedicationStatus] = useState<string>("Inactive");

    // Countdown State
    const [countdownMins, setCountdownMins] = useState(5);
    const [countdownLabel, setCountdownLabel] = useState('Set begins in');
    const [isStartingCountdown, setIsStartingCountdown] = useState(false);
    const [liveCountdown, setLiveCountdown] = useState<any>(null);
    const [liveRemaining, setLiveRemaining] = useState(0);

    const [isTogglingDedications, setIsTogglingDedications] = useState(false);
    const [localDedicationsEnabled, setLocalDedicationsEnabled] = useState<boolean | null>(null);

    // Spotlight State
    const [spotlightText, setSpotlightText] = useState('');
    const [isSendingSpotlight, setIsSendingSpotlight] = useState(false);

    // Poll State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [isCreatingPoll, setIsCreatingPoll] = useState(false);
    const [livePoll, setLivePoll] = useState<any>(null);

    // Festival State
    const [festivalLabel, setFestivalLabel] = useState('');
    const [isUpdatingFestival, setIsUpdatingFestival] = useState(false);

    // Active Chatters
    const [recentChatters, setRecentChatters] = useState<string[]>([]);

    // Subscribers Count
    const [subscriberCount, setSubscriberCount] = useState<number>(0);

    // Push Notifications State
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [isSendingPush, setIsSendingPush] = useState(false);
    const [pushStatus, setPushStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    // Offline Telugu Songs
    const [isPlayingRandom, setIsPlayingRandom] = useState(false);
    const [lastPlayedSong, setLastPlayedSong] = useState<string | null>(null);

    // Media Library State
    const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload Modal State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadArtist, setUploadArtist] = useState('');
    const [uploadDuration, setUploadDuration] = useState(0);
    const [isDiscoveringDuration, setIsDiscoveringDuration] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // ---------- BROADCAST LOGIC ----------
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

    // Auto-fetch metadata effect
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (customUrl && (customUrl.includes('youtube.com') || customUrl.includes('youtu.be')) && !customTitle) {
                handleFetchMetadata(customUrl);
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [customUrl]);

    const handleFetchMetadata = async (url: string) => {
        if (!url || isFetchingMetadata) return;
        setIsFetchingMetadata(true);
        try {
            const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.title) {
                const parsed = parseVideoMetadata(data.title, data.author_name);
                // Only overwrite if we got something better than "Unknown"
                if (parsed.title && parsed.title !== 'Unknown Title') {
                    setCustomTitle(parsed.title);
                }
                if (parsed.artist && parsed.artist !== 'Unknown Artist') {
                    setCustomArtist(parsed.artist);
                }
            }
        } catch (e) {
            console.error("Metadata fetch failed:", e);
        } finally {
            setIsFetchingMetadata(false);
        }
    };

    const telecast = async (id: string, title: string, artist: string, duration?: number, isLive?: boolean, mediaType?: 'youtube' | 'direct') => {
        try {
            await supabase.from("channels").update({
                videoId: id,
                title: title,
                artist: artist,
                startedAt: Date.now(), // AUTHORITATIVE SERVER TIME
                status: 'playing',
                duration: duration || 0,
                nextVideo: null,
                isLive: !!isLive, // New Field
                mediaType: mediaType || (id.startsWith('http') ? 'direct' : 'youtube') // Detect direct links
            }).eq("id", "main");
            // Small delay to let snapshot propagate
            await new Promise(r => setTimeout(r, 800));
        } catch (error) {
            console.error("Error telecasting:", error);
            setLastTriggered(`ERR: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    };

    const queueVideo = async (id: string, title: string, artist: string, duration?: number) => {
        try {
            await supabase.from("channels").update({
                nextVideo: {
                    id: id,
                    title: title,
                    artist: artist,
                    duration: duration || 0
                }
            }).eq("id", "main");
            alert(`Queued: ${title}`);
        } catch (error) {
            console.error("Error queueing:", error);
            alert("Failed to queue. Is the channel live?");
        }
    };

    const stopBroadcast = async () => {
        if (!confirm("Stop Live Broadcast? The channel will switch to Standby mode.")) return;
        try {
            await supabase.from("channels").update({
                status: 'idle',
            }).eq("id", "main");
        } catch (error) {
            console.error("Error stopping:", error);
            alert("Failed to switch to Standby.");
        }
    };

    const fetchSubscriberCount = async () => {
        const { count, error } = await supabase
            .from('fcm_tokens')
            .select('*', { count: 'exact', head: true });
        if (error) {
            console.error("Error fetching subscriber count:", error);
        } else {
            setSubscriberCount(count || 0);
        }
    };

    useEffect(() => {
        fetchSubscriberCount();

        const channel = supabase.channel(`fcm-tokens-count-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fcm_tokens' }, () => {
                fetchSubscriberCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSendPushNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pushTitle.trim() || !pushBody.trim()) {
            alert("Title and message body are required.");
            return;
        }

        setIsSendingPush(true);
        setPushStatus(null);

        try {
            const res = await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: pushTitle, body: pushBody })
            });

            const data = await res.json();
            if (res.ok) {
                setPushStatus({
                    success: true,
                    message: `Broadcasted to ${data.successCount} live devices successfully! (${data.failureCount} stale device tokens cleaned up)`
                });
                setPushTitle('');
                setPushBody('');
            } else {
                setPushStatus({
                    success: false,
                    message: data.error || 'Failed to send notification.'
                });
            }
        } catch (error: any) {
            console.error("Error sending push notification:", error);
            setPushStatus({
                success: false,
                message: error.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsSendingPush(false);
        }
    };

    // Live poll listener for admin
    useEffect(() => {
        const fetchState = async () => {
            const { data: channelData } = await supabase.from('channels').select('poll').eq('id', 'main').single();
            const p = channelData?.poll as any;
            if (p) {
                // Fetch live votes for accuracy
                const { data: votesData } = await supabase.from('poll_votes').select('optionIndex');
                const aggregatedVotes: Record<string, number> = {};
                votesData?.forEach(v => {
                    aggregatedVotes[String(v.optionIndex)] = (aggregatedVotes[String(v.optionIndex)] || 0) + 1;
                });
                setLivePoll({ ...p, votes: aggregatedVotes });
            } else {
                setLivePoll(null);
            }
        };

        fetchState();

        const channelSub = supabase.channel(`poll-admin-channel-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, () => {
                fetchState();
            }).subscribe();

        const votesSub = supabase.channel(`poll-admin-votes-${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, () => {
                fetchState();
            }).subscribe();

        return () => { 
            supabase.removeChannel(channelSub);
            supabase.removeChannel(votesSub);
        };
    }, []);

    const fetchDedications = async () => {
        const { data, error } = await supabase.from('dedications').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching dedications:", error);
            return;
        }
        setDedications(data || []);
    };

    useEffect(() => {
        fetchDedications();
        const unsub = supabase.channel(`dedications-admin-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dedications' }, (payload) => {
                fetchDedications();
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);

    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('messages').select('author').order('created_at', { ascending: false }).limit(50);
            if (data) {
                const names = new Set<string>();
                data.forEach((d: any) => { if (d.author) names.add(d.author); });
                setRecentChatters(Array.from(names).slice(0, 10));
            }
        };
        fetchInitial();
        const unsub = supabase.channel(`chatters-admin-${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setRecentChatters(prev => {
                    const names = new Set([payload.new.author, ...prev]);
                    return Array.from(names).slice(0, 10);
                });
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);

    // Direct listener for dedication toggle to bypass hook-level state issues
    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('dedicationsEnabled').eq('id', 'main').single();
            setLocalDedicationsEnabled(data?.dedicationsEnabled ?? true);
        };
        fetchInitial();
        const unsub = supabase.channel(`dedications-toggle-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                setLocalDedicationsEnabled((payload.new as any).dedicationsEnabled ?? true);
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);

    // Media Library Listener
    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('media_library').select('*').order('created_at', { ascending: false });
            const parsed = (data || []).map(item => parseMediaItem(item));
            setMediaLibrary(parsed);
        };
        fetchInitial();
        const unsub = supabase.channel(`media-admin-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'media_library' }, () => {
                fetchInitial();
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);

    useEffect(() => {
        if (!syncState) return;

        const checkAutoPlay = async () => {
            if (syncState.status === 'idle') {
                setDebugStatus("Standby Mode - Waiting for Telecast");
                return;
            }

            const { video, startedAt, nextVideo, isLooping } = syncState;
            const now = Date.now();

            const elapsed = (now - startedAt) / 1000;
            const remaining = video.duration > 0 ? (video.duration - elapsed) : -1;

            setDebugStatus(`Time: ${Math.floor(elapsed)}s / ${Math.floor(video.duration)}s | Rem: ${Math.floor(remaining)}s`);


            // --- THE MASTER GUARD ---
            // Only trigger if we are past the end AND haven't processed this specific song instance yet.
            // TRIGGER NEXT 1 second before end to skip standard end-screen grid
            const isAtEnd = video.duration > 0 && elapsed >= (video.duration - 1.0);
            const isNewInstance = startedAt > lastProcessedStartedAt.current;

            if (video.duration <= 0) {
                // Waiting for duration discovery
            } else if (isAtEnd && isNewInstance) {
                // TRIGGER
                if (!nextVideo && !isLooping) {
                    // Finished -> Go to Standby
                    lastProcessedStartedAt.current = startedAt;
                    setLastTriggered(`FINISHED >> Standby @ ${new Date().toLocaleTimeString()}`);
                    try {
                        await supabase.from('channels').update({
                status: 'idle'
            }).eq('id', 'main');
                    } catch (e) {
                        console.error("Failed to go to idle:", e);
                        lastProcessedStartedAt.current = 0;
                    }
                } else {
                    // Advance

                    // LOCK this instance immediately
                    lastProcessedStartedAt.current = startedAt;

                    const willAdvance = nextVideo || isLooping;

                    if (willAdvance && isAutoBumpers && videosSinceBumperRef.current >= 4) {
                        videosSinceBumperRef.current = 0;
                        const randomBumper = BUMPER_VIDEOS[Math.floor(Math.random() * BUMPER_VIDEOS.length)];
                        const msg = `AUTO-BUMPER >> ${randomBumper.title}`;
                        setLastTriggered(`${msg} @ ${new Date().toLocaleTimeString()}`);
                        try {
                            await supabase.from("channels").update({
                                videoId: randomBumper.id,
                                title: randomBumper.title,
                                artist: "Channel Promo",
                                startedAt: Date.now(),
                                status: 'playing',
                                duration: 0,
                                isLive: false,
                                mediaType: 'youtube'
                            }).eq("id", "main");
                        } catch (e) {
                            lastProcessedStartedAt.current = 0;
                        }
                    } else if (nextVideo) {
                        videosSinceBumperRef.current += 1;
                        const msg = `AUTO-ADVANCE >> ${nextVideo.title}`;
                        setLastTriggered(`${msg} @ ${new Date().toLocaleTimeString()}`);
                        try {
                            await telecast(nextVideo.id, nextVideo.title, nextVideo.artist, nextVideo.duration);
                        } catch (e) {
                            lastProcessedStartedAt.current = 0; // Reset on error
                        }
                    } else if (isLooping) {
                        videosSinceBumperRef.current += 1;
                        const msg = `AUTO-LOOP >> ${video.title}`;
                        setLastTriggered(`${msg} @ ${new Date().toLocaleTimeString()}`);
                        try {
                            await telecast(video.id, video.title, video.artist, video.duration);
                        } catch (e) {
                            lastProcessedStartedAt.current = 0; // Reset on error
                        }
                    }
                }
            }
        };

        const interval = setInterval(checkAutoPlay, 500);
        checkAutoPlay();
        return () => clearInterval(interval);
    }, [syncState?.startedAt, syncState?.isLooping, !!syncState?.nextVideo, syncState?.video?.id, syncState?.video?.duration, isAutoBumpers]);

    // --- AUTO-DEDICATION AUTOMATION ---
    useEffect(() => {
        if (!isAutoDedications) return;

        const interval = setInterval(async () => {
            const now = Date.now();
            const current = syncStateRef.current?.currentDedication;
            const currentDedications = dedicationsRef.current;
            
            // 1. If a dedication is currently VISIBLE
            if (current && current.isVisible !== false) {
                const shownFor = (now - (current.startedAt || 0)) / 1000;
                // Show for 15 seconds
                if (shownFor >= 15) {
                    console.log("Auto-Dedication: Clearing after 15s");
                    setAutoDedicationStatus("Gap period...");
                    await handleClearDedication(true); // Clear it completely, skip confirm
                } else {
                    setAutoDedicationStatus(`Displaying... (${Math.floor(15 - shownFor)}s left)`);
                }
                return;
            }

            // 2. If NO dedication is visible, wait for a gap (e.g. 60 seconds)
            const timeSinceLast = (now - lastAutoDedicationTrigger.current) / 1000;
            const GAP_SECONDS = 60; // Increased gap to 60s for clear video

            if (timeSinceLast < GAP_SECONDS) {
                setAutoDedicationStatus(`Gap period... (${Math.floor(GAP_SECONDS - timeSinceLast)}s left)`);
                return;
            }

            // 3. Try to pick the next pending dedication
            if (currentDedications.length > 0) {
                const next = currentDedications[0]; // Pick oldest pending
                console.log("Auto-Dedication: Triggering next", next.from);
                setAutoDedicationStatus(`Triggering: ${next.from}`);
                lastAutoDedicationTrigger.current = now;
                await handleShowDedication(next, (Math.random() > 0.5 ? 'love' : 'mass'));
            } else {
                setAutoDedicationStatus("Waiting for new requests...");
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [isAutoDedications]);

    const resetLock = () => {
        lastProcessedStartedAt.current = 0;
        setLastTriggered("Automation Reset Manually");
    };

    const toggleLoop = async () => {
        // Use a functional update logic: if syncState is missing, assume we are turning it ON from false
        const currentLooping = syncState?.isLooping || false;
        const newLooping = !currentLooping;
        
        try {
            await supabase.from('channels').update({
                isLooping: newLooping
            }).eq('id', 'main');
        } catch (error) {
            console.error("Toggle Loop Failed:", error);
        }
    };

    // Manual Skip
    const skipToNext = async () => {
        if (!syncState) return;

        if (syncState.nextVideo) {
            const next = syncState.nextVideo;
            await telecast(next.id, next.title, next.artist, next.duration);
        } else {
            // No queue? Go to Standby
            await supabase.from('channels').update({
                status: 'idle'
            }).eq('id', 'main');
        }
    };

    const toggleDedications = async () => {
        if (isTogglingDedications) return;
        setIsTogglingDedications(true);
        try {
            const currentState = localDedicationsEnabled ?? true;
            await supabase.from('channels').update({
                dedicationsEnabled: !currentState
            }).eq('id', 'main');
        } catch (error) {
            console.error("Error toggling dedications:", error);
            alert("Failed to update dedication settings.");
        } finally {
            setIsTogglingDedications(false);
        }
    };

    // Update Duration (for custom videos)
    const updateDuration = async (seconds: number) => {
        await supabase.from('channels').update({
                duration: seconds
            }).eq('id', 'main');
    };

    const togglePlayPause = async () => {
        if (!syncState) return;
        const newStatus = syncState.status === 'playing' ? 'paused' : 'playing';
        await supabase.from('channels').update({
                status: newStatus
            }).eq('id', 'main');
    };
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert("Please upload a video file.");
            return;
        }

        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setUploadFile(file);
        setUploadTitle(baseName);
        setUploadArtist('Direct Upload');
        setUploadDuration(0);
        setIsDiscoveringDuration(true);
        setIsUploadModalOpen(true);

        // Discover running duration using offscreen video player
        try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                setUploadDuration(Math.floor(video.duration || 0));
                setIsDiscoveringDuration(false);
            };
            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                setUploadDuration(0);
                setIsDiscoveringDuration(false);
            };
        } catch (err) {
            console.error("Duration discovery failed:", err);
            setUploadDuration(0);
            setIsDiscoveringDuration(false);
        }
    };

    const startMediaUpload = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const file = uploadFile;
            const filePath = `media/${Date.now()}_${file.name}`;
            
            // XHR Upload using FormData to match Supabase SDK's multipart payload exactly
            const xhr = new XMLHttpRequest();
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/media/${filePath}`;
            
            xhr.open('POST', url, true);
            
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
            xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
            xhr.setRequestHeader('apikey', anonKey);
            xhr.setRequestHeader('x-upsert', 'false');
            // Do NOT set Content-Type header manually; let the browser automatically
            // format it as multipart/form-data with the correct boundary!

            const formData = new FormData();
            formData.append('cacheControl', '3600');
            formData.append('', file); // Supabase expects empty string key for raw files
            
            const uploadPromise = new Promise<{ publicUrl: string }>((resolve, reject) => {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percent);
                    }
                };
                
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${filePath}`;
                        resolve({ publicUrl });
                    } else {
                        let errorMsg = xhr.responseText || xhr.statusText || 'Unknown error';
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            if (parsed.message) {
                                errorMsg = parsed.message;
                            } else if (parsed.error) {
                                errorMsg = parsed.error;
                            }
                        } catch (e) {}
                        reject(new Error(`Status ${xhr.status}: ${errorMsg}`));
                    }
                };
                
                xhr.onerror = () => {
                    reject(new Error("Network error during upload"));
                };
                
                xhr.send(formData);
            });

            const { publicUrl } = await uploadPromise;

            // Serialize metadata as: TITLE ||| ARTIST ||| DURATION
            const serializedName = `${uploadTitle.trim()} ||| ${uploadArtist.trim()} ||| ${uploadDuration}`;

            const { data: insertedData, error: insertError } = await supabase.from("media_library").insert({
                name: serializedName,
                url: publicUrl,
                type: file.type,
                size: file.size
            }).select().single();

            if (insertError) throw insertError;

            // Immediately prepend the new item to the media library state so it shows up without requiring page reload
            if (insertedData) {
                setMediaLibrary(prev => [parseMediaItem(insertedData), ...prev]);
            }

            setIsUploadModalOpen(false);
            setUploadFile(null);
            alert("Upload successful!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error instanceof Error ? error.message : 'Check console.'}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const telecastMedia = async (media: any) => {
        setLoadingId(media.id);
        try {
            await telecast(media.url, media.title, media.artist, media.duration, false, 'direct');
        } finally {
            setLoadingId(null);
        }
    };

    // ── Offline Song — loops 24/7 without admin interaction ──
    const playRandomTeluguSong = async () => {
        setIsPlayingRandom(true);
        try {
            await telecast(OFFLINE_SONG.id, OFFLINE_SONG.title, OFFLINE_SONG.artist, OFFLINE_SONG.duration);
            // Enable looping + mark as offline mode (blocks dedications)
            await supabase.from("channels").update({
                isLooping: true,
            }).eq("id", "main");
            setLastPlayedSong(OFFLINE_SONG.id);
        } catch (e) {
            console.error('Offline song error:', e);
        } finally {
            setIsPlayingRandom(false);
        }
    };

    const deleteMedia = async (media: any) => {
        if (!confirm(`Delete ${media.title}?`)) return;
        try {
            await supabase.from("media_library").delete().eq("id", media.id);
        } catch (e) {
            console.error("Delete failed:", e);
        }
    };

    // ---------- AUTH LOGIC ----------
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') { // Simple hardcoded password
            try {
                const { error } = await supabase.auth.signInAnonymously();
                // Even if anonymous auth fails (e.g., not enabled), we let them in since it's admin123
                if (error) console.warn("Supabase auth failed:", error);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Auth error:", error);
            }
        } else {
            alert("Access Denied");
        }
    };

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen bg-black flex flex-col items-center justify-center font-sans p-4">
                <div className="w-full max-w-md bg-neutral-900 border border-white/10 p-8 rounded-2xl shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-600/20 p-4 rounded-full text-red-500">
                            <Lock size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-white mb-2">Studio Access</h1>
                    <p className="text-neutral-500 text-center mb-6">Enter authorized access code to control broadcast.</p>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="Access Code"
                            className="bg-black border border-white/20 rounded-lg px-4 py-3 text-white text-center tracking-widest text-lg focus:outline-none focus:border-red-600 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="bg-white text-black font-bold py-3 rounded-lg hover:bg-neutral-200 transition-colors">
                            ENTER STUDIO
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
                        <a href="/yashubeatztv.apk" download="yashubeatztv.apk" className="flex flex-col items-center gap-2 text-green-500 hover:text-green-400 transition-colors">
                            <div className="bg-green-500/20 p-3 rounded-full">
                                <span className="font-bold text-lg px-2">↓ APK</span>
                            </div>
                            <span className="font-medium text-sm text-center">Download Android App</span>
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    // ---------- BROADCAST LOGIC ----------

    const handlePlaylistClick = async (video: VideoItem) => {
        setLoadingId(video.id);
        await telecast(video.id, video.title, video.artist, video.duration);
        setLoadingId(null);
    };

    const handlePlaylistQueue = async (video: VideoItem) => {
        setQueueingId(video.id);
        await queueVideo(video.id, video.title, video.artist, video.duration);
        setQueueingId(null);
    };


    const handleCustomTelecast = async (e: React.FormEvent) => {
        // ... (existing logic, refactored to check button type?)
        // Actually, preventing default submission makes it hard to distinguish buttons.
        // We will make separate handlers or buttons.
        e.preventDefault();
        // Default behavior (Enter key) is Telecast
        triggerCustom(false);
    };

    const triggerCustom = async (isQueue: boolean) => {
        if (!customUrl.trim()) return;

        if (isQueue) setIsQueueingCustom(true);
        else setIsTelecastingCustom(true);

        // Extract ID
        let id = customUrl.trim();
        let detectedType: 'youtube' | 'direct' = 'youtube';

        try {
            // ROBUST YOUTUBE ID EXTRACTION
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
            const match = customUrl.match(youtubeRegex);
            
            if (match && match[1]) {
                id = match[1];
                detectedType = 'youtube';
            } else {
                const url = new URL(customUrl);
                const host = url.hostname.toLowerCase();

                if (host.includes('youtube.com') || host.includes('youtu.be')) {
                    detectedType = 'youtube';
                    // Fallback for /live/ or /shorts/ if regex didn't catch it
                    if (url.pathname.startsWith('/live/')) {
                        id = url.pathname.replace('/live/', '').split('/')[0];
                    } else if (url.pathname.startsWith('/shorts/')) {
                        id = url.pathname.replace('/shorts/', '').split('/')[0];
                    } else if (host.includes('youtu.be')) {
                        id = url.pathname.slice(1).split(/[?#&]/)[0];
                    } else {
                        id = url.searchParams.get('v') || id;
                    }
                } else if (customUrl.match(/\.(mp4|mkv|webm|mov|m3u8)$/i) || customUrl.includes('firebasestorage.googleapis.com')) {
                    id = customUrl;
                    detectedType = 'direct';
                } else {
                    id = customUrl;
                    detectedType = 'direct';
                }
            }
            
            // Final Clean: Remove any trailing garbage (slashes, params) if it's youtube
            if (detectedType === 'youtube') {
                id = id.split(/[?#&\/]/)[0];
            }
        } catch {
            // Not a URL, assume it's a raw YouTube ID
            detectedType = 'youtube';
            id = id.split(/[?#&\/]/)[0];
        }

        if (!id) {
            alert("Could not extract Video ID");
            setIsTelecastingCustom(false);
            setIsQueueingCustom(false);
            return;
        }

        const title = customTitle.trim();
        const artist = customArtist.trim();
        const duration = 0;

        if (isQueue) {
            await queueVideo(id, title, artist, duration);
        } else {
            await telecast(id, title, artist, duration, isLiveMode, detectedType);
        }

        setCustomUrl('');
        setCustomTitle('');
        setCustomArtist('');

        setIsTelecastingCustom(false);
        setIsQueueingCustom(false);
    };

    const handleInsertPromo = async () => {
        if (!promoUrl.trim()) return;
        setIsInsertingPromo(true);

        let id = promoUrl.trim();
        try {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
            const match = promoUrl.match(youtubeRegex);
            if (match && match[1]) {
                id = match[1];
            } else {
                const url = new URL(promoUrl);
                const host = url.hostname.toLowerCase();
                if (host.includes('youtube.com') || host.includes('youtu.be')) {
                    if (url.pathname.startsWith('/live/')) {
                        id = url.pathname.replace('/live/', '').split('/')[0];
                    } else if (url.pathname.startsWith('/shorts/')) {
                        id = url.pathname.replace('/shorts/', '').split('/')[0];
                    } else if (host.includes('youtu.be')) {
                        id = url.pathname.slice(1).split(/[?#&]/)[0];
                    } else {
                        id = url.searchParams.get('v') || id;
                    }
                }
            }
            if (id && id.includes('?')) id = id.split(/[?#&\/]/)[0];
        } catch {
            id = id.split(/[?#&\/]/)[0];
        }

        await queueVideo(id, promoTitle, "Promo", 0);
        
        setPromoUrl('');
        setPromoTitle('Commercial Break');
        setIsInsertingPromo(false);
    };

    // Dedication Control
    const handleShowDedication = async (req: any, vibe: 'love' | 'mass' = 'love') => {
        try {
            // 1. Update Channel (Show on Screen)
            await supabase.from('channels').update({
                currentDedication: {
                    from: req.from,
                    to: req.to,
                    song_name: req.song_name || "",
                    message: req.message,
                    id: req.id,
                    startedAt: Date.now(),
                    isVisible: true,
                    vibe, // NEW: 'love' or 'mass'
                }
            }).eq('id', 'main');

            const { error } = await supabase.from("dedications").update({
                status: "approved"
            }).eq("id", req.id);
            
            if (error) throw error;

            // Manual refresh to ensure UI stays in sync
            fetchDedications();
        } catch (error) {
            console.error("Error showing dedication:", error);
            alert("Failed to show dedication: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    const handleDismissDedication = async (id: string) => {
        if (!confirm("Permanently delete this dedication?")) return;
        try {
            // 1. Add to cleared IDs list in channels table (bypasses RLS delete restrictions)
            const currentCleared = syncStateRef.current?.dedication?.clearedIds || [];
            const newCleared = Array.from(new Set([...currentCleared, id]));
            await supabase.from('channels').update({
                dedication: { clearedIds: newCleared }
            }).eq('id', 'main');

            // 2. Best effort status update (even if RLS blocks it, we have the bypass above)
            try {
                await supabase.from("dedications").update({ status: "rejected" }).eq("id", id);
            } catch (err) {
                console.warn("Ignored soft-delete update restriction: ", err);
            }

            // 3. If it's the one CURRENTLY showing, clear the screen too
            if (syncStateRef.current?.currentDedication?.id === id) {
                await supabase.from('channels').update({
                    currentDedication: null
                }).eq('id', 'main');
            }

            // Manual refresh
            fetchDedications();
        } catch (error) {
            console.error("Error deleting dedication:", error);
            alert("Failed to delete dedication: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    const handleToggleVisibility = async () => {
        const currentDedication = syncStateRef.current?.currentDedication;
        if (!currentDedication) return;
        const currentVis = currentDedication.isVisible !== false; // Default true
        try {
            // Correct JSON update for Supabase/Postgres
            const updatedDedication = {
                ...currentDedication,
                isVisible: !currentVis
            };
            await supabase.from('channels').update({
                currentDedication: updatedDedication
            }).eq('id', 'main');
        } catch (error) {
            console.error("Error toggling visibility:", error);
        }
    };

    const handleClearDedication = async (skipConfirm: boolean = false) => {
        if (!skipConfirm && !confirm("Permanently clear and delete this dedication?")) return;
        try {
            const activeId = syncStateRef.current?.currentDedication?.id;
            
            // 1. Clear from screen
            const { error: chError } = await supabase.from('channels').update({
                currentDedication: null
            }).eq('id', 'main');
            if (chError) throw chError;

            // 2. If it came from the dedications table, add to cleared IDs list in channels table (bypasses RLS delete restrictions)
            if (activeId) {
                const currentCleared = syncStateRef.current?.dedication?.clearedIds || [];
                const newCleared = Array.from(new Set([...currentCleared, activeId]));
                await supabase.from('channels').update({
                    dedication: { clearedIds: newCleared }
                }).eq('id', 'main');

                // Best effort status update
                try {
                    await supabase.from('dedications').update({ status: "rejected" }).eq('id', activeId);
                } catch (err) {
                    console.warn("Ignored soft-delete update restriction: ", err);
                }
            }

            // Manual refresh
            fetchDedications();
        } catch (error) {
            console.error("Error clearing dedication:", error);
            alert("Failed to clear dedication: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    const handleUpdateMarquee = async (text: string) => {
        setIsUpdatingMarquee(true);
        try {
            await supabase.from('channels').update({
                marquee: text || null
            }).eq('id', 'main');
            if (text) {
                setMarqueeText('');
            }
        } catch (error) {
            console.error("Error updating marquee:", error);
            alert("Failed to update marquee");
        } finally {
            setIsUpdatingMarquee(false);
        }
    };
    const handleStartCountdown = async () => {
        if (countdownMins <= 0) return;
        setIsStartingCountdown(true);
        try {
            await supabase.from('channels').update({
                countdown: {
                    endsAt: Date.now() + countdownMins * 60 * 1000,
                    label: countdownLabel.trim() || 'Set begins in',
                }
            }).eq('id', 'main');
        } catch (e) {
            console.error(e);
        } finally {
            setIsStartingCountdown(false);
        }
    };

    const handleCancelCountdown = async () => {
        try {
            await supabase.from('channels').update({ countdown: null }).eq('id', 'main');
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreatePoll = async () => {
        const opts = pollOptions.filter(o => o.trim());
        if (!pollQuestion.trim() || opts.length < 2) return;
        setIsCreatingPoll(true);
        try {
            // Clear old votes
            await supabase.from('poll_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            await supabase.from('channels').update({
                poll: { question: pollQuestion.trim(), options: opts, votes: {}, isActive: true, showOnScreen: false }
            }).eq('id', 'main');
            setPollQuestion('');
            setPollOptions(['', '']);
        } catch (e) { console.error(e); }
        finally { setIsCreatingPoll(false); }
    };

    const handleClearPoll = async () => {
        try {
            await supabase.from('poll_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            await supabase.from('channels').update({ poll: null }).eq('id', 'main');
        } catch (e) { console.error(e); }
    };

    const handleTogglePollOnScreen = async (show: boolean) => {
        try {
            await supabase.from('channels').update({ 'poll.showOnScreen': show }).eq('id', 'main');
        } catch (e) { console.error(e); }
    };

    const handleSendSpotlight = async () => {
        if (!spotlightText.trim()) return;
        setIsSendingSpotlight(true);
        try {
            await supabase.from('channels').update({
                spotlight: { text: spotlightText.trim(), sentAt: Date.now() }
            }).eq('id', 'main');
            setSpotlightText('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsSendingSpotlight(false);
        }
    };

    const handleUpdateFestival = async (isActive: boolean) => {
        setIsUpdatingFestival(true);
        const festivalData = isActive ? { isActive: true, label: festivalLabel.trim() } : null;
        console.log("Updating festival to:", festivalData);
        try {
            await supabase.from('channels').update({
                festival: festivalData
            }).eq('id', 'main');
        } catch (e) {
            console.error("Firestore update error:", e);
        } finally {
            setIsUpdatingFestival(false);
        }
    };


    return (
        <main className="min-h-screen bg-neutral-900 text-white p-8 font-sans">

            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-red-600 p-3 rounded-lg">
                        <Tv size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Studio Control Center</h1>
                        <p className="text-neutral-400">Manage live broadcast</p>
                    </div>
                </div>

                {/* RIGHT SIDE ACTIONS */}
                <div className="flex items-center gap-4">
                    {/* Offline Telugu Songs Button */}
                    <button
                        onClick={playRandomTeluguSong}
                        disabled={isPlayingRandom}
                        className="relative overflow-hidden bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-400 hover:via-orange-400 hover:to-pink-400 disabled:opacity-60 disabled:cursor-not-allowed text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all uppercase tracking-widest text-sm shadow-lg shadow-orange-500/30 hover:shadow-orange-400/50 active:scale-95"
                    >
                        {isPlayingRandom ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Shuffle size={16} />
                        )}
                        🎵 Random Telugu
                    </button>

                    <button
                        onClick={stopBroadcast}
                        className="bg-red-900/50 hover:bg-red-900 text-red-500 border border-red-800 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors uppercase tracking-widest text-sm"
                    >
                        <Power size={18} /> Stop Telecast
                    </button>

                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-white/10">
                        <Bell size={16} className="text-red-500" />
                        <span className="text-sm font-mono text-neutral-300 uppercase tracking-tighter">
                            <span className="text-white font-bold">{subscriberCount}</span> Subscribed
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-white/10">
                        {(!syncState || syncState.status === 'idle') ? (
                            <RefreshCcw size={16} className="text-yellow-500" />
                        ) : (
                            <Radio size={16} className="text-green-500 animate-pulse" />
                        )}
                        <span className="text-sm font-mono text-neutral-300 uppercase">
                            {(!syncState || syncState.status === 'idle') ? "STANDBY / IDLE" : "LIVE BROADCAST"}
                        </span>
                    </div>

                    <div className="group relative flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-white/10 hover:border-blue-500/50 transition-colors cursor-help">
                        <Eye size={16} className="text-blue-500" />
                        <span className="text-sm font-mono text-neutral-300">
                            <span className="text-white font-bold">{recentChatters.length}</span> Active Chatters
                        </span>
                        {/* Tooltip for chatters */}
                        <div className="absolute top-full mt-2 right-0 w-48 bg-black border border-white/10 p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-2xl">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 pb-1 border-b border-white/5">Recent Participants</p>
                            <div className="flex flex-col gap-1">
                                {recentChatters.length > 0 ? recentChatters.map(name => (
                                    <span key={name} className="text-xs text-white truncate">{name}</span>
                                )) : <span className="text-xs text-neutral-600 italic">No recent activity</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Debug Status Panel */}
            <div className="mb-6 p-4 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="text-xs font-mono text-neutral-400">
                    BROADCAST AUTOMATION: <span className="text-yellow-500">{debugStatus}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 flex gap-2">
                    LAST ACTION: <span className="text-green-500">{lastTriggered}</span>
                </div>

                {/* Emergency Controls */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={resetLock}
                        className="bg-neutral-800 text-neutral-500 border border-white/10 px-2 py-1 rounded text-[10px] hover:text-white transition-colors"
                    >
                        Reset Automation
                    </button>
                    <button
                        onClick={toggleLoop}
                        style={{ backgroundColor: syncState?.isLooping ? '#dc2626' : undefined }}
                        className={clsx(
                            "px-4 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                            syncState?.isLooping 
                                ? "text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] scale-105" 
                                : "bg-neutral-800 text-neutral-400 border border-white/10 hover:bg-neutral-700"
                        )}
                    >
                        <RefreshCcw size={12} className={clsx(syncState?.isLooping && "animate-spin-slow")} />
                        Loop {syncState?.isLooping ? "ON" : "OFF"}
                    </button>

                    <button
                        onClick={skipToNext}
                        className="bg-white text-black px-4 py-1 rounded text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                    >
                        {syncState?.nextVideo ? "Force Play Next" : "Go to Standby"}
                    </button>

                    {/* Duration Fixer for Custom Videos */}
                    {syncState?.video?.id && syncState?.video?.duration === 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 text-xs font-bold animate-pulse">NO DURATION SET</span>
                            <button
                                onClick={() => updateDuration(300)} // Default to 5 mins
                                className="bg-neutral-800 border border-white/20 px-3 py-1 rounded text-xs hover:bg-neutral-700 transition-colors"
                            >
                                Set 5m
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Play/Pause Remote Control */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Master Remote:</span>
                <button
                    onClick={togglePlayPause}
                    className={clsx(
                        "px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all uppercase tracking-widest text-sm",
                        syncState?.status === 'paused' ? "bg-green-600 hover:bg-green-500 text-white" : "bg-yellow-600 hover:bg-yellow-500 text-black"
                    )}
                >
                    {syncState?.status === 'paused' ? <><Play size={18} fill="currentColor" /> Resume</> : <><RefreshCcw size={18} className="animate-spin-slow" /> Pause Broadcast</>}
                </button>
            </div>

            {/* 🎵 Offline Song Card */}
            <div className="mb-6 bg-gradient-to-br from-yellow-950/60 via-orange-950/40 to-pink-950/50 border border-orange-500/20 rounded-xl overflow-hidden">
                <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2.5 rounded-lg shadow-lg shadow-orange-500/30">
                            <Music size={20} className="text-black" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                🎵 Offline Song
                            </h2>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {lastPlayedSong === OFFLINE_SONG.id ? (
                                    <><span className="text-orange-400">▶ Now playing: {OFFLINE_SONG.title}</span></>
                                ) : 'Click to telecast the offline song'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={playRandomTeluguSong}
                        disabled={isPlayingRandom}
                        className="flex-shrink-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-400 hover:via-orange-400 hover:to-pink-400 disabled:opacity-60 disabled:cursor-not-allowed text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all uppercase tracking-widest shadow-xl shadow-orange-500/30 hover:shadow-orange-400/50 hover:scale-105 active:scale-95"
                    >
                        {isPlayingRandom ? (
                            <><Loader2 size={18} className="animate-spin" /> Loading...</>
                        ) : (
                            <><Play size={18} fill="currentColor" /> Play Offline</>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom URL Input */}
            <div className="mb-12 bg-neutral-800/50 p-6 rounded-xl border border-white/5">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <LinkIcon size={20} className="text-blue-400" />
                    Telecast Custom Link
                </h2>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Paste YouTube Link or ID here..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors pr-10"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                            />
                            {isFetchingMetadata && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={16} className="animate-spin text-blue-400" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 px-3 rounded-lg border border-white/10">
                            <input
                                type="checkbox"
                                id="liveToggle"
                                checked={isLiveMode}
                                onChange={(e) => setIsLiveMode(e.target.checked)}
                                className="w-4 h-4 accent-red-600"
                            />
                            <label htmlFor="liveToggle" className="text-sm font-mono text-neutral-300 cursor-pointer">LIVE MODE</label>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest ml-1">Meta Title</label>
                            <input
                                type="text"
                                placeholder="Song Name"
                                className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest ml-1">Meta Artist</label>
                            <input
                                type="text"
                                placeholder="Artist Name"
                                className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                value={customArtist}
                                onChange={(e) => setCustomArtist(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end gap-2 pb-0.5">
                           <button
                                onClick={() => triggerCustom(true)}
                                disabled={isQueueingCustom || !customUrl}
                                className="bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 text-xs"
                            >
                                {isQueueingCustom ? <Loader2 className="animate-spin" size={14} /> : <ListPlus size={14} />}
                                Queue
                            </button>
                            <button
                                onClick={() => triggerCustom(false)}
                                disabled={isTelecastingCustom || !customUrl}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 text-xs"
                            >
                                {isTelecastingCustom ? <Loader2 className="animate-spin" size={14} /> : <Radio size={14} />}
                                Telecast
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Commercials & Promos */}
            <div className="mb-12 bg-neutral-800/50 p-6 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-400" />
                        Commercials & Promos
                    </h2>
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10" title="Automatically play a bumper every 4 videos">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Auto-Bumpers:</span>
                        <button
                            onClick={() => setIsAutoBumpers(!isAutoBumpers)}
                            className={cn(
                                "w-9 h-5 rounded-full relative transition-all focus:outline-none",
                                isAutoBumpers ? "bg-yellow-500" : "bg-neutral-600"
                            )}
                        >
                            <span className={cn(
                                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all",
                                isAutoBumpers && "translate-x-4"
                            )} />
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-neutral-400 font-mono">Insert a scheduled announcement gracefully into the queue. It will play immediately after the current telecast ends.</p>
                    <div className="flex gap-4 flex-col sm:flex-row">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Paste Promo Video Link..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors"
                                value={promoUrl}
                                onChange={(e) => setPromoUrl(e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Promo Title"
                                className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors"
                                value={promoTitle}
                                onChange={(e) => setPromoTitle(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleInsertPromo}
                            disabled={isInsertingPromo || !promoUrl}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                        >
                            {isInsertingPromo ? <Loader2 className="animate-spin" size={16} /> : <Tv size={16} />}
                            Insert Promo
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {/* Pending Requests */}
                <div className="bg-neutral-800/50 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-pink-400">
                            <Heart size={20} className="fill-pink-500/20" />
                            Dedication Queue ({dedications.filter((req) => !(syncState?.dedication?.clearedIds || []).includes(req.id)).length})
                        </h2>
                        
                        <div className="flex items-center gap-3">
                            {/* Auto Dedication Toggle */}
                            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10" title="Auto-show dedications with timing">
                                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Auto:</span>
                                <button
                                    onClick={() => setIsAutoDedications(!isAutoDedications)}
                                    className={cn(
                                        "w-9 h-5 rounded-full relative transition-all focus:outline-none",
                                        isAutoDedications ? "bg-blue-500" : "bg-neutral-600"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow",
                                        isAutoDedications ? "translate-x-4" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {/* Master Dedications Switch */}
                            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10" title="Turn ON to accept viewer dedications">
                            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Accepting:</span>
                            {localDedicationsEnabled === null ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono italic">
                                    <Loader2 size={10} className="animate-spin" /> SYNCING...
                                </div>
                            ) : (
                                <button
                                    onClick={toggleDedications}
                                    disabled={isTogglingDedications}
                                    className={cn(
                                        "w-9 h-5 rounded-full relative transition-all focus:outline-none",
                                        localDedicationsEnabled !== false ? "bg-green-500" : "bg-neutral-600",
                                        isTogglingDedications && "opacity-50 grayscale cursor-wait"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow flex items-center justify-center",
                                        localDedicationsEnabled !== false ? "translate-x-4" : "translate-x-0"
                                    )}>
                                        {isTogglingDedications && <Loader2 size={8} className="animate-spin text-neutral-400" />}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                    
                    {isAutoDedications && (
                        <div className="mb-4 px-3 py-2 bg-blue-900/20 border border-blue-500/20 rounded-lg flex items-center justify-between">
                            <span className="text-[10px] font-mono text-blue-300 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Automation Active
                            </span>
                            <span className="text-[10px] font-mono text-white/60">{autoDedicationStatus}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {(() => {
                            const clearedIds = syncState?.dedication?.clearedIds || [];
                            const activeDedications = dedications.filter((req) => !clearedIds.includes(req.id));
                            if (activeDedications.length === 0) {
                                return <p className="text-neutral-500 text-sm italic">No pending requests.</p>;
                            }
                            return activeDedications.map((req) => (
                                <div key={req.id} className="bg-black/40 border border-white/10 p-3 rounded-lg flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">From: <span className="text-white font-bold">{req.from}</span></span>
                                            <span className="text-xs text-neutral-400 uppercase tracking-wider block">To: <span className="text-pink-400 font-bold">{req.to}</span></span>
                                            {req.song_name && (
                                                <span className="text-[10px] text-blue-400 uppercase tracking-wider block mt-1"><Music size={10} className="inline mr-1" /> {req.song_name}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDismissDedication(req.id)}
                                                className="p-1.5 hover:bg-white/10 rounded-md text-neutral-500 hover:text-red-400 transition-colors"
                                                title="Reject/Dismiss"
                                            >
                                                <X size={14} />
                                            </button>
                                            
                                            {!isAutoDedications ? (
                                                <>
                                                    <button
                                                        onClick={() => handleShowDedication(req, 'love')}
                                                        className="px-3 py-1.5 bg-pink-700 hover:bg-pink-600 text-white text-xs font-bold rounded-md uppercase tracking-wide transition-colors"
                                                        title="Love vibe"
                                                    >
                                                        💕 Love
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowDedication(req, 'mass')}
                                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md uppercase tracking-wide transition-colors"
                                                        title="Mass vibe"
                                                    >
                                                        🔥 Mass
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-1 text-[10px] text-blue-400/60 font-mono italic px-2">
                                                    <Loader2 size={10} className="animate-spin" /> QUEUED
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-neutral-300 italic border-l-2 border-white/20 pl-2">
                                        "{req.message}"
                                    </p>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* Active Overlay Control */}
                <div className="bg-neutral-800/50 p-6 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-white">Active Overlay Status</h2>
                        <div className="bg-black/60 rounded-xl p-6 border border-white/10 min-h-[160px] flex items-center justify-center relative overflow-hidden">
                            {/* @ts-ignore */}
                            {syncState?.currentDedication ? (
                                <div className={clsx("text-center w-full relative z-10 transition-opacity duration-500", syncState.currentDedication.isVisible === false && "opacity-30 grayscale")}>
                                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold uppercase tracking-widest border border-pink-500/30">
                                        <span className={clsx("w-2 h-2 rounded-full", syncState.currentDedication.isVisible !== false ? "bg-pink-500 animate-pulse" : "bg-neutral-500")} />
                                        {syncState.currentDedication.isVisible !== false ? "On Air" : "Hidden"}
                                    </div>
                                    <h3 className="text-white text-lg font-serif italic mb-2">"{syncState.currentDedication.message}"</h3>
                                    <div className="text-xs text-neutral-400">
                                        From <span className="text-white">{syncState.currentDedication.from}</span> to <span className="text-pink-300">{syncState.currentDedication.to}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center gap-2">
                                    <Tv size={32} />
                                    <span className="text-xs uppercase tracking-widest font-mono">Screen Clear</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isAutoDedications ? (
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleToggleVisibility}
                                    disabled={!syncState?.currentDedication}
                                    className={clsx(
                                        "flex-1 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs",
                                        syncState?.currentDedication?.isVisible !== false
                                            ? "bg-neutral-700 hover:bg-neutral-600 text-white"
                                            : "bg-green-700 hover:bg-green-600 text-white"
                                    )}
                                >
                                    {syncState?.currentDedication?.isVisible !== false ? (
                                        <><EyeOff size={16} /> Hide Overlay</>
                                    ) : (
                                        <><Eye size={16} /> Show Overlay</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleClearDedication(false)}
                                    disabled={!syncState?.currentDedication}
                                    className="bg-red-900/60 hover:bg-red-800 disabled:opacity-30 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs border border-red-700/40"
                                >
                                    <Trash2 size={16} /> Clear
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                            <p className="text-[10px] text-blue-300 font-mono text-center uppercase tracking-[0.2em] animate-pulse">
                                Manual Control Disabled — Automation Running
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* BROADCAST PUSH NOTIFICATION CENTER */}
            <div className="mb-8 bg-gradient-to-br from-neutral-900 via-neutral-900 to-red-950/20 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-[80px] select-none">🔔</div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-red-500 animate-pulse">🔔</span> Broadcast Push Notification
                </h2>
                <p className="text-xs text-neutral-400 mb-6">
                    Send instant high-priority alerts to all subscribed desktop browsers and Android app installations. Currently reaching <span className="text-red-400 font-bold font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{subscriberCount}</span> registered devices.
                </p>

                <form onSubmit={handleSendPushNotification} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Alert Title</label>
                        <input
                            type="text"
                            value={pushTitle}
                            onChange={(e) => setPushTitle(e.target.value)}
                            placeholder="e.g. Yashubeatz TV Live! 🔴"
                            className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 outline-none transition-all placeholder:text-neutral-600"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Notification Body / Description</label>
                        <input
                            type="text"
                            value={pushBody}
                            onChange={(e) => setPushBody(e.target.value)}
                            placeholder="e.g. Join the stream and request your favorite beats!"
                            className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 outline-none transition-all placeholder:text-neutral-600"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={isSendingPush || !pushTitle.trim() || !pushBody.trim()}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs shadow-lg shadow-red-600/20 active:scale-95 duration-200"
                        >
                            {isSendingPush ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <Send size={16} />
                            )}
                            Transmit Broadcast
                        </button>
                    </div>
                </form>

                {pushStatus && (
                    <div className={clsx(
                        "mt-4 p-3 rounded-lg border text-xs font-mono flex items-center gap-2",
                        pushStatus.success 
                            ? "bg-green-950/30 border-green-500/30 text-green-400" 
                            : "bg-red-950/30 border-red-500/30 text-red-400"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full", pushStatus.success ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                        {pushStatus.message}
                    </div>
                )}
            </div>

            {/* COUNTDOWN TIMER */}
            <div className="mb-8 bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-[80px] select-none">⏱</div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">⏱</span> Countdown Timer
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="flex flex-col gap-3">
                        {/* Presets */}
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-widest font-mono mb-2">Quick Presets</p>
                            <div className="flex gap-2 flex-wrap">
                                {[1, 2, 5, 10].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setCountdownMins(m)}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-sm font-bold border transition-colors",
                                            countdownMins === m
                                                ? "bg-yellow-500 border-yellow-400 text-black"
                                                : "bg-neutral-800 border-white/10 text-white hover:bg-neutral-700"
                                        )}
                                    >
                                        {m} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom duration */}
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-widest font-mono mb-2">Custom (minutes)</p>
                            <input
                                type="number"
                                min={1}
                                max={60}
                                value={countdownMins}
                                onChange={e => setCountdownMins(Number(e.target.value))}
                                className="bg-neutral-800 border border-white/10 text-white rounded-lg px-3 py-2 w-28 text-sm focus:outline-none focus:border-yellow-500"
                            />
                        </div>

                        {/* Label */}
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-widest font-mono mb-2">Label</p>
                            <input
                                type="text"
                                value={countdownLabel}
                                onChange={e => setCountdownLabel(e.target.value)}
                                placeholder="Set begins in"
                                className="bg-neutral-800 border border-white/10 text-white rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-yellow-500"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleStartCountdown}
                                disabled={isStartingCountdown}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-lg text-sm uppercase tracking-wider transition-colors"
                            >
                                {isStartingCountdown ? '...' : '▶ Start Countdown'}
                            </button>
                            <button
                                onClick={handleCancelCountdown}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 px-4 rounded-lg text-sm uppercase tracking-wider transition-colors border border-white/10"
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>

                    {/* Live status */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center min-h-[140px]">
                        <CountdownAdminPreview />
                    </div>
                </div>
            </div>

            {/* LIVE POLL */}
            <div className="mb-8 bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-[80px] select-none">🗳️</div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-blue-400">🗳️</span> Live Poll
                </h2>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-4">Viewers vote in chat · push results to screen</p>

                {livePoll?.isActive ? (
                    // Active poll management
                    <div className="flex flex-col gap-4">
                        <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-4">
                            <p className="text-white font-bold mb-2">{livePoll.question}</p>
                            <div className="flex flex-col gap-2">
                                {livePoll.options.map((opt: string, i: number) => {
                                    const total = Object.values(livePoll.votes || {}).reduce((a: any, b: any) => a + b, 0) as number;
                                    const v = livePoll.votes?.[String(i)] || 0;
                                    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                                    return (
                                        <div key={i} className="flex flex-col gap-0.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-white">{opt}</span>
                                                <span className="text-blue-400 font-mono font-bold">{pct}% <span className="text-neutral-500">({v})</span></span>
                                            </div>
                                            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-neutral-500 text-xs mt-2 font-mono">
                                Total: {Object.values(livePoll.votes || {}).reduce((a: any, b: any) => a + b, 0) as number} votes
                            </p>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => handleTogglePollOnScreen(!livePoll.showOnScreen)}
                                className={clsx(
                                    "flex-1 font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors border",
                                    livePoll.showOnScreen
                                        ? "bg-blue-900/50 border-blue-500/50 text-blue-300 hover:bg-blue-900"
                                        : "bg-neutral-800 border-white/10 text-white hover:bg-blue-900/30"
                                )}
                            >
                                {livePoll.showOnScreen ? '📺 Hide from Screen' : '📺 Push to Screen'}
                            </button>
                            <button
                                onClick={handleClearPoll}
                                className="bg-red-900/50 hover:bg-red-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors border border-red-700/40"
                            >
                                <Trash2 size={12} className="inline mr-1" /> End Poll
                            </button>
                        </div>
                    </div>
                ) : (
                    // Create new poll
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            value={pollQuestion}
                            onChange={e => setPollQuestion(e.target.value)}
                            placeholder="Poll question... e.g. 🔥 EDM vs 🌊 Chill?"
                            className="bg-neutral-800 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-neutral-600"
                        />
                        {pollOptions.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={e => {
                                        const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o);
                                    }}
                                    placeholder={`Option ${i + 1}...`}
                                    className="flex-1 bg-neutral-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder:text-neutral-600"
                                />
                                {pollOptions.length > 2 && (
                                    <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-neutral-500 hover:text-red-400 px-2">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {pollOptions.length < 5 && (
                            <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-blue-400 hover:text-blue-300 text-xs font-mono uppercase tracking-widest text-left">
                                + Add Option
                            </button>
                        )}
                        <button
                            onClick={handleCreatePoll}
                            disabled={isCreatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-lg text-sm uppercase tracking-wider transition-colors"
                        >
                            {isCreatingPoll ? '...' : '🗳️ Launch Poll'}
                        </button>
                    </div>
                )}
            </div>

            {/* SPOTLIGHT TEXT */}
            <div className="mb-8 bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-[80px] select-none">✨</div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-purple-400">✨</span> Spotlight Text
                </h2>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-4">
                    Big bold text on screen for 6 seconds
                </p>

                <div className="flex flex-col gap-3">
                    {/* Quick suggestions */}
                    <div className="flex gap-2 flex-wrap">
                        {[
                            "Happy Birthday! 🎂",
                            "Welcome! 🙌",
                            "Let's Go! 🔥",
                            "Thank You! 💙",
                        ].map(s => (
                            <button
                                key={s}
                                onClick={() => setSpotlightText(s)}
                                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs border border-white/10 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Text input + send */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={spotlightText}
                            onChange={e => setSpotlightText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendSpotlight()}
                            placeholder="Type your message..."
                            maxLength={80}
                            className="flex-1 bg-neutral-800 border border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder:text-neutral-600"
                        />
                        <button
                            onClick={handleSendSpotlight}
                            disabled={!spotlightText.trim() || isSendingSpotlight}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2 px-5 rounded-lg text-sm uppercase tracking-wider transition-colors"
                        >
                            {isSendingSpotlight ? '...' : '✨ Send'}
                        </button>
                    </div>
                </div>
            </div>

            {/* FESTIVE THEME */}
            <div className="mb-8 bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-[80px] select-none">✨</div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-yellow-400">✨</span> Festive Theme
                </h2>
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-4">
                    Show celebratory overlay with custom text
                </p>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={festivalLabel}
                            onChange={e => setFestivalLabel(e.target.value)}
                            placeholder="e.g., Happy Diwali! 🪔"
                            maxLength={80}
                            className="flex-1 bg-neutral-800 border border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500 placeholder:text-neutral-600"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleUpdateFestival(true)}
                            disabled={isUpdatingFestival || !festivalLabel.trim()}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black font-bold py-2 rounded-lg text-sm uppercase tracking-wider transition-colors"
                        >
                            {isUpdatingFestival ? '...' : '🎉 Turn ON Festive Theme'}
                        </button>
                        <button
                            onClick={() => handleUpdateFestival(false)}
                            disabled={isUpdatingFestival || !syncState?.festival?.isActive}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-bold py-2 border border-white/10 rounded-lg text-sm uppercase tracking-wider transition-colors"
                        >
                            {isUpdatingFestival ? '...' : '❌ Turn OFF'}
                        </button>
                    </div>
                    {syncState?.festival?.isActive && (
                        <p className="text-green-400 text-xs font-mono mt-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active: {syncState.festival.label}
                        </p>
                    )}
                </div>
            </div>

            {/* MEDIA LIBRARY & UPLOAD */}
            <div className="mb-12 bg-neutral-900 border border-white/10 rounded-2xl p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Music size={120} />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-3">
                            <Music className="text-red-500" />
                            MEDIA LIBRARY
                        </h2>
                        <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mt-1">Upload & Play Direct Video Files</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="video/*"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-white text-black px-6 py-3 rounded-xl font-black italic tracking-tighter hover:bg-neutral-200 transition-all flex items-center gap-2"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            UPLOAD NEW SONG
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                    {mediaLibrary.length === 0 ? (
                        <div className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-neutral-600">
                            <FileVideo size={48} className="mb-4 opacity-20" />
                            <p className="font-mono text-xs uppercase tracking-[0.2em]">Library Empty</p>
                        </div>
                    ) : (
                        mediaLibrary.map((media) => (
                            <div key={media.id} className="bg-black/60 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold truncate text-sm">{media.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-neutral-500 text-[10px] uppercase font-mono tracking-widest truncate">{media.artist || 'Direct Upload'}</p>
                                            {media.duration > 0 && (
                                                <span className="bg-neutral-800 text-neutral-400 border border-white/5 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                                    {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMedia(media)}
                                        className="text-neutral-600 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => telecastMedia(media)}
                                        disabled={loadingId === media.id}
                                        className="flex-1 bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        {loadingId === media.id ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
                                        Telecast
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MARQUEE CONTROL */}
            <div className="bg-neutral-800/50 p-6 rounded-xl border border-white/5 border-t-yellow-500/50 flex flex-col justify-between mb-12">
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                        <RefreshCcw size={20} className="text-yellow-500" />
                        Live Marquee Message
                    </h2>
                    <div className="space-y-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10 min-h-[60px] flex items-center">
                            {syncState?.marquee ? (
                                <p className="text-yellow-500 font-mono text-sm">
                                    CURRENT: <span className="text-white italic">"{syncState.marquee}"</span>
                                </p>
                            ) : (
                                <p className="text-neutral-500 text-xs italic uppercase tracking-widest">No active marquee</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={marqueeText}
                                onChange={(e) => setMarqueeText(e.target.value)}
                                placeholder="Enter scrolling message..."
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                            <button
                                onClick={() => handleUpdateMarquee(marqueeText)}
                                disabled={isUpdatingMarquee || !marqueeText.trim()}
                                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-neutral-800 text-black font-bold px-4 rounded-lg text-xs transition-colors"
                            >
                                {isUpdatingMarquee ? <Loader2 className="animate-spin" size={14} /> : "SET"}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleUpdateMarquee('')}
                    disabled={isUpdatingMarquee || !syncState?.marquee}
                    className="mt-6 w-full py-2 bg-neutral-700 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 border border-white/5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                >
                    Clear Marquee
                </button>
            </div>

            <h2 className="text-xl font-bold mb-6 text-neutral-400 uppercase tracking-widest text-sm">Quick Select (Playlist)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PLAYLIST.map((video) => (
                    <div key={video.id} className="bg-neutral-800 border border-white/5 p-4 rounded-xl hover:border-white/20 transition-all group">
                        <div className="aspect-video bg-black rounded-lg mb-4 overflow-hidden relative">
                            <img
                                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                                alt={video.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <Play className="text-white fill-white" />
                            </div>
                        </div>

                        <h3 className="font-bold text-lg truncate mb-1">{video.title}</h3>
                        <p className="text-neutral-400 text-sm mb-4">{video.artist}</p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePlaylistQueue(video)}
                                disabled={queueingId === video.id}
                                className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                {queueingId === video.id ? <Loader2 className="animate-spin" size={16} /> : <ListPlus size={16} />}
                                Queue
                            </button>
                            <button
                                onClick={() => handlePlaylistClick(video)}
                                disabled={loadingId === video.id}
                                className="flex-[2] py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-white"
                            >
                                {loadingId === video.id ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} /> Playing...
                                    </>
                                ) : (
                                    <>
                                        <Radio size={18} /> Play Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Premium Raw Video Media Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111]/90 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden shadow-red-500/5 animate-in fade-in zoom-in duration-200">
                        {/* Glowing accent border */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-blue-500" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileVideo className="text-red-500" size={20} />
                                Raw Video Media Upload
                            </h2>
                            <button 
                                onClick={() => {
                                    if (!isUploading) {
                                        setIsUploadModalOpen(false);
                                        setUploadFile(null);
                                    }
                                }} 
                                disabled={isUploading}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* File specs card */}
                            {uploadFile && (
                                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
                                    <div className="flex justify-between">
                                        <span>File Name:</span>
                                        <span className="text-white font-bold truncate max-w-[200px]">{uploadFile.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>File Size:</span>
                                        <span className="text-white font-bold">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                    </div>
                                </div>
                            )}

                            {/* Inputs */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 uppercase font-mono tracking-widest">Song/Video Title</label>
                                <input
                                    type="text"
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    disabled={isUploading}
                                    placeholder="e.g. Blinding Lights"
                                    className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all focus:ring-1 focus:ring-red-500/20"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 uppercase font-mono tracking-widest">Artist / Director</label>
                                <input
                                    type="text"
                                    value={uploadArtist}
                                    onChange={(e) => setUploadArtist(e.target.value)}
                                    disabled={isUploading}
                                    placeholder="e.g. The Weeknd"
                                    className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all focus:ring-1 focus:ring-red-500/20"
                                />
                            </div>

                            {/* Duration Badge */}
                            <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                                <span className="text-[10px] text-neutral-400 uppercase font-mono tracking-widest flex items-center gap-1.5">
                                    <Clock size={12} className="text-neutral-500" /> Duration
                                </span>
                                {isDiscoveringDuration ? (
                                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                        <Loader2 className="animate-spin text-red-500" size={12} />
                                        Discovering...
                                    </div>
                                ) : (
                                    <span className="text-sm font-mono font-bold text-white">
                                        {Math.floor(uploadDuration / 60)}:{(uploadDuration % 60).toString().padStart(2, '0')}
                                    </span>
                                )}
                            </div>

                            {/* Progress bar */}
                            {isUploading && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-neutral-400">Uploading to Satellite...</span>
                                        <span className="text-red-500 font-bold">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 h-full rounded-full transition-all duration-150"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setUploadFile(null);
                                    }}
                                    disabled={isUploading}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={startMediaUpload}
                                    disabled={isUploading || isDiscoveringDuration || !uploadTitle || !uploadArtist}
                                    className="flex-[2] py-3 bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-white text-sm"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={16} />
                                            Start Telecast Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </main >
    );
}

