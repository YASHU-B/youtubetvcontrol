/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyC8VgnHR-CiwHRbRiqO2RD90xPHP8jxLag",
    authDomain: "tv-control-2026.firebaseapp.com",
    projectId: "youtube-tv-control-2026",
    storageBucket: "youtube-tv-control-2026.firebasestorage.app",
    messagingSenderId: "481630901436",
    appId: "1:481630901436:web:0bf8fddc323316ca52ecb9"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/file.svg' // Using an existing icon from public/
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
