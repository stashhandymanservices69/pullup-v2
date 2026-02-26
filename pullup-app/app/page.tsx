"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities */

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously, sendPasswordResetEmail } from 'firebase/auth';

// --- SECURE CONFIGURATION ---
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
    <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fafaf9; color: #1c1917; -webkit-tap-highlight-color: transparent; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pulse-fast { animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .shadow-premium { box-shadow: 0 20px 50px rgba(0,0,0,0.05); }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #f97316; cursor: pointer; margin-top: -6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #e7e5e4; border-radius: 2px; }
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

// --- SMS ENGINE (Twilio Hook) ---
const sendSMS = async (mobile: string, message: string) => {
    if (!mobile) return;
    try {
        await fetch('/api/twilio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: mobile, message: message })
        });
    } catch (e) { console.error("SMS Hook failed - check backend API"); }
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

const MIN_CURBSIDE_FEE = 2.0;
const EARLY_ADOPTER_CAFE_LIMIT = 33;
const LIVE_GPS_AUTO_SHARE_DISTANCE_METERS = 2500;
const LIVE_GPS_AUTO_SHARE_ETA_SECONDS = 300;
const LIVE_GPS_ARRIVED_DISTANCE_METERS = 80;
const LIVE_GPS_UPDATE_MIN_MOVE_METERS = 15;
const LIVE_GPS_UPDATE_MIN_INTERVAL_MS = 12000;

const normalizeCurbsideFee = (value: unknown) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return MIN_CURBSIDE_FEE;
    return Math.max(MIN_CURBSIDE_FEE, Number(numericValue.toFixed(2)));
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
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
            <div className="md:w-5/12 bg-stone-900 flex flex-col items-center justify-center p-10 text-center border-r border-stone-800">
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
            <div className="md:w-7/12 p-10 relative overflow-y-auto">
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
        <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif font-bold text-2xl text-stone-900 italic">Terms of Service</h3>
                <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
            </div>
            <div className="text-sm text-stone-600 leading-relaxed space-y-5">
                <p><strong>1. Platform Role:</strong> Pull Up Coffee Pty Ltd acts strictly as a technology and payment agent connecting users with independent cafes. We do not prepare food or beverages.</p>
                <p><strong>2. Safety & Liability:</strong> Liability for food safety, allergen management, and temperature rests entirely with the Cafe partner. Pull Up Coffee accepts no liability for goods consumed.</p>
                <p><strong>3. Traffic Compliance:</strong> Users must be legally and safely parked at the curb to receive an order. Pull Up Coffee is not liable for any traffic infringements or accidents. Do not interact with this app while driving.</p>
                <p><strong>4. Refunds:</strong> Refunds are handled at the discretion of the specific cafe. Customers must arrive within the agreed 10-minute grace period or risk order forfeiture without refund.</p>
                <p><strong>5. Privacy:</strong> We collect essential data (Name, Plate, Vehicle) solely to facilitate active curbside delivery. Data is encrypted and managed according to the Privacy Act 1988 (Cth).</p>
            </div>
            <button onClick={onClose} className="w-full mt-8 bg-stone-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-stone-800 transition">Acknowledge & Agree</button>
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
                <p className="text-sm font-bold text-stone-900 pt-3 border-t border-stone-200 flex items-center gap-2"><Icons.Phone /> {cafe?.phone || 'No phone provided'}</p>
                <p className="text-[10px] text-stone-400 font-mono mt-3 uppercase tracking-widest">Order Ref: {orderId}</p>
            </div>
            
            {cafe?.phone && <a href={`tel:${cafe?.phone}`} className="flex justify-center items-center gap-2 w-full py-4 bg-stone-900 text-white font-bold rounded-xl shadow-lg hover:bg-stone-800 transition uppercase tracking-widest text-[10px]">Call Cafe Now</a>}
            <p className="text-[10px] text-stone-400 mt-6 leading-relaxed">If the cafe is unresponsive or you require technical platform support, email <a href="mailto:hello@pullupcoffee.com.au" className="text-orange-500 underline">hello@pullupcoffee.com.au</a></p>
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

// --- COMPREHENSIVE LEGAL MODAL ---
const LegalDocumentModal = ({ type, onClose }: any) => {
    const [activeTab, setActiveTab] = useState('terms');
    const hasSignedInBusinessAccount = Boolean(auth.currentUser && !auth.currentUser.isAnonymous);

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
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Consumer Terms of Service</h4>
                            <p className="text-xs mb-3"><strong>1. Platform Role:</strong> Pull Up Coffee Pty Ltd acts strictly as a technology and payment facilitator connecting users with independent cafés. We do not prepare, store, or deliver food or beverages. The merchant is the sole supplier.</p>
                            <p className="text-xs mb-3"><strong>2. Merchant Responsibility:</strong> All food and beverage quality, safety, allergen management, and compliance with food handling standards remains the sole responsibility of the Café partner.</p>
                            <p className="text-xs mb-3"><strong>3. Consumer Guarantees:</strong> All goods must be of acceptable quality and match their description. Pull Up Coffee accepts no liability for food-borne illness, allergen reactions, or product defects. These fall entirely under the Café's liability.</p>
                            <p className="text-xs mb-3"><strong>4. Refunds & Chargebacks:</strong> Refund eligibility is determined by the individual Café partner. Customers must arrive within the agreed grace period or risk order forfeiture. The platform reserves the right to process payment reversals and chargebacks as permitted by law.</p>
                            <p className="text-xs mb-3"><strong>5. Traffic Compliance:</strong> All orders must be picked up from a legally parked vehicle. Do not interact with this app while driving. Pull Up Coffee accepts no liability for traffic infringements, accidents, or parking violations.</p>
                            <p className="text-xs mb-3"><strong>6. Liability & Safety Framework:</strong> Pull Up Coffee is a software platform and does not prepare, handle, or deliver beverages. The cafe is responsible for safe preparation, temperature, and secure lids. Customers are responsible for safe handling and placement in a stationary vehicle. Pull Up Coffee is only liable if a platform instruction directly causes harm.</p>
                            <p className="text-xs mb-3"><strong>7. Incident Protocol:</strong> Any spill or burn claim is handled by the cafe's public and product liability insurance. Pull Up order logs provide time/location evidence of handoff.</p>
                            <p className="text-xs mb-3"><strong>8. Prevention Standards:</strong> Cafes must use secure lids and are strongly advised to double-cup hot beverages. Baristas must only hand beverages to stationary vehicles.</p>
                            <p className="text-xs mb-3"><strong>9. Data Privacy:</strong> Location data (precise GPS coordinates) is collected solely to enable curbside handoff and merchant notification. Data is encrypted and deleted upon order completion, per Privacy Act 1988 (Cth) compliance.</p>
                            <p className="text-xs"><strong>10. User Conduct:</strong> Users must not submit fraudulent orders, abuse platform infrastructure, or engage in unsafe driving. Violation results in account termination.</p>
                        </div>
                        <div className="border-t border-stone-200 pt-4">
                            <h4 className="font-bold text-stone-900 mb-2">Merchant Partner Agreement (Summary)</h4>
                            <p className="text-xs mb-3"><strong>1. Commission Structure:</strong> Pull Up Coffee charges a negotiated service fee per transaction, deducted directly from merchant payouts on a weekly settlement cycle.</p>
                            <p className="text-xs mb-3"><strong>2. Indemnification:</strong> Merchants agree to indemnify and hold harmless Pull Up Coffee from all claims arising from food safety, intellectual property infringement, parking violations, pedestrian injuries, or traffic breaches.</p>
                            <p className="text-xs mb-3"><strong>3. Curbside Compliance:</strong> Merchants assume sole responsibility for compliance with local council zoning laws, traffic management plans, and pedestrian safety regulations. Pull Up Coffee assumes zero liability for illegal loading zones or traffic obstructions.</p>
                            <p className="text-xs mb-3"><strong>4. Insurance Requirement:</strong> Merchants must maintain current Public and Product Liability Insurance covering curbside handoff risks.</p>
                            <p className="text-xs"><strong>5. PCI-DSS Compliance:</strong> Merchants must handle all customer data in strict compliance with Payment Card Industry Data Security Standards (PCI DSS). No unauthorized local storage or extraction of personal information is permitted.</p>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Privacy Policy</h4>
                            <p className="text-xs mb-3"><strong>1. Data Collection:</strong> Pull Up Coffee collects: (a) Location data (precise GPS coordinates) solely to facilitate curbside order preparation and handoff; (b) Customer profile data (Name, Vehicle Details, Mobile Number); (c) Transaction and anonymized analytics.</p>
                            <p className="text-xs mb-3"><strong>2. Privacy Act 1988 (Cth) Compliance:</strong> All data handling adheres strictly to the thirteen Australian Privacy Principles (APPs). Users receive clear notification (APP 5) at first download regarding the specific purposes and mechanics of location data collection.</p>
                            <p className="text-xs mb-3"><strong>3. Data Minimization:</strong> We collect only data reasonably necessary for order fulfillment. Location data is automatically purged upon order completion. No retroactive aggregation or sale to third-party data brokers occurs without explicit, informed, secondary consent.</p>
                            <p className="text-xs mb-3"><strong>4. International Data Transfers:</strong> Personal information may be transferred to overseas data centers operated by Amazon Web Services or Google Cloud Platform, primarily located in Australia/Singapore. This disclosure complies with APP 8 cross-border data flow requirements.</p>
                            <p className="text-xs mb-3"><strong>5. Data Security (APP 11):</strong> Pull Up Coffee implements robust cybersecurity infrastructure to protect all personal information from misuse, unauthorized access, loss, and modification. A data breach will be reported to the Office of the Australian Information Commissioner (OAIC) as required by law.</p>
                            <p className="text-xs"><strong>6. User Rights:</strong> You have the right to request access to, correction of, or deletion of personal information held. Submit requests to hello@pullupcoffee.com.au</p>
                        </div>
                    </div>
                );
            case 'cookies':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Cookie Policy</h4>
                            <p className="text-xs mb-3"><strong>1. Cookie Categories:</strong> Pull Up Coffee deploys cookies and tracking technologies segmented as follows:</p>
                            <ul className="text-xs ml-4 space-y-2 mb-3">
                                <li><strong>Essential:</strong> Session cookies required for app functionality, payment processing, and security.</li>
                                <li><strong>Performance:</strong> Analytics cookies (Google Analytics) to measure app usage and error tracking.</li>
                                <li><strong>Functional:</strong> Cookies to remember user preferences and location settings.</li>
                                <li><strong>Targeting:</strong> Advertising and retargeting cookies via Google Ads and Meta, subject to opt-in consent.</li>
                            </ul>
                            <p className="text-xs mb-3"><strong>2. Privacy Act Application:</strong> While Australia lacks a dedicated "Cookie Law," cookie deployment falls under Privacy Act 1988 (Cth) oversight. Cookies that identify individuals are regulated as personal information.</p>
                            <p className="text-xs mb-3"><strong>3. Third-Party & "Fourth-Party" Trackers:</strong> We acknowledge that approximately 72% of deployed cookies are set by non-essential third parties. Our Consent Management Platform allows explicit opt-in/opt-out for all non-essential tracking mechanisms.</p>
                            <p className="text-xs mb-3"><strong>4. User Consent:</strong> Non-essential cookies require explicit user consent via our Consent Management Platform. Essential cookies do not require consent but are clearly disclosed.</p>
                            <p className="text-xs"><strong>5. Transparency:</strong> Users may review, disable, or delete cookies via their device settings at any time. Full transparency with the Office of the Australian Information Commissioner (OAIC) is maintained.</p>
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
                                    <p className="text-xs">Email hello@pullupcoffee.com.au with your name and mobile. Data deletion requests are processed under privacy requirements.</p>
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
                            <h4 className="font-bold text-stone-900 mb-2">Affiliate Bounty: 25% of Platform Fee (First 30 Days)</h4>
                            <p className="text-xs mb-3"><strong>Program Overview:</strong> Earn 25% of the platform fee for the first 30 calendar days of every cafe you onboard. The bounty is paid from our platform margin, never the cafe's share.</p>
                            <p className="text-xs mb-3"><strong>1. Bounty Structure:</strong> Example using a $2 curbside fee: the cafe receives $1.60, the platform retains $0.40, and your bounty is $0.10 per cup (25% of the platform fee).</p>
                            <p className="text-xs mb-3"><strong>2. Bounty Window:</strong> The bounty starts from the cafe's first successful transaction and runs for 30 calendar days. Bounties apply only when a valid affiliate link is used during signup.</p>
                            <p className="text-xs mb-3"><strong>3. Payouts:</strong> Bounty payouts settle monthly to your connected Stripe account.</p>
                            <p className="text-xs mb-3"><strong>4. Sustainable Growth:</strong> After the bounty window ends, Pull Up retains full platform margin to support infrastructure, support, and uptime.</p>
                            <p className="text-xs mb-3"><strong>5. IP Licensing:</strong> Affiliates receive a limited, revocable license to use Pull Up Coffee logos, trademarks, and marketing assets. Unauthorized alteration or predatory Google Ads bidding on our trademarked terms is strictly prohibited.</p>
                            <p className="text-xs mb-3"><strong>6. ACCC Disclosure Requirements:</strong> All affiliate promotions must include clear, conspicuous disclosure: "I earn a commission if you sign up via my link." Disclosure must be immediate, adjacent to the link, and written in plain English.</p>
                            <p className="text-xs mb-3"><strong>7. Spam Act 2003 Compliance:</strong> If you use email or SMS to promote the platform, you must obtain explicit prior consent from recipients and include a functional unsubscribe mechanism in every communication.</p>
                            <p className="text-xs mb-3"><strong>8. Indemnification:</strong> You agree to indemnify Pull Up Coffee against all claims arising from your promotional activities, including making unauthorized or exaggerated claims about the app, breaching privacy laws, or infringing third-party intellectual property.</p>
                            <p className="text-xs border-t border-stone-200 pt-3"><strong>Ready to earn?</strong> Sign up at hello@pullupcoffee.com.au with "Affiliate Interest" in the subject line. Provide your name, contact details, and preferred promotional channels. We'll send you marketing assets and your unique referral link within 24 hours.</p>
                        </div>
                    </div>
                );
            case 'ip':
                return (
                    <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                        <div>
                            <h4 className="font-bold text-stone-900 mb-2">Certificate of Priority, Authorship & Evidence Chain</h4>
                            <p className="text-xs mb-3"><strong>Author:</strong> Steven Weir</p>
                            <p className="text-xs mb-3"><strong>Verification Date:</strong> 16 January 2026 (Australia-Pacific time reference)</p>
                            <p className="text-xs mb-3"><strong>Claim of Original Expression:</strong> This notice asserts ownership of the specific expression, user flow, and implementation logic embodied in the Pull Up Coffee platform. Copyright attaches automatically upon fixation.</p>
                            <p className="text-xs mb-3"><strong>Prior Art Notice:</strong> This document serves as an evidentiary record of conception and proof-of-concept for the platform as of the effective date and any earlier creation timestamps in associated files and repositories.</p>
                            <p className="text-xs mb-3"><strong>Novel Functionality Claimed:</strong> Dynamic curbside fee adjustment, arrival time locking pre-payment, late arrival forfeiture logic, GPS-based curbside notification, and latency management tied to demand.</p>
                            <p className="text-xs mb-3"><strong>Digital Signature Reference:</strong> VERIFIED USER: 4551</p>
                            <p className="text-xs font-mono break-all mb-3"><strong>Cryptographic Timestamp Hash (Reference):</strong> 8f4b2e1a9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f</p>
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                                <p className="text-xs"><strong>Court-Ready Evidence Workflow:</strong> Preserve repository commit history, file hashes, and independent timestamp evidence together.</p>
                                <p className="text-xs"><strong>Verification Steps:</strong> (1) Export relevant commit(s) from Git history, (2) produce SHA-256 file hashes, (3) preserve logs and timestamp attestation records, (4) store immutable copies with legal counsel.</p>
                                <p className="text-xs font-mono break-all"><strong>PowerShell Hash Example:</strong> Get-FileHash -Algorithm SHA256 .\app\page.tsx</p>
                                <p className="text-xs"><strong>Important:</strong> This notice supports evidentiary preparation but is not legal advice. Final admissibility depends on jurisdiction, chain-of-custody, and counsel-led filing practice.</p>
                            </div>
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
                                <a href="mailto:hello@pullupcoffee.com.au" className="text-orange-500 underline font-bold text-xs">hello@pullupcoffee.com.au</a>
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
                <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto p-8">
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
    <div className="flex flex-col min-h-screen bg-stone-900 text-white animate-fade-in relative overflow-hidden font-sans">
        {/* ELEGANT TOP NAVIGATION */}
        <div className="absolute top-6 right-6 z-50">
            <button 
                onClick={() => setView('merchant-auth')} 
                className="group relative bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl hover:scale-105"
            >
                <span className="text-base">☕</span>
                <span className="tracking-wide">For Businesses</span>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-orange-400 group-hover:w-3/4 transition-all duration-300"></div>
            </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=60')] bg-cover bg-center opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/70 via-black/40 to-black/90"></div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <PullUpLogo className="mb-10 w-32 h-32" />
            <h1 className="text-6xl md:text-7xl font-serif italic mb-4 tracking-tight drop-shadow-2xl leading-none inline-flex items-start gap-2">Pull Up Coffee <span className="inline-flex items-center justify-center w-4 h-4 mt-2 rounded-full border border-white/70 text-[8px] not-italic font-bold">TM</span></h1>
            <p className="text-stone-300 mb-14 text-xl max-w-md mx-auto italic font-light">Street parking is now your drive-thru.</p>
            <button onClick={() => setView('discovery')} className="bg-white text-stone-900 py-6 px-16 rounded-[2.5rem] font-bold text-2xl shadow-xl hover:scale-105 transition transform flex items-center gap-4">
                <Icons.Car /> Order Now
            </button>
        </div>

        <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-7">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 pb-6 border-b border-white/10">
                    <div>
                        <h4 className="font-bold text-stone-300 mb-4 text-[10px] uppercase tracking-widest">Platform</h4>
                        <ul className="space-y-3 text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => setView('discovery')} className="hover:text-orange-400 transition">Order Coffee</button></li>
                            <li><button onClick={() => setView('merchant-auth')} className="hover:text-orange-400 transition">Business Login</button></li>
                            <li><button onClick={onAbout} className="hover:text-orange-400 transition">About Vision</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-4 text-[10px] uppercase tracking-widest">Legal</h4>
                        <ul className="space-y-3 text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => openLegal('terms')} className="hover:text-orange-400 transition">Terms of Service</button></li>
                            <li><button onClick={() => openLegal('privacy')} className="hover:text-orange-400 transition">Privacy Policy</button></li>
                            <li><button onClick={() => openLegal('cookies')} className="hover:text-orange-400 transition">Cookie Policy</button></li>
                            <li><button onClick={() => openLegal('ip')} className="hover:text-orange-400 transition">IP Notice</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-4 text-[10px] uppercase tracking-widest">Support</h4>
                        <ul className="space-y-3 text-[10px] text-stone-400 font-medium">
                            <li><button onClick={() => openLegal('faq')} className="hover:text-orange-400 transition">FAQ</button></li>
                            <li><button onClick={() => openLegal('contact')} className="hover:text-orange-400 transition">Contact Us</button></li>
                            <li><button onClick={() => setView('merch')} className="hover:text-orange-400 transition">Merchandise</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-300 mb-4 text-[10px] uppercase tracking-widest">Earn</h4>
                        <ul className="space-y-3 text-[10px] font-medium">
                            <li><button onClick={() => openLegal('affiliate')} className="text-orange-400 hover:text-orange-300 transition font-bold">Affiliate (25% first month)</button></li>
                        </ul>
                    </div>
                </div>
                <div className="text-center text-[10px] text-stone-500">
                    <p>© 2026 Pull Up Coffee Pty Ltd. ABN: 17 587 686 972</p>
                </div>
            </div>
        </footer>
    </div>
);

const CafeAuth = ({ setView, auth, db, openLegal }: any) => {
    const [mode, setMode] = useState('apply');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [bizName, setBizName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [abn, setAbn] = useState('');
    const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [billingEmail, setBillingEmail] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [showExploreMore, setShowExploreMore] = useState(false);
    const [earlyAdopterSpotsLeft, setEarlyAdopterSpotsLeft] = useState<number | null>(null);

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
    
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoadingAuth(true);
        try {
            if (mode === 'apply') {
                if (pass !== confirmPass) {
                    throw new Error('Passwords do not match.');
                }
                const res = await createUserWithEmailAndPassword(auth, email, pass);
                const cafesSnapshot = await getDocs(collection(db, 'cafes'));
                const signupSequence = cafesSnapshot.size + 1;
                const earlyAdopterEligible = signupSequence <= EARLY_ADOPTER_CAFE_LIMIT;
                await setDoc(doc(db, 'cafes', res.user.uid), {
                    businessName: bizName,
                    phone: phone,
                    address: address,
                    email: email,
                    abn: abn,
                    googleBusinessUrl: googleBusinessUrl,
                    businessDescription: businessDescription,
                    billingEmail: billingEmail || email,
                    isApproved: false,
                    status: 'closed',
                    curbsideFee: MIN_CURBSIDE_FEE,
                    globalPricing: { milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 },
                    audioTheme: 'modern',
                    appliedAt: new Date().toISOString(),
                    signupSequence,
                    earlyAdopterEligible,
                    transactionCostModel: earlyAdopterEligible ? 'platform-covers-all-stripe' : 'cafe-covers-stripe-percent',
                    stripePercentRate: earlyAdopterEligible ? 0 : 0.0175,
                });

                for (const item of DEFAULT_MENU_ITEMS) {
                    await addDoc(collection(db, 'cafes', res.user.uid, 'menu'), {
                        ...item,
                        active: true,
                    });
                }
                alert("Application sent! We will notify you once approved.");
                setMode('login');
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err: any) { alert(err.message.replace('Firebase: ','').replace('Error ','')); } 
        finally { setLoadingAuth(false); }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col lg:flex-row animate-fade-in relative text-white font-sans overflow-y-auto">
            <button onClick={() => setView('landing')} className="absolute top-6 left-6 z-30 text-stone-400 hover:text-white font-bold flex items-center gap-2 transition px-4 py-2 hover:bg-white/10 rounded-full backdrop-blur-md text-xs uppercase tracking-widest"><Icons.X /> Back</button>

            {/* LEFT COLUMN: THE B2B PITCH */}
            <div className="hidden lg:flex w-1/2 p-16 flex-col justify-center relative bg-stone-900 border-r border-stone-800 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20 grayscale mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent"></div>
                
                <div className="relative z-10 max-w-lg mx-auto">
                    <PullUpLogo className="w-16 h-16 shadow-[0_0_40px_rgba(249,115,22,0.4)] border-none mb-8" />
                    <h1 className="text-4xl md:text-5xl font-serif italic font-bold text-white mb-6 leading-tight">Turn street parking into your most profitable table.</h1>
                    <p className="text-stone-400 text-lg mb-10 leading-relaxed font-medium">
                        Pull Up Coffee bridges the gap for customers who <em>want</em> your product, but can't easily walk through your door.
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
                                <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-2">The "Beach-to-Cafe" Crowd</h4>
                                <p className="text-stone-400 text-sm leading-relaxed font-medium">Capture impulse buys from customers who are underdressed, in gym gear, or straight from the beach and don't want to walk inside.</p>
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

            {/* RIGHT COLUMN: THE AUTH FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-20 relative z-10 bg-[#0f0f0f]">
                <div className="w-full max-w-md">
                    {/* Back to Home Button */}
                    <div className="text-center mb-6">
                        <button onClick={() => setView('landing')} className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition text-sm">
                            <Icons.X /> Back to Home
                        </button>
                    </div>

                    <div className="lg:hidden text-center mb-10">
                        <PullUpLogo className="w-20 h-20 mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.4)] border-none" />
                        <h1 className="text-3xl font-serif italic font-bold text-white mb-2">Pull Up Partners</h1>
                        <p className="text-stone-400 text-sm">Capture the drive-thru market.</p>
                    </div>

                    <div className="bg-[#1a1a1a] p-10 rounded-[2.5rem] shadow-2xl w-full border border-stone-800/50 hover:border-orange-500/30 transition-colors">
                        <h2 className="text-2xl font-serif italic font-bold mb-1 text-white">{mode === 'apply' ? 'Join Pull Up' : 'Business Login'}</h2>
                        <p className="text-stone-500 text-[10px] uppercase tracking-[0.2em] mb-4 font-bold">{mode === 'apply' ? 'Zero contracts. Zero hardware.' : 'WELCOME BACK'}</p>
                        {mode === 'apply' && (
                            <div className="mb-4 p-3 rounded-xl border border-orange-500/40 bg-orange-500/10">
                                <p className="text-[9px] uppercase tracking-widest font-bold text-orange-300">Early Adopter Incentive</p>
                                <p className="text-xs text-stone-200 mt-1">
                                    {earlyAdopterSpotsLeft === null
                                        ? 'First 33 partner cafes get platform-covered Stripe transaction costs.'
                                        : earlyAdopterSpotsLeft > 0
                                            ? `${earlyAdopterSpotsLeft} of ${EARLY_ADOPTER_CAFE_LIMIT} spots left for platform-covered Stripe transaction costs.`
                                            : `All ${EARLY_ADOPTER_CAFE_LIMIT} early adopter spots are filled. New signups use the standard transaction model.`}
                                </p>
                            </div>
                        )}
                        
                        {mode === 'login' && (
                            <div className="mb-6 p-4 bg-stone-900 border border-stone-700 rounded-xl text-center">
                                <p className="text-stone-400 text-xs mb-3">New business?</p>
                                <button onClick={() => setMode('apply')} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-500 transition">Apply to Join →</button>
                            </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {mode === 'apply' && (
                                <div className="bg-stone-900/50 p-5 rounded-xl border border-stone-700 mb-6">
                                    <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-3 font-bold">📋 Business Information</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Business Name</label>
                                            <input type="text" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Your Cafe" className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">ABN</label>
                                            <input type="text" value={abn} onChange={e => setAbn(e.target.value)} placeholder="12 345 678 901" className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Store Address</label>
                                            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Sydney NSW" className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Phone Number</label>
                                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(02) XXXX XXXX" className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Billing Email (opt)</label>
                                            <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@..." className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">Google Business URL (optional - helps verification)</label>
                                        <input type="url" value={googleBusinessUrl} onChange={e => setGoogleBusinessUrl(e.target.value)} placeholder="https://goo.gl/maps/..." className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm" />
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-2">About Your Business</label>
                                        <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="What do you sell? Expected order volume? Peak hours?" rows={3} className="w-full p-3 bg-[#0f0f0f] border border-stone-800 rounded-xl outline-none focus:border-orange-500 transition text-white text-sm resize-none" required />
                                        <p className="text-[8px] text-stone-500 mt-2 italic">✓ Approval within 1-3 business days</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@cafe.com" className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Password</label>
                                <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" minLength={6} className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                            </div>
                            {mode === 'apply' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Confirm Password</label>
                                    <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" minLength={6} className="w-full p-4 bg-[#0f0f0f] border border-stone-800 rounded-2xl outline-none focus:border-orange-500 transition text-white font-medium" required />
                                </div>
                            )}
                            <button type="submit" disabled={loadingAuth} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold mt-6 hover:bg-orange-500 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                                {loadingAuth ? 'Processing...' : (mode === 'apply' ? 'Submit Application' : 'SIGN IN NOW')}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
                            <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-4">{mode === 'apply' ? 'Already have an account?' : 'Want to expand your market?'}</p>
                            <button onClick={() => setMode(mode === 'apply' ? 'login' : 'apply')} className="text-orange-500 font-bold text-sm uppercase tracking-widest hover:text-orange-400 transition">
                                {mode === 'apply' ? 'Log in here' : '→ APPLY TO JOIN'}
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
                            <button onClick={() => setShowExploreMore((prev) => !prev)} className="w-full flex items-center justify-between text-stone-300 text-[10px] uppercase tracking-widest font-bold bg-[#111111] border border-stone-800 rounded-2xl px-4 py-3 hover:border-stone-700 transition">
                                <span>Explore More</span>
                                <span className={`transition-transform ${showExploreMore ? 'rotate-90' : ''}`}><Icons.ChevronRight /></span>
                            </button>
                            {showExploreMore && (
                                <div className="bg-[#111111] border border-stone-800 rounded-2xl p-4 mt-3 mb-3 space-y-2 text-left">
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Need Help Onboarding?</p>
                                    {ONBOARDING_VIDEOS.map((video) => (
                                        <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-between bg-stone-900 border border-stone-700 hover:border-orange-500 rounded-xl p-3 transition">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{video.label}</span>
                                            <span className="text-orange-500"><Icons.Play /></span>
                                        </a>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-2">
                                <button onClick={() => openLegal('affiliate')} className="block w-full text-orange-400 hover:text-orange-300 font-bold text-[10px] uppercase tracking-widest transition">💰 Affiliate Program (25% first month)</button>
                                <button onClick={() => openLegal('terms')} className="block w-full text-stone-500 hover:text-stone-300 font-medium text-[9px] uppercase tracking-widest transition">Legal Terms</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MerchStore = ({ setView }: any) => {
    const [loading, setLoading] = useState(false);

    const handleBuyHat = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stripe/merch', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert("Checkout Error: " + data.error);
        } catch (e) {
            alert("Network error loading checkout");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col font-sans animate-fade-in text-left">
            <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-100 shadow-sm p-6">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={() => setView('landing')} className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition flex items-center gap-2"><Icons.X /> Back</button>
                    <span className="font-serif italic font-bold text-xl text-stone-900 tracking-tight">Merch Store</span>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center p-6 pb-24">
                <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div className="bg-stone-200 rounded-[3rem] aspect-square flex items-center justify-center p-8 shadow-inner overflow-hidden relative border-4 border-white">
                        <img
                            src="/merch/hat.jpg"
                            alt="Pull Up Coffee Dad Hat"
                            className="w-full h-full object-cover rounded-[2rem] mix-blend-multiply opacity-95"
                            onError={(e: any) => {
                                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%' height='100%' fill='%23e7e5e4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='28'>Add hat image at /public/merch/hat.jpg</text></svg>";
                            }}
                        />
                    </div>
                    <div>
                        <div className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest mb-6 inline-block border border-orange-100 shadow-sm">Classic Dad Hat</div>
                        <h2 className="text-5xl lg:text-6xl font-serif font-bold text-stone-900 italic tracking-tighter leading-none mb-6">Classic Dad Hat.</h2>
                        <p className="text-stone-500 mb-8 text-lg leading-relaxed font-medium">A clean, universal-fit dad hat with premium embroidery. Relaxed, low-profile shape with an adjustable strap.</p>

                        <div className="flex items-end gap-4 mb-8 pb-8 border-b border-stone-200">
                            <span className="text-5xl font-bold text-stone-900 tracking-tight">$45</span>
                            <span className="text-stone-400 mb-2 font-bold uppercase tracking-widest text-[10px]">AUD / +$10 Flat Rate Shipping</span>
                        </div>

                        <ul className="space-y-4 mb-10 text-sm text-stone-700 font-bold">
                            <li className="flex items-center gap-4"><span className="text-orange-500 scale-125"><Icons.CheckCircle /></span> Unstructured, low-profile fit</li>
                            <li className="flex items-center gap-4"><span className="text-orange-500 scale-125"><Icons.CheckCircle /></span> Adjustable strap with antique buckle</li>
                            <li className="flex items-center gap-4"><span className="text-orange-500 scale-125"><Icons.CheckCircle /></span> Made to order with premium embroidery</li>
                        </ul>

                        <button onClick={handleBuyHat} disabled={loading} className="w-full bg-stone-900 text-white py-6 rounded-[2rem] font-bold text-lg shadow-2xl hover:bg-stone-800 transition transform active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest">
                            {loading ? 'Securing Checkout...' : <><Icons.CreditCard /> Buy Now Securely</>}
                        </button>

                        <div className="mt-8 p-5 bg-stone-100 rounded-2xl flex items-start gap-4 border border-stone-200">
                            <div className="text-stone-400 mt-0.5"><Icons.Info /></div>
                            <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                <strong>Support Note:</strong> Thanks for backing Pull Up Coffee. Made on demand and shipped with tracking.
                            </p>
                        </div>
                    </div>
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
    const [businessNameDraft, setBusinessNameDraft] = useState(profile?.businessName || '');
    const [storefrontLogo, setStorefrontLogo] = useState<string | null>(profile?.logo || null);
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
    const isEarlyAdopter = profile?.transactionCostModel === 'platform-covers-all-stripe';
    
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
        const curbsideFeeValue = Number(order?.fee || 2);
        const cafeCurbsideShare = curbsideFeeValue * 0.8;
        const stripePercentCost = (menuRevenue + cafeCurbsideShare) * Number(stripePercentRate || 0);
        const extraRevenue = Math.max(cafeCurbsideShare - stripePercentCost, 0);
        const upliftPct = menuRevenue > 0 ? (extraRevenue / menuRevenue) * 100 : 0;
        return { menuRevenue, curbsideFeeValue, cafeCurbsideShare, stripePercentCost, extraRevenue, upliftPct };
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
            const approachingCount = active.filter((o: any) => o.approachState === 'approaching' || o.isArriving).length;
            setOrders(active);
            setHistory(list.filter((o: any) => o.status === 'completed' || o.status === 'rejected'));
            if (active.length > prevOrderCount.current) { playNotificationSound(audioTheme); }
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

        return () => {
            unsubCafes();
            unsubOrders();
        };
    }, [db, isPlatformAdmin]);

    useEffect(() => {
        botChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            const res = await fetch('/api/stripe/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: profile?.email, businessName: profile?.businessName, cafeId: user?.uid, referralCode: 'SCOUT_001' }) });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert('Error: ' + data.error);
        } catch (err) {
            alert('Network error connecting to Stripe.');
        }
    };

    const sendPasswordReset = async () => {
        if (!profile?.email) {
            alert('No account email found for this cafe profile.');
            return;
        }
        setAccountBusy(true);
        try {
            await sendPasswordResetEmail(auth, profile.email);
            alert(`Password reset email sent to ${profile.email}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unable to send reset email';
            alert(message.replace('Firebase: ', '').replace('Error ', ''));
        } finally {
            setAccountBusy(false);
        }
    };

    const submitBotQuestion = (question: string) => {
        if (!question.trim()) return;
        setBotChat(prev => [...prev, { type: 'user', text: question }]);
        const q = question.toLowerCase();
        setBotInput('');

        setTimeout(() => {
            const knowledgeBase = [
                { id: 'payouts', keywords: ['payout', 'paid', 'bank', 'money', 'stripe', 'transfer', 'settlement'], text: 'Fast answer: go to Payments → Connect Stripe Payouts, then choose daily/weekly/instant. Once connected, payouts go to your nominated bank account automatically.' },
                { id: 'curbside-fee', keywords: ['curbside', 'fee', 'change fee', 'increase fee', 'minimum', 'pricing'], text: 'Fast answer: go to Operations → Dynamic Curbside Fee and use the slider. Minimum is locked at $2.00. You keep 80%, platform keeps 20%.' },
                { id: 'pause-orders', keywords: ['pause', 'offline', 'stop orders', 'busy', 'turn off'], text: 'Fast answer: go to Operations and toggle Accepting Orders to OFFLINE. Customers stop seeing you as available instantly.' },
                { id: 'menu', keywords: ['menu', 'add item', 'first item', 'edit item', 'photo', 'price'], text: 'Fast answer: go to Menu tab. Add one item first, set price, upload photo, then save. You can edit anytime.' },
                { id: 'late-customer', keywords: ['late', 'no show', 'grace', 'forfeit', 'did not arrive'], text: 'Fast answer: customers have a 10-minute grace window. If they are late, you can forfeit at your discretion and follow your refund policy.' },
                { id: 'decline', keywords: ['decline', 'reject', 'cancel order', 'cannot make'], text: 'Fast answer: on a pending order, tap the red X, enter a reason, and submit. Authorization is voided if not captured.' },
                { id: 'delay', keywords: ['delay', 'running late', 'sms', 'message customer', 'notify'], text: 'Fast answer: open a preparing/ready order and tap Notify Delay (SMS). Customer gets an instant update.' },
                { id: 'favorites', keywords: ['favourite', 'favorite', 'heart', 'sms alert', 'opening alert'], text: 'Fast answer: customers can heart your cafe, then confirm mobile at checkout. You can send opted-in opening SMS from Operations.' },
                { id: 'refund', keywords: ['refund', 'chargeback', 'dispute', 'wrong order', 'cold'], text: 'Fast answer: refunds are merchant-managed. Handle case-by-case in your Stripe dashboard and your cafe policy.' },
                { id: 'reporting', keywords: ['history', 'report', 'export', 'tax', 'accounting'], text: 'Fast answer: use History tab filters (daily/weekly/monthly/archive) and Email Report for quick bookkeeping summaries.' },
                { id: 'support', keywords: ['human', 'support', 'ticket', 'help', 'contact', 'broken', 'bug', 'glitch'], text: 'Fast answer: email hello@pullupcoffee.com.au with your Cafe Name, issue, and (if relevant) Order ID. I can also generate a ticket reference now.' },
                { id: 'onboarding', keywords: ['training', 'tutorial', 'video', 'setup'], text: 'Fast answer: open the onboarding videos in this Support tab for the quickest setup and staff training path.' },
            ];

            const match = knowledgeBase.find(topic => topic.keywords.some(k => q.includes(k)));
            let answer = 'Fast answer: ask me in one sentence (example: "How do I get paid?" or "How do I pause orders?"). I will reply with exact clicks.';
            let topicId = 'other';

            if (q.includes('password') || q.includes('token') || q.includes('private key') || q.includes('api key') || q.includes('customer card') || q.includes('secret')) {
                answer = 'I cannot access passwords, tokens, card data, or API keys. Use Account for password reset and Stripe Dashboard for payment credentials.';
                topicId = 'security';
            } else if (match) {
                answer = match.text;
                topicId = match.id;
            }

            if (topicId === 'support' && (q.includes('ticket') || q.includes('human') || q.includes('help'))) {
                const ticketId = Math.floor(100000 + Math.random() * 900000);
                answer += ` Ticket #${ticketId}. Include this in your email for faster triage.`;
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
                    <PullUpLogo className="w-10 h-10 border-none bg-stone-800" />
                    <div><h2 className="text-xl font-serif italic text-white leading-tight">{businessNameDraft || profile?.businessName || 'Cafe Dashboard'}</h2><p className="text-[10px] uppercase text-[#ff5e00] tracking-[0.2em] font-bold">Partner Shop</p></div>
                </div>
                <button onClick={async () => { await signOut(auth); window.location.href = '/'; }} className="text-[10px] uppercase font-bold text-stone-400 hover:text-white transition">LOGOUT</button>
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
                                    <div><h4 className="text-xl font-bold text-stone-900 leading-tight">{o.customerName}</h4><p className="text-xs text-stone-500 font-mono uppercase mt-1 tracking-widest">{o.carDetails} • {o.plate}</p></div>
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
                                                const captureRes = await fetch('/api/stripe/capture', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
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
                                            if (o.mobile) sendSMS(o.mobile, `Pull Up Coffee: ${profile?.businessName || 'Your cafe'} accepted your order and is preparing it now.`);
                                        }} className="flex-1 bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 text-[10px] uppercase tracking-widest shadow-md transition">Accept Order</button>
                                    ) : (
                                        <button onClick={() => updateDoc(doc(db, 'orders', o.id), { status: 'completed' })} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 text-[10px] uppercase tracking-widest shadow-md transition">Complete Order</button>
                                    )}
                                    {o.status === 'pending' && <button onClick={async () => { const r = prompt("Reason for decline?"); if(r) { 
                                        if (o.paymentIntentId) {
                                            const cancelRes = await fetch('/api/stripe/cancel', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
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
                                        if(o.mobile) sendSMS(o.mobile, `Pull Up Coffee: Sorry, ${profile?.businessName} had to decline your order (${r}).`); 
                                    } }} className="px-5 py-4 text-red-500 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition font-bold text-sm"><Icons.X /></button>}
                                </div>
                                {o.status === 'preparing' && <button onClick={async () => {
                                    await updateDoc(doc(db, 'orders', o.id), {
                                        status: 'ready',
                                        statusNote: `${profile?.businessName || 'Cafe'} marked your order ready. Pull up close and tap the app button when parked.`,
                                        statusUpdatedAt: new Date().toISOString()
                                    });
                                    if(o.mobile) sendSMS(o.mobile, `Pull Up Coffee: ${profile?.businessName || 'Your cafe'} says your order is ready. Pull up close and let us know where you are.`);
                                }} className="w-full mt-2 py-3 text-[10px] text-white font-bold uppercase tracking-widest bg-stone-900 rounded-xl hover:bg-stone-800 transition">Mark Ready in App</button>}
                                {(o.status === 'preparing' || o.status === 'ready') && <button onClick={async () => { 
                                    await updateDoc(doc(db, 'orders', o.id), {
                                        statusNote: `${profile?.businessName || 'Cafe'} is running about 5 mins behind.`,
                                        statusUpdatedAt: new Date().toISOString()
                                    });
                                    if(o.mobile) sendSMS(o.mobile, `Pull Up Coffee: ${profile?.businessName} is running about 5 mins behind. Thanks for your patience!`); 
                                    alert("Delay SMS Sent!"); 
                                }} className="w-full mt-2 py-3 text-[10px] text-stone-500 font-bold uppercase tracking-widest border border-stone-200 rounded-xl hover:bg-stone-50 transition">Notify Delay (SMS)</button>}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200">
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
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4 grid grid-cols-3 gap-3 text-center">
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Orders</p><p className="text-xl font-bold text-stone-900">{summary.totalOrders}</p></div>
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Menu Revenue</p><p className="text-xl font-bold text-stone-900">${summary.totalMenu.toFixed(2)}</p></div>
                                <div><p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Extra from Platform</p><p className="text-xl font-bold text-orange-600">${summary.totalExtra.toFixed(2)}</p></div>
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
                                                <p><strong>Curbside Fee:</strong> ${econ.curbsideFeeValue.toFixed(2)} (Cafe share: ${econ.cafeCurbsideShare.toFixed(2)})</p>
                                                <p><strong>Stripe % Cost (est):</strong> -${econ.stripePercentCost.toFixed(2)} at {(Number(stripePercentRate) * 100).toFixed(2)}%</p>
                                                <p><strong>Extra Revenue (Pull Up Platform):</strong> <span className="text-orange-600 font-bold">+${econ.extraRevenue.toFixed(2)}</span></p>
                                                <p className="text-[10px] text-stone-500 italic mt-1">This is your net gain from using Pull Up vs traditional walk-in sales.</p>
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
                    <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm space-y-8">
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
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-8">
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
                                    <input type="range" min={MIN_CURBSIDE_FEE} max="10" step="0.50" value={curbsideFee} onChange={(e) => { const val = normalizeCurbsideFee(e.target.value); setCurbsideFee(val); saveSettings('curbsideFee', val); }} className="w-full accent-orange-500 h-2 bg-stone-300 rounded-lg outline-none cursor-pointer" />
                                </div>
                                <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-stone-700 space-y-2">
                                    <p className="font-bold text-orange-600">{isEarlyAdopter ? '💰 This is Your Cream on Top' : '💰 Curbside Fee Settings'}</p>
                                    <p>The curbside fee is charged to customers for the convenience of curbside service. <strong>Minimum $2.00 required</strong> to protect profitability after platform share.</p>
                                    <p><strong>Fee Split:</strong> You keep 80% of the curbside fee, platform keeps 20%. From platform&apos;s 20%, we cover the 30¢ Stripe fixed fee + all services (hosting, SMS, support, development).</p>
                                    {!isEarlyAdopter && <p><strong>Transaction Model:</strong> Your cafe covers Stripe percentage on cafe revenue. Platform covers fixed 30¢ component.</p>}
                                    <p className="text-[10px] text-stone-500 italic mt-2">💡 Increase during peak hours, lower for promotions. You decide what works for your business.</p>
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
                                <p className="text-sm text-stone-700 leading-relaxed"><strong>Current Rates:</strong> {isEarlyAdopter ? 'As an early adopter, Pull Up currently covers both Stripe fixed and percentage transaction costs for your cafe.' : 'We cover the 30¢ Stripe fixed fee per transaction, plus all platform services, infrastructure, and support. Your cafe covers the Stripe percentage fee (~1.75% + GST) on your revenue portion.'}</p>
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
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Business</p>
                                    <input
                                        type="text"
                                        value={businessNameDraft}
                                        onChange={(e) => setBusinessNameDraft(e.target.value)}
                                        onBlur={async () => {
                                            if (!user?.uid) return;
                                            await updateDoc(doc(db, 'cafes', user.uid), { businessName: businessNameDraft.trim() || profile?.businessName || '' });
                                        }}
                                        className="w-full p-3 mt-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium text-stone-900"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Storefront Logo / Photo</p>
                                    <input type="file" accept="image/*" className="hidden" ref={logoFileInputRef} onChange={async (e) => {
                                        if (!e.target.files?.[0] || !user?.uid) return;
                                        const compressed = await compressImage(e.target.files[0]);
                                        setStorefrontLogo(compressed);
                                        await updateDoc(doc(db, 'cafes', user.uid), { logo: compressed });
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
                                    <p className="text-[9px] text-stone-500 italic">To change your login email, please contact support at hello@pullupcoffee.com.au with your business details.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Billing Email (for invoices)</label>
                                    <input 
                                        type="email" 
                                        value={profile?.billingEmail || profile?.email || ''} 
                                        onChange={async (e) => {
                                            if (user?.uid) {
                                                await updateDoc(doc(db, 'cafes', user.uid), { billingEmail: e.target.value });
                                            }
                                        }}
                                        placeholder="billing@yourcompany.com"
                                        className="w-full p-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-orange-500 transition text-sm font-medium"
                                    />
                                    <p className="text-[9px] text-stone-500 mt-2 italic">All Stripe invoices and payment receipts will be sent here.</p>
                                </div>
                            </div>
                            <button disabled={accountBusy} onClick={sendPasswordReset} className="w-full bg-stone-900 text-white p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition disabled:opacity-50">
                                {accountBusy ? 'Sending Reset...' : 'Send Password Reset Email'}
                            </button>
                            <div className="pt-4 border-t border-stone-100">
                                <p className="text-[9px] text-stone-500 italic text-center">Your settings are automatically saved. For security reasons, login email changes require manual verification.</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 space-y-4">
                            <div>
                                <h3 className="font-bold text-xl text-stone-900 mb-2">Marketing Materials</h3>
                                <p className="text-sm text-stone-500">Download promotional materials for your storefront.</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-stone-50 border-2 border-orange-200 rounded-2xl p-8 text-center">
                                <PullUpLogo className="w-20 h-20 mx-auto mb-4" />
                                <h4 className="font-serif font-bold text-2xl text-stone-900 mb-2">Now Serving<br/>Curbside!</h4>
                                <p className="text-sm text-stone-600 mb-4">Scan to order from your car</p>
                                <div className="bg-white p-4 rounded-xl inline-block shadow-lg mb-4">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://pullupcoffee.com.au?cafe=${user?.uid}`)}`}
                                        alt="QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>
                                <p className="text-xs font-bold text-stone-900 mb-6">{profile?.businessName || 'Your Cafe'}</p>
                                <button 
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                            printWindow.document.write(`
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <title>Pull Up Coffee - ${profile?.businessName || 'Cafe'} Poster</title>
                                                    <style>
                                                        @page { size: A4 portrait; margin: 0; }
                                                        body { margin: 0; padding: 24px; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; background: linear-gradient(135deg, #fff5eb 0%, #fafaf9 100%); box-sizing: border-box; }
                                                        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 60px 40px; background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); border: 3px solid #f97316; box-sizing: border-box; }
                                                        .logo { width: 120px; height: 120px; margin: 0 auto 30px; background: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(249,115,22,0.3); }
                                                        h1 { font-size: 48px; font-weight: 800; color: #1c1917; margin: 20px 0; line-height: 1.2; font-family: 'Georgia', serif; font-style: italic; }
                                                        .tagline { font-size: 24px; color: #57534e; margin: 20px 0 40px; font-weight: 600; }
                                                        .qr-container { background: white; padding: 30px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 2px solid #e7e5e4; }
                                                        .qr-container img { width: 300px; height: 300px; }
                                                        .cafe-name { font-size: 28px; font-weight: 700; color: #f97316; margin: 30px 0 20px; }
                                                        .footer { font-size: 16px; color: #78716c; margin-top: 30px; }
                                                        .powered { font-size: 14px; color: #a8a29e; margin-top: 20px; }
                                                        @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="container">
                                                        <div class="logo">
                                                            <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
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
                                                        <h1>Now Serving<br/>Curbside!</h1>
                                                        <div class="tagline">☕ Order from your car · Drive-thru convenience</div>
                                                        <div class="qr-container">
                                                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://pullupcoffee.com.au?cafe=${user?.uid}`)}" alt="QR Code" />
                                                        </div>
                                                        <div class="cafe-name">${profile?.businessName || 'Your Cafe'}</div>
                                                        <div class="footer">
                                                            <strong>How it works:</strong><br/>
                                                            1. Scan QR code<br/>
                                                            2. Order & pay from your car<br/>
                                                            3. We bring it curbside<br/>
                                                        </div>
                                                        <div class="powered">Powered by Pull Up Coffee™</div>
                                                    </div>
                                                </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                            setTimeout(() => printWindow.print(), 500);
                                        }
                                    }}
                                    className="w-full bg-orange-600 text-white p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 transition"
                                >
                                    🖨️ Print Store Poster (A4)
                                </button>
                                <p className="text-[9px] text-stone-500 mt-3 italic">Display near your entrance or window. Customers scan to order instantly.</p>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'support' && (
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200 flex flex-col h-[600px] relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-6">
                            <div className="bg-stone-100 p-3 rounded-full text-stone-900"><Icons.Robot /></div>
                            <div><h3 className="font-serif font-bold text-xl text-stone-900">Support Engine</h3><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Platform Knowledge Base</p></div>
                        </div>
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Staff Training Videos</p>
                            <a href={ONBOARDING_VIDEOS[0].url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-stone-900">Open</a>
                        </div>
                        <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Weekly Insight Snapshot</p>
                            <div className="space-y-1 text-xs text-stone-600">
                                {Object.entries(supportTopicCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic, count]) => (
                                    <p key={topic}><strong>{topic}</strong>: {count} question(s)</p>
                                ))}
                                {Object.keys(supportTopicCounts).length === 0 && <p>No support questions tracked this week yet.</p>}
                            </div>
                        </div>
                        <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Most Asked (Tap for Fast Answer)</p>
                            <div className="flex flex-wrap gap-2">
                                {quickSupportPrompts.map((prompt) => (
                                    <button key={prompt} onClick={() => submitBotQuestion(prompt)} className="text-[10px] px-3 py-2 border border-stone-200 rounded-full bg-white hover:border-orange-400 hover:text-orange-600 transition font-bold uppercase tracking-widest text-stone-600">
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 text-sm">
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
                        <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl text-stone-900">Master Platform Overview</h3>
                                    <p className="text-xs text-stone-500 mt-1">Live operational snapshot across all cafes and orders.</p>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Updated {platformUpdatedAt ? new Date(platformUpdatedAt).toLocaleTimeString() : '--'}</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cafes Online</p><p className="text-2xl font-bold text-green-600 mt-1">{platformStats.onlineCafes}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Cafes Offline</p><p className="text-2xl font-bold text-stone-900 mt-1">{platformStats.offlineCafes}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Active Orders</p><p className="text-2xl font-bold text-orange-600 mt-1">{platformStats.activeOrders}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Active Users</p><p className="text-2xl font-bold text-stone-900 mt-1">{platformStats.activeCustomers}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Orders Today</p><p className="text-2xl font-bold text-stone-900 mt-1">{platformStats.ordersToday}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Completed</p><p className="text-2xl font-bold text-green-600 mt-1">{platformStats.completedToday}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Gross Today</p><p className="text-2xl font-bold text-stone-900 mt-1">${platformStats.grossToday.toFixed(2)}</p></div>
                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Curbside Fee Flow</p><p className="text-2xl font-bold text-stone-900 mt-1">${platformStats.feeFlowToday.toFixed(2)}</p></div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
                            <h4 className="font-bold text-stone-900 mb-4">Cafe Network Status</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-widest text-stone-500 border-b border-stone-200">
                                            <th className="pb-3 pr-4">Cafe</th>
                                            <th className="pb-3 pr-4">Status</th>
                                            <th className="pb-3 pr-4">Active Orders</th>
                                            <th className="pb-3 pr-4">Payout</th>
                                            <th className="pb-3">Stripe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {platformCafeRows.map((row) => (
                                            <tr key={row.id} className="border-b border-stone-100">
                                                <td className="py-3 pr-4 font-semibold text-stone-900">{row.businessName}</td>
                                                <td className="py-3 pr-4"><span className={`text-[10px] font-bold uppercase tracking-widest ${row.status === 'open' ? 'text-green-600' : 'text-stone-400'}`}>{row.status === 'open' ? 'ONLINE' : 'OFFLINE'}</span></td>
                                                <td className="py-3 pr-4 text-stone-700">{row.activeOrders}</td>
                                                <td className="py-3 pr-4 text-stone-700 uppercase text-[10px] font-bold tracking-widest">{row.payoutPreference}</td>
                                                <td className="py-3 text-[10px] font-bold uppercase tracking-widest"><span className={row.stripeConnected ? 'text-green-600' : 'text-amber-600'}>{row.stripeConnected ? 'CONNECTED' : 'PENDING'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
    const filteredCafes = cafes.filter((c:any) => c.isApproved && (c.businessName?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

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
                    <p className="text-stone-400 text-sm font-medium mb-8">Searching your area</p>

                    <div className="relative mb-8">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400"><Icons.Search /></div>
                        <input type="text" placeholder="Search area or cafe..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-stone-200 rounded-full py-4 pl-14 pr-6 text-stone-900 focus:outline-none focus:border-stone-400 shadow-sm transition font-medium text-center" />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 mb-8 max-w-sm mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2"><Icons.Sliders /> Search Radius</label>
                            <span className="font-bold text-orange-500 text-sm">{searchRadius} km</span>
                        </div>
                        <input type="range" min="1" max="50" value={searchRadius} onChange={(e: any) => setSearchRadius(e.target.value)} className="w-full accent-orange-500 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    
                    <div className="space-y-4 w-full">
                        {filteredCafes.length === 0 ? <div className="text-center py-20 text-stone-400 italic">No partners found in radius.</div> : 
                        filteredCafes.map((c: any) => {
                            const isOpen = c.status === 'open';
                            return (
                                <button key={c.id} onClick={() => onSelectCafe(c)} className={`w-full p-6 bg-white rounded-[2.5rem] border text-left transition-all shadow-sm flex items-center gap-5 relative overflow-hidden group ${isOpen ? 'border-orange-500 hover:shadow-md cursor-pointer' : 'border-stone-200 hover:border-stone-300 cursor-pointer'}`}>
                                    <div onClick={(event) => handleFavoriteCafe(event, c)} className="absolute top-6 right-6 text-stone-300 hover:text-red-500 transition z-10" title="Save Favourite & SMS"><Icons.Heart /></div>
                                    <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center text-stone-400">
                                    {c.logo ? <img src={c.logo} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                                    </div>
                                    <div className="flex-1 pr-8">
                                        <h3 className="font-bold text-xl text-stone-900 tracking-tight leading-none mb-1">{c.businessName}</h3>
                                        <p className="text-stone-500 text-[10px] uppercase tracking-widest font-medium truncate">{c.address}</p>
                                        {isOpen ? 
                                            <div className="mt-3 text-[10px] font-bold tracking-widest text-orange-500 uppercase flex items-center gap-2">● Accepting Orders</div>
                                        : 
                                            <div className="mt-3 text-[10px] font-bold tracking-widest text-stone-400 uppercase flex items-center gap-2">Closed</div>
                                        }
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fee = normalizeCurbsideFee(selectedCafe?.curbsideFee);
    const subtotal = cart.reduce((s:any,i:any)=>s+i.price,0);
    const total = (subtotal + fee).toFixed(2);

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
                <h2 className="text-5xl font-serif font-bold italic mb-8 tracking-tighter text-stone-900 leading-none">Vehicle Specs.</h2>
                
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
                                <div><span className="font-bold text-stone-900 block">{i.name}</span><span className="text-xs text-stone-500">{i.size}, {i.milk}</span>{i.notes && <span className="block text-xs text-orange-500 italic mt-1 font-medium">"{i.notes}"</span>}</div>
                                <span className="font-bold text-stone-900">${i.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm mb-3 text-orange-500 font-bold uppercase tracking-widest"><span>Curbside Fee</span><span>${fee.toFixed(2)}</span></div>
                    <div className="flex justify-between text-3xl font-serif font-bold text-stone-900 mt-6 pt-6 border-t border-stone-100 italic"><span>Total</span><span>${total}</span></div>
                </div>

                <div className="mb-8 p-6 bg-stone-100 rounded-[1.5rem] text-sm flex gap-4 items-start shadow-inner border border-stone-200">
                    <input type="checkbox" className="mt-1 w-6 h-6 accent-stone-900 shrink-0 cursor-pointer" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <p className="text-stone-600 font-medium leading-relaxed">I agree to be legally parked curbside. I accept the <button onClick={(e) => {e.preventDefault(); setShowTerms(true);}} className="text-stone-900 font-bold underline">Terms & Liability</button>. No refunds for late arrivals.</p>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent z-30">
                <div className="max-w-md mx-auto">
                    <button onClick={() => handlePlaceOrder(details, carPhoto, gpsEnabled)} disabled={!agreed || !userProfile.name || !userProfile.plate} className={`w-full py-5 rounded-[2rem] font-bold text-sm uppercase tracking-widest shadow-xl flex justify-center items-center gap-3 transition ${agreed && userProfile.name && userProfile.plate ? 'bg-stone-900 text-white active:scale-[0.98]' : 'bg-stone-300 text-stone-500 shadow-none'}`}>
                        PAY & PULL UP
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
            <h2 className="text-5xl font-serif italic text-stone-900 mb-2 font-bold tracking-tight">Declined.</h2>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 max-w-sm w-full mb-8 mt-6">
                <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold mb-3">Message from Cafe</p>
                <p className="text-lg font-serif text-stone-900 font-bold italic">"{orderInfo.rejectionReason || 'Too busy right now'}"</p>
            </div>
            <p className="text-stone-500 mb-12 font-medium max-w-xs leading-relaxed">We sincerely apologize. You have not been charged for this order.</p>
            <button onClick={() => setView('landing')} className="bg-stone-900 text-white px-10 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-stone-800 transition">Back to Home</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-8 text-center animate-fade-in relative overflow-hidden font-sans">
            <button onClick={() => setShowSupport(true)} className="absolute top-6 right-6 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-white border border-stone-700 bg-stone-900/50 backdrop-blur-md px-5 py-3 rounded-full transition z-50 shadow-lg">Help / Issue?</button>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=60')] opacity-20 bg-cover bg-center grayscale scale-110 blur-sm"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-stone-900/80 to-stone-900 z-0"></div>
            
            <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center mb-12 shadow-2xl border-4 transition-colors duration-1000 ${orderInfo.status === 'completed' ? 'bg-green-500 border-green-400 shadow-[0_0_100px_rgba(34,197,94,0.6)]' : orderInfo.isArriving ? 'bg-orange-500 border-orange-400 shadow-[0_0_100px_rgba(249,115,22,0.6)] animate-pulse' : 'bg-stone-800 border-stone-700'}`}>
                <div className="scale-150">
                    {orderInfo.status === 'completed' ? <Icons.CheckCircle /> : <Icons.MapPin />}
                </div>
            </div>
            
            <h2 className="text-5xl font-serif italic mb-10 leading-tight tracking-tight relative z-10 text-white drop-shadow-lg font-bold">
                {orderInfo.status === 'pending' && "Awaiting Cafe..."}
                {orderInfo.status === 'preparing' && !orderInfo.isArriving && <span className="text-orange-400">Order Accepted.<br/>Making it now.</span>}
                {orderInfo.status === 'ready' && !orderInfo.isArriving && <span className="text-orange-300">Order Ready.<br/>Pull up close and tap the app button.</span>}
                {orderInfo.status === 'preparing' && orderInfo.isArriving && <span className="text-orange-400">Pull up to window!</span>}
                {orderInfo.status === 'ready' && orderInfo.isArriving && <span className="text-orange-300">Cafe notified. Pull up to window!</span>}
                {orderInfo.status === 'completed' && <span className="text-green-400">Order Complete.</span>}
            </h2>

            <div className={`bg-stone-900/80 backdrop-blur-xl p-12 rounded-[3rem] w-full max-w-sm shadow-2xl text-white relative z-10 mb-8 border border-stone-800 transition-all duration-1000 ${orderInfo.isArriving && orderInfo.status !== 'completed' ? 'ring-2 ring-green-400/50 scale-105' : ''}`}>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.4em] mb-4">Live Distance</p>
                <p className="text-8xl font-serif italic mb-2 tracking-tighter font-bold">
                    {orderInfo.status === 'completed' ? 'Done' : (distance !== null ? `${distance}m` : '--')}
                </p>
                {orderInfo.status !== 'completed' && !gpsEnabledForOrder && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">GPS sharing is off. Tap "I'm here" when close.</p>}
                {orderInfo.status !== 'completed' && gpsEnabledForOrder && !hasCafeCoords && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">Live distance unavailable for this cafe. Tap "I'm here" when close.</p>}
                {orderInfo.status !== 'completed' && gpsEnabledForOrder && hasCafeCoords && <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-3">Live sharing starts automatically when you are within ~5 minutes or nearby distance.</p>}
            </div>

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

    const openLegal = (modalType: any) => setActiveModal(modalType);

    // Handle return from Stripe
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('pullup_profile');
            if (savedUser) { try { setUserProfile(JSON.parse(savedUser)); } catch(e){} }
            const params = new URLSearchParams(window.location.search);
            if (params.get('merch_success') === 'true') {
                alert('Payment successful! Your Founders cap is being embroidered and shipped.');
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
        }
    }, []);

    // Auth Initialization (Anonymous fallback ensures no 'unauthenticated' error)
    useEffect(() => {
        const initAuth = async () => { try { await signInAnonymously(auth); } catch(e) { console.error("Guest Auth Failed"); } };
        initAuth();
        return onAuthStateChanged(auth, async (u) => {
            setUser(u as any);
            if (u && !u.isAnonymous) {
                const snap = await getDoc(doc(db, 'cafes', u.uid));
                if (snap.exists()) { setCafeProfile(snap.data() as any); setDashboardInitialTab('orders'); setView('cafe-admin'); }
            } else {
                setCafeProfile(null);
            }
            setLoading(false);
        });
    }, []);

    useEffect(() => {
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

    // Load Approved Cafes for Discovery
    useEffect(() => {
        const q = query(collection(db, 'cafes'), where('isApproved', '==', true));
        return onSnapshot(q, (snap) => setAllCafes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any));
    }, []);

    // Master Checkout Function (Posts to Stripe)
    const handlePlaceOrder = async (details: string, carPhoto: string | null, gpsEnabled: boolean) => {
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
            total: (cart.reduce((s: any, i: any) => s + i.price, 0) + fee).toFixed(2),
            fee: fee,
            status: 'pending',
            paymentState: 'authorization_pending',
            gpsEnabled,
            statusNote: 'Order placed. Waiting for cafe acceptance.',
            statusUpdatedAt: new Date().toISOString(),
            locationDetails: details,
            photo: carPhoto,
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

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><PullUpLogo className="animate-pulse-fast" /></div>;

    return (
        <React.Fragment>
            <GlobalStyles />
            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
            {activeModal && <LegalDocumentModal type={activeModal} onClose={() => setActiveModal(null)} />}
            {view === 'landing' && <LandingPage setView={setView} onAbout={() => setShowAbout(true)} openLegal={openLegal} />}
            {view === 'merchant-auth' && <CafeAuth setView={setView} auth={auth} db={db} openLegal={openLegal} />}
            {view === 'discovery' && <Discovery setView={setView} cafes={allCafes} onSelectCafe={(c:any) => { setSelectedCafe(c); setView('cafe-menu'); }} />}
            {view === 'cafe-menu' && <CafeMenu setView={setView} selectedCafe={selectedCafe} cart={cart} setCart={setCart} db={db} auth={auth} user={user} />}
            {view === 'checkout' && <Checkout setView={setView} userProfile={userProfile} setUserProfile={setUserProfile} handlePlaceOrder={handlePlaceOrder} cart={cart} selectedCafe={selectedCafe} />}
            {view === 'tracking' && <Tracking setView={setView} orderId={orderId} db={db} selectedCafe={selectedCafe} />}
            {view === 'merch' && <MerchStore setView={setView} />}
            {view === 'cafe-admin' && <CafeDashboard user={user} profile={cafeProfile} db={db} auth={auth} signOut={signOut} initialTab={dashboardInitialTab} />}
        </React.Fragment>
    );
}
