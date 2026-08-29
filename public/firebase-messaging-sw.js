// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here if you load the compatible libraries.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Parse config from URL search parameters if passed during registration, or use defaults
const urlParams = new URL(location.href).searchParams;

const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || 'AIzaSyCCGfXIeFd0SP14ImpdBWeIFzT4R9MMAmw',
  authDomain: urlParams.get('authDomain') || 'react-push-notification-a0de9.firebaseapp.com',
  projectId: urlParams.get('projectId') || 'react-push-notification-a0de9',
  storageBucket: urlParams.get('storageBucket') || 'react-push-notification-a0de9.firebasestorage.app',
  messagingSenderId: urlParams.get('messagingSenderId') || '500727431721',
  appId: urlParams.get('appId') || '1:500727431721:web:5cc026a2c75f657e691238',
};

// Initialize Firebase in Service Worker
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle =
      payload.notification?.title ||
      payload.data?.title ||
      'New Push Notification';

    const notificationOptions = {
      body:
        payload.notification?.body ||
        payload.data?.body ||
        'You received a new background message.',
      icon: payload.notification?.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: payload.data?.tag || 'fcm-push-notification',
      data: {
        ...payload.data,
        receivedAt: new Date().toISOString(),
        url: payload.data?.url || payload.fcmOptions?.link || '/',
      },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.error('[firebase-messaging-sw.js] Firebase initialization error:', err);
}

// Notification click event handler - opens or focuses client tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});