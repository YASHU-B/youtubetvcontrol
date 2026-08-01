import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyC8VgnHR-CiwHRbRiqO2RD90xPHP8jxLag",
    authDomain: "tv-control-2026.firebaseapp.com",
    projectId: "youtube-tv-control-2026",
    storageBucket: "youtube-tv-control-2026.firebasestorage.app",
    messagingSenderId: "481630901436",
    appId: "1:481630901436:web:0bf8fddc323316ca52ecb9"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Messaging is only supported in the browser (and HTTPS / localhost)
let messaging: any = null;
if (typeof window !== "undefined") {
    import("firebase/messaging").then(({ getMessaging }) => {
        try {
            messaging = getMessaging(app);
        } catch (err) {
            console.error("Firebase Messaging failed to initialize:", err);
        }
    });
}

export { app, messaging };
