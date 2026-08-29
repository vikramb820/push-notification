import { useEffect } from "react";
import { subscribeToForegroundMessages, type ReceivedNotification } from "./notification";
import type { MessagePayload } from "firebase/messaging";

interface NotificationListenerProps {
  onNotificationReceived?: (notification: ReceivedNotification) => void;
}

export function NotificationListener({ onNotificationReceived }: NotificationListenerProps) {
  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;

    const initListener = async () => {
      const unsub = await subscribeToForegroundMessages((payload: MessagePayload) => {
        const title = payload.notification?.title || payload.data?.title || "New Push Notification";
        const body = payload.notification?.body || payload.data?.body || "You have a new message.";
        const icon = payload.notification?.icon || "/favicon.svg";

        const newNotification: ReceivedNotification = {
          id: payload.messageId || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          body,
          icon,
          receivedAt: new Date().toLocaleTimeString(),
          type: "foreground",
          data: payload.data,
        };

        // Notify parent handler
        if (onNotificationReceived) {
          onNotificationReceived(newNotification);
        }

        // Trigger native notification if document is hidden or backgrounded
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(title, {
              body,
              icon,
            });
          } catch (e) {
            console.warn("Could not display native notification from foreground listener:", e);
          }
        }
      });

      if (unsub) {
        unsubscribeFn = unsub;
      }
    };

    initListener();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [onNotificationReceived]);

  return null;
}

export default NotificationListener;
