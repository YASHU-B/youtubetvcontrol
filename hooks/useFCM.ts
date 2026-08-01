import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface BroadcastNotification {
    title: string;
    body: string;
    receivedAt: number;
}

export function useFCM() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [activeNotification, setActiveNotification] = useState<BroadcastNotification | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const supported = "Notification" in window;
            setIsSupported(supported);
            if (supported) {
                setPermission(Notification.permission);
                if (Notification.permission === "granted") {
                    setFcmToken("supabase-realtime-token");
                }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Join the realtime broadcast channel
        const channel = supabase.channel("broadcast-notifications");

        channel
            .on("broadcast", { event: "notification" }, (payload) => {
                const { title, body } = payload.payload || {};
                if (!title || !body) return;

                // 1. Show native browser notification if granted
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                    try {
                        new Notification(title, {
                            body,
                            icon: "/favicon.ico",
                        });
                    } catch (e) {
                        console.error("Error displaying native notification:", e);
                    }
                }

                // 2. Set active notification for client-side custom Toast UI
                setActiveNotification({
                    title,
                    body,
                    receivedAt: Date.now(),
                });
            })
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    // Track this device's presence
                    channel.track({
                        online_at: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const requestPermission = async () => {
        if (!isSupported) {
            console.warn("Notifications are not supported in this browser.");
            return false;
        }

        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === "granted") {
                setFcmToken("supabase-realtime-token");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    };

    return {
        permission,
        requestPermission,
        isSupported,
        fcmToken,
        activeNotification,
        setActiveNotification,
    };
}
