/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Client-side Firebase configuration with secure direct fallbacks
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyA40UiX-MJqa85db5wPLz5DrrKZnCjLTTg",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "missmetoo-39082.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "missmetoo-39082",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "missmetoo-39082.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "495217081378",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:495217081378:web:4bb664bcae927ce6c41e7b"
};

const vapidKey = metaEnv.VITE_VAPID_KEY || "BKUkIXMTZWbSkMJJ4LjlLJvL9CD29LI8GKzeO8dHPBcgqsyMydQ9RMEPw2vKViTvASc3xKwIRSfDmLRpbk3vQlQ";

type GatewayStatus = 'login' | 'transition' | 'authorised';
type SubStatus = 'greeting' | 'dashboard';

export default function App() {
  // Authentication Gateway State
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<GatewayStatus>('login');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 Dashboard & Mood Resonance State
  const [subStatus, setSubStatus] = useState<SubStatus>('greeting');
  const [backgroundGradient, setBackgroundGradient] = useState<string>('#050505');
  const [prevBackgroundGradient, setPrevBackgroundGradient] = useState<string>('#050505');
  
  const [orbExpanded, setOrbExpanded] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [moodError, setMoodError] = useState('');
  const [senderResponse, setSenderResponse] = useState<string | null>(null);

  // General Initialization
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear senderResponse after 8 seconds
  useEffect(() => {
    if (senderResponse) {
      const timer = setTimeout(() => {
        setSenderResponse(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [senderResponse]);

  // Sync Sub-states on authorisation
  useEffect(() => {
    if (status === 'authorised') {
      setSubStatus('greeting');
      const timer = setTimeout(() => {
        setSubStatus('dashboard');
      }, 3200);
      return () => clearTimeout(timer);
    } else {
      setSubStatus('greeting');
      setBackgroundGradient('#050505');
      setPrevBackgroundGradient('#050505');
      setOrbExpanded(false);
      setMoodText('');
      setMoodError('');
      setSenderResponse(null);
    }
  }, [status]);

  // Seamless client background device token synchronization
  useEffect(() => {
    if (status !== 'authorised') return;

    const setupPushNotifications = async () => {
      try {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          console.warn('System browser lacks push credentials support.');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Notification channel permission withheld.');
          return;
        }

        const fbApp = initializeApp(firebaseConfig);
        const fbMessaging = getMessaging(fbApp);

        // Register the background service worker explicitly inside root scope to avoid sandbox relative routing issues
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Firebase active Service Worker loaded successfully:', registration);

        let token: string | undefined;
        try {
          token = await getToken(fbMessaging, { 
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
          });
        } catch (tokenErr) {
          console.warn('Failed to retrieve FCM token gracefully:', tokenErr);
          return; // Stop gracefully without breaking
        }

        if (token) {
          console.log('Synchronized secure FCM token code.');
          await fetch('/api/register-device', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              password: password,
              token: token
            })
          });
        } else {
          console.warn('FCM instance token was empty.');
        }

        // Catch foreground real-time incoming messages
        onMessage(fbMessaging, (payload) => {
          console.log('Foreground real-time thought payload arrived:', payload);
        });

      } catch (err) {
        console.error('Error during silent push initialization feed:', err);
      }
    };

    setupPushNotifications();
  }, [status, password]);

  // Submit Password (Step 1 Gateway)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim().toLowerCase();

    if (cleanPassword === 'milanlovesroja' || cleanPassword === 'rojalovesmilan') {
      setIsError(false);
      setErrorMessage('');
      setStatus('transition');
      setTimeout(() => {
        setStatus('authorised');
      }, 1600);
    } else {
      setIsError(true);
      setErrorMessage('Frequency mismatch.');
      setTimeout(() => {
        setIsError(false);
      }, 600);
    }
  };

  // Submit Mood Text (Step 2 Dashboard Orb)
  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodText.trim() || isRequesting) return;

    setIsRequesting(true);
    setMoodError('');

    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: moodText, 
          password: password 
        }),
      });

      if (!response.ok) {
        throw new Error('Connection resonance lost.');
      }

      const data = await response.json();
      if (data.gradient) {
        setPrevBackgroundGradient(backgroundGradient);
        setBackgroundGradient(data.gradient);
        setSenderResponse(data.senderResponse || null);
        setOrbExpanded(false);
        setMoodText('');
      } else {
        throw new Error('System output format unreadable.');
      }
    } catch (err: any) {
      console.error(err);
      setMoodError(err.message || 'Transmission disrupted.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div 
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden text-[#fafafa] font-serif selection:bg-zinc-800 selection:text-white"
      id="portal-container"
    >
      {/* Background layer 1 (Previous Gradient Backplate) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ background: prevBackgroundGradient }} 
        id="bg-prev-layer"
      />
      
      {/* Background layer 2 (Active fading Gradient Frontplate) */}
      <motion.div
        key={backgroundGradient}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
        onAnimationComplete={() => {
          setPrevBackgroundGradient(backgroundGradient);
        }}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: backgroundGradient }}
        id="bg-active-layer"
      />

      {/* Decorative Frame Detail */}
      <div className="absolute inset-12 border border-zinc-900/30 pointer-events-none z-20" id="decorative-frame">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-800"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-zinc-800"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-800"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-800"></div>
      </div>

      {/* Micro Detail at Bottom (Visible in login & ambient modes) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 opacity-20 pointer-events-none z-20" id="micro-detail">
        <div className="w-1 h-1 rounded-full bg-zinc-400"></div>
        <div className="w-12 h-[1px] bg-zinc-800"></div>
        <div className="w-1 h-1 rounded-full bg-zinc-400"></div>
      </div>

      {/* Primary Ambient Spot Glow for login default state */}
      <AnimatePresence>
        {backgroundGradient === '#050505' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-900/10 rounded-full blur-[120px] z-10" 
            id="bg-ambient-glow"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* STEP 1: Secure Login Portal */}
        {status === 'login' && (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.8, ease: 'easeInOut' } }}
            className="z-30 w-full max-w-sm flex flex-col items-center justify-center px-6"
            id="login-wrapper"
          >
            <form 
              onSubmit={handleSubmit} 
              className="relative w-full flex flex-col items-center group"
              id="frequency-form"
            >
              <motion.div
                animate={isError ? {
                  x: [0, -8, 8, -6, 6, -3, 3, 0],
                  borderColor: ['rgba(39,39,42,1)', 'rgba(239,68,68,0.5)', 'rgba(39,39,42,1)']
                } : {}}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className={`relative w-full flex items-center border-b transition-all duration-1000 bg-transparent py-6 px-4
                  ${isError 
                    ? 'border-red-500/80 shadow-[0_1px_15px_rgba(239,68,68,0.15)]' 
                    : 'border-zinc-800 focus-within:border-zinc-500'
                  }
                `}
                id="input-container"
              >
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  autoFocus
                  placeholder="Enter the frequency..."
                  className="w-full bg-transparent text-center font-serif font-light tracking-[0.3em] text-lg text-white placeholder-zinc-700 outline-none transition-all duration-1000"
                  style={{ WebkitTextSecurity: 'disc' }}
                  id="frequency-input"
                  spellCheck="false"
                  autoComplete="off"
                />

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.15, x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`absolute right-2 bottom-6 cursor-pointer text-zinc-700 hover:text-white transition-all duration-300 ${!password ? 'opacity-30' : 'opacity-100'}`}
                  aria-label="Submit frequency"
                  id="submit-arrow-btn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </motion.button>

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent group-focus-within:w-full transition-all duration-1000 blur-[1px]"></div>
              </motion.div>

              <div className="absolute top-24 h-6 flex items-center justify-center animate-pulse" id="error-box">
                <AnimatePresence>
                  {isError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-mono tracking-[0.4em] text-red-500/80 mix-blend-plus-lighter"
                      id="error-message"
                    >
                      {errorMessage.toUpperCase()}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 1.5: Smooth Dark Transiting Shutter */}
        {status === 'transition' && (
          <motion.div
            key="transition-shutter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 z-50 bg-[#050505] flex items-center justify-center"
            id="transition-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-24 w-24 rounded-full bg-blue-500/5 blur-2xl"
              id="shutter-signal"
            />
          </motion.div>
        )}

        {/* STEP 2: Authorised Realm */}
        {status === 'authorised' && (
          <motion.div
            key="authorised-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-30 flex flex-col items-center justify-center w-full h-full relative"
            id="authorised-wrapper"
          >
            <AnimatePresence mode="wait">
              {/* Dynamic Sub-state: The Initial Serif Welcome */}
              {subStatus === 'greeting' && (
                <motion.div
                  key="greeting-sub"
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 1.2 } }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center px-4"
                  id="greeting-box"
                >
                  <div className="space-y-6" id="dashboard-content">
                    <motion.h1
                      initial={{ opacity: 0, letterSpacing: '0.15em' }}
                      animate={{ opacity: 1, letterSpacing: '0.3em' }}
                      transition={{ duration: 2.2, ease: 'easeOut', delay: 0.4 }}
                      className="font-serif italic text-3xl md:text-4xl text-white font-light"
                      id="connected-header"
                    >
                      The connection is open.
                    </motion.h1>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.2, 0.6, 0.2] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex items-center justify-center gap-2"
                      id="pulse-indicator"
                    >
                      <div className="h-1 w-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-500 uppercase">
                        Secure Synchronized Channel Active
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Dynamic Sub-state: Interactive Mood Glow Dashboard */}
              {subStatus === 'dashboard' && (
                <motion.div
                  key="dashboard-sub"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                  id="dashboard-box"
                >
                  {/* Subtle small heading locked to absolute top for premium context */}
                  <div className="absolute top-20 text-center" id="dashboard-header-text">
                    <p className="font-serif italic text-sm md:text-base text-zinc-500/80 tracking-[0.25em] font-light">
                      The connection is open.
                    </p>
                  </div>

                  {/* Pulsing Glowing Center Orb Section */}
                  <div className="absolute inset-0 flex items-center justify-center" id="orb-mount">
                    <AnimatePresence mode="wait">
                      {!orbExpanded ? (
                        /* Compact Pulsing glowing glass-orb */
                        <motion.div
                          key="orb-compact"
                          layoutId="orb-element"
                          onClick={() => {
                            setOrbExpanded(true);
                            setSenderResponse(null);
                          }}
                          className="relative cursor-pointer h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group"
                          style={{ willChange: "transform, opacity, box-shadow" }}
                          animate={isRequesting ? {
                            scale: [1, 1.25, 1],
                            boxShadow: [
                              "0 0 40px rgba(255,255,255,0.15), inset 0 0 15px rgba(255,255,255,0.05)",
                              "0 0 70px rgba(255,255,255,0.35), inset 0 0 25px rgba(255,255,255,0.15)",
                              "0 0 40px rgba(255,255,255,0.15), inset 0 0 15px rgba(255,255,255,0.05)"
                            ]
                          } : {
                            y: [0, -8, 0],
                            boxShadow: [
                              "0 0 30px rgba(255,255,255,0.06), inset 0 0 12px rgba(255,255,255,0.02)",
                              "0 0 50px rgba(255,255,255,0.18), inset 0 0 18px rgba(255,255,255,0.06)",
                              "0 0 30px rgba(255,255,255,0.06)"
                            ]
                          }}
                          transition={isRequesting ? {
                            duration: 0.6,
                            repeat: Infinity,
                            ease: "easeInOut"
                          } : {
                            y: {
                              duration: 5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            },
                            boxShadow: {
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }
                          }}
                          id="glowing-orb"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-white/30 group-hover:bg-white/75 transition-colors duration-500" />
                          
                          <AnimatePresence>
                            {isRequesting && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, rotateZ: 360 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  opacity: { duration: 0.4, ease: "easeInOut" },
                                  rotateZ: { duration: 1.2, repeat: Infinity, ease: "linear" }
                                }}
                                className="absolute -inset-4 rounded-full border border-white/5 border-t-white/80 pointer-events-none"
                                style={{ willChange: "transform, opacity" }}
                              />
                            )}
                          </AnimatePresence>

                          <div className="absolute -bottom-8 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-700 font-mono text-[8px] tracking-[0.3em] text-white uppercase whitespace-nowrap">
                            Engage Orb
                          </div>
                        </motion.div>
                      ) : (
                        /* Expanded Sleek Input Form */
                        <div className="flex flex-col items-center justify-center relative" key="orb-expanded-view" id="expanded-view-container">
                          <motion.div
                            layoutId="orb-element"
                            className="relative w-80 md:w-96 rounded-full border border-white/10 bg-black/45 backdrop-blur-md px-5 py-3.5 flex items-center shadow-[0_15px_50px_rgba(0,0,0,0.6)]"
                            style={{ willChange: "transform, opacity, box-shadow" }}
                            id="expanded-orb-box"
                          >
                            <form onSubmit={handleMoodSubmit} className="flex items-center w-full relative h-6" id="mood-form">
                              {/* Close Trigger */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOrbExpanded(false);
                                  setMoodText('');
                                  setMoodError('');
                                }}
                                className="absolute left-0 text-zinc-500 hover:text-white transition-colors duration-300 p-0.5 cursor-pointer flex items-center justify-center"
                                id="mood-close-btn"
                              >
                                <X size={15} strokeWidth={1.5} />
                              </button>

                              {/* Mood Frequency Text Input */}
                              <input
                                type="text"
                                value={moodText}
                                onChange={(e) => setMoodText(e.target.value)}
                                autoFocus
                                placeholder="What is on your mind..."
                                className="w-full bg-transparent px-8 text-center font-serif font-light tracking-[0.08em] text-sm text-white placeholder-zinc-600 outline-none"
                                id="mood-input"
                                disabled={isRequesting}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setOrbExpanded(false);
                                    setMoodText('');
                                    setMoodError('');
                                  }
                                }}
                              />
                              
                              {/* Submitter */}
                              <button
                                type="submit"
                                disabled={isRequesting || !moodText.trim()}
                                className={`absolute right-0 cursor-pointer p-0.5 text-zinc-500 hover:text-white transition-all duration-300 ${(!moodText.trim() || isRequesting) ? 'opacity-20' : 'opacity-100'}`}
                                id="mood-submit-btn"
                              >
                                <ArrowRight size={16} strokeWidth={1.5} />
                              </button>
                            </form>
                          </motion.div>

                          {/* Dynamic Guide Helper Label */}
                          <div className="absolute top-16 font-mono text-[8px] tracking-[0.3em] text-zinc-500/60 uppercase whitespace-nowrap" id="interactive-helper">
                            {isRequesting ? 'Frequencies processing...' : 'Press Enter to transmit • ESC to cancel'}
                          </div>

                          {/* Transmission Error Prompt */}
                          {moodError && (
                            <div className="absolute top-24 text-red-500/70 font-mono text-[8px] tracking-[0.25em] uppercase text-center max-w-xs" id="mood-err-box">
                              {moodError.toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Private Sender Reflection */}
                    <AnimatePresence>
                      {!orbExpanded && senderResponse && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.8 } }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                          className="absolute mt-48 px-6 text-center max-w-sm w-full flex flex-col items-center gap-3"
                        >
                          <p className="font-serif italic text-lg md:text-xl text-white/90 font-light tracking-wide leading-relaxed">
                            "{senderResponse}"
                          </p>
                          <button
                            onClick={() => setSenderResponse(null)}
                            className="text-zinc-500/50 hover:text-white/60 transition-colors p-1"
                            title="Dismiss"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Status Panel Details at Bottom Staging */}
                  <div className="absolute bottom-20 flex flex-col items-center gap-4 text-center z-10" id="authorised-panel">
                    <AnimatePresence>
                      {backgroundGradient !== '#050505' && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 0.4 }}
                          whileHover={{ opacity: 0.8 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            setPrevBackgroundGradient(backgroundGradient);
                            setBackgroundGradient('#050505');
                          }}
                          className="font-mono text-[9px] tracking-[0.4em] font-light text-zinc-400 hover:text-white uppercase transition-colors duration-500 cursor-pointer"
                          id="reset-glow-btn"
                        >
                          Reset Atmosphere
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={() => {
                        setPassword('');
                        setStatus('login');
                      }}
                      className="font-mono text-[9px] tracking-[0.4em] font-light text-zinc-400 hover:text-white uppercase transition-colors duration-500 cursor-pointer opacity-40 hover:opacity-100"
                      id="disconnect-btn"
                    >
                      Disconnect Feed
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
