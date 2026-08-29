import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log("✅ Authenticated with server/serviceAccountKey.json");
} else {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "react-push-notification-a0de9";
  initializeApp({
    projectId,
  });
  console.log(`⚠️ Using project ID: ${projectId}. For full auth, download serviceAccountKey.json.`);
}

// 2. Read arguments from CLI
const args = process.argv.slice(2);
const targetToken = args[0] || process.env.TEST_FCM_TOKEN;
const title = args[1] || "Hello from Backend Server! 🚀";
const body = args[2] || "This push notification was sent directly from the Node.js backend.";

if (!targetToken) {
  console.error("\n❌ Error: Please provide an FCM device token.");
  console.log("\nUsage:");
  console.log("  node server/send-test.js <YOUR_FCM_DEVICE_TOKEN> \"Notification Title\" \"Notification Body\"");
  console.log("  or npm run send -- <YOUR_FCM_DEVICE_TOKEN>\n");
  process.exit(1);
}

const message = {
  token: targetToken,
  notification: {
    title,
    body,
  },
  data: {
    source: "backend-cli",
    timestamp: new Date().toISOString(),
    url: "http://localhost:5173",
  },
  webpush: {
    notification: {
      title,
      body,
      icon: "/favicon.svg",
    },
    fcmOptions: {
      link: "http://localhost:5173",
    },
  },
};

console.log(`\n📡 Dispatching notification to token: ${targetToken.substring(0, 20)}...`);
console.log(`📝 Title: "${title}"`);
console.log(`💬 Body:  "${body}"\n`);

getMessaging()
  .send(message)
  .then((response) => {
    console.log("🎉 SUCCESS! Notification sent with Message ID:", response);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to send notification:", error.message);
    if (error.code) console.error("Error Code:", error.code);
    process.exit(1);
  });
