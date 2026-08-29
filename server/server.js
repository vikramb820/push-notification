import express from "express";
import cors from "cors";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
let isFirebaseInitialized = false;

try {
  const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

  if (getApps().length === 0) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
      initializeApp({
        credential: cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log("✅ Firebase Admin authenticated successfully with serviceAccountKey.json");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log("✅ Firebase Admin authenticated with FIREBASE_SERVICE_ACCOUNT env variable");
    } else {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "react-push-notification-a0de9";
      initializeApp({
        projectId,
      });
      isFirebaseInitialized = true;
      console.log(`⚠️ Initialized with project ID: ${projectId}`);
    }
  } else {
    isFirebaseInitialized = true;
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error);
}

/**
 * Health Check & Status Endpoint
 */
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    firebaseAdminReady: isFirebaseInitialized,
    timestamp: new Date().toISOString(),
    message: "Backend push notification server is running.",
  });
});

/**
 * Send Push Notification to Single Device Token
 * POST /api/send-notification
 * Body: { token: string, title: string, body: string, data?: object, icon?: string, url?: string }
 */
app.post("/api/send-notification", async (req, res) => {
  const { token, title, body, data, icon, url } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: 'token' (FCM device registration token).",
    });
  }

  const notificationTitle = title || "Notification from Server";
  const notificationBody = body || "You received a new push notification.";

  const message = {
    token,
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    data: {
      ...(data || {}),
      url: url || "http://localhost:5173",
      timestamp: String(Date.now()),
    },
    webpush: {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        icon: icon || "/favicon.svg",
        badge: "/favicon.svg",
      },
      fcmOptions: {
        link: url || "http://localhost:5173",
      },
    },
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.send(message);
    console.log(`🚀 Notification dispatched successfully [ID: ${response}]`);
    return res.json({
      success: true,
      messageId: response,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error dispatching FCM notification:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send FCM notification.",
      code: error.code || "UNKNOWN_ERROR",
    });
  }
});

/**
 * Send Push Notification to Multiple Device Tokens
 * POST /api/send-multicast
 * Body: { tokens: string[], title: string, body: string, data?: object }
 */
app.post("/api/send-multicast", async (req, res) => {
  const { tokens, title, body, data } = req.body;

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid parameter: 'tokens' must be a non-empty array.",
    });
  }

  const message = {
    tokens,
    notification: {
      title: title || "Broadcast Notification",
      body: body || "You have a new broadcast message.",
    },
    data: {
      ...(data || {}),
      timestamp: String(Date.now()),
    },
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(message);
    console.log(`🚀 Multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);
    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    });
  } catch (error) {
    console.error("❌ Error sending multicast:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Send Push Notification to Topic
 * POST /api/send-topic
 * Body: { topic: string, title: string, body: string, data?: object }
 */
app.post("/api/send-topic", async (req, res) => {
  const { topic, title, body, data } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: 'topic'.",
    });
  }

  const message = {
    topic,
    notification: {
      title: title || "Topic Notification",
      body: body || "Message sent to topic subscribers.",
    },
    data: data || {},
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.send(message);
    console.log(`🚀 Topic message sent to '${topic}':`, response);
    return res.json({
      success: true,
      messageId: response,
      topic,
    });
  } catch (error) {
    console.error("❌ Error sending topic message:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🔥 FCM Push Notification Server running`);
  console.log(`📍 Endpoint: http://localhost:${PORT}`);
  console.log(`📡 Send API: POST http://localhost:${PORT}/api/send-notification`);
  console.log(`=========================================`);
});
