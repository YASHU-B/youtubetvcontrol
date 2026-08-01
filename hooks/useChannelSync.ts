import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PLAYLIST, VideoItem, TOTAL_PLAYLIST_DURATION } from '@/data/playlist';
import { parseVideoMetadata } from '@/lib/metadata';

// A fixed point in time to start the 24/7 loop calculation
// A fixed point in time to start the 24/7 loop calculation - REMOVED
// const BROADCAST_EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

export interface ChannelState {
    video: VideoItem; // Resolved from playlist
    startedAt: number;
    status: 'playing' | 'paused' | 'idle';
    elapsedTime: number;
    nextVideo?: VideoItem | null;
    isLooping?: boolean;
    isLive?: boolean; // New field for Live Stream Mode
    mediaType?: 'youtube' | 'direct'; // NEW: Media type (YouTube or direct link)
    currentDedication?: {
        from: string;
        to: string;
        songName?: string;
        message: string;
        id: string;
        startedAt: number;
        isVisible?: boolean;
    } | null;
    marquee?: string | null; // NEW: Scrolling marquee message
    timeOffset?: number; // NEW: Current global time offset in seconds
    festival?: { isActive: boolean; label?: string } | null; // NEW: Festive theme
    dedicationsEnabled?: boolean; // NEW: Manual toggle for dedications
    dedication?: { clearedIds?: string[] } | null; // NEW: Track RLS-bypassed cleared IDs
    connectionError?: string | null;
    diagnostics?: string; // NEW: Inline diagnostics log for TV debugging
}

// getMathematicalState REMOVED as requested. We no longer want 24/7 auto-pilot.

export function useChannelSync() {
    const timeOffsetRef = useRef(0);
    
    // Start with a non-null default state so diagnostics can show up immediately before database fetch completes
    const [state, setState] = useState<ChannelState | null>({
        video: { id: '', title: 'Standby', artist: 'System', duration: 0 },
        startedAt: 0,
        status: 'idle',
        elapsedTime: 0,
        connectionError: null,
        diagnostics: '1. Hook mounted'
    });

    const appendDiag = (msg: string) => {
        setState(prev => {
            const currentDiags = prev?.diagnostics ? prev.diagnostics + " -> " + msg : msg;
            return {
                ...(prev || { video: { id: '', title: 'Standby', artist: 'System', duration: 0 }, startedAt: 0, status: 'idle', elapsedTime: 0 }),
                diagnostics: currentDiags
            } as ChannelState;
        });
    };

    useEffect(() => {
        appendDiag("2. useEffect mounted");
        
        const handleData = (data: any) => {
            appendDiag("5. handleData called");
            if (!data) {
                setState(prev => ({
                    video: { id: '', title: 'Standby', artist: 'System', duration: 0 },
                    startedAt: 0,
                    status: 'idle',
                    elapsedTime: 0,
                    diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 5b. no data" : "5b. no data"
                }));
                return;
            }
            const timeOffset = data.timeOffset || 0;
            timeOffsetRef.current = timeOffset;

            // If Admin has explicitly started a telecast, respect it
            if (data.status === 'playing' || data.status === 'paused') {
                // Try to find in playlist first
                const playlistVideo = PLAYLIST.find(v => v.id === data.videoId);
                
                // Fallback to Firestore data with smart parsing
                const resolvedMeta = parseVideoMetadata(
                    data.title || 'Unknown Title', 
                    data.artist || 'Unknown Artist'
                );

                const video: VideoItem = playlistVideo || {
                    id: data.videoId,
                    title: resolvedMeta.title,
                    artist: resolvedMeta.artist,
                    duration: data.duration || 0,
                    mediaType: data.mediaType || 'youtube'
                };

                let nextVideo: VideoItem | null = null;
                if (data.nextVideo) {
                    const playlistNext = PLAYLIST.find(v => v.id === data.nextVideo.id);
                    const nextMeta = parseVideoMetadata(
                        data.nextVideo.title || 'Unknown Title',
                        data.nextVideo.artist || 'Unknown Artist'
                    );

                    nextVideo = playlistNext || {
                        id: data.nextVideo.id,
                        title: nextMeta.title,
                        artist: nextMeta.artist,
                        duration: data.nextVideo.duration || 0
                    };
                }

                const startedAtMs = typeof data.startedAt === 'number' ? data.startedAt : null;

                const now = Date.now();
                const rawElapsed = startedAtMs ? (now - startedAtMs) / 1000 : 0;

                setState(prev => ({
                    video: {
                        ...video,
                        duration: data.duration || video.duration
                    },
                    startedAt: startedAtMs || (prev?.startedAt || now),
                    status: data.status,
                    elapsedTime: rawElapsed > 0 ? rawElapsed : 0,
                    nextVideo,
                    isLooping: !!data.isLooping,
                    isLive: !!data.isLive,
                    mediaType: data.mediaType || video.mediaType || 'youtube',
                    currentDedication: data.currentDedication || null,
                    marquee: data.marquee || null,
                    festival: data.festival || null,
                    dedicationsEnabled: data.dedicationsEnabled ?? true,
                    dedication: data.dedication || null,
                    timeOffset,
                    diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 5c. loaded status " + data.status : "5c. loaded status " + data.status
                }));
            } else if (data.status === 'idle') {
                setState(prev => ({
                    video: { id: '', title: 'Standby', artist: 'System', duration: 0 },
                    startedAt: 0,
                    status: 'idle',
                    elapsedTime: 0,
                    nextVideo: null,
                    isLooping: !!data.isLooping,
                    isLive: !!data.isLive,
                    mediaType: 'youtube',
                    currentDedication: data.currentDedication || null,
                    marquee: data.marquee || null,
                    festival: data.festival || null,
                    dedicationsEnabled: data.dedicationsEnabled ?? true,
                    dedication: data.dedication || null,
                    timeOffset: data.timeOffset || 0,
                    diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 5d. loaded status idle" : "5d. loaded status idle"
                }));
            } else {
                setState(prev => ({
                    video: { id: '', title: 'Standby', artist: 'System', duration: 0 },
                    startedAt: 0,
                    status: 'idle',
                    elapsedTime: 0,
                    diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 5e. fallback" : "5e. fallback"
                }));
            }
        };

        const fetchInitial = async () => {
            appendDiag("3. fetchInitial started");
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection Timeout (8s)")), 8000)
            );
            try {
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing';
                appendDiag("3b. url = " + url.substring(0, 15) + "...");
                const fetchPromise = supabase.from('channels').select('*').eq('id', 'main').single();
                
                appendDiag("3c. sending fetch");
                const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;
                
                if (error) {
                    appendDiag("4. error: " + error.message);
                    setState(prev => ({
                        video: { id: '', title: 'Error', artist: 'System', duration: 0 },
                        startedAt: 0,
                        status: 'idle',
                        elapsedTime: 0,
                        connectionError: `${error.code || ''} ${error.message}`,
                        diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 4. err set" : "4. err set"
                    }));
                } else {
                    appendDiag("4. fetch success");
                    handleData(data);
                }
            } catch (err: any) {
                appendDiag("4. exception: " + err.message);
                setState(prev => ({
                    video: { id: '', title: 'Error', artist: 'System', duration: 0 },
                    startedAt: 0,
                    status: 'idle',
                    elapsedTime: 0,
                    connectionError: err.message || String(err),
                    diagnostics: prev?.diagnostics ? prev.diagnostics + " -> 4. exception set" : "4. exception set"
                }));
            }
        };
        fetchInitial();

        appendDiag("6. setting up realtime");
        const channel = supabase.channel(`channel-sync-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                appendDiag("realtime payload received");
                handleData(payload.new);
            })
            .subscribe((status, err) => {
                appendDiag("realtime status: " + status);
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error("Supabase realtime channel subscription error:", status, err);
                    setState(prev => ({
                        ...(prev || { video: { id: '', title: 'Error', artist: 'System', duration: 0 }, startedAt: 0, status: 'idle', elapsedTime: 0 }),
                        connectionError: `Realtime status: ${status} ${err ? err.message : ''}`,
                        diagnostics: prev?.diagnostics ? prev.diagnostics + " -> realtime err" : "realtime err"
                    }));
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, []);

    // 2. Simple per-second ticker for UI
    useEffect(() => {
        if (!state || state.status !== 'playing') return;

        const interval = setInterval(() => {
            const now = Date.now();
            const rawElapsed = (now - state.startedAt) / 1000;
            // The object spread keeps all existing fields, including festival
            setState(prev => prev ? ({ ...prev, elapsedTime: rawElapsed }) : null);
        }, 1000);

        return () => clearInterval(interval);
    }, [state?.startedAt, state?.status]); // intentional omission of deep dependencies to avoid reset

    return state;
}
