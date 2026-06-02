/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, Clock, Camera, Image as ImageIcon, Music, Plus, Book, Flame } from 'lucide-react';
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
  
  // Storage for incoming echoes
  const [echoes, setEchoes] = useState<{id: string, text: string, timestamp: number, sender: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Moments Feature State
  const [stories, setStories] = useState<{id: string, image: string, note: string, timestamp: number, sender: string}[]>([]);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [storyNote, setStoryNote] = useState('');
  const [storyImageStr, setStoryImageStr] = useState<string>('');
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [viewingStoryIdx, setViewingStoryIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Angry App & Song Suggestion State
  const [isAngry, setIsAngry] = useState(false);
  const [latestSong, setLatestSong] = useState<{title: string, artist: string, sender: string} | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [isSubmittingSong, setIsSubmittingSong] = useState(false);

  // Special Memories State
  const [activeView, setActiveView] = useState<'pulse' | 'eternity' | 'temper'>('pulse');
  const [specialMemories, setSpecialMemories] = useState<{id: string, date: string, time: string, note: string, sender: string}[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryDate, setMemoryDate] = useState('');
  const [memoryTime, setMemoryTime] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);

  // Anger Meter State
  const [isPartnerAngry, setIsPartnerAngry] = useState(false);
  const [partnerSlapCount, setPartnerSlapCount] = useState(0);
  const [showAngerAlert, setShowAngerAlert] = useState(false);
  const [mySlapCount, setMySlapCount] = useState(0);
  const [isFaceShaking, setIsFaceShaking] = useState(false);
  const [isSoothing, setIsSoothing] = useState(false);

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

  // Load Echoes on Dashboard Entry
  useEffect(() => {
    if (subStatus === 'dashboard' && password) {
      fetch(`/api/history?password=${encodeURIComponent(password)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEchoes(data);
          }
        })
        .catch(err => console.error("Failed to load echoes:", err));

      fetch(`/api/stories?password=${encodeURIComponent(password)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStories(data);
          }
        })
        .catch(err => console.error("Failed to load stories:", err));

      fetch(`/api/activity-status?password=${encodeURIComponent(password)}`)
        .then(res => res.json())
        .then(data => {
          setIsAngry(!!data.isAngry);
        })
        .catch(err => console.error("Failed to load activity status:", err));

      const fetchAngerStatus = () => {
        fetch(`/api/anger/status?password=${encodeURIComponent(password)}`)
          .then(res => res.json())
          .then(data => {
            setIsPartnerAngry(data.isPartnerAngry);
            setPartnerSlapCount(data.slapCount);
            if (data.isPartnerAngry) {
              setShowAngerAlert(true);
            }
          })
          .catch(err => console.error("Failed to load anger status:", err));
      };
      fetchAngerStatus();
      (window as any).refreshAngerStatus = fetchAngerStatus;

      fetch(`/api/song?password=${encodeURIComponent(password)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.title) {
            setLatestSong(data);
          }
        })
        .catch(err => console.error("Failed to load song:", err));

      const fetchMemories = () => {
        fetch(`/api/memories?password=${encodeURIComponent(password)}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSpecialMemories(data);
            }
          })
          .catch(err => console.error("Failed to load memories:", err));
      };
      fetchMemories();
      
      // Store it on window for manual refetching after submission
      (window as any).refreshMemories = fetchMemories;
    } else {
      setEchoes([]);
      setStories([]);
      setIsAngry(false);
      setLatestSong(null);
      setSpecialMemories([]);
    }
  }, [subStatus, password]);

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

  // Auto-advance logic for stories
  useEffect(() => {
    if (viewingStoryIdx !== null) {
      const activeStory = stories[viewingStoryIdx];
      if (activeStory) {
        const timer = setTimeout(() => {
          setViewingStoryIdx((prev) => {
            if (prev !== null && prev < stories.length - 1) {
              return prev + 1;
            }
            return null;
          });
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [viewingStoryIdx, stories]);

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

  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStoryImageStr(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!storyNote.trim() && !storyImageStr) || isUploadingStory) return;

    setIsUploadingStory(true);
    
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: storyImageStr,
          note: storyNote, 
          password: password 
        }),
      });

      if (!response.ok) throw new Error('Failed to upload story');
      
      // Reset
      setStoryImageStr('');
      setStoryNote('');
      setShowStoryUpload(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingStory(false);
    }
  };

  const handleMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryDate || !memoryTime || !memoryNote.trim() || isSubmittingMemory) return;

    setIsSubmittingMemory(true);
    
    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          date: memoryDate,
          time: memoryTime,
          note: memoryNote, 
          password: password 
        }),
      });

      if (!response.ok) throw new Error('Failed to submit memory');
      
      setMemoryDate('');
      setMemoryTime('');
      setMemoryNote('');
      setIsMemoryModalOpen(false);
      if ((window as any).refreshMemories) {
        (window as any).refreshMemories();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingMemory(false);
    }
  };

  const handleSlap = async () => {
    setIsFaceShaking(true);
    setMySlapCount(prev => prev + 1);
    
    // Stop shake after 300ms
    setTimeout(() => setIsFaceShaking(false), 300);

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      await fetch('/api/anger/slap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
    } catch (err) {
      console.error("Failed to slap:", err);
    }
  };

  const handleSoothe = async () => {
    setIsSoothing(true);
    try {
      await fetch('/api/anger/soothe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      setIsPartnerAngry(false);
      setPartnerSlapCount(0);
    } catch (err) {
      console.error("Failed to soothe:", err);
    } finally {
      setIsSoothing(false);
    }
  };

  const handleSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim() || isSubmittingSong) return;

    setIsSubmittingSong(true);
    
    try {
      const response = await fetch('/api/song', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: songTitle,
          artist: songArtist, 
          password: password 
        }),
      });

      if (!response.ok) throw new Error('Failed to submit song');
      
      setSongTitle('');
      setSongArtist('');
      setShowSongModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSong(false);
    }
  };

  return (
    <div 
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden text-[#fafafa] font-sans selection:bg-white/30 selection:text-white bg-[#050505]"
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
        className="absolute inset-0 pointer-events-none z-0 bg-black/20"
        style={{ background: backgroundGradient }}
        id="bg-active-layer"
      />

      {/* Angry Mode Global Override */}
      <AnimatePresence>
        {isAngry && status === 'authorised' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-gradient-to-b from-red-950 via-neutral-950 to-red-900 z-0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Abstract Angry Face behind orb */}
      <AnimatePresence>
        {isAngry && subStatus === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
            style={{ top: '-10%' }}
          >
            <div className="flex gap-12 mb-6">
              <div className="w-12 h-1 bg-red-400 rotate-[25deg] shadow-[0_0_15px_rgba(248,113,113,1)]" />
              <div className="w-12 h-1 bg-red-400 -rotate-[25deg] shadow-[0_0_15px_rgba(248,113,113,1)]" />
            </div>
            <div className="w-16 h-1 bg-red-400 mt-8 shadow-[0_0_15px_rgba(248,113,113,1)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Glass Elements */}
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[100px] pointer-events-none z-10" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none z-10" />

      {/* Primary Ambient Spot Glow for login default state */}
      <AnimatePresence>
        {backgroundGradient === '#050505' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-white/5 rounded-full blur-[120px] z-10" 
            id="bg-ambient-glow"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* STEP 1: Secure Login Portal */}
        {status === 'login' && (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)', transition: { duration: 0.8, ease: 'easeInOut' } }}
            className="z-30 w-full max-w-md flex flex-col items-center justify-center px-6"
            id="login-wrapper"
          >
            <div className="glass-panel w-full rounded-[2.5rem] p-10 flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <h2 className="font-serif italic text-3xl text-white/90 mb-8 font-light tracking-widest text-center">
                Enter Frequency
              </h2>

              <form 
                onSubmit={handleSubmit} 
                className="w-full flex flex-col items-center"
                id="frequency-form"
              >
                <div className="relative w-full">
                  <motion.div
                    animate={isError ? {
                      x: [0, -8, 8, -6, 6, -3, 3, 0],
                    } : {}}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className={`w-full transition-all duration-500 ${isError ? 'opacity-80' : 'opacity-100'}`}
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
                      placeholder="••••••••••••••"
                      className={`w-full bg-white/5 border ${isError ? 'border-red-400/50 bg-red-400/5 text-red-100 placeholder-red-200/50' : 'border-white/10 hover:border-white/20 focus:border-white/30 text-white placeholder-white/20'} rounded-2xl px-6 py-4 text-center font-sans tracking-[0.5em] text-lg outline-none transition-all duration-300 shadow-inner backdrop-blur-md`}
                      style={{ WebkitTextSecurity: 'disc' }}
                      id="frequency-input"
                      spellCheck="false"
                      autoComplete="off"
                    />
                  </motion.div>
                </div>

                <div className="h-8 mt-4 flex items-center justify-center w-full">
                  <AnimatePresence mode="wait">
                    {isError ? (
                      <motion.p
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] font-sans font-medium tracking-[0.2em] text-red-300/80 uppercase"
                      >
                        {errorMessage}
                      </motion.p>
                    ) : (
                      <motion.button
                        key="submit"
                        type="submit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: password.length > 0 ? 1 : 0.4 }}
                        disabled={!password}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-[10px] font-sans font-medium tracking-[0.3em] text-white/50 hover:text-white uppercase transition-colors duration-300 flex items-center gap-2"
                      >
                        Initiate Connection <ArrowRight size={14} className="opacity-70" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
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
            className="absolute inset-0 z-50 bg-[#050505]/40 backdrop-blur-3xl flex items-center justify-center"
            id="transition-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1.5] }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="glass-orb h-24 w-24 rounded-full"
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
            className="z-30 flex flex-col items-center justify-center w-full h-full relative font-sans"
            id="authorised-wrapper"
          >
            <AnimatePresence mode="wait">
              {/* Dynamic Sub-state: The Initial Serif Welcome */}
              {subStatus === 'greeting' && (
                <motion.div
                  key="greeting-sub"
                  initial={{ opacity: 0, filter: 'blur(12px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(12px)', transition: { duration: 1.2 } }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-panel px-12 py-16 rounded-[3rem] flex flex-col items-center justify-center text-center max-w-lg mx-6"
                  id="greeting-box"
                >
                  <div className="space-y-6" id="dashboard-content">
                    <motion.h1
                      initial={{ opacity: 0, letterSpacing: '0.1em' }}
                      animate={{ opacity: 1, letterSpacing: '0.25em' }}
                      transition={{ duration: 2.2, ease: 'easeOut', delay: 0.4 }}
                      className="font-serif italic text-3xl md:text-5xl text-white font-light drop-shadow-lg"
                      id="connected-header"
                    >
                      The connection is open.
                    </motion.h1>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex items-center justify-center gap-3"
                      id="pulse-indicator"
                    >
                      <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                      <span className="font-sans text-[8px] md:text-[9px] tracking-[0.4em] text-white/70 uppercase">
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center w-full h-full relative p-6"
                  id="dashboard-box"
                >
                  {/* Subtle top header & History Button */}
                  <div className="absolute top-12 left-0 right-0 px-8 flex justify-between items-center w-full z-30" id="dashboard-header-text">
                    {/* Left: Minimalist Story Ring & Song Viewer */}
                    <div className="flex items-center gap-4">
                      {stories.length > 0 ? (
                        <button 
                          onClick={() => setViewingStoryIdx(0)}
                          className="relative flex items-center justify-center p-[2px] rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 animate-pulse hover:scale-105 transition-transform"
                        >
                          <div className="bg-black rounded-full h-10 w-10 flex items-center justify-center">
                            <span className="font-serif italic text-white/90 text-sm">M</span>
                          </div>
                        </button>
                      ) : (
                        <div className="invisible md:visible inline-block glass-pill px-6 py-2 rounded-full">
                          <p className="font-serif italic text-xs md:text-sm text-white/80 tracking-[0.2em] font-light">
                            Connection established.
                          </p>
                        </div>
                      )}

                      {latestSong && (
                        <div className="hidden md:flex items-center gap-3 glass-pill px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
                          <Music size={12} className="text-white/60 animate-pulse" />
                          <span className="font-sans text-[9px] tracking-widest uppercase text-white/60">
                            Partner suggests: <span className="text-white/90 italic font-serif opacity-100 normal-case ml-1 tracking-normal text-sm">"{latestSong.title}" by {latestSong.artist}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveView(prev => prev === 'temper' ? 'pulse' : 'temper')}
                        className={`glass-pill p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors duration-300 ${activeView === 'temper' ? 'text-red-400 bg-red-500/10' : 'text-white/70 hover:text-white'}`}
                      >
                        <Flame size={14} className={activeView === 'temper' ? 'opacity-100' : 'opacity-70'} />
                        <span className="hidden md:inline font-sans text-[10px] tracking-[0.2em] uppercase">Temper</span>
                      </button>
                      <button
                        onClick={() => setActiveView(prev => prev === 'pulse' ? 'eternity' : 'pulse')}
                        className={`glass-pill p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors duration-300 ${activeView === 'eternity' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'}`}
                      >
                        <Book size={14} className={activeView === 'eternity' ? 'opacity-100' : 'opacity-70'} />
                        <span className="hidden md:inline font-sans text-[10px] tracking-[0.2em] uppercase">{activeView === 'eternity' ? 'Pulse' : 'Eternity'}</span>
                      </button>
                      <button
                        onClick={() => setShowSongModal(true)}
                        className="glass-pill p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors duration-300 text-white/70 hover:text-white"
                      >
                        <Music size={14} className="opacity-70" />
                        <span className="hidden md:inline font-sans text-[10px] tracking-[0.2em] uppercase">Track</span>
                      </button>
                      <button
                        onClick={() => setShowStoryUpload(true)}
                        className="glass-pill p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors duration-300 text-white/70 hover:text-white"
                      >
                        <Camera size={14} className="opacity-70" />
                        <span className="hidden md:inline font-sans text-[10px] tracking-[0.2em] uppercase">Capture</span>
                      </button>
                      <button
                        onClick={() => setShowHistory(true)}
                        className="glass-pill p-2 md:px-4 md:py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors duration-300 text-white/70 hover:text-white"
                      >
                        <Clock size={14} className="opacity-70" />
                        <span className="hidden md:inline font-sans text-[10px] tracking-[0.2em] uppercase">History</span>
                      </button>
                    </div>
                  </div>

                  {activeView === 'pulse' ? (
                    <>
                      {/* Glassmorphic Pulse Center (Shifted up to allow more space for echoes) */}
                      <div className="absolute inset-x-0 top-[20%] h-64 flex items-center justify-center" id="orb-mount">
                        <AnimatePresence mode="wait">
                          {!orbExpanded ? (
                            /* Compact Pulsing Glass Orb */
                            <motion.div
                              key="orb-compact"
                              layoutId="orb-element"
                              onClick={() => {
                                setOrbExpanded(true);
                                setSenderResponse(null);
                              }}
                              className="glass-orb relative cursor-pointer h-24 w-24 rounded-full flex items-center justify-center group z-20"
                              style={{ willChange: "transform, opacity" }}
                              animate={isRequesting ? {
                                scale: [1, 1.15, 1],
                              } : {
                                y: [0, -6, 0],
                              }}
                              transition={isRequesting ? {
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              } : {
                                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                              }}
                            >
                              {/* Inner glowing core */}
                              <div className={`h-3 w-3 rounded-full bg-white/70 shadow-[0_0_20px_rgba(255,255,255,1)] transition-transform duration-700 ${isRequesting ? 'scale-150' : 'group-hover:scale-150'}`} />
                              
                              <AnimatePresence>
                                {isRequesting && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1.4, rotate: 180 }}
                                    exit={{ opacity: 0, scale: 1.8 }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "linear"
                                    }}
                                    className="absolute inset-0 rounded-full border border-white/40 pointer-events-none"
                                  />
                                )}
                              </AnimatePresence>

                              <div className="absolute -bottom-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 font-sans text-[9px] tracking-[0.3em] text-white/80 uppercase whitespace-nowrap">
                                Transmit
                              </div>
                            </motion.div>
                          ) : (
                            /* Expanded Glass Pill Form */
                            <div className="flex flex-col items-center justify-center relative z-20 w-full max-w-lg px-2" key="orb-expanded-view">
                              <motion.div
                                layoutId="orb-element"
                                className="glass-pill relative w-full rounded-[2rem] px-6 py-4 flex items-center"
                                style={{ willChange: "transform, opacity" }}
                              >
                                <form onSubmit={handleMoodSubmit} className="flex items-center w-full relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrbExpanded(false);
                                      setMoodText('');
                                      setMoodError('');
                                    }}
                                    className="text-white/40 hover:text-white/90 transition-colors duration-300 p-2 cursor-pointer rounded-full hover:bg-white/5"
                                  >
                                    <X size={18} strokeWidth={1.5} />
                                  </button>

                                  <input
                                    type="text"
                                    value={moodText}
                                    onChange={(e) => setMoodText(e.target.value)}
                                    autoFocus
                                    placeholder={isAngry ? "You've been distant... wake up the frequency." : "What is on your mind?"}
                                    className="w-full bg-transparent px-4 text-center font-serif font-light text-base md:text-lg text-white placeholder-white/40 outline-none"
                                    disabled={isRequesting}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setOrbExpanded(false);
                                        setMoodText('');
                                        setMoodError('');
                                      }
                                    }}
                                  />
                                  
                                  <button
                                    type="submit"
                                    disabled={isRequesting || !moodText.trim()}
                                    className={`p-2 rounded-full transition-all duration-300 ${(!moodText.trim() || isRequesting) ? 'text-white/20' : 'text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]'}`}
                                  >
                                    {isRequesting ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <ArrowRight size={18} strokeWidth={1.5} />
                                    )}
                                  </button>
                                </form>
                              </motion.div>

                              <div className="absolute -bottom-8 font-sans text-[9px] tracking-[0.25em] text-white/50 uppercase whitespace-nowrap">
                                {isRequesting ? 'Frequencies processing...' : 'Press Enter to transmit'}
                              </div>

                              {moodError && (
                                <div className="absolute top-20 bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-lg px-4 py-2 text-red-200 font-sans text-[10px] tracking-widest uppercase text-center mt-4">
                                  {moodError}
                                </div>
                              )}
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Private Sender Reflection (Response) */}
                      <AnimatePresence>
                        {!orbExpanded && senderResponse && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)', transition: { duration: 0.8 } }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="absolute top-[45%] px-6 text-center max-w-md w-full flex flex-col items-center gap-4 z-40"
                          >
                            <div className="glass-panel px-8 py-6 rounded-3xl w-full relative">
                              <div className="absolute top-0 right-0 p-2">
                                <button
                                  onClick={() => setSenderResponse(null)}
                                  className="text-white/30 hover:text-white/80 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <p className="font-serif italic text-xl md:text-2xl text-white font-light tracking-wide leading-relaxed drop-shadow-md">
                                "{senderResponse}"
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : activeView === 'eternity' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-0 pt-32 pb-12 overflow-y-auto flex flex-col items-center z-20"
                    >
                      <h2 className="font-serif italic text-2xl md:text-3xl text-white/90 mb-12 font-light tracking-widest uppercase">Our Eternity</h2>
                      
                      <div className="flex flex-col space-y-8 w-full max-w-2xl px-6 pb-24">
                        {specialMemories.length === 0 ? (
                          <p className="text-center font-serif italic text-white/30 text-sm">
                            Eternity is waiting for your touch.
                          </p>
                        ) : (
                          specialMemories.map(memory => {
                            const dateObj = new Date(`${memory.date}T${memory.time || "00:00"}`);
                            return (
                              <motion.div
                                key={memory.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative glass-panel rounded-[2rem] p-6 md:p-8 flex flex-col border border-white/5"
                              >
                                <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/50 mb-4 block">
                                    {dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <p className="font-serif italic text-xl md:text-2xl text-white/90 leading-relaxed whitespace-pre-wrap font-light">
                                    "{memory.note}"
                                </p>
                              </motion.div>
                            );
                          })
                        )}
                      </div>

                      <button
                        onClick={() => setIsMemoryModalOpen(true)}
                        className="fixed bottom-12 right-6 md:right-12 z-50 glass-pill h-14 w-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform hover:bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        <Plus size={24} className="text-white/80" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-0 pt-32 pb-12 overflow-y-auto flex flex-col items-center z-20"
                    >
                      <h2 className="font-serif italic text-2xl md:text-3xl text-white/90 mb-12 font-light tracking-widest uppercase">The Temper Chamber</h2>

                      <div className="flex flex-col md:flex-row w-full max-w-5xl px-6 gap-12 items-center justify-center pt-8">
                        
                        {/* Left: Venting (My Anger) */}
                        <div className="flex flex-col items-center flex-1">
                          <h3 className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/50 mb-12">Vent It Out</h3>
                          
                          <motion.button
                            onClick={handleSlap}
                            animate={isFaceShaking ? {
                              x: [-10, 10, -10, 10, 0],
                              y: [-5, 5, -5, 5, 0],
                              rotate: [-5, 5, -5, 5, 0]
                            } : {}}
                            transition={{ duration: 0.3 }}
                            className="relative w-48 h-48 rounded-full border-4 border-red-500/20 bg-red-900/10 flex items-center justify-center hover:bg-red-900/20 active:bg-red-900/40 transition-colors shadow-[0_0_30px_rgba(239,68,68,0.1)] hover:shadow-[0_0_40px_rgba(239,68,68,0.2)]"
                          >
                            <div className="flex flex-col items-center gap-4">
                              <div className="flex gap-8">
                                <div className="w-8 h-2 bg-red-400 rounded-full rotate-12" />
                                <div className="w-8 h-2 bg-red-400 rounded-full -rotate-12" />
                              </div>
                              <div className="w-16 h-4 border-b-4 border-red-400 rounded-[50%] mt-4" />
                            </div>
                            <div className="absolute -bottom-8 font-serif text-white/40 italic text-sm">
                              Slaps: {mySlapCount}
                            </div>
                          </motion.button>
                        </div>

                        {/* Right: Partner's Anger Status */}
                        <div className="flex flex-col items-center flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-16 md:pt-0">
                          <h3 className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/50 mb-12">Partner's Temperature</h3>
                          
                          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                            <div className="w-full flex justify-between text-white/30 font-sans text-[9px] uppercase tracking-widest px-2">
                              <span>Calm</span>
                              <span>Furious</span>
                            </div>
                            
                            {/* Visual Meter */}
                            <div className="flex items-center gap-4 w-full h-3 bg-white/5 rounded-full overflow-hidden relative shadow-inner">
                               <motion.div 
                                  className={`h-full relative overflow-hidden transition-colors duration-1000 ${
                                    partnerSlapCount === 0 ? 'bg-white/10'
                                    : partnerSlapCount < 6 ? 'bg-teal-400/80 shadow-[0_0_10px_theme(colors.teal.400)]' 
                                    : partnerSlapCount < 20 ? 'bg-orange-500/90 shadow-[0_0_15px_theme(colors.orange.500)]' 
                                    : 'bg-red-600 shadow-[0_0_20px_theme(colors.red.600)]'
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((partnerSlapCount / 30) * 100, 100)}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                               >
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                               </motion.div>
                            </div>
                            
                            <div className="text-center mt-4">
                              <span className="font-serif text-4xl text-white block mb-1 drop-shadow-md">{partnerSlapCount}</span>
                              <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/40">Degrees of Mad</span>
                            </div>

                            <AnimatePresence>
                              {partnerSlapCount > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                >
                                  <button
                                    onClick={handleSoothe}
                                    disabled={isSoothing}
                                    className="mt-6 glass-pill px-8 py-4 rounded-full flex items-center justify-center gap-3 hover:bg-white/10 transition-colors shadow-lg active:scale-95 duration-200"
                                  >
                                    {isSoothing ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <span className="font-sans text-[10px] tracking-[0.2em] text-white uppercase">Send a Digital Hug</span>
                                    )}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        
                      </div>
                    </motion.div>
                  )}

                  {/* History Drawer Overlay */}
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex justify-end"
                      >
                        <div 
                          className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
                          onClick={() => setShowHistory(false)} 
                        />
                        <motion.div
                          initial={{ x: '100%' }}
                          animate={{ x: 0 }}
                          exit={{ x: '100%' }}
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="glass-panel relative w-full max-w-md h-full rounded-none md:rounded-l-[2.5rem] border-r-0 flex flex-col pt-24 pb-8 px-8 overflow-y-auto"
                        >
                          <button
                            onClick={() => setShowHistory(false)}
                            className="absolute top-8 right-8 p-3 rounded-full hover:bg-white/10 transition-colors duration-300 text-white/50 hover:text-white/90"
                          >
                            <X size={20} strokeWidth={1.5} />
                          </button>
                          
                          <h3 className="font-sans text-xs tracking-[0.3em] uppercase text-white/40 mb-12 text-center">
                            Memory Vault
                          </h3>

                          <div className="flex flex-col space-y-12">
                            {echoes.length === 0 ? (
                              <p className="text-center font-serif italic text-white/30 text-sm">
                                No memories resonate in the past 24 hours.
                              </p>
                            ) : (
                              echoes.map((echo, idx) => {
                                const hoursAgo = Math.max(0, Math.floor((Date.now() - echo.timestamp) / (1000 * 60 * 60)));
                                const minutesAgo = Math.max(0, Math.floor((Date.now() - echo.timestamp) / (1000 * 60)));
                                const isMe = echo.sender === password.trim().toLowerCase();
                                
                                let timeText = "";
                                if (hoursAgo === 0) {
                                  if (minutesAgo < 5) timeText = isMe ? "Sent just now" : "Received just now";
                                  else timeText = `${isMe ? 'Sent' : 'Received'} ${minutesAgo} min ago`;
                                } else {
                                  timeText = `${isMe ? 'Sent' : 'Received'} ${hoursAgo} hr${hoursAgo !== 1 ? 's' : ''} ago`;
                                }

                                return (
                                  <motion.div
                                    key={echo.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                    className={`flex flex-col w-[90%] relative ${isMe ? 'ml-auto text-right items-end' : 'mr-auto text-left items-start'}`}
                                  >
                                    <p className={`font-serif italic text-xl md:text-2xl font-light leading-relaxed mb-3 ${isMe ? 'text-white/95 drop-shadow-md' : 'text-white/60'}`}>
                                      "{echo.text}"
                                    </p>
                                    <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/20">
                                      {timeText}
                                    </span>
                                  </motion.div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Story Viewing Overlay */}
                  <AnimatePresence>
                    {viewingStoryIdx !== null && stories[viewingStoryIdx] && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 z-[100] bg-[#050505] flex flex-col justify-center items-center overflow-hidden pt-10"
                      >
                        {/* Progress Bar */}
                        <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden z-[101]">
                          <motion.div
                            key={stories[viewingStoryIdx].id}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 7, ease: 'linear' }}
                            className="h-full bg-white/80"
                          />
                        </div>
                        
                        {/* Image background */}
                        {stories[viewingStoryIdx].image && (
                          <img 
                            src={stories[viewingStoryIdx].image} 
                            alt="Story"
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                          />
                        )}

                        {/* Top Gradient for text readability */}
                        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-[50] pointer-events-none" />
                        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 to-transparent z-[50] pointer-events-none" />

                        {/* Close button top right */}
                        <button
                          onClick={() => setViewingStoryIdx(null)}
                          className="absolute top-10 right-4 z-[102] p-2 text-white/60 hover:text-white"
                        >
                          <X size={24} />
                        </button>

                        {/* Note */}
                        {stories[viewingStoryIdx].note && (
                          <div className="absolute bottom-16 inset-x-8 text-center z-[101]">
                            <p className="font-serif italic text-2xl md:text-3xl text-white drop-shadow-md leading-snug">
                              "{stories[viewingStoryIdx].note}"
                            </p>
                          </div>
                        )}

                        {/* Close/Next Overlay clicks */}
                        <div className="absolute inset-0 z-[60] flex mt-12">
                          <div className="w-1/3 h-full cursor-pointer" onClick={() => {
                            if (viewingStoryIdx > 0) setViewingStoryIdx(viewingStoryIdx - 1);
                          }} />
                          <div className="w-2/3 h-full cursor-pointer" onClick={() => {
                            if (viewingStoryIdx < stories.length - 1) setViewingStoryIdx(viewingStoryIdx + 1);
                            else setViewingStoryIdx(null);
                          }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Story Upload Overlay */}
                  <AnimatePresence>
                    {showStoryUpload && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6"
                      >
                        <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center relative overflow-hidden">
                          <button
                            onClick={() => {
                              setShowStoryUpload(false);
                              setStoryImageStr('');
                              setStoryNote('');
                            }}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                          
                          <h3 className="font-serif italic text-2xl text-white/90 mb-6 text-center font-light">
                            Capture Moment
                          </h3>

                          <form onSubmit={handleStorySubmit} className="w-full flex flex-col items-center gap-6">
                            
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleImagePicker}
                            />
                            
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full aspect-[4/5] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:bg-white/10 transition-colors relative"
                            >
                              {storyImageStr ? (
                                <img src={storyImageStr} alt="Preview" className="w-full h-full object-cover opacity-80" />
                              ) : (
                                <>
                                  <ImageIcon size={32} className="text-white/30 mb-3 group-hover:text-white/50 transition-colors" />
                                  <span className="font-sans text-[10px] uppercase tracking-widest text-white/30 group-hover:text-white/50">Select Image</span>
                                </>
                              )}
                            </div>

                            <input
                              type="text"
                              value={storyNote}
                              onChange={(e) => setStoryNote(e.target.value)}
                              placeholder="Add a thought..."
                              className="w-full bg-transparent border-b border-white/20 pb-2 text-center font-serif text-lg text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
                            />

                            <button
                              type="submit"
                              disabled={isUploadingStory || (!storyImageStr && !storyNote.trim())}
                              className={`glass-pill px-8 py-3 rounded-full font-sans text-[10px] tracking-[0.3em] uppercase transition-all duration-300 flex items-center gap-2 ${
                                (!storyImageStr && !storyNote.trim()) || isUploadingStory
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              {isUploadingStory ? 'Sending...' : 'Transmit Moment'}
                              {!isUploadingStory && <ArrowRight size={14} className="opacity-70" />}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Song Upload Modal */}
                  <AnimatePresence>
                    {showSongModal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6"
                      >
                        <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center relative overflow-hidden">
                          <button
                            onClick={() => {
                              setShowSongModal(false);
                              setSongTitle('');
                              setSongArtist('');
                            }}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                          
                          <h3 className="font-serif italic text-2xl text-white/90 mb-8 text-center font-light">
                            Suggest Frequency
                          </h3>

                          <form onSubmit={handleSongSubmit} className="w-full flex flex-col items-center gap-6">
                            
                            <input
                              type="text"
                              value={songTitle}
                              onChange={(e) => setSongTitle(e.target.value)}
                              placeholder="Song Title"
                              className="w-full bg-transparent border-b border-white/20 pb-2 text-center font-serif text-lg text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
                              autoFocus
                            />

                            <input
                              type="text"
                              value={songArtist}
                              onChange={(e) => setSongArtist(e.target.value)}
                              placeholder="Artist Name"
                              className="w-full bg-transparent border-b border-white/20 pb-2 text-center font-serif text-lg text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
                            />

                            <button
                              type="submit"
                              disabled={isSubmittingSong || !songTitle.trim() || !songArtist.trim()}
                              className={`glass-pill mt-4 px-8 py-3 rounded-full font-sans text-[10px] tracking-[0.3em] uppercase transition-all duration-300 flex items-center gap-2 ${
                                isSubmittingSong || !songTitle.trim() || !songArtist.trim()
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              {isSubmittingSong ? 'Sending...' : 'Transmit Track'}
                              {!isSubmittingSong && <ArrowRight size={14} className="opacity-70" />}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Memory Upload Modal */}
                  <AnimatePresence>
                    {isMemoryModalOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6"
                      >
                        <div className="glass-panel w-full max-w-md rounded-[2.5rem] p-8 flex flex-col items-center relative overflow-hidden">
                          <button
                            onClick={() => {
                              setIsMemoryModalOpen(false);
                              setMemoryDate('');
                              setMemoryTime('');
                              setMemoryNote('');
                            }}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                          
                          <h3 className="font-serif italic text-2xl md:text-3xl text-white/90 mb-8 text-center font-light">
                            Lock into Eternity
                          </h3>

                          <form onSubmit={handleMemorySubmit} className="w-full flex flex-col items-center gap-6">
                            
                            <div className="flex gap-4 w-full">
                              <div className="flex-1">
                                <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/40 ml-2 block mb-1">Date</span>
                                <input
                                  type="date"
                                  value={memoryDate}
                                  onChange={(e) => setMemoryDate(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-serif text-sm text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
                                  required
                                />
                              </div>
                              <div className="flex-1">
                                <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/40 ml-2 block mb-1">Time</span>
                                <input
                                  type="time"
                                  value={memoryTime}
                                  onChange={(e) => setMemoryTime(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-serif text-sm text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
                                  required
                                />
                              </div>
                            </div>

                            <div className="w-full">
                              <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-white/40 ml-2 block mb-1">Memory Fragment</span>
                              <textarea
                                value={memoryNote}
                                onChange={(e) => setMemoryNote(e.target.value)}
                                placeholder="Describe the feeling..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 min-h-[140px] text-center font-serif text-base text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors resize-none"
                                required
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmittingMemory || !memoryDate || !memoryTime || !memoryNote.trim()}
                              className={`glass-pill mt-4 px-8 py-3 rounded-full font-sans text-[10px] tracking-[0.3em] uppercase transition-all duration-300 flex items-center gap-2 ${
                                isSubmittingMemory || !memoryDate || !memoryTime || !memoryNote.trim()
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              {isSubmittingMemory ? 'Archiving...' : 'Lock Memory'}
                              {!isSubmittingMemory && <ArrowRight size={14} className="opacity-70" />}
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Anger Alert Modal */}
                  <AnimatePresence>
                    {showAngerAlert && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 z-[70] bg-red-950/80 backdrop-blur-xl flex flex-col justify-center items-center p-6"
                      >
                        <div className="glass-panel border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] w-full max-w-md rounded-[2.5rem] p-10 flex flex-col items-center relative text-center">
                          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                            <Flame size={32} className="text-red-400" />
                          </div>
                          
                          <h3 className="font-serif italic text-2xl md:text-3xl text-white mb-4 font-light">
                            ⚠️ System Alert
                          </h3>
                          
                          <p className="font-sans text-sm text-white/80 leading-relaxed mb-8">
                            Your partner is currently upset with you. Enter the Temper Chamber immediately.
                          </p>

                          <button
                            onClick={() => {
                              setShowAngerAlert(false);
                              setActiveView('temper');
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-sans text-[10px] tracking-[0.3em] uppercase transition-all duration-300 w-full"
                          >
                            Enter Chamber
                          </button>
                          
                          <button
                            onClick={() => setShowAngerAlert(false)}
                            className="mt-4 text-white/50 hover:text-white/80 font-sans text-[10px] tracking-widest uppercase transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Status Panel Details at Bottom Staging */}
                  <div className="absolute bottom-8 flex flex-col items-center gap-4 text-center z-20 w-full" id="authorised-panel">
                    <AnimatePresence>
                      {backgroundGradient !== '#050505' && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            setPrevBackgroundGradient(backgroundGradient);
                            setBackgroundGradient('#050505');
                          }}
                          className="glass-pill px-6 py-2.5 rounded-full font-sans text-[9px] tracking-[0.25em] font-medium text-white/70 hover:text-white uppercase transition-all duration-300 cursor-pointer hover:bg-white/10"
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
                      className="font-sans text-[9px] tracking-[0.3em] font-medium text-white/30 hover:text-white/80 uppercase transition-colors duration-500 cursor-pointer"
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
