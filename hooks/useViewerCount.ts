"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useViewerCount(isPoweredOn: boolean) {
    const [viewerCount, setViewerCount] = useState<number>(1); // Default to at least 1 (self)

    useEffect(() => {
        if (!isPoweredOn) return;

        // 1. Get or create a session ID
        let sessionId: string | null = null;
        try {
            sessionId = sessionStorage.getItem('tv_session_id');
            if (!sessionId) {
                sessionId = Math.random().toString(36).substring(2, 15);
                sessionStorage.setItem('tv_session_id', sessionId);
            }
        } catch (e) {
            console.warn("sessionStorage unavailable, using transient session ID");
            sessionId = Math.random().toString(36).substring(2, 15);
        }

        const room = supabase.channel('online-viewers', {
            config: {
                presence: {
                    key: sessionId,
                },
            },
        });

        room.on('presence', { event: 'sync' }, () => {
            const newState = room.presenceState();
            const count = Object.keys(newState).length;
            setViewerCount(Math.max(1, count));
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await room.track({ online_at: new Date().toISOString() });
            }
        });

        // Cleanup on Unmount
        return () => {
            supabase.removeChannel(room);
        };
    }, [isPoweredOn]);

    return viewerCount;
}
