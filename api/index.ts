import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

// Lazy-initialized Firebase Admin instance
let adminApp: admin.app.App | null = null;
function getFirebaseAdmin(): admin.app.App | null {
  if (!adminApp) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully from env var.");
      } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not found in env. Notifications will handle gracefully as offline/active.");
      }
    } catch (err) {
      console.error("Failed to parse firebase credentials:", err);
    }
  }
  return adminApp;
}

// Helper to safely read current persisted device tokens from Firestore
async function readTokens(): Promise<Record<string, string>> {
  try {
    const app = getFirebaseAdmin();
    if (app) {
      const snapshot = await app.firestore().collection("device_tokens").get();
      const tokens: Record<string, string> = {};
      snapshot.forEach(doc => {
        tokens[doc.id] = doc.data().token;
      });
      return tokens;
    }
  } catch (err) {
    console.error("Error reading tokens from Firestore:", err);
  }
  return {};
}

// Helper to write/persist a device token for a password association to Firestore
async function writeToken(password: string, token: string) {
  try {
    const app = getFirebaseAdmin();
    if (app) {
      await app.firestore().collection("device_tokens").doc(password).set({ token });
      console.log(`FCM Token registered and persisted for user "${password}" in Firestore`);
    } else {
      console.warn("Bypassed token write: Firebase admin not initialized.");
    }
  } catch (err) {
    console.error("Error writing token to Firestore:", err);
  }
}

const app = express();
app.use(express.json());

// Stateless Vercel Routing & CORS headers for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// API Route: Register Device FCM Token mapped to user frequency password
app.post("/api/register-device", async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || !token) {
      return res.status(400).json({ error: "Password and token are required." });
    }

    const cleanPassword = password.trim().toLowerCase();
    if (cleanPassword !== "milanlovesroja" && cleanPassword !== "rojalovesmilan") {
      return res.status(400).json({ error: "Invalid login frequency." });
    }

    await writeToken(cleanPassword, token);
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

    const _geminiKey = process.env.GEMINI_API_KEY;
    const _openrouterKey = process.env.OPENROUTER_API_KEY;
    const apiKey = _geminiKey || _openrouterKey;
    if (!apiKey) {
      console.error("API key is not defined in environment variables.");
      return res.status(500).json({ error: "API key configuration missing on server." });
    }

    console.log(`Generating response for: "${message.substring(0, 50)}..."`);

    let response: any = null;
    let lastErrorText = "";
    
    let gradient = "";
    let senderResponse = "";
    let stealthNotification = "";
    
    // We try Google Gemini GenAI first since it's native and stable
    if (_geminiKey) {
      const MAX_GEMINI_RETRIES = 2;
      for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt++) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: _geminiKey });
          const prompt = `You are an AI generating elements for a minimal, private communication channel. Read the user's text and analyze its emotional tone. You MUST return ONLY a strict JSON object with EXACTLY three string properties, no markdown wrappers:
1. "gradient": A valid CSS linear-gradient string using dark, cinematic hex codes (e.g., "linear-gradient(to bottom right, #1e3a8a, #000000)").
2. "senderResponse": A beautiful, comforting, short poetic phrase or grounding thought intended ONLY for the person who typed the message. (e.g., "Your thought is held in the dark.")
3. "stealthNotification": A highly formal, completely sterile disguise of the message to be used for a push notification. It must sound like a boring corporate alert, app system log, or generic device notification (e.g., 'System synchronization log update #402 complete' or 'Workspace event log: Routine check pending'). It must contain absolutely no romance, emotion, or names.

Message: "${message}"`;

          const genResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.7
            }
          });
          console.log(`Successfully completed generation with Gemini 2.5 Flash`);
          const dataText = genResponse.text;
          if (dataText) {
             response = {
               json: async () => ({
                 choices: [
                   { message: { content: dataText } }
                 ]
               })
             };
          }
          break; // Success
        } catch (err: any) {
          console.warn(`Gemini generation attempt ${attempt + 1} failed: `, err.message || err);
          if (attempt < MAX_GEMINI_RETRIES) {
            const delayMs = Math.pow(2, attempt) * 1500;
            console.log(`Retrying Gemini in ${delayMs}ms...`);
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
    }

    // Fallback to OpenRouter if Gemini failed, or if purely OpenRouter was provided
    if (!response && _openrouterKey) {
      console.log("Using OpenRouter fallback...");
      const MAX_RETRIES = 2;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const resObj = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${_openrouterKey}`,
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
            console.log(`Successfully completed generation with OpenRouter Mistral 7B`);
            break;
          } else {
            lastErrorText = await resObj.text();
            if (resObj.status === 429 && attempt < MAX_RETRIES) {
              const delayMs = Math.pow(2, attempt) * 1500;
              console.log(`OpenRouter rate limited (429). Retrying in ${delayMs}ms...`);
              await new Promise(r => setTimeout(r, delayMs));
              continue;
            }
            console.warn(`Model OpenRouter failed (Status ${resObj.status}): ${lastErrorText}`);
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
          console.warn(`Failed to connect using OpenRouter completely.`, fetchErr);
          break;
        }
      }
    }

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
        const firebaseAdmin = getFirebaseAdmin();
        if (firebaseAdmin) {
          // Write the RAW message to Firestore 24-Hour Archive
          firebaseAdmin.firestore().collection("messages").add({
            sender: cleanPassword,
            receiver: partnerPassword,
            text: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          }).catch(err => console.error("Failed to archive message:", err));
        }

        const tokens = await readTokens();
        const partnerToken = tokens[partnerPassword];
        if (partnerToken) {
          if (firebaseAdmin) {
            const payload = {
              data: {
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

// API Route: Echoes History (24-Hour Archive)
app.get("/api/history", async (req, res) => {
  try {
    const { password } = req.query;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "Password is required." });
    }

    const cleanPassword = password.trim().toLowerCase();
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      return res.json([]);
    }

    const snapshot = await firebaseAdmin.firestore().collection("messages")
      .where("receiver", "==", cleanPassword)
      .get();

    const now = Date.now();
    const echoes: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.timestamp) {
        const ts = data.timestamp.toDate ? data.timestamp.toDate().getTime() : new Date(data.timestamp).getTime();
        if (now - ts < 24 * 60 * 60 * 1000) { // Within last 24 hours
          echoes.push({
            id: doc.id,
            text: data.text,
            timestamp: ts
          });
        }
      }
    });

    // Sort descending by timestamp (newest first)
    echoes.sort((a, b) => b.timestamp - a.timestamp);

    return res.json(echoes);
  } catch (err: any) {
    console.error("Error in /api/history:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default app;
