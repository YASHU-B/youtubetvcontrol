"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import Hls from "hls.js";
import { useChannelSync } from "../hooks/useChannelSync";
import { useViewerCount } from "../hooks/useViewerCount";
import LiveChat from "./LiveChat";
import AdBanner from "./AdBanner";
import DedicationOverlay from "./DedicationOverlay";
import CountdownOverlay from "./CountdownOverlay";
import SpotlightOverlay from "./SpotlightOverlay";
import PollResultsOverlay from "./PollResultsOverlay";
import MarqueeOverlay from "./MarqueeOverlay";
import LowerThird from "./LowerThird";
import VibeOverlay from "./VibeOverlay";
import ReactionsOverlay from "./ReactionsOverlay";
import ComingUpNextOverlay from "./ComingUpNextOverlay";
import FestivalOverlay from "./FestivalOverlay";
import { useFCM } from "../hooks/useFCM";
import { Power, Radio, RotateCcw, Volume2, VolumeX, AlertCircle, Info, Bell, BellRing, Loader2, Eye, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { PLAYLIST } from "@/data/playlist";


export default function TVPlayer() {
    const [showSyncOverlay, setShowSyncOverlay] = useState(false);
    const syncOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncState = useChannelSync();
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [isPoweredOn, setIsPoweredOn] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showEndCardCover, setShowEndCardCover] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorCode, setErrorCode] = useState<number | string | null>(null);
    const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const playRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup play reveal timer on unmount
    useEffect(() => {
        return () => {
            if (playRevealTimer.current) clearTimeout(playRevealTimer.current);
            if (syncOverlayTimer.current) clearTimeout(syncOverlayTimer.current);
        };
    }, []);

    // Manually track video to avoid react-youtube's crashing prop updates
    const initialVideoId = useRef(syncState?.video?.id || 'dQw4w9WgXcQ');
    const lastPlayedVideoId = useRef<string | null>(null);
    const hasInitiatedYouTube = useRef(false);

    // Auto-advance guard — mirrors admin logic so playback continues when admin tab is closed
    const lastProcessedStartedAt = useRef<number>(0);
    // Track videos that errored this session so we don't retry them
    const failedVideoIds = useRef<Set<string>>(new Set());

    // Helpers to safely check if the player iframe still exists to prevent "reading 'src' of null" crashes
    const isPlayerValid = (player: any) => {
        if (!player) return false;
        try {
            // If the iframe element was removed from the DOM by React, getIframe throws or returns null
            const iframe = player.getIframe();
            return !!iframe && iframe.tagName === 'IFRAME';
        } catch (e) {
            return false; // Player is dead/destroyed
        }
    };

    const viewerCount = useViewerCount(isPoweredOn);
    const { requestPermission, permission, isSupported, fcmToken, activeNotification, setActiveNotification } = useFCM();

    // Auto-clear toast after 5 seconds
    useEffect(() => {
      if (activeNotification) {
        const timer = setTimeout(() => setActiveNotification(null), 5000);
        return () => clearTimeout(timer);
      }
    }, [activeNotification]);
    const [subscribing, setSubscribing] = useState(false);


    // CRITICAL: Memoize opts to prevent re-renders and include initial start time
    const playerOpts = useMemo(() => {
        const start = 0; // The actual sync happens in onReady or useEffect
        return {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 1, // Start autoplaying automatically
                mute: 1,     // Start muted to satisfy all WebView autoplay security policies
                controls: 0,
                disablekb: 1,
                modestbranding: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
                iv_load_policy: 3,
                autohide: 1,
                showinfo: 0,
                vq: 'hd1080', // Force HD1080 quality
                start: start,
                origin: typeof window !== 'undefined' ? window.location.origin : '',
            },
        };
    }, []); // Freeze opts to completely avoid re-mounting player

    // 1. Initial & Event-based Sync
    // Effect: Turn off power if signal is lost (forces user interaction on reconnect for iOS)
    useEffect(() => {
        if (!syncState) {
            setIsPoweredOn(false);
        }
        // Cleanup playerRef if we switch away from YouTube to prevent ghost method calls
        if (syncState?.mediaType !== 'youtube') {
            playerRef.current = null;
            lastPlayedVideoId.current = null;
        }
    }, [syncState?.mediaType, syncState === null]); // Run when existence or mediaType changes

    // 1. Play/Pause state, Simple drift sync, and Video Selection
    useEffect(() => {
        if (!syncState) return;

        try {
            // Calculate start time for drift comparisons
            let startSeconds = syncState.elapsedTime;
            if (syncState.isLive) startSeconds = 0;

            // Check if the video ID has changed since we last played something
            const isDifferentVideo = lastPlayedVideoId.current !== syncState.video.id;

            // Direct Media Status Sync
            if (syncState.mediaType === 'direct') {
                const video = videoRef.current;
                if (video) {
                    if (isPoweredOn && syncState.status === 'playing') {
                        video.play().catch(() => { });
                        video.muted = false;
                    } else {
                        video.pause();
                        video.muted = true;
                    }

                    // Sync check for native video
                    if (!syncState.isLive) {
                        const drift = Math.abs(video.currentTime - startSeconds);
                        if (drift > 5) video.currentTime = startSeconds;
                    }
                }
            }
            // YouTube Status & Video Sync
            else if (syncState.mediaType === 'youtube' && playerRef.current) {
                const player = playerRef.current;

                if (!isPlayerValid(player)) {
                    // Force a cleanup if the iframe is gone but ref is lingering
                    playerRef.current = null;
                    return;
                }

                // If the video ID changed, we MUST use loadVideoById manually
                // changing the <YouTube videoId> prop crashes react-youtube frequently on fast transitions
                if (isDifferentVideo) {
                    if (typeof player.loadVideoById === 'function') {
                        // Cover the player before any API call to prevent icon flash
                        setIsActuallyPlaying(false);
                        player.loadVideoById({
                            videoId: syncState.video.id,
                            startSeconds: startSeconds
                        });
                        if (!isPoweredOn || syncState.status !== 'playing') {
                            player.pauseVideo();
                            player.mute();
                        } else {
                            player.unMute();
                            player.playVideo();
                        }
                    }
                    lastPlayedVideoId.current = syncState.video.id;
                } else {
                    // Same video, just handle playback state
                    if (typeof player.getPlayerState === 'function') {
                        if (isPoweredOn && syncState.status === 'playing') {
                            const playerState = player.getPlayerState();
                            // 1 = Playing, 3 = Buffering
                            if (playerState !== 1 && playerState !== 3) {
                                player.playVideo();
                                player.unMute();
                            }
                        } else {
                            player.pauseVideo();
                            player.mute();
                        }

                        // Simple drift check (Only check if we are playing and not live)
                        if (!syncState.isLive && (isPoweredOn || syncState.status === 'playing')) {
                            const playerTime = player.getCurrentTime();
                            // Sync if drift is > 5s — cover the player to hide the seek flash
                            if (Math.abs(playerTime - startSeconds) > 5) {
                                setIsActuallyPlaying(false);
                                player.seekTo(startSeconds, true);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Sync Error caught (likely orphaned player):", err);
            // If it's the specific iframe src error, wipe the ref
            if (err instanceof TypeError && err.message.includes('src')) {
                playerRef.current = null;
            }
        }
    }, [syncState?.status, syncState?.video?.id, isPoweredOn, syncState?.mediaType, syncState?.elapsedTime]);

    // Keep cover ON when video changes until it actually plays
    useEffect(() => {
        if (syncState?.video?.id) {
            // Only use end card cover for YouTube to hide grids
            setShowEndCardCover(syncState.mediaType === 'youtube');
        }
        // Direct media should not show the generic YouTube buffering spinner
        setIsBuffering(syncState?.mediaType === 'youtube');
        setIsActuallyPlaying(false);
        setHasError(false);
    }, [syncState?.video?.id, syncState?.mediaType]);

    // 1c. Removed Mute/Pause YouTube effect (Iframe is now unmounted during direct playback)

    // 2. Media Session API (Lock Screen Controls)
    useEffect(() => {
        if (!syncState?.video || !('mediaSession' in navigator)) return;

        const video = syncState.video;

        // Update Metadata
        navigator.mediaSession.metadata = new MediaMetadata({
            title: video.title,
            artist: video.artist || "YashuBeatz",
            album: "Live Broadcast",
            artwork: [
                { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            ]
        });

        // Action Handlers
        navigator.mediaSession.setActionHandler('play', () => {
            if (playerRef.current) {
                playerRef.current.playVideo();
                navigator.mediaSession.playbackState = "playing";
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (playerRef.current) {
                playerRef.current.pauseVideo();
                navigator.mediaSession.playbackState = "paused";
            }
        });
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            if (playerRef.current && !syncState.isLive) {
                const currentTime = playerRef.current.getCurrentTime();
                playerRef.current.seekTo(Math.max(currentTime - 10, 0), true);
            }
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
            if (playerRef.current && !syncState.isLive) {
                const currentTime = playerRef.current.getCurrentTime();
                playerRef.current.seekTo(currentTime + 10, true);
            }
        });

        return () => {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('seekbackward', null);
            navigator.mediaSession.setActionHandler('seekforward', null);
        };
    }, [syncState?.video?.id, isPoweredOn]);

    // 3. Force Sync on Broadcast Change (Authoritative)
    useEffect(() => {
        if (!playerRef.current || !syncState || syncState.status !== 'playing' || syncState.isLive) return;

        const player = playerRef.current;
        if (!isPlayerValid(player) || typeof player.seekTo !== 'function') return;

        try {
            // When startedAt changes (Next song or Loop), jump to exact server time immediately
            const now = Date.now();
            const serverTime = (now - syncState.startedAt) / 1000;

            // Only seek if we are within valid bounds (0 to duration) or duration is 0 (discovery)
            if (serverTime >= 0 && (syncState.video.duration === 0 || serverTime <= syncState.video.duration)) {
                player.seekTo(serverTime, true);
                if (isPoweredOn && syncState.status === 'playing') {
                    player.playVideo();
                    player.unMute();
                } else {
                    player.pauseVideo();
                    player.mute();
                }
            }
        } catch (e) {
            console.warn("Force Sync skipped on orphaned player.");
        }
    }, [syncState?.startedAt, isPoweredOn]); // Triggers immediately on song switch or restart

    // 4. Periodic Drift Check (Every 15 seconds) - Decoupled from elapsedTime
    useEffect(() => {
        if (!syncState || syncState.status !== 'playing' || syncState.isLive) return;

        const heartbeat = setInterval(() => {
            const player = playerRef.current;
            // Additional safety net inside the interval:
            if (!isPlayerValid(player) || typeof player.getCurrentTime !== 'function') return;

            try {
                const playerTime = player.getCurrentTime();
                const serverTime = (Date.now() - syncState.startedAt) / 1000;

                // Only correct if drift is > 5 seconds to avoid micro-stutters
                if (Math.abs(playerTime - serverTime) > 5) {
                    player.seekTo(serverTime, true);
                    if (isPoweredOn) {
                        player.playVideo();
                        player.unMute();
                    } else {
                        player.pauseVideo();
                        player.mute();
                    }
                }
            } catch (err) {
                console.error("Heartbeat sync error, orphaned player?", err);
            }
        }, 15000);

        return () => clearInterval(heartbeat);
    }, [syncState?.startedAt, isPoweredOn, syncState?.status]);

    // 4. HLS & Direct Video Support (Loading Source)
    useEffect(() => {
        const video = videoRef.current;
        // Load source as soon as we have a direct media URL, regardless of power state
        if (!video || !syncState || syncState.mediaType !== 'direct') return;

        const url = syncState.video.id;
        const isHls = url.toLowerCase().includes('.m3u8') || url.includes('application/vnd.apple.mpegurl');

        // Cleanup previous HLS instance if the source changed
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        console.log("Loading Direct Media:", url, "as HLS:", isHls);

        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90, // Increase back buffer
                    capLevelToPlayerSize: false, // Prevent capping quality to player width
                    abrEwmaDefaultEstimate: 10000000, // 10 Mbps starting speed estimate for instant HD
                    maxBufferLength: 30, // Limit buffer size to prevent memory strain while keeping playback smooth
                    maxMaxBufferLength: 60
                });
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (syncState.status === 'playing') video.play().catch(() => { });
                    if (!syncState.isLive && syncState.elapsedTime > 0) {
                        video.currentTime = syncState.elapsedTime;
                    }
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        console.error("Fatal HLS Error:", data.type);
                        onVideoError();
                    }
                });
                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                video.src = url;
                video.load();
                if (!syncState.isLive && syncState.elapsedTime > 0) {
                    video.currentTime = syncState.elapsedTime;
                }
            }
        } else {
            // Standard MP4/Direct link
            video.src = url;
            video.load();
            if (!syncState.isLive && syncState.elapsedTime > 0) {
                video.currentTime = syncState.elapsedTime;
            }
        }

        // Handle Playback State
        if (syncState.status === 'playing') {
            video.play().catch(err => {
                // Autoplay failed (likely browser policy before user interaction)
                console.warn("Autoplay blocked, will retry on user interaction:", err);
            });
        } else {
            video.pause();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [syncState?.video?.id]); // Only re-run when video URL changes, not isPoweredOn

    const onReady = (event: YouTubeEvent) => {
        playerRef.current = event.target;
        // Now safely load the *actual* latest video inside onReady
        if (syncState && syncState.video && typeof event.target.loadVideoById === 'function') {
            // Ensure player is covered before loading
            setIsActuallyPlaying(false);
            if (typeof event.target.setPlaybackQuality === 'function') {
                event.target.setPlaybackQuality('hd1080');
            }
            event.target.loadVideoById({
                videoId: syncState.video.id,
                startSeconds: syncState.isLive ? 0 : syncState.elapsedTime
            });
            lastPlayedVideoId.current = syncState.video.id;

            // If not powered on, keep it muted and paused to buffer in the background
            if (!isPoweredOn || syncState.status !== 'playing') {
                event.target.pauseVideo();
                event.target.mute();
            } else {
                event.target.unMute();
                event.target.playVideo();
            }
        }
    };

    // PRIMARY TRIGGER: Directly compare elapsedTime to duration (reliable, no race condition)
    // This fires every second from the syncState ticker.
    useEffect(() => {
        if (!isPoweredOn || !syncState || syncState.status !== 'playing' || syncState.isLive) return;

        const { video, elapsedTime } = syncState;
        if (video.duration <= 0) return; // Duration not yet known

        const hasNextSong = !!syncState.nextVideo || !!syncState.isLooping;
        const triggerWindow = hasNextSong ? 12 : 2;
        const remaining = video.duration - elapsedTime;

        if (remaining <= triggerWindow && remaining >= -2) {
            setShowEndCardCover(true);
        }
    }, [syncState?.elapsedTime, syncState?.video?.id, isPoweredOn, syncState?.status]);

    // BACKUP TRIGGER: YouTube player-based check (catches cases where server duration lags)
    useEffect(() => {
        if (!isPoweredOn || !syncState || !playerRef.current || syncState.status === 'paused') return;

        const interval = setInterval(() => {
            const player = playerRef.current;
            if (!player || typeof player.getCurrentTime !== 'function') return;

            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();

            if (!syncState.isLive && duration > 0 && currentTime > (duration - 2)) {
                setShowEndCardCover(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPoweredOn, syncState?.video?.id, syncState?.status, isPoweredOn]);

    const onStateChange = (event: YouTubeEvent) => {
        const state = event.data;

        // 1 = Playing — delay reveal to ensure YouTube UI is fully hidden before showing video
        if (state === 1) {
            setIsBuffering(false);
            if (typeof event.target.setPlaybackQuality === 'function') {
                event.target.setPlaybackQuality('hd1080');
            }
            if (playRevealTimer.current) clearTimeout(playRevealTimer.current);
            playRevealTimer.current = setTimeout(() => {
                setIsActuallyPlaying(true);
                // Show sync overlay for 4 seconds after video starts
                setShowSyncOverlay(true);
                if (syncOverlayTimer.current) clearTimeout(syncOverlayTimer.current);
                syncOverlayTimer.current = setTimeout(() => {
                    setShowSyncOverlay(false);
                }, 4000); // 4 second sync overlay
            }, 200); // Fast 0.2s reveal
        }
        // 3 = Buffering
        else if (state === 3) {
            setIsBuffering(true);
            if (playRevealTimer.current) clearTimeout(playRevealTimer.current);
            setIsActuallyPlaying(false);
        }
        // 0 = Ended, -1 = Unstarted, 2 = Paused, 5 = Cued
        else if (state === 0 || state === -1 || state === 2 || state === 5) {
            if (playRevealTimer.current) clearTimeout(playRevealTimer.current);
            setIsActuallyPlaying(false);
        }

        // We also want to clear buffering if it goes to 2 (Paused), 5 (Cued), -1 (Unstarted)
        const player = playerRef.current;
        const isNearEnd = player && typeof player.getDuration === 'function' &&
            (player.getDuration() - player.getCurrentTime() < 25);

        if (event.data === 3) {
            setIsBuffering(true); // Buffering
            setShowEndCardCover(false);
        } else if (event.data === 1) { // Playing
            setIsBuffering(false);

            // Auto-Discovery: If duration is 0 in Firestore, update it now that we're playing
            if (syncState?.video?.duration === 0) {
                const duration = Math.floor(event.target.getDuration());
                if (duration > 0) {
                    console.log("Auto-Discovery (onPlay): Found duration:", duration);
                    supabase.from("channels").update({ duration: duration }).eq("id", "main")
                        .then(({ error }) => { if (error) console.error("Duration update failed:", error); });
                }
            }

            if (!isNearEnd) {
                setShowEndCardCover(false);
            }
        } else {
            // For any other state (Paused, Ended, Cued), clear the buffer spinner
            setIsBuffering(false);
            if ((event.data === 2) && !isNearEnd) {
                setShowEndCardCover(false);
            }
        }
        // If Cued (5) or Paused (2) and Powered On, force play (Fix for iOS interruptions)
        if ((event.data === 5 || event.data === 2) && isPoweredOn && syncState?.status === 'playing') {
            event.target.playVideo();
        }
    };

    const onError = (event: YouTubeEvent) => {
        console.error("YouTube Player Error:", event.data);
        setErrorCode(event.data);
        if (event.data === 101 || event.data === 150 || event.data === 100 || event.data === 2 || event.data === 5) {
            setHasError(true);
        }
    };

    const onVideoError = () => {
        console.error("Native Video Error");
        setErrorCode("MEDIA_LOAD_FAILED");
        setHasError(true);
    };

    const skipCurrentVideo = async () => {
        if (!syncState) return;
        try {
            if (syncState.nextVideo) {
                // For Manual mode, skip to next queued video
                const next = syncState.nextVideo;
                await supabase.from("channels").update({
                    videoId: next.id,
                    title: next.title,
                    artist: next.artist,
                    duration: next.duration || 0,
                    startedAt: Date.now(),
                    nextVideo: null,
                    status: 'playing'
                }).eq("id", "main");
                console.log("Self-Healing: Skipped to queued video");
            } else {
                // No queue — mark current as failed and try a random PLAYLIST song
                if (syncState.video?.id) {
                    failedVideoIds.current.add(syncState.video.id);
                }

                const available = PLAYLIST.filter(s => !failedVideoIds.current.has(s.id));

                if (available.length > 0) {
                    // Pick a random untried song
                    const next = available[Math.floor(Math.random() * available.length)];
                    console.log(`Self-Healing: Retrying with "${next.title}" (${available.length} options left)`);
                    await supabase.from("channels").update({
                        videoId: next.id,
                        title: next.title,
                        artist: next.artist,
                        duration: next.duration,
                        startedAt: Date.now(),
                        status: 'playing',
                        nextVideo: null,
                        isLive: false,
                        mediaType: 'youtube'
                    }).eq("id", "main");
                } else {
                    // All songs tried and failed — go to standby
                    console.warn("Self-Healing: All PLAYLIST songs failed. Going to standby.");
                    failedVideoIds.current.clear(); // Reset for next session
                    await supabase.from("channels").update({ status: 'idle' }).eq("id", "main");
                }
            }
        } catch (err) {
            console.error("Self-Healing Failed:", err);
        }
    };

    // Auto-Skip Effect — faster (3s) so restricted videos don't linger
    useEffect(() => {
        if (hasError && isPoweredOn && syncState) {
            const timer = setTimeout(() => {
                skipCurrentVideo();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [hasError, isPoweredOn, syncState?.video?.id, syncState?.timeOffset]);

    // Reset error when video changes
    useEffect(() => {
        setHasError(false);
        setErrorCode(null);
        // Only buffer for YouTube by default
        setIsBuffering(syncState?.mediaType === 'youtube');
    }, [syncState?.video?.id, syncState?.mediaType]);

    const onEnd = () => {
        // Just show the cover. Do NOT seek back (causes stutter/repeat issue).
        // The Admin Automation or Loop logic will trigger a startedAt change, 
        // which our 'Force Sync' effect above will handle cleanly.
        setIsActuallyPlaying(false);
        setShowEndCardCover(true);
    };

    // ── TV-Side Auto-Advance ──────────────────────────────────────────────────
    // Mirrors the admin's checkAutoPlay so songs keep advancing even when the
    // admin tab is closed. Both sides use lastProcessedStartedAt to avoid
    // double-firing; Firestore's serverTimestamp acts as the dedup key.
    useEffect(() => {
        if (!syncState) return;

        const checkAutoPlay = async () => {
            if (syncState.status === 'idle' || syncState.isLive) return;

            const { video, startedAt, nextVideo, isLooping } = syncState;
            if (!startedAt) return;

            const elapsed = (Date.now() - startedAt) / 1000;
            const isAtEnd = video.duration > 0 && elapsed >= (video.duration - 1.0);
            const isNewInstance = startedAt > lastProcessedStartedAt.current;

            if (!isAtEnd || !isNewInstance) return;

            // Lock immediately to prevent other tabs racing us
            lastProcessedStartedAt.current = startedAt;

            try {
                if (!nextVideo && !isLooping) {
                    console.log("Auto-Advance: Finishing (Standby)");
                    await supabase.from("channels").update({ status: 'idle' }).eq("id", "main");
                } else if (nextVideo) {
                    console.log("Auto-Advance: Playing Queued Video", nextVideo.title);
                    await supabase.from("channels").update({
                        videoId: nextVideo.id,
                        title: nextVideo.title,
                        artist: nextVideo.artist,
                        duration: nextVideo.duration || 0,
                        startedAt: Date.now(),
                        status: 'playing',
                        nextVideo: null,
                        isLive: false,
                        mediaType: 'youtube'
                    }).eq("id", "main");
                } else if (isLooping) {
                    console.log("Auto-Advance: Looping Video", video.title);
                    await supabase.from("channels").update({
                        videoId: video.id,
                        title: video.title,
                        artist: video.artist,
                        duration: video.duration,
                        startedAt: Date.now(),
                        status: 'playing',
                        isLive: false,
                        mediaType: 'youtube'
                    }).eq("id", "main");
                }
            } catch (e) {
                // Reset lock so another client can retry
                lastProcessedStartedAt.current = 0;
                console.error('TVPlayer auto-advance error:', e);
            }
        };

        const interval = setInterval(checkAutoPlay, 500);
        checkAutoPlay();
        return () => clearInterval(interval);
    }, [syncState?.startedAt, syncState?.isLooping, !!syncState?.nextVideo, syncState?.video?.id, syncState?.video?.duration, syncState?.status]);

    const togglePower = () => {
        setIsPoweredOn(true);
        // CRITICAL FOR iOS: Trigger play immediately on the click event
        if (playerRef.current) {
            const player = playerRef.current;
            // Unmute first to satisfy browser policies
            player.unMute();

            // AUTHORITATIVE SEEK: Jump to exact server time before playing to avoid 0:00 flicker
            if (syncState && !syncState.isLive) {
                const now = Date.now();
                const freshElapsed = (now - syncState.startedAt) / 1000;
                player.seekTo(freshElapsed, true);
            }

            player.playVideo();
        }
        if (videoRef.current) {
            const video = videoRef.current;
            video.muted = false;

            if (syncState && !syncState.isLive) {
                const now = Date.now();
                const freshElapsed = (now - syncState.startedAt) / 1000;
                video.currentTime = freshElapsed;
            }
            video.play().catch(() => { });
        }
    };

    const handleScreenInteraction = () => {
        if (!isPoweredOn) return;
        console.log("Global gesture triggered: forcing play & unmute on all players");
        if (playerRef.current) {
            const player = playerRef.current;
            try {
                if (typeof player.unMute === 'function') player.unMute();
                if (syncState && !syncState.isLive && typeof player.seekTo === 'function') {
                    const now = Date.now();
                    const freshElapsed = (now - syncState.startedAt) / 1000;
                    player.seekTo(freshElapsed, true);
                }
                if (typeof player.playVideo === 'function') player.playVideo();
            } catch (e) {
                console.warn("Screen click play fallback skipped:", e);
            }
        }
        if (videoRef.current) {
            const video = videoRef.current;
            try {
                video.muted = false;
                if (syncState && !syncState.isLive) {
                    const now = Date.now();
                    const freshElapsed = (now - syncState.startedAt) / 1000;
                    video.currentTime = freshElapsed;
                }
                video.play().catch(() => { });
            } catch (e) {
                console.warn("Screen click direct video play fallback skipped:", e);
            }
        }
    };

    // TV Remote / Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPoweredOn && (e.key === 'Enter' || e.key === ' ' || e.key === 'MediaPlayPause')) {
                e.preventDefault();
                const powerBtn = document.getElementById('power-on-btn');
                if (powerBtn) powerBtn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPoweredOn]);

    if (isPoweredOn && (!syncState || syncState.status === 'idle')) return (
        <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center text-neutral-500 gap-4 z-0">
            <div className="w-16 h-16 rounded-full border-2 border-neutral-800 border-t-red-900/50 animate-spin flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-neutral-900" />
            </div>
            <p className="font-mono text-xs tracking-[0.2em] uppercase blink">
                Standby • No Signal
            </p>
            <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mt-2">
                Waiting for Admin Telecast...
            </p>
            {syncState?.connectionError && (
                <p className="text-red-500 font-mono text-[10px] bg-red-950/40 px-3 py-1.5 rounded border border-red-900/30 max-w-md text-center mt-4">
                    ⚠️ {syncState.connectionError}
                </p>
            )}
        </div>
    );
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
        } else if (typeof window !== 'undefined' && window.Notification?.permission === 'denied') {
            alert("Notification permission was denied. Please enable it in your browser settings to get notified.");
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden group">
        {activeNotification && (
          <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
            <strong className="font-medium">{activeNotification.title}</strong>
            <div className="text-sm">{activeNotification.body}</div>
          </div>
        )}

            {/* Safety Masks for YouTube Branding - Refined for cleaner look */}
            <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-black via-black/40 to-transparent z-10 pointer-events-none md:hidden" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none md:hidden" />

            {/* Premium Vibe Overlay (Grain, Scanlines, Depth) */}
            {/* Premium Broadcast Layers */}
            {isPoweredOn && (
                <>
                    {/* Retro Vibe/VHS Overlay (Global) */}
                    <div className="md:hidden">
                        <VibeOverlay />
                    </div>

                    {/* Dynamic Lower Third (Now Playing Banner) */}
                    {syncState?.video?.id && (
                        <LowerThird
                            title={syncState?.video?.title}
                            artist={syncState?.video?.artist}
                            trigger={syncState?.video?.id}
                        />
                    )}
                </>
            )}

            {/* High-Fidelity Channel Hub (Top Left) */}
            {isPoweredOn && (
                <div className="absolute top-[calc(3rem+env(safe-area-inset-top))] left-[calc(1.5rem+env(safe-area-inset-left))] z-[100] pointer-events-auto flex flex-col items-start gap-2">
                    {/* Logo */}
                    <div className="flex flex-col items-start font-sans drop-shadow-lg">
                        <span className="text-white font-[900] italic text-[24px] tracking-tighter leading-none">
                            YASHUBEATZ<span className="text-[#dc2626]">TV</span>
                        </span>
                        <span className="text-[9px] text-neutral-500 font-mono tracking-[0.2em] uppercase mt-0.5">
                            Broadcast Center
                        </span>
                    </div>

                    {/* Styled Badges Row */}
                    <div className="flex items-center gap-1.5 mt-1">
                        {/* LIVE Badge */}
                        <div className="bg-gradient-to-r from-[#d81b60] to-[#e53935] px-2 py-1 rounded-[4px] shadow-lg">
                            <span className="text-white text-[10px] font-black tracking-wider leading-none uppercase">
                                LIVE
                            </span>
                        </div>

                        {/* Viewer Count Badge */}
                        <div className="bg-[#424242] px-2 py-1 rounded-[4px] flex items-center gap-1.5 shadow-lg">
                            <Eye size={12} className="text-white" strokeWidth={3} />
                            <span className="text-white text-[11px] font-bold leading-none">
                                {viewerCount.toLocaleString()}
                            </span>
                        </div>

                        {/* Notification/Bell Badge (Consistent Style) */}
                        <button
                            onClick={handleSubscribe}
                            disabled={subscribing}
                            className={cn(
                                "px-2 py-1 rounded-[4px] flex items-center justify-center shadow-lg transition-all active:scale-95",
                                permission === 'granted' ? "bg-green-600" : "bg-neutral-700 hover:bg-neutral-600"
                            )}
                        >
                            {subscribing ? (
                                <Loader2 size={12} className="animate-spin text-white" />
                            ) : (
                                permission === 'granted' ? <BellRing size={12} className="text-white" /> : <Bell size={12} className="text-white" />
                            )}
                        </button>

                        {/* Download App Badge */}
                        <a
                            href="/yashubeatztv.apk"
                            download="yashubeatztv.apk"
                            title="Download Mobile App"
                            className="bg-green-600/90 hover:bg-green-500 px-2 py-1 rounded-[4px] flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer active:scale-95"
                        >
                            <Download size={12} className="text-white" strokeWidth={3} />
                            <span className="text-white text-[10px] font-black tracking-wider leading-none uppercase">
                                APP
                            </span>
                        </a>
                    </div>
                </div>
            )}

            <div className={cn(
                "absolute inset-0 transition-opacity duration-1000 pointer-events-none",
                isPoweredOn ? "opacity-100" : "opacity-0"
            )}>
                {/* Direct Video Player - Only mounted when a direct file is playing */}
                {syncState?.mediaType === 'direct' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <video
                            ref={videoRef}
                            autoPlay={false}
                            muted={!isPoweredOn}
                            playsInline
                            onError={onVideoError}
                            className="w-full h-full object-cover filter contrast-[1.02] saturate-[1.08] brightness-[0.98]"
                            onLoadedMetadata={() => {
                                if (syncState?.video?.duration === 0 && videoRef.current) {
                                    const duration = Math.floor(videoRef.current.duration);
                                    if (duration > 0) {
                                        console.log("Auto-Discovery (direct): Found duration:", duration);
                                        supabase.from("channels").update({ duration: duration }).eq("id", "main")
                                            .then(({ error }) => {
                                                if (error) console.error("Auto-Discovery update failed:", error);
                                            });
                                    }
                                }
                            }}
                            onLoadedData={() => {
                                setIsBuffering(false);
                                setShowEndCardCover(false);
                                if (isPoweredOn && syncState?.status === 'playing') {
                                    videoRef.current?.play().catch(e => console.error("Video play failed:", e));
                                    setIsActuallyPlaying(true);
                                }
                            }}
                        />
                    </div>
                )}

                {/* YouTube Player - Only mounted for YouTube content */}
                {syncState?.mediaType === 'youtube' && (
                    <div className={cn(
                        "absolute inset-0 w-full h-full origin-center z-0 pointer-events-none bg-black",
                        (!isActuallyPlaying || isBuffering) && "yt-hidden"
                    )}>
                        <YouTube
                            videoId={initialVideoId.current}
                            opts={playerOpts}
                            className="youtube-player absolute inset-0 w-full h-full"
                            onReady={(e) => { onReady(e); }}
                            onStateChange={onStateChange}
                            onEnd={onEnd}
                            onError={onError}
                            onPlay={() => { }}
                        />
                        {/* Inner cover: hides YouTube's play/pause center icon at state transitions */}
                        <div
                            style={{
                                position: 'absolute', inset: 0, zIndex: 20,
                                background: 'black',
                                pointerEvents: 'none',
                                opacity: isActuallyPlaying ? 0 : 1,
                                // Slightly slower reveal so YouTube center icon is ALWAYS hidden
                                transition: isActuallyPlaying ? 'opacity 1.5s ease' : 'none',
                            }}
                        />
                        {/* Full event blocker — sits over the entire iframe (z-50).
                            Consumes ALL mouse, touch, pointer events silently.
                            No onClick or action — touch screen does nothing. */}
                        <div
                            style={{
                                position: 'absolute', inset: 0, zIndex: 50,
                                background: 'transparent',
                                pointerEvents: 'auto',
                                cursor: 'default',
                                touchAction: 'none',
                                WebkitTouchCallout: 'none',
                                userSelect: 'none',
                            } as React.CSSProperties}
                            onClickCapture={e => e.stopPropagation()}
                            onTouchStartCapture={e => e.stopPropagation()}
                            onTouchEndCapture={e => e.stopPropagation()}
                            onTouchMoveCapture={e => e.stopPropagation()}
                            onMouseDownCapture={e => e.stopPropagation()}
                            onMouseUpCapture={e => e.stopPropagation()}
                            onContextMenu={e => e.preventDefault()}
                        />
                    </div>
                )}
            </div>

            {/* Outer full-screen mask: always in DOM, covers everything before video is confirmed playing.
                 Never conditionally rendered — only opacity changes so there's zero flash gap. */}
            {isPoweredOn && (
                <div
                    style={{
                        position: 'absolute', inset: 0, zIndex: 100,
                        background: 'black',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                        pointerEvents: 'none',
                        opacity: (isActuallyPlaying && !isBuffering && !hasError && !showSyncOverlay) ? 0 : 1,
                        // Fast 0.4s fade-out reveal
                        transition: (isActuallyPlaying && !isBuffering && !hasError && !showSyncOverlay) ? 'opacity 0.4s ease' : 'none',
                    }}
                >
                    {!hasError && (
                        <>
                            <Loader2 className="animate-spin text-red-600/30" size={32} />
                            <span style={{ color: 'rgba(100,100,100,0.8)', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Syncing Satellite...</span>
                        </>
                    )}
                </div>
            )}

            {/* Error / Restricted Fallback */}
            {hasError && isPoweredOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 z-[100] gap-4">
                    <div className="w-20 h-20 rounded-full border-4 border-neutral-700 border-t-red-600 animate-pulse flex items-center justify-center">
                        <AlertCircle className="text-red-600" size={40} />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-mono text-sm uppercase tracking-widest blink">Signal Restricted</p>
                        <p className="text-neutral-500 font-mono text-[10px] uppercase mt-1">
                            {syncState?.mediaType === 'direct' ? "Media Source Unreachable" : "Satellite Handshake Failed"} • Error {errorCode || '150'}
                        </p>
                        <p className="text-red-500/50 font-mono text-[9px] uppercase mt-4">Initiating Signal Re-Route in 6s...</p>
                    </div>
                    <button
                        onClick={() => skipCurrentVideo()}
                        className="mt-4 px-4 py-2 border border-white/20 rounded-full text-[10px] text-white/40 hover:text-white hover:border-white transition-all uppercase tracking-widest font-bold"
                    >
                        Force Manual Re-Route
                    </button>
                </div>
            )}


            {/* End Card Cover — Cinematic Coming Up Next Overlay (self-contained portal) */}
            <ComingUpNextOverlay isPoweredOn={isPoweredOn} />

            {/* Power/Standby UI - Enhanced for Mobile Touch */}
            {
                !isPoweredOn && (
                    <div className="fixed inset-0 w-screen h-screen bg-neutral-900 flex flex-col items-center justify-center z-[9999] px-6">
                        <button
                            id="power-on-btn"
                            autoFocus
                            onClick={togglePower}
                            className="group transition-transform active:scale-95 duration-200 flex flex-col items-center gap-6 focus:outline-none focus:ring-4 focus:ring-red-600 focus:rounded-3xl p-4"
                        >
                            <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-full border-4 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center bg-neutral-800 text-red-600 hover:bg-neutral-700 hover:text-red-500 transition-colors">
                                <Power size={56} className="sm:w-12 sm:h-12" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-white text-lg sm:text-sm font-bold font-mono tracking-widest uppercase">Power On TV</span>
                                <span className="text-neutral-500 text-[10px] font-mono tracking-widest uppercase">Tap to start signal</span>
                            </div>

                            {/* iOS Specific Helper */}
                            <div className="mt-4 px-6 py-3 sm:px-4 sm:py-2 border border-white/10 rounded-full bg-black/40 text-[10px] text-neutral-400 font-mono uppercase tracking-[0.2em] text-center">
                                Required for mobile playback
                            </div>
                        </button>
                    </div>
                )
            }

            {/* Full-screen silent blocker — absorbs ALL clicks, taps, and touch events.
                No action is triggered. Touch screen does nothing. */}
            <div
                className="absolute inset-0 z-[30] bg-transparent pointer-events-auto cursor-default"
                style={{ touchAction: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
                onClickCapture={e => e.stopPropagation()}
                onTouchStartCapture={e => e.stopPropagation()}
                onTouchEndCapture={e => e.stopPropagation()}
                onTouchMoveCapture={e => e.stopPropagation()}
                onMouseDownCapture={e => e.stopPropagation()}
                onContextMenu={e => e.preventDefault()}
            />

            {/* OSD Layer - Now integrated for guaranteed layering */}
            {
                isPoweredOn && (
                    <>
                        <LiveChat />
                        <MarqueeOverlay />
                    </>
                )
            }

            {/* Portals — manage their own visibility via Firestore BUT gated by power state */}
            {isPoweredOn && (
                <>
                    <DedicationOverlay />
                    <CountdownOverlay />
                    <SpotlightOverlay />
                    <PollResultsOverlay />
                    <ReactionsOverlay />
                </>
            )}
            {/* Placed at the very end to guarantee it sits above the player and OSD */}
            <FestivalOverlay isPoweredOn={isPoweredOn} />

            {/* Google AdSense Banner (Web Ads) */}
            {isPoweredOn && (
                <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 sm:left-8 z-[99999] max-w-[280px] sm:max-w-[320px] w-full pointer-events-auto">
                    <AdBanner adSlot="6300978111" />
                </div>
            )}
        </div >
    );
}
