// public/firebase-messaging-sw.js

// Import Firebase App and Messaging SDK's Compat versions (standard practice in SW context)
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker scope
firebase.initializeApp({
  apiKey: "AIzaSyA40UiX-MJqa85db5wPLz5DrrKZnCjLTTg",
  authDomain: "missmetoo-39082.firebaseapp.com",
  projectId: "missmetoo-39082",
  storageBucket: "missmetoo-39082.firebasestorage.app",
  messagingSenderId: "495217081378",
  appId: "1:495217081378:web:4bb664bcae927ce6c41e7b"
});

const messaging = firebase.messaging();

// Handle background messages silently on target client OS instances
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Silent background notification encountered:', payload);
  
  const notificationTitle = payload.notification?.title || '✨ A new thought arrived';
  const notificationOptions = {
    body: payload.notification?.body || 'Connection has been populated with resonance.',
    icon: '/icon.png',
    tag: 'frequency-thought-link',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
