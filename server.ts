import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const TOKENS_FILE = path.join(process.cwd(), "tokens.json");
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), "firebase-service-account.json");

// Helper to safely read current persisted device tokens
function readTokens(): Record<string, string> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading tokens.json:", err);
  }
  return {};
}

// Helper to write/persist a device token for a password association
function writeToken(password: string, token: string) {
  try {
    const tokens = readTokens();
    tokens[password] = token;
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
    console.log(`FCM Token registered and persisted for user "${password}"`);
  } catch (err) {
    console.error("Error writing token to tokens.json:", err);
  }
}

// Lazy-initialized Firebase Admin instance to check for file-existence safely
let adminApp: admin.app.App | null = null;
function getFirebaseAdmin(): admin.app.App | null {
  if (!adminApp) {
    if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, "utf8"));
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully from service account file.");
      } catch (err) {
        console.error("Failed to parse firebase-service-account.json:", err);
      }
    } else {
      console.warn("firebase-service-account.json was not found in root. Notifications will handle gracefully as offline/active.");
    }
  }
  return adminApp;
}

const app = express();
app.use(express.json());

// API Route: Register Device FCM Token mapped to user frequency password
app.post("/api/register-device", (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || !token) {
      return res.status(400).json({ error: "Password and token are required." });
    }

    const cleanPassword = password.trim().toLowerCase();
    if (cleanPassword !== "milanlovesroja" && cleanPassword !== "rojalovesmilan") {
      return res.status(400).json({ error: "Invalid login frequency." });
    }

    writeToken(cleanPassword, token);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Error in /api/register-device:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API Route: /api/mood (Securely proxies to OpenRouter)
app.post("/api/mood", async (req, res) => {
  try {
    const { message, password } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not defined in environment variables.");
      return res.status(500).json({ error: "API key configuration missing on server." });
    }

    console.log(`Sending prompt: "${message.substring(0, 50)}..." to OpenRouter`);

    let response: any = null;
    let lastErrorText = "";
    
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resObj = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "Our Space"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "You are an AI generating elements for a minimal, private communication channel. Read the user's text and analyze its emotional tone. You MUST return ONLY a strict JSON object with EXACTLY three string properties, no markdown wrappers:\n1. \"gradient\": A valid CSS linear-gradient string using dark, cinematic hex codes (e.g., \"linear-gradient(to bottom right, #1e3a8a, #000000)\").\n2. \"senderResponse\": A beautiful, comforting, short poetic phrase or grounding thought intended ONLY for the person who typed the message. (e.g., \"Your thought is held in the dark.\")\n3. \"stealthNotification\": A highly formal, completely sterile disguise of the message to be used for a push notification. It must sound like a boring corporate alert, app system log, or generic device notification (e.g., 'System synchronization log update #402 complete' or 'Workspace event log: Routine check pending'). It must contain absolutely no romance, emotion, or names."
              },
              {
                role: "user",
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 200
          })
        });

        if (resObj.ok) {
          response = resObj;
          console.log(`Successfully completed generation with openrouter/free`);
          break; // success, escape retry loop
        } else {
          lastErrorText = await resObj.text();
          if (resObj.status === 429 && attempt < MAX_RETRIES) {
            const delayMs = Math.pow(2, attempt) * 1500; // 1.5s, 3s
            console.log(`OpenRouter rate limited (429). Retrying in ${delayMs}ms...`);
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }
          console.warn(`Model openrouter/free failed (Status ${resObj.status}): ${lastErrorText}`);
          break;
        }
      } catch (fetchErr: any) {
        lastErrorText = fetchErr?.message || String(fetchErr);
        if (attempt < MAX_RETRIES) {
          const delayMs = Math.pow(2, attempt) * 1500;
          console.warn(`Fetch structural error. Retrying in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        console.warn(`Failed to connect using model openrouter/free completely.`, fetchErr);
        break;
      }
    }

    let gradient = "";
    let senderResponse = "";
    let stealthNotification = "";

    if (!response) {
      console.log("API unavailable. Gently falling back to local cinematic gradients.");
      const FALLBACK_GRADIENTS = [
        "linear-gradient(to bottom right, #0d0a1c, #1f1a3a, #0b0714)",
        "linear-gradient(to bottom right, #09151c, #142834, #050d12)",
        "linear-gradient(to bottom right, #1a0e0e, #3a1c1c, #0d0505)",
        "linear-gradient(to bottom right, #0c1a14, #1a3a2e, #060d0a)",
        "linear-gradient(to bottom right, #111116, #222230, #0a0a0c)",
        "linear-gradient(to bottom right, #140d1a, #2b1f3c, #0a060d)"
      ];
      let hash = 0;
      for (let i = 0; i < message.length; i++) {
        hash = message.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % FALLBACK_GRADIENTS.length;
      gradient = FALLBACK_GRADIENTS[index];
      senderResponse = "The transmission faded, but the intention remains.";
      stealthNotification = "System Status: Minor connectivity packet dropped.";
    } else {
      const data: any = await response.json();
      let content = data?.choices?.[0]?.message?.content?.trim() || "{}";
      
      try {
        if (content.includes("`")) {
          content = content.replace(/```json/gi, "").replace(/```/g, "").replace(/`/g, "");
        }
        const parsed = JSON.parse(content);
        gradient = parsed.gradient || "linear-gradient(to bottom right, #0d0a1c, #1f1a3a, #0b0714)";
        senderResponse = parsed.senderResponse || "Your thought is held safely.";
        stealthNotification = parsed.stealthNotification || "System Status: Log updated.";
      } catch (e) {
        gradient = "linear-gradient(to bottom right, #0d0a1c, #1f1a3a, #0b0714)";
        senderResponse = "Your thought is held safely.";
        stealthNotification = "System Status: Log updated.";
      }

      // Ensure trailing semicolon is clean
      if (gradient.endsWith(";")) {
        gradient = gradient.slice(0, -1);
      }
    }

    console.log(`Extracted valid CSS Gradient string: "${gradient}"`);

    // Fire-and-forget: Push Notification to the partner device asynchronously
    if (password) {
      const cleanPassword = password.trim().toLowerCase();
      let partnerPassword = "";
      if (cleanPassword === "milanlovesroja") {
        partnerPassword = "rojalovesmilan";
      } else if (cleanPassword === "rojalovesmilan") {
        partnerPassword = "milanlovesroja";
      }

      if (partnerPassword) {
        const tokens = readTokens();
        const partnerToken = tokens[partnerPassword];
        if (partnerToken) {
          const firebaseAdmin = getFirebaseAdmin();
          if (firebaseAdmin) {
            const payload = {
              notification: {
                title: "System Notification",
                body: stealthNotification
              },
              token: partnerToken
            };

            // Send the message
            firebaseAdmin.messaging().send(payload)
              .then((msgResponse) => {
                console.log("FCM Background notification dispatched safely to active partner:", msgResponse);
              })
              .catch((pushErr) => {
                console.error("Failed to route notification via Firebase admin messaging:", pushErr);
              });
          } else {
            console.log("Push dispatch bypassed: Firebase admin is not initialized (missing local key file).");
          }
        } else {
          console.log(`No registered token found for partner: "${partnerPassword}"`);
        }
      }
    }

    return res.json({ gradient, senderResponse });
  } catch (error: any) {
    console.error("Error in /api/mood route:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Serve static elements conditionally if running local Node server instead of serverless functions
if (process.env.VERCEL) {
  console.log("Running in Vercel. Listener handled serverless.");
} else {
  // Local environment setup
  async function startLocalServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Serve static frontend assets in production build
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
  startLocalServer();
}

export default app;
