import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messagingPromise: Promise<Messaging | null> | null = null;

export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === "undefined") return null;

  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => {
        if (supported) {
          return getMessaging(app);
        }
        console.warn("Firebase Cloud Messaging is not supported in this browser environment.");
        return null;
      })
      .catch((error) => {
        console.error("Error checking FCM support:", error);
        return null;
      });
  }

  return messagingPromise;
};