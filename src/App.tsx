import { useEffect, useState, useCallback } from "react";
import {
  requestNotificationPermission,
  triggerLocalNotification,
  registerServiceWorker,
  isPushSupported,
  type ReceivedNotification,
} from "./utility/notification";
import NotificationListener from "./utility/NotificationListener";
import NotificationToast from "./components/NotificationToast";
import "./App.css";

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("app_theme");
    return (saved as "dark" | "light") || "dark";
  });

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ReceivedNotification[]>([]);
  const [activeToast, setActiveToast] = useState<ReceivedNotification | null>(null);

  // Toggle theme between dark and light
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("app_theme", nextTheme);
  };

  // Handle incoming notification
  const handleIncomingNotification = useCallback((notification: ReceivedNotification) => {
    setNotifications((prev) => [notification, ...prev]);
    setActiveToast(notification);

    setTimeout(() => {
      setActiveToast((current) => (current?.id === notification.id ? null : current));
    }, 5000);
  }, []);

  // Initialize service worker and fetch token if already granted
  useEffect(() => {
    if (!isPushSupported()) return;

    const init = async () => {
      try {
        await registerServiceWorker();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const res = await requestNotificationPermission();
          if (res.token) {
            setFcmToken(res.token);
            setPermission(res.permission);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    init();
  }, []);

  // Request notification permission and obtain FCM token
  const handleEnableNotifications = async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setPermission(result.permission);

    if (result.token) {
      setFcmToken(result.token);
      handleIncomingNotification({
        id: `welcome-${Date.now()}`,
        title: "Push Notifications Enabled! 🎉",
        body: "Your device is registered to receive FCM push notifications.",
        receivedAt: new Date().toLocaleTimeString(),
        type: "local",
      });
    }
    setLoading(false);
  };

  // Copy FCM token
  const handleCopyToken = () => {
    if (!fcmToken) return;
    navigator.clipboard.writeText(fcmToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send a test notification (via Backend Server if available, or locally)
  const handleSendTest = async () => {
    let sentViaBackend = false;

    if (fcmToken) {
      try {
        const response = await fetch("http://localhost:5000/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: fcmToken,
            title: "Push from Backend API",
            body: "This message was dispatched via Node.js Express server.",
          }),
        });

        const data = await response.json();
        if (data.success) {
          sentViaBackend = true;
          console.log("Dispatched via backend:", data);
        }
      } catch (e) {
        console.log("Backend not running or request skipped, using local fallback:", e);
      }
    }

    if (!sentViaBackend) {
      if (permission === "granted") {
        await triggerLocalNotification("Test Push Notification 🔔", {
          body: "This is a test notification verifying system delivery.",
          icon: "/favicon.svg",
        });
      }
      handleIncomingNotification({
        id: `test-${Date.now()}`,
        title: "Test Push Notification 🔔",
        body: "This is a test notification verifying system delivery.",
        receivedAt: new Date().toLocaleTimeString(),
        type: "simulated",
      });
    }
  };

  // Clear notifications
  const handleClear = () => {
    setNotifications([]);
  };

  return (
    <div className={`app-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      {/* Background listener */}
      <NotificationListener onNotificationReceived={handleIncomingNotification} />

      {/* Foreground popup toast */}
      <NotificationToast notification={activeToast} onClose={() => setActiveToast(null)} />

      <div className="container">
        {/* Navigation / Header */}
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">Notifications</h1>
              <p className="header-subtitle">Real-time FCM Push Messages</p>
            </div>
          </div>

          <div className="header-actions">
            {/* Theme Toggle Button */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Black"} Theme`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>White Theme</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>Black Theme</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Top Control Strip */}
        <div className="control-strip">
          <div className="status-pill">
            <span className={`status-dot ${permission === "granted" ? "dot-active" : "dot-inactive"}`} />
            <span>
              Status: <strong>{permission === "granted" ? "Connected" : "Not Permitted"}</strong>
            </span>
          </div>

          <div className="control-buttons">
            {permission !== "granted" ? (
              <button
                className="btn btn-primary"
                onClick={handleEnableNotifications}
                disabled={loading}
              >
                {loading ? "Enabling..." : "Enable Push Notifications"}
              </button>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleCopyToken}
                  disabled={!fcmToken}
                  title="Copy FCM Device Token"
                >
                  {copied ? "✓ Token Copied" : "Copy Device Token"}
                </button>
                <button className="btn btn-outline" onClick={handleSendTest}>
                  Send Test Notification
                </button>
              </>
            )}
          </div>
        </div>

        {/* The Received Notifications Box */}
        <main className="notification-box-card">
          <div className="box-header">
            <div className="box-header-left">
              <h2 className="box-title">Received Notifications</h2>
              <span className="count-badge">{notifications.length}</span>
            </div>
            {notifications.length > 0 && (
              <button className="btn-clear" onClick={handleClear}>
                Clear All
              </button>
            )}
          </div>

          <div className="box-content">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-circle">
                  <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" fill="none" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h3 className="empty-title">No notifications yet</h3>
                <p className="empty-desc">
                  Incoming foreground and background push messages will appear here in real time.
                </p>
                {permission === "granted" ? (
                  <button className="btn btn-outline empty-btn" onClick={handleSendTest}>
                    Send Sample Notification
                  </button>
                ) : (
                  <button className="btn btn-primary empty-btn" onClick={handleEnableNotifications} disabled={loading}>
                    Enable Notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((item) => (
                  <div key={item.id} className="notification-item">
                    <div className="item-icon-wrapper">
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>

                    <div className="item-details">
                      <div className="item-header">
                        <h4 className="item-title">{item.title}</h4>
                        <span className="item-time">{item.receivedAt}</span>
                      </div>
                      <p className="item-body">{item.body}</p>

                      {item.data && Object.keys(item.data).length > 0 && (
                        <div className="item-payload">
                          <pre>{JSON.stringify(item.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;