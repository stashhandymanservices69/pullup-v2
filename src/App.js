import React, { useState, useEffect, useRef, Fragment } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDjht_xx_1EFn6hDPaGiT3lKSd_uVafpzY",
  authDomain: "pull-up-coffee.firebaseapp.com",
  projectId: "pull-up-coffee",
  storageBucket: "pull-up-coffee.firebasestorage.app",
  messagingSenderId: "998836533279",
  appId: "1:998836533279:web:b94998af93f0551fa6bd2a"
};

// Initialize Firebase securely
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.warn("Firebase initialization skipped or failed.", error);
}

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
    <style>
        {`
        body { font-family: 'Inter', sans-serif; background-color: #fafaf9; -webkit-tap-highlight-color: transparent; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input:focus, select:focus, textarea:focus { outline: none; ring: 2px solid #f97316; }
        .secure-img { pointer-events: none; user-select: none; -webkit-user-drag: none; }
        /* Custom Range Slider */
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #f97316; cursor: pointer; margin-top: -8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #e7e5e4; border-radius: 2px; }
        `}
    </style>
);

// --- AUDIO ENGINE ---
const playNotificationSound = (type = 'normal') => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    if (type === 'urgent') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.8);
        osc.start(); osc.stop(ctx.currentTime + 0.8);
    }
};

// --- ICONS ---
const Icons = {
    Car: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
    Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
    CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    Trash2: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
    Robot: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
    Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
    ThumbsDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>,
    ThumbsUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Megaphone: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 9 11 13 4 13 20 9 13 3 13 3 11"/><path d="M13 8a5 5 0 0 1 0 8"/></svg>,
    Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    Bolt: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
    Gavel: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>,
    Volume: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>,
    VolumeX: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>,
    RefreshCw: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    Archive: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    Folder: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Crosshair: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>,
    CreditCard: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    Apple: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 1.64c-.33.37-.8.56-1.34.56-.47 0-.9-.16-1.28-.5-.38-.34-.6-.82-.6-1.34 0-.49.17-.92.53-1.29.35-.36.83-.56 1.34-.56.49 0 .91.17 1.28.53.37.37.56.81.56 1.3 0 .47-.16.92-.49 1.3zM21.36 17.68c-.68 2.06-1.56 3.69-2.58 4.88-1.04 1.21-2.03 1.83-3.03 1.83-.49 0-1.11-.14-1.83-.44-.73-.29-1.42-.44-2.03-.44-.61 0-1.33.15-2.08.45-.75.3-1.36.43-1.8.43-.95 0-1.92-.61-2.92-1.78-2.28-2.67-3.41-5.63-3.41-8.8 0-1.91.5-3.5 1.5-4.73 1.01-1.24 2.37-1.86 4.09-1.86.6 0 1.34.19 2.22.56.55.24.96.36 1.22.36.33 0 .86-.14 1.58-.41.72-.28 1.45-.43 2.19-.43 1.07 0 2.02.3 2.85.91.83.61 1.4 1.38 1.7 2.28-1.58.7-2.39 2.05-2.39 3.97 0 1.25.43 2.35 1.27 3.25.75.81 1.65 1.25 2.65 1.28-.15.86-.42 1.69-.81 2.52z"/></svg>,
    Smartphone: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
    ArrowRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
    ArrowDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
};

const CONTACT_EMAIL = "hello@pullupcoffee.com";

// --- LOCATIONS ---
const LOCATIONS = [
    { id: 1, name: "Grounds Keeper Willie", status: "open", address: "  Allen St,Moffat Beach QLD 4551", logo: "willie.avif" },
    { id: 2, name: "The Pocket Espresso Bar", status: "open", address: "  Seaview Terrace, Moffat Beach QLD 4551", logo: "thepocket-logo.png" },
    { id: 3, name: "Ours. Cafe & Goods", status: "closed", address: "  Roderick St, Moffat Beach QLD 4551", logo: "ours.png" },
];

const DEFAULT_MENU = [
    { id: 1, name: 'Flat White', price: 4.50, desc: 'Velvet texture, double shot', img: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 2, name: 'Cappuccino', price: 4.50, desc: 'Frothy & chocolate dusted', img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 3, name: 'Latte', price: 4.50, desc: 'Creamy steamed milk', img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 4, name: 'Long Black', price: 4.00, desc: 'Strong & bold over water', img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 5, name: 'Iced Latte', price: 5.50, desc: 'Chilled over ice cubes', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 6, name: 'Fresh Baked Goods', price: 9.50, desc: 'Assorted pastries & muffins', img: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=400&q=80', active: true },
    { id: 7, name: 'Signature House Beans', price: 18.00, desc: 'Take our signature blend home', img: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=80', active: true },
];

// --- SUB-COMPONENTS ---

const LockScreen = ({ onUnlock }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const handleSubmit = (e) => { e.preventDefault(); if (btoa(code) === 'MTIzMjE=') { onUnlock(); } else { setError(true); setTimeout(() => setError(false), 500); } };
    return (
        <div className="flex flex-col min-h-screen bg-brand-dark text-white items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=60')] bg-cover bg-center opacity-30 blur-sm"></div>
            <div className="relative z-10 w-full max-w-sm text-center"><div className="bg-brand-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce-slow"><Icons.Lock /></div><h1 className="text-3xl font-serif font-bold mb-2">Pull Up Coffee™</h1><p className="text-stone-400 mb-8 text-sm uppercase tracking-widest">Beta Access Restricted</p><form onSubmit={handleSubmit} className="space-y-4"><input type="password" inputMode="numeric" pattern="[0-9]*" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Access Code" className={`w-full p-4 bg-white/10 backdrop-blur-md border rounded-xl text-center text-xl tracking-widest focus:outline-none transition ${error ? 'border-red-500 animate-shake' : 'border-white/20 focus:border-brand-orange'}`} autoFocus /><button type="submit" className="w-full bg-brand-orange text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-lg">Unlock</button></form></div>
        </div>
    );
};

const ProductModal = ({ item, onClose, onAdd, addonPrices }) => {
    const [size, setSize] = useState('Small');
    const [milk, setMilk] = useState('Full Cream');
    const [sugar, setSugar] = useState('0');
    const [temp, setTemp] = useState('Hot');
    const [notes, setNotes] = useState('');
    const [extraShot, setExtraShot] = useState(false);
    
    const [prep, setPrep] = useState('Room Temp');
    const [beanWeight, setBeanWeight] = useState('250g');
    const [grind, setGrind] = useState('Whole Bean');

    const isFood = item.name.includes("Baked") || item.name.includes("Muffin");
    const isBeans = item.name.includes("Beans");

    const getAdjustedPrice = () => {
        let price = item.price;
        if (!isFood && !isBeans) { 
            if(size === 'Medium') price += addonPrices.medium;
            if(size === 'Large') price += addonPrices.large; 
            if(milk !== 'Full Cream' && milk !== 'Skim') price += addonPrices.milk; 
        }
        return price;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="font-serif font-bold text-2xl text-brand-dark">{item.name}</h3><p className="text-stone-500 text-sm">Customize your choice</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                </div>

                <div className="space-y-6 mb-8">
                    
                    {!isFood && !isBeans && (
                        <Fragment>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Size</label>
                                <div className="flex gap-2">
                                    {['Small', 'Medium', 'Large'].map(opt => {
                                        let label = opt;
                                        if(opt === 'Medium') label = `Medium (+$${addonPrices.medium.toFixed(2)})`;
                                        if(opt === 'Large') label = `Large (+$${addonPrices.large.toFixed(2)})`;
                                        return (
                                            <button key={opt} onClick={() => setSize(opt)} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition ${size === opt ? 'bg-brand-dark text-white border-brand-dark shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Milk Preference</label>
                                <select value={milk} onChange={e => setMilk(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white transition">
                                    <option>Full Cream</option>
                                    <option>Skim</option>
                                    <option>Oat (+${addonPrices.milk.toFixed(2)})</option>
                                    <option>Almond (+${addonPrices.milk.toFixed(2)})</option>
                                    <option>Soy (+${addonPrices.milk.toFixed(2)})</option>
                                    <option>Lactose Free</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-sm font-bold text-stone-600">Extra Shot (+${addonPrices.extraShot.toFixed(2)})</span>
                                <div onClick={() => setExtraShot(!extraShot)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${extraShot ? 'bg-brand-orange' : 'bg-stone-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-300 ${extraShot ? 'left-7' : 'left-1'}`}></div></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Sugar</label>
                                    <select value={sugar} onChange={e => setSugar(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                        <option value="0">None</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="Splenda">Splenda</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Temp</label>
                                    <select value={temp} onChange={e => setTemp(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                        <option>Hot</option>
                                        <option>Extra Hot</option>
                                        <option>Warm</option>
                                    </select>
                                </div>
                            </div>
                        </Fragment>
                    )} 
                    
                    {isFood && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Preparation</label>
                            <div className="flex gap-2">
                                {['Room Temp', 'Warmed Up'].map(opt => (
                                    <button key={opt} onClick={() => setPrep(opt)} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition ${prep === opt ? 'bg-brand-dark text-white border-brand-dark shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isBeans && (
                        <Fragment>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Weight</label>
                                <div className="flex gap-2">
                                    {[
                                        {l: '250g', p: 18},
                                        {l: '500g', p: 32}, 
                                        {l: '1kg', p: 55}
                                    ].map(opt => (
                                        <button key={opt.l} onClick={() => setBeanWeight(opt.l)} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition flex flex-col items-center justify-center ${beanWeight === opt.l ? 'bg-brand-dark text-white border-brand-dark shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                                            <span>{opt.l}</span>
                                            <span className="text-xs opacity-80">${opt.p}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Grind</label>
                                <select value={grind} onChange={e => setGrind(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white transition">
                                    <option>Whole Bean</option>
                                    <option>Espresso</option>
                                    <option>Stovetop</option>
                                    <option>Plunger / French Press</option>
                                    <option>Filter / Pour Over</option>
                                </select>
                            </div>
                        </Fragment>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">
                            {isFood ? 'Dietary Notes / Requests' : isBeans ? 'Machine Details (e.g. Breville Barista)' : 'Barista Notes'}
                        </label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            placeholder={isFood ? "e.g. No butter, gluten allergy..." : isBeans ? "e.g. For a Breville Express..." : "e.g. 3/4 full, no lid..."} 
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl h-20 text-sm focus:bg-white transition"
                        ></textarea>
                    </div>
                </div>

                <button 
                    onClick={() => onAdd({ 
                        ...item, 
                        size: isFood ? 'Std' : isBeans ? beanWeight : size, 
                        milk: isFood ? '-' : isBeans ? grind : milk, 
                        sugar: isFood || isBeans ? '-' : sugar, 
                        temp: isFood || isBeans ? '-' : temp, 
                        notes: isFood ? `${prep}. ${notes}` : `${notes}${extraShot ? ' + Extra Shot' : ''}`, 
                        price: getAdjustedPrice() 
                    })}
                    className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-stone-800 transition transform active:scale-[0.98]"
                >
                    Add to Order • ${getAdjustedPrice().toFixed(2)}
                </button>
            </div>
        </div>
    );
};

const CartPreviewModal = ({ cart, onClose, onDelete, onCheckout, total }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif font-bold text-2xl text-brand-dark">Current Order</h3>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto mb-6">
                    {cart.length === 0 ? (
                        <p className="text-stone-500 text-center py-8">Your cart is empty.</p>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.cartId} className="flex justify-between items-start border-b border-stone-100 pb-4 last:border-0">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-stone-800">{item.name}</h4>
                                        <p className="text-xs text-stone-500">{item.size}, {item.milk}</p>
                                        {item.notes && <p className="text-xs text-brand-orange italic mt-1">"{item.notes}"</p>}
                                        <p className="text-sm font-semibold mt-1">${item.price.toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => onDelete(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition"><Icons.Trash2 /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-stone-200">
                     <div className="flex justify-between font-bold text-xl mb-4 text-brand-dark">
                        <span>Total (Est.)</span>
                        <span>${total}</span>
                     </div>
                     <button onClick={onCheckout} disabled={cart.length === 0} className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        Proceed to Checkout
                     </button>
                </div>
            </div>
        </div>
    );
};

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="relative h-64 bg-stone-900">
                    {order.photo ? (
                        <img src={order.photo} alt="Car Spot" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-500"><Icons.Camera /> <span className="ml-2">No Photo Provided</span></div>
                    )}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><Icons.X /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold text-brand-dark">{order.name}</h3>
                            <p className="text-stone-500 text-sm">{order.mobile || 'No Mobile Provided'}</p>
                        </div>
                        <div className="text-right">
                            <span className="block text-xl font-bold font-mono uppercase bg-stone-100 px-2 rounded">{order.plate}</span>
                            <span className="text-xs text-stone-400">{order.carColor} {order.carModel}</span>
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 p-4 rounded-xl mb-4 border border-stone-100">
                        <h4 className="font-bold text-xs uppercase text-stone-400 mb-2">Location Note</h4>
                        <p className="text-stone-700 italic">"{order.locationDetails || 'No details provided'}"</p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-xs uppercase text-stone-400">Items</h4>
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm border-b border-stone-100 pb-2">
                                <span>{item.size} {item.name} ({item.milk})</span>
                                {item.notes && <span className="text-brand-orange text-xs">{item.notes}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditItemModal = ({ item, onSave, onClose }) => {
    const [name, setName] = useState(item.name);
    const [desc, setDesc] = useState(item.desc);
    const [price, setPrice] = useState(item.price);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-brand-dark">Edit Menu Item</h3>
                <div className="space-y-4 mb-6">
                    <div><label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase mb-1">Description</label><input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase mb-1">Base Price ($)</label><input type="number" step="0.10" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-lg font-bold hover:bg-stone-200">Cancel</button>
                    <button onClick={() => onSave({ ...item, name, desc, price: parseFloat(price) })} className="flex-1 py-2 bg-brand-dark text-white rounded-lg font-bold hover:bg-stone-800">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const RateCustomerModal = ({ order, onSave, onClose }) => {
    const [thumbs, setThumbs] = useState(null); 
    const [comment, setComment] = useState('');
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                <h3 className="font-bold text-xl mb-2 text-brand-dark">Staff Rating</h3>
                <p className="text-xs text-stone-400 mb-6 uppercase tracking-wider">Confidential - Staff Eyes Only</p>
                <div className="flex justify-center gap-4 mb-6">
                    <button onClick={() => setThumbs('down')} className={`p-4 rounded-full transition border-2 ${thumbs === 'down' ? 'bg-red-100 border-red-500 text-red-500' : 'bg-white border-stone-200 text-stone-300 hover:border-red-200'}`}><div className="scale-150"><Icons.ThumbsDown /></div></button>
                    <button onClick={() => setThumbs('up')} className={`p-4 rounded-full transition border-2 ${thumbs === 'up' ? 'bg-green-100 border-green-500 text-green-500' : 'bg-white border-stone-200 text-stone-300 hover:border-green-200'}`}><div className="scale-150"><Icons.ThumbsUp /></div></button>
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Private note (e.g. 'Always late')..." className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl h-24 text-sm mb-4 focus:bg-white transition"></textarea>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200">Cancel</button>
                    <button disabled={!thumbs} onClick={() => onSave({ thumbs, comment })} className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    );
};

const EmailReportModal = ({ onClose, onSend }) => {
    const [email, setEmail] = useState('');
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-brand-dark">Email History Report</h3>
                <p className="text-sm text-stone-500 mb-4">Enter the email address to receive the full CSV export of your order history.</p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full p-3 border border-stone-300 rounded-lg mb-4" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200">Cancel</button>
                    <button onClick={() => { if(email) onSend(email); else alert("Please enter an email"); }} className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-stone-800">Send Report</button>
                </div>
            </div>
        </div>
    );
};

const IPRegistryModal = ({ onClose }) => {
    const today = "16 January 2026"; // Locked to original creation date
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-stone-50 w-full max-w-3xl rounded-xl shadow-2xl border border-stone-300 max-h-[90vh] overflow-y-auto font-serif">
                <div className="bg-brand-dark text-white p-8 text-center rounded-t-xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-white to-brand-orange"></div>
                     <div className="mb-4 flex justify-center"><div className="bg-white/10 p-4 rounded-full border border-white/20"><Icons.Gavel /></div></div>
                     <h2 className="text-3xl font-bold tracking-wider mb-2">CERTIFICATE OF PRIORITY & AUTHORSHIP</h2>
                     <p className="text-stone-400 text-sm uppercase tracking-[0.2em]">Intellectual Property Registry</p>
                     <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white transition"><Icons.X /></button>
                </div>
                <div className="p-8 space-y-8 text-stone-800">
                    <div className="flex justify-between items-end border-b-2 border-stone-200 pb-4">
                        <div><p className="text-xs font-sans font-bold text-stone-400 uppercase">Author / Creator</p><p className="text-xl font-bold">Steven Weir</p></div>
                        <div className="text-right"><p className="text-xs font-sans font-bold text-stone-400 uppercase">Verification Date</p><p className="text-xl font-bold">{today}</p></div>
                    </div>
                    
                    <div className="bg-stone-100 p-6 rounded-xl border border-stone-200">
                        <h3 className="text-lg font-bold mb-4 font-sans uppercase tracking-wide text-brand-dark">Claim of Original Expression, Prior Art, and Rights Reservation</h3>
                        <p className="text-sm font-bold text-stone-500 mb-4">Pull Up Coffee Platform<br/>Document Type: Declaration of Original Expression and Prior Art Notice (Australia + international)<br/>Effective Date: {today} (Australia-Pacific time reference)</p>
                        
                        <p className="leading-relaxed mb-4 text-sm">This document is a formal declaration made by the undersigned author and rights holder in relation to the digital artifact, product concept, and associated written and/or recorded materials describing the “Pull Up Coffee” platform (the Work). This document is intended to operate as a clear, professional notice of authorship, ownership of copyright in original expression, and an evidentiary record of prior art and conception for the purposes of Australia and applicable international regimes.</p>

                        <div className="space-y-4">
                            <h4 className="font-bold text-brand-orange">1) Claim of Original Expression and Ownership</h4>
                            <p className="text-sm"><strong>1.1 Original expression.</strong> The undersigned asserts that the Work embodies original expression fixed in material form, including but not limited to written descriptions, diagrams, user flows, logic sequences, policy rules, terminology, and structural arrangement of features for the Pull Up Coffee platform.</p>
                            <p className="text-sm"><strong>1.2 Scope of claim.</strong> The claim is to the specific expression and implementation logic embodied in the Work, including the user flow and business logic architecture that connects Curbside GPS Notification with Dynamic “Surge” Pricing and Latency Management for cafés that do not have drive‑thru infrastructure.</p>
                            <p className="text-sm"><strong>1.3 Ownership.</strong> To the maximum extent permitted by law, the undersigned claims and reserves all right, title, and interest in and to the Work and any associated copyright and related rights arising automatically upon fixation, except to the extent any rights have been expressly assigned in writing.</p>
                            
                            <h4 className="font-bold text-brand-orange">2) Prior Art / Proof-of-Concept Notice</h4>
                            <p className="text-sm"><strong>2.1 Prior art declaration.</strong> The Work is published and/or retained as an evidentiary record demonstrating conception, description, and proof-of-concept of the Pull Up Coffee platform features described below as of the Effective Date, and as of any earlier creation timestamps embedded in the underlying files, metadata, repositories, or transmission records.</p>
                            
                            <h4 className="font-bold text-brand-orange">3) Novel Functionality Claimed in the Work</h4>
                            <p className="text-sm"><strong>3.1 Dynamic “Curbside Fee” adjustment.</strong> A mechanism for dynamically adjusting a curbside fee based on real-time café load and/or operational capacity signals.</p>
                            <p className="text-sm"><strong>3.2 Arrival time locking pre‑payment.</strong> A mechanism by which a customer’s arrival time is selected and locked before payment is completed.</p>
                            <p className="text-sm"><strong>3.3 Late arrival forfeiture policy logic.</strong> A defined policy whereby late arrival beyond a stated grace period may trigger forfeiture.</p>
                            <p className="text-sm"><strong>3.4 Integrated latency management.</strong> Linking pricing and policy logic to curbside GPS notification to reduce service disruption.</p>
                            <p className="text-sm"><strong>3.5 Dynamic "Surge" Pricing.</strong> Algorithms adjusting platform fees based on demand.</p>
                            <p className="text-sm"><strong>3.6 Visual Design & UI Patterns.</strong> The specific arrangement of the "Pull Up" card interface.</p>
                            
                            <h4 className="font-bold text-brand-orange">6) Statement of Authorship (Execution Block)</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-white p-4 border border-stone-200 rounded">
                                    <div>Rights Holder / Author:</div><div className="font-bold">Steven Weir</div>
                                    <div>Legal Name:</div><div className="font-bold">Steven Weir</div>
                                    <div>Address / Country:</div><div className="font-bold">Sunshine Coast, Australia</div>
                                    <div>Date:</div><div className="font-bold">{today}</div>
                                    <div>Digital Signature:</div><div className="font-bold text-green-600">[VERIFIED USER: 4551]</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-stone-200 p-4 rounded-lg font-mono text-xs text-stone-500 break-all border border-stone-300 text-center">
                        <strong>CRYPTOGRAPHIC TIMESTAMP HASH:</strong><br/>
                        8f4b2e1a9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f
                    </div>
                </div>
            </div>
        </div>
    );
};

const TermsModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">Terms of Service</h3><button onClick={onClose}><Icons.X /></button></div>
            <div className="prose text-sm text-stone-600 leading-relaxed space-y-4">
                <p><strong>1. Service Overview:</strong> Pull Up Coffee is a technology platform connecting users with third-party cafes. We act as an agent for the cafe.</p>
                <p><strong>2. Liability:</strong> We are not responsible for the quality of food/beverages or safety on cafe premises. Liability rests with the third-party provider.</p>
                <p><strong>3. Refunds:</strong> Refunds are at the discretion of the specific cafe partner. We facilitate the transaction but do not hold goods.</p>
                <p><strong>4. User Data:</strong> We collect email and phone numbers solely for order receipts and essential service notifications in accordance with the Privacy Act 1988.</p>
                <p><strong>5. Australian Consumer Law:</strong> Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms excludes or limits these rights.</p>
            </div>
            <button onClick={onClose} className="w-full mt-6 bg-brand-dark text-white py-3 rounded-xl font-bold">I Understand</button>
        </div>
    </div>
);

const RejectionReasonModal = ({ onConfirm, onClose }) => {
    const reasons = ["Item Out of Stock", "Too Busy / Capacity Full", "Closing Early", "Other"];
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-brand-dark">Reject Order?</h3>
                <p className="text-sm text-stone-500 mb-4">Please select a reason to notify the customer.</p>
                <div className="space-y-2 mb-4">
                    {reasons.map(r => (
                        <button key={r} onClick={() => onConfirm(r)} className="w-full text-left p-3 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-brand-orange transition text-sm font-medium">
                            {r}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-3 text-stone-500 font-bold hover:bg-stone-100 rounded-xl">Cancel</button>
            </div>
        </div>
    );
};

// --- PAGE COMPONENTS ---

const WelcomeModal = ({ onStart }) => {
    return (
        <div className="fixed inset-0 bg-brand-dark/95 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                {/* LEFT: Video & Vision */}
                <div className="md:w-5/12 bg-stone-900 relative flex flex-col group">
                    <div className="absolute inset-0 z-0">
                        <video 
                            src="https://raw.githubusercontent.com/stashhandymanservices69/pullup-coffee/main/Promotional_Video_For_Pull_Up_Coffee.mp4.mp4" 
                            autoPlay muted playsInline loop 
                            className="w-full h-full object-cover opacity-60"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        ></video>
                    </div>
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    <div className="relative z-20 p-8 flex flex-col h-full justify-end text-white">
                        <h2 className="text-2xl font-serif font-bold mb-2">"Give your business the flexible option of a drive-thru service, anytime."</h2>
                        <div className="text-sm space-y-4 leading-relaxed text-stone-300">
                            <p><strong>Hi, I’m Steven, founder of Pull Up (Sunshine Coast, QLD).</strong></p>
                            <p>Pull Up removes everyday barriers between customers and businesses. It's not limited to coffee — partners can offer any products they choose.</p>
                            <p>No lock-in contracts. Just a low-friction sales channel to increase revenue without complexity.</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Demo Flow */}
                <div className="md:w-7/12 p-8 md:p-10 flex flex-col bg-stone-50 overflow-y-auto flex-1 min-h-0">
                    <div className="mb-6 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-brand-dark mb-1">Pull Up Coffee™</h2>
                        <p className="text-stone-500 text-xs uppercase tracking-widest">Beta Platform Preview</p>
                    </div>

                    {/* FLOW CHART */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 mb-8 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">How it Works (Not Delivery)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                            {/* Customer Side */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-brand-dark border border-stone-200"><Icons.Smartphone /></div>
                                    <div className="text-xs font-bold text-stone-700">1. Customer Orders<br/><span className="font-normal text-stone-400">Pre-pays & sets time</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-brand-dark border border-stone-200"><Icons.Car /></div>
                                    <div className="text-xs font-bold text-stone-700">2. Parks Curbside<br/><span className="font-normal text-stone-400">Arrives at cafe</span></div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden md:block h-full w-px bg-stone-200 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 text-stone-300"><Icons.ArrowRight /></div></div>
                            <div className="md:hidden w-full h-px bg-stone-200 relative my-2"><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 text-stone-300"><Icons.ArrowDown /></div></div>

                            {/* Business Side */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3 text-left md:text-right flex-row md:flex-row-reverse">
                                    <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white shadow-lg"><Icons.Alert /></div>
                                    <div className="text-xs font-bold text-brand-dark">3. Cafe Alerted<br/><span className="font-normal text-stone-500">See car photo/details</span></div>
                                </div>
                                <div className="flex items-center gap-3 text-left md:text-right flex-row md:flex-row-reverse">
                                    <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white shadow-lg"><Icons.Coffee /></div>
                                    <div className="text-xs font-bold text-brand-orange">4. Staff Runs Out<br/><span className="font-normal text-stone-500">Handover at window</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Demo Instructions */}
                    <div className="mb-8 bg-brand-orange/5 p-4 rounded-xl border border-brand-orange/10 shrink-0">
                        <h4 className="text-xs font-bold text-brand-orange uppercase tracking-widest mb-3">Interactive Demo Instructions</h4>
                        <ol className="space-y-3 text-sm text-stone-600">
                            <li className="flex gap-3 items-start">
                                <span className="bg-brand-orange text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                                <span><strong>Roleplay Customer:</strong> Click 'Enter Website', choose a cafe, order a coffee, and pay.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-brand-dark text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                                <span><strong>Roleplay Business:</strong> Return to Landing Page, click 'Partner Login', and manage the live order.</span>
                            </li>
                        </ol>
                    </div>

                    {/* MUM PROOF BUTTON */}
                    <div className="mt-auto shrink-0 pb-4">
                        <button onClick={onStart} className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-stone-800 transition transform hover:scale-[1.02] flex items-center justify-center gap-3 animate-pulse-fast">
                            ENTER WEBSITE <Icons.ChevronRight />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LandingPage = ({ setView, onOpenLegal }) => (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=60')] bg-cover bg-center opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/70 via-black/40 to-black/90"></div>
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-brand-orange p-6 rounded-full mb-8 shadow-[0_0_40px_rgba(249,115,22,0.4)] animate-bounce-slow">
                <div className="scale-125"><Icons.Car /></div>
            </div>

            <h1 className="text-6xl font-serif italic mb-2 tracking-tight drop-shadow-xl relative inline-block">
                Pull Up Coffee<sup className="text-sm not-italic align-top absolute -right-4 top-2 text-stone-400">TM</sup>
            </h1>
            <p className="text-stone-300 mb-12 text-lg max-w-md font-light leading-relaxed">
                Premium coffee. Delivered to your window, from your favourite cafe.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-sm mb-12">
                <button 
                    onClick={() => setView('location-select')}
                    className="bg-white text-brand-dark py-5 px-8 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-stone-200 transform hover:scale-105 transition shadow-2xl"
                >
                    <Icons.Car /> Order Now
                </button>
                <button 
                    onClick={() => setView('cafe-login')}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 rounded-xl font-medium hover:bg-white/20 transition"
                >
                    Partner Login
                </button>
            </div>
        </div>

        <div className="relative z-10 bg-black/40 backdrop-blur-lg border-t border-white/10 p-6 md:p-8">
            <div className="max-w-xl mx-auto flex gap-4 items-start mb-4">
                <div className="shrink-0 pt-1">
                    <img src="creatorpullup.jpg" alt="Steven" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=Steven+Weir&background=f97316&color=fff"; }}
                            className="w-12 h-12 rounded-full border border-white/20 shadow-lg secure-img bg-stone-800 object-cover object-center" />
                </div>
                <div className="text-left">
                    <p className="text-stone-300 text-xs leading-relaxed italic opacity-90">
                        "Becoming a new dad brought so many joyful moments, and one very familiar routine: those gentle drives to help my baby drift off to sleep. The only challenge? Craving a great cup of coffee without disturbing that precious nap or stepping out in my pajamas. That’s why I created Pull Up Coffee™."
                    </p>
                    <p className="text-brand-orange text-[10px] font-bold uppercase tracking-widest mt-2">– Steven Weir, Founder (Sunshine Coast)</p>
                </div>
            </div>
            <div className="text-center text-[10px] text-stone-500 uppercase tracking-widest pt-4 border-t border-white/5 flex flex-col gap-2">
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition flex items-center justify-center gap-2">Contact Support: {CONTACT_EMAIL}</a>
                <button onClick={onOpenLegal} className="hover:text-brand-orange transition underline">Legal & IP Registry</button>
            </div>
        </div>
    </div>
);

const LocationSelect = ({ setView, setSelectedLocation, isPromoActive, userProfile }) => {
    const [favorites, setFavorites] = useState([]);
    const toggleFavorite = (e, id) => { e.stopPropagation(); if(favorites.includes(id)) setFavorites(favorites.filter(fid => fid !== id)); else setFavorites([...favorites, id]); };
    const handleSMS = (e) => { e.stopPropagation(); if(!userProfile?.mobile) { alert("Please Create a Profile with a Mobile Number to enable SMS alerts."); } else { alert("SMS Alerts Enabled!"); } };
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="min-h-screen bg-stone-900 text-white p-6 animate-fade-in flex flex-col">
            <button onClick={() => setView('landing')} className="mb-6 flex items-center text-stone-400 hover:text-white transition w-fit"><Icons.X /> <span className="ml-2">Back</span></button>
            <h2 className="text-3xl font-serif font-bold mb-2">Select Location</h2>
            <p className="text-stone-400 mb-8">Find a partner cafe near you.</p>

            <div className="flex gap-2 mb-8 max-w-lg mx-auto w-full">
                 <div className="relative flex-1">
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"><Icons.Search /></div>
                     <input 
                         type="text" 
                         placeholder="Search Area / Postcode" 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-orange transition"
                     />
                  </div>
                  <button className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-xl transition" title="Use My Location"><Icons.Crosshair /></button>
            </div>

            <div className="space-y-4 max-w-lg mx-auto w-full">
                {LOCATIONS.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.address.toLowerCase().includes(searchTerm.toLowerCase())).map(loc => (
                    <div key={loc.id} className="relative group">
                        {loc.id === 1 && isPromoActive && (<div className="absolute -top-3 -right-2 bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded-full z-20 shadow-lg border border-white animate-bounce-slow">🎉 PROMO</div>)}
                        
                        <button 
                            onClick={(e) => toggleFavorite(e, loc.id)} 
                            className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full transition ${favorites.includes(loc.id) ? 'text-red-500' : 'text-stone-600 hover:text-red-400 hover:bg-stone-800'}`}
                        >
                            <Icons.Heart />
                        </button>

                        <button disabled={loc.status === 'closed'} onClick={() => { setSelectedLocation(loc); setView('customer'); }} className={`w-full p-4 pl-16 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center transition border text-left relative overflow-hidden z-10 ${loc.status === 'open' ? 'bg-stone-800 border-stone-700 hover:border-brand-orange hover:bg-stone-750 cursor-pointer' : 'bg-stone-900 border-stone-800 opacity-60 cursor-not-allowed'}`}>
                            <div className="flex items-center gap-4 mb-2 sm:mb-0 w-full">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-stone-600"><img src={loc.logo} alt={loc.name} onError={(e) => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span style="font-size:20px">☕</span>'; }} className="w-full h-full object-contain" /></div>
                                <div className="flex-1 min-w-0 pr-8"><span className={`font-bold block text-lg truncate ${loc.status === 'open' ? 'text-white group-hover:text-brand-orange' : 'text-stone-500'}`}>{loc.name}</span><div className="flex items-center text-xs text-stone-400 mt-1 truncate"><div className="w-3 shrink-0 mr-2"><Icons.MapPin /></div> {loc.address}</div></div>
                            </div>
                            <div className="self-end sm:self-center shrink-0">{loc.status === 'open' ? <span className="text-green-400 text-[10px] font-bold px-2 py-1 bg-green-900/30 rounded-full border border-green-800">OPEN</span> : <span className="text-stone-500 text-[10px] font-bold px-2 py-1 bg-stone-800 rounded-full">CLOSED</span>}</div>
                        </button>
                        {favorites.includes(loc.id) && <div className="mt-2 flex items-center gap-2 px-2"><div onClick={handleSMS} className={`w-8 h-4 rounded-full relative cursor-pointer ${userProfile?.mobile ? 'bg-green-600' : 'bg-stone-600'}`}><div className="w-4 h-4 bg-white rounded-full absolute right-0 top-0"></div></div><span className="text-xs text-stone-400">Notify via SMS when active</span></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const CustomerMenu = ({ selectedLocation, menu, cart, addToCart, removeFromCart, setView, getTotal, addonPrices }) => {
    const [modalItem, setModalItem] = useState(null);
    const [showCartPreview, setShowCartPreview] = useState(false);

    const handleCheckoutClick = () => {
        setShowCartPreview(true);
    };

    return (
        <div className="min-h-screen bg-stone-50 pb-32 animate-fade-in">
            <div className="bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center border-b border-stone-100">
                <button onClick={() => setView('location-select')} className="p-2 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                <div className="text-center"><h2 className="font-serif font-bold text-xl text-brand-dark">{selectedLocation?.name}</h2><span className="text-xs text-green-600 font-bold tracking-widest uppercase">● Accepting Orders</span></div><div className="w-8"></div>
            </div>
            
            {/* Render active menu items only */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {menu.filter(m => m.active).map(item => (
                    <div key={item.id} onClick={() => setModalItem(item)} className="group bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition border border-stone-100 flex gap-4 overflow-hidden cursor-pointer">
                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative"><img src={item.img} alt={item.name} onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80"; }} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /></div>
                        <div className="flex flex-col justify-center flex-1">
                            <h3 className="font-serif font-bold text-lg text-brand-dark">{item.name}</h3>
                            <p className="text-stone-500 text-sm mb-2">{item.desc}</p>
                            <div className="flex justify-between items-center mt-auto"><span className="font-bold text-brand-orange">${item.price.toFixed(2)}</span><span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-brand-dark group-hover:text-white transition"><Icons.Plus /></span></div>
                        </div>
                    </div>
                ))}
            </div>

            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-30 animate-slide-up">
                    <div className="max-w-md mx-auto">
                        <button onClick={handleCheckoutClick} className="w-full bg-brand-dark text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center font-bold text-lg transform hover:scale-[1.02] transition">
                            <div className="flex items-center gap-3"><span className="bg-brand-orange text-white px-2 py-0.5 rounded-md text-sm">{cart.length}</span><span>View Order</span></div><span>${getTotal()}</span>
                        </button>
                    </div>
                </div>
            )}
            
            {modalItem && <ProductModal item={modalItem} onClose={() => setModalItem(null)} onAdd={(item) => { addToCart(item); setModalItem(null); }} addonPrices={addonPrices} />}
            
            {showCartPreview && (
                <CartPreviewModal 
                    cart={cart} 
                    total={getTotal()} 
                    onClose={() => setShowCartPreview(false)}
                    onDelete={removeFromCart}
                    onCheckout={() => { setShowCartPreview(false); setView('checkout'); }}
                />
            )}
        </div>
    );
};

const SuccessScreen = ({ setView, userProfile, currentOrder }) => {
    const [timeLeft, setTimeLeft] = useState(90);
    const [status, setStatus] = useState('active');

    useEffect(() => {
        if (status !== 'active') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);
    
    // Rejection Listener
    useEffect(() => {
        if (currentOrder && currentOrder.status === 'rejected') {
            // Force re-render to show rejection state
        }
    }, [currentOrder]);

    const handleCancel = () => {
        setStatus('cancelled');
    };

    // Rejection UI
    if (currentOrder && currentOrder.status === 'rejected') {
        return (
            <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-red-100 text-red-500 w-20 h-20 rounded-full flex items-center justify-center mb-6"><Icons.X /></div>
                <h2 className="text-3xl font-bold text-stone-800 mb-2">Order Rejected</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 max-w-sm w-full mb-8">
                    <p className="text-stone-500 text-sm uppercase tracking-widest font-bold mb-2">Reason</p>
                    <p className="text-xl font-serif text-brand-dark font-bold">"{currentOrder.rejectionReason || 'Unavailable'}"</p>
                </div>
                <p className="text-stone-500 mb-8 max-w-xs">We sincerely apologize for the inconvenience. No funds have been taken from your account.</p>
                <button onClick={() => setView('landing')} className="bg-stone-800 text-white px-8 py-3 rounded-xl font-bold">Back to Home</button>
            </div>
        );
    }

    if (status === 'cancelled') {
        return (
            <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-red-100 text-red-500 w-20 h-20 rounded-full flex items-center justify-center mb-6"><Icons.X /></div>
                <h2 className="text-3xl font-bold text-stone-800 mb-2">Order Cancelled</h2>
                <p className="text-stone-500 mb-8">Your transaction has been voided. No funds were taken.</p>
                <button onClick={() => setView('landing')} className="bg-stone-800 text-white px-8 py-3 rounded-xl font-bold">Back to Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in relative">
            <div className="max-w-md w-full">
                <div className="bg-brand-orange text-white w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce mx-auto"><Icons.CheckCircle /></div>
                <h2 className="text-4xl font-serif italic mb-4">Order Sent!</h2>
                <p className="text-stone-400 text-lg mb-8">
                    We are looking for your <span className="text-white font-bold">{userProfile.carColor} {userProfile.carModel}</span>.
                </p>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
                    <h3 className="font-bold text-brand-orange text-sm uppercase tracking-widest mb-2">Next Steps</h3>
                    <p className="text-sm leading-relaxed">
                        Please <strong>WAIT</strong> for order acceptance notification before driving to the cafe.
                    </p>
                </div>

                {timeLeft > 0 ? (
                    <button onClick={handleCancel} className="text-red-400 hover:text-red-300 text-sm font-bold border border-red-400/30 bg-red-400/10 px-6 py-3 rounded-xl w-full mb-4">
                        Cancel Order (Undo) - {timeLeft}s
                    </button>
                ) : (
                    <div className="text-stone-500 text-xs mb-4">Order Locked. Preparing...</div>
                )}

                <button onClick={() => setView('landing')} className="text-stone-500 hover:text-white transition underline text-sm tracking-widest uppercase">Done</button>
            </div>
        </div>
    );
};

const CheckoutForm = ({ user, setUser, onSubmit, onBack, cart, total, curbsideFee, isPromoActive, isLoyaltyActive, removeFromCart }) => {
    const [pickupType, setPickupType] = useState('ASAP');
    const [customTime, setCustomTime] = useState('');
    const [details, setDetails] = useState('');
    const [carPhoto, setCarPhoto] = useState(null);
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('apple');
    const fileInputRef = useRef(null);

    const handleChange = (field, value) => { setUser(prev => ({ ...prev, [field]: value })); };
    const handlePhotoUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setCarPhoto(reader.result); }; reader.readAsDataURL(file); } };
    useEffect(() => { const now = new Date(); now.setMinutes(now.getMinutes() + 15); setCustomTime(now.toTimeString().slice(0, 5)); }, []);

    let displayFee = curbsideFee;
    let displayFeeText = `$${curbsideFee.toFixed(2)}`;
    if (isPromoActive) { displayFee = 0; displayFeeText = "FREE (Promo)"; }
    else if (isLoyaltyActive && curbsideFee > 1) { displayFee = 1.00; displayFeeText = "$1.00 (Local's Rate)"; }
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const finalTotal = (subtotal + displayFee).toFixed(2);
    const isGuest = !user.name || !user.carModel;
    const [saveProfile, setSaveProfile] = useState(false);

    return (
        <div className="min-h-screen bg-stone-50 p-6 animate-fade-in pb-24">
            <div className="max-w-lg mx-auto">
                <button onClick={onBack} className="mb-6 flex items-center text-stone-500 font-medium hover:text-brand-dark transition"><Icons.X /> <span className="ml-2">Back to Menu</span></button>
                <h2 className="text-3xl font-serif font-bold text-brand-dark mb-6">Final Details</h2>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-5 mb-6">
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Pickup Time</label><div className="flex gap-2 mb-3"><button onClick={() => setPickupType('ASAP')} className={`flex-1 py-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${pickupType === 'ASAP' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-stone-500 border-stone-200'}`}><Icons.TrendingUp /> ASAP</button><button onClick={() => setPickupType('LATER')} className={`flex-1 py-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${pickupType === 'LATER' ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-stone-500 border-stone-200'}`}><Icons.Clock /> Pick Time</button></div>{pickupType === 'LATER' && <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-lg font-bold text-center" />}</div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Your Name</label><input type="text" value={user.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Alex" className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium transition" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Car Model</label><input type="text" value={user.carModel} onChange={e => handleChange('carModel', e.target.value)} placeholder="e.g. Tesla" className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium transition" /></div><div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Color</label><input type="text" value={user.carColor} onChange={e => handleChange('carColor', e.target.value)} placeholder="e.g. White" className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium transition" /></div></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">License Plate (Full)</label><input type="text" value={user.plate} onChange={e => handleChange('plate', e.target.value)} placeholder="e.g. 123-ABC" className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium uppercase font-mono tracking-widest transition" /></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Email (Receipts)</label><input type="email" value={user.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="alex@email.com" className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium transition" /></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Mobile (SMS Updates)</label><input type="tel" value={user.mobile || ''} onChange={e => handleChange('mobile', e.target.value)} placeholder="0400..." className="w-full p-4 bg-stone-50 rounded-xl border-none ring-1 ring-stone-200 focus:ring-2 focus:ring-brand-orange text-stone-900 font-medium transition" /></div>
                    
                    <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Payment Method</label>
                        <div className="space-y-2">
                            <div onClick={() => setPaymentMethod('apple')} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymentMethod === 'apple' ? 'border-brand-orange bg-orange-50 ring-1 ring-brand-orange' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-3"><div className="bg-black text-white p-1 rounded"><Icons.Apple /></div><span className="font-bold text-sm">Apple Pay</span></div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === 'apple' ? 'border-brand-orange bg-brand-orange' : 'border-stone-300'}`}>{paymentMethod === 'apple' && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                            </div>
                            <div onClick={() => setPaymentMethod('google')} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymentMethod === 'google' ? 'border-brand-orange bg-orange-50 ring-1 ring-brand-orange' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-3"><div className="bg-white border text-black p-1 rounded"><Icons.Smartphone /></div><span className="font-bold text-sm">Google Pay</span></div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === 'google' ? 'border-brand-orange bg-brand-orange' : 'border-stone-300'}`}>{paymentMethod === 'google' && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                            </div>
                            <div onClick={() => setPaymentMethod('card')} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${paymentMethod === 'card' ? 'border-brand-orange bg-orange-50 ring-1 ring-brand-orange' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-3"><div className="text-stone-600"><Icons.CreditCard /></div><span className="font-bold text-sm">Card ending 4242</span></div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'border-brand-orange bg-brand-orange' : 'border-stone-300'}`}>{paymentMethod === 'card' && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                            </div>
                        </div>
                    </div>

                    {isGuest && <div className="flex items-center gap-3 p-3 bg-brand-orange/10 rounded-xl"><input type="checkbox" className="accent-brand-orange w-5 h-5" checked={saveProfile} onChange={(e) => setSaveProfile(e.target.checked)} /><span className="text-sm font-bold text-brand-dark">Save details for rewards & faster checkout?</span></div>}
                    <div><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Parking Spot / Location Details</label><textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Parked near the big tree, hazards on..." className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl h-20 text-sm mb-3 focus:bg-white transition"></textarea><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />{carPhoto ? (<div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200"><img src={carPhoto} alt="Car Preview" className="w-full h-full object-cover" /><button onClick={() => setCarPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><Icons.X /></button></div>) : (<button onClick={() => fileInputRef.current.click()} className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition"><Icons.Camera /> Snap Photo of Spot</button>)}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8"><h3 className="font-bold text-stone-900 mb-4 text-xs uppercase tracking-wider">Order Summary</h3>
                    <div className="space-y-3">
                        {cart.map((item, idx) => (
                            <div key={item.cartId} className="flex justify-between items-start text-sm text-stone-600 border-b border-stone-50 pb-2">
                                <div className="flex-1">
                                    <span className="font-semibold text-stone-800">{item.name}</span>
                                    <span className="block text-xs text-stone-500 mt-0.5">{item.size}{item.milk !== '-' ? `, ${item.milk}` : ''}</span>
                                    {item.notes && <span className="block text-xs text-brand-orange italic mt-0.5">"{item.notes}"</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span>${item.price.toFixed(2)}</span>
                                    <button onClick={() => removeFromCart(item.cartId)} className="text-stone-300 hover:text-red-500 transition"><Icons.Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm text-brand-orange font-medium mt-4"><span>Curbside Convenience Fee</span><span>{displayFeeText}</span></div><div className="flex justify-between font-serif font-bold text-2xl text-brand-dark mt-4 pt-4 border-t border-stone-100"><span>Total</span><span>${finalTotal}</span></div></div>
                <div className="mb-6 p-4 bg-stone-100 rounded-xl border border-stone-200 text-sm flex gap-3 items-start"><input type="checkbox" id="refund-policy" className="mt-1 w-5 h-5 accent-brand-orange" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><div><label htmlFor="refund-policy" className="text-stone-600">I agree to be curbside within 10 minutes. I accept the </label><button onClick={() => setShowTerms(true)} className="text-brand-orange font-bold hover:underline">Terms & Conditions</button><label className="text-stone-600"> (No Refunds for late arrivals).</label></div></div>
                <div className="mb-6 text-xs text-stone-500 text-center italic">Payment is processed securely <strong>only after</strong> the cafe accepts your order.</div>
                <button disabled={!agreed} onClick={() => onSubmit({ pickupType, customTime, details, carPhoto, saveProfile })} className="w-full bg-brand-dark text-white py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-stone-800 transform active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Icons.ChevronRight /> Pay & Pull Up</button>
                {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
            </div>
        </div>
    );
};

const CafeAdmin = ({ orders, updateOrderStatus, setView, rejectOrder, curbsideFee, setCurbsideFee, menu, setMenu, isPromoActive, setIsPromoActive, isLoyaltyActive, setIsLoyaltyActive, autoSurge, setAutoSurge, audioEnabled, setAudioEnabled, addonPrices, setAddonPrices, completedOrders, archiveOrder, customerRatings, addCustomerRating }) => {
    const [adminTab, setAdminTab] = useState('orders'); 
    const [historyView, setHistoryView] = useState('daily');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [showContract, setShowContract] = useState(false);
    const [orderLimitType, setOrderLimitType] = useState('unlimited');
    const [maxOrdersPerWindow, setMaxOrdersPerWindow] = useState(5);
    const [timeWindowMins, setTimeWindowMins] = useState(15);
    const [botChat, setBotChat] = useState([{ type: 'bot', text: 'Hi! I am your Instant Partner Support. Ask me anything about fees, menu setup, or hardware.' }]);
    const [botInput, setBotInput] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null); 
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
    
    // New state for editing & rejection
    const [editingItem, setEditingItem] = useState(null);
    const [ratingOrder, setRatingOrder] = useState(null);
    const [rejectingOrder, setRejectingOrder] = useState(null);

    const [newItem, setNewItem] = useState({ name: '', desc: '', price: '', img: null });
    const fileInputRef = useRef(null);

    // -- NOTIFICATION LOGIC --
    const [lastOrderCount, setLastOrderCount] = useState(orders.length);
    const [urgentMode, setUrgentMode] = useState(false);

    useEffect(() => {
        if (orders.length > lastOrderCount) {
            if (audioEnabled) playNotificationSound('normal');
            setLastOrderCount(orders.length);
        }
    }, [orders, lastOrderCount, audioEnabled]);

    useEffect(() => {
        const interval = setInterval(() => {
            const hasUrgent = orders.some(o => o.status === 'pending'); // Mock urgency
            if (hasUrgent && audioEnabled) {
                setUrgentMode(true);
                if (Math.random() > 0.7) playNotificationSound('urgent');
            } else {
                setUrgentMode(false);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [orders, audioEnabled]);

    const handleBotSubmit = (e) => { e.preventDefault(); if(!botInput.trim()) return; handleBotQuestion(botInput); setBotInput(''); };
    const handleBotQuestion = (question) => {
        setBotChat(prev => [...prev, { type: 'user', text: question }]);
        const q = question.toLowerCase();
        setTimeout(() => {
            let answer = "";
            const knowledgeBase = [
                { keywords: ["fee", "price", "cost", "commission", "split", "charge", "rate"], text: "We operate on a dynamic 'Curbside Fee' model. You set the fee (e.g., $2.00). Standard commission is 80/20 (you keep 80%). During 'Surge' pricing (fees > $3.00), the split adjusts to cover server load. You keep 100% of your product revenue." },
                { keywords: ["menu", "add item", "edit", "change price", "upload", "photo", "delete", "remove"], text: "Manage your menu in the 'Settings' tab. You can add items, upload photos, and edit descriptions. Use the 'Edit' (pencil) button to change base prices. Items can be 'soft deleted' (hidden) and restored later. Use 'Global Add-on Pricing' in Settings for extra shots, milk, and size upgrades." },
                { keywords: ["sound", "noise", "alert", "chime", "notification", "volume", "urgent"], text: "The portal uses browser audio for alerts. You'll hear a chime for new orders. If an order sits in 'Pending' for over 10 seconds, the chime repeats and the order card pulses red (Urgent Mode). You can toggle sound on/off in the Settings tab." },
                { keywords: ["history", "report", "past orders", "email", "export", "csv", "daily", "weekly"], text: "Completed orders can be archived to the 'History' tab. You can view them by Daily, Weekly, or Monthly folders. Click 'Email Daily Report' in the History tab to get a CSV export sent directly to your inbox." },
                { keywords: ["customer", "rating", "rate", "flag", "karen", "bad customer", "thumbs"], text: "You can rate customers internally. Click 'Rate Customer' on a completed order to give a Thumbs Up/Down and a private note. If they order again, a 'STAFF NOTE' alert will appear on their order card. We also auto-flag certain profiles based on behavior." },
                { keywords: ["hardware", "ipad", "tablet", "phone", "device", "printer", "pos"], text: "No specific hardware is required! Pull Up Coffee runs entirely in your web browser. It works great on any iPad, Android tablet, or smartphone you already have in the cafe." },
                { keywords: ["setup", "start", "join", "contract", "sign up", "register"], text: "Joining is easy. There are no lock-in contracts. You can toggle your status Online/Offline anytime. Check the 'Partner Hub' tab for the agreement draft or email Steven to get your location activated." },
                { keywords: ["gay", "stupid", "idiot", "hate", "love you", "marry me", "robot", "fake", "dumb"], text: "I am a virtual assistant designed to help you run your Pull Up Coffee operations efficiently. Let's keep the focus on making your business successful. Do you have a question about the platform?" },
                { keywords: ["refund", "cancel", "money back"], text: "Refunds are at your discretion. If a customer cancels before you accept, the transaction is voided automatically. If you need to refund a completed order, please contact support." },
                { keywords: ["size", "medium", "large", "extra shot", "milk", "syrup"], text: "You can set global pricing for add-ons like Alternative Milk, Syrups, Extra Shots, and Size Upgrades (Medium/Large) in the 'Settings' tab under 'Global Add-on Pricing'. This applies to all relevant menu items." }
            ];
            const bestMatch = knowledgeBase.find(topic => topic.keywords.some(k => q.includes(k)));
            answer = bestMatch ? bestMatch.text : `I'm not 100% sure about that specific detail yet. To get the most accurate answer, please reach out to our founder directly at ${CONTACT_EMAIL}.`;
            setBotChat(prev => [...prev, { type: 'bot', text: answer }]);
        }, 600);
    };

    const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewItem(prev => ({ ...prev, img: reader.result })); }; reader.readAsDataURL(file); } };
    const handleAddItem = () => {
        if (!newItem.name || !newItem.price) { alert("Name and Price are required."); return; }
        const item = { id: Date.now(), name: newItem.name, desc: newItem.desc || 'Freshly added item.', price: parseFloat(newItem.price), img: newItem.img || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80', active: true };
        setMenu([...menu, item]); setNewItem({ name: '', desc: '', price: '', img: null });
    };
    const toggleItemStatus = (id) => { setMenu(menu.map(m => m.id === id ? { ...m, active: !m.active } : m)); };
    const saveEditedItem = (updatedItem) => { setMenu(menu.map(m => m.id === updatedItem.id ? updatedItem : m)); setEditingItem(null); };
    const saveRating = (ratingData) => { addCustomerRating(ratingOrder.plate, ratingData); setRatingOrder(null); alert("Confidential rating saved."); };
    const notifyCustomer = (msg) => { alert(`SIMULATED SMS TO CUSTOMER:\n"${msg}"`); };
    const getNextStatus = (currentStatus) => { const flow = ['pending', 'accepted', 'preparing', 'delivering', 'completed']; const idx = flow.indexOf(currentStatus); return idx < flow.length - 1 ? flow[idx + 1] : 'completed'; };
    const getButtonText = (status) => { switch(status) { case 'pending': return 'Accept Order'; case 'accepted': return 'Start Making'; case 'preparing': return 'Run to Car'; case 'delivering': return 'Complete Order'; default: return 'Completed'; } };
    
    // Rejection Handler
    const handleRejectClick = (orderId) => {
        setRejectingOrder(orderId);
    };
    const confirmReject = (reason) => {
        rejectOrder(rejectingOrder, reason);
        setRejectingOrder(null);
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col p-6 animate-fade-in relative">
            <div className="max-w-5xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-stone-200">
                    <div className="text-center md:text-left mb-4 md:mb-0"><h2 className="text-3xl font-serif font-bold text-brand-dark flex items-center gap-2"><span className={`text-4xl ${isOnline ? 'text-green-500' : 'text-red-500'}`}>●</span> Owner Portal</h2><p className="text-stone-500 mt-1">Grounds Keeper Willie (Demo Mode)</p></div>
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4"><button onClick={() => setAdminTab('orders')} className={`px-4 md:px-6 py-2 rounded-full font-bold transition ${adminTab === 'orders' ? 'bg-brand-dark text-white shadow-lg' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>Live Orders</button><button onClick={() => setAdminTab('history')} className={`px-4 md:px-6 py-2 rounded-full font-bold transition ${adminTab === 'history' ? 'bg-brand-dark text-white shadow-lg' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>History</button><button onClick={() => setAdminTab('settings')} className={`px-4 md:px-6 py-2 rounded-full font-bold transition ${adminTab === 'settings' ? 'bg-brand-dark text-white shadow-lg' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>Settings</button><button onClick={() => setAdminTab('partner')} className={`px-4 md:px-6 py-2 rounded-full font-bold transition ${adminTab === 'partner' ? 'bg-brand-dark text-white shadow-lg' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>Partner Hub</button><button onClick={() => setView('logout')} className="px-6 py-2 text-stone-400 hover:text-red-500 font-medium">Log Out</button></div>
                </div>
                {adminTab === 'orders' && (
                    <div className="animate-fade-in">
                        {urgentMode && <div className="bg-red-500 text-white text-center py-2 mb-4 rounded-xl font-bold animate-pulse">ACTION REQUIRED: NEW ORDERS PENDING</div>}
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {orders.length === 0 ? <div className="col-span-full py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-white"><div className="text-stone-300 mb-4 scale-150 inline-block"><Icons.Coffee /></div><h3 className="font-bold text-stone-400 text-lg">No Active Orders</h3><p className="text-stone-400 text-sm">Status: <span className={isOnline ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span> & Waiting</p></div> : 
                                orders.map(o => {
                                    const rating = customerRatings[o.plate];
                                    return (
                                        <div key={o.id} className={`bg-white p-6 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden group hover:shadow-md transition cursor-pointer ${o.status === 'rejected' ? 'opacity-50 grayscale' : ''} ${o.status === 'pending' && urgentMode ? 'ring-2 ring-red-400 animate-pulse-fast' : ''}`} onClick={(e) => { if(e.target.tagName !== 'BUTTON') setSelectedOrder(o); }}>
                                            {o.isFlagged && <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 absolute top-0 left-0 rounded-br-lg z-10">⚠️ FLAGGED CUSTOMER</div>}
                                            {rating && (
                                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold z-10 rounded-bl-xl border-l border-b ${rating.thumbs === 'up' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                    STAFF NOTE: {rating.thumbs === 'up' ? '👍' : '👎'} "{rating.note}"
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-4 mt-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-brand-dark">{o.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-stone-500 font-mono text-xs bg-stone-100 px-2 py-0.5 rounded">{o.plate}</span>
                                                        <span className="text-xs bg-brand-orange/10 text-brand-orange px-1 rounded font-bold">Frequent</span>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${o.status === 'pending' ? 'bg-brand-orange text-white' : 'bg-stone-100 text-stone-600'}`}>{o.status.toUpperCase()}</span>
                                            </div>
                                            <div className="mb-4"><p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pickup: <span className="text-brand-dark text-base">{o.pickupTime}</span></p></div>
                                            {o.locationDetails && <div className="bg-stone-50 p-3 rounded-lg mb-4 text-sm text-stone-600 border-l-2 border-brand-orange line-clamp-2">"{o.locationDetails}"</div>}
                                            <div className="bg-stone-50 p-4 rounded-xl mb-4 space-y-2">{o.items.map((i, idx) => (<div key={idx} className="flex justify-between text-sm font-medium text-stone-700 border-b border-stone-100 last:border-0 pb-1 last:pb-0"><span>1x {i.name}</span><span className="text-stone-400 text-xs self-center">{i.size || i.prep || i.beanWeight}</span></div>))}</div>
                                            
                                            <p className="text-center text-[10px] text-stone-300 mb-2">Click card for photo & details</p>

                                            {o.status !== 'completed' && o.status !== 'rejected' && (
                                                <div className="space-y-2">
                                                    <button onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, getNextStatus(o.status)); }} className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-stone-800 transition shadow-lg">{getButtonText(o.status)}</button>
                                                    {o.status === 'pending' && <button onClick={(e) => { e.stopPropagation(); handleRejectClick(o.id); }} className="w-full py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition text-sm">Reject Order</button>}
                                                    <button onClick={(e) => { e.stopPropagation(); notifyCustomer("Sorry, we are running 5 minutes behind!"); }} className="w-full py-2 bg-stone-100 text-stone-500 rounded-xl font-bold hover:bg-stone-200 transition text-sm flex items-center justify-center gap-2"><Icons.Alert /> Notify Delay</button>
                                                </div>
                                            )}
                                            {o.status === 'completed' && (
                                                <div className="space-y-2">
                                                    <button onClick={(e) => { e.stopPropagation(); archiveOrder(o.id); }} className="w-full py-2 bg-stone-800 text-white rounded-xl font-bold hover:bg-black transition text-sm flex items-center justify-center gap-2"><Icons.Archive /> Archive to History</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setRatingOrder(o); }} className="w-full py-2 bg-stone-100 text-stone-500 rounded-xl font-bold hover:bg-stone-200 transition text-sm flex items-center justify-center gap-2"><Icons.Star /> Rate Customer (Staff)</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}
                {adminTab === 'history' && (
                    <div className="animate-fade-in bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-brand-dark">Order History</h3>
                            <button onClick={() => setShowEmailModal(true)} className="text-sm font-bold text-brand-orange hover:underline flex items-center gap-2"><Icons.Mail /> Email Daily Report</button>
                        </div>
                        <div className="flex gap-2 mb-6">
                            {['daily', 'weekly', 'monthly'].map(v => (
                                <button key={v} onClick={() => setHistoryView(v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm capitalize transition ${historyView === v ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                                    <Icons.Folder /> {v}
                                </button>
                            ))}
                        </div>
                        {completedOrders.length === 0 ? <p className="text-stone-400 text-center py-10">No archived orders yet.</p> : (
                            <div className="space-y-4">
                                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Current {historyView} Folder</div>
                                {completedOrders.map(o => (
                                    <div key={o.id} onClick={() => setSelectedHistoryOrder(o)} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition">
                                        <div>
                                            <span className="font-bold text-brand-dark">{o.name}</span> <span className="text-stone-400 text-sm">({o.plate})</span>
                                            <div className="text-xs text-stone-500 mt-1">{o.timestamp} • ${o.total}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">COMPLETED</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {adminTab === 'settings' && (
                    <div className="animate-fade-in bg-white rounded-3xl p-8 shadow-sm border border-stone-100 max-w-2xl mx-auto space-y-8">
                        <h3 className="font-bold text-xl mb-6 text-brand-dark">Store Configuration</h3>
                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"><div><span className="font-bold block">Service Status</span><span className={`text-xs font-bold ${isOnline ? 'text-green-600' : 'text-red-500'}`}>{isOnline ? '● ONLINE' : '● OFFLINE'}</span></div><div onClick={() => setIsOnline(!isOnline)} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-300 ${isOnline ? 'left-7' : 'left-1'}`}></div></div></div>
                        
                        <div className="pt-6 border-t border-stone-100">
                            <h4 className="font-bold text-sm text-stone-500 uppercase tracking-wider mb-4">Order Pacing</h4>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <div className="flex gap-2 mb-4">
                                    <button onClick={() => setOrderLimitType('unlimited')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${orderLimitType === 'unlimited' ? 'bg-brand-dark text-white shadow-lg ring-2 ring-brand-dark ring-offset-2' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'}`}><Icons.TrendingUp /> Unlimited</button>
                                    <button onClick={() => setOrderLimitType('limited')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${orderLimitType === 'limited' ? 'bg-brand-dark text-white shadow-lg ring-2 ring-brand-dark ring-offset-2' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'}`}><Icons.Clock /> Limit Flow</button>
                                </div>
                                {orderLimitType === 'limited' && (
                                    <div className="animate-fade-in bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                                        <div className="flex items-end gap-4">
                                            <div className="flex-1"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Max Orders</label><input type="number" min="1" value={maxOrdersPerWindow} onChange={(e) => setMaxOrdersPerWindow(parseInt(e.target.value) || 1)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-brand-orange outline-none" /></div>
                                            <div className="text-stone-400 font-bold pb-4">per</div>
                                            <div className="flex-1"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Time Window</label><select value={timeWindowMins} onChange={(e) => setTimeWindowMins(parseInt(e.target.value))} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-center font-bold text-sm focus:ring-2 focus:ring-brand-orange outline-none appearance-none"><option value={10}>10 Mins</option><option value={15}>15 Mins</option><option value={30}>30 Mins</option><option value={60}>60 Mins</option></select></div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-stone-100 text-center"><p className="text-xs text-brand-orange font-medium">System will auto-reject orders after <strong>{maxOrdersPerWindow}</strong> received in <strong>{timeWindowMins}m</strong>.</p></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-stone-100">
                             <h4 className="font-bold text-sm text-stone-500 uppercase tracking-wider mb-4">Dynamic Pricing</h4>
                             
                             {/* Manual Fee Control */}
                             <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-brand-dark">Base Curbside Fee</label>
                                    <span className="text-xl font-bold text-brand-orange">${curbsideFee.toFixed(2)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="10" 
                                    step="0.50" 
                                    value={curbsideFee} 
                                    onChange={(e) => setCurbsideFee(parseFloat(e.target.value))}
                                    className="w-full accent-brand-orange h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-stone-400 mt-2 font-mono">
                                    <span>$0.00</span>
                                    <span>$5.00</span>
                                    <span>$10.00</span>
                                </div>
                             </div>

                             {/* Automation Toggle */}
                             <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                                 <div>
                                     <span className="font-bold block text-brand-dark">Surge Automation</span>
                                     <span className="text-xs text-stone-500">Auto-adjust fee based on demand</span>
                                 </div>
                                 <div onClick={() => setAutoSurge(!autoSurge)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${autoSurge ? 'bg-brand-orange' : 'bg-stone-300'}`}>
                                     <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-300 ${autoSurge ? 'left-7' : 'left-1'}`}></div>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="pt-6 border-t border-stone-100">
                            <h4 className="font-bold text-sm text-stone-500 uppercase tracking-wider mb-4">Global Add-on Pricing</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200"><label className="text-xs font-bold text-stone-400 block mb-1">Alt Milk ($)</label><input type="number" step="0.10" value={addonPrices.milk} onChange={(e) => setAddonPrices({...addonPrices, milk: parseFloat(e.target.value)})} className="w-full p-1 bg-white border rounded text-center font-bold" /></div>
                                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200"><label className="text-xs font-bold text-stone-400 block mb-1">Syrup ($)</label><input type="number" step="0.10" value={addonPrices.syrup} onChange={(e) => setAddonPrices({...addonPrices, syrup: parseFloat(e.target.value)})} className="w-full p-1 bg-white border rounded text-center font-bold" /></div>
                                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200"><label className="text-xs font-bold text-stone-400 block mb-1">Medium Size ($)</label><input type="number" step="0.10" value={addonPrices.medium} onChange={(e) => setAddonPrices({...addonPrices, medium: parseFloat(e.target.value)})} className="w-full p-1 bg-white border rounded text-center font-bold" /></div>
                                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200"><label className="text-xs font-bold text-stone-400 block mb-1">Large Size ($)</label><input type="number" step="0.10" value={addonPrices.large} onChange={(e) => setAddonPrices({...addonPrices, large: parseFloat(e.target.value)})} className="w-full p-1 bg-white border rounded text-center font-bold" /></div>
                                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200"><label className="text-xs font-bold text-stone-400 block mb-1">Extra Shot ($)</label><input type="number" step="0.10" value={addonPrices.extraShot} onChange={(e) => setAddonPrices({...addonPrices, extraShot: parseFloat(e.target.value)})} className="w-full p-1 bg-white border rounded text-center font-bold" /></div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-stone-100">
                            <h4 className="font-bold text-sm text-stone-500 uppercase tracking-wider mb-4">Notification Sound</h4>
                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                                <div className="flex items-center gap-3">{audioEnabled ? <Icons.Volume /> : <Icons.VolumeX />}<span className="text-sm font-medium">Order Chime</span></div>
                                <div className="flex gap-2"><button onClick={() => playNotificationSound('normal')} className="text-xs bg-white px-2 py-1 border rounded hover:bg-stone-100">Test</button><div onClick={() => setAudioEnabled(!audioEnabled)} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${audioEnabled ? 'bg-brand-orange' : 'bg-stone-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-300 ${audioEnabled ? 'left-5' : 'left-1'}`}></div></div></div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-stone-100">
                            <h4 className="font-bold text-sm text-stone-500 uppercase tracking-wider mb-4">Menu Management</h4>
                            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                                {menu.filter(m => m.active).map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg border border-stone-100">
                                        <div className="flex items-center gap-3"><img src={item.img} alt={item.name} className="w-10 h-10 rounded-md object-cover" /><span className="font-medium text-sm text-brand-dark">{item.name} (${item.price.toFixed(2)})</span></div>
                                        <div className="flex gap-2"><button onClick={() => setEditingItem(item)} className="text-stone-400 hover:text-brand-orange p-2 rounded hover:bg-orange-50 transition" title="Edit Item"><Icons.Edit /></button><button onClick={() => toggleItemStatus(item.id)} className="text-stone-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition" title="Hide Item"><Icons.Trash2 /></button></div>
                                    </div>
                                ))}
                            </div>
                            {menu.some(m => !m.active) && (
                                <div className="mb-6 opacity-60"><h5 className="text-xs font-bold text-stone-400 mb-2">Hidden / Removed Items</h5><div className="space-y-2">{menu.filter(m => !m.active).map(item => (<div key={item.id} className="flex justify-between items-center p-2 bg-stone-100 rounded-lg border border-dashed border-stone-200"><span className="text-sm text-stone-500 line-through">{item.name}</span><button onClick={() => toggleItemStatus(item.id)} className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-100" title="Restore Item"><Icons.RefreshCw size={16}/></button></div>))}</div></div>
                            )}
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200"><p className="text-xs font-bold text-brand-dark uppercase mb-3">Add New Item</p><div className="space-y-3"><input type="text" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 text-sm border rounded-lg" /><div className="flex gap-2"><input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-24 p-2 text-sm border rounded-lg" /><input type="text" placeholder="Description" value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} className="flex-1 p-2 text-sm border rounded-lg" /></div><div className="flex gap-2"><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} /><button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 border border-dashed border-stone-300 rounded-lg text-xs font-bold text-stone-500 hover:bg-white transition flex items-center justify-center gap-2"><Icons.Upload /> {newItem.img ? 'Image Selected' : 'Upload Photo'}</button><button onClick={handleAddItem} className="bg-brand-dark text-white px-6 rounded-lg text-xs font-bold hover:bg-stone-800 transition">Add Item</button></div></div></div>
                        </div>
                        {/* ... Other settings ... */}
                    </div>
                )}
                {adminTab === 'partner' && (
                    <div className="animate-fade-in bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-stone-100">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-12 bg-stone-900 rounded-2xl p-6 text-white shadow-2xl border border-stone-700">
                                <div className="flex items-center gap-3 border-b border-stone-700 pb-4 mb-4"><div className="bg-brand-orange p-2 rounded-lg text-white animate-pulse"><Icons.Robot /></div><div><h3 className="font-bold">Instant Partner Support</h3><p className="text-xs text-stone-400">Ask me anything. Type below.</p></div></div>
                                <div className="h-48 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin">{botChat.map((msg, idx) => (<div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.type === 'user' ? 'bg-brand-orange text-white rounded-br-none' : 'bg-stone-800 text-stone-200 rounded-bl-none'}`}>{msg.text}</div></div>))}</div>
                                <form onSubmit={handleBotSubmit} className="flex gap-2"><input type="text" value={botInput} onChange={e => setBotInput(e.target.value)} placeholder="Type a question (e.g. Fees, Menu update...)" className="flex-1 bg-stone-800 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-brand-orange placeholder-stone-500" /><button type="submit" className="bg-brand-orange p-3 rounded-xl text-white hover:bg-orange-600 transition"><Icons.Send /></button></form>
                            </div>
                            <div className="bg-brand-dark text-white rounded-2xl p-8 border border-stone-800 text-center"><h3 className="font-bold text-2xl mb-4">Join the Virtual Drive-Thru Revolution</h3><p className="text-stone-300 mb-8 max-w-xl mx-auto">Early adopters get lifetime lower commission rates and priority placement. Ready to serve the "parents in cars" market?</p><a href={`mailto:${CONTACT_EMAIL}?subject=Partnership Inquiry`} className="bg-white text-brand-dark px-10 py-5 rounded-2xl font-bold hover:bg-stone-200 transition inline-flex items-center gap-3"><Icons.Mail /> Email Founder directly</a><p className="text-[10px] text-stone-500 mt-6 tracking-widest uppercase">STEVEN WEIR • {CONTACT_EMAIL}</p></div>
                        </div>
                    </div>
                )}
                {showContract && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"><div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl h-[80vh] flex flex-col"><div className="p-6 border-b border-stone-200 flex justify-between items-center"><div><h3 className="font-serif font-bold text-2xl text-brand-dark">Partnership Agreement</h3><p className="text-stone-500 text-sm uppercase tracking-widest">Sample Draft</p></div><button onClick={() => setShowContract(false)} className="p-2 hover:bg-stone-100 rounded-full"><Icons.X /></button></div><div className="p-8 overflow-y-auto font-serif leading-relaxed text-stone-700 space-y-6"><div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-sans mb-6"><strong>Note:</strong> This is a standard non-exclusive agreement. You retain full ownership of your brand and customer relationships.</div><section><h4 className="font-bold text-lg text-brand-dark mb-2">1. The Service</h4><p>Pull Up Coffee ("Platform") provides a technology interface connecting Cafe Partners ("You") with customers in vehicles. We handle the ordering, payment processing, and geolocation notification.</p></section><section><h4 className="font-bold text-lg text-brand-dark mb-2">2. Fee Structure & Payments</h4><ul className="list-disc pl-5 space-y-1"><li><strong>Product Revenue:</strong> You receive 100% of the listed price for all food and beverage items.</li><li><strong>Platform Fee:</strong> The customer pays a "Curbside Fee". You keep **80%** of this fee. The Platform retains 20%. *Note: Commission percentages scale dynamically during high-volume Surge Pricing to support infrastructure.*</li><li><strong>Payouts:</strong> All payments are processed via Stripe Connect. Funds are settled to your nominated bank account daily (T+2 rolling basis).</li></ul></section><section><h4 className="font-bold text-lg text-brand-dark mb-2">3. Obligations</h4><p>You agree to prepare orders promptly upon acceptance and deliver them to the customer's vehicle curbside in a safe manner. You maintain the right to refuse service or toggle "Offline" at any time.</p></section><section><h4 className="font-bold text-lg text-brand-dark mb-2">4. Termination</h4><p>This agreement is "at-will". You may cancel your partnership at any time with 24 hours written notice. There are no lock-in contracts or exit fees.</p></section></div><div className="p-6 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex justify-end gap-3"><button onClick={() => setShowContract(false)} className="px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-200 transition">Close</button><button className="px-6 py-3 rounded-xl font-bold bg-brand-dark text-white shadow-lg hover:bg-stone-800 transition">Sign & Join</button></div></div></div>
                )}
                <OrderDetailsModal order={selectedOrder || selectedHistoryOrder} onClose={() => { setSelectedOrder(null); setSelectedHistoryOrder(null); }} />
                {editingItem && <EditItemModal item={editingItem} onSave={saveEditedItem} onClose={() => setEditingItem(null)} />}
                {ratingOrder && <RateCustomerModal order={ratingOrder} onSave={saveRating} onClose={() => setRatingOrder(null)} />}
                {showEmailModal && <EmailReportModal onClose={() => setShowEmailModal(false)} onSend={(email) => { alert(`Report for ${historyView} sent to ${email}`); setShowEmailModal(false); }} />}
                {rejectingOrder && <RejectionReasonModal onConfirm={confirmReject} onClose={() => setRejectingOrder(null)} />}
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('landing');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [cart, setCart] = useState([]);
    const [orders, setOrders] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [userProfile, setUserProfile] = useState({ name: '', carModel: '', carColor: '', plate: '' });
    const [addonPrices, setAddonPrices] = useState({ milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 });
    const [curbsideFee, setCurbsideFee] = useState(2.00);
    const [menu, setMenu] = useState(DEFAULT_MENU);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [customerRatings, setCustomerRatings] = useState({});
    
    // New States for Settings
    const [isPromoActive, setIsPromoActive] = useState(false);
    const [isLoyaltyActive, setIsLoyaltyActive] = useState(false);
    const [autoSurge, setAutoSurge] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    
    // New: State for Legal Modal
    const [showLegal, setShowLegal] = useState(false);

    // --- FIREBASE LIVE LISTENER ---
    useEffect(() => {
        if (!db) return; // Skip if Firebase isn't configured
        const q = query(collection(db, "orders"), orderBy("realTimestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(liveOrders);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handlePopState = (event) => { if (event.state && event.state.view) { setView(event.state.view); } else { setView('landing'); } };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setIsAuthenticated(false);
                setShowWelcome(false);
                setView('landing');
            }, 33 * 60 * 1000); // 33 mins
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            clearTimeout(timer);
        };
    }, []);

    const handleLogout = () => {
        setIsAuthenticated(false);
        setShowWelcome(false);
        setView('landing'); 
    };
    
    const handleUnlock = () => {
        setIsAuthenticated(true);
        setShowWelcome(true);
    };
    
    const handleStartDemo = () => {
        setShowWelcome(false);
    };

    const navigate = (newView) => { 
        if (newView === 'logout') {
            handleLogout();
            return;
        }
        window.history.pushState({ view: newView }, '', `#${newView}`); 
        setView(newView); 
    };
    
    const getSubtotal = () => cart.reduce((sum, item) => sum + item.price, 0);
    const getTotal = () => {
        let fee = curbsideFee;
        if (isPromoActive) fee = 0;
        else if (isLoyaltyActive && fee > 1) fee = 1.00;
        return (getSubtotal() + fee).toFixed(2);
    };
    
    const addToCart = (customizedItem) => { setCart([...cart, { ...customizedItem, cartId: Math.random() }]); };
    
    const removeFromCart = (cartId) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    // --- FIREBASE SAVE NEW ORDER ---
    const placeOrder = async (extraDetails) => {
        if (!userProfile.name || !userProfile.carModel || !userProfile.carColor) { alert("Please fill in all details!"); return; }
        const pickupTime = extraDetails.pickupType === 'ASAP' ? 'ASAP' : extraDetails.customTime;
        const timestamp = new Date();

        const newOrder = { 
            name: userProfile.name,
            carModel: userProfile.carModel,
            carColor: userProfile.carColor,
            plate: userProfile.plate,
            mobile: userProfile.mobile || '',
            items: cart, 
            total: getTotal(), 
            status: 'pending', 
            locationId: selectedLocation ? selectedLocation.id : 1, 
            timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            realTimestamp: timestamp.getTime(),
            pickupTime: pickupTime, 
            locationDetails: extraDetails.details, 
            photo: extraDetails.carPhoto || null, 
            isFlagged: userProfile.name.toLowerCase() === 'karen' 
        };
        
        try {
            if (db) {
                const docRef = await addDoc(collection(db, "orders"), newOrder);
                setCurrentOrderId(docRef.id);
            } else {
                // Fallback for visual demo if Firebase isn't connected
                const mockId = Math.random().toString();
                setOrders([ { ...newOrder, id: mockId }, ...orders ]);
                setCurrentOrderId(mockId);
            }
            setCart([]);
            navigate('success');
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Error sending order. Please try again.");
        }
    };

    // --- FIREBASE UPDATE STATUS ---
    const updateOrderStatus = async (id, newStatus) => { 
        if (db) {
            try { await updateDoc(doc(db, "orders", id), { status: newStatus }); } catch (e) { console.error(e); }
        } else {
            setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
        }
    };
    
    // --- FIREBASE REJECT ORDER ---
    const rejectOrder = async (id, reason) => { 
        if (db) {
            try { await updateDoc(doc(db, "orders", id), { status: 'rejected', rejectionReason: reason }); } catch (e) { console.error(e); }
        } else {
            setOrders(orders.map(o => o.id === id ? { ...o, status: 'rejected', rejectionReason: reason } : o));
        }
    };

    // --- FIREBASE ARCHIVE ---
    const archiveOrder = async (id) => {
        const orderToArchive = orders.find(o => o.id === id);
        if(orderToArchive) {
            setCompletedOrders([orderToArchive, ...completedOrders]);
            if (db) {
                try { await deleteDoc(doc(db, "orders", id)); } catch(e) { console.error(e); }
            } else {
                setOrders(orders.filter(o => o.id !== id));
            }
        }
    };

    const addCustomerRating = (plate, rating) => {
        setCustomerRatings({ ...customerRatings, [plate]: rating });
    };

    const renderView = () => {
        if (!isAuthenticated) return <LockScreen onUnlock={handleUnlock} />;
        if (showWelcome) return <WelcomeModal onStart={handleStartDemo} />;
        if (showLegal) return <IPRegistryModal onClose={() => setShowLegal(false)} />;
        
        if (view === 'landing') return <LandingPage setView={navigate} onOpenLegal={() => setShowLegal(true)} />;
        if (view === 'location-select') return <LocationSelect setView={navigate} setSelectedLocation={setSelectedLocation} isPromoActive={isPromoActive} userProfile={userProfile} />;
        
        if (view === 'cafe-login') return isAuthenticated ? <CafeAdmin orders={orders} updateOrderStatus={updateOrderStatus} setView={navigate} rejectOrder={rejectOrder} curbsideFee={curbsideFee} setCurbsideFee={setCurbsideFee} menu={menu} setMenu={setMenu} isPromoActive={isPromoActive} setIsPromoActive={setIsPromoActive} isLoyaltyActive={isLoyaltyActive} setIsLoyaltyActive={setIsLoyaltyActive} autoSurge={autoSurge} setAutoSurge={setAutoSurge} audioEnabled={audioEnabled} setAudioEnabled={setAudioEnabled} addonPrices={addonPrices} setAddonPrices={setAddonPrices} completedOrders={completedOrders} archiveOrder={archiveOrder} customerRatings={customerRatings} addCustomerRating={addCustomerRating} /> : <LockScreen onUnlock={() => setIsAuthenticated(true)} />;
        
        if (view === 'customer') return <CustomerMenu selectedLocation={selectedLocation} menu={menu} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} setView={navigate} getTotal={getTotal} addonPrices={addonPrices} />;
        if (view === 'checkout') return <CheckoutForm user={userProfile} setUser={setUserProfile} onSubmit={placeOrder} onBack={() => navigate('customer')} cart={cart} removeFromCart={removeFromCart} total={getTotal()} curbsideFee={curbsideFee} isPromoActive={isPromoActive} isLoyaltyActive={isLoyaltyActive} />;
        if (view === 'success') {
            const currentOrder = orders.find(o => o.id === currentOrderId);
            return <SuccessScreen setView={navigate} userProfile={userProfile} currentOrder={currentOrder} />;
        }
        
        return <LandingPage setView={navigate} />;
    };

    return (
        <Fragment>
            <GlobalStyles />
            {renderView()}
        </Fragment>
    );
};

export default App;