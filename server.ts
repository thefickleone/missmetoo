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

    const modelCandidates = [
      "google/gemini-2.5-flash",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3-8b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3.1-8b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "meta-llama/llama-3-8b-instruct:free",
      "qwen/qwen-2.5-7b-instruct:free"
    ];

    let response: any = null;
    let lastErrorText = "";
    let chosenModel = "";

    for (const model of modelCandidates) {
      console.log(`Attempting to generate color using model: ${model}`);
      try {
        const resObj = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "The Secret Gateway"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: "You are a CSS color generator. Read the user's text, analyze its emotional tone, and return ONLY a valid CSS linear-gradient string using dark, cinematic hex codes (e.g., linear-gradient(to bottom right, #1e3a8a, #000000)). Do not output any other text or markdown."
              },
              {
                role: "user",
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 150
          })
        });

        if (resObj.ok) {
          response = resObj;
          chosenModel = model;
          console.log(`Successfully completed generation with model: ${model}`);
          break;
        } else {
          lastErrorText = await resObj.text();
          console.warn(`Model ${model} failed with status ${resObj.status}: ${lastErrorText}`);
        }
      } catch (fetchErr: any) {
        lastErrorText = fetchErr?.message || String(fetchErr);
        console.warn(`Failed to connect using model ${model}:`, fetchErr);
      }
    }

    let gradient = "";

    if (!response) {
      console.warn("All candidate OpenRouter models failed. Applying beautiful cinematic fallback gradient.");
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
    } else {
      const data: any = await response.json();
      let content = data?.choices?.[0]?.message?.content?.trim();
      
      if (!content) {
        console.warn(`Empty reply from model ${chosenModel}. Applying cinematic fallback gradient.`);
        const FALLBACK_GRADIENTS = [
          "linear-gradient(to bottom right, #0d0a1c, #1f1a3a, #0b0714)",
          "linear-gradient(to bottom right, #09151c, #142834, #050d12)"
        ];
        gradient = FALLBACK_GRADIENTS[message.length % FALLBACK_GRADIENTS.length];
      } else {
        // Strip potential Markdown blocks e.g. ```css linear-gradient(...) ```
        gradient = content;
        if (gradient.includes("`")) {
          gradient = gradient.replace(/```css/gi, "").replace(/```/g, "").replace(/`/g, "");
        }
        gradient = gradient.trim();

        // Ensure trailing semicolon is clean
        if (gradient.endsWith(";")) {
          gradient = gradient.slice(0, -1);
        }
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
                title: "✨ A new thought arrived",
                body: message
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

    return res.json({ gradient });
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
