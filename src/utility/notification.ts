import { getToken, onMessage, type MessagePayload, type Unsubscribe } from "firebase/messaging";
import { getMessagingInstance } from "../firebase";

export interface ReceivedNotification {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  type: "foreground" | "background" | "local" | "simulated";
  data?: Record<string, any>;
  icon?: string;
}

export interface PermissionResult {
  token: string | null;
  permission: NotificationPermission;
  error?: string;
}

/**
 * Register the Firebase Cloud Messaging Service Worker with current credentials passed as query params
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("Service Workers are not supported in this browser.");
    return null;
  }

  try {
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    });

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params.toString()}`,
      { scope: "/" }
    );

    // Wait until the service worker is active/ready
    await navigator.serviceWorker.ready;
    console.log("✅ Service Worker active and registered with scope:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
};

/**
 * Check if notifications and service workers are supported
 */
export const isPushSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
};

/**
 * Request notification permission and retrieve the FCM device token
 */
export const requestNotificationPermission = async (): Promise<PermissionResult> => {
  if (!isPushSupported()) {
    return {
      token: null,
      permission: "denied",
      error: "Push notifications are not supported in this browser.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        token: null,
        permission,
        error: "Notification permission was denied or dismissed.",
      };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      return {
        token: null,
        permission,
        error: "Firebase Messaging is not supported or failed to initialize.",
      };
    }

    const swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      return {
        token: null,
        permission,
        error: "Could not register service worker.",
      };
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return {
        token: null,
        permission,
        error: "VITE_FIREBASE_VAPID_KEY is missing in your .env configuration.",
      };
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return {
        token: null,
        permission,
        error: "No FCM registration token returned from Firebase.",
      };
    }

    console.log("🔥 FCM Token:", token);
    return { token, permission };
  } catch (error: any) {
    console.error("FCM Token Error:", error);
    return {
      token: null,
      permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
      error: error?.message || "Failed to retrieve Firebase FCM token.",
    };
  }
};

/**
 * Subscribe to foreground messages from Firebase Messaging
 */
export const subscribeToForegroundMessages = async (
  onPayload: (payload: MessagePayload) => void
): Promise<Unsubscribe | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📨 Foreground FCM message received:", payload);
      onPayload(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Failed to subscribe to foreground messages:", error);
    return null;
  }
};

/**
 * Display a test browser system notification directly
 */
export const triggerLocalNotification = async (
  title: string = "Test Local Notification",
  options?: NotificationOptions
): Promise<boolean> => {
  if (!isPushSupported()) {
    alert("Notifications are not supported in this browser.");
    return false;
  }

  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("Notification permission is not granted. Please enable notifications in your browser.");
      return false;
    }
  }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: options?.body || "This is a local test notification verifying system delivery.",
        icon: options?.icon || "/favicon.svg",
        badge: "/favicon.svg",
        ...options,
      });
      return true;
    } else {
      new Notification(title, {
        body: options?.body || "This is a local test notification.",
        icon: options?.icon || "/favicon.svg",
        ...options,
      });
      return true;
    }
  } catch (err) {
    console.error("Error triggering local notification:", err);
    return false;
  }
};