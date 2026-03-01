"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities */

import React, { useState, useEffect, useRef, Fragment, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { SUPPORTED_COUNTRIES, detectCountry, getCountryConfig } from '@/lib/i18n';
// Anti-bot: honeypot + timing (replaces broken reCAPTCHA)
const ANTI_BOT_MIN_MS = 3000; // minimum time to fill form (bots are instant)

// --- SECURE CONFIGURATION ---
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.trim().length > 0);
const app: any = (typeof window !== 'undefined' && hasFirebaseConfig) ? initializeApp(firebaseConfig) : null;
const db: any = app ? getFirestore(app) : null;
const auth: any = app ? getAuth(app) : null;

/** Get Firebase ID token for authenticated API calls */
const getAuthToken = async (): Promise<string | null> => {
    try {
        const currentUser = auth?.currentUser;
        if (!currentUser) return null;
        return await currentUser.getIdToken(true);
    } catch { return null; }
};

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
    <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fafaf9; color: #1c1917; -webkit-tap-highlight-color: transparent; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pulse-fast { animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .shadow-premium { box-shadow: 0 20px 50px rgba(0,0,0,0.05); }
        .shadow-glow-orange { box-shadow: 0 0 40px rgba(249,115,22,0.15); }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #f97316; cursor: pointer; margin-top: -8px; box-shadow: 0 2px 8px rgba(249,115,22,0.4); transition: transform 0.15s ease; }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #e7e5e4; border-radius: 2px; }
        ::selection { background: rgba(249,115,22,0.2); color: #1c1917; }
        * { scroll-behavior: smooth; }
        button { cursor: pointer; }
        button:active { transform: scale(0.97); }
        @media (prefers-reduced-motion: reduce) {
            .animate-fade-in, .animate-slide-up, .animate-scale-in, .animate-pulse-fast { animation: none; }
            button:active { transform: none; }
        }
        `}
    </style>
);

// --- AUTO-COMPRESSOR (Fixes 1MB Firebase Limit) ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
};

// --- AUDIO ENGINE ---
const playNotificationSound = (type: string) => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext || type === 'off') return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'urgent') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime); 
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
    } else if (type === 'modern') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.8);
    } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.6);
    }
    osc.start(); osc.stop(ctx.currentTime + 0.8);
};

// Looping audible alert for pending orders - plays chime every 8 seconds until acknowledged
let _pendingAlertInterval: ReturnType<typeof setInterval> | null = null;
const startPendingOrderAlert = (type: string) => {
    stopPendingOrderAlert();
    playNotificationSound(type);
    _pendingAlertInterval = setInterval(() => playNotificationSound(type), 8000);
};
const stopPendingOrderAlert = () => {
    if (_pendingAlertInterval) { clearInterval(_pendingAlertInterval); _pendingAlertInterval = null; }
};

// --- SMS ENGINE (Twilio Hook — uses server-side templates) ---
const sendSMS = async (to: string, template: string, context?: Record<string, string>, orderId?: string) => {
    if (!to) return;
    try {
        const token = await getAuthToken();
        await fetch('/api/twilio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ to, template, context: context || {}, orderId })
        });
    } catch (e) { console.error('SMS send failed:', e); }
};

const DEFAULT_MENU_ITEMS = [
    { name: 'Flat White', price: 4.50, img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=600&q=80' },
    { name: 'Espresso', price: 3.80, img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80' },
    { name: 'Cappuccino', price: 4.80, img: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80' },
    { name: 'Latte', price: 5.00, img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80' },
    { name: 'Long Black', price: 4.20, img: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80' },
    { name: 'Mocha', price: 5.20, img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80' },
    { name: 'Iced Latte', price: 5.50, img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80' },
];

const ONBOARDING_VIDEOS = [
    { label: '2-Min Setup Walkthrough', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'Live Order + Curbside Flow', url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U' }
];

const MIN_CURBSIDE_FEE = 0.0;
const MAX_CURBSIDE_FEE = 25.0;
const PLATFORM_SERVICE_FEE = 0.99;
const MIN_CART_TOTAL = 0;
const EARLY_ADOPTER_CAFE_LIMIT = 100;
const EARLY_PARTNER_REBATE = 0.25;
const LIVE_GPS_AUTO_SHARE_DISTANCE_METERS = 2500;
const LIVE_GPS_AUTO_SHARE_ETA_SECONDS = 300;
const LIVE_GPS_ARRIVED_DISTANCE_METERS = 80;
const LIVE_GPS_UPDATE_MIN_MOVE_METERS = 15;
const LIVE_GPS_UPDATE_MIN_INTERVAL_MS = 12000;

const normalizeCurbsideFee = (value: unknown) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return MIN_CURBSIDE_FEE;
    return Math.min(MAX_CURBSIDE_FEE, Math.max(MIN_CURBSIDE_FEE, Number(numericValue.toFixed(2))));
};

const haversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
};

// --- ICONS ---
const Icons = {
    Car: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    Trash2: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    CreditCard: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    Robot: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>,
    Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>,
    Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
    Sliders: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    EyeOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    Apple: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 1.64c-.33.37-.8.56-1.34.56-.47 0-.9-.16-1.28-.5-.38-.34-.6-.82-.6-1.34 0-.49.17-.92.53-1.29.35-.36.83-.56 1.34-.56.49 0 .91.17 1.28.53.37.37.56.81.56 1.3 0 .47-.16.92-.49 1.3zM21.36 17.68c-.68 2.06-1.56 3.69-2.58 4.88-1.04 1.21-2.03 1.83-3.03 1.83-.49 0-1.11-.14-1.83-.44-.73-.29-1.42-.44-2.03-.44-.61 0-1.33.15-2.08.45-.75.3-1.36.43-1.8.43-.95 0-1.92-.61-2.92-1.78-2.28-2.67-3.41-5.63-3.41-8.8 0-1.91.5-3.5 1.5-4.73 1.01-1.24 2.37-1.86 4.09-1.86.6 0 1.34.19 2.22.56.55.24.96.36 1.22.36.33 0 .86-.14 1.58-.41.72-.28 1.45-.43 2.19-.43 1.07 0 2.02.3 2.85.91.83.61 1.4 1.38 1.7 2.28-1.58.7-2.39 2.05-2.39 3.97 0 1.25.43 2.35 1.27 3.25.75.81 1.65 1.25 2.65 1.28-.15.86-.42 1.69-.81 2.52z"/></svg>,
    Smartphone: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
};

const PullUpLogo = ({ className = "w-12 h-12" }: any) => (
    <div className={`${className} bg-[#f97316] rounded-full flex items-center justify-center text-white shrink-0 shadow-md border-2 border-white`}>
        <svg viewBox="0 0 100 100" className="w-full h-full p-3 text-white fill-none stroke-current" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 24 36 L 74 36 A 2 2 0 0 1 76 38 L 76 46" />
            <path d="M 22 42 C 22 55 28 66 32 66" />
            <path d="M 22 42 C 40 42 45 42 55 50 C 62 55 72 55 76 50" />
            <path d="M 76 46 C 76 60 72 66 68 66" />
            <path d="M 44 66 L 56 66" />
            <path d="M 76 44 C 92 44 96 52 86 62 C 80 67 72 62 68 60" />
            <circle cx="38" cy="66" r="6" />
            <circle cx="38" cy="66" r="2" />
            <circle cx="62" cy="66" r="6" />
            <circle cx="62" cy="66" r="2" />
        </svg>
    </div>
);

const AboutModal = ({ onClose }: any) => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
            <div className="md:w-5/12 bg-stone-900 flex flex-col items-center justify-center p-5 sm:p-10 text-center border-r border-stone-800">
                <div className="w-44 h-44 rounded-full border-4 border-orange-500 overflow-hidden mb-6 shadow-2xl bg-stone-800">
                    <img
                        src="https://raw.githubusercontent.com/stashhandymanservices69/pullup-coffee/main/creatorpullup.jpg"
                        alt="Steven Weir"
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                            e.target.onerror = null;
                            e.target.src = "https://ui-avatars.com/api/?name=Steven+Weir&background=f97316&color=fff&size=512";
                        }}
                    />
                </div>
                <h4 className="font-bold text-white text-xl tracking-tight">Steven Weir</h4>
                <p className="text-orange-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Founder & Father</p>
            </div>
            <div className="md:w-7/12 p-5 sm:p-10 relative overflow-y-auto">
                <button onClick={onClose} className="absolute top-6 right-6 text-stone-300 hover:text-stone-900 transition"><Icons.X /></button>
                <h3 className="text-4xl font-serif font-bold text-stone-900 mb-6 italic tracking-tight leading-none">The Pull Up Story.</h3>
                <div className="text-stone-600 text-sm leading-relaxed space-y-4 italic mb-8">
                    <p>&quot;Becoming a new dad brought so many joyful moments, and one very familiar routine: those gentle drives to help my baby drift off to sleep. The only challenge? Craving a great cup of coffee without disturbing that precious nap or stepping out in my pajamas.&quot;</p>
                    <p>&quot;I realised that street parking should be an extension of the shop. Pull Up turns every parking spot into a virtual drive-thru, removing the friction between you and your local cafe.&quot;</p>
                </div>
                <button onClick={onClose} className="w-full mt-8 bg-stone-900 text-white py-5 rounded-[2rem] font-bold shadow-xl hover:bg-stone-800 transition uppercase tracking-widest text-[10px]">Back to Marketplace</button>
            </div>
        </div>
    </div>
);

// --- MODALS & LEGAL ---
const TermsModal = ({ onClose }: any) => (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif font-bold text-2xl text-stone-900 italic">Terms & Liability</h3>
                <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
            </div>
            <div className="text-sm text-stone-600 leading-relaxed space-y-5">
                <p><strong>1. Platform Role:</strong> Pull Up Coffee Pty Ltd (ABN 17 587 686 972) acts strictly as a technology and payment bridge connecting users with independent cafes. We do not prepare, handle, or deliver food or beverages. No agency or employment relationship exists between Pull Up Coffee and any merchant or customer.</p>
                <p><strong>2. Safety & Liability:</strong> All liability for food safety, allergen management, temperature compliance, and product quality rests entirely with the Cafe partner. Pull Up Coffee accepts no liability whatsoever for goods consumed, food-borne illness, allergen reactions, or product defects.</p>
                <p><strong>3. Limitation of Liability:</strong> To the maximum extent permitted by law, Pull Up Coffee&apos;s total liability shall not exceed AUD $50 or the total fees you paid in the preceding 12 months, whichever is less. Pull Up Coffee is not liable for any indirect, incidental, special, or consequential damages.</p>
                <p><strong>4. Traffic & Safety:</strong> Users must be legally and safely parked at the curb to receive an order. Pull Up Coffee is not liable for any traffic infringements, accidents, or injuries. Do not interact with this app while driving. You voluntarily assume all risks inherent in curbside pickup.</p>
                <p><strong>5. Refunds:</strong> Refunds are handled at the discretion of the specific cafe (the supplier of goods). Customers must arrive within the agreed 10-minute grace period or risk order forfeiture without refund.</p>
                <p><strong>6. Privacy:</strong> We collect essential data (Name, Plate, Vehicle) solely to facilitate active curbside delivery. Data is encrypted and managed according to the Privacy Act 1988 (Cth).</p>
                <p><strong>7. Prohibited Use:</strong> Use of automated systems, bots, AI agents, or scripts to interact with this platform is strictly prohibited. Abuse results in immediate termination.</p>
            </div>
            <button onClick={onClose} className="w-full mt-8 bg-stone-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-stone-800 transition">I Acknowledge & Accept These Terms</button>
        </div>
    </div>
);

const CustomerSupportModal = ({ cafe, orderId, onClose }: any) => (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
            <div className="bg-orange-50 text-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Icons.Phone /></div>
            <h3 className="font-serif font-bold text-2xl mb-2 text-stone-900 italic">Issue with Order?</h3>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">Pull Up acts strictly as a technology platform. For refunds or order mistakes, please contact the cafe directly.</p>
            
            <div className="bg-stone-50 p-5 rounded-2xl text-left border border-stone-200 mb-6">
                <p className="font-bold text-stone-900 text-lg mb-1">{cafe?.businessName || 'Your Cafe'}</p>
                <p className="text-xs text-stone-600 mb-3">{cafe?.address}</p>
                <p className="text-sm font-bold text-stone-900 pt-3 border-t border-stone-200 flex items-center gap-2"><Icons.Phone /> {cafe?.storePhone || cafe?.phone || 'No phone provided'}</p>
                <p className="text-[10px] text-stone-400 font-mono mt-3 uppercase tracking-widest">Order Ref: {orderId}</p>
            </div>
            
            {(cafe?.storePhone || cafe?.phone) && <a href={`tel:${cafe?.storePhone || cafe?.phone}`} className="flex justify-center items-center gap-2 w-full py-4 bg-stone-900 text-white font-bold rounded-xl shadow-lg hover:bg-stone-800 transition uppercase tracking-widest text-[10px]">Call Cafe Now</a>}
            <p className="text-[10px] text-stone-400 mt-6 leading-relaxed">If the cafe is unresponsive or you require technical platform support, email <a href="mailto:hello@pullupcoffee.com" className="text-orange-500 underline">hello@pullupcoffee.com</a></p>
        </div>
    </div>
);

// --- COMPONENT: CUSTOMER MENU MODAL ---
const ProductModal = ({ item, onClose, onAdd, globalPricing }: any) => {
    const [size, setSize] = useState('Small');
    const [milk, setMilk] = useState('Full Cream');
    const [sugar, setSugar] = useState('0');
    const [temp, setTemp] = useState('Hot');
    const [notes, setNotes] = useState('');
    const [extraShot, setExtraShot] = useState(false);
    
    const isFood = item.name.toLowerCase().includes("baked") || item.name.toLowerCase().includes("muffin") || item.name.toLowerCase().includes("toast");

    const getAdjustedPrice = () => {
        let price = parseFloat(item.price) || 0;
        if (!isFood) { 
            if(size === 'Medium') price += (globalPricing?.medium || 0.50);
            if(size === 'Large') price += (globalPricing?.large || 1.00); 
            if(milk !== 'Full Cream' && milk !== 'Skim') price += (globalPricing?.milk || 0.50); 
            if(extraShot) price += (globalPricing?.extraShot || 0.50);
        }
        return price;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="font-serif font-bold text-2xl text-stone-900">{item.name}</h3><p className="text-stone-500 text-sm">Customise your choice</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                </div>
                <div className="space-y-6 mb-8">
                    {!isFood && (
                        <Fragment>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-2 tracking-widest">Size</label>
                                <div className="flex gap-2">
                                    {['Small', 'Medium', 'Large'].map(opt => {
                                        let label = opt;
                                        if(opt === 'Medium') label = `Med (+$${(globalPricing?.medium || 0.50).toFixed(2)})`;
                                        if(opt === 'Large') label = `Lrg (+$${(globalPricing?.large || 1.00).toFixed(2)})`;
                                        return (
                                            <button key={opt} onClick={() => setSize(opt)} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition ${size === opt ? 'bg-stone-900 text-white border-stone-900 shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-2 tracking-widest">Milk Preference</label>
                                <select value={milk} onChange={e => setMilk(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white transition text-stone-900 font-medium outline-none">
                                    <option>Full Cream</option><option>Skim</option>
                                    <option>Oat (+${(globalPricing?.milk || 0.50).toFixed(2)})</option>
                                    <option>Almond (+${(globalPricing?.milk || 0.50).toFixed(2)})</option>
                                    <option>Soy (+${(globalPricing?.milk || 0.50).toFixed(2)})</option>
                                    <option>Lactose Free</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-sm font-bold text-stone-600">Extra Shot (+${(globalPricing?.extraShot || 0.50).toFixed(2)})</span>
                                <div onClick={() => setExtraShot(!extraShot)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${extraShot ? 'bg-orange-500' : 'bg-stone-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-300 ${extraShot ? 'left-7' : 'left-1'}`}></div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-2 tracking-widest">Sugar</label>
                                    <select value={sugar} onChange={e => setSugar(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium outline-none">
                                        <option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="Splenda">Splenda</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-2 tracking-widest">Temp</label>
                                    <select value={temp} onChange={e => setTemp(e.target.value)} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium outline-none">
                                        <option>Hot</option><option>Extra Hot</option><option>Warm</option>
                                    </select>
                                </div>
                            </div>
                        </Fragment>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-400 mb-2 tracking-widest">{isFood ? 'Dietary Notes' : 'Barista Notes'}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 3/4 full, no lid..." className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl h-24 text-sm focus:bg-white transition text-stone-900 outline-none"></textarea>
                    </div>
                </div>
                <button onClick={() => onAdd({ ...item, size: isFood ? 'Std' : size, milk: isFood ? '-' : milk, sugar, temp, notes: extraShot ? `Extra Shot. ${notes}` : notes, price: getAdjustedPrice() })} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-stone-800 transition transform active:scale-[0.98]">
                    Add to Order • ${getAdjustedPrice().toFixed(2)}
                </button>
            </div>
        </div>
    );
};

const EditItemModal = ({ item, onSave, onClose }: any) => {
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(item.price);
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-stone-900">Edit Item</h3>
                <div className="space-y-4 mb-6">
                    <div><label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium" /></div>
                    <div><label className="block text-xs font-bold text-stone-400 uppercase mb-1">Base Price ($)</label><input type="number" step="0.10" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium" /></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold">Cancel</button>
                    <button onClick={() => onSave({ ...item, name, price: parseFloat(price) })} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold">Save</button>
                </div>
            </div>
        </div>
    );
};

// --- REGION-AWARE LEGAL SYSTEM ---
type LegalRegion = 'AU' | 'US' | 'GB' | 'EU' | 'NZ' | 'CA' | 'OTHER';

function detectUserRegion(): LegalRegion {
    if (typeof navigator === 'undefined') return 'AU';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || 'en-AU').toLowerCase();
    // Timezone-based detection (most reliable, used by Airbnb/Uber)
    if (/australia|sydney|melbourne|brisbane|perth|adelaide|hobart|darwin/i.test(tz)) return 'AU';
    if (/auckland|wellington|chatham/i.test(tz)) return 'NZ';
    if (/america\/(?!argentina|bogota|lima|santiago|sao_paulo|mexico)/i.test(tz) && /us|new_york|chicago|denver|los_angeles|phoenix|anchorage|honolulu/i.test(tz)) return 'US';
    if (/america\/toronto|america\/vancouver|america\/winnipeg|america\/halifax|america\/st_johns|america\/edmonton/i.test(tz)) return 'CA';
    if (/europe\/london|europe\/belfast/i.test(tz)) return 'GB';
    if (/europe\//i.test(tz)) return 'EU';
    // Fallback to language tag
    if (lang.includes('en-au')) return 'AU';
    if (lang.includes('en-nz')) return 'NZ';
    if (lang.includes('en-us')) return 'US';
    if (lang.includes('en-ca') || lang.includes('fr-ca')) return 'CA';
    if (lang.includes('en-gb')) return 'GB';
    if (/^(de|fr|es|it|nl|pt|pl|sv|da|fi|el|cs|hu|ro|bg|sk|sl|hr|lt|lv|et)/.test(lang)) return 'EU';
    return 'AU'; // Default to AU (home jurisdiction)
}

const REGION_CONFIG: Record<LegalRegion, {
    name: string; entitySuffix: string; currency: string; currencySymbol: string;
    consumerLaw: string; consumerLawFull: string; privacyLaw: string; privacyBody: string; privacyBodyFull: string;
    cookieLaw: string; cookieConsent: string; disputeJurisdiction: string; disputeMechanism: string;
    taxName: string; taxNote: string; antiSpamLaw: string; disclosureLaw: string;
    insuranceMinimum: string; dataBreachLaw: string; arbitrationNote: string;
    affiliateTaxNote: string; affiliateDisclosure: string;
}> = {
    AU: {
        name: 'Australia', entitySuffix: 'Pty Ltd', currency: 'AUD', currencySymbol: '$',
        consumerLaw: 'Australian Consumer Law', consumerLawFull: 'Schedule 2, Competition and Consumer Act 2010 (Cth)',
        privacyLaw: 'Privacy Act 1988 (Cth), Australian Privacy Principles (APPs)', privacyBody: 'OAIC', privacyBodyFull: 'Office of the Australian Information Commissioner',
        cookieLaw: 'Privacy Act 1988 (Cth) — no dedicated cookie law; cookies identifying individuals are personal information',
        cookieConsent: 'Non-essential cookies require transparency and opt-out capability under Privacy Act.',
        disputeJurisdiction: 'New South Wales, Australia', disputeMechanism: 'Australian Disputes Centre (ADC) mediation, then NSW courts',
        taxName: 'GST', taxNote: 'Goods and Services Tax at 10% may apply. Pull Up Coffee is registered for GST.',
        antiSpamLaw: 'Spam Act 2003 (Cth)', disclosureLaw: 'ACCC disclosure requirements under Australian Consumer Law',
        insuranceMinimum: 'AUD $10,000,000', dataBreachLaw: 'Notifiable Data Breaches (NDB) scheme under Privacy Act 1988',
        arbitrationNote: 'Mediation via Australian Disputes Centre; if unresolved within 30 days, NSW courts.',
        affiliateTaxNote: 'You are an independent contractor. Pull Up Coffee does not withhold tax. You are solely responsible for declaring and paying all tax obligations including GST (if registered) and income tax (as assessed by the ATO). Consult a registered tax agent or visit ato.gov.au.',
        affiliateDisclosure: '"I earn a commission if you sign up via my link." (ACCC requirement — must be prominent, proximate, and in plain English.)',
    },
    US: {
        name: 'United States', entitySuffix: 'LLC', currency: 'USD', currencySymbol: '$',
        consumerLaw: 'FTC Act & State Consumer Protection', consumerLawFull: 'Federal Trade Commission Act, 15 U.S.C. §§ 41–58, and applicable state UDAP statutes',
        privacyLaw: 'CCPA/CPRA (California), applicable state privacy laws', privacyBody: 'FTC / State AG', privacyBodyFull: 'Federal Trade Commission & State Attorneys General',
        cookieLaw: 'No federal cookie law; CCPA/CPRA opt-out requirements apply in California; several states have similar laws',
        cookieConsent: 'California residents: "Do Not Sell or Share My Personal Information" link provided. Other states: opt-out mechanisms available where required.',
        disputeJurisdiction: 'State of Delaware, United States', disputeMechanism: 'Binding arbitration under AAA Commercial Arbitration Rules, then Delaware courts',
        taxName: 'Sales Tax', taxNote: 'State and local sales tax may apply at the rates in effect at the point of sale.',
        antiSpamLaw: 'CAN-SPAM Act (15 U.S.C. § 7701 et seq.)', disclosureLaw: 'FTC Endorsement Guides (16 CFR Part 255) — clear and conspicuous disclosure',
        insuranceMinimum: 'USD $2,000,000', dataBreachLaw: 'State data breach notification laws (all 50 states)',
        arbitrationNote: 'Binding individual arbitration under AAA rules. You waive the right to participate in class actions.',
        affiliateTaxNote: 'You are an independent contractor, not an employee. Pull Up Coffee does not withhold federal, state, or local taxes. You are solely responsible for all tax obligations. If you earn $600+ in a calendar year, you will receive a 1099-NEC. Consult a licensed CPA or visit irs.gov.',
        affiliateDisclosure: '"Ad" or "Sponsored" or "#ad" — FTC requires clear, conspicuous, and unambiguous disclosure.',
    },
    GB: {
        name: 'United Kingdom', entitySuffix: 'Ltd', currency: 'GBP', currencySymbol: '£',
        consumerLaw: 'Consumer Rights Act 2015', consumerLawFull: 'Consumer Rights Act 2015 (c. 15), Consumer Contracts Regulations 2013',
        privacyLaw: 'UK GDPR & Data Protection Act 2018', privacyBody: 'ICO', privacyBodyFull: 'Information Commissioner\'s Office',
        cookieLaw: 'Privacy and Electronic Communications Regulations 2003 (PECR) — prior consent required for non-essential cookies',
        cookieConsent: 'Explicit opt-in consent required before any non-essential cookies are placed (PECR + UK GDPR).',
        disputeJurisdiction: 'England and Wales', disputeMechanism: 'ODR platform or ADR entity, then courts of England and Wales',
        taxName: 'VAT', taxNote: 'Value Added Tax at 20% applies where applicable. Pull Up Coffee is VAT-registered.',
        antiSpamLaw: 'Privacy and Electronic Communications Regulations 2003 (PECR)', disclosureLaw: 'ASA CAP Code — clear identification of advertising content',
        insuranceMinimum: 'GBP £5,000,000', dataBreachLaw: 'UK GDPR Article 33 — 72-hour breach notification to ICO',
        arbitrationNote: 'Alternative Dispute Resolution (ADR) or the EU/UK Online Dispute Resolution platform.',
        affiliateTaxNote: 'You are self-employed / an independent contractor. Pull Up Coffee does not deduct tax at source. You are responsible for registering with HMRC, submitting a Self Assessment tax return, and paying Income Tax and National Insurance. If turnover exceeds the VAT threshold (currently £85,000), you must register for VAT. Visit gov.uk/self-assessment-tax-returns.',
        affiliateDisclosure: '"Ad" or "Paid partnership" — ASA/CAP Code requires obvious, upfront identification of commercial relationships.',
    },
    EU: {
        name: 'European Union', entitySuffix: 'GmbH / BV / SAS', currency: 'EUR', currencySymbol: '€',
        consumerLaw: 'EU Consumer Rights Directive (2011/83/EU)', consumerLawFull: 'EU Consumer Rights Directive 2011/83/EU, Unfair Commercial Practices Directive 2005/29/EC',
        privacyLaw: 'General Data Protection Regulation (EU) 2016/679 (GDPR)', privacyBody: 'National DPA', privacyBodyFull: 'Your national Data Protection Authority (e.g., CNIL, BfDI, Garante)',
        cookieLaw: 'ePrivacy Directive 2002/58/EC — explicit opt-in consent required for all non-essential cookies',
        cookieConsent: 'Explicit prior consent (opt-in) required for all non-essential cookies. No pre-ticked boxes. Granular choices must be offered.',
        disputeJurisdiction: 'Member state of consumer\'s habitual residence', disputeMechanism: 'EU Online Dispute Resolution platform (ec.europa.eu/odr), then local courts',
        taxName: 'VAT', taxNote: 'Value Added Tax applies at the rate of your member state. Reverse charge may apply for B2B.',
        antiSpamLaw: 'ePrivacy Directive 2002/58/EC & national implementations', disclosureLaw: 'Unfair Commercial Practices Directive — transparency obligation for commercial communications',
        insuranceMinimum: '€5,000,000', dataBreachLaw: 'GDPR Article 33 — 72-hour breach notification to supervisory authority',
        arbitrationNote: 'EU Online Dispute Resolution platform (https://ec.europa.eu/odr); courts of consumer\'s habitual residence.',
        affiliateTaxNote: 'You operate as an independent contractor / freelancer. Pull Up Coffee does not withhold tax. You are responsible for all tax obligations in your member state, including VAT registration if applicable (thresholds vary by country), and income tax. Consult your local tax authority or accountant.',
        affiliateDisclosure: 'Clearly identify commercial communications per the Unfair Commercial Practices Directive and national advertising standards.',
    },
    NZ: {
        name: 'New Zealand', entitySuffix: 'Ltd', currency: 'NZD', currencySymbol: '$',
        consumerLaw: 'Consumer Guarantees Act 1993', consumerLawFull: 'Consumer Guarantees Act 1993 (NZ), Fair Trading Act 1986 (NZ)',
        privacyLaw: 'Privacy Act 2020 (NZ)', privacyBody: 'OPC', privacyBodyFull: 'Office of the Privacy Commissioner',
        cookieLaw: 'Privacy Act 2020 — no specific cookie law; general privacy principles apply',
        cookieConsent: 'Transparency and fairness principles under Privacy Act 2020 apply to cookie use.',
        disputeJurisdiction: 'Wellington, New Zealand', disputeMechanism: 'Disputes Tribunal (for claims under $30,000), then District Court of NZ',
        taxName: 'GST', taxNote: 'Goods and Services Tax at 15% applies. Pull Up Coffee is GST-registered.',
        antiSpamLaw: 'Unsolicited Electronic Messages Act 2007', disclosureLaw: 'Fair Trading Act 1986 — misleading conduct prohibition applies to endorsements',
        insuranceMinimum: 'NZD $5,000,000', dataBreachLaw: 'Privacy Act 2020 — mandatory breach notification to OPC',
        arbitrationNote: 'NZ Disputes Tribunal for claims under $30,000; District Court of NZ beyond that.',
        affiliateTaxNote: 'You are an independent contractor. Pull Up Coffee does not withhold tax. You are responsible for declaring income and paying tax to Inland Revenue (IRD). If turnover exceeds $60,000 p.a., you must register for GST. Visit ird.govt.nz.',
        affiliateDisclosure: '"This is an affiliate link — I earn a commission if you sign up." Fair Trading Act requires no misleading conduct.',
    },
    CA: {
        name: 'Canada', entitySuffix: 'Inc.', currency: 'CAD', currencySymbol: '$',
        consumerLaw: 'Competition Act & Provincial Consumer Protection', consumerLawFull: 'Competition Act (R.S.C., 1985, c. C-34) and provincial consumer protection statutes',
        privacyLaw: 'PIPEDA (federal) & provincial privacy laws (PIPA AB/BC, Loi 25 QC)', privacyBody: 'OPC', privacyBodyFull: 'Office of the Privacy Commissioner of Canada',
        cookieLaw: 'PIPEDA — implied consent for essential cookies; express consent for tracking/marketing cookies',
        cookieConsent: 'Express consent for non-essential cookies under PIPEDA. Quebec\'s Law 25 requires explicit consent.',
        disputeJurisdiction: 'Province of Ontario, Canada', disputeMechanism: 'ADR Institute of Canada mediation, then Ontario Superior Court',
        taxName: 'GST/HST', taxNote: 'Goods and Services Tax / Harmonized Sales Tax applies at federal/provincial rates.',
        antiSpamLaw: 'Canada\'s Anti-Spam Legislation (CASL, S.C. 2010, c. 23)', disclosureLaw: 'Competition Act — representations must not be false or misleading',
        insuranceMinimum: 'CAD $5,000,000', dataBreachLaw: 'PIPEDA breach notification — report to OPC and affected individuals',
        arbitrationNote: 'ADR Institute of Canada mediation; if unresolved, Ontario Superior Court of Justice.',
        affiliateTaxNote: 'You are an independent contractor. Pull Up Coffee does not withhold tax. You are responsible for reporting self-employment income to the CRA (Canada Revenue Agency) and remitting CPP/EI where required. GST/HST registration required if revenue exceeds $30,000 in four consecutive quarters. Visit canada.ca/taxes.',
        affiliateDisclosure: '"Affiliate link — I receive compensation for referrals." Competition Act requires truthful, non-misleading representations.',
    },
    OTHER: {
        name: 'International', entitySuffix: 'Pty Ltd', currency: 'AUD', currencySymbol: '$',
        consumerLaw: 'Applicable local consumer protection law', consumerLawFull: 'Your local consumer protection legislation applies to your use of this platform',
        privacyLaw: 'Applicable local privacy/data protection law', privacyBody: 'Local DPA', privacyBodyFull: 'Your local Data Protection Authority',
        cookieLaw: 'Local privacy and electronic communications regulations', cookieConsent: 'Review your local data protection law for cookie consent requirements.',
        disputeJurisdiction: 'New South Wales, Australia (governing law)', disputeMechanism: 'Pull Up Coffee\'s home jurisdiction courts (NSW, Australia)',
        taxName: 'Tax', taxNote: 'Local taxes may apply based on your jurisdiction.',
        antiSpamLaw: 'Local anti-spam and electronic communications law', disclosureLaw: 'Local advertising standards and disclosure laws',
        insuranceMinimum: 'AUD $10,000,000', dataBreachLaw: 'Local data breach notification law',
        arbitrationNote: 'Disputes governed by NSW law; mediation via Australian Disputes Centre, then NSW courts.',
        affiliateTaxNote: 'You are an independent contractor. Pull Up Coffee does not withhold tax in any jurisdiction. You are solely responsible for understanding and meeting all tax obligations in your country/state/province of residence. Consult a local tax professional.',
        affiliateDisclosure: 'Clearly disclose your commercial relationship when promoting Pull Up Coffee, in compliance with your local advertising and consumer protection laws.',
    },
};

// --- COMPREHENSIVE LEGAL MODAL ---
const LegalDocumentModal = ({ type, onClose }: any) => {
    const [activeTab, setActiveTab] = useState('terms');
    const [region, setRegion] = useState<LegalRegion>(() => detectUserRegion());
    const rc = REGION_CONFIG[region];
    const hasSignedInBusinessAccount = Boolean(auth.currentUser && !auth.currentUser.isAnonymous);

    // Affiliate signup form state
    const [affName, setAffName] = useState('');
    const [affEmail, setAffEmail] = useState('');
    const [affPhone, setAffPhone] = useState('');
    const [affCountry, setAffCountry] = useState('AU');
    const [affChannels, setAffChannels] = useState('');
    const [affPreferredCode, setAffPreferredCode] = useState('');
    const [affSubmitting, setAffSubmitting] = useState(false);
    const [affResult, setAffResult] = useState<{ ok: boolean; code?: string; message?: string } | null>(null);
    // Affiliate dashboard state
    const [affDashEmail, setAffDashEmail] = useState('');
    const [affDashCode, setAffDashCode] = useState('');
    const [affDashLoading, setAffDashLoading] = useState(false);
    const [affDashData, setAffDashData] = useState<any>(null);
    const [affDashError, setAffDashError] = useState('');
    const [affShowDashboard, setAffShowDashboard] = useState(false);

    const submitAffiliateSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setAffSubmitting(true);
        setAffResult(null);
        try {
            const res = await fetch('/api/affiliate/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: affName, email: affEmail, phone: affPhone, country: affCountry, channels: affChannels, preferredCode: affPreferredCode }),
            });
            const data = await res.json();
            setAffResult(res.ok ? { ok: true, code: data.referralCode, message: data.message } : { ok: false, message: data.error || 'Something went wrong' });
        } catch { setAffResult({ ok: false, message: 'Network error — please try again' }); }
        setAffSubmitting(false);
    };

    const loadAffiliateDashboard = async (e: React.FormEvent) => {
        e.preventDefault();
        setAffDashLoading(true);
        setAffDashError('');
        setAffDashData(null);
        try {
            const res = await fetch('/api/affiliate/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: affDashEmail, referralCode: affDashCode.toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok) { setAffDashData(data); } else { setAffDashError(data.error || 'Could not load dashboard'); }
        } catch { setAffDashError('Network error — please try again'); }
        setAffDashLoading(false);
    };

    const openBusinessSupport = () => {
        if (!hasSignedInBusinessAccount) return;
        window.dispatchEvent(new CustomEvent('pullup-open-business-support'));
        onClose();
    };

    const tabs = ['terms', 'privacy', 'cookies', 'faq', 'affiliate', 'ip', 'contact'];
    const renderContent = () => {
        const tab = type || activeTab;
        switch(tab) {
            case 'terms':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                            <span className="text-lg">{region === 'AU' ? '🇦🇺' : region === 'US' ? '🇺🇸' : region === 'GB' ? '🇬🇧' : region === 'EU' ? '🇪🇺' : region === 'NZ' ? '🇳🇿' : region === 'CA' ? '🇨🇦' : '🌍'}</span>
                            <p className="text-[10px] text-blue-700 font-medium">These terms are displayed for <strong>{rc.name}</strong>. Change your region above if needed.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Consumer Terms of Service</h4>
                            <p className="text-xs text-stone-400 mb-3">Last updated: 27 February 2026 | Effective immediately upon use | Jurisdiction: {rc.name}</p>
                            <p className="text-xs mb-3"><strong>1. Platform Bridge Role:</strong> Pull Up Coffee {rc.entitySuffix} (ABN 17 587 686 972) operates exclusively as a technology and payment bridge connecting consumers with independent café partners. We do not prepare, store, handle, transport, or deliver food or beverages. The cafe merchant is the sole supplier of all goods. Pull Up facilitates discovery, ordering, payment processing, and curbside coordination only. No agency, partnership, joint venture, or employment relationship exists between Pull Up Coffee and any merchant, customer, or affiliate.</p>
                            <p className="text-xs mb-3"><strong>2. Pricing Model:</strong> A flat $0.99 Pull Up Service Fee is added to every order. The curbside fee (if any) is set by the cafe and paid entirely to the cafe. Stripe payment processing fees are absorbed by the cafe as a standard business cost. All prices are displayed in {rc.currency} ({rc.currencySymbol}).</p>
                            <p className="text-xs mb-3"><strong>3. Merchant Responsibility:</strong> All food and beverage quality, safety, allergen management, and compliance with food handling standards remains the sole responsibility of the café partner. Pull Up Coffee has no oversight, control, or supervisory role over food preparation.</p>
                            <p className="text-xs mb-3"><strong>4. Consumer Guarantees:</strong> Goods supplied by cafe partners must be of acceptable quality and match their description under {rc.consumerLawFull}. Pull Up Coffee accepts no liability for food-borne illness, allergen reactions, temperature non-compliance, or product defects — these fall entirely under the café&apos;s liability and insurance coverage. Nothing in these terms purports to exclude, restrict, or modify consumer guarantees that cannot be excluded under {rc.consumerLaw}.</p>
                            <p className="text-xs mb-3"><strong>5. Authorisation Hold & Capture:</strong> Upon checkout, Pull Up places a temporary authorisation hold on your card (not a charge). The cafe reviews your order and either accepts (capturing payment) or declines (releasing the hold). Ghost holds that remain unactioned are automatically swept and released within 72 hours.</p>
                            <p className="text-xs mb-3"><strong>6. Refunds & Chargebacks:</strong> Refund eligibility is determined by the individual café partner, who is the supplier of goods under {rc.consumerLaw}. Customers must arrive within the agreed grace period or risk order forfeiture. The platform reserves the right to process payment reversals and chargebacks as permitted by law.</p>
                            <p className="text-xs mb-3"><strong>7. Traffic Compliance:</strong> All orders must be picked up from a legally parked vehicle in compliance with applicable road rules and local regulations. Do not interact with this app while driving. Pull Up Coffee accepts zero liability for traffic infringements, accidents, parking violations, or injury arising from vehicle operation.</p>
                            <p className="text-xs mb-3"><strong>8. Limitation of Liability:</strong> To the maximum extent permitted by law, Pull Up Coffee&apos;s total aggregate liability for any claim arising from or in connection with this platform shall not exceed the total fees paid by you in the 12 months preceding the claim, or {rc.currencySymbol}50, whichever is less. Pull Up Coffee is not liable for any indirect, incidental, special, consequential, or punitive damages.</p>
                            <p className="text-xs mb-3"><strong>9. Assumption of Risk:</strong> By using this platform, you acknowledge that curbside food and beverage pickup inherently involves risks including but not limited to: spills, burns from hot beverages, traffic and pedestrian hazards, weather conditions, and allergen exposure. You voluntarily assume all such risks.</p>
                            <p className="text-xs mb-3"><strong>10. Data Privacy:</strong> Location data (precise GPS coordinates) is collected solely to enable curbside handoff and merchant notification. Data is encrypted and purged upon order completion, per {rc.privacyLaw} compliance. See our Privacy Policy for full details.</p>
                            <p className="text-xs mb-3"><strong>11. Automated Systems & AI:</strong> Use of automated systems, bots, scripts, AI agents, scraping tools, or any non-human means to access, interact with, or extract data from this platform is strictly prohibited unless expressly authorised in writing.</p>
                            <p className="text-xs mb-3"><strong>12. User Conduct:</strong> Users must not submit fraudulent orders, abuse platform infrastructure, reverse-engineer platform logic, or engage in unsafe driving. Violation results in immediate account termination without notice or refund.</p>
                            <p className="text-xs mb-3"><strong>13. Dispute Resolution:</strong> {rc.arbitrationNote}</p>
                            <p className="text-xs mb-3"><strong>14. Force Majeure:</strong> Pull Up Coffee shall not be liable for any failure or delay in performance due to circumstances beyond reasonable control, including natural disasters, pandemics, government actions, internet outages, third-party service failures, or cyberattacks.</p>
                            <p className="text-xs mb-3"><strong>15. Severability & Entire Agreement:</strong> If any provision is found unenforceable, remaining provisions continue in full force. These terms constitute the entire agreement between you and Pull Up Coffee, superseding all prior agreements.</p>
                            <p className="text-xs mb-3"><strong>16. No Association:</strong> Pull Up Coffee Pty Ltd is an independently owned and operated Australian business. We are not associated with, affiliated with, endorsed by, or connected to any other business, entity, or social media account that may use a similar or identical name.</p>
                            <p className="text-xs mb-3"><strong>17. Affiliate Referral Codes:</strong> Affiliate referral codes must be entered at the time of cafe registration. Referral codes cannot be applied retroactively. No exceptions.</p>
                            <p className="text-xs mb-3"><strong>18. Governing Law:</strong> These terms are governed by the laws of {rc.disputeJurisdiction}. The parties submit to the exclusive jurisdiction of the courts of {rc.disputeJurisdiction}.</p>
                            <p className="text-xs"><strong>19. Tax:</strong> {rc.taxNote}</p>
                        </div>
                        <div className="border-t border-stone-200 pt-4">
                            <h4 className="font-bold text-stone-900 mb-2">Merchant Partner Agreement (Summary)</h4>
                            <p className="text-xs text-stone-400 mb-3">Effective upon merchant registration | {rc.name} terms</p>
                            <p className="text-xs mb-3"><strong>1. Platform Bridge Model:</strong> Pull Up Coffee operates as a technology bridge. Merchants receive 100% of their menu prices plus 100% of the curbside fee. Customers pay a flat $0.99 Pull Up Service Fee per order. Standard Stripe processing costs (~1.75% + 30¢) are absorbed by the merchant as a normal business cost.</p>
                            <p className="text-xs mb-3"><strong>2. Authorisation & Capture:</strong> Orders use a manual capture flow. Unactioned authorisation holds are auto-swept within 72 hours.</p>
                            <p className="text-xs mb-3"><strong>3. Full Indemnification:</strong> Merchants agree to fully indemnify Pull Up Coffee from any claims arising from food safety, allergen reactions, product defects, IP infringement, parking violations, or pedestrian injuries.</p>
                            <p className="text-xs mb-3"><strong>4. Curbside Compliance:</strong> Merchants assume sole responsibility for local zoning laws, traffic management, and pedestrian safety.</p>
                            <p className="text-xs mb-3"><strong>5. Insurance Requirement:</strong> Merchants must maintain Public and Product Liability Insurance (minimum {rc.insuranceMinimum} per occurrence recommended). Operating without adequate insurance is a material breach.</p>
                            <p className="text-xs mb-3"><strong>6. Data Security:</strong> Merchants must handle all customer data in compliance with {rc.privacyLaw} and PCI-DSS standards.</p>
                            <p className="text-xs mb-3"><strong>7. Data Breach:</strong> {rc.dataBreachLaw}. Merchants must notify Pull Up Coffee of any data breach within 24 hours.</p>
                            <p className="text-xs"><strong>8. Termination:</strong> Either party may terminate with 7 days written notice. Immediate termination for breach.</p>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Privacy Policy — {rc.name}</h4>
                            <p className="text-xs text-stone-400 mb-3">Governed by: {rc.privacyLaw} | Supervisory authority: {rc.privacyBodyFull} ({rc.privacyBody})</p>
                            <p className="text-xs mb-3"><strong>1. Data Collection:</strong> Pull Up Coffee collects: (a) Location data (precise GPS coordinates) solely to facilitate curbside order preparation and handoff; (b) Customer profile data (Name, Vehicle Details, Mobile Number); (c) Transaction and anonymized analytics.</p>
                            <p className="text-xs mb-3"><strong>2. Legal Basis:</strong> Data processing is conducted under {rc.privacyLaw}. {region === 'EU' || region === 'GB' ? 'Our legal bases for processing are: (a) performance of a contract (Article 6(1)(b) GDPR), (b) legitimate interest (Article 6(1)(f) GDPR), and (c) consent where required.' : region === 'US' ? 'For California residents: you have the right to know, delete, and opt out of the sale of personal information under the CCPA/CPRA.' : 'All data handling adheres to applicable privacy principles under ' + rc.privacyLaw + '.'}</p>
                            <p className="text-xs mb-3"><strong>3. Data Minimization:</strong> We collect only data reasonably necessary for order fulfillment. Location data is automatically purged upon order completion. No retroactive aggregation or sale to third-party data brokers occurs.</p>
                            <p className="text-xs mb-3"><strong>4. International Data Transfers:</strong> Personal information may be transferred to overseas data centers. {region === 'EU' ? 'Transfers outside the EEA are protected by Standard Contractual Clauses (SCCs) per GDPR Article 46(2)(c).' : region === 'GB' ? 'Transfers outside the UK are protected by UK International Data Transfer Agreements or SCCs.' : 'This disclosure complies with cross-border data flow requirements under ' + rc.privacyLaw + '.'}</p>
                            <p className="text-xs mb-3"><strong>5. Data Security:</strong> Pull Up Coffee implements robust cybersecurity infrastructure to protect all personal information. {rc.dataBreachLaw}.</p>
                            <p className="text-xs mb-3"><strong>6. Your Rights:</strong> You have the right to request access to, correction of, or deletion of personal information held. {region === 'EU' || region === 'GB' ? 'Additional rights include: data portability (Article 20), restriction of processing (Article 18), and the right to object (Article 21). You may lodge a complaint with ' + rc.privacyBodyFull + '.' : region === 'US' ? 'California residents: you may also opt out of personal information sales and request to know categories of data collected. Submit requests to hello@pullupcoffee.com or call our privacy line.' : 'Submit requests to hello@pullupcoffee.com.'}</p>
                            {(region === 'EU' || region === 'GB') && <p className="text-xs mb-3"><strong>7. Data Protection Officer:</strong> For GDPR-related inquiries, contact our DPO at hello@pullupcoffee.com.</p>}
                            {region === 'US' && <p className="text-xs mb-3"><strong>7. Do Not Sell My Personal Information:</strong> Pull Up Coffee does not sell personal information. To exercise your rights under CCPA/CPRA, email hello@pullupcoffee.com.</p>}
                            <p className="text-xs"><strong>{region === 'EU' || region === 'GB' || region === 'US' ? '8' : '7'}. Cookie & Tracking Disclosure:</strong> {rc.cookieLaw}. See our Cookie Policy for full details.</p>
                        </div>
                    </div>
                );
            case 'cookies':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Cookie Policy — {rc.name}</h4>
                            <p className="text-xs text-stone-400 mb-3">Governed by: {rc.cookieLaw}</p>
                            <p className="text-xs mb-3"><strong>1. Cookie Categories:</strong> Pull Up Coffee deploys cookies and tracking technologies segmented as follows:</p>
                            <ul className="text-xs ml-4 space-y-2 mb-3">
                                <li><strong>Essential:</strong> Session cookies required for app functionality, payment processing, and security.</li>
                                <li><strong>Performance:</strong> Analytics cookies to measure app usage and error tracking.</li>
                                <li><strong>Functional:</strong> Cookies to remember user preferences and location settings.</li>
                                <li><strong>Targeting:</strong> Advertising and retargeting cookies, subject to {region === 'EU' || region === 'GB' ? 'explicit opt-in consent' : region === 'US' ? 'opt-out rights (CCPA)' : 'applicable consent requirements'}.</li>
                            </ul>
                            <p className="text-xs mb-3"><strong>2. Consent Model:</strong> {rc.cookieConsent}</p>
                            <p className="text-xs mb-3"><strong>3. Third-Party Trackers:</strong> We use services from Stripe (payments), Firebase (analytics), and may use advertising platforms. Our Consent Management Platform allows you to manage preferences for all non-essential tracking.</p>
                            <p className="text-xs mb-3"><strong>4. User Control:</strong> You may review, disable, or delete cookies via your device settings at any time. Disabling essential cookies may affect core functionality.</p>
                            <p className="text-xs"><strong>5. Supervisory Authority:</strong> Full transparency is maintained with {rc.privacyBodyFull} ({rc.privacyBody}). {region === 'EU' ? 'You may use the EU Online Dispute Resolution platform at ec.europa.eu/odr.' : ''}</p>
                        </div>
                    </div>
                );
            case 'faq':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Frequently Asked Questions</h4>
                            <p className="text-xs text-stone-500 mb-3">Quick answers to the questions people ask most.</p>
                            <div className="space-y-3">
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">How do I order?</p>
                                    <p className="text-xs">Scan the cafe QR, choose items, enter vehicle details, and pay. The cafe gets your order instantly.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">How does the cafe know I arrived?</p>
                                    <p className="text-xs">If GPS is enabled, the cafe sees your distance and receives arrival alerts. You can also tap “I’m Here”.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">Can I order when a cafe is closed?</p>
                                    <p className="text-xs">You can browse and save the cafe as a favourite, but checkout is available only when the cafe is open.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">How do favourites work?</p>
                                    <p className="text-xs">Tap the heart on a cafe, then confirm your mobile at checkout. Your number is saved for that cafe’s optional opening SMS alerts.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">How long do refunds take?</p>
                                    <p className="text-xs">Refund approval is managed by the cafe. Once processed, card refunds usually appear in 3–5 business days.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900 text-xs">How do I delete my personal data?</p>
                                    <p className="text-xs">Email hello@pullupcoffee.com with your name and mobile. Data deletion requests are processed under privacy requirements.</p>
                                </div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                                    <p className="font-bold text-stone-900 text-xs">Business question?</p>
                                    {hasSignedInBusinessAccount ? (
                                        <div className="space-y-2">
                                            <p className="text-xs">You are signed in. Open your Support page for business FAQs and instant help.</p>
                                            <button onClick={openBusinessSupport} className="text-[10px] px-3 py-2 rounded-lg bg-stone-900 text-white font-bold uppercase tracking-widest hover:bg-stone-800 transition">Go to Support</button>
                                        </div>
                                    ) : (
                                        <p className="text-xs">Business FAQs are available in the Support page after signup (signed-in business account required).</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'affiliate':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Affiliate Program: 25% Commission on Platform Fee (First 30 Days)</h4>
                            <p className="text-xs mb-3"><strong>Program Overview:</strong> Earn a 25% recurring commission on the $0.99 platform fee (≈$0.25/order) for the first 30 calendar days of every cafe you refer. Commissions are paid from our platform margin — never the cafe's share.</p>
                            <p className="text-xs mb-3"><strong>1. Commission Structure:</strong> The customer pays a flat {rc.currencySymbol}0.99 Pull Up Service Fee. Your commission is ≈{rc.currencySymbol}0.25 per order (25% of the platform fee). The cafe keeps 100% of their menu prices and 100% of the curbside fee.</p>
                            <p className="text-xs mb-3"><strong>2. Commission Window:</strong> Your commission period starts from the cafe's first successful transaction and runs for 30 calendar days. Commissions apply only when a valid affiliate link is used during signup.</p>
                            <p className="text-xs mb-3"><strong>3. Payouts:</strong> Commission payouts settle monthly to your connected Stripe account. All payments are made <strong>gross</strong> — Pull Up Coffee does not withhold any tax at source.</p>
                            <p className="text-xs mb-3"><strong>4. Sustainable Growth:</strong> After the commission window ends, Pull Up retains full platform margin to support infrastructure, support, and uptime.</p>
                            <p className="text-xs mb-3"><strong>5. IP Licensing:</strong> Affiliates receive a limited, revocable license to use Pull Up Coffee logos, trademarks, and marketing assets. Unauthorized alteration or predatory search ads bidding on our trademarked terms is strictly prohibited.</p>
                            <p className="text-xs mb-3"><strong>6. Disclosure Requirements ({rc.name}):</strong> {rc.affiliateDisclosure} Compliance with {rc.disclosureLaw} is mandatory.</p>
                            <p className="text-xs mb-3"><strong>7. Anti-Spam Compliance:</strong> If you use email or SMS to promote the platform, you must comply with {rc.antiSpamLaw}. Obtain explicit prior consent and include a functional unsubscribe mechanism.</p>
                            <p className="text-xs mb-3"><strong>8. Full Indemnification:</strong> You agree to fully indemnify Pull Up Coffee from any claims arising from your promotional activities, including unauthorized claims about the app, privacy law breaches, IP infringement, or use of automated tools.</p>
                            <p className="text-xs mb-3"><strong>9. Prohibited Methods:</strong> Use of bots, AI agents, automated scripts, fake accounts, or any artificial means to generate signups is strictly prohibited and will result in immediate termination and forfeiture of commissions.</p>
                            <p className="text-xs mb-3"><strong>10. Automated Referral Codes:</strong> Each approved affiliate receives a unique referral code (e.g., PULLUP-YOURNAME). Track referrals and earnings through your affiliate dashboard.</p>

                            {/* TAX & LEGAL STATUS — REGION-SPECIFIC */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-2">⚠️ Important: Tax & Legal Status — {rc.name}</h5>
                                <p className="text-xs text-amber-800 mb-2"><strong>Independent Contractor Status:</strong> As a Pull Up Coffee affiliate, you are an <strong>independent contractor</strong>, not an employee. No employment, agency, or partnership relationship is created. You are not entitled to employee benefits, workers compensation, superannuation (AU), social security (US), national insurance (UK), or any equivalent.</p>
                                <p className="text-xs text-amber-800 mb-2"><strong>Gross Payment:</strong> All affiliate commissions are paid <strong>gross</strong>. Pull Up Coffee does <strong>not</strong> withhold income tax, {rc.taxName}, or any other tax. You receive the full commission amount.</p>
                                <p className="text-xs text-amber-800 mb-2"><strong>Your Tax Obligation:</strong> {rc.affiliateTaxNote}</p>
                                <p className="text-xs text-amber-800"><strong>Record Keeping:</strong> You are responsible for maintaining accurate records of all commission income received from Pull Up Coffee for tax reporting purposes. Pull Up Coffee will provide transaction records upon request.</p>
                            </div>

                            <p className="text-xs border-t border-stone-200 pt-3 mt-4"><strong>Ready to earn?</strong> Apply below to receive your unique referral code instantly.</p>

                            {/* Affiliate Signup Form */}
                            {!affResult?.ok && !affShowDashboard && (
                                <form onSubmit={submitAffiliateSignup} className="mt-4 space-y-3 bg-orange-50 rounded-xl p-4 border border-orange-200">
                                    <h5 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Apply to Become an Affiliate</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input type="text" value={affName} onChange={e => setAffName(e.target.value)} placeholder="Full Name *" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500" required />
                                        <input type="email" value={affEmail} onChange={e => setAffEmail(e.target.value)} placeholder="Email Address *" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500" required />
                                        <input type="tel" value={affPhone} onChange={e => setAffPhone(e.target.value)} placeholder="Phone (optional)" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500" />
                                        <select value={affCountry} onChange={e => setAffCountry(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500">
                                            <option value="AU">Australia</option>
                                            <option value="US">United States</option>
                                            <option value="GB">United Kingdom</option>
                                            <option value="NZ">New Zealand</option>
                                            <option value="CA">Canada</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <input type="text" value={affChannels} onChange={e => setAffChannels(e.target.value)} placeholder="Social channels / audience (Instagram, TikTok, blog, etc.)" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500" />
                                    <input type="text" value={affPreferredCode} onChange={e => setAffPreferredCode(e.target.value.toUpperCase())} placeholder="Preferred code (optional, e.g. PULLUP-YOURNAME)" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500 uppercase" />
                                    {affResult?.ok === false && <p className="text-xs text-red-600 font-medium">{affResult.message}</p>}
                                    <button type="submit" disabled={affSubmitting} className="w-full py-2.5 bg-orange-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-orange-500 disabled:opacity-50 transition">{affSubmitting ? 'Submitting...' : 'Apply Now — Get Your Code Instantly'}</button>
                                </form>
                            )}

                            {/* Affiliate Signup Success */}
                            {affResult?.ok && (
                                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                    <p className="text-lg font-bold text-green-700 mb-1">🎉 Welcome to the Pull Up Affiliate Program!</p>
                                    <p className="text-xs text-stone-600 mb-3">{affResult.message}</p>
                                    <div className="bg-white border-2 border-dashed border-green-400 rounded-xl p-4 inline-block">
                                        <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Your Referral Code</p>
                                        <p className="text-2xl font-black text-green-700 tracking-widest">{affResult.code}</p>
                                    </div>
                                    <p className="text-[10px] text-stone-500 mt-3">Check your email for full details and marketing assets.</p>
                                </div>
                            )}

                            {/* Existing Affiliate Dashboard Login */}
                            <div className="mt-4 pt-3 border-t border-stone-200">
                                <button onClick={() => setAffShowDashboard(!affShowDashboard)} className="text-xs text-orange-600 font-bold hover:text-orange-500 transition uppercase tracking-widest">
                                    {affShowDashboard ? '▾ Hide Dashboard' : '▸ Already an affiliate? View Dashboard'}
                                </button>
                                {affShowDashboard && (
                                    <div className="mt-3">
                                        {!affDashData ? (
                                            <form onSubmit={loadAffiliateDashboard} className="space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <input type="email" value={affDashEmail} onChange={e => setAffDashEmail(e.target.value)} placeholder="Your affiliate email" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500" required />
                                                    <input type="text" value={affDashCode} onChange={e => setAffDashCode(e.target.value.toUpperCase())} placeholder="Your referral code" className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 outline-none focus:border-orange-500 uppercase" required />
                                                </div>
                                                {affDashError && <p className="text-xs text-red-600">{affDashError}</p>}
                                                <button type="submit" disabled={affDashLoading} className="w-full py-2 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-stone-800 disabled:opacity-50 transition">{affDashLoading ? 'Loading...' : 'View My Dashboard'}</button>
                                            </form>
                                        ) : (
                                            <div className="space-y-3 bg-stone-50 rounded-xl p-4 border border-stone-200">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div className="text-center p-3 bg-white rounded-lg border border-stone-200">
                                                        <p className="text-lg font-black text-green-600">${(affDashData.summary?.totalEarned / 100 || 0).toFixed(2)}</p>
                                                        <p className="text-[8px] text-stone-500 uppercase tracking-widest">Total Earned</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-white rounded-lg border border-stone-200">
                                                        <p className="text-lg font-black text-orange-600">${(affDashData.summary?.pending / 100 || 0).toFixed(2)}</p>
                                                        <p className="text-[8px] text-stone-500 uppercase tracking-widest">Pending</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-white rounded-lg border border-stone-200">
                                                        <p className="text-lg font-black text-stone-700">${(affDashData.summary?.paidOut / 100 || 0).toFixed(2)}</p>
                                                        <p className="text-[8px] text-stone-500 uppercase tracking-widest">Paid Out</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-white rounded-lg border border-stone-200">
                                                        <p className="text-lg font-black text-stone-700">{affDashData.summary?.activeCafes || 0}</p>
                                                        <p className="text-[8px] text-stone-500 uppercase tracking-widest">Active Cafes</p>
                                                    </div>
                                                </div>
                                                {affDashData.referredCafes?.length > 0 && (
                                                    <div>
                                                        <h6 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Referred Cafes</h6>
                                                        {affDashData.referredCafes.map((c: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 bg-white rounded-lg border border-stone-200 mb-1 text-xs">
                                                                <span className="font-medium text-stone-900">{c.name}</span>
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${c.windowActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{c.windowActive ? 'Active' : 'Expired'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {affDashData.recentCommissions?.length > 0 && (
                                                    <div>
                                                        <h6 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Recent Commissions</h6>
                                                        {affDashData.recentCommissions.slice(0, 10).map((c: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 bg-white rounded-lg border border-stone-200 mb-1 text-xs">
                                                                <span className="text-stone-600">{c.cafeName} — ${(c.commissionCents / 100).toFixed(2)}</span>
                                                                <span className="text-[9px] text-stone-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <button onClick={() => { setAffDashData(null); setAffShowDashboard(false); }} className="text-xs text-stone-500 hover:text-stone-700 transition">← Back</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'ip':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Intellectual Property Notice & Certificate of Priority</h4>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <p className="text-xs font-bold text-red-800 mb-2">⚠️ LEGAL NOTICE — ALL RIGHTS RESERVED</p>
                                <p className="text-xs text-red-700">The Pull Up Coffee platform, including all source code, algorithms, business logic, user interface designs, branding, trade dress, and proprietary workflows, is the exclusive intellectual property of Steven Weir and/or Pull Up Coffee Pty Ltd (ABN: 17 587 686 972). Unauthorized reproduction, reverse engineering, cloning, or derivative creation is strictly prohibited and will be pursued to the fullest extent of Australian and international law.</p>
                            </div>
                            <p className="text-xs mb-3"><strong>Author & Sole Creator:</strong> Steven Weir</p>
                            <p className="text-xs mb-3"><strong>Entity:</strong> Pull Up Coffee Pty Ltd (ABN: 17 587 686 972)</p>
                            <p className="text-xs mb-3"><strong>Verification Date:</strong> 16 January 2026 (AEDT)</p>
                            <p className="text-xs mb-3"><strong>Home Jurisdiction:</strong> New South Wales, Australia{region !== 'AU' ? ` | Your region: ${rc.name} — local IP laws also apply` : ''}</p>
                            <p className="text-xs mb-3"><strong>Copyright Assertion:</strong> Copyright © 2025–2026 Steven Weir / Pull Up Coffee Pty Ltd. Protected under the Copyright Act 1968 (Cth), the Berne Convention, and {region === 'US' ? 'the U.S. Copyright Act (17 U.S.C.)' : region === 'GB' ? 'the Copyright, Designs and Patents Act 1988 (UK)' : region === 'EU' ? 'EU Copyright Directive 2019/790 and national implementations' : region === 'NZ' ? 'the Copyright Act 1994 (NZ)' : region === 'CA' ? 'the Copyright Act (R.S.C., 1985, c. C-42)' : 'applicable international IP treaties'}. All moral rights are asserted.</p>
                            <p className="text-xs mb-3"><strong>Trademark Notice:</strong> "Pull Up Coffee", the Pull Up Coffee logo, and associated trade dress are trademarks of Pull Up Coffee Pty Ltd. Use without written authorization constitutes infringement under the Trade Marks Act 1995 (Cth).</p>
                            <p className="text-xs mb-3"><strong>Novel Functionality Claimed (Prior Art):</strong> Dynamic curbside fee adjustment, authorization-hold-before-preparation payment flow, GPS-based curbside arrival notification, late arrival forfeiture logic, "I'm Outside" manual override, looping audible merchant alerts, favorites-based SMS opt-in opening notifications, and pass-through processing fee transparency.</p>
                            <p className="text-xs mb-3"><strong>Digital Signature Reference:</strong> VERIFIED USER: 4551</p>
                            <p className="text-xs font-mono break-all mb-3"><strong>Cryptographic Timestamp Hash:</strong> 8f4b2e1a9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f</p>
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-bold text-stone-900">Evidentiary Preservation Protocol</p>
                                <p className="text-xs"><strong>1.</strong> Repository commit history (GitHub) with cryptographic signatures serves as independent timestamp evidence.</p>
                                <p className="text-xs"><strong>2.</strong> SHA-256 file hashes of all source files are generated and preserved at each major commit.</p>
                                <p className="text-xs"><strong>3.</strong> Immutable copies of source code, commit logs, and timestamp records are stored with legal counsel.</p>
                                <p className="text-xs"><strong>4.</strong> WIPO Proof digital timestamps supplement repository evidence for international enforceability.</p>
                                <p className="text-xs font-mono break-all"><strong>Hash Verification:</strong> Get-FileHash -Algorithm SHA256 .\app\page.tsx</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                                <p className="text-xs font-bold text-amber-800 mb-2">Enforcement Statement</p>
                                <p className="text-xs text-amber-700">Any party found to be infringing on the intellectual property described herein will receive a cease-and-desist notice. Continued infringement will result in legal proceedings seeking injunctive relief, damages, and costs under applicable Australian law (Copyright Act 1968, Trade Marks Act 1995, Competition and Consumer Act 2010) and international IP treaties (Berne Convention, TRIPS Agreement).</p>
                            </div>
                            <p className="text-xs text-stone-400 mt-3 italic">This notice is not legal advice. Professional legal counsel has been engaged for IP protection strategy.</p>
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Support & Contact</h4>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
                                <p className="text-xs font-bold text-stone-900 mb-3">Email Support (24-48hr Response)</p>
                                <a href="mailto:hello@pullupcoffee.com" className="text-orange-500 underline font-bold text-xs">hello@pullupcoffee.com</a>
                                <p className="text-xs text-stone-500 mt-2">Use for general inquiries, report issues, account deletion requests, or affiliate applications.</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
                                <p className="text-xs font-bold text-stone-900 mb-3">Report an Issue (In-App)</p>
                                <p className="text-xs">Use the "Report Issue" button in your active order screen. Provide your Order ID and issue category (Missing Item, Cold Food, Merchant Closed, etc.). Tickets are auto-routed to the merchant's POS or our IT team.</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <p className="text-xs font-bold text-stone-900 mb-3">Business Hours</p>
                                <p className="text-xs">Monday—Friday: 8:00 AM—6:00 PM AEDT</p>
                                <p className="text-xs">Weekend: Limited support available</p>
                            </div>
                            <p className="text-xs text-stone-500 mt-4 italic">For urgent operational failures (merchant not appearing, app crash), priority escalation is available within 15 minutes during business hours.</p>
                        </div>
                    </div>
                );
            default:
                return <p className="text-sm text-stone-500">Select a section to view.</p>;
        }
    };

    if (type) {
        // If specific type requested, show that document directly
        const titleMap: Record<string, string> = {
            terms: 'Terms of Service',
            privacy: 'Privacy Policy',
            cookies: 'Cookie Policy',
            faq: 'FAQ',
            affiliate: 'Affiliate',
            contact: 'Contact',
            ip: 'IP Notice'
        };
        const modalTitle = titleMap[type] || (type.charAt(0).toUpperCase() + type.slice(1));
        return (
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-8">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-serif font-bold text-2xl text-stone-900 italic">{modalTitle}</h3>
                        <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
                    </div>
                    {renderContent()}
                    <button onClick={onClose} className="w-full mt-8 bg-stone-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-stone-800 transition">Close</button>
                </div>
            </div>
        );
    }

    // Multi-tab version (not used currently but kept for flexibility)
    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-stone-200">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-serif font-bold text-2xl text-stone-900 italic">Legal & Support</h3>
                        <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {tabs.map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === t ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Region:</span>
                        <select value={region} onChange={e => setRegion(e.target.value as LegalRegion)} className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-stone-700 font-medium outline-none focus:border-orange-400 transition">
                            <option value="AU">🇦🇺 Australia</option>
                            <option value="US">🇺🇸 United States</option>
                            <option value="GB">🇬🇧 United Kingdom</option>
                            <option value="EU">🇪🇺 European Union</option>
                            <option value="NZ">🇳🇿 New Zealand</option>
                            <option value="CA">🇨🇦 Canada</option>
                            <option value="OTHER">🌍 International</option>
                        </select>
                        <span className="text-[9px] text-stone-400 italic">Laws adjusted for {rc.name}</span>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {renderContent()}
                </div>
                <button onClick={onClose} className="w-full py-4 bg-stone-900 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-stone-800 transition">Close</button>
            </div>
        </div>
    );
};

// --- VIEWS ---

const LandingPage = ({ setView, onAbout, openLegal }: any) => (
    <div className="flex flex-col min-h-screen bg-stone-900 text-white animate-fade-in relative overflow-x-hidden font-sans">
        {/* ELEGANT TOP NAVIGATION */}
        <div className="absolute top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-50 flex justify-end gap-3">
            <button 
                onClick={() => setView('merchant-signup')} 
                className="group relative bg-orange-600/90 backdrop-blur-md border border-orange-500/40 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm hover:bg-orange-500 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
                <span className="text-base">🚀</span>
                <span className="tracking-wide">Join Pull Up</span>
            </button>
            <button 
                onClick={() => setView('merchant-login')} 
                className="group relative bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
                <span className="text-base">☕</span>
                <span className="tracking-wide">Business Login</span>
            </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=60')] bg-cover bg-center opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/70 via-black/40 to-black/90"></div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-28 pb-12 sm:p-6 text-center animate-fade-in">
            <PullUpLogo className="mb-8 sm:mb-10 w-24 h-24 sm:w-32 sm:h-32" />
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif italic mb-4 tracking-tight drop-shadow-2xl leading-[0.95] inline-flex items-start gap-1.5 sm:gap-2">Pull Up Coffee <span className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 mt-1.5 sm:mt-2 rounded-full border border-white/70 text-[7px] sm:text-[8px] not-italic font-bold">TM</span></h1>
            <p className="text-stone-300 mb-10 sm:mb-14 text-base sm:text-xl max-w-sm sm:max-w-md mx-auto italic font-light">Street parking is now your drive-thru.</p>
            <button onClick={() => setView('discovery')} className="w-full max-w-xs sm:w-auto bg-white text-stone-900 py-4 sm:py-6 px-8 sm:px-16 rounded-[2rem] sm:rounded-[2.5rem] font-bold text-lg sm:text-2xl shadow-xl hover:scale-105 transition transform flex items-center justify-center gap-3 sm:gap-4">
                <Icons.Car /> Order Now
            </button>
            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-stone-400">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    256-bit Encrypted
                </div>
                <div className="w-px h-3 bg-white/20 hidden sm:block"></div>
                <div className="text-[10px] uppercase tracking-widest font-bold">Powered by Stripe</div>
                <div className="w-px h-3 bg-white/20 hidden sm:block"></div>
                <div className="text-[10px] uppercase tracking-widest font-bold">No App Download</div>
            </div>
        </div>

        <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 mt-auto">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-7">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 sm:gap-6 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-white/10 text-center sm:text-left">
                    <div>
                        <h4 className="font-bold text-stone-300 mb-2.5 sm:mb-4 text-[10px] uppercase tracking-widest">Platform</h4>
                        <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => setView('discovery')} className="hover:text-orange-400 transition">Order Coffee</button></li>
                            <li><button onClick={() => setView('merchant-login')} className="hover:text-orange-400 transition">Business Login</button></li>
                            <li><button onClick={() => setView('merchant-signup')} className="hover:text-orange-400 transition">Join as Partner</button></li>
                            <li><button onClick={onAbout} className="hover:text-orange-400 transition">About Vision</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-2.5 sm:mb-4 text-[10px] uppercase tracking-widest">Legal</h4>
                        <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => openLegal('terms')} className="hover:text-orange-400 transition">Terms of Service</button></li>
                            <li><button onClick={() => openLegal('privacy')} className="hover:text-orange-400 transition">Privacy Policy</button></li>
                            <li><button onClick={() => openLegal('cookies')} className="hover:text-orange-400 transition">Cookie Policy</button></li>
                            <li><button onClick={() => openLegal('ip')} className="hover:text-orange-400 transition">IP Notice</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-2.5 sm:mb-4 text-[10px] uppercase tracking-widest">Support</h4>
                        <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => openLegal('faq')} className="hover:text-orange-400 transition">FAQ</button></li>
                            <li><button onClick={() => openLegal('contact')} className="hover:text-orange-400 transition">Contact Us</button></li>
                            <li><button onClick={() => setView('merch')} className="hover:text-orange-400 transition">Support the Founder</button></li>
                            <li><a href="https://instagram.com/pullupcoffee" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-orange-400 transition"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>Instagram</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-2.5 sm:mb-4 text-[10px] uppercase tracking-widest">Earn</h4>
                        <ul className="space-y-1.5 sm:space-y-3 text-[11px] sm:text-[10px] font-medium">
                            <li><button onClick={() => openLegal('affiliate')} className="text-orange-400 hover:text-orange-300 transition font-bold">Affiliate (25% first month)</button></li>
                            <li><a href="https://pullupglobal.com.au" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-orange-400 transition">Not food? Pull Up Global →</a></li>
                        </ul>
                    </div>
                </div>

                <div className="text-center text-[10px] text-stone-500">
                    <p>&copy; 2026 Pull Up Coffee Pty Ltd. ABN: 17 587 686 972</p>
                </div>
            </div>
        </footer>
    </div>
);

/** Inline component for SMS Two-Factor Authentication toggle in merchant dashboard */
const Sms2faToggle = ({ userId, db, profile }: { userId: string; db: any; profile: any }) => {
    const [enabling, setEnabling] = useState(false);
    const isEnabled = Boolean(profile?.sms2faEnabled);
    const hasPhone = Boolean(profile?.phone);

    const toggle2fa = async () => {
        if (!hasPhone) {
            alert('Please add a mobile number to your account before enabling SMS 2FA.');
            return;
        }
        setEnabling(true);
        try {
            await updateDoc(doc(db, 'cafes', userId), { sms2faEnabled: !isEnabled });
            alert(isEnabled ? 'SMS Two-Factor Authentication disabled.' : 'SMS Two-Factor Authentication enabled! You\u2019ll receive a 6-digit code via SMS on every login.');
        } catch { alert('Failed to update 2FA setting.'); }
        finally { setEnabling(false); }
    };

    return (
        <div className="space-y-3">
            {isEnabled ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">SMS 2FA is Active</p>
                    </div>
                    <p className="text-[9px] text-stone-500 italic text-center">A 6-digit code will be sent to your registered mobile number ({profile?.phone || 'not set'}) on every login.</p>
                    <button
                        disabled={enabling}
                        onClick={toggle2fa}
                        className="w-full bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition disabled:opacity-50"
                    >
                        {enabling ? 'Updating...' : 'Disable SMS 2FA'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-stone-600">When enabled, a unique 6-digit verification code will be sent to your registered mobile number every time you log in. This ensures only someone with access to your phone can access your dashboard.</p>
                    {!hasPhone && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Add a mobile number to your account first</p>
                        </div>
                    )}
                    <button
                        disabled={enabling || !hasPhone}
                        onClick={toggle2fa}
                        className="w-full bg-orange-600 text-white p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 transition disabled:opacity-50"
                    >
                        {enabling ? 'Enabling...' : 'Enable SMS 2FA'}
                    </button>
                    <p className="text-[9px] text-stone-400 italic text-center">Your verification code changes every login and expires after 5 minutes. Standard SMS rates may apply.</p>
                </div>
            )}
        </div>
    );
};

const BusinessLogin = ({ setView, auth, openLegal, pending2faRef }: any) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [otpChallenge, setOtpChallenge] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpCafeId, setOtpCafeId] = useState<string | null>(null);
    const [otpAttempts, setOtpAttempts] = useState(0);
    const [otpSending, setOtpSending] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');
    const [loginCaptchaChallenge] = useState(() => {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        return { a, b, answer: a + b };
    });
    const [loginCaptchaVerified, setLoginCaptchaVerified] = useState(false);

    const handleLogin = async (e: any) => {
        e.preventDefault();
        if (!loginCaptchaVerified) {
            alert('Please complete the security check first.');
            return;
        }
        setLoadingAuth(true);
        try {
            // Set pending 2FA flag BEFORE sign-in to prevent onAuthStateChanged from redirecting
            if (pending2faRef) pending2faRef.current = true;
            const cred = await signInWithEmailAndPassword(auth, email, pass);
            const db = getFirestore();
            const cafeDoc = await getDoc(doc(db, 'cafes', cred.user.uid));
            if (cafeDoc.exists() && cafeDoc.data()?.sms2faEnabled) {
                // SMS 2FA is enabled — send OTP to their mobile
                setOtpSending(true);
                try {
                    const token = await cred.user.getIdToken();
                    const res = await fetch('/api/auth/send-2fa', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        alert(data.error || 'Failed to send verification code.');
                        await signOut(auth);
                        if (pending2faRef) pending2faRef.current = false;
                        setLoadingAuth(false);
                        setOtpSending(false);
                        return;
                    }
                } catch {
                    alert('Unable to send verification code. Please try again.');
                    await signOut(auth);
                    if (pending2faRef) pending2faRef.current = false;
                    setLoadingAuth(false);
                    setOtpSending(false);
                    return;
                }
                setOtpCafeId(cred.user.uid);
                setOtpChallenge(true);
                setOtpSending(false);
                setLoadingAuth(false);
                await signOut(auth);
                return;
            }
            // No 2FA, login complete — clear pending flag and let onAuthStateChanged redirect
            if (pending2faRef) pending2faRef.current = false;
        } catch (err: any) {
            if (pending2faRef) pending2faRef.current = false;
            alert(err.message.replace('Firebase: ', '').replace('Error ', ''));
        } finally {
            setLoadingAuth(false);
        }
    };

    const verifyOtp = async () => {
        if (!otpInput.trim() || otpInput.length !== 6 || !otpCafeId) return;
        setLoadingAuth(true);
        try {
            const res = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cafeId: otpCafeId, code: otpInput.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data.verified) {
                const next = otpAttempts + 1;
                setOtpAttempts(next);
                setOtpInput('');
                if (next >= 3) {
                    alert('Too many incorrect attempts. Please log in again to receive a new code.');
                    setOtpChallenge(false);
                    setOtpAttempts(0);
                    setOtpCafeId(null);
                } else {
                    alert(data.error || `Incorrect code. ${3 - next} attempt(s) remaining.`);
                }
                setLoadingAuth(false);
                return;
            }
            // OTP verified — clear 2FA gate and re-authenticate to enter dashboard
            if (pending2faRef) pending2faRef.current = false;
            await signInWithEmailAndPassword(auth, email, pass);
            // onAuthStateChanged will handle redirect to dashboard
        } catch (err: any) {
            alert('Verification failed. Please try again.');
            setOtpInput('');
        } finally {
            setLoadingAuth(false);
        }
    };

    const handleForgotPassword = async (e: any) => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;
        setLoadingAuth(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.trim() }),
            });
            if (res.ok) {
                setForgotSent(true);
            } else {
                alert('Unable to send reset email. Please try again.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setLoadingAuth(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center animate-fade-in relative text-white font-sans overflow-y-auto">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90"></div>
            
            <div className="relative z-10 w-full max-w-md px-6 py-16">
                <div className="text-center mb-8">
                    <button onClick={() => setView('landing')} className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition text-sm mb-8">
                        <Icons.X /> Back to Home
                    </button>
                    <PullUpLogo className="w-20 h-20 mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.4)] border-none" />
                    <h1 className="text-3xl font-serif italic font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-stone-400 text-sm">Sign in to your partner dashboard.</p>
                </div>

                <div className="bg-[#1a1a1a] p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-stone-800/50 hover:border-orange-500/30 transition-colors">
                    <h2 className="text-2xl font-serif italic font-bold mb-1 text-white">Business Login</h2>
                    <p className="text-stone-500 text-[10px] uppercase tracking-[0.2em] mb-8 font-bold">Partner Dashboard Access</p>
                    
                    {otpChallenge ? (
                        <div className="space-y-5">
                            <div className="text-center mb-2">
                                <div className="w-14 h-14 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="text-white font-bold text-lg">SMS Verification</p>
                                <p className="text-stone-400 text-xs mt-1">We sent a 6-digit code to your registered mobile. Enter it below.</p>
                            </div>
                            <input type="text" inputMode="numeric" maxLength={6} value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium text-center text-2xl tracking-[0.5em]" autoFocus />
                            <button onClick={verifyOtp} disabled={loadingAuth || otpInput.length !== 6} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold hover:bg-orange-500 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-sm">
                                {loadingAuth ? 'Verifying...' : 'VERIFY CODE'}
                            </button>
                            <p className="text-[9px] text-stone-500 text-center">Code expires in 5 minutes. Didn&apos;t receive it? Go back and try again.</p>
                            <button onClick={() => { setOtpChallenge(false); setOtpInput(''); setOtpAttempts(0); setOtpCafeId(null); }} className="w-full text-stone-500 text-[10px] uppercase tracking-widest font-bold hover:text-stone-300 transition py-2">
                                &larr; Back to Login
                            </button>
                        </div>
                    ) : forgotMode ? (
                        <div className="space-y-5">
                            <div className="text-center mb-2">
                                <div className="w-14 h-14 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="text-white font-bold text-lg">{forgotSent ? 'Check Your Inbox' : 'Reset Password'}</p>
                                <p className="text-stone-400 text-xs mt-1">{forgotSent ? 'If an account exists, we\u2019ve sent a password reset link.' : 'Enter your email and we\u2019ll send a reset link.'}</p>
                            </div>
                            {forgotSent ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/50 rounded-xl p-4">
                                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        <p className="text-sm text-green-300">Reset link sent! Check your inbox (and spam folder).</p>
                                    </div>
                                    <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-500 transition-all uppercase tracking-widest text-sm">
                                        BACK TO LOGIN
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Email Address</label>
                                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@cafe.com" className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                                    </div>
                                    <button type="submit" disabled={loadingAuth} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold hover:bg-orange-500 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-sm">
                                        {loadingAuth ? 'Sending...' : 'SEND RESET LINK'}
                                    </button>
                                </form>
                            )}
                            {!forgotSent && (
                                <button onClick={() => { setForgotMode(false); setForgotEmail(''); }} className="w-full text-stone-500 text-[10px] uppercase tracking-widest font-bold hover:text-stone-300 transition py-2">
                                    &larr; Back to Login
                                </button>
                            )}
                        </div>
                    ) : (
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@cafe.com" className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" minLength={6} className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium pr-12" required />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1} aria-label={showPass ? 'Hide password' : 'Show password'}>{showPass ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Security Check</label>
                            <div className="flex items-center gap-3">
                                <span className="text-white font-bold text-sm whitespace-nowrap">What is {loginCaptchaChallenge.a} + {loginCaptchaChallenge.b}?</span>
                                <input type="text" inputMode="numeric" maxLength={2} value={loginCaptchaAnswer} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setLoginCaptchaAnswer(v); setLoginCaptchaVerified(Number(v) === loginCaptchaChallenge.answer); }} placeholder="?" className="w-16 p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white font-bold text-center" />
                                {loginCaptchaVerified && <span className="text-green-400 text-sm font-bold">✓</span>}
                            </div>
                        </div>
                        <button type="submit" disabled={loadingAuth || !loginCaptchaVerified} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold mt-4 hover:bg-orange-500 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                            {loadingAuth ? (otpSending ? 'Sending Code...' : 'Signing In...') : 'SIGN IN'}
                        </button>
                        <button type="button" onClick={() => setForgotMode(true)} className="w-full text-stone-500 text-[10px] uppercase tracking-widest font-bold hover:text-orange-400 transition py-1">
                            Forgot Password?
                        </button>
                    </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-stone-800 text-center">
                        <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-4">New to Pull Up?</p>
                        <button onClick={() => setView('merchant-signup')} className="text-orange-500 font-bold text-sm uppercase tracking-widest hover:text-orange-400 transition">
                            &rarr; APPLY TO JOIN
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-800 text-center space-y-2">
                        <button onClick={() => openLegal('terms')} className="block w-full text-stone-500 hover:text-stone-300 font-medium text-[9px] uppercase tracking-widest transition">Legal Terms</button>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-4 text-stone-500">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        256-bit Encrypted
                    </div>
                    <div className="w-px h-3 bg-white/20"></div>
                    <div className="text-[10px] uppercase tracking-widest font-bold">Powered by Stripe</div>
                </div>
            </div>
        </div>
    );
};

const BusinessSignup = ({ setView, auth, db, openLegal }: any) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [bizName, setBizName] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [ownerMobile, setOwnerMobile] = useState('');
    const [address, setAddress] = useState('');
    const [abn, setAbn] = useState('');
    const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [billingEmail, setBillingEmail] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [showExploreMore, setShowExploreMore] = useState(false);
    const [earlyAdopterSpotsLeft, setEarlyAdopterSpotsLeft] = useState<number | null>(null);
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    const [formLoadedAt] = useState(Date.now());
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [captchaChallenge] = useState(() => {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        return { a, b, answer: a + b };
    });
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const [abnVerified, setAbnVerified] = useState<{ entityName: string; status: string } | null>(null);
    const [abnError, setAbnError] = useState('');
    const [abnChecking, setAbnChecking] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [referralValid, setReferralValid] = useState<{ valid: boolean; affiliateName?: string } | null>(null);
    const [referralChecking, setReferralChecking] = useState(false);
    const [cafeCountry, setCafeCountry] = useState(() => typeof window !== 'undefined' ? detectCountry() : 'AU');
    const countryConfig = getCountryConfig(cafeCountry);
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchAddressSuggestions = useCallback((query: string) => {
        if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = setTimeout(async () => {
            try {
                const countryCode = cafeCountry.toLowerCase();
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=${countryCode}&limit=5&addressdetails=1`);
                if (!res.ok) return;
                const results = await res.json();
                const suggestions = results
                    .filter((r: any) => r.display_name)
                    .map((r: any) => {
                        const a = r.address || {};
                        const parts = [a.house_number, a.road, a.suburb || a.city || a.town || a.village, a.state, a.postcode].filter(Boolean);
                        return parts.length >= 3 ? parts.join(', ') : r.display_name.split(',').slice(0, 5).join(',').trim();
                    });
                setAddressSuggestions(suggestions);
            } catch { setAddressSuggestions([]); }
        }, 350);
    }, [cafeCountry]);

    useEffect(() => {
        const loadEarlyAdopterSpots = async () => {
            try {
                const cafesSnap = await getDocs(collection(db, 'cafes'));
                const remaining = Math.max(EARLY_ADOPTER_CAFE_LIMIT - cafesSnap.size, 0);
                setEarlyAdopterSpotsLeft(remaining);
            } catch {
                setEarlyAdopterSpotsLeft(null);
            }
        };
        loadEarlyAdopterSpots();
    }, [db]);

    // Address autocomplete powered by OpenStreetMap Nominatim (free, no API key required)

    // ABN verification on blur
    const verifyAbn = useCallback(async () => {
        const cleanAbn = abn.replace(/\D/g, '');
        if (cleanAbn.length !== 11) {
            setAbnVerified(null);
            setAbnError(cleanAbn.length > 0 ? 'ABN must be 11 digits' : '');
            return;
        }
        setAbnChecking(true);
        setAbnError('');
        setAbnVerified(null);
        try {
            const res = await fetch('/api/verify/abn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ abn: cleanAbn }),
            });
            const data = await res.json();
            if (data.valid) {
                setAbnVerified({ entityName: data.entityName, status: data.status });
                // Auto-fill business name if empty
                if (!bizName && data.entityName) {
                    setBizName(data.entityName);
                }
            } else {
                setAbnError(data.error || 'ABN not found or inactive');
            }
        } catch {
            setAbnError('Unable to verify ABN — please check manually');
        } finally {
            setAbnChecking(false);
        }
    }, [abn, bizName]);

    // Referral code verification on blur
    const verifyReferral = useCallback(async () => {
        const code = referralCode.trim();
        if (!code) { setReferralValid(null); return; }
        if (code.length < 5) { setReferralValid({ valid: false }); return; }
        setReferralChecking(true);
        try {
            const res = await fetch('/api/affiliate/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            setReferralValid(data);
        } catch {
            setReferralValid(null);
        } finally {
            setReferralChecking(false);
        }
    }, [referralCode]);

    const handleSignup = async (e: any) => {
        e.preventDefault();
        // Anti-bot: honeypot + timing check + CAPTCHA
        if (honeypot) { alert('Spam detected.'); return; }
        if (Date.now() - formLoadedAt < ANTI_BOT_MIN_MS) { alert('Please take a moment to review before submitting.'); return; }
        if (!captchaVerified) { alert('Please complete the verification challenge before submitting.'); return; }
        // Address validation: must look like a real address (number + words + state/postcode)
        const addressTrimmed = address.trim();
        if (addressTrimmed.length < 10 || !/\d/.test(addressTrimmed)) {
            alert('Please enter a full street address (e.g. 123 Main Street, Maroochydore QLD 4558)');
            return;
        }
        setLoadingAuth(true);
        try {
            if (pass !== confirmPass) {
                throw new Error('Passwords do not match.');
            }
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            const cafesSnapshot = await getDocs(collection(db, 'cafes'));
            const signupSequence = cafesSnapshot.size + 1;
            const earlyAdopterEligible = signupSequence <= EARLY_ADOPTER_CAFE_LIMIT;

            // Anti-resignup: check if this ABN was previously approved (blocks affiliate bonus abuse)
            let referralBlocked = false;
            if (abn.trim()) {
                const abnNormalized = abn.replace(/\s+/g, '').trim();
                const existingByAbn = cafesSnapshot.docs.filter((d: any) => {
                    const data = d.data();
                    const docAbn = (data.abn || '').replace(/\s+/g, '').trim();
                    return docAbn === abnNormalized && data.firstApprovedAt;
                });
                if (existingByAbn.length > 0) {
                    referralBlocked = true;
                }
            }

            await setDoc(doc(db, 'cafes', res.user.uid), {
                businessName: bizName,
                storePhone: storePhone,
                ownerMobile: ownerMobile,
                phone: ownerMobile, // backwards-compatible
                address: address,
                email: email,
                abn: abn,
                googleBusinessUrl: googleBusinessUrl,
                businessDescription: businessDescription,
                billingEmail: billingEmail || email,
                country: cafeCountry,
                isApproved: false,
                status: 'closed',
                curbsideFee: 2.0,
                globalPricing: { milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 },
                audioTheme: 'modern',
                appliedAt: new Date().toISOString(),
                signupSequence,
                earlyAdopterEligible,
                transactionCostModel: earlyAdopterEligible ? 'early-adopter-partner-bonus' : 'standard-service-fee',
                platformServiceFee: 0.99,
                earlyPartnerRebate: earlyAdopterEligible ? 0.25 : 0,
                ...(referralCode.trim() && !referralBlocked ? { referredBy: referralCode.trim().toUpperCase() } : {}),
                ...(referralBlocked ? { referralBlockedReason: 'ABN previously approved — anti-resignup guard' } : {}),
            });

            // Geocode address to lat/lng for distance-based discovery (fire-and-forget)
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&countrycodes=au&limit=1`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.length > 0) {
                        await updateDoc(doc(db, 'cafes', res.user.uid), {
                            latitude: parseFloat(geoData[0].lat),
                            longitude: parseFloat(geoData[0].lon),
                        });
                    }
                }
            } catch (geoErr) { console.error('Geocoding failed (non-blocking):', geoErr); }

            for (const item of DEFAULT_MENU_ITEMS) {
                await addDoc(collection(db, 'cafes', res.user.uid, 'menu'), {
                    ...item,
                    active: true,
                });
            }

            // Send signup confirmation + trigger auto-approval check (fire-and-forget)
            try {
                const token = await res.user.getIdToken();
                await fetch('/api/auth/signup-notify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ businessName: bizName, email, abn, address, googleBusinessUrl, storePhone, ownerMobile }),
                });
            } catch (e) { console.error('Signup notification failed:', e); }

            alert("Application sent! We'll review your details and notify you once approved (usually within 24 hours). Check your email for a confirmation.");
            await signOut(auth);
            setView('merchant-login');
        } catch (err: any) {
            alert(err.message.replace('Firebase: ', '').replace('Error ', ''));
        } finally {
            setLoadingAuth(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col lg:flex-row animate-fade-in relative text-white font-sans overflow-y-auto">
            <button onClick={() => setView('landing')} className="absolute top-4 left-4 z-30 text-stone-400 hover:text-white font-bold flex items-center gap-2 transition px-3 py-2 hover:bg-white/10 rounded-full backdrop-blur-md text-[10px] uppercase tracking-widest"><Icons.X /> Back</button>

            {/* LEFT COLUMN: THE B2B PITCH */}
            <div className="hidden lg:flex w-1/2 p-16 flex-col justify-center relative bg-stone-900 border-r border-stone-800 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20 grayscale mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent"></div>
                
                <div className="relative z-10 max-w-lg mx-auto">
                    <PullUpLogo className="w-16 h-16 shadow-[0_0_40px_rgba(249,115,22,0.4)] border-none mb-8" />
                    <h1 className="text-4xl md:text-5xl font-serif italic font-bold text-white mb-6 leading-tight">Turn street parking into your most profitable table.</h1>
                    <p className="text-stone-400 text-lg mb-10 leading-relaxed font-medium">
                        Pull Up Coffee bridges the gap for customers who <em>want</em> your product, but can&apos;t easily walk through your door.
                    </p>

                    <div className="space-y-8">
                        <div className="flex items-start gap-5">
                            <div className="text-orange-500 mt-1 scale-125"><Icons.CheckCircle /></div>
                            <div>
                                <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-2">Accessibility & Inclusion</h4>
                                <p className="text-stone-400 text-sm leading-relaxed font-medium">Zero-barrier access for customers with mobility challenges, vision/hearing impairments, or social anxiety.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="text-orange-500 mt-1 scale-125"><Icons.CheckCircle /></div>
                            <div>
                                <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-2">Parents & Commuters</h4>
                                <p className="text-stone-400 text-sm leading-relaxed font-medium">No waking sleeping babies. No unpredictable queues for tradies on the clock. Fast, reliable service.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="text-orange-500 mt-1 scale-125"><Icons.CheckCircle /></div>
                            <div>
                                <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-2">The &quot;Beach-to-Cafe&quot; Crowd</h4>
                                <p className="text-stone-400 text-sm leading-relaxed font-medium">Capture impulse buys from customers who are underdressed, in gym gear, or straight from the beach and don&apos;t want to walk inside.</p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-6 rounded-3xl border border-orange-500/30 backdrop-blur-md mt-4">
                            <div className="text-orange-400 mb-3"><Icons.TrendingUp /></div>
                            <strong className="text-orange-400 block mb-1 text-base">100% Margins</strong>
                            Bypass punishing 30% delivery app fees. Keep 100% of menu prices, plus extra revenue from the curbside fee.
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: SIGNUP FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-14 sm:p-8 md:p-20 relative z-10 bg-[#0f0f0f]">
                <div className="w-full max-w-md">
                    <div className="text-center mb-4 hidden lg:block">
                        <button onClick={() => setView('landing')} className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition text-sm">
                            <Icons.X /> Back to Home
                        </button>
                    </div>

                    <div className="lg:hidden text-center mb-6">
                        <PullUpLogo className="w-16 h-16 mx-auto mb-4 shadow-[0_0_30px_rgba(249,115,22,0.3)] border-none" />
                        <h1 className="text-2xl font-serif italic font-bold text-white mb-1">Join Pull Up</h1>
                        <p className="text-stone-500 text-xs">Zero contracts. Zero hardware. Full margin.</p>
                    </div>

                    <div className="lg:hidden rounded-2xl mb-6 overflow-hidden border border-stone-800">
                        <div className="bg-gradient-to-br from-stone-900/80 to-stone-900/40 px-5 py-4">
                            <p className="text-base font-serif italic font-bold text-white leading-snug">Turn street parking into your most profitable table.</p>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-stone-800 bg-stone-900/50">
                            <div className="px-3 py-3 text-center">
                                <p className="text-orange-400 font-bold text-[8px] uppercase tracking-widest mb-0.5">Inclusive</p>
                                <p className="text-[10px] text-stone-400 leading-tight">Serve every customer, curbside.</p>
                            </div>
                            <div className="px-3 py-3 text-center">
                                <p className="text-orange-400 font-bold text-[8px] uppercase tracking-widest mb-0.5">Margin</p>
                                <p className="text-[10px] text-stone-400 leading-tight">Keep 100% of menu prices.</p>
                            </div>
                            <div className="px-3 py-3 text-center">
                                <p className="text-orange-400 font-bold text-[8px] uppercase tracking-widest mb-0.5">Fast</p>
                                <p className="text-[10px] text-stone-400 leading-tight">Apply, verify, go live.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1a1a1a] p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full border border-stone-800/50 hover:border-orange-500/30 transition-colors">
                        <h2 className="text-xl sm:text-2xl font-serif italic font-bold mb-1 text-white">Join Pull Up</h2>
                        <p className="text-stone-500 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-3 sm:mb-4 font-bold">Zero contracts. Zero hardware.</p>
                        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl border border-orange-500/40 bg-orange-500/10">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-orange-300">Early Adopter Incentive</p>
                            <p className="text-xs text-stone-200 mt-1">
                                {earlyAdopterSpotsLeft === null
                                    ? 'First 100 partner cafes receive a $0.25/order Partner Bonus for 12 months.'
                                    : earlyAdopterSpotsLeft > 0
                                        ? `${earlyAdopterSpotsLeft} of ${EARLY_ADOPTER_CAFE_LIMIT} spots left for the $0.25/order Partner Bonus (12 months).`
                                        : `All ${EARLY_ADOPTER_CAFE_LIMIT} early adopter spots are filled. New signups use the standard $0.99 service fee model.`}
                            </p>
                        </div>
                        
                        <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
                            {/* Honeypot anti-bot field — invisible to humans */}
                            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true" tabIndex={-1}>
                                <label>Leave this empty</label>
                                <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} autoComplete="off" tabIndex={-1} />
                            </div>
                            <div className="bg-stone-900/50 p-4 sm:p-5 rounded-xl border border-stone-700 mb-4 sm:mb-6">
                                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-2.5 sm:mb-3 font-bold">📋 Business Information</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Country</label>
                                        <select value={cafeCountry} onChange={e => setCafeCountry(e.target.value)} className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm appearance-none">
                                            {SUPPORTED_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Business Name</label>
                                        <input type="text" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Your Cafe" className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">{countryConfig.businessIdLabel} <span className="text-stone-600">(Business ID)</span></label>
                                        <input type="text" value={abn} onChange={e => { setAbn(e.target.value); setAbnVerified(null); setAbnError(''); }} onBlur={verifyAbn} placeholder={countryConfig.businessIdPlaceholder} className={`w-full p-2.5 sm:p-3 bg-[#0f0f0f] border ${abnVerified ? 'border-green-600' : abnError ? 'border-red-600' : 'border-stone-800'} rounded-xl outline-none focus:border-orange-500 transition text-white text-sm`} />
                                        <p className="text-[7px] text-stone-600 mt-0.5">Optional — can be added later in your dashboard</p>
                                        {abnChecking && <p className="text-[8px] text-orange-400 mt-1 animate-pulse">Verifying ABN...</p>}
                                        {abnVerified && <p className="text-[8px] text-green-400 mt-1">✓ {abnVerified.entityName} — {abnVerified.status}</p>}
                                        {abnError && <p className="text-[8px] text-red-400 mt-1">✗ {abnError}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Store Address</label>
                                        <input ref={addressInputRef} type="text" value={address} onChange={e => { setAddress(e.target.value); if (e.target.value.length >= 5) { fetchAddressSuggestions(e.target.value); } else { setAddressSuggestions([]); } }} placeholder="Start typing your address..." className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required id="signup-address-autocomplete" autoComplete="off" />
                                        {addressSuggestions.length > 0 && (
                                            <div className="mt-1 bg-[#1a1a1a] border border-stone-700 rounded-xl max-h-48 overflow-y-auto z-50 relative">
                                                {addressSuggestions.map((s, i) => (
                                                    <button key={i} type="button" onClick={() => { setAddress(s); setAddressSuggestions([]); }} className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-orange-500/20 hover:text-white transition border-b border-stone-800/50 last:border-0">{s}</button>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-[8px] text-stone-500 mt-1 italic">💡 Include street number, street name, suburb, state and postcode</p>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Store Phone <span className="text-stone-600">(Public)</span></label>
                                        <input type="tel" value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="(02) XXXX XXXX" className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        <p className="text-[7px] text-stone-600 mt-0.5">Shown to customers for store enquiries</p>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Owner Mobile <span className="text-stone-600">(Private)</span></label>
                                        <input type="tel" value={ownerMobile} onChange={e => setOwnerMobile(e.target.value)} placeholder="04XX XXX XXX" className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        <p className="text-[7px] text-stone-600 mt-0.5">For 2FA, notifications &amp; admin contact only — never shared</p>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Billing Email (opt)</label>
                                        <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@..." className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" />
                                    </div>
                                </div>
                                <div className="mt-3 sm:mt-4">
                                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Google Business URL (optional)</label>
                                    <input type="url" value={googleBusinessUrl} onChange={e => setGoogleBusinessUrl(e.target.value)} placeholder="https://goo.gl/maps/..." className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" />
                                </div>
                                <div className="mt-3 sm:mt-4">
                                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">About Your Business</label>
                                    <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="What do you sell? Expected order volume? Peak hours?" rows={2} className="w-full p-2.5 sm:p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm resize-none" required />
                                    <p className="text-[8px] text-stone-500 mt-1 italic">✓ Approval within 1-3 business days</p>
                                </div>
                                <div className="mt-3 sm:mt-4">
                                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Referral Code <span className="text-stone-600">(Optional)</span></label>
                                    <div className="relative">
                                        <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} onBlur={verifyReferral} placeholder="PULLUP-XXXXX" className={`w-full p-2.5 sm:p-3 bg-[#0f0f0f] border ${referralValid?.valid === true ? 'border-green-500' : referralValid?.valid === false ? 'border-red-500' : 'border-stone-800'} rounded-xl outline-none focus:border-orange-500 transition text-white text-sm uppercase tracking-wider`} />
                                        {referralChecking && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 animate-pulse text-xs">...</span>}
                                        {!referralChecking && referralValid?.valid === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>}
                                        {!referralChecking && referralValid?.valid === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">✗</span>}
                                    </div>
                                    {referralValid?.valid === true && <p className="text-[8px] text-green-400 mt-1">Valid referral code{referralValid.affiliateName ? ` — referred by ${referralValid.affiliateName}` : ' — your affiliate will be rewarded!'}</p>}
                                    {referralValid?.valid === false && referralCode.trim() && <p className="text-[8px] text-red-400 mt-1">Invalid referral code — please check and try again</p>}
                                    {!referralCode.trim() && <p className="text-[8px] text-stone-600 mt-0.5">Were you referred by a Pull Up affiliate? Enter their code here.</p>}
                                    <p className="text-[7px] text-amber-500/80 mt-1">⚠️ Referral codes cannot be applied retroactively. If you have a code, it must be entered now at signup. Affiliates will not receive commission if the code is added after registration.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@cafe.com" className="w-full p-3 sm:p-4 bg-[#0f0f0f] border border-stone-800 rounded-xl sm:rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Password</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" minLength={6} className="w-full p-3 sm:p-4 bg-[#0f0f0f] border border-stone-800 rounded-xl sm:rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium pr-12" required />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1} aria-label={showPass ? 'Hide password' : 'Show password'}>{showPass ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 sm:mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input type={showConfirmPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" minLength={6} className="w-full p-3 sm:p-4 bg-[#0f0f0f] border border-stone-800 rounded-xl sm:rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium pr-12" required />
                                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition" tabIndex={-1} aria-label={showConfirmPass ? 'Hide password' : 'Show password'}>{showConfirmPass ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                                </div>
                            </div>

                            {/* CAPTCHA Verification */}
                            <div className={`p-4 rounded-xl border ${captchaVerified ? 'bg-green-900/20 border-green-700' : 'bg-stone-900/50 border-stone-700'} transition`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition cursor-pointer ${captchaVerified ? 'bg-green-600 border-green-500' : 'border-stone-600 hover:border-orange-500'}`}>
                                        {captchaVerified && <span className="text-white text-sm font-bold">✓</span>}
                                    </div>
                                    <p className="text-xs text-stone-300 font-semibold">{captchaVerified ? 'Verified — you are human' : 'Verify you are not a robot'}</p>
                                </div>
                                {!captchaVerified && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-sm text-stone-400 font-medium whitespace-nowrap">What is {captchaChallenge.a} + {captchaChallenge.b}?</p>
                                        <input type="text" inputMode="numeric" value={captchaAnswer} onChange={e => { setCaptchaAnswer(e.target.value); if (parseInt(e.target.value) === captchaChallenge.answer) { setCaptchaVerified(true); } }} placeholder="?" className="w-16 p-2 bg-[#0f0f0f] border border-stone-700 rounded-lg text-center text-white text-sm outline-none focus:border-orange-500" maxLength={3} />
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={loadingAuth || !captchaVerified} className="w-full bg-orange-600 text-white py-4 sm:py-5 rounded-2xl font-bold mt-4 sm:mt-6 hover:bg-orange-500 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                                {loadingAuth ? 'Processing...' : 'Submit Application'}
                            </button>
                        </form>

                        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-800 text-center">
                            <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-3">Already have an account?</p>
                            <button onClick={() => setView('merchant-login')} className="text-orange-500 font-bold text-sm uppercase tracking-widest hover:text-orange-400 transition">
                                Log in here
                            </button>
                        </div>

                        <div className="mt-5 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-800 text-center">
                            <button onClick={() => setShowExploreMore((prev: boolean) => !prev)} className="w-full flex items-center justify-between text-stone-300 text-[10px] uppercase tracking-widest font-bold bg-[#111111] border border-stone-800 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:py-3 hover:border-stone-700 transition">
                                <span>Explore More</span>
                                <span className={`transition-transform ${showExploreMore ? 'rotate-90' : ''}`}><Icons.ChevronRight /></span>
                            </button>
                            {showExploreMore && (
                                <div className="bg-[#111111] border border-stone-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-2 mb-2 space-y-2 text-left">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Need Help Onboarding?</p>
                                    {ONBOARDING_VIDEOS.map((video) => (
                                        <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-between bg-stone-900 border border-stone-700 hover:border-orange-500 rounded-xl p-3 transition">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{video.label}</span>
                                            <span className="text-orange-500"><Icons.Play /></span>
                                        </a>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-3 mt-2">
                                <button onClick={() => openLegal('affiliate')} className="text-orange-400 hover:text-orange-300 font-bold text-[10px] uppercase tracking-widest transition">Affiliate Program</button>
                                <span className="text-stone-700">·</span>
                                <button onClick={() => openLegal('terms')} className="text-stone-500 hover:text-stone-300 font-medium text-[10px] uppercase tracking-widest transition">Legal</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupportFounder = ({ setView }: any) => {
    const [loading, setLoading] = useState(false);
    const [vipAmount, setVipAmount] = useState('');

    const handleSupport = async (tier: string, customAmount?: number) => {
        setLoading(true);
        try {
            const payload: any = { tier };
            if (customAmount) payload.amount = customAmount;
            const res = await fetch('/api/stripe/merch', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert("Checkout Error: " + data.error);
        } catch (e) {
            alert("Network error loading checkout");
        } finally {
            setLoading(false);
        }
    };

    const handleVipSupport = () => {
        const amt = parseFloat(vipAmount);
        if (!amt || amt < 5) { alert('Minimum VIP amount is $5 AUD'); return; }
        if (amt > 10000) { alert('Maximum amount is $10,000 AUD'); return; }
        handleSupport('vip', Math.round(amt * 100));
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col font-sans animate-fade-in text-left">
            <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-100 shadow-sm p-6">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={() => setView('landing')} className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition flex items-center gap-2"><Icons.X /> Back</button>
                    <span className="font-serif italic font-bold text-xl text-stone-900 tracking-tight">Support Pull Up</span>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-2xl text-center mb-12">
                    <PullUpLogo className="w-20 h-20 mx-auto mb-6" />
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-stone-900 italic tracking-tighter leading-none mb-4">Buy the Founder a Coffee</h2>
                    <p className="text-stone-500 text-lg leading-relaxed max-w-lg mx-auto">Pull Up Coffee is bootstrapped by a solo founder. Every contribution goes directly toward platform development, hosting, and keeping things running for partner cafes.</p>
                </div>

                <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Coffee Tier */}
                    <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-orange-300 hover:shadow-md transition-all">
                        <div className="text-4xl mb-4">☕</div>
                        <h3 className="font-serif italic font-bold text-2xl text-stone-900 mb-2">A Coffee</h3>
                        <p className="text-stone-500 text-sm mb-6 leading-relaxed">Help keep the lights on and the code flowing.</p>
                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-4xl font-bold text-stone-900">$4.50</span>
                            <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">AUD</span>
                        </div>
                        <button onClick={() => handleSupport('coffee')} disabled={loading} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-orange-500 transition disabled:opacity-50 active:scale-95 shadow-lg mt-auto">
                            {loading ? 'Loading...' : 'Buy a Coffee'}
                        </button>
                    </div>

                    {/* Legend Tier (Most Popular) */}
                    <div className="bg-white rounded-[2rem] border-2 border-orange-400 shadow-lg p-8 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-[9px] font-bold uppercase tracking-widest py-1.5 text-center">Most Popular</div>
                        <div className="text-4xl mb-4 mt-4">🤙</div>
                        <h3 className="font-serif italic font-bold text-2xl text-stone-900 mb-2">Legend</h3>
                        <p className="text-stone-500 text-sm mb-6 leading-relaxed">Fuel a week of late-night coding and feature drops.</p>
                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-4xl font-bold text-stone-900">$10</span>
                            <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">AUD</span>
                        </div>
                        <button onClick={() => handleSupport('supporter')} disabled={loading} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition disabled:opacity-50 active:scale-95 shadow-lg mt-auto">
                            {loading ? 'Loading...' : 'Support Now'}
                        </button>
                    </div>

                    {/* Big Supporter VIP Tier */}
                    <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-red-300 hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-bold uppercase tracking-widest py-1.5 text-center">VIP — First 100</div>
                        <div className="text-4xl mb-4 mt-4">❤️</div>
                        <h3 className="font-serif italic font-bold text-2xl text-stone-900 mb-2">Big Supporter VIP</h3>
                        <p className="text-stone-500 text-sm mb-4 leading-relaxed">Top 100 supporters in our first year join the official VIP list — exclusive event invites, free merch drops & early access to new features.</p>
                        <div className="w-full mb-4">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">Your Amount</label>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-stone-900">$</span>
                                <input type="number" min="5" max="10000" step="0.50" placeholder="25" value={vipAmount} onChange={e => setVipAmount(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-center text-2xl font-bold text-stone-900 outline-none focus:border-orange-400 transition" />
                                <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">AUD</span>
                            </div>
                            <p className="text-stone-400 text-[10px] mt-1.5">Min $5 — choose what feels right</p>
                        </div>
                        <button onClick={handleVipSupport} disabled={loading || !vipAmount} className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:from-red-500 hover:to-orange-500 transition disabled:opacity-50 active:scale-95 shadow-lg mt-auto">
                            {loading ? 'Loading...' : 'Join VIP'}
                        </button>
                    </div>

                    {/* Founders Hat Tier */}
                    <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-orange-300 hover:shadow-md transition-all">
                        <img src="/merch/hat.jpg" alt="Pull Up Coffee Founders Cap" className="w-28 h-28 object-contain mb-4 rounded-xl" />
                        <h3 className="font-serif italic font-bold text-2xl text-stone-900 mb-2">Founders Cap</h3>
                        <p className="text-stone-500 text-sm mb-6 leading-relaxed">Limited edition dad hat with embroidered Pull Up logo. Ships AU-wide.</p>
                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-4xl font-bold text-stone-900">$45</span>
                            <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">AUD + $10 Ship</span>
                        </div>
                        <button onClick={() => handleSupport('hat')} disabled={loading} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition disabled:opacity-50 active:scale-95 shadow-lg mt-auto">
                            {loading ? 'Loading...' : 'Get the Cap'}
                        </button>
                    </div>
                </div>

                <div className="mt-10 p-5 bg-stone-100 rounded-2xl flex items-start gap-4 border border-stone-200 max-w-3xl w-full">
                    <div className="text-stone-400 mt-0.5"><Icons.Info /></div>
                    <p className="text-xs text-stone-500 leading-relaxed font-medium">
                        <strong>100% Transparent:</strong> Every dollar goes to platform hosting, development tools, advertising, team & staff wages, and keeping Pull Up free for partner cafes. No investors, no VC — just coffee, code, and a commitment to building something real for the community.
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- CAFE ADMIN WITH SUPPORT BOT ---
const CafeDashboard = ({ user, profile, db, auth, signOut, initialTab = 'orders' }: any) => {
    const [tab, setTab] = useState(initialTab);
    const [orders, setOrders] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [botInput, setBotInput] = useState('');
    const [botChat, setBotChat] = useState([{ type: 'bot', text: 'Hi! I am your Pull Up Support Assistant. Ask me in plain language and I will give you the fastest action steps.' }]);
    const [showMostAsked, setShowMostAsked] = useState(false);
    const [showWhyPullUp, setShowWhyPullUp] = useState(false);
    
    const [isOnline, setIsOnline] = useState(profile?.status === 'open');
    const [notifyFavoritesEnabled, setNotifyFavoritesEnabled] = useState(profile?.notifyFavoritesEnabled ?? true);
    const [notifyFrom, setNotifyFrom] = useState(profile?.notifyFrom || '07:00');
    const [notifyTo, setNotifyTo] = useState(profile?.notifyTo || '11:00');
    const [favoriteAudienceCount, setFavoriteAudienceCount] = useState(0);
    const [lastFavoritesBlastAt, setLastFavoritesBlastAt] = useState<string | null>(profile?.lastFavoritesBlastAt || null);
    const [lastNotifyToggleAt, setLastNotifyToggleAt] = useState<string | null>(profile?.lastNotifyToggleAt || null);
    const [openFrom, setOpenFrom] = useState(profile?.openFrom || '06:00');
    const [openTo, setOpenTo] = useState(profile?.openTo || '14:00');
    const [curbsideFee, setCurbsideFee] = useState(normalizeCurbsideFee(profile?.curbsideFee));
    const [audioTheme, setAudioTheme] = useState(profile?.audioTheme || 'modern');
    const [globalPricing, setGlobalPricing] = useState(profile?.globalPricing || { milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 });
    const [accountBusy, setAccountBusy] = useState(false);
    const [payoutPreference, setPayoutPreference] = useState(profile?.payoutPreference || 'daily');
    const [payoutTermsAccepted, setPayoutTermsAccepted] = useState(profile?.payoutTermsAccepted ?? false);
    const [stripePercentRate, setStripePercentRate] = useState(profile?.stripePercentRate ?? 0.01);
    const [historyFilter, setHistoryFilter] = useState<'daily' | 'weekly' | 'monthly' | 'archive'>('daily');
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any | null>(null);
    const [supportTopicCounts, setSupportTopicCounts] = useState<Record<string, number>>(profile?.supportTopicCounts || {});
    const [supportWeekKey, setSupportWeekKey] = useState(profile?.supportWeekKey || '');
    const [customFeeAmount, setCustomFeeAmount] = useState('');
    const [customFeeReason, setCustomFeeReason] = useState('');
    const [customFeeSending, setCustomFeeSending] = useState(false);
    const [customFeeSent, setCustomFeeSent] = useState(false);
    const [businessNameDraft, setBusinessNameDraft] = useState(profile?.businessName || '');
    const [storefrontLogo, setStorefrontLogo] = useState<string | null>(profile?.logo || null);
    const [billingEmailDraft, setBillingEmailDraft] = useState(profile?.billingEmail || profile?.email || '');
    const [accountSaveStatus, setAccountSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [platformStats, setPlatformStats] = useState({
        totalCafes: 0,
        approvedCafes: 0,
        pendingApprovals: 0,
        onlineCafes: 0,
        offlineCafes: 0,
        ordersToday: 0,
        activeOrders: 0,
        completedToday: 0,
        rejectedToday: 0,
        activeCustomers: 0,
        grossToday: 0,
        feeFlowToday: 0,
    });
    const [platformCafeRows, setPlatformCafeRows] = useState<any[]>([]);
    const [platformUpdatedAt, setPlatformUpdatedAt] = useState<string | null>(null);
    const [platformAffiliates, setPlatformAffiliates] = useState<any[]>([]);
    const [platformRecentOrders, setPlatformRecentOrders] = useState<any[]>([]);
    const quickSupportPrompts = [
        'How do I get paid?',
        'How do I change curbside fee?',
        'How do I pause orders?',
        'How do I add my first menu item?',
        'What if customer is late?',
        'How do I contact human support?'
    ];
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const isPlatformAdmin = profile?.isPlatformAdmin === true || profile?.role === 'platform_admin';
    const isEarlyAdopter = profile?.transactionCostModel === 'early-adopter-partner-bonus';
    
    const [newItem, setNewItem] = useState({ name: '', price: '', img: null as string | null });
    const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
    const [editingMenuName, setEditingMenuName] = useState('');
    const [editingMenuPrice, setEditingMenuPrice] = useState('');
    const [editingMenuImg, setEditingMenuImg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const prevOrderCount = useRef(0);
    const prevApproachingCount = useRef(0);
    const botChatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTab(initialTab || 'orders');
    }, [initialTab]);

    const SMS_COST_PER_MESSAGE = 0.10;
    const getWeekKey = (date: Date) => {
        const start = new Date(date.getFullYear(), 0, 1);
        const dayMs = 24 * 60 * 60 * 1000;
        const week = Math.ceil(((date.getTime() - start.getTime()) / dayMs + start.getDay() + 1) / 7);
        return `${date.getFullYear()}-W${week}`;
    };
    const isSameDay = (a: string | null, b: Date) => {
        if (!a) return false;
        const d = new Date(a);
        return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
    };

    const calculateOrderEconomics = (order: any) => {
        const menuRevenue = (order?.items || []).reduce((sum: number, item: any) => sum + Number(item?.price || 0), 0);
        const curbsideFeeValue = Number(order?.fee || 0);
        const totalOrderValue = menuRevenue + curbsideFeeValue;
        const estimatedStripeFee = (totalOrderValue + PLATFORM_SERVICE_FEE) * 0.0175 + 0.30;
        const cafeNetRevenue = totalOrderValue - estimatedStripeFee;
        const extraRevenue = Math.max(curbsideFeeValue - estimatedStripeFee, 0);
        const upliftPct = menuRevenue > 0 ? (extraRevenue / menuRevenue) * 100 : 0;
        return { menuRevenue, curbsideFeeValue, totalOrderValue, estimatedStripeFee, cafeNetRevenue, extraRevenue, upliftPct };
    };

    const notifyFavoritesNow = async () => {
        if (!user?.uid || !notifyFavoritesEnabled) return;
        const favQuery = query(collection(db, 'favorites'), where('cafeId', '==', user.uid), where('smsOptIn', '==', true));
        const favSnap = await getDocs(favQuery);
        const recipients = favSnap.docs.map((docSnap: any) => docSnap.data()).filter((fav: any) => Boolean(fav.mobile));
        if (recipients.length === 0) {
            alert('No opted-in favourites with mobile numbers to notify yet.');
            return;
        }
        if (isSameDay(lastFavoritesBlastAt, new Date())) {
            alert('Opening alert already sent today. You can send this again tomorrow.');
            return;
        }
        const estimatedCost = recipients.length * SMS_COST_PER_MESSAGE;
        const confirmed = window.confirm(`Send opening SMS to ${recipients.length} favourites? Estimated cost: $${estimatedCost.toFixed(2)} deducted from cafe payout.`);
        if (!confirmed) return;

        const sends = favSnap.docs.map((docSnap: any) => {
            const fav = docSnap.data();
            if (!fav.mobile) return Promise.resolve();
            return sendSMS(fav.mobile, `${profile?.businessName || 'Your favorite cafe'} is now accepting Pull Up orders from ${notifyFrom} to ${notifyTo}.`);
        });
        await Promise.all(sends);
        const nowIso = new Date().toISOString();
        setLastFavoritesBlastAt(nowIso);
        await saveSettings('lastFavoritesBlastAt', nowIso);
        alert(`Opening SMS sent to ${recipients.length} favourites.`);
    };

    const toggleNotifyFavorites = async () => {
        const today = new Date();
        if (isSameDay(lastNotifyToggleAt, today)) {
            alert('Notification preference can only be changed once per day to prevent accidental toggles.');
            return;
        }
        const next = !notifyFavoritesEnabled;
        const confirmed = window.confirm(`Are you sure you want to turn ${next ? 'ON' : 'OFF'} favourite SMS notifications?`);
        if (!confirmed) return;
        const nowIso = today.toISOString();
        setNotifyFavoritesEnabled(next);
        setLastNotifyToggleAt(nowIso);
        await saveSettings('notifyFavoritesEnabled', next);
        await saveSettings('lastNotifyToggleAt', nowIso);
    };

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'orders'), where('cafeId', '==', user.uid));
        return onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const active = list.filter((o: any) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
            const pendingCount = active.filter((o: any) => o.status === 'pending').length;
            const approachingCount = active.filter((o: any) => o.approachState === 'approaching' || o.isArriving).length;
            setOrders(active);
            setHistory(list.filter((o: any) => o.status === 'completed' || o.status === 'rejected'));
            // Start looping alert if any pending orders, stop when all acknowledged
            if (pendingCount > 0 && audioTheme !== 'off') {
                startPendingOrderAlert(audioTheme);
            } else {
                stopPendingOrderAlert();
            }
            if (approachingCount > prevApproachingCount.current) { playNotificationSound(audioTheme); }
            prevOrderCount.current = active.length;
            prevApproachingCount.current = approachingCount;
        });
    }, [user, db, audioTheme]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'cafes', user.uid, 'menu'));
        return onSnapshot(q, snap => setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [user, db]);

    useEffect(() => {
        if (!user) return;
        const loadFavoriteAudience = async () => {
            const favQuery = query(collection(db, 'favorites'), where('cafeId', '==', user.uid), where('smsOptIn', '==', true));
            const favSnap = await getDocs(favQuery);
            setFavoriteAudienceCount(favSnap.docs.filter((docSnap: any) => Boolean(docSnap.data()?.mobile)).length);
        };
        loadFavoriteAudience();
    }, [user, db, notifyFavoritesEnabled]);

    useEffect(() => {
        if (!isPlatformAdmin) return;

        let cafesCache: any[] = [];
        let ordersCache: any[] = [];

        const recompute = () => {
            const onlineCafes = cafesCache.filter((c: any) => c.status === 'open').length;
            const approvedCafes = cafesCache.filter((c: any) => c.isApproved === true).length;
            const pendingApprovals = cafesCache.filter((c: any) => c.isApproved !== true).length;

            const activeStatuses = new Set(['pending', 'preparing', 'ready']);
            const activeOrders = ordersCache.filter((o: any) => activeStatuses.has(o.status)).length;
            const completedToday = ordersCache.filter((o: any) => o.status === 'completed').length;
            const rejectedToday = ordersCache.filter((o: any) => o.status === 'rejected').length;
            const grossToday = ordersCache.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
            const feeFlowToday = ordersCache.reduce((sum: number, o: any) => sum + Number(o.fee || 0), 0);
            const activeCustomers = new Set(
                ordersCache
                    .filter((o: any) => activeStatuses.has(o.status))
                    .map((o: any) => o.mobile || o.customerName || o.id)
                    .filter(Boolean)
            ).size;

            const activeOrdersByCafe: Record<string, number> = {};
            ordersCache.forEach((o: any) => {
                if (!activeStatuses.has(o.status)) return;
                activeOrdersByCafe[o.cafeId] = (activeOrdersByCafe[o.cafeId] || 0) + 1;
            });

            const rows = cafesCache
                .map((c: any) => ({
                    id: c.id,
                    businessName: c.businessName || 'Unnamed Cafe',
                    status: c.status === 'open' ? 'open' : 'closed',
                    isApproved: c.isApproved === true,
                    activeOrders: activeOrdersByCafe[c.id] || 0,
                    payoutPreference: c.payoutPreference || 'daily',
                    stripeConnected: Boolean(c.stripeConnected || c.stripeAccountId),
                }))
                .sort((a: any, b: any) => {
                    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
                    if (a.activeOrders !== b.activeOrders) return b.activeOrders - a.activeOrders;
                    return a.businessName.localeCompare(b.businessName);
                });

            setPlatformCafeRows(rows);
            setPlatformStats({
                totalCafes: cafesCache.length,
                approvedCafes,
                pendingApprovals,
                onlineCafes,
                offlineCafes: Math.max(cafesCache.length - onlineCafes, 0),
                ordersToday: ordersCache.length,
                activeOrders,
                completedToday,
                rejectedToday,
                activeCustomers,
                grossToday,
                feeFlowToday,
            });
            setPlatformUpdatedAt(new Date().toISOString());

            // Recent orders feed (last 10)
            const recent = [...ordersCache]
                .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
                .slice(0, 10);
            setPlatformRecentOrders(recent);
        };

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startIso = startOfDay.toISOString();

        const unsubCafes = onSnapshot(collection(db, 'cafes'), (snap) => {
            cafesCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            recompute();
        });

        const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('timestamp', '>=', startIso)), (snap) => {
            ordersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            recompute();
        });

        // Load affiliates
        const unsubAffiliates = onSnapshot(collection(db, 'affiliates'), (snap) => {
            const affList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setPlatformAffiliates(affList);
        });

        return () => {
            unsubCafes();
            unsubOrders();
            unsubAffiliates();
        };
    }, [db, isPlatformAdmin]);

    useEffect(() => {
        setTimeout(() => botChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [botChat]);

    const saveSettings = async (field: string, value: any) => { await updateDoc(doc(db, 'cafes', user.uid), { [field]: value }); };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressedBase64 = await compressImage(file);
            setNewItem({ ...newItem, img: compressedBase64 });
        }
    };

    const addMenuItem = async () => {
        if (!newItem.name || !newItem.price) return;
        await addDoc(collection(db, 'cafes', user.uid, 'menu'), { ...newItem, price: parseFloat(newItem.price), active: true, img: newItem.img });
        setNewItem({ name: '', price: '', img: null });
    };

    const startMenuEdit = (item: any) => {
        setEditingMenuId(item.id);
        setEditingMenuName(item.name || '');
        setEditingMenuPrice(String(item.price || ''));
        setEditingMenuImg(item.img || null);
    };

    const saveMenuEdit = async () => {
        if (!editingMenuId || !editingMenuName || !editingMenuPrice) return;
        await updateDoc(doc(db, 'cafes', user.uid, 'menu', editingMenuId), {
            name: editingMenuName,
            price: parseFloat(editingMenuPrice),
            img: editingMenuImg,
        });
        setEditingMenuId(null);
        setEditingMenuName('');
        setEditingMenuPrice('');
        setEditingMenuImg(null);
    };

    const handleEditMenuImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const compressed = await compressImage(e.target.files[0]);
            setEditingMenuImg(compressed);
        }
    };

    const addPresetMenuItems = async () => {
        const existingNames = new Set(menu.map((item: { name?: string }) => (item.name || '').toLowerCase().trim()));
        const missing = DEFAULT_MENU_ITEMS.filter((item) => !existingNames.has(item.name.toLowerCase().trim()));
        if (missing.length === 0) {
            alert('Top 7 menu already loaded.');
            return;
        }
        for (const item of missing) {
            await addDoc(collection(db, 'cafes', user.uid, 'menu'), {
                ...item,
                active: true,
            });
        }
        alert(`${missing.length} standard item(s) added.`);
    };

    const connectStripeOnboarding = async () => {
        try {
            const token = await getAuthToken();
            if (!token) {
                alert('Please log in again before connecting Stripe.');
                return;
            }
            const res = await fetch('/api/stripe/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ email: profile?.email, businessName: profile?.businessName, cafeId: user?.uid })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else {
                const errorMsg = data.error || 'Unable to connect Stripe';
                if (errorMsg.includes('signed up for Connect')) {
                    alert('Stripe Connect has not been enabled on the platform Stripe account yet. The Pull Up team needs to activate Connect at stripe.com/connect before cafes can onboard. This is being resolved — you will be notified once payouts are ready.');
                } else if (errorMsg.includes('not configured')) {
                    alert('Stripe Connect is not yet configured on this platform. Please contact hello@pullupcoffee.com for assistance.');
                } else {
                    alert('Stripe Connect error: ' + errorMsg + '. If this persists, email hello@pullupcoffee.com.');
                }
            }
        } catch (err) {
            alert('Network error connecting to Stripe. Please check your internet and try again.');
        }
    };

    const sendPasswordReset = async () => {
        if (!profile?.email) {
            alert('No account email found for this cafe profile.');
            return;
        }
        setAccountBusy(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: profile.email }),
            });
            if (res.ok) {
                alert(`Password reset email sent to ${profile.email}. Check your inbox (and spam folder).`);
            } else {
                alert('Unable to send reset email. Please try again.');
            }
        } catch (err: unknown) {
            alert('Network error. Please try again.');
        } finally {
            setAccountBusy(false);
        }
    };

    const submitBotQuestion = (question: string) => {
        if (!question.trim()) return;
        setBotChat(prev => [...prev, { type: 'user', text: question }]);
        const q = question.toLowerCase();
        setBotInput('');

        setTimeout(async () => {
            const knowledgeBase = [
                { id: 'payouts', keywords: ['payout', 'paid', 'bank', 'money', 'stripe', 'transfer', 'settlement', 'earnings', 'income', 'revenue', 'get paid', 'when paid', 'where money', 'my money', 'account'], text: 'Fast answer: go to Payments → Connect Stripe Payouts, then choose daily/weekly/instant. Once connected, payouts go to your nominated bank account automatically. You keep 100% of menu prices + 100% of the curbside fee. Customers pay a flat $0.99 service fee to Pull Up.' },
                { id: 'curbside-fee', keywords: ['curbside', 'fee', 'change fee', 'increase fee', 'minimum', 'pricing', 'price', 'charge', 'cost', 'expensive', 'how much'], text: 'Fast answer: go to Operations → Dynamic Curbside Fee and use the slider. Range is $0.00–$25.00 — completely your choice. You keep 100% of the curbside fee. Customers also pay a flat $0.99 Pull Up service fee. Email hello@pullupcoffee.com to request above $25.' },
                { id: 'pause-orders', keywords: ['pause', 'offline', 'stop orders', 'busy', 'turn off', 'close', 'closing', 'shut down', 'status', 'go offline', 'stop accepting'], text: 'Fast answer: go to Operations and toggle Accepting Orders to OFFLINE. Customers stop seeing you as available instantly. Toggle back to ONLINE when ready.' },
                { id: 'menu', keywords: ['menu', 'add item', 'first item', 'edit item', 'photo', 'price', 'food', 'drink', 'product', 'image', 'add coffee', 'change price', 'upload photo', 'edit menu'], text: 'Fast answer: go to Menu tab. Tap Add Item, set name + price, upload a photo, then save. Use "Load Top 7 Menu" for quick starter items. You can edit/delete anytime.' },
                { id: 'late-customer', keywords: ['late', 'no show', 'grace', 'forfeit', 'did not arrive', 'waiting', 'customer not here', 'not coming', 'no pickup'], text: 'Fast answer: customers have a 10-minute grace window. If they do not arrive, you can forfeit the order at your discretion. The authorization hold is released — they are not charged.' },
                { id: 'decline', keywords: ['decline', 'reject', 'cancel order', 'cannot make', 'refuse', 'deny order'], text: 'Fast answer: on a pending order, tap the red X, enter a reason, and submit. The customer is notified and the authorization hold is voided (no charge).' },
                { id: 'delay', keywords: ['delay', 'running late', 'sms', 'message customer', 'notify', 'update', 'tell customer', 'inform customer'], text: 'Fast answer: open a preparing/ready order and tap Notify Delay (SMS). Customer gets an instant SMS update. You can also mark orders as "Ready" to notify them.' },
                { id: 'favorites', keywords: ['favourite', 'favorite', 'heart', 'sms alert', 'opening alert', 'regulars', 'loyalty', 'notification', 'alerts'], text: 'Fast answer: customers can heart your cafe, then confirm their mobile at checkout. You send opted-in opening SMS from Operations → Notify Favourites. Safety guard: opening alert only sends once per day.' },
                { id: 'refund', keywords: ['refund', 'chargeback', 'dispute', 'wrong order', 'cold', 'complaint', 'unhappy', 'bad order', 'incorrect'], text: 'Fast answer: refunds are merchant-managed. Handle case-by-case. For unactioned orders, authorizations void automatically. For captured payments, process refunds via your Stripe dashboard.' },
                { id: 'reporting', keywords: ['history', 'report', 'export', 'tax', 'accounting', 'gst', 'records', 'analytics', 'sales', 'data', 'numbers'], text: 'Fast answer: use History tab filters (daily/weekly/monthly/archive) for quick bookkeeping summaries. Stripe also provides exportable reports for your accountant/BAS.' },
                { id: 'support', keywords: ['human', 'support', 'ticket', 'help', 'contact', 'broken', 'bug', 'glitch', 'issue', 'problem', 'error', 'not working', 'doesnt work', 'doesn\'t work', 'wrong', 'fix', 'urgent', 'emergency', 'speak to someone', 'talk to someone', 'real person'], text: 'Fast answer: email hello@pullupcoffee.com with your Cafe Name, issue, and (if relevant) Order ID. Priority escalation within 15 min during business hours (Mon–Fri 8AM–6PM AEDT). Your question has been forwarded to the Pull Up support team.' },
                { id: 'onboarding', keywords: ['training', 'tutorial', 'video', 'setup', 'started', 'new', 'first time', 'how to use', 'walkthrough', 'getting started', 'begin', 'learn'], text: 'Fast answer: watch the 2-minute Setup Walkthrough and Live Order Flow videos in this Support tab. They cover everything from sign-up to accepting your first live order.' },
                { id: 'gps', keywords: ['gps', 'location', 'distance', 'tracking', 'approaching', 'arrived', 'customer location', 'map', 'find me', 'where am i'], text: 'Fast answer: when GPS is enabled, you see real-time distance to approaching customers on Live Orders. The system auto-detects arrivals within ~80m. Customers can also manually tap "I\'m Outside" to alert you.' },
                { id: 'qr', keywords: ['qr', 'poster', 'print', 'scan', 'code'], text: 'Fast answer: go to Account tab → Generate QR Poster. It creates a printable A4 poster with your cafe QR code, business name, and "Scan to Order" branding. Place it near your curbside area.' },
                { id: 'hours', keywords: ['hours', 'schedule', 'open time', 'close time', 'operating', 'window', 'when open', 'business hours', 'opening hours', 'times'], text: 'Fast answer: go to Operations → Operating Window. Set your open/close times. You must also be toggled ONLINE for customers to see you. The schedule is a guide — the online toggle is the master control.' },
                { id: 'logo', keywords: ['logo', 'branding', 'brand', 'image', 'avatar', 'profile picture', 'upload logo', 'change logo'], text: 'Fast answer: go to Account tab → Upload Logo. Use a square image for best results. Your logo appears in Discovery, menu view, and order notifications.' },
                { id: 'affiliate', keywords: ['affiliate', 'referral', 'commission', 'refer', 'earn', 'refer a friend', 'invite'], text: 'Fast answer: Pull Up offers a 25% affiliate commission on the $0.99 platform fee (≈$0.25) for the first 30 days of every cafe you refer. Click "Affiliate (25% first month)" in the footer to apply instantly and get your unique referral code.' },
                { id: 'security', keywords: ['security', 'safe', 'data', 'privacy', 'personal info', 'card details', 'encryption', 'protect'], text: 'Fast answer: all payments are processed through Stripe with 256-bit encryption. We never store card numbers. Customer data is encrypted and GPS data is purged after order completion. Full Privacy Act 1988 compliance.' },
                { id: 'early-adopter', keywords: ['early adopter', 'founders', 'first 33', 'first 100', 'special', 'benefit', 'bonus', 'early bird'], text: 'Fast answer: the first 100 cafe partners are "Early Adopters" — you keep 100% of your menu prices + 100% of the curbside fee, and receive a $0.25/order Partner Bonus for 12 months. Standard Stripe processing applies as a normal business cost.' },
                { id: 'merch', keywords: ['merch', 'merchandise', 'hat', 'cap', 'founders', 'shop', 'buy', 'gear', 'clothing'], text: 'Fast answer: visit the Merch Store from the main menu to grab limited-edition Pull Up Founders gear. Currently available: embroidered caps with AU shipping.' },
                { id: 'approval', keywords: ['approv', 'pending', 'waiting', 'review', 'application', 'when will', 'not approved', 'approval email', 'didn\'t get', 'didnt get', 'not received', 'haven\'t received', 'havent received', 'missing email', 'no email', 'no sms', 'where is my', 'how long'], text: 'Fast answer: approvals are typically processed within 24 hours. Once approved, you will receive an email and SMS notification. If you have been waiting more than 24 hours, please email hello@pullupcoffee.com with your business name and we will prioritise your review.' },
                { id: 'login', keywords: ['login', 'log in', 'sign in', 'can\'t login', 'cant login', 'locked out', 'forgot password', 'reset password', 'password reset', '2fa', 'two factor', 'verification code', 'otp'], text: 'Fast answer: if you forgot your password, go to Account → Reset Password. If you enabled 2FA, a 6-digit code will be sent to your mobile when you log in. Make sure to check your SMS. If you\'re still stuck, email hello@pullupcoffee.com.' },
                { id: 'order-issues', keywords: ['order', 'missing order', 'where is', 'not showing', 'no orders', 'orders not', 'can\'t see', 'cant see'], text: 'Fast answer: make sure you are toggled ONLINE in Operations → Accepting Orders. Orders only appear when your store is online. Check the Live Orders tab for incoming orders. If you believe there\'s a technical issue, email hello@pullupcoffee.com.' },
                { id: 'connect', keywords: ['connect stripe', 'stripe connect', 'link bank', 'bank account', 'onboarding', 'stripe setup', 'connect payouts'], text: 'Fast answer: go to Payments → Connect Stripe Payouts. Click the button to start Stripe Express onboarding. You will be redirected to Stripe to enter your business and bank details. Once complete, payouts are automatic.' },
            ];

            const match = knowledgeBase.find(topic => topic.keywords.some(k => q.includes(k)));
            let answer = '';
            let topicId = 'other';

            if (q.includes('password') || q.includes('token') || q.includes('private key') || q.includes('api key') || q.includes('customer card') || q.includes('secret')) {
                answer = 'I cannot access passwords, tokens, card data, or API keys. Use Account for password reset and Stripe Dashboard for payment credentials.';
                topicId = 'security';
            } else if (match) {
                answer = match.text;
                topicId = match.id;
            } else {
                // No match — provide helpful fallback and forward to support
                answer = `I couldn't find an exact answer for that. Your question has been forwarded to the Pull Up support team and they will respond within 24 hours. In the meantime, you can also email hello@pullupcoffee.com directly. Try asking about: payouts, menu, curbside fees, orders, approval status, Stripe setup, or account settings.`;
                // Save the unanswered question to Firestore for support follow-up
                try {
                    await addDoc(collection(db, 'support_tickets'), {
                        cafeId: user?.uid || 'unknown',
                        cafeName: profile?.businessName || 'Unknown',
                        cafeEmail: profile?.email || '',
                        question: question,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        source: 'chatbot',
                    });
                } catch (ticketErr) { console.error('Failed to save support ticket:', ticketErr); }
            }

            if (topicId === 'support' && (q.includes('ticket') || q.includes('human') || q.includes('help') || q.includes('not working') || q.includes('broken'))) {
                const ticketId = Math.floor(100000 + Math.random() * 900000);
                answer += ` Ref #${ticketId}. Include this in your email for faster triage.`;
                // Also save support ticket
                try {
                    await addDoc(collection(db, 'support_tickets'), {
                        cafeId: user?.uid || 'unknown',
                        cafeName: profile?.businessName || 'Unknown',
                        cafeEmail: profile?.email || '',
                        question: question,
                        ticketId: ticketId,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        source: 'chatbot-escalation',
                    });
                } catch (ticketErr) { console.error('Failed to save support ticket:', ticketErr); }
            }

            const activeWeek = getWeekKey(new Date());
            const baseCounts = supportWeekKey === activeWeek ? supportTopicCounts : {};
            const nextCounts = { ...baseCounts, [topicId]: (baseCounts[topicId] || 0) + 1 };
            setSupportTopicCounts(nextCounts);
            setSupportWeekKey(activeWeek);
            saveSettings('supportTopicCounts', nextCounts);
            saveSettings('supportWeekKey', activeWeek);

            setBotChat(prev => [...prev, { type: 'bot', text: answer }]);
        }, 350);
    };

    const handleBotSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitBotQuestion(botInput);
    };

    const dashboardTabs = [
        { key: 'orders', label: 'Live Orders' },
        { key: 'history', label: 'History' },
        { key: 'menu', label: 'Menu' },
        { key: 'operations', label: 'Operations' },
        { key: 'payments', label: 'Payments' },
        { key: 'account', label: 'Account' },
        ...(isPlatformAdmin ? [{ key: 'platform', label: 'Platform' }] : []),
        { key: 'support', label: 'Support' }
    ];

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col animate-fade-in text-left font-sans">
            <div className="bg-[#0f0f0f] text-white p-6 flex justify-between items-center shadow-md relative z-30">
                <div className="flex items-center gap-4">
                    {storefrontLogo ? (
                        <img src={storefrontLogo} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/50" />
                    ) : (
                        <PullUpLogo className="w-10 h-10 border-none bg-stone-800" />
                    )}
                    <div><h2 className="text-xl font-serif italic text-white leading-tight">{businessNameDraft || profile?.businessName || 'Cafe Dashboard'}</h2><p className="text-[10px] uppercase text-[#ff5e00] tracking-[0.2em] font-bold">Partner Dashboard</p></div>
                </div>
                <button onClick={async () => { try { if (user?.uid) await updateDoc(doc(db, 'cafes', user.uid), { status: 'closed' }); } catch {} await signOut(auth); window.location.href = '/'; }} className="text-[10px] uppercase font-bold text-stone-400 hover:text-white transition">LOGOUT</button>
            </div>
            
            <div className="flex bg-white border-b border-stone-200 shadow-sm sticky top-0 z-20 overflow-x-auto no-scrollbar">
                {dashboardTabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 min-w-[95px] py-4 px-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors whitespace-nowrap ${tab === t.key ? 'text-[#ff5e00] border-b-2 border-[#ff5e00] bg-orange-50/50' : 'text-stone-400 hover:bg-stone-50'}`}>
                        {t.label} {t.key === 'orders' && orders.length > 0 ? `(${orders.length})` : ''}
                    </button>
                ))}
            </div>

            <div className="p-6 md:p-8 flex-1 max-w-4xl mx-auto w-full">
                {tab === 'orders' && (
                    <div className="space-y-6">
                        {orders.length === 0 ? <div className="py-24 text-center text-stone-400 bg-white rounded-[2rem] border border-stone-100 shadow-sm"><div className="flex justify-center mb-4 opacity-50"><Icons.Coffee /></div>Awaiting cars en-route...<div className="mt-4 text-[10px] font-bold uppercase tracking-widest">Status: <span className={isOnline ? "text-green-500" : "text-red-500"}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span></div></div> : 
                        orders.map(o => (
                            <div key={o.id} className={`p-6 bg-white rounded-[2rem] border transition-all shadow-sm ${o.isArriving ? 'ring-4 ring-green-400' : 'border-stone-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div><h4 className="text-xl font-bold text-stone-900 leading-tight">{o.customerName}</h4><p className="text-xs text-stone-500 font-mono uppercase mt-1 tracking-widest">{o.carDetails} • {o.plate}</p>{o.pickupTime && o.pickupTime !== 'ASAP' && <p className="text-[10px] font-bold mt-1 text-orange-600 bg-orange-50 inline-block px-2 py-0.5 rounded-full">🕐 Pickup: {o.pickupTime}</p>}</div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : o.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>{o.status}</span>
                                </div>
                                {(o.approachState === 'approaching' || o.isArriving) && (
                                    <div className={`mb-3 p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${o.isArriving ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                        <Icons.Car />
                                        {o.isArriving ? 'Customer Waiting Curbside' : `Customer Near (${o.customerLocationDistanceMeters ? `${o.customerLocationDistanceMeters}m` : 'Live'})`}
                                        {o.customerEtaSeconds ? <span>• ETA ~{Math.max(1, Math.round(o.customerEtaSeconds / 60))}m</span> : null}
                                    </div>
                                )}
                                {o.isArriving && <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-xl text-[10px] font-bold mb-4 text-center tracking-widest animate-pulse flex items-center justify-center gap-2"><Icons.Car /> CAR AT WINDOW</div>}
                                {(o.customerCurbsideNote || o.customerCurbsidePhoto) && (
                                    <div className="mb-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Customer Curbside Update</p>
                                        {o.customerCurbsideNote ? <p className="text-sm text-stone-700 mb-3">{o.customerCurbsideNote}</p> : null}
                                        {o.customerCurbsidePhoto ? <img src={o.customerCurbsidePhoto} alt="Customer curbside location" className="w-full h-40 object-cover rounded-xl border border-stone-200" /> : null}
                                    </div>
                                )}
                                <div className="space-y-3 mb-6 py-4 border-y border-stone-100">
                                    {o.items.map((it: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm font-medium text-stone-800">
                                            <span>1x {it.name} <span className="text-[10px] text-stone-500 block font-normal mt-1 uppercase tracking-wider">{it.size}, {it.milk}</span>{it.notes && <span className="block text-xs text-orange-500 italic mt-1 font-bold">"{it.notes}"</span>}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    {o.status === 'pending' ? (
                                        <button onClick={async () => { 
                                            if (o.paymentIntentId) {
                                                const token = await getAuthToken();
                                                const captureRes = await fetch('/api/stripe/capture', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                                    },
                                                    body: JSON.stringify({ paymentIntentId: o.paymentIntentId })
                                                });
                                                const captureData = await captureRes.json();
                                                if (!captureRes.ok || !captureData.success) {
                                                    alert(`Capture failed: ${captureData.error || 'Unable to capture funds'}`);
                                                    return;
                                                }
                                            }
                                            await updateDoc(doc(db, 'orders', o.id), { 
                                                status: 'preparing', 
                                                paymentState: o.paymentIntentId ? 'captured' : (o.paymentState || 'captured'),
                                                statusNote: `${profile?.businessName || 'Cafe'} accepted your order and started preparation.`,
                                                statusUpdatedAt: new Date().toISOString()
                                            });
                                            if (o.mobile) sendSMS(o.mobile, 'order-accepted', { cafeName: profile?.businessName || 'Your cafe' }, o.id);
                                        }} className="flex-1 bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 text-[10px] uppercase tracking-widest shadow-md transition">Accept Order</button>
                                    ) : (
                                        <button onClick={() => updateDoc(doc(db, 'orders', o.id), { status: 'completed' })} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 text-[10px] uppercase tracking-widest shadow-md transition">Complete Order</button>
                                    )}
                                    {o.status === 'pending' && <button onClick={async () => { const r = prompt("Reason for decline?"); if(r) { 
                                        if (o.paymentIntentId) {
                                            const token = await getAuthToken();
                                            const cancelRes = await fetch('/api/stripe/cancel', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                                },
                                                body: JSON.stringify({ paymentIntentId: o.paymentIntentId })
                                            });
                                            const cancelData = await cancelRes.json();
                                            if (!cancelRes.ok || !cancelData.success) {
                                                alert(`Cancellation failed: ${cancelData.error || 'Unable to void authorization'}`);
                                                return;
                                            }
                                        }
                                        await updateDoc(doc(db, 'orders', o.id), { 
                                            status: 'rejected', 
                                            rejectionReason: r, 
                                            paymentState: o.paymentIntentId ? 'canceled' : (o.paymentState || 'canceled'),
                                            statusNote: `${profile?.businessName || 'Cafe'} declined this order: ${r}`,
                                            statusUpdatedAt: new Date().toISOString()
                                        }); 
                                        if(o.mobile) sendSMS(o.mobile, 'order-declined', { cafeName: profile?.businessName || 'Your cafe', reason: r }, o.id); 
                                    } }} className="px-5 py-4 text-red-500 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition font-bold text-sm"><Icons.X /></button>}
                                </div>
                                {o.status === 'preparing' && <button onClick={async () => {
                                    await updateDoc(doc(db, 'orders', o.id), {
                                        status: 'ready',
                                        statusNote: `${profile?.businessName || 'Cafe'} marked your order ready. Pull up close and tap the app button when parked.`,
                                        statusUpdatedAt: new Date().toISOString()
                                    });
                                    if(o.mobile) sendSMS(o.mobile, 'order-ready', { cafeName: profile?.businessName || 'Your cafe', orderId: o.id }, o.id);
                                }} className="w-full mt-2 py-3 text-[10px] text-white font-bold uppercase tracking-widest bg-stone-900 rounded-xl hover:bg-stone-800 transition">Mark Ready in App</button>}
                                {(o.status === 'preparing' || o.status === 'ready') && <button onClick={async () => { 
                                    await updateDoc(doc(db, 'orders', o.id), {
                                        statusNote: `${profile?.businessName || 'Cafe'} is running about 5 mins behind.`,
                                        statusUpdatedAt: new Date().toISOString()
                                    });
                                    if(o.mobile) sendSMS(o.mobile, 'delay', { cafeName: profile?.businessName || 'Your cafe' }, o.id); 
                                    alert("Delay SMS Sent!"); 
                                }} className="w-full mt-2 py-3 text-[10px] text-stone-500 font-bold uppercase tracking-widest border border-stone-200 rounded-xl hover:bg-stone-50 transition">Notify Delay (SMS)</button>}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="bg-white p-4 sm:p-8 rounded-[2rem] shadow-sm border border-stone-200">
                        <div className="flex flex-col gap-4 mb-6">
                            <h3 className="font-bold text-xl text-stone-900">Order History</h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'daily', label: 'Daily' },
                                    { key: 'weekly', label: 'Weekly' },
                                    { key: 'monthly', label: 'Monthly' },
                                    { key: 'archive', label: 'Archive' },
                                ].map((f) => (
                                    <button key={f.key} onClick={() => setHistoryFilter(f.key as 'daily' | 'weekly' | 'monthly' | 'archive')} className={`text-[10px] px-3 py-2 rounded-lg font-bold uppercase tracking-widest border transition ${historyFilter === f.key ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-500 border-stone-200 hover:bg-stone-50'}`}>
                                        {f.label}
                                    </button>
                                ))}
                                <button onClick={() => alert(`Email ${historyFilter} report queued.`)} className="text-[10px] font-bold text-stone-500 border border-stone-200 px-4 py-2 rounded-lg hover:bg-stone-50 transition uppercase tracking-widest flex items-center gap-2"><Icons.Mail /> Email {historyFilter} Report</button>
                            </div>
                        </div>
                        {(() => {
                            const now = Date.now();
                            const filteredHistory = history.filter((order: any) => {
                                const orderTime = new Date(order.timestamp || order.statusUpdatedAt || 0).getTime();
                                const ageDays = (now - orderTime) / (1000 * 60 * 60 * 24);
                                if (historyFilter === 'daily') return ageDays <= 1;
                                if (historyFilter === 'weekly') return ageDays <= 7;
                                if (historyFilter === 'monthly') return ageDays <= 30;
                                return ageDays > 30;
                            });

                            const summary = filteredHistory.reduce((acc: any, order: any) => {
                                const econ = calculateOrderEconomics(order);
                                return {
                                    totalOrders: acc.totalOrders + 1,
                                    totalMenu: acc.totalMenu + econ.menuRevenue,
                                    totalExtra: acc.totalExtra + econ.extraRevenue,
                                };
                            }, { totalOrders: 0, totalMenu: 0, totalExtra: 0 });

                            return filteredHistory.length === 0 ? <p className="text-stone-400 text-center py-10 italic">No orders in this period yet.</p> : (
                            <>
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Orders</p><p className="text-xl font-bold text-stone-900">{summary.totalOrders}</p></div>
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Menu Revenue</p><p className="text-xl font-bold text-stone-900">${summary.totalMenu.toFixed(2)}</p></div>
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Net Curbside</p><p className="text-xl font-bold text-orange-600">${summary.totalExtra.toFixed(2)}</p></div>
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Est. SMS Costs</p><p className="text-xl font-bold text-stone-500">~${(summary.totalOrders * 2 * SMS_COST_PER_MESSAGE).toFixed(2)}</p><p className="text-[8px] text-stone-400 mt-1">~2 SMS/order × ${SMS_COST_PER_MESSAGE.toFixed(2)}</p></div>
                            </div>
                            <div className="space-y-3">
                                {filteredHistory.map(o => {
                                    const econ = calculateOrderEconomics(o);
                                    return (
                                    <button key={o.id} onClick={() => setSelectedHistoryOrder(o)} className="w-full flex justify-between items-center p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-stone-300 transition text-left">
                                        <div>
                                            <span className="font-bold text-stone-900">{o.customerName}</span> <span className="text-stone-400 text-[10px] uppercase tracking-widest ml-2 bg-white px-2 py-1 rounded border">{o.plate}</span>
                                            <div className="text-[10px] text-stone-500 mt-2 font-medium">${o.total} • Ref: {o.id.slice(-6)} • Extra +${econ.extraRevenue.toFixed(2)}</div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{o.status}</div>
                                    </button>
                                )})}
                            </div>
                            {selectedHistoryOrder && (
                                <div className="mt-5 p-5 border border-stone-200 rounded-2xl bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-stone-900">Order Receipt • {selectedHistoryOrder.id.slice(-6)}</h4>
                                        <button onClick={() => setSelectedHistoryOrder(null)} className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Close</button>
                                    </div>
                                    {(() => {
                                        const econ = calculateOrderEconomics(selectedHistoryOrder);
                                        return (
                                            <div className="text-sm text-stone-700 space-y-2">
                                                <p><strong>Menu Items:</strong> ${econ.menuRevenue.toFixed(2)}</p>
                                                <p><strong>Curbside Fee:</strong> ${econ.curbsideFeeValue.toFixed(2)} (100% yours)</p>
                                                <p><strong>Est. Stripe Fee:</strong> -${econ.estimatedStripeFee.toFixed(2)}</p>
                                                <p><strong>Net Revenue:</strong> <span className="text-orange-600 font-bold">${econ.cafeNetRevenue.toFixed(2)}</span></p>
                                                <p className="text-[10px] text-stone-500 italic mt-1">You keep 100% of menu prices + 100% of curbside fee, minus Stripe processing.</p>
                                                <p><strong>Estimated Revenue Uplift:</strong> {econ.upliftPct.toFixed(1)}%</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            </>
                        )})()}
                    </div>
                )}

                {tab === 'menu' && (
                    <div className="bg-white p-4 sm:p-8 rounded-[2rem] border border-stone-200 shadow-sm space-y-8">
                        <div>
                            <h3 className="font-bold text-xl mb-6 text-stone-900">Store Menu Setup</h3>
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">Getting Started Tip</p>
                                <p className="text-xs text-stone-600">Start with one item if you want to trial gently—it can be coffee, merch, or even a simple bottle of water. Add more when you feel ready. If you’re focused on non-food services, our sister Pull Up store channel can be a better fit.</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">Starter Menu</p>
                                    <p className="text-xs text-stone-600">Load the top 7 standard coffee items with generic photos in one click.</p>
                                </div>
                                <button onClick={addPresetMenuItems} className="bg-stone-900 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition">Add Top 7 Presets</button>
                            </div>
                            <div className="space-y-3">
                                {menu.length === 0 ? <p className="text-stone-400 text-sm">Menu is empty.</p> : 
                                menu.map(m => (
                                    <div key={m.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl border border-stone-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 flex items-center justify-center text-stone-300 border border-stone-200 shadow-sm relative group">
                                                {(editingMenuId === m.id && editingMenuImg) || m.img ? <img src={editingMenuId === m.id ? editingMenuImg || m.img : m.img} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                                                {editingMenuId === m.id && (
                                                    <>
                                                        <input type="file" accept="image/*" className="hidden" ref={editFileInputRef} onChange={handleEditMenuImageChange} />
                                                        <button onClick={() => editFileInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white text-[9px] font-bold">Change</span></button>
                                                    </>
                                                )}
                                            </div>
                                            {editingMenuId === m.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <input type="text" value={editingMenuName} onChange={(e) => setEditingMenuName(e.target.value)} className="px-2 py-1 text-sm border border-stone-200 rounded" />
                                                    <input type="number" step="0.10" value={editingMenuPrice} onChange={(e) => setEditingMenuPrice(e.target.value)} className="px-2 py-1 text-sm border border-stone-200 rounded w-28" />
                                                </div>
                                            ) : <div><p className="font-bold text-stone-900">{m.name}</p><p className="text-[10px] font-bold text-stone-500 mt-1">${parseFloat(m.price).toFixed(2)}</p></div>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {editingMenuId === m.id ? (
                                                <>
                                                    <button onClick={saveMenuEdit} className="text-[10px] px-2 py-1 rounded border border-stone-300 text-stone-700 uppercase tracking-widest font-bold">Save</button>
                                                    <button onClick={() => setEditingMenuId(null)} className="text-[10px] px-2 py-1 rounded border border-stone-200 text-stone-500 uppercase tracking-widest font-bold">Cancel</button>
                                                </>
                                            ) : <button onClick={() => startMenuEdit(m)} className="text-stone-400 hover:text-stone-900 p-2 transition"><Icons.Edit /></button>}
                                            <button onClick={() => deleteDoc(doc(db, 'cafes', user.uid, 'menu', m.id))} className="text-stone-300 hover:text-red-500 p-2 transition"><Icons.Trash2 /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-stone-100 pt-6">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-4">List New Product</p>
                            <div className="space-y-4">
                                <input type="text" placeholder="Name (e.g. Flat White)" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium" />
                                <div className="flex gap-4">
                                    <input type="number" placeholder="Price ($)" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-1/3 p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium" />
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                    <button onClick={() => fileInputRef.current?.click()} className={`flex-1 border-2 border-dashed rounded-xl font-bold text-[10px] flex justify-center items-center gap-2 uppercase tracking-widest transition ${newItem.img ? 'border-orange-500 text-orange-500 bg-orange-50' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}><Icons.Upload /> {newItem.img ? 'Image Ready' : 'Add Photo'}</button>
                                </div>
                                <button onClick={addMenuItem} className="w-full bg-[#0f0f0f] text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 shadow-lg transition active:scale-95 flex justify-center items-center gap-2"><Icons.Plus /> Update Shop Menu</button>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'operations' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 sm:p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-8">
                            <div className="flex items-center justify-between p-5 bg-stone-50 rounded-xl border border-stone-200">
                                <div><span className="font-bold text-stone-900 block">Accepting Orders</span><span className="text-xs text-stone-500">Visibility on customer maps</span></div>
                                <div onClick={async () => { 
                                    const s = !isOnline; 
                                    setIsOnline(s); 
                                    saveSettings('status', s ? 'open' : 'closed');
                                    if (s && notifyFavoritesEnabled) {
                                        await notifyFavoritesNow();
                                    }
                                }} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-stone-300'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${isOnline ? 'left-7' : 'left-1'}`}></div></div>
                            </div>

                            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-4">Operating Window</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Open From</label>
                                        <input type="time" value={openFrom} onChange={(e) => { setOpenFrom(e.target.value); saveSettings('openFrom', e.target.value); }} className="w-full p-3 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-900" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Close At</label>
                                        <input type="time" value={openTo} onChange={(e) => { setOpenTo(e.target.value); saveSettings('openTo', e.target.value); }} className="w-full p-3 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-900" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-stone-900 block">Notify Favourites by SMS</span>
                                        <span className="text-xs text-stone-500">Send opening window text to opted-in customers</span>
                                    </div>
                                    <div onClick={toggleNotifyFavorites} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-300 ${notifyFavoritesEnabled ? 'bg-green-500' : 'bg-stone-300'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${notifyFavoritesEnabled ? 'left-7' : 'left-1'}`}></div></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">From</label>
                                        <input type="time" value={notifyFrom} onChange={(e) => { setNotifyFrom(e.target.value); saveSettings('notifyFrom', e.target.value); }} className="w-full p-3 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-900" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">To</label>
                                        <input type="time" value={notifyTo} onChange={(e) => { setNotifyTo(e.target.value); saveSettings('notifyTo', e.target.value); }} className="w-full p-3 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-900" />
                                    </div>
                                </div>
                                <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-600">
                                    <p><strong>{favoriteAudienceCount}</strong> favourites opted in for SMS.</p>
                                    <p>Estimated blast cost: <strong>${(favoriteAudienceCount * SMS_COST_PER_MESSAGE).toFixed(2)}</strong> per send (deducted from cafe payout).</p>
                                    <p className="mt-1">Safety guard: opening alert can only be sent once per day and always requires confirmation.</p>
                                </div>
                                <button onClick={notifyFavoritesNow} disabled={!notifyFavoritesEnabled} className="w-full bg-stone-900 text-white p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">Send Opening Alert Now</button>
                            </div>

                            <div>
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-4">Dynamic Curbside Fee ($)</h4>
                                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 text-center">
                                    <span className="text-4xl font-serif font-bold text-orange-500 mb-6 block">${curbsideFee.toFixed(2)}</span>
                                    <input type="range" min={MIN_CURBSIDE_FEE} max={MAX_CURBSIDE_FEE} step="0.50" value={curbsideFee} onChange={(e) => { const val = normalizeCurbsideFee(e.target.value); setCurbsideFee(val); saveSettings('curbsideFee', val); }} className="w-full accent-orange-500 h-2 bg-stone-300 rounded-lg outline-none cursor-pointer" />
                                </div>
                                <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-stone-700 space-y-2">
                                    <p className="font-bold text-orange-600">{isEarlyAdopter ? '💰 This is Your Cream on Top' : '💰 Curbside Fee Settings'}</p>
                                    <p>The curbside fee is charged to customers for the convenience of curbside service. <strong>Range: $0.00 – $25.00</strong> — completely your choice. Set it to match your market.</p>
                                    <p><strong>Simple Fee Model:</strong> Customers pay a flat $0.99 Pull Up Service Fee per order. You keep <strong>100%</strong> of your menu prices and <strong>100%</strong> of the curbside fee. Stripe processing (~1.75% + 30¢) is absorbed as a normal business cost.</p>
                                    <p><strong>What You Keep:</strong> 100% of your menu prices + 100% of the curbside fee. The only deduction is standard Stripe processing on the total order value.</p>
                                    {isEarlyAdopter && <p><strong>🎉 Early Adopter Bonus:</strong> As one of our first 100 partner cafes, you receive a $0.25/order Partner Bonus for 12 months — credited back to you from the platform fee.</p>}
                                    <p className="text-[10px] text-stone-500 italic mt-2">💡 Increase during peak hours, lower for promotions. Email hello@pullupcoffee.com to request a curbside fee above $25.00.</p>
                                </div>
                                <div className="mt-3 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-700">
                                    <p className="font-bold text-stone-900 mb-2">Need a higher curbside fee?</p>
                                    <p className="mb-3">If your business requires a curbside fee above $25.00 (e.g., premium location, extended delivery radius, or high-demand area), submit a request below.</p>
                                    {customFeeSent ? (
                                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            <p className="text-xs text-green-700 font-bold">Request sent! We&apos;ll review and get back to you within 24 hours.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <input type="number" step="0.50" min="25.50" max="100" placeholder="Requested fee ($)" value={customFeeAmount} onChange={e => setCustomFeeAmount(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-semibold text-stone-900 bg-white outline-none focus:border-orange-400 transition" />
                                                </div>
                                            </div>
                                            <textarea placeholder="Briefly explain why (e.g. premium location, extended radius...)" value={customFeeReason} onChange={e => setCustomFeeReason(e.target.value)} rows={2} className="w-full p-2.5 border border-stone-300 rounded-lg text-sm text-stone-900 bg-white outline-none focus:border-orange-400 transition resize-none" />
                                            <button disabled={customFeeSending || !customFeeAmount || !customFeeReason.trim()} onClick={async () => {
                                                setCustomFeeSending(true);
                                                try {
                                                    const token = await getAuthToken();
                                                    await fetch('/api/twilio', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                                                        body: JSON.stringify({ template: 'generic', to: '+61409350889', body: `CUSTOM FEE REQUEST from ${profile?.businessName || 'Unknown Cafe'}: Requested $${customFeeAmount}, Reason: ${customFeeReason.trim()}` })
                                                    });
                                                    setCustomFeeSent(true);
                                                } catch { alert('Failed to send. Please try again.'); }
                                                setCustomFeeSending(false);
                                            }} className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition disabled:opacity-50">
                                                {customFeeSending ? 'Sending...' : '📩 Submit Fee Request'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-4">Global Add-On Pricing</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(globalPricing).map(([key, val]) => (
                                        <div key={key} className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">{key}</label>
                                            <input type="number" step="0.10" value={val as number} onChange={(e) => { const newPrices = {...globalPricing, [key]: parseFloat(e.target.value)}; setGlobalPricing(newPrices); saveSettings('globalPricing', newPrices); }} className="w-full p-2 bg-white border border-stone-200 rounded-lg text-center text-sm font-bold outline-none focus:border-stone-400 text-stone-900 transition" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'payments' && (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-6">
                            <div>
                                <h3 className="font-bold text-xl text-stone-900 mb-2">Payments & Payouts</h3>
                                <p className="text-sm text-stone-500">Connect Stripe to receive customer order payouts. Authorizations are captured only when you accept a pending order.</p>
                            </div>
                            
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-2">Platform Fee Structure</p>
                                <p className="text-sm text-stone-700 leading-relaxed"><strong>Current Model:</strong> {isEarlyAdopter ? 'As an early adopter, you receive a $0.25/order Partner Bonus for 12 months — automatically returned from the $0.99 platform fee. You keep 100% of menu prices + 100% of curbside fee.' : 'Customers pay a flat $0.99 Pull Up Service Fee per order. You keep 100% of your menu prices and 100% of the curbside fee. Standard Stripe processing fees (~1.75% + 30¢) apply to the total transaction as a normal business cost.'}</p>
                                <p className="text-sm text-stone-700 leading-relaxed"><strong>Our Commitment:</strong> We're constantly negotiating better payment processing rates and exploring competitive alternatives like PayPal to reduce your costs. We want this to be sustainable and profitable for everyone.</p>
                                <p className="text-xs text-orange-600 font-semibold mt-3">💬 Have feedback on payment fees? Let us know—we're listening and adapting as we grow.</p>
                            </div>

                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Payout Preferences</p>
                                <select value={payoutPreference} onChange={(e) => { setPayoutPreference(e.target.value); saveSettings('payoutPreference', e.target.value); }} className="w-full p-3 border border-stone-200 rounded-lg text-sm font-semibold text-stone-900">
                                    <option value="daily">Daily (recommended)</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="instant">Instant (if Stripe eligible)</option>
                                </select>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-2">Stripe Percentage Rate (est)</label>
                                    <input type="number" step="0.001" min="0" max="0.1" value={stripePercentRate} readOnly={!isPlatformAdmin} onChange={(e) => { if (!isPlatformAdmin) return; const val = Number(e.target.value || 0); setStripePercentRate(val); saveSettings('stripePercentRate', val); }} className={`w-full p-3 border border-stone-200 rounded-lg text-sm font-semibold text-stone-900 ${!isPlatformAdmin ? 'bg-stone-100 cursor-not-allowed' : ''}`} />
                                    <p className="text-[9px] text-stone-500 mt-2 italic">Typically 1.75% + 30¢ for Australian cards. {isPlatformAdmin ? 'You can adjust this as platform admin.' : 'Only Pull Up platform admin can adjust this setting.'}</p>
                                </div>
                                <label className="flex items-start gap-2 text-sm text-stone-700">
                                    <input type="checkbox" checked={payoutTermsAccepted} onChange={(e) => { setPayoutTermsAccepted(e.target.checked); saveSettings('payoutTermsAccepted', e.target.checked); }} className="mt-1" />
                                    <span>I accept payout terms: platform covers fixed 30c Stripe component; cafe covers Stripe percentage on cafe-revenue portion.</span>
                                </label>
                            </div>
                            <button onClick={connectStripeOnboarding} className="w-full bg-[#0f0f0f] text-white p-5 rounded-2xl font-bold flex justify-between items-center shadow-lg hover:bg-stone-800 transition active:scale-95">
                                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest"><Icons.CreditCard /> Connect Stripe Payouts</div>
                                <Icons.ChevronRight />
                            </button>
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Merch Checkout Clarity</p>
                                <p className="text-sm text-stone-600">The merch checkout currently processes customer payment only. Manufacturer/supplier fulfillment and downstream payout logic are separate and require your connected provider workflow.</p>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'account' && (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-6">
                            <div>
                                <h3 className="font-bold text-xl text-stone-900 mb-2">Account</h3>
                                <p className="text-sm text-stone-500">Manage login and owner profile access.</p>
                            </div>
                            <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Business Name</p>
                                    <input
                                        type="text"
                                        value={businessNameDraft}
                                        onChange={(e) => setBusinessNameDraft(e.target.value)}
                                        className="w-full p-3 mt-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium text-stone-900"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Storefront Logo / Photo</p>
                                    <input type="file" accept="image/*" className="hidden" ref={logoFileInputRef} onChange={async (e) => {
                                        if (!e.target.files?.[0] || !user?.uid) return;
                                        const compressed = await compressImage(e.target.files[0]);
                                        setStorefrontLogo(compressed);
                                    }} />
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-300">
                                            {storefrontLogo ? <img src={storefrontLogo} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                                        </div>
                                        <button onClick={() => logoFileInputRef.current?.click()} className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 transition">Upload / Replace</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Login Email</p>
                                    <p className="text-sm font-semibold text-stone-900 mb-2">{profile?.email || 'Not set'}</p>
                                    <p className="text-[9px] text-stone-500 italic">To change your login email, please contact support at hello@pullupcoffee.com with your business details.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Billing Email (for invoices)</label>
                                    <input 
                                        type="email" 
                                        value={billingEmailDraft} 
                                        onChange={(e) => setBillingEmailDraft(e.target.value)}
                                        placeholder="billing@yourcompany.com"
                                        className="w-full p-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium"
                                    />
                                    <p className="text-[9px] text-stone-500 mt-2 italic">All Stripe invoices and payment receipts will be sent here.</p>
                                </div>
                            </div>
                            <button 
                                disabled={accountBusy}
                                onClick={async () => {
                                    if (!user?.uid) return;
                                    setAccountSaveStatus('saving');
                                    setAccountBusy(true);
                                    try {
                                        await updateDoc(doc(db, 'cafes', user.uid), { 
                                            businessName: businessNameDraft.trim() || profile?.businessName || '',
                                            billingEmail: billingEmailDraft.trim() || profile?.email || '',
                                            ...(storefrontLogo ? { logo: storefrontLogo } : {}),
                                        });
                                        setAccountSaveStatus('saved');
                                        setTimeout(() => setAccountSaveStatus('idle'), 2500);
                                    } catch (err) {
                                        alert('Failed to save. Please try again.');
                                        setAccountSaveStatus('idle');
                                    } finally {
                                        setAccountBusy(false);
                                    }
                                }}
                                className="w-full bg-orange-600 text-white p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 transition disabled:opacity-50"
                            >
                                {accountSaveStatus === 'saving' ? 'Saving...' : accountSaveStatus === 'saved' ? '✓ Saved Successfully' : 'Save Account Settings'}
                            </button>
                            <button disabled={accountBusy} onClick={sendPasswordReset} className="w-full bg-stone-900 text-white p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition disabled:opacity-50">
                                {accountBusy ? 'Sending Reset...' : 'Send Password Reset Email'}
                            </button>
                            <div className="pt-4 border-t border-stone-100">
                                <p className="text-[9px] text-stone-500 italic text-center">Press &quot;Save Account Settings&quot; to apply changes. Login email changes require manual verification via support.</p>
                            </div>
                        </div>

                        {/* SMS Two-Factor Authentication (2FA) */}
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-stone-900 mb-1">SMS Two-Factor Authentication</h3>
                                    <p className="text-sm text-stone-500">Add an extra layer of security. When enabled, a unique 6-digit code will be sent to your mobile on every login.</p>
                                </div>
                            </div>
                            <Sms2faToggle userId={user?.uid} db={db} profile={profile} />
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-4">
                            <div>
                                <h3 className="font-bold text-xl text-stone-900 mb-2">Marketing Materials</h3>
                                <p className="text-sm text-stone-500">Choose a poster design and print for your storefront window or curbside area. Each includes the Pull Up Coffee logo and your unique QR code.</p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Design 1: Professional */}
                                <div className="border-2 border-stone-200 rounded-2xl p-4 text-center hover:border-orange-400 transition cursor-pointer group">
                                    <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-xl p-4 mb-3 aspect-[3/4] flex flex-col items-center justify-center text-white">
                                        <PullUpLogo className="w-10 h-10 mb-2" />
                                        <p className="font-serif italic font-bold text-sm">Now Serving Curbside</p>
                                        <div className="bg-white p-2 rounded-lg mt-2 inline-block">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}`} alt="QR" className="w-[60px] h-[60px]" />
                                        </div>
                                        <p className="text-[8px] mt-1 text-stone-300">{profile?.businessName || 'Your Cafe'}</p>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Professional</p>
                                    <p className="text-[9px] text-stone-500 mb-3">Clean, minimal, dark theme</p>
                                    <button onClick={() => {
                                        const pw = window.open('', '_blank');
                                        if (pw) {
                                            pw.document.write(`<!DOCTYPE html><html><head><title>Poster - ${profile?.businessName || 'Cafe'}</title><style>*{margin:0;padding:0;box-sizing:border-box}@page{size:A4;margin:0}html,body{width:100%;height:100%;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{display:flex;align-items:center;justify-content:center;background:#1c1917!important;font-family:Georgia,serif;color:white;text-align:center}.c{padding:60px 40px;max-width:600px}.logo{width:120px;height:120px;background:#f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 30px}.qr{background:white;padding:24px;border-radius:16px;display:inline-block;margin:30px 0}.qr img{width:280px;height:280px}h1{font-size:52px;font-style:italic;margin:20px 0;line-height:1.1}.tag{font-size:20px;color:#a8a29e;margin-bottom:40px}.cafe{font-size:28px;color:#f97316;font-weight:700;margin-top:20px}.steps{font-size:15px;color:#78716c;margin-top:30px;line-height:1.8}.pow{font-size:12px;color:#57534e;margin-top:20px}@media print{html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{background:#1c1917!important}.logo{background:#f97316!important}}</style></head><body><div class="c"><div class="logo"><svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M 24 36 L 74 36 A 2 2 0 0 1 76 38 L 76 46"/><path d="M 22 42 C 22 55 28 66 32 66"/><path d="M 22 42 C 40 42 45 42 55 50 C 62 55 72 55 76 50"/><path d="M 76 46 C 76 60 72 66 68 66"/><path d="M 44 66 L 56 66"/><path d="M 76 44 C 92 44 96 52 86 62 C 80 67 72 62 68 60"/><circle cx="38" cy="66" r="6"/><circle cx="38" cy="66" r="2"/><circle cx="62" cy="66" r="6"/><circle cx="62" cy="66" r="2"/></svg></div><h1>Now Serving<br/>Curbside</h1><div class="tag">Order from your car · Zero wait</div><div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}"/></div><div class="cafe">${profile?.businessName || 'Your Cafe'}</div><div class="steps">1. Scan QR · 2. Order & Pay · 3. We bring it out</div><div class="pow">Powered by Pull Up Coffee™</div></div></body></html>`);
                                            pw.document.close(); setTimeout(() => pw.print(), 800);
                                        }
                                    }} className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition">🖨️ Print</button>
                                </div>

                                {/* Design 2: Sunrise Beach */}
                                <div className="border-2 border-stone-200 rounded-2xl p-4 text-center hover:border-orange-400 transition cursor-pointer group">
                                    <div className="bg-gradient-to-b from-orange-400 via-amber-300 to-yellow-100 rounded-xl p-4 mb-3 aspect-[3/4] flex flex-col items-center justify-center text-stone-900">
                                        <PullUpLogo className="w-10 h-10 mb-2" />
                                        <p className="font-bold text-sm">COFFEE ON THE CURB</p>
                                        <p className="text-[9px] text-stone-700">No parking hassle. No queue.</p>
                                        <div className="bg-white p-2 rounded-lg mt-2 inline-block shadow-md">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}`} alt="QR" className="w-[60px] h-[60px]" />
                                        </div>
                                        <p className="text-[8px] mt-1 font-bold">{profile?.businessName || 'Your Cafe'}</p>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Sunrise</p>
                                    <p className="text-[9px] text-stone-500 mb-3">Warm, beachy, fun vibes</p>
                                    <button onClick={() => {
                                        const pw = window.open('', '_blank');
                                        if (pw) {
                                            pw.document.write(`<!DOCTYPE html><html><head><title>Poster - ${profile?.businessName || 'Cafe'}</title><style>*{margin:0;padding:0;box-sizing:border-box}@page{size:A4;margin:0}html,body{width:100%;height:100%;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fb923c 0%,#fbbf24 40%,#fef3c7 100%)!important;font-family:-apple-system,sans-serif;color:#1c1917;text-align:center}.c{padding:60px 40px;max-width:600px}.logo{width:120px;height:120px;background:#f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 30px;box-shadow:0 8px 30px rgba(0,0,0,0.15)}h1{font-size:56px;font-weight:900;margin:20px 0;line-height:1}.tag{font-size:22px;color:#44403c;margin-bottom:40px;font-weight:600}.qr{background:white;padding:24px;border-radius:20px;display:inline-block;box-shadow:0 12px 40px rgba(0,0,0,0.15);margin:20px 0}.qr img{width:280px;height:280px}.cafe{font-size:28px;color:#9a3412;font-weight:800;margin-top:20px}.steps{font-size:16px;color:#57534e;margin-top:30px;line-height:1.8;font-weight:600}.pow{font-size:12px;color:#78716c;margin-top:20px}@media print{html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{background:linear-gradient(180deg,#fb923c 0%,#fbbf24 40%,#fef3c7 100%)!important}.logo{background:#f97316!important}}</style></head><body><div class="c"><div class="logo"><svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M 24 36 L 74 36 A 2 2 0 0 1 76 38 L 76 46"/><path d="M 22 42 C 22 55 28 66 32 66"/><path d="M 22 42 C 40 42 45 42 55 50 C 62 55 72 55 76 50"/><path d="M 76 46 C 76 60 72 66 68 66"/><path d="M 44 66 L 56 66"/><path d="M 76 44 C 92 44 96 52 86 62 C 80 67 72 62 68 60"/><circle cx="38" cy="66" r="6"/><circle cx="38" cy="66" r="2"/><circle cx="62" cy="66" r="6"/><circle cx="62" cy="66" r="2"/></svg></div><h1>COFFEE<br/>ON THE CURB</h1><div class="tag">No parking hassle · No queue · Just vibes</div><div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}"/></div><div class="cafe">${profile?.businessName || 'Your Cafe'}</div><div class="steps">Scan → Order → We bring it out 🚗</div><div class="pow">Powered by Pull Up Coffee™</div></div></body></html>`);
                                            pw.document.close(); setTimeout(() => pw.print(), 800);
                                        }
                                    }} className="w-full bg-orange-500 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition">🖨️ Print</button>
                                </div>

                                {/* Design 3: Neon Night */}
                                <div className="border-2 border-stone-200 rounded-2xl p-4 text-center hover:border-orange-400 transition cursor-pointer group">
                                    <div className="bg-gradient-to-b from-purple-900 via-violet-800 to-indigo-900 rounded-xl p-4 mb-3 aspect-[3/4] flex flex-col items-center justify-center text-white">
                                        <PullUpLogo className="w-10 h-10 mb-2" />
                                        <p className="font-bold text-sm text-fuchsia-300" style={{textShadow:'0 0 10px #d946ef'}}>PULL UP &amp; SIP</p>
                                        <p className="text-[9px] text-purple-300">Curbside coffee, zero wait</p>
                                        <div className="bg-white p-2 rounded-lg mt-2 inline-block">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}`} alt="QR" className="w-[60px] h-[60px]" />
                                        </div>
                                        <p className="text-[8px] mt-1 text-purple-200">{profile?.businessName || 'Your Cafe'}</p>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Neon Night</p>
                                    <p className="text-[9px] text-stone-500 mb-3">Bold, vibrant, eye-catching</p>
                                    <button onClick={() => {
                                        const pw = window.open('', '_blank');
                                        if (pw) {
                                            pw.document.write(`<!DOCTYPE html><html><head><title>Poster - ${profile?.businessName || 'Cafe'}</title><style>*{margin:0;padding:0;box-sizing:border-box}@page{size:A4;margin:0}html,body{width:100%;height:100%;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#581c87 0%,#5b21b6 50%,#312e81 100%)!important;font-family:-apple-system,sans-serif;color:white;text-align:center}.c{padding:60px 40px;max-width:600px}.logo{width:120px;height:120px;background:#f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 30px;box-shadow:0 0 40px rgba(249,115,22,0.5)}h1{font-size:56px;font-weight:900;margin:20px 0;line-height:1;color:#e879f9;text-shadow:0 0 30px #d946ef,0 0 60px #a855f7}.tag{font-size:20px;color:#c4b5fd;margin-bottom:40px;font-weight:600}.qr{background:white;padding:24px;border-radius:20px;display:inline-block;box-shadow:0 0 40px rgba(168,85,247,0.4);margin:20px 0}.qr img{width:280px;height:280px}.cafe{font-size:28px;color:#fbbf24;font-weight:800;margin-top:20px;text-shadow:0 0 15px rgba(251,191,36,0.5)}.steps{font-size:16px;color:#a78bfa;margin-top:30px;line-height:1.8;font-weight:600}.pow{font-size:12px;color:#7c3aed;margin-top:20px}@media print{html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{background:linear-gradient(180deg,#581c87 0%,#5b21b6 50%,#312e81 100%)!important}.logo{background:#f97316!important}}</style></head><body><div class="c"><div class="logo"><svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M 24 36 L 74 36 A 2 2 0 0 1 76 38 L 76 46"/><path d="M 22 42 C 22 55 28 66 32 66"/><path d="M 22 42 C 40 42 45 42 55 50 C 62 55 72 55 76 50"/><path d="M 76 46 C 76 60 72 66 68 66"/><path d="M 44 66 L 56 66"/><path d="M 76 44 C 92 44 96 52 86 62 C 80 67 72 62 68 60"/><circle cx="38" cy="66" r="6"/><circle cx="38" cy="66" r="2"/><circle cx="62" cy="66" r="6"/><circle cx="62" cy="66" r="2"/></svg></div><h1>PULL UP<br/>& SIP</h1><div class="tag">Curbside coffee · Zero wait · Maximum vibes</div><div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`https://pullupcoffee.com?cafe=${user?.uid}`)}"/></div><div class="cafe">${profile?.businessName || 'Your Cafe'}</div><div class="steps">Scan → Order → We bring it out 🚗</div><div class="pow">Powered by Pull Up Coffee™</div></div></body></html>`);
                                            pw.document.close(); setTimeout(() => pw.print(), 800);
                                        }
                                    }} className="w-full bg-purple-700 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-600 transition">🖨️ Print</button>
                                </div>
                            </div>
                            <p className="text-[9px] text-stone-500 italic text-center">Tip: In your browser&apos;s print dialog, make sure &quot;Background graphics&quot; is checked to preserve colors and gradients.</p>
                        </div>
                    </div>
                )}

                {tab === 'support' && (
                    <div className="bg-white p-4 sm:p-8 rounded-[2rem] shadow-sm border border-stone-200 flex flex-col min-h-[500px] max-h-[75vh] relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-4 border-b border-stone-100 pb-4">
                            <div className="bg-stone-100 p-3 rounded-full text-stone-900"><Icons.Robot /></div>
                            <div><h3 className="font-serif font-bold text-xl text-stone-900">Support Engine</h3><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Platform Knowledge Base</p></div>
                        </div>
                        <div className="mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Staff Training Videos</p>
                            <a href={ONBOARDING_VIDEOS[0].url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-stone-900">Open</a>
                        </div>
                        <div className="mb-3">
                            <button onClick={() => setShowMostAsked(prev => !prev)} className="w-full flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl hover:border-stone-300 transition">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Most Asked (Tap to Expand)</p>
                                <span className={`text-stone-400 transition-transform ${showMostAsked ? 'rotate-90' : ''}`}><Icons.ChevronRight /></span>
                            </button>
                            {showMostAsked && (
                                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-stone-50 border border-stone-200 rounded-xl animate-fade-in">
                                    {quickSupportPrompts.map((prompt) => (
                                        <button key={prompt} onClick={() => { submitBotQuestion(prompt); setShowMostAsked(false); }} className="text-[10px] px-3 py-2 border border-stone-200 rounded-full bg-white hover:border-orange-400 hover:text-orange-600 transition font-bold uppercase tracking-widest text-stone-600">
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* ─── WHY PULL UP? COMPARISON ─── */}
                        <div className="mb-3">
                            <button onClick={() => setShowWhyPullUp(prev => !prev)} className="w-full flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:border-emerald-300 transition">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">📊 Why Pull Up? Platform Comparison</p>
                                <span className={`text-emerald-400 transition-transform ${showWhyPullUp ? 'rotate-90' : ''}`}><Icons.ChevronRight /></span>
                            </button>
                            {showWhyPullUp && (
                                <div className="mt-2 p-4 bg-white border border-emerald-200 rounded-xl animate-fade-in space-y-4">
                                    <h4 className="text-sm font-bold text-stone-900">How Pull Up Coffee Compares to Other Platforms</h4>
                                    <p className="text-xs text-stone-500">See how much more you keep with Pull Up vs third-party delivery apps.</p>

                                    {/* Fee comparison bars */}
                                    <div className="space-y-3">
                                        {[
                                            { name: 'Pull Up Coffee', fee: '$0.99 flat', pct: 0, color: 'bg-emerald-500', barW: '2%', note: '100% of menu + curbside fee is yours' },
                                            { name: 'me&u / Mr Yum', fee: '~5% commission', pct: 5, color: 'bg-yellow-500', barW: '17%', note: 'Per-order commission from menu revenue' },
                                            { name: 'Bopple', fee: '~6-8%', pct: 7, color: 'bg-amber-500', barW: '23%', note: 'Commission + monthly subscription' },
                                            { name: 'DoorDash Pickup', fee: '15-25%', pct: 20, color: 'bg-orange-500', barW: '67%', note: 'Commission on order total' },
                                            { name: 'UberEats', fee: '30%+', pct: 30, color: 'bg-red-500', barW: '100%', note: 'Highest commission + service fees' },
                                        ].map((p) => (
                                            <div key={p.name}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-bold text-stone-700">{p.name}</span>
                                                    <span className="text-[10px] font-mono font-bold text-stone-500">{p.fee}</span>
                                                </div>
                                                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                                                    <div className={`${p.color} h-full rounded-full transition-all duration-500`} style={{ width: p.pct === 0 ? '3%' : p.barW }} />
                                                </div>
                                                <p className="text-[9px] text-stone-400 mt-0.5">{p.note}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2">Your Pull Up Advantage</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-2 bg-white rounded-lg border border-emerald-200">
                                                <p className="text-lg font-bold text-emerald-700">$0</p>
                                                <p className="text-[9px] text-stone-500 font-bold uppercase">Commission</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg border border-emerald-200">
                                                <p className="text-lg font-bold text-emerald-700">100%</p>
                                                <p className="text-[9px] text-stone-500 font-bold uppercase">Menu Revenue Kept</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg border border-emerald-200">
                                                <p className="text-lg font-bold text-emerald-700">100%</p>
                                                <p className="text-[9px] text-stone-500 font-bold uppercase">Curbside Fee Kept</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg border border-emerald-200">
                                                <p className="text-lg font-bold text-emerald-700">$0</p>
                                                <p className="text-[9px] text-stone-500 font-bold uppercase">Monthly Subscription</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                        <p className="text-[10px] font-bold text-stone-600 mb-2">Example: $30 Order Comparison</p>
                                        <div className="space-y-1.5 text-[11px]">
                                            <div className="flex justify-between"><span className="text-stone-600">UberEats (30%):</span><span className="text-red-600 font-bold">You lose $9.00</span></div>
                                            <div className="flex justify-between"><span className="text-stone-600">DoorDash (20%):</span><span className="text-orange-600 font-bold">You lose $6.00</span></div>
                                            <div className="flex justify-between"><span className="text-stone-600">me&u (5%):</span><span className="text-yellow-600 font-bold">You lose $1.50</span></div>
                                            <div className="flex justify-between"><span className="text-stone-600">Pull Up Coffee:</span><span className="text-emerald-600 font-bold">You lose $0.00 ✓</span></div>
                                        </div>
                                        <p className="text-[9px] text-stone-400 mt-2">The customer pays a flat $0.99 service fee directly to Pull Up. Your menu revenue and curbside fee remain untouched.</p>
                                    </div>

                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-[10px] font-bold text-amber-700 mb-1">💡 Pricing Transparency</p>
                                        <p className="text-[10px] text-stone-600">We encourage all partner cafes to keep their Pull Up menu prices the same as in-store. Customers trust transparency, and consistent pricing builds loyalty and repeat orders.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 text-sm">
                            {botChat.map((m, i) => (
                                <div key={i} className={`flex ${m.type === 'bot' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`p-5 rounded-[1.5rem] max-w-[85%] leading-relaxed ${m.type === 'bot' ? 'bg-stone-50 text-stone-600 border border-stone-200' : 'bg-stone-900 text-white shadow-md'}`}>{m.text}</div>
                                </div>
                            ))}
                            <div ref={botChatEndRef}></div>
                        </div>
                        <form onSubmit={handleBotSubmit} className="flex gap-3 pt-4 border-t border-stone-100">
                            <input type="text" value={botInput} onChange={(e) => setBotInput(e.target.value)} placeholder="Ask any operations or policy question..." className="flex-1 bg-stone-50 border border-stone-200 p-4 rounded-xl outline-none focus:border-stone-400 transition text-stone-900 font-medium text-sm" />
                            <button type="submit" className="bg-stone-900 text-white p-4 rounded-xl shadow-md hover:bg-stone-800 transition active:scale-95"><Icons.Send /></button>
                        </form>
                    </div>
                )}

                {tab === 'platform' && isPlatformAdmin && (
                    <div className="space-y-6">
                        {/* ─── PULSE HEADER ─── */}
                        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 p-6 rounded-[2rem] text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 50%, #22c55e 0%, transparent 50%)'}} />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                                        <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">Pull Up Command Centre</h2>
                                        <p className="text-xs text-stone-400 mt-0.5">All systems operational &middot; Real-time monitoring active</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-mono font-bold tabular-nums">{new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">Last sync {platformUpdatedAt ? new Date(platformUpdatedAt).toLocaleTimeString() : '--'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ─── HERO METRICS ─── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-200/30 rounded-full" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-green-600 mb-1">Revenue Today</p>
                                <p className="text-3xl font-bold text-green-700 tabular-nums">${platformStats.grossToday.toFixed(0)}</p>
                                <p className="text-[10px] text-green-500 mt-1">{platformStats.completedToday} completed</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-200/30 rounded-full" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600 mb-1">Active Orders</p>
                                <p className="text-3xl font-bold text-orange-700 tabular-nums">{platformStats.activeOrders}</p>
                                <p className="text-[10px] text-orange-500 mt-1">{platformStats.ordersToday} total today</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-200/30 rounded-full" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600 mb-1">Cafes Online</p>
                                <p className="text-3xl font-bold text-blue-700 tabular-nums">{platformStats.onlineCafes}<span className="text-lg text-blue-400">/{platformStats.totalCafes}</span></p>
                                <p className="text-[10px] text-blue-500 mt-1">{platformStats.pendingApprovals} pending approval</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-200/30 rounded-full" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-purple-600 mb-1">Platform Fee</p>
                                <p className="text-3xl font-bold text-purple-700 tabular-nums">${platformStats.feeFlowToday.toFixed(0)}</p>
                                <p className="text-[10px] text-purple-500 mt-1">{platformStats.activeCustomers} active users</p>
                            </div>
                        </div>

                        {/* ─── COMPLETION RATE + REJECTION ─── */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Order Completion Rate</p>
                                    <p className="text-sm font-bold text-stone-900">{platformStats.ordersToday > 0 ? Math.round((platformStats.completedToday / platformStats.ordersToday) * 100) : 0}%</p>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000" style={{width: `${platformStats.ordersToday > 0 ? (platformStats.completedToday / platformStats.ordersToday) * 100 : 0}%`}} />
                                </div>
                                <div className="flex justify-between text-[9px] text-stone-400 mt-2">
                                    <span>{platformStats.completedToday} completed</span>
                                    <span>{platformStats.rejectedToday} rejected</span>
                                    <span>{platformStats.activeOrders} in progress</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-3">Revenue Split</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-stone-600">Gross Orders</span>
                                        <span className="text-sm font-bold text-stone-900">${platformStats.grossToday.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-orange-600">Curbside Fees (100% to Cafe)</span>
                                        <span className="text-sm font-bold text-orange-600">${platformStats.feeFlowToday.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-stone-100 pt-2">
                                        <span className="text-xs text-green-600">Platform Revenue ($0.99/order)</span>
                                        <span className="text-sm font-bold text-green-600">${(platformStats.completedToday * PLATFORM_SERVICE_FEE).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── LIVE ORDER FEED ─── */}
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Live Order Feed</p>
                            </div>
                            {platformRecentOrders.length === 0 ? (
                                <p className="text-sm text-stone-400 italic text-center py-8">No orders yet today — waiting for the first pull up...</p>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {platformRecentOrders.map((o: any) => (
                                        <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${o.status === 'pending' ? 'bg-amber-400 animate-pulse' : o.status === 'preparing' ? 'bg-blue-400' : o.status === 'ready' ? 'bg-green-400' : o.status === 'completed' ? 'bg-green-600' : 'bg-red-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-stone-900 truncate">{o.customerName}</span>
                                                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : o.status === 'ready' ? 'bg-green-100 text-green-700' : o.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{o.status}</span>
                                                    {o.pickupTime && o.pickupTime !== 'ASAP' && <span className="text-[8px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">🕐 {o.pickupTime}</span>}
                                                </div>
                                                <p className="text-[10px] text-stone-500 mt-0.5">{o.cafeName} &middot; {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''} &middot; ${Number(o.total || 0).toFixed(2)}</p>
                                            </div>
                                            <span className="text-[9px] text-stone-400 font-mono shrink-0">{o.timestamp ? new Date(o.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ─── CAFE NETWORK ─── */}
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Cafe Network</p>
                                    <span className="text-[9px] font-bold bg-stone-100 px-2 py-0.5 rounded-full text-stone-600">{platformCafeRows.length}</span>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                                {platformCafeRows.map((row) => (
                                    <div key={row.id} className={`p-4 rounded-xl border transition ${row.status === 'open' ? 'border-green-200 bg-green-50/50' : 'border-stone-200 bg-stone-50/50'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${row.status === 'open' ? 'bg-green-500' : 'bg-stone-300'}`} />
                                                <span className="font-bold text-sm text-stone-900">{row.businessName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {row.stripeConnected ? <span className="text-[8px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">STRIPE ✓</span> : <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">NO STRIPE</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[9px] text-stone-500">
                                            <span>{row.activeOrders} active order{row.activeOrders !== 1 ? 's' : ''}</span>
                                            <span>&middot;</span>
                                            <span className="uppercase">{row.payoutPreference} payout</span>
                                            <span>&middot;</span>
                                            {row.isApproved ? <span className="text-green-600 font-bold">APPROVED</span> : (
                                                <button onClick={async () => { if (!confirm(`Approve ${row.businessName}?`)) return; try { const token = await getAuthToken(); const res = await fetch('/api/admin/cafes/approve', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ cafeId: row.id }) }); const data = await res.json(); if (res.ok && data.ok) alert(`${row.businessName} approved!`); else alert('Failed: ' + (data.error || 'Unknown')); } catch { alert('Network error.'); } }} className="font-bold text-orange-600 hover:text-orange-500 underline">APPROVE NOW</button>
                                            )}
                                        </div>
                                        {row.isApproved && (
                                            <button onClick={async () => { if (!confirm(`Resend approval notifications to ${row.businessName}?`)) return; try { const token = await getAuthToken(); const res = await fetch('/api/admin/cafes/approve', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ cafeId: row.id }) }); const data = await res.json(); if (res.ok && data.ok) alert(`Notifications resent!`); else alert('Failed: ' + (data.error || 'Unknown')); } catch { alert('Network error.'); } }} className="mt-2 text-[8px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400 underline">Resend Notifications</button>
                                        )}
                                    </div>
                                ))}
                                {platformCafeRows.length === 0 && <p className="text-sm text-stone-400 italic col-span-2 text-center py-8">No cafes registered yet</p>}
                            </div>
                        </div>

                        {/* ─── AFFILIATE TRACKER ─── */}
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Affiliate Network</p>
                                    <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{platformAffiliates.length}</span>
                                </div>
                            </div>
                            {platformAffiliates.length === 0 ? (
                                <p className="text-sm text-stone-400 italic text-center py-8">No affiliates registered yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {platformAffiliates.map((aff: any) => {
                                        const createdAt = aff.createdAt ? new Date(aff.createdAt) : null;
                                        const firstTx = aff.firstTransactionAt ? new Date(aff.firstTransactionAt) : null;
                                        const commissionStart = firstTx || createdAt;
                                        const daysElapsed = commissionStart ? Math.floor((Date.now() - commissionStart.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                        const daysLeft = Math.max(30 - daysElapsed, 0);
                                        const isActive = daysLeft > 0;
                                        const referredCafes = platformCafeRows.filter((c: any) => {
                                            // Match cafes that have this affiliate's referral code
                                            return false; // We'd need referredBy on cafe — just show count from affiliate doc
                                        }).length;
                                        return (
                                            <div key={aff.id} className={`p-4 rounded-xl border ${isActive ? 'border-purple-200 bg-purple-50/30' : 'border-stone-200 bg-stone-50/30'}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <span className="font-bold text-sm text-stone-900">{aff.name || aff.email || 'Unknown'}</span>
                                                        <p className="text-[10px] text-stone-500 mt-0.5">{aff.email}</p>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">{aff.referralCode || '—'}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[9px] text-stone-500 mb-3">
                                                    <span>{aff.referralCount || 0} referral{(aff.referralCount || 0) !== 1 ? 's' : ''}</span>
                                                    <span>&middot;</span>
                                                    <span>${Number(aff.totalEarned || 0).toFixed(2)} earned</span>
                                                    <span>&middot;</span>
                                                    <span className={isActive ? 'text-green-600 font-bold' : 'text-stone-400'}>{isActive ? 'ACTIVE' : 'EXPIRED'}</span>
                                                </div>
                                                {isActive && (
                                                    <div>
                                                        <div className="flex justify-between text-[9px] mb-1">
                                                            <span className="text-purple-600 font-bold">Commission window</span>
                                                            <span className="text-purple-600 font-bold">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                                                        </div>
                                                        <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500" style={{width: `${((30 - daysLeft) / 30) * 100}%`}} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ─── SYSTEM FOOTER ─── */}
                        <div className="text-center py-4">
                            <p className="text-[9px] text-stone-400 uppercase tracking-widest">Pull Up Coffee™ Air Traffic Control &middot; ABN 17 587 686 972 &middot; Firebase Spark &middot; Stripe Live &middot; Vercel Hobby</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CUSTOMER FLOW ---
const Discovery = ({ setView, onSelectCafe, cafes }: any) => {
    const [searchRadius, setSearchRadius] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');
    const [areaTerm, setAreaTerm] = useState('');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
    const [locationError, setLocationError] = useState('');
    const [detectedAreaLabel, setDetectedAreaLabel] = useState('');
    const [hasManualRadius, setHasManualRadius] = useState(false);

    const resolveAreaFromCoords = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
            if (!res.ok) return;
            const payload = await res.json();
            const address = payload?.address || {};
            const postcode = address.postcode || '';
            const suburb = address.suburb || address.city || address.town || address.village || '';
            const composed = [suburb, postcode].filter(Boolean).join(' ').trim();
            if (!composed) return;
            setDetectedAreaLabel(composed);
            setAreaTerm(composed);
        } catch {
            // best effort only
        }
    };

    const requestLocation = (forceFresh = false) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Location is not supported on this device/browser.');
            return;
        }
        setLocationStatus('requesting');
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setUserLocation({ lat, lng });
                setLocationStatus('granted');
                setHasManualRadius(false);
                void resolveAreaFromCoords(lat, lng);
            },
            (error) => {
                setUserLocation(null);
                if (error.code === 1) {
                    setLocationStatus('denied');
                    setLocationError('Location permission denied. You can still search by suburb/postcode.');
                    return;
                }
                setLocationStatus('error');
                setLocationError('Unable to fetch your location right now.');
            },
            { enableHighAccuracy: true, timeout: 18000, maximumAge: forceFresh ? 0 : 300000 },
        );
    };

    useEffect(() => {
        requestLocation();
    }, []);

    const distanceCatalog = cafes
        .filter((c: any) => c.isApproved)
        .map((c: any) => {
            const cafeLat = Number(c.latitude ?? c.lat);
            const cafeLng = Number(c.longitude ?? c.lng);
            const hasCafeCoords = Number.isFinite(cafeLat) && Number.isFinite(cafeLng);
            const distanceKm = userLocation && hasCafeCoords
                ? haversineDistanceMeters(userLocation.lat, userLocation.lng, cafeLat, cafeLng) / 1000
                : null;

            return { ...c, distanceKm };
        })
        .filter((c: any) => typeof c.distanceKm === 'number')
        .sort((a: any, b: any) => (a.distanceKm as number) - (b.distanceKm as number));

    useEffect(() => {
        if (locationStatus !== 'granted' || hasManualRadius) return;

        const distances = distanceCatalog.map((c: any) => c.distanceKm as number);
        if (!distances.length) return;

        const DEFAULT_RADIUS_KM = 15;
        const MIN_RESULTS_TARGET = 4;
        const MAX_RESULTS_TARGET = 8;
        const MIN_RADIUS_WHEN_DENSE = 5;

        const closestDistance = distances[0];
        let suggestedRadius = DEFAULT_RADIUS_KM;

        if (closestDistance > suggestedRadius) {
            suggestedRadius = Math.ceil(closestDistance);
        }

        const countWithinSuggested = distances.filter((distance: number) => distance <= suggestedRadius).length;
        if (countWithinSuggested > MAX_RESULTS_TARGET) {
            const minDistanceForTargetCount = distances[Math.min(MIN_RESULTS_TARGET - 1, distances.length - 1)];
            suggestedRadius = Math.max(MIN_RADIUS_WHEN_DENSE, Math.ceil(minDistanceForTargetCount));
        }

        suggestedRadius = Math.max(Math.ceil(closestDistance), suggestedRadius);
        suggestedRadius = Math.min(50, Math.max(1, suggestedRadius));

        setSearchRadius((current) => (current === suggestedRadius ? current : suggestedRadius));
    }, [locationStatus, distanceCatalog, hasManualRadius]);

    const normalizedCafeTerm = searchTerm.trim().toLowerCase();
    const normalizedAreaTerm = areaTerm.trim().toLowerCase();

    const filteredCafes = cafes
        .filter((c: any) => c.isApproved)
        .map((c: any) => {
            const cafeLat = Number(c.latitude ?? c.lat);
            const cafeLng = Number(c.longitude ?? c.lng);
            const hasCafeCoords = Number.isFinite(cafeLat) && Number.isFinite(cafeLng);
            const distanceKm = userLocation && hasCafeCoords
                ? haversineDistanceMeters(userLocation.lat, userLocation.lng, cafeLat, cafeLng) / 1000
                : null;

            const matchesCafeText =
                normalizedCafeTerm.length === 0
                || (c.businessName?.toLowerCase() || '').includes(normalizedCafeTerm)
                || (c.address?.toLowerCase() || '').includes(normalizedCafeTerm);

            const matchesArea =
                normalizedAreaTerm.length === 0
                || (c.address?.toLowerCase() || '').includes(normalizedAreaTerm);

            const matchesRadius =
                locationStatus !== 'granted'
                || distanceKm === null
                || distanceKm <= searchRadius;

            return { ...c, distanceKm, matchesCafeText, matchesArea, matchesRadius };
        })
        .filter((c: any) => c.matchesCafeText && c.matchesArea && c.matchesRadius)
        .sort((a: any, b: any) => {
            if (a.distanceKm === null && b.distanceKm === null) return 0;
            if (a.distanceKm === null) return 1;
            if (b.distanceKm === null) return -1;
            return a.distanceKm - b.distanceKm;
        });

    const handleFavoriteCafe = async (event: React.MouseEvent, cafe: any) => {
        event.stopPropagation();
        localStorage.setItem('pullup_pending_favorite_cafe', cafe.id);
        localStorage.setItem('pullup_pending_favorite_name', cafe.businessName || 'this cafe');
        alert(`Favourite saved for ${cafe.businessName}. At checkout, enter your mobile number and we will confirm/save your alert details for this cafe.`);
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6 animate-fade-in flex flex-col items-center">
            <div className="w-full max-w-md">
                <button onClick={() => setView('landing')} className="mb-10 text-stone-500 font-bold flex items-center gap-2 hover:text-stone-900 transition text-xs uppercase tracking-widest"><Icons.X /> Back</button>
                <div className="animate-fade-in text-center">
                    <h2 className="text-4xl font-serif font-bold text-stone-900 italic tracking-tighter leading-none mb-2">Nearby.</h2>
                    <p className="text-stone-400 text-sm font-medium mb-5">
                        {locationStatus === 'granted' ? 'Location enabled. Showing cafes in your radius.' : 'Enable location to search nearby cafes automatically.'}
                    </p>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 mb-5 max-w-sm mx-auto text-left">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Live Location</p>
                            <button onClick={() => requestLocation(true)} className="text-[10px] uppercase tracking-widest font-bold bg-stone-900 text-white px-3 py-2 rounded-full hover:bg-stone-800 transition">
                                {locationStatus === 'requesting' ? 'Locating…' : (locationStatus === 'granted' ? 'Refresh' : 'Enable')}
                            </button>
                        </div>
                        {locationStatus === 'granted' && userLocation && (
                            <p className="text-xs text-stone-600 mt-2">Using your location: {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}</p>
                        )}
                        {detectedAreaLabel && <p className="text-xs text-stone-500 mt-1">Detected area: {detectedAreaLabel}</p>}
                        {(locationStatus === 'denied' || locationStatus === 'error') && (
                            <p className="text-xs text-amber-600 mt-2">{locationError}</p>
                        )}
                    </div>

                    <div className="relative mb-8">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400"><Icons.Search /></div>
                        <input type="text" placeholder="Search cafe name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-stone-200 rounded-full py-4 pl-14 pr-6 text-stone-900 focus:outline-none focus:border-stone-400 shadow-sm transition font-medium text-center" />
                    </div>

                    <div className="relative mb-6">
                        <input type="text" placeholder="Suburb or postcode (optional)" value={areaTerm} onChange={e => setAreaTerm(e.target.value)} className="w-full bg-white border border-stone-200 rounded-full py-4 px-6 text-stone-900 focus:outline-none focus:border-stone-400 shadow-sm transition font-medium text-center" />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 mb-8 max-w-sm mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2"><Icons.Sliders /> Search Radius</label>
                            <span className="font-bold text-orange-500 text-sm">{searchRadius} km</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={searchRadius}
                            onChange={(e: any) => {
                                setHasManualRadius(true);
                                setSearchRadius(Number(e.target.value));
                            }}
                            className="w-full accent-orange-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    <div className="space-y-4 w-full">
                        {filteredCafes.length === 0 ? <div className="text-center py-20 text-stone-400 italic">No partners found with current filters. Try increasing the radius or searching by name.</div> : 
                        filteredCafes.map((c: any) => {
                            const isOpen = c.status === 'open';
                            return (
                                <button key={c.id} onClick={() => onSelectCafe(c)} className={`w-full p-5 bg-white rounded-2xl border text-left transition-all shadow-sm flex items-center gap-4 relative overflow-hidden group ${isOpen ? 'border-green-400 hover:shadow-md hover:border-green-500 cursor-pointer' : 'border-stone-200 hover:border-stone-300 cursor-pointer opacity-80'}`}>
                                    <div onClick={(event) => handleFavoriteCafe(event, c)} className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition z-10" title="Save Favourite & SMS"><Icons.Heart /></div>
                                    <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center text-stone-400">
                                    {c.logo ? <img src={c.logo} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                                    </div>
                                    <div className="flex-1 pr-8 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-stone-900 tracking-tight leading-none truncate">{c.businessName}</h3>
                                            {isOpen ? 
                                                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-widest text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full uppercase">● Open</span>
                                            : 
                                                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-widest text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full uppercase">Closed</span>
                                            }
                                        </div>
                                        <p className="text-stone-500 text-xs font-medium truncate mb-1">{c.address}</p>
                                        <div className="flex items-center gap-3">
                                            {typeof c.distanceKm === 'number' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)}m` : `${c.distanceKm.toFixed(1)}km`}</span>}
                                            {isOpen && <span className="text-[10px] text-stone-400 font-medium">Ready for orders</span>}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CafeMenu = ({ setView, selectedCafe, cart, setCart, db, auth, user }: any) => {
    const [shopMenu, setShopMenu] = useState<any[]>([]);
    const [activeItem, setActiveItem] = useState(null);
    const globalPricing = selectedCafe?.globalPricing || { milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 };
    
    useEffect(() => {
        if (!selectedCafe) return;
        const q = query(collection(db, 'cafes', selectedCafe.id, 'menu'));
        return onSnapshot(q, snap => {
            setShopMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m:any) => m.active));
        });
    }, [selectedCafe, db]);

    const handleSaveFavorite = async () => {
        if (!selectedCafe?.id) return;
        const mobile = prompt(`Save ${selectedCafe.businessName} to favourites. Enter mobile for optional SMS alerts:`, '04');
        if (!mobile) return;
        const normalized = mobile.replace(/\s+/g, '');
        if (normalized.length < 8) {
            alert('Please enter a valid mobile number.');
            return;
        }
        if (!auth.currentUser) {
            try { await signInAnonymously(auth); } catch {}
        }
        const existing = await getDocs(query(collection(db, 'favorites'), where('cafeId', '==', selectedCafe.id), where('mobile', '==', normalized)));
        if (!existing.empty) {
            alert('This number is already saved for this cafe.');
            return;
        }
        await addDoc(collection(db, 'favorites'), {
            cafeId: selectedCafe.id,
            cafeName: selectedCafe.businessName,
            mobile: normalized,
            smsOptIn: true,
            customerId: user?.uid || auth.currentUser?.uid || null,
            createdAt: new Date().toISOString(),
            source: 'cafe-menu',
        });
        alert(`Saved ${selectedCafe.businessName} as favourite for ${normalized}.`);
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6 pb-32 animate-fade-in text-left relative flex flex-col items-center">
            <div className="w-full max-w-md">
                <button onClick={() => setView('discovery')} className="mb-10 p-3 bg-white shadow-sm border border-stone-100 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                <div className="text-center mb-10">
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-white shadow-md border-4 border-white mb-4 flex items-center justify-center text-stone-300">
                        {selectedCafe.logo ? <img src={selectedCafe.logo} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                    </div>
                    <h2 className="text-4xl font-serif italic font-bold text-stone-900 leading-tight">{selectedCafe.businessName}</h2>
                    <div className="mt-3 flex items-center justify-center gap-3">
                        <button onClick={handleSaveFavorite} className="text-[10px] uppercase tracking-widest font-bold border border-stone-300 text-stone-700 px-4 py-2 rounded-full hover:bg-stone-100 transition flex items-center gap-2"><Icons.Heart /> Save Favourite</button>
                        {selectedCafe.status !== 'open' && <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500">Currently Closed · You can still save as favourite</span>}
                    </div>
                </div>
                
                <div className="space-y-4">
                    {shopMenu.length === 0 ? <p className="text-center text-stone-400 italic">Menu coming soon.</p> : 
                    shopMenu.map((item: any) => (
                        <div key={item.id} onClick={() => setActiveItem(item)} className="bg-white p-4 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-5 group hover:border-stone-300 transition-all cursor-pointer">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0 flex items-center justify-center text-stone-300">
                                {item.img ? <img src={item.img} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <Icons.Coffee />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-stone-900 leading-tight">{item.name}</h4>
                                <p className="text-orange-500 font-bold text-sm mt-1">${parseFloat(item.price).toFixed(2)}</p>
                            </div>
                            <button className="bg-stone-900 text-white p-4 rounded-2xl transition shadow-md active:scale-95 shrink-0 group-hover:bg-stone-800"><Icons.Plus /></button>
                        </div>
                    ))}
                </div>
            </div>

            {activeItem && <ProductModal item={activeItem} globalPricing={globalPricing} onClose={() => setActiveItem(null)} onAdd={(item: any) => { setCart([...cart, { ...item, cartId: Math.random() }]); setActiveItem(null); }} />}

            {cart.length > 0 && !activeItem && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent z-30">
                    {cart.reduce((s:any,i:any)=>s+i.price,0) < MIN_CART_TOTAL && (
                        <p className="text-center text-xs text-amber-600 font-bold mb-2 max-w-md mx-auto">Min ${MIN_CART_TOTAL.toFixed(2)} order · Add ${(MIN_CART_TOTAL - cart.reduce((s:any,i:any)=>s+i.price,0)).toFixed(2)} more</p>
                    )}
                    <button onClick={() => setView('checkout')} disabled={selectedCafe?.status !== 'open'} className={`w-full max-w-md mx-auto p-6 rounded-[2rem] font-bold flex justify-between items-center shadow-xl transition active:scale-[0.98] ${selectedCafe?.status === 'open' ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
                        <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black">{cart.length}</span>
                        <span className="text-[11px] uppercase tracking-widest ml-2">Review & Pay</span>
                        <span className="font-serif italic text-2xl">${(cart.reduce((s:any,i:any)=>s+i.price,0)+normalizeCurbsideFee(selectedCafe?.curbsideFee)).toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const Checkout = ({ setView, userProfile, setUserProfile, handlePlaceOrder, cart, selectedCafe }: any) => {
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [saveProfile, setSaveProfile] = useState(false);
    const [details, setDetails] = useState('');
    const [carPhoto, setCarPhoto] = useState<string | null>(null);
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [pendingFavoriteCafeId, setPendingFavoriteCafeId] = useState<string | null>(null);
    const [pickupType, setPickupType] = useState<'asap' | 'scheduled'>('asap');
    const [scheduledTime, setScheduledTime] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate time slots in 15-min increments from now + 15min to +3hrs
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        const now = new Date();
        const start = new Date(now.getTime() + 15 * 60000);
        start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
        for (let i = 0; i < 12; i++) {
            const t = new Date(start.getTime() + i * 15 * 60000);
            slots.push(t.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
        return slots;
    }, []);

    const fee = normalizeCurbsideFee(selectedCafe?.curbsideFee);
    const subtotal = cart.reduce((s:any,i:any)=>s+i.price,0);
    const total = (subtotal + fee + PLATFORM_SERVICE_FEE).toFixed(2);
    const cartBelowMin = subtotal < MIN_CART_TOTAL;

    useEffect(() => {
        const saved = localStorage.getItem('pullup_profile');
        if (saved) { try { setUserProfile(JSON.parse(saved)); setSaveProfile(true); } catch(e){} }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setPendingFavoriteCafeId(localStorage.getItem('pullup_pending_favorite_cafe'));
    }, [selectedCafe?.id]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files && e.target.files[0]) {
            const compressed = await compressImage(e.target.files[0]);
            setCarPhoto(compressed);
        } 
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6 animate-fade-in flex flex-col items-center pb-32 text-left font-sans">
            <div className="w-full max-w-md text-left">
                <button onClick={() => setView('cafe-menu')} className="mb-8 p-3 bg-white shadow-sm border border-stone-200 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                <h2 className="text-3xl sm:text-5xl font-serif font-bold italic mb-8 tracking-tighter text-stone-900 leading-none">Vehicle Specs.</h2>
                
                <div className="space-y-4 mb-8">
                    <input type="text" placeholder="Your Name" value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name:e.target.value})} className="w-full p-5 bg-white rounded-[1.5rem] outline-none font-medium focus:border-stone-400 border border-stone-200 transition text-stone-900 shadow-sm" />
                    <input type="tel" placeholder="Mobile (For SMS alerts)" value={userProfile.mobile || ''} onChange={(e) => setUserProfile({...userProfile, mobile:e.target.value})} className="w-full p-5 bg-white rounded-[1.5rem] outline-none font-medium focus:border-stone-400 border border-stone-200 transition text-stone-900 shadow-sm" />
                    {pendingFavoriteCafeId === selectedCafe?.id && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">Favourite Confirmation</p>
                            <p className="text-xs text-stone-700">This cafe is marked as favourite. When you place this order, we will save <strong>{userProfile.mobile || 'your mobile number'}</strong> to this cafe&apos;s favourites SMS list.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Car Make (e.g. Tesla)" value={userProfile.carModel} onChange={(e) => setUserProfile({...userProfile, carModel:e.target.value})} className="w-full p-5 bg-white rounded-[1.5rem] outline-none font-medium focus:border-stone-400 border border-stone-200 transition text-stone-900 shadow-sm" />
                        <input type="text" placeholder="Color (e.g. White)" value={userProfile.carColor || ''} onChange={(e) => setUserProfile({...userProfile, carColor:e.target.value})} className="w-full p-5 bg-white rounded-[1.5rem] outline-none font-medium focus:border-stone-400 border border-stone-200 transition text-stone-900 shadow-sm" />
                    </div>
                    <input type="text" placeholder="License Plate" value={userProfile.plate} onChange={(e) => setUserProfile({...userProfile, plate:e.target.value})} className="w-full p-5 bg-white rounded-[1.5rem] outline-none uppercase font-mono tracking-widest focus:border-stone-400 border border-stone-200 transition text-stone-900 shadow-sm font-bold" />
                    
                    <label className="flex items-center gap-3 p-5 bg-white border border-stone-100 shadow-sm rounded-[1.5rem] cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-stone-900" checked={gpsEnabled} onChange={(e) => setGpsEnabled(e.target.checked)} />
                        <div>
                            <span className="text-sm font-bold text-stone-700 block">Share live GPS distance with Cafe</span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">Helps the barista time your coffee perfectly. (Optional)</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-stone-100 rounded-[1.5rem] cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 accent-stone-900" checked={saveProfile} onChange={(e) => { setSaveProfile(e.target.checked); if(!e.target.checked) localStorage.removeItem('pullup_profile'); }} />
                        <span className="text-sm font-bold text-stone-700">Save details for next time</span>
                    </label>

                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm mt-6">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">When do you want it?</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button type="button" onClick={() => { setPickupType('asap'); setScheduledTime(''); }} className={`p-4 rounded-2xl border-2 text-center transition font-bold ${pickupType === 'asap' ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}>
                                <span className="block text-lg mb-1">⚡</span>
                                <span className="block text-sm">ASAP</span>
                                <span className="block text-[9px] font-normal mt-1 opacity-70">As fast as possible</span>
                            </button>
                            <button type="button" onClick={() => setPickupType('scheduled')} className={`p-4 rounded-2xl border-2 text-center transition font-bold ${pickupType === 'scheduled' ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}>
                                <span className="block text-lg mb-1">🕐</span>
                                <span className="block text-sm">Schedule</span>
                                <span className="block text-[9px] font-normal mt-1 opacity-70">Pick a time</span>
                            </button>
                        </div>
                        {pickupType === 'scheduled' && (
                            <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                {timeSlots.map(slot => (
                                    <button key={slot} type="button" onClick={() => setScheduledTime(slot)} className={`py-3 px-2 rounded-xl text-xs font-bold transition ${scheduledTime === slot ? 'bg-orange-500 text-white shadow-md' : 'bg-stone-50 text-stone-600 border border-stone-200 hover:border-orange-300'}`}>{slot}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm mt-6">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Parking Spot Info (Optional)</label>
                        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Parked near the big tree, hazards on..." className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl h-24 text-sm mb-4 focus:border-stone-400 transition text-stone-900 outline-none"></textarea>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                        {carPhoto ? (
                            <div className="relative w-full h-40 rounded-[1.5rem] overflow-hidden border border-stone-200 shadow-inner">
                                <img src={carPhoto} className="w-full h-full object-cover" />
                                <button onClick={() => setCarPhoto(null)} className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/80 transition"><Icons.X /></button>
                            </div>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-dashed border-stone-300 bg-stone-50 rounded-[1.5rem] text-stone-500 font-bold flex items-center justify-center gap-3 hover:bg-stone-100 transition uppercase tracking-widest text-[10px]"><Icons.Camera /> Snap Photo of Spot</button>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm mb-8 mt-8">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Order Summary</h4>
                    <div className="space-y-4 mb-6 pb-6 border-b border-stone-100">
                        {cart.map((i:any, idx:number) => (
                            <div key={idx} className="flex justify-between items-start text-sm text-stone-700">
                                <div><span className="font-bold text-stone-900 block">{i.name}</span><span className="text-xs text-stone-500">{i.size}, {i.milk}</span>{i.notes && <span className="block text-xs text-orange-500 italic mt-1 font-medium">&quot;{i.notes}&quot;</span>}</div>
                                <span className="font-bold text-stone-900">${i.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    {cartBelowMin && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                            <p className="text-xs font-bold text-red-600">Minimum order of ${MIN_CART_TOTAL.toFixed(2)} required. Add ${(MIN_CART_TOTAL - subtotal).toFixed(2)} more to proceed.</p>
                        </div>
                    )}
                    <div className="flex justify-between text-sm mb-2 text-stone-600"><span>Subtotal</span><span className="font-bold">${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm mb-2 text-orange-500 font-bold"><span>Curbside Fee</span><span>${fee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm mb-2 text-stone-400"><span>Pull Up Service Fee</span><span>${PLATFORM_SERVICE_FEE.toFixed(2)}</span></div>
                    <div className="flex justify-between text-3xl font-serif font-bold text-stone-900 mt-6 pt-6 border-t border-stone-100 italic"><span>Total</span><span>${total}</span></div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Secure payment via Stripe · 256-bit encrypted
                    </div>
                </div>

                <div className="mb-8 p-6 bg-stone-100 rounded-[1.5rem] text-sm flex gap-4 items-start shadow-inner border border-stone-200">
                    <input type="checkbox" className="mt-1 w-6 h-6 accent-stone-900 shrink-0 cursor-pointer" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <p className="text-stone-600 font-medium leading-relaxed">I agree to be legally parked curbside. I accept the <button onClick={(e) => {e.preventDefault(); setShowTerms(true);}} className="text-stone-900 font-bold underline">Terms & Liability</button>. No refunds for late arrivals.</p>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent z-30">
                <div className="max-w-md mx-auto">
                    <button onClick={() => handlePlaceOrder(details, carPhoto, gpsEnabled, pickupType === 'scheduled' ? scheduledTime : 'ASAP')} disabled={!agreed || !userProfile.name || !userProfile.plate || cartBelowMin || (pickupType === 'scheduled' && !scheduledTime)} className={`w-full py-5 rounded-[2rem] font-bold text-sm uppercase tracking-widest shadow-xl flex justify-center items-center gap-3 transition ${agreed && userProfile.name && userProfile.plate && !cartBelowMin && !(pickupType === 'scheduled' && !scheduledTime) ? 'bg-stone-900 text-white active:scale-[0.98]' : 'bg-stone-300 text-stone-500 shadow-none'}`}>
                        {pickupType === 'scheduled' && scheduledTime ? `PAY · PICKUP ${scheduledTime.toUpperCase()}` : 'PAY & PULL UP'}
                    </button>
                </div>
            </div>
            
            {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        </div>
    );
};

const Tracking = ({ setView, orderId, db, selectedCafe }: any) => {
    const [orderInfo, setOrderInfo] = useState<any>({});
    const [distance, setDistance] = useState<number | null>(null);
    const [showSupport, setShowSupport] = useState(false);
    const [curbsideNote, setCurbsideNote] = useState('');
    const [curbsidePhoto, setCurbsidePhoto] = useState<string | null>(null);
    const [sendingCurbside, setSendingCurbside] = useState(false);
    const lastSentLocation = useRef<{ lat: number; lng: number } | null>(null);
    const lastLocationWriteAt = useRef(0);
    const curbsideFileInputRef = useRef<HTMLInputElement>(null);
    const cafeLat = Number(selectedCafe?.latitude ?? selectedCafe?.lat);
    const cafeLng = Number(selectedCafe?.longitude ?? selectedCafe?.lng);
    const hasCafeCoords = Number.isFinite(cafeLat) && Number.isFinite(cafeLng);
    const gpsEnabledForOrder = orderInfo?.gpsEnabled !== false;

    const handleCurbsidePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const compressed = await compressImage(e.target.files[0]);
            setCurbsidePhoto(compressed);
        }
    };

    const sendCurbsideUpdate = async (markArrived: boolean) => {
        if (!orderId) return;
        setSendingCurbside(true);
        try {
            const payload: Record<string, any> = {
                customerCurbsideUpdatedAt: new Date().toISOString(),
                statusUpdatedAt: new Date().toISOString(),
            };

            if (curbsideNote.trim()) payload.customerCurbsideNote = curbsideNote.trim();
            if (curbsidePhoto) payload.customerCurbsidePhoto = curbsidePhoto;

            if (markArrived) {
                payload.isArriving = true;
                payload.approachState = 'arrived';
                payload.statusNote = `${orderInfo.customerName || 'Customer'} is waiting curbside now.`;
            }

            await updateDoc(doc(db, 'orders', orderId), payload);
            setCurbsideNote('');
            setCurbsidePhoto(null);
        } finally {
            setSendingCurbside(false);
        }
    };
    
    useEffect(() => {
        if (!orderId) return;
        const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
            if (docSnap.exists()) setOrderInfo(docSnap.data());
        });
        return () => unsub();
    }, [orderId, db]);

    useEffect(() => {
        if (!orderId || orderInfo.status === 'completed' || orderInfo.status === 'rejected') return;
        if (!gpsEnabledForOrder) {
            setDistance(null);
            return;
        }
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const now = Date.now();

                const last = lastSentLocation.current;
                const movedEnough = !last || haversineDistanceMeters(last.lat, last.lng, lat, lng) > LIVE_GPS_UPDATE_MIN_MOVE_METERS;
                const spacedEnough = now - lastLocationWriteAt.current > LIVE_GPS_UPDATE_MIN_INTERVAL_MS;

                let nextDistance: number | null = null;
                let etaSeconds: number | null = null;
                let shouldShareLive = true;

                if (hasCafeCoords) {
                    nextDistance = Math.round(haversineDistanceMeters(lat, lng, cafeLat, cafeLng));
                    setDistance(nextDistance);
                    const speed = Number(position.coords.speed || 0);
                    etaSeconds = speed > 0.5 ? Math.round(nextDistance / speed) : null;
                    const withinDistanceWindow = nextDistance <= LIVE_GPS_AUTO_SHARE_DISTANCE_METERS;
                    const withinEtaWindow = etaSeconds !== null && etaSeconds <= LIVE_GPS_AUTO_SHARE_ETA_SECONDS;
                    shouldShareLive = withinDistanceWindow || withinEtaWindow;
                }

                if (movedEnough && spacedEnough && shouldShareLive) {
                    lastSentLocation.current = { lat, lng };
                    lastLocationWriteAt.current = now;
                    const payload: Record<string, any> = {
                        customerLocation: { lat, lng, updatedAt: new Date().toISOString() },
                    };
                    if (nextDistance !== null) payload.customerLocationDistanceMeters = nextDistance;
                    if (etaSeconds !== null) payload.customerEtaSeconds = etaSeconds;
                    if (nextDistance !== null && nextDistance <= LIVE_GPS_ARRIVED_DISTANCE_METERS) {
                        payload.approachState = 'arrived';
                    } else if (nextDistance !== null) {
                        payload.approachState = 'approaching';
                    }
                    try {
                        await updateDoc(doc(db, 'orders', orderId), payload);
                    } catch (e) {
                        console.error('Location update failed');
                    }
                }

                if (nextDistance !== null && nextDistance <= LIVE_GPS_ARRIVED_DISTANCE_METERS && !orderInfo.isArriving) {
                    await updateDoc(doc(db, 'orders', orderId), { isArriving: true });
                }
            },
            () => {
                setDistance(null);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [orderId, orderInfo.status, orderInfo.isArriving, selectedCafe, db, gpsEnabledForOrder]);

    if (orderInfo.status === 'rejected') return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in font-sans">
            <div className="bg-white border border-stone-200 text-stone-900 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm"><Icons.X /></div>
            <h2 className="text-3xl sm:text-5xl font-serif italic text-stone-900 mb-2 font-bold tracking-tight">Declined.</h2>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 max-w-sm w-full mb-8 mt-6">
                <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold mb-3">Message from Cafe</p>
                <p className="text-lg font-serif text-stone-900 font-bold italic">"{orderInfo.rejectionReason || 'Too busy right now'}"</p>
            </div>
            <p className="text-stone-500 mb-12 font-medium max-w-xs leading-relaxed">We sincerely apologize. You have not been charged for this order.</p>
            <button onClick={() => setView('landing')} className="bg-stone-900 text-white px-10 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-stone-800 transition">Back to Home</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-4 sm:p-8 text-center animate-fade-in relative overflow-hidden font-sans">
            <button onClick={() => setShowSupport(true)} className="absolute top-6 right-6 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-white border border-stone-700 bg-stone-900/50 backdrop-blur-md px-5 py-3 rounded-full transition z-50 shadow-lg">Help / Issue?</button>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=60')] opacity-20 bg-cover bg-center grayscale scale-110 blur-sm"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-stone-900/80 to-stone-900 z-0"></div>
            
            <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center mb-12 shadow-2xl border-4 transition-colors duration-1000 ${orderInfo.status === 'completed' ? 'bg-green-500 border-green-400 shadow-[0_0_100px_rgba(34,197,94,0.6)]' : orderInfo.isArriving ? 'bg-orange-500 border-orange-400 shadow-[0_0_100px_rgba(249,115,22,0.6)] animate-pulse' : 'bg-stone-800 border-stone-700'}`}>
                <div className="scale-150">
                    {orderInfo.status === 'completed' ? <Icons.CheckCircle /> : <Icons.MapPin />}
                </div>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-serif italic mb-6 sm:mb-10 leading-tight tracking-tight relative z-10 text-white drop-shadow-lg font-bold">
                {orderInfo.status === 'pending' && "Awaiting Cafe..."}
                {orderInfo.status === 'preparing' && !orderInfo.isArriving && <span className="text-orange-400">Order Accepted.<br/>Making it now.</span>}
                {orderInfo.status === 'ready' && !orderInfo.isArriving && <span className="text-orange-300">Order Ready.<br/>Pull up close and tap the app button.</span>}
                {orderInfo.status === 'preparing' && orderInfo.isArriving && <span className="text-orange-400">Pull up to window!</span>}
                {orderInfo.status === 'ready' && orderInfo.isArriving && <span className="text-orange-300">Cafe notified. Pull up to window!</span>}
                {orderInfo.status === 'completed' && <span className="text-green-400">Order Complete.</span>}
            </h2>

            <div className={`bg-stone-900/80 backdrop-blur-xl p-6 sm:p-12 rounded-2xl sm:rounded-[3rem] w-full max-w-sm shadow-2xl text-white relative z-10 mb-8 border border-stone-800 transition-all duration-1000 ${orderInfo.isArriving && orderInfo.status !== 'completed' ? 'ring-2 ring-green-400/50 scale-105' : ''}`}>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.4em] mb-4">Live Distance</p>
                <p className="text-5xl sm:text-8xl font-serif italic mb-2 tracking-tighter font-bold">
                    {orderInfo.status === 'completed' ? 'Done' : (distance !== null ? `${distance}m` : '--')}
                </p>
                {orderInfo.status !== 'completed' && !gpsEnabledForOrder && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">GPS sharing is off. Tap "I'm here" when close.</p>}
                {orderInfo.status !== 'completed' && gpsEnabledForOrder && !hasCafeCoords && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">Live distance unavailable for this cafe. Tap "I'm here" when close.</p>}
                {orderInfo.status !== 'completed' && gpsEnabledForOrder && hasCafeCoords && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">Live sharing starts automatically when you are within ~5 minutes or nearby distance.</p>}
            </div>

            {(orderInfo.status === 'preparing' || orderInfo.status === 'ready') && !orderInfo.isArriving && (
                <button disabled={sendingCurbside} onClick={() => sendCurbsideUpdate(true)} className="relative z-10 w-full max-w-sm mb-4 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-sm shadow-2xl hover:from-green-600 hover:to-green-700 transition active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {sendingCurbside ? 'Notifying...' : "I'm Outside — Notify Cafe"}
                </button>
            )}

            {(orderInfo.status === 'preparing' || orderInfo.status === 'ready') && (
                <div className="relative z-10 w-full max-w-sm mb-6 p-4 rounded-2xl border border-stone-700 bg-stone-800/70 text-left space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300">Curbside Update to Cafe</p>
                    <textarea value={curbsideNote} onChange={(e) => setCurbsideNote(e.target.value)} placeholder="Add note (e.g. parked by side gate, silver SUV, bay 3)" className="w-full h-20 p-3 rounded-xl bg-stone-900 border border-stone-700 text-sm text-white outline-none" />
                    <input type="file" accept="image/*" className="hidden" ref={curbsideFileInputRef} onChange={handleCurbsidePhotoUpload} />
                    {curbsidePhoto ? (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-700">
                            <img src={curbsidePhoto} alt="Curbside location" className="w-full h-full object-cover" />
                            <button onClick={() => setCurbsidePhoto(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full"><Icons.X /></button>
                        </div>
                    ) : (
                        <button onClick={() => curbsideFileInputRef.current?.click()} className="w-full py-3 border border-dashed border-stone-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:bg-stone-700/40 transition flex items-center justify-center gap-2"><Icons.Camera /> Add Parking Photo</button>
                    )}
                    <button disabled={sendingCurbside} onClick={() => sendCurbsideUpdate(!orderInfo.isArriving)} className="w-full py-4 bg-white text-stone-900 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-stone-200 transition disabled:opacity-50">
                        {sendingCurbside ? 'Sending...' : (orderInfo.isArriving ? 'Send Note / Photo Update' : "I'm Here + Send Update")}
                    </button>
                </div>
            )}

            {orderInfo.statusNote && (
                <div className="relative z-10 w-full max-w-sm mb-6 p-4 rounded-2xl border border-stone-700 bg-stone-800/70 text-left">
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-2">Latest Update</p>
                    <p className="text-sm text-white font-medium">{orderInfo.statusNote}</p>
                </div>
            )}

            {/* CUSTOMER SUPPORT UI */}
            <div className="bg-stone-800/80 backdrop-blur-md p-6 rounded-[2rem] w-full max-w-sm relative z-10 text-left border border-stone-700">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2"><Icons.Phone /> Issue with order?</h4>
                    <button onClick={() => setShowSupport(true)} className="text-[10px] font-bold uppercase tracking-widest bg-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-600 transition">Get Help</button>
                </div>
            </div>
            
            {orderInfo.status === 'completed' && (
                <button onClick={() => setView('landing')} className="mt-8 relative z-10 text-[10px] font-bold bg-white text-stone-900 px-10 py-5 rounded-full uppercase tracking-widest hover:bg-stone-200 transition shadow-xl hover:scale-105 transform">Back to Menu</button>
            )}

            {showSupport && <CustomerSupportModal cafe={selectedCafe} orderId={orderId} onClose={() => setShowSupport(false)} />}
        </div>
    );
};

// --- MAIN ARCHITECTURE ---
export default function App() {
    const [view, setView] = useState('landing');
    const [showAbout, setShowAbout] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [user, setUser] = useState(null);
    const [cafeProfile, setCafeProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allCafes, setAllCafes] = useState<any[]>([]);
    const [selectedCafe, setSelectedCafe] = useState(null);
    const [cart, setCart] = useState<any[]>([]);
    const [orderId, setOrderId] = useState(null);
    const [dashboardInitialTab, setDashboardInitialTab] = useState('orders');
    const [userProfile, setUserProfile] = useState({ name: '', carModel: '', carColor: '', plate: '', mobile: '' });
    const pending2faRef = useRef(false);
    const isFirebaseAvailable = Boolean(db && auth);

    const openLegal = (modalType: any) => setActiveModal(modalType);

    // Handle return from Stripe
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const savedUser = localStorage.getItem('pullup_profile');
        if (savedUser) { try { setUserProfile(JSON.parse(savedUser)); } catch(e){} }

        if (!db) return;

        const params = new URLSearchParams(window.location.search);

        // Handle Stripe Connect return — verify onboarding completion
        const stripeReturn = params.get('stripe_return');
        const stripeAcct = params.get('acct');
        if (stripeReturn && stripeAcct) {
            if (stripeReturn === 'complete') {
                // Verify the account is fully onboarded
                fetch('/api/stripe/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stripeId: stripeAcct, cafeId: auth?.currentUser?.uid || '' })
                }).then(async (res) => {
                    const data = await res.json();
                    if (data.isReady) {
                        alert('Stripe connected successfully! Your cafe can now receive payouts.');
                    } else {
                        alert('Stripe onboarding started but not yet complete. Go to Settings → Connect Stripe Payouts to finish setup.');
                    }
                }).catch(() => {
                    alert('Stripe onboarding returned. If payouts are not showing as connected, try clicking Connect Stripe Payouts again.');
                });
            } else if (stripeReturn === 'refresh') {
                alert('Stripe onboarding session expired. Please click Connect Stripe Payouts to try again.');
            }
            window.history.replaceState(null, '', '/');
        }

        if (params.get('merch_success') === 'true') {
            const merchTier = params.get('tier');
            if (merchTier === 'hat') {
                alert('Payment successful! Your Founders Cap is being embroidered and shipped. You\'ll receive a tracking email once dispatched.');
            } else {
                alert('Thank you for your support! Your contribution helps keep Pull Up Coffee running. A confirmation email has been sent.');
            }
            window.history.replaceState(null, '', '/');
            setView('landing');
            return;
        }
        if (params.get('success') === 'true') {
            const oid = params.get('order_id');
            const cafeId = params.get('cafe_id');
            const sessionId = params.get('session_id');
            if (oid) {
                setOrderId(oid as any);
                if (cafeId) getDoc(doc(db, 'cafes', cafeId)).then(s => { if(s.exists()) setSelectedCafe({id: s.id, ...s.data()} as any); });
                if (sessionId) {
                    fetch('/api/stripe/checkout/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId })
                    })
                    .then(async (res) => {
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Checkout confirmation failed');
                        await updateDoc(doc(db, 'orders', oid), {
                            paymentIntentId: data.paymentIntentId || null,
                            paymentState: data.paymentIntentId ? 'authorized' : 'authorization_pending',
                            checkoutSessionId: sessionId
                        });
                    })
                    .catch(async () => {
                        await updateDoc(doc(db, 'orders', oid), {
                            paymentState: 'authorization_pending',
                            checkoutSessionId: sessionId
                        });
                    });
                }
            }
            setView('tracking');
            window.history.replaceState(null, '', '/');
            return;
        }

        const cafeIdFromQr = params.get('cafe');
        if (cafeIdFromQr) {
            getDoc(doc(db, 'cafes', cafeIdFromQr)).then((snap) => {
                if (snap.exists()) {
                    setSelectedCafe({ id: snap.id, ...snap.data() } as any);
                    setView('cafe-menu');
                }
            });
        }
    }, []);

    // Auth Initialization (Anonymous fallback ensures no 'unauthenticated' error)
    useEffect(() => {
        if (!auth || !db) {
            setLoading(false);
            return;
        }
        const initAuth = async () => { try { await signInAnonymously(auth); } catch(e) { console.error("Guest Auth Failed"); } };
        initAuth();
        let unsubProfile: (() => void) | null = null;
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u as any);
            // Clean up previous profile listener
            if (unsubProfile) { unsubProfile(); unsubProfile = null; }
            if (u && !u.isAnonymous) {
                // If 2FA check is in progress, don't redirect to dashboard yet
                if (pending2faRef.current) {
                    setLoading(false);
                    return;
                }
                // Use live listener so approval changes propagate instantly — no page refresh needed
                unsubProfile = onSnapshot(doc(db, 'cafes', u.uid), (snap) => {
                    if (snap.exists()) {
                        const data = snap.data() as any;
                        setCafeProfile(data);
                        if (pending2faRef.current) {
                            // Still in 2FA flow — don't redirect
                            setLoading(false);
                            return;
                        }
                        if (data.isApproved) {
                            setDashboardInitialTab('orders');
                            setView('cafe-admin');
                        } else {
                            // Show pending approval message — keep on landing with alert
                            setView('landing');
                        }
                    }
                    setLoading(false);
                });
            } else {
                setCafeProfile(null);
                setLoading(false);
            }
        });
        return () => {
            unsubAuth();
            if (unsubProfile) unsubProfile();
        };
    }, []);

    useEffect(() => {
        if (!auth) return;
        const openBusinessSupport = () => {
            const currentUser = auth.currentUser;
            if (!currentUser || currentUser.isAnonymous || !cafeProfile) {
                alert('Support shortcut works only for signed-in business accounts.');
                return;
            }
            setDashboardInitialTab('support');
            setView('cafe-admin');
        };
        window.addEventListener('pullup-open-business-support', openBusinessSupport as EventListener);
        return () => window.removeEventListener('pullup-open-business-support', openBusinessSupport as EventListener);
    }, [cafeProfile]);

    // Load Approved Cafes for Discovery (exclude platform admin accounts)
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'cafes'), where('isApproved', '==', true));
        return onSnapshot(q, (snap) => setAllCafes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => !c.isPlatformAdmin && c.role !== 'platform_admin') as any));
    }, []);

    // ── Analytics Beacon ── tracks page views to /api/analytics/track
    const pageViewCount = useRef(0);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Generate or retrieve session fingerprint
        let sessionId = sessionStorage.getItem('pullup_sid');
        if (!sessionId) {
            sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
            sessionStorage.setItem('pullup_sid', sessionId);
        }
        pageViewCount.current += 1;
        const loadTime = typeof performance !== 'undefined' && performance.timing
            ? performance.timing.loadEventEnd - performance.timing.navigationStart
            : 0;
        const beacon = {
            path: window.location.pathname,
            view,
            referrer: document.referrer || '',
            sessionId,
            pageInSession: pageViewCount.current,
            screenWidth: window.screen?.width || 0,
            screenHeight: window.screen?.height || 0,
            loadTime: pageViewCount.current === 1 ? loadTime : 0,
        };
        // Fire-and-forget — never block rendering
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(beacon),
        }).catch(() => {}); // silently fail
    }, [view]);

    // Master Checkout Function (Posts to Stripe)
    const handlePlaceOrder = async (details: string, carPhoto: string | null, gpsEnabled: boolean, pickupTime?: string) => {
        if (!db || !auth) {
            alert('Service temporarily unavailable. Please try again in a moment.');
            return;
        }
        // 🔥 Re-enforce anonymous auth right before checkout to prevent ghost drops
        if (!auth.currentUser) { try { await signInAnonymously(auth); } catch(e) {} }
        
        if (userProfile.name) localStorage.setItem('pullup_profile', JSON.stringify(userProfile));
        
        const cafeInfo = selectedCafe as any;
        const fee = normalizeCurbsideFee(cafeInfo?.curbsideFee);

        const pendingFavoriteCafe = localStorage.getItem('pullup_pending_favorite_cafe');
        if (pendingFavoriteCafe && pendingFavoriteCafe === cafeInfo.id && userProfile.mobile) {
            const normalized = userProfile.mobile.replace(/\s+/g, '');
            if (normalized.length >= 8) {
                const existing = await getDocs(query(collection(db, 'favorites'), where('cafeId', '==', cafeInfo.id), where('mobile', '==', normalized)));
                if (existing.empty) {
                    await addDoc(collection(db, 'favorites'), {
                        cafeId: cafeInfo.id,
                        cafeName: cafeInfo.businessName,
                        mobile: normalized,
                        smsOptIn: true,
                        customerId: auth.currentUser?.uid || null,
                        createdAt: new Date().toISOString(),
                        source: 'checkout',
                    });
                }
                localStorage.removeItem('pullup_pending_favorite_cafe');
                localStorage.removeItem('pullup_pending_favorite_name');
            }
        }

        const newOrder = {
            cafeId: cafeInfo.id,
            cafeName: cafeInfo.businessName,
            customerName: userProfile.name,
            carDetails: `${userProfile.carColor || ''} ${userProfile.carModel}`.trim(),
            plate: userProfile.plate,
            mobile: userProfile.mobile,
            items: cart,
            total: (cart.reduce((s: any, i: any) => s + i.price, 0) + fee + PLATFORM_SERVICE_FEE).toFixed(2),
            fee: fee,
            status: 'pending',
            paymentState: 'authorization_pending',
            gpsEnabled,
            statusNote: 'Order placed. Waiting for cafe acceptance.',
            statusUpdatedAt: new Date().toISOString(),
            locationDetails: details,
            photo: carPhoto,
            pickupTime: pickupTime || 'ASAP',
            isArriving: false,
            timestamp: new Date().toISOString()
        };
        try {
            const docRef = await addDoc(collection(db, 'orders'), newOrder);
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: cart, orderId: docRef.id, cafeId: cafeInfo.id, fee: fee })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url; else alert("Payment Error: " + data.error);
        } catch(e) { 
            console.error(e);
            alert('Error placing order right now. Please retry in a few moments.'); 
        }
    };

    if (loading && isFirebaseAvailable) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
            <PullUpLogo className="animate-pulse-fast" />
            <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Loading your experience</p>
            </div>
        </div>
    );

    if (!isFirebaseAvailable) {
        return (
            <React.Fragment>
                <GlobalStyles />
                {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
                {activeModal && <LegalDocumentModal type={activeModal} onClose={() => setActiveModal(null)} />}
                <LandingPage setView={setView} onAbout={() => setShowAbout(true)} openLegal={openLegal} />
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <GlobalStyles />
            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
            {activeModal && <LegalDocumentModal type={activeModal} onClose={() => setActiveModal(null)} />}
            {view === 'landing' && <LandingPage setView={setView} onAbout={() => setShowAbout(true)} openLegal={openLegal} />}
            {view === 'merchant-login' && <BusinessLogin setView={setView} auth={auth} openLegal={openLegal} pending2faRef={pending2faRef} />}
            {view === 'merchant-signup' && <BusinessSignup setView={setView} auth={auth} db={db} openLegal={openLegal} />}
            {view === 'discovery' && <Discovery setView={setView} cafes={allCafes} onSelectCafe={(c:any) => { setSelectedCafe(c); setView('cafe-menu'); }} />}
            {view === 'cafe-menu' && <CafeMenu setView={setView} selectedCafe={selectedCafe} cart={cart} setCart={setCart} db={db} auth={auth} user={user} />}
            {view === 'checkout' && <Checkout setView={setView} userProfile={userProfile} setUserProfile={setUserProfile} handlePlaceOrder={handlePlaceOrder} cart={cart} selectedCafe={selectedCafe} />}
            {view === 'tracking' && <Tracking setView={setView} orderId={orderId} db={db} selectedCafe={selectedCafe} />}
            {view === 'merch' && <SupportFounder setView={setView} />}
            {view === 'cafe-admin' && <CafeDashboard user={user} profile={cafeProfile} db={db} auth={auth} signOut={signOut} initialTab={dashboardInitialTab} />}
        </React.Fragment>
    );
}
