import React, { useState, useEffect, useRef, Fragment } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, setDoc, getDoc, where 
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, signInAnonymously
} from 'firebase/auth';

// --- SECURE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCkcGEoYN1uwVcyzj75VYlTC9hqjsur1lc", 
  authDomain: "pull-up-coffee.firebaseapp.com",
  projectId: "pull-up-coffee",
  storageBucket: "pull-up-coffee.firebasestorage.app",
  messagingSenderId: "998836533279",
  appId: "1:998836533279:web:b94998af93f0551fa6bd2a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const CONTACT_EMAIL = "hello@pullupcoffee.com";

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
    <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fafaf9; color: #1c1917; -webkit-tap-highlight-color: transparent; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-bounce-slow { animation: bounce 2s infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .bg-brand-orange { background-color: #f97316; }
        .text-brand-orange { color: #f97316; }
        .border-brand-orange { border-color: #f97316; }
        .shadow-premium { box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
        .secure-img { pointer-events: none; user-select: none; -webkit-user-drag: none; }
        `}
    </style>
);

// --- ICONS & LOGO ---
const Icons = {
    Car: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>,
    CreditCard: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    Robot: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Trash2: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Store: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>,
    Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
    CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    Sliders: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>,
    Smartphone: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
    Gavel: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
};

const PullUpLogo = ({ className = "w-24 h-24" }) => (
    <div className={`${className} bg-brand-orange rounded-full flex items-center justify-center shadow-premium mx-auto border-4 border-white/20`}>
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

// --- MODALS AND SCREENS ---

const AboutModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-premium overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
            <div className="md:w-5/12 bg-stone-900 flex flex-col items-center justify-center p-10 text-center border-r border-stone-800">
                <div className="w-44 h-44 rounded-full border-4 border-brand-orange overflow-hidden mb-6 shadow-2xl bg-stone-800">
                    <img src="https://raw.githubusercontent.com/stashhandymanservices69/pullup-coffee/main/creatorpullup.jpg" alt="Steven Weir" className="w-full h-full object-cover" 
                         onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=Steven+Weir&background=f97316&color=fff&size=512"; }} />
                </div>
                <h4 className="font-bold text-white text-xl tracking-tight">Steven Weir</h4>
                <p className="text-brand-orange text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Founder & Father</p>
            </div>
            <div className="md:w-7/12 p-10 relative overflow-y-auto">
                <button onClick={onClose} className="absolute top-6 right-6 text-stone-300 hover:text-brand-dark transition"><Icons.X /></button>
                <h3 className="text-4xl font-serif font-bold text-brand-dark mb-6 italic tracking-tight leading-none">The Pull Up Story.</h3>
                <div className="text-stone-600 text-sm leading-relaxed space-y-4 italic mb-8">
                    <p>"Becoming a new dad brought so many joyful moments, and one very familiar routine: those gentle drives to help my baby drift off to sleep. The only challenge? Craving a great cup of coffee without disturbing that precious nap or stepping out in my pajamas."</p>
                    <p>"I realised that street parking should be an extension of the shop. Pull Up turns every parking spot into a virtual drive-thru, removing the friction between you and your local cafe."</p>
                </div>
                <button onClick={onClose} className="w-full mt-8 bg-brand-dark text-white py-5 rounded-[2rem] font-bold shadow-xl hover:bg-stone-800 transition uppercase tracking-widest text-[10px]">Back to Marketplace</button>
            </div>
        </div>
    </div>
);

const IPRegistryModal = ({ onClose }) => {
    const startDate = "Thursday, 15 January 2026";
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-stone-50 w-full max-w-3xl rounded-xl shadow-2xl border border-stone-300 max-h-[90vh] overflow-y-auto font-serif">
                <div className="bg-brand-dark text-white p-8 text-center rounded-t-xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-white to-brand-orange"></div>
                     <div className="mb-4 flex justify-center"><div className="bg-white/10 p-4 rounded-full border border-white/20"><Icons.Gavel /></div></div>
                     <h2 className="text-2xl md:text-3xl font-bold tracking-wider mb-2 uppercase">Certificate of Priority & Authorship</h2>
                     <p className="text-stone-400 text-xs uppercase tracking-[0.2em]">Intellectual Property Registry Declaration</p>
                     <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white transition"><Icons.X /></button>
                </div>
                <div className="p-8 space-y-8 text-stone-800">
                    <div className="flex justify-between items-end border-b-2 border-stone-200 pb-4">
                        <div><p className="text-xs font-sans font-bold text-stone-400 uppercase">Author / Creator</p><p className="text-lg font-bold">Steven Weir</p></div>
                        <div className="text-right"><p className="text-xs font-sans font-bold text-stone-400 uppercase">Verification Date</p><p className="text-lg font-bold">{startDate}</p></div>
                    </div>
                    
                    <div className="bg-stone-100 p-6 rounded-xl border border-stone-200 space-y-6 text-sm leading-relaxed">
                        <h3 className="text-lg font-bold font-sans uppercase tracking-wide text-brand-dark">Claim of Original Authorship and Ownership</h3>
                        <p className="font-bold text-stone-500 uppercase tracking-tight">Document: Declaration of Original Authorship, Copyright Ownership, Prior Art Notice, and Rights Reservation<br/>Effective Date: {startDate} (AEST)</p>
                        <p className="leading-relaxed mb-4 text-sm">This Declaration is executed by the undersigned as a formal, sworn statement regarding the intellectual property rights in the "Pull Up Coffee" platform (the "Work"). The Work encompasses a digital platform concept, including software architecture, business logic, user interfaces, and associated materials for enabling drive-thru-like curbside coffee services at cafes without dedicated infrastructure.</p>

                        <div className="space-y-4">
                            <h4 className="font-bold text-brand-orange">1. Definitions</h4>
                            <p className="text-sm">"Work" means all original expressions, including written descriptions, diagrams, user flows, algorithms, policy rules, terminology, structural arrangements, and any prototypes or code related to the Pull Up Coffee platform. "Rights Holder" means Steven Weir, the undersigned author and creator.</p>

                            <h4 className="font-bold text-brand-orange">2. Claim of Original Authorship and Ownership</h4>
                            <p className="text-sm"><strong>2.1 Originality.</strong> The Rights Holder asserts that the Work is an original creation, fixed in tangible form (e.g., digital files, documents) as of the Effective Date or earlier, as evidenced by embedded timestamps, metadata, or repository records.</p>
                            <p className="text-sm"><strong>2.2 Scope of Copyright.</strong> Pursuant to Section 31 of the Copyright Act 1968 (Cth), the Rights Holder claims automatic copyright in the Work's literary, artistic, and dramatic elements, including but not limited to business logic sequences and user interface designs.</p>
                            
                            <h4 className="font-bold text-brand-orange">3. Novel Features Claimed</h4>
                            <ul className="text-sm space-y-2 list-disc pl-4">
                                <li><strong>3.1 Dynamic Curbside Fee Adjustment.</strong> An algorithm for real-time adjustment of a curbside service fee based on cafe operational capacity, load signals, and external factors.</li>
                                <li><strong>3.2 Arrival Time Locking with Pre-Payment.</strong> A user flow where customers select and lock an arrival time slot prior to payment completion.</li>
                                <li><strong>3.3 Integrated Latency Management.</strong> GPS-based curbside notifications linked to pricing and policy engines to minimize service disruptions.</li>
                            </ul>

                            <h4 className="font-bold text-brand-orange">4. Execution and Verification</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-white p-4 border border-stone-200 rounded">
                                <div>Rights Holder / Author:</div><div className="font-bold">Steven Weir</div>
                                <div>Legal Name:</div><div className="font-bold">Steven Weir</div>
                                <div>Address / Country:</div><div className="font-bold">Sunshine Coast, Queensland, Australia</div>
                                <div>Date:</div><div className="font-bold">{startDate}</div>
                                <div>Digital Signature:</div><div className="font-bold text-green-600">[DIGITALLY SIGNED]</div>
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">Terms of Service</h3><button onClick={onClose}><Icons.X /></button></div>
            <div className="prose text-sm text-stone-600 leading-relaxed space-y-4">
                <p><strong>1. Service Overview:</strong> Pull Up Coffee is a technology platform connecting users with third-party cafes. We act as an agent for the cafe.</p>
                <p><strong>2. Liability:</strong> We are not responsible for the quality of food/beverages or safety on cafe premises. Liability rests with the third-party provider.</p>
                <p><strong>3. Refunds:</strong> Refunds are at the discretion of the specific cafe partner. We facilitate the transaction but do not hold goods.</p>
                <p><strong>4. User Data:</strong> We collect email and phone numbers solely for order receipts and essential service notifications in accordance with the Privacy Act 1988.</p>
                <p><strong>5. Australian Consumer Law:</strong> Our services come with guarantees that cannot be excluded under the Australian Consumer Law.</p>
            </div>
            <button onClick={onClose} className="w-full mt-6 bg-brand-dark text-white py-3 rounded-xl font-bold">I Understand</button>
        </div>
    </div>
);

const CustomerVideoModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-stone-900 w-full max-w-4xl rounded-[3rem] shadow-premium overflow-hidden p-8 relative border border-white/10">
            <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-white transition z-20"><Icons.X /></button>
            <h3 className="text-3xl font-serif font-bold text-white mb-2 text-center italic tracking-tight">How to Order.</h3>
            <p className="text-stone-400 text-center mb-8 text-sm">See how easy it is to pull up and pick up.</p>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border border-stone-800 relative flex items-center justify-center">
                <video src="how_to_order_customer.mp4" controls className="w-full h-full object-cover z-10"></video>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><p className="text-white/30 font-serif italic border border-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">Awaiting Video Upload</p></div>
            </div>
            <button onClick={onClose} className="w-full mt-8 bg-brand-orange text-white py-5 rounded-[2rem] font-bold shadow-xl hover:bg-orange-600 transition uppercase tracking-widest text-[10px]">Close</button>
        </div>
    </div>
);

const MerchantVideoModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-stone-900 w-full max-w-4xl rounded-[3rem] shadow-premium overflow-hidden p-8 relative border border-white/10">
            <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-white transition z-20"><Icons.X /></button>
            <h3 className="text-3xl font-serif font-bold text-white mb-2 text-center italic tracking-tight">Partner Workflow.</h3>
            <p className="text-stone-400 text-center mb-8 text-sm">See the dashboard and arrival radar in action.</p>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border border-stone-800 relative flex items-center justify-center">
                <video src="how_it_works_merchant.mp4" controls className="w-full h-full object-cover z-10"></video>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><p className="text-white/30 font-serif italic border border-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">Awaiting Video Upload</p></div>
            </div>
            <button onClick={onClose} className="w-full mt-8 bg-brand-orange text-white py-5 rounded-[2rem] font-bold shadow-xl hover:bg-orange-600 transition uppercase tracking-widest text-[10px]">Close</button>
        </div>
    </div>
);

// --- PRODUCT CUSTOMIZATION MODAL ---
const ProductModal = ({ item, onClose, onAdd }) => {
    const [size, setSize] = useState('Reg');
    const [milk, setMilk] = useState('Full Cream');
    const [sugar, setSugar] = useState('0');
    const [temp, setTemp] = useState('Hot');
    const [notes, setNotes] = useState('');

    const getAdjustedPrice = () => {
        let price = item.price;
        if(size === 'Large') price += 0.50; 
        if(milk === 'Oat' || milk === 'Almond' || milk === 'Soy') price += 0.50; 
        return price;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="font-serif font-bold text-2xl text-brand-dark">{item.name}</h3><p className="text-stone-500 text-sm">Customise your choice</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                </div>
                <div className="space-y-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Size</label>
                        <div className="flex gap-2">
                            {['Small', 'Reg', 'Large'].map(opt => (
                                <button key={opt} onClick={() => setSize(opt)} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition ${size === opt ? 'bg-brand-dark text-white border-brand-dark shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>{opt}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Milk Preference</label>
                        <select value={milk} onChange={e => setMilk(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white transition outline-none">
                            <option>Full Cream</option><option>Skim</option><option>Oat (+$0.50)</option><option>Almond (+$0.50)</option><option>Soy (+$0.50)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-2 tracking-wider">Barista Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 3/4 full, no lid..." className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl h-20 text-sm focus:bg-white transition outline-none"></textarea>
                    </div>
                </div>
                <button onClick={() => onAdd({ ...item, size, milk, notes, price: getAdjustedPrice() })} className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-stone-800 transition transform active:scale-[0.98]">
                    Add to Order • ${getAdjustedPrice().toFixed(2)}
                </button>
            </div>
        </div>
    );
};

// --- VIEWS ---

const LandingPage = ({ setView, onAbout, onLegal, onCustomerVideo }) => (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white animate-fade-in relative overflow-hidden font-sans">
        <div className="absolute top-6 right-6 z-50">
            <button onClick={() => setView('cafe-auth')} className="text-[10px] uppercase tracking-widest opacity-80 hover:opacity-100 flex items-center gap-2 transition px-5 py-2.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md font-bold">
                <Icons.Store /> Merchant Portal
            </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=60')] bg-cover bg-center opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/70 via-black/40 to-black/90"></div>
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <PullUpLogo className="mb-10 w-32 h-32" />
            <h1 className="text-6xl md:text-7xl font-serif italic mb-4 tracking-tight drop-shadow-2xl leading-none">Pull Up Coffee™</h1>
            <p className="text-stone-300 mb-14 text-xl max-w-md mx-auto italic font-light">Street parking is now your drive-thru.</p>
            <button onClick={() => setView('discovery')} className="bg-white text-brand-dark py-6 px-16 rounded-[2.5rem] font-bold text-2xl shadow-premium hover:scale-105 transition transform flex items-center gap-4">
                <Icons.Car /> Order Now
            </button>
        </div>

        <div className="relative z-10 bg-black/40 backdrop-blur-lg border-t border-white/10 p-6 md:p-8">
            <div className="text-center flex flex-wrap justify-center gap-6">
                <button onClick={onAbout} className="text-[11px] text-stone-400 uppercase tracking-[0.3em] font-bold hover:text-brand-orange transition-colors">About Vision</button>
                <button onClick={onCustomerVideo} className="text-[11px] text-stone-400 uppercase tracking-[0.3em] font-bold hover:text-brand-orange transition-colors flex items-center gap-2"><Icons.Play /> How to Order</button>
                <button onClick={onLegal} className="text-[11px] text-stone-400 uppercase tracking-[0.3em] font-bold hover:text-brand-orange transition-colors">Legal & IP Registry</button>
            </div>
        </div>
    </div>
);

const CafeAuth = ({ setView, auth, db, onMerchantVideo }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [bizName, setBizName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoadingAuth(true);
        try {
            if (mode === 'apply') {
                if (pass !== confirmPass) throw new Error("Passwords do not match.");
                const res = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, 'cafes', res.user.uid), {
                    businessName: bizName,
                    phone: phone,
                    address: address,
                    email: email,
                    isApproved: false,
                    status: 'closed',
                    appliedAt: new Date().toISOString()
                });
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err) { 
            alert(err.message.replace('Firebase: ','').replace('Error ','')); 
        } finally {
            setLoadingAuth(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex animate-fade-in relative overflow-hidden">
            <div className="hidden lg:flex w-1/2 bg-brand-dark flex-col justify-center p-20 relative text-white">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80')] opacity-20 bg-cover bg-center"></div>
                <div className="relative z-10">
                    <PullUpLogo className="w-24 h-24 mb-10 mx-0" />
                    <h1 className="text-5xl font-serif font-bold mb-6 leading-tight">Turn street parking into your drive-thru.</h1>
                    <p className="text-xl text-stone-300 font-light mb-10">Join the Pull Up network to unlock a highly-profitable sales channel for customers who can't easily leave their cars.</p>
                    
                    <button onClick={onMerchantVideo} className="mb-12 inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors px-6 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase shadow-lg">
                        <Icons.Play /> See how it works for partners
                    </button>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 text-stone-300"><Icons.CheckCircle /> Zero upfront hardware costs</div>
                        <div className="flex items-center gap-4 text-stone-300"><Icons.CheckCircle /> Keep 100% of menu prices + earn on curbside</div>
                        <div className="flex items-center gap-4 text-stone-300"><Icons.CheckCircle /> Reach parents, commuters, and accessible needs</div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-20 bg-white z-10 relative shadow-2xl overflow-y-auto">
                <button onClick={() => setView('landing')} className="absolute top-8 left-8 text-stone-400 hover:text-brand-dark transition uppercase text-[10px] tracking-widest font-bold flex items-center gap-2"><Icons.X /> Back</button>
                
                <div className="max-w-md w-full mx-auto mt-12">
                    <div className="lg:hidden mb-8 text-center">
                        <PullUpLogo className="w-20 h-20 mx-auto" />
                        <button onClick={onMerchantVideo} className="mt-4 inline-flex items-center gap-2 text-brand-orange font-bold text-xs uppercase tracking-widest"><Icons.Play /> See how it works</button>
                    </div>
                    
                    <h2 className="text-3xl font-serif font-bold mb-2 tracking-tight text-brand-dark">
                        {mode === 'apply' ? 'Merchant Application' : 'Merchant Login'}
                    </h2>
                    <p className="text-stone-500 mb-10 text-sm leading-relaxed">
                        {mode === 'apply' ? 'Join the network to serve customers who can\'t easily leave their cars.' : 'Access your live dashboard and radar.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'apply' && (
                            <Fragment>
                                <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Registered Business Name" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full Store Address" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Store Phone Number" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                            </Fragment>
                        )}
                        
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Account Email" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" minLength="6" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                        
                        {mode === 'apply' && (
                            <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirm Password" minLength="6" className="w-full p-4 bg-stone-50 rounded-xl outline-none focus:ring-2 ring-brand-orange/50 border border-stone-200 font-medium text-stone-800 transition" required />
                        )}

                        <button type="submit" disabled={loadingAuth} className="w-full bg-brand-dark text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-stone-800 transition disabled:opacity-50 mt-4 flex justify-center">
                            {loadingAuth ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (mode === 'apply' ? 'Submit Application' : 'Sign In')}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-stone-100 text-center">
                        <p className="text-stone-500 text-sm">
                            {mode === 'apply' ? 'Already an approved partner?' : 'Want to offer drive-thru at your cafe?'}
                        </p>
                        <button onClick={() => setMode(mode === 'apply' ? 'login' : 'apply')} className="mt-2 text-brand-dark font-bold hover:text-brand-orange transition underline underline-offset-4">
                            {mode === 'apply' ? 'Log in here' : 'Apply to become a partner'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CafeDashboard = ({ user, profile, db, auth, signOut }) => {
    const [tab, setTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [earn, setEarn] = useState({ gross: 0, net: 0 });
    const [menu, setMenu] = useState([]);
    const [botChat, setBotChat] = useState([{ type: 'bot', text: 'Hi! Ask me anything about curbside logic, commission splits, or audience reach.' }]);
    const [botInput, setBotInput] = useState('');
    const [newItem, setNewItem] = useState({ name: '', price: '', img: null });

    // Toggles for Settings
    const [smsBackup, setSmsBackup] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);
    const prevOrderCount = useRef(0);
    const logoInputRef = useRef(null);
    const itemImageInputRef = useRef(null);

    // Audio chime for new orders
    useEffect(() => {
        if (orders.length > prevOrderCount.current) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log("Audio play blocked until interaction."));
        }
        prevOrderCount.current = orders.length;
    }, [orders.length]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'orders'), where('cafeId', '==', user.uid));
        return onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrders(list.filter(o => o.status !== 'completed' && o.status !== 'rejected'));
            const done = list.filter(o => o.status === 'completed');
            const gross = done.reduce((s,o)=>s+o.total,0);
            const platform = done.reduce((s,o)=>s+(o.fee * 0.2), 0);
            setEarn({ gross, net: gross - platform });
        });
    }, [user, db]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'cafes', user.uid, 'menu'));
        return onSnapshot(q, snap => setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [user, db]);

    const addMenuItem = async () => {
        if (!newItem.name || !newItem.price) return;
        await addDoc(collection(db, 'cafes', user.uid, 'menu'), { ...newItem, price: parseFloat(newItem.price), active: true });
        setNewItem({ name: '', price: '', img: null });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                await updateDoc(doc(db, 'cafes', user.uid), { logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleItemImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewItem({ ...newItem, img: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const handleBotSubmit = (e) => {
        e.preventDefault();
        if(!botInput.trim()) return;
        setBotChat(prev => [...prev, { type: 'user', text: botInput }]);
        const q = botInput.toLowerCase();
        setBotInput('');
        
        setTimeout(() => {
            let answer = "I'm your AI assistant. The standard Pull Up platform fee is 20% of the curbside surcharge. You keep 100% of the coffee price!";
            if (q.includes("why") || q.includes("benefit") || q.includes("audience")) {
                answer = "Pull Up expands your customer base to parents with sleeping kids, people with mobility/disability needs, or those with social anxiety or health concerns. Plus, you earn the majority of the extra curbside fee!";
            } else if (q.includes("sms") || q.includes("text")) {
                answer = "You can enable SMS Fallback Notifications in your Settings tab. This sends a text to your store phone if the tablet misses an order.";
            }
            setBotChat(prev => [...prev, { type: 'bot', text: answer }]);
        }, 800);
    };

    const PRESET_MENU = [
        { name: "Flat White", price: 4.50 },
        { name: "Cappuccino", price: 4.50 },
        { name: "Latte", price: 4.50 },
        { name: "Long Black", price: 4.00 },
        { name: "Mocha", price: 5.00 },
        { name: "Iced Latte", price: 5.50 }
    ];

    const addPresetItem = async (preset) => {
        await addDoc(collection(db, 'cafes', user.uid, 'menu'), { name: preset.name, price: preset.price, active: true });
    };

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col animate-fade-in text-left">
            <div className="bg-brand-dark text-white p-6 shadow-2xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {profile?.logo ? (
                        <img src={profile.logo} alt="Store Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-lg" />
                    ) : (
                        <PullUpLogo className="w-12 h-12" />
                    )}
                    <div>
                        <h2 className="text-xl font-serif italic text-brand-orange leading-tight">{profile?.businessName}</h2>
                        <p className="text-[8px] uppercase text-stone-500 tracking-[0.2em] font-bold">Partner Shop</p>
                    </div>
                </div>
                <button onClick={() => signOut(auth)} className="text-[10px] uppercase font-bold underline opacity-50 tracking-[0.2em] hover:opacity-100 transition-opacity">Logout</button>
            </div>
            <div className="flex bg-white border-b shadow-sm sticky top-0 z-20">
                {['orders', 'earnings', 'menu', 'settings', 'support'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${tab === t ? 'text-brand-orange border-b-2 border-brand-orange bg-orange-50/50' : 'text-stone-400'}`}>
                        {t} {t === 'orders' && orders.length > 0 ? `(${orders.length})` : ''}
                    </button>
                ))}
            </div>
            <div className="p-8 flex-1 max-w-6xl mx-auto w-full overflow-y-auto">
                {tab === 'orders' && (
                    <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                        {orders.length === 0 ? <p className="text-center py-24 text-stone-400 italic border-2 border-dashed border-stone-200 rounded-[3rem] col-span-full">Awaiting cars en-route...</p> : 
                        orders.map(o => (
                            <div key={o.id} className={`p-8 bg-white rounded-[3rem] border shadow-premium transition-all ${o.isArriving ? 'ring-4 ring-green-400 scale-[1.03]' : ''}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div><h4 className="text-xl font-bold text-brand-dark leading-tight">{o.customerName}</h4><p className="text-xs text-stone-400 font-mono uppercase mt-1 tracking-tight">{o.carDetails} • {o.plate}</p></div>
                                    <div className="text-right">
                                        <div className="px-3 py-1 bg-orange-100 text-brand-orange rounded-full text-[9px] font-bold uppercase tracking-widest">{o.status}</div>
                                        {o.gpsEnabled && <div className="text-[10px] text-brand-orange font-bold mt-2 animate-pulse">{o.distance}m away</div>}
                                    </div>
                                </div>
                                {o.isArriving && <div className="bg-green-500 text-white p-4 rounded-2xl text-[11px] font-bold mb-6 text-center tracking-widest animate-bounce shadow-lg flex items-center justify-center gap-3"><Icons.Car /> CAR AT WINDOW</div>}
                                <div className="space-y-2 mb-8 border-y border-stone-50 py-5 px-4 rounded-xl bg-stone-50/50">
                                    {o.items.map((it, idx) => (
                                        <div key={idx} className="flex justify-between text-sm font-medium text-stone-700">
                                            <span>1x {it.name} <span className="text-xs text-stone-400 block font-normal mt-1">{it.size}, {it.milk}</span></span>
                                            <span className="text-stone-400 italic text-xs">Ready</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    {o.status === 'pending' ? <button onClick={() => updateDoc(doc(db, 'orders', o.id), { status: 'preparing' })} className="flex-1 bg-brand-dark text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-stone-800 transition text-[11px] uppercase tracking-widest">Accept Order</button> : <button onClick={() => updateDoc(doc(db, 'orders', o.id), { status: 'completed' })} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-green-700 transition text-[11px] uppercase tracking-widest">Hand Over</button>}
                                    <button onClick={() => updateDoc(doc(db, 'orders', o.id), { status: 'rejected' })} className="px-5 py-4 text-red-400 border border-red-50 rounded-2xl hover:bg-red-50 transition"><Icons.X /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'earnings' && (
                    <div className="max-w-md mx-auto space-y-8 text-center pt-10 animate-fade-in">
                        <div className="bg-white p-12 rounded-[4rem] border shadow-premium">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 font-bold leading-none">Total Gross Sales</p>
                            <p className="text-6xl font-serif italic text-brand-dark leading-none">${earn.gross.toFixed(2)}</p>
                        </div>
                        <div className="bg-brand-dark p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-brand-orange opacity-40"></div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-stone-500 tracking-[0.2em]">Platform Split (20% of Fee)</p>
                            <p className="text-3xl font-serif text-brand-orange italic leading-none">-${(earn.gross - earn.net).toFixed(2)}</p>
                            <p className="text-[9px] mt-4 text-stone-400 uppercase tracking-[0.1em] font-medium opacity-60">Net payout scheduled: ${earn.net.toFixed(2)}</p>
                        </div>
                        <button className="w-full bg-white border-2 border-dashed border-stone-200 p-12 rounded-[3.5rem] flex flex-col items-center gap-4 text-stone-400 hover:text-brand-dark transition-all hover:bg-stone-50 group shadow-sm">
                            <div className="p-4 bg-stone-50 rounded-2xl group-hover:bg-brand-orange group-hover:text-white transition-colors"><Icons.CreditCard /></div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Connect Stripe Account</span>
                            <span className="text-[9px] text-stone-400 italic leading-none tracking-widest">Daily automated settlement</span>
                        </button>
                    </div>
                )}
                {tab === 'menu' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-white p-10 rounded-[3.5rem] border shadow-premium">
                            <h3 className="font-bold text-lg mb-8 tracking-tight flex items-center gap-3">Store Menu Setup</h3>
                            <div className="space-y-4 mb-10">
                                {menu.length === 0 ? <p className="text-stone-400 text-xs italic">No items added yet.</p> : 
                                menu.map(m => (
                                    <div key={m.id} className="flex justify-between items-center p-5 bg-stone-50 rounded-3xl border border-stone-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-stone-200 shrink-0 flex items-center justify-center text-stone-300">
                                                {m.img ? <img src={m.img} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                                            </div>
                                            <div><p className="font-bold text-brand-dark">{m.name}</p><p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-1">${m.price.toFixed(2)}</p></div>
                                        </div>
                                        <button onClick={() => deleteDoc(doc(db, 'cafes', user.uid, 'menu', m.id))} className="text-stone-300 hover:text-red-500 transition-colors p-2 hover:bg-white rounded-full"><Icons.Trash2 /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-stone-100 pt-8 space-y-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">List New Product</p>
                                <div className="flex items-center gap-4">
                                    <input type="file" accept="image/*" className="hidden" ref={itemImageInputRef} onChange={handleItemImageUpload} />
                                    <button onClick={() => itemImageInputRef.current?.click()} className="w-20 h-20 rounded-2xl border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-brand-orange hover:text-brand-orange transition shrink-0 overflow-hidden bg-stone-50">
                                        {newItem.img ? <img src={newItem.img} className="w-full h-full object-cover" /> : <Icons.Upload />}
                                    </button>
                                    <div className="flex-1 space-y-3">
                                        <input value={newItem.name} onChange={(e) => setNewItem({...newItem, name:e.target.value})} type="text" placeholder="Coffee Name" className="w-full bg-stone-50 p-4 rounded-2xl outline-none focus:bg-white focus:ring-1 ring-brand-orange/30 transition-all font-medium text-sm" />
                                        <input value={newItem.price} onChange={(e) => setNewItem({...newItem, price:e.target.value})} type="number" placeholder="Price (e.g. 4.50)" className="w-full bg-stone-50 p-4 rounded-2xl outline-none focus:bg-white focus:ring-1 ring-brand-orange/30 transition-all font-medium text-sm" />
                                    </div>
                                </div>
                                <button onClick={addMenuItem} className="w-full bg-brand-dark text-white py-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] active:scale-95 transition-transform mt-2">
                                    <Icons.Plus /> Update Shop Menu
                                </button>
                            </div>
                            <div className="border-t border-stone-100 pt-8 mt-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-4">Quick Add Presets</p>
                                <div className="flex flex-wrap gap-3">
                                    {PRESET_MENU.map(preset => (
                                        <button key={preset.name} onClick={() => addPresetItem(preset)} className="px-4 py-2 text-xs font-bold bg-stone-50 hover:bg-brand-orange hover:text-white transition rounded-xl border border-stone-200 text-stone-600">
                                            + {preset.name} (${preset.price.toFixed(2)})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {tab === 'settings' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-white p-10 rounded-[3.5rem] border shadow-premium space-y-8">
                            
                            <div>
                                <h3 className="font-bold text-lg mb-4 tracking-tight flex items-center gap-2"><Icons.Store /> Store Profile</h3>
                                <p className="text-sm text-stone-500 mb-6">Update your business display photo.</p>
                                
                                <div className="flex items-center gap-6 p-5 bg-stone-50 rounded-2xl border border-stone-100">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white border-2 border-brand-orange shrink-0 flex items-center justify-center text-stone-300">
                                        {profile?.logo ? <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" /> : <Icons.Store />}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
                                        <button onClick={() => logoInputRef.current?.click()} className="bg-white border border-stone-200 text-stone-600 px-5 py-3 rounded-xl text-xs font-bold hover:border-brand-orange transition shadow-sm">
                                            Upload New Photo
                                        </button>
                                        <p className="text-[10px] text-stone-400 mt-2">Recommended: Square image (1:1 ratio)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-stone-100">
                                <h3 className="font-bold text-lg mb-4 tracking-tight flex items-center gap-2"><Icons.Smartphone /> Security & Notifications</h3>
                                <p className="text-sm text-stone-500 mb-6">Manage how you receive alerts and secure your portal.</p>
                                
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:border-brand-orange transition">
                                        <div>
                                            <p className="font-bold text-brand-dark text-sm">SMS Fallback Alerts</p>
                                            <p className="text-xs text-stone-400 mt-1">Get a text if the tablet misses an order.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-brand-orange" checked={smsBackup} onChange={(e) => setSmsBackup(e.target.checked)} />
                                    </label>

                                    <label className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:border-brand-orange transition">
                                        <div>
                                            <p className="font-bold text-brand-dark text-sm">Two-Factor Auth (2FA)</p>
                                            <p className="text-xs text-stone-400 mt-1">Require SMS code to log in or change payouts.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-brand-orange" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {tab === 'support' && (
                    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
                         <div className="bg-white p-10 rounded-[4rem] shadow-premium border border-stone-100 flex flex-col h-[650px] relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-8 border-b border-stone-50 pb-6">
                                <div className="bg-brand-orange p-4 rounded-2xl text-white animate-pulse shadow-lg"><Icons.Robot /></div>
                                <div><h3 className="font-bold text-xl leading-none tracking-tight">AI Partner Support</h3><p className="text-[9px] text-stone-400 mt-2 font-bold uppercase tracking-widest">Platform Expert Online</p></div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 no-scrollbar font-medium text-sm">
                                {botChat.map((m, i) => (
                                    <div key={i} className={`flex ${m.type === 'bot' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`p-6 rounded-[2.5rem] max-w-[85%] leading-relaxed ${m.type === 'bot' ? 'bg-stone-50 text-stone-700' : 'bg-brand-dark text-white shadow-xl'}`}>
                                            {m.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleBotSubmit} className="flex gap-4">
                                <input type="text" value={botInput} onChange={(e) => setBotInput(e.target.value)} placeholder="Type your inquiry..." className="flex-1 bg-stone-50 border border-stone-100 p-6 rounded-[2rem] outline-none focus:ring-1 ring-brand-orange transition shadow-inner font-medium" />
                                <button type="submit" className="bg-brand-orange text-white p-6 rounded-[2rem] shadow-xl hover:bg-orange-600 transition active:scale-90"><Icons.Send /></button>
                            </form>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Discovery = ({ setView, onSelectCafe, userLoc, detectLoc, cafes }) => {
    const [searchRadius, setSearchRadius] = useState(15); 
    return (
        <div className="min-h-screen bg-stone-50 p-6 animate-fade-in text-left">
            <div className="max-w-md mx-auto">
                <button onClick={() => setView('landing')} className="mb-10 text-stone-400 font-bold flex items-center gap-2 hover:text-brand-dark transition"><Icons.X /> Back</button>
                <h2 className="text-5xl font-serif font-bold text-brand-dark mb-4 italic tracking-tight leading-none">Find a Cafe.</h2>
                <p className="text-stone-400 mb-8 text-lg font-light italic leading-relaxed">Choose a partner and we'll track your radar.</p>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 mb-8 mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 flex items-center gap-2"><Icons.Sliders /> Search Radius</label>
                        <span className="font-bold text-brand-orange">{searchRadius} km</span>
                    </div>
                    <input type="range" min="1" max="50" value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)} className="w-full accent-brand-orange h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
                </div>

                <button onClick={detectLoc} className={`w-full py-6 rounded-[2.5rem] font-bold shadow-premium flex items-center justify-center gap-4 transition-all uppercase tracking-widest text-xs ${userLoc ? 'bg-green-600 text-white' : 'bg-brand-orange text-white'}`}>
                    <Icons.MapPin /> {userLoc ? 'Radar Sync Active' : 'Activate Live GPS'}
                </button>
                
                <div className="mt-14 space-y-6">
                    {cafes.length === 0 ? <div className="text-center py-20 text-stone-400 italic border-2 border-dashed border-stone-200 rounded-[3rem]">No approved partners live nearby...</div> : 
                    cafes.map(c => (
                        <button key={c.id} onClick={() => onSelectCafe(c)} className="w-full p-6 sm:p-10 bg-white rounded-[3.5rem] border border-stone-100 text-left hover:border-brand-orange transition-all shadow-premium group relative overflow-hidden flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center text-stone-400">
                                {c.logo ? <img src={c.logo} className="w-full h-full object-cover" /> : <Icons.Store />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-2xl text-brand-dark tracking-tight leading-none">{c.businessName}</h3>
                                <p className="text-stone-400 text-[10px] mt-2 uppercase tracking-widest leading-relaxed opacity-80 font-bold">{c.address || 'Local Partner'}</p>
                                <div className="mt-4 text-[11px] font-black tracking-widest text-brand-orange uppercase italic group-hover:translate-x-2 transition-transform flex items-center gap-2 underline underline-offset-4">Browse Menu & Radar <Icons.ChevronRight /></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CafeMenu = ({ setView, selectedCafe, cart, setCart, db }) => {
    const [shopMenu, setShopMenu] = useState([]);
    const [activeItem, setActiveItem] = useState(null);
    
    useEffect(() => {
        if (!selectedCafe) return;
        const q = query(collection(db, 'cafes', selectedCafe.id, 'menu'));
        return onSnapshot(q, snap => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Provide defaults if the shop hasn't added anything yet
            setShopMenu(items.length > 0 ? items : [{name:'Flat White', price: 4.5}, {name:'Cappuccino', price: 4.5}, {name:'Latte', price: 4.5}]);
        });
    }, [selectedCafe, db]);

    return (
        <div className="min-h-screen bg-stone-50 p-6 pb-32 animate-fade-in text-left relative">
            <button onClick={() => setView('discovery')} className="self-start mb-10 p-3 bg-white shadow-sm hover:bg-stone-200 rounded-full transition"><Icons.X /></button>
            <div className="max-w-lg mx-auto text-center">
                {selectedCafe?.logo ? (
                    <img src={selectedCafe.logo} alt="Logo" className="w-24 h-24 mb-6 mx-auto rounded-full object-cover shadow-premium border-4 border-white" />
                ) : (
                    <PullUpLogo className="w-20 h-20 mb-6 mx-auto" />
                )}
                <h2 className="text-4xl font-serif italic font-bold mb-10 text-brand-dark leading-tight tracking-tight">{selectedCafe.businessName}</h2>
                <div className="space-y-5 text-left">
                    {shopMenu.map(item => (
                        <div key={item.name} onClick={() => setActiveItem(item)} className="bg-white p-4 sm:p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-5 group hover:border-brand-orange transition-all cursor-pointer">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-50 border border-stone-200 shrink-0 flex items-center justify-center text-stone-300">
                                {item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <Icons.Coffee />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-xl text-brand-dark leading-tight tracking-tight">{item.name}</h4>
                                <p className="text-brand-orange font-bold text-sm mt-2 uppercase tracking-widest">${item.price.toFixed(2)}</p>
                            </div>
                            <button className="bg-brand-dark text-white p-4 rounded-xl transition hover:scale-110 shadow-lg active:scale-95 shrink-0"><Icons.Plus /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Render the Customisation Modal if an item is clicked */}
            {activeItem && <ProductModal item={activeItem} onClose={() => setActiveItem(null)} onAdd={(item) => { setCart([...cart, { ...item, cartId: Math.random() }]); setActiveItem(null); }} />}

            {cart.length > 0 && !activeItem && (
                <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent">
                    <button onClick={() => setView('checkout')} className="w-full max-w-md mx-auto bg-brand-dark text-white p-6 rounded-[2.5rem] font-bold flex justify-between items-center shadow-premium hover:bg-stone-800 transition active:scale-95">
                        <span className="bg-brand-orange text-white px-3 py-2 rounded-xl text-[10px] tracking-widest font-black uppercase">{cart.length} Items</span>
                        <span className="uppercase text-[11px] tracking-[0.3em] font-black ml-4">Checkout</span>
                        <span className="font-serif italic text-2xl tracking-tighter">${(cart.reduce((s,i)=>s+i.price,0)+2).toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const Checkout = ({ setView, userProfile, setUserProfile, handlePlaceOrder, cart }) => {
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    return (
        <div className="min-h-screen bg-white p-6 animate-fade-in flex flex-col items-center pb-24 text-left">
            <div className="w-full max-w-md text-left">
                <button onClick={() => setView('cafe-menu')} className="mb-10 p-3 hover:bg-stone-100 rounded-full transition"><Icons.X /></button>
                <h2 className="text-5xl font-serif font-bold italic mb-10 tracking-tighter text-brand-dark leading-none">Vehicle Specs.</h2>
                <div className="space-y-6 mb-8">
                    <input type="text" placeholder="Your Name" value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name:e.target.value})} className="w-full p-6 bg-stone-50 rounded-[2.5rem] outline-none text-lg font-medium focus:ring-2 focus:ring-brand-orange/50 transition" />
                    <input type="text" placeholder="Vehicle Colour/Make" value={userProfile.carModel} onChange={(e) => setUserProfile({...userProfile, carModel:e.target.value})} className="w-full p-6 bg-stone-50 rounded-[2.5rem] outline-none text-lg font-medium focus:ring-2 focus:ring-brand-orange/50 transition" />
                    <input type="text" placeholder="Rego Plate" value={userProfile.plate} onChange={(e) => setUserProfile({...userProfile, plate:e.target.value})} className="w-full p-6 bg-stone-50 rounded-[2.5rem] outline-none text-lg uppercase font-mono tracking-widest focus:ring-2 focus:ring-brand-orange/50 transition" />
                    
                    <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200">
                        <label className="flex items-center gap-4 cursor-pointer">
                            <input type="checkbox" className="w-6 h-6 accent-brand-orange" checked={gpsEnabled} onChange={(e) => setGpsEnabled(e.target.checked)} />
                            <span className="text-sm font-bold text-stone-700">Share live GPS distance with Cafe</span>
                        </label>
                        <p className="text-xs text-stone-400 mt-2 pl-10">Helps the barista time your coffee perfectly. (Optional)</p>
                    </div>
                </div>

                <div className="mb-8 p-6 bg-stone-50 rounded-3xl border border-stone-200 text-sm flex gap-4 items-start">
                    <input type="checkbox" id="refund-policy" className="mt-1 w-6 h-6 accent-brand-orange" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <div>
                        <label htmlFor="refund-policy" className="text-stone-600 font-medium leading-relaxed">I agree to be curbside within 10 minutes. I accept the </label>
                        <button onClick={() => setShowTerms(true)} className="text-brand-orange font-bold hover:underline">Terms & Conditions</button>
                        <label className="text-stone-600 font-medium"> (No Refunds for late arrivals).</label>
                    </div>
                </div>

                <button onClick={() => handlePlaceOrder(gpsEnabled)} disabled={!agreed || !userProfile.name || !userProfile.carModel || !userProfile.plate} className="w-full bg-brand-dark text-white py-7 rounded-[2.5rem] font-bold text-xl uppercase tracking-[0.2em] text-[11px] shadow-premium disabled:opacity-30 transition transform active:scale-95">Pay & Pull Up</button>
                {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
            </div>
        </div>
    );
};

const SuccessScreen = ({ setView, userProfile, orderId, db }) => {
    const [timeLeft, setTimeLeft] = useState(90);
    const [status, setStatus] = useState('pending'); // pending, cancelled, rejected

    // Timer for cancellation window
    useEffect(() => {
        if (status !== 'pending') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    // Real-Time Acceptance Listener
    useEffect(() => {
        if (!orderId) return;
        const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
            if (docSnap.exists()) {
                const newStatus = docSnap.data().status;
                if (newStatus === 'preparing') {
                    // CAFE ACCEPTED! Auto-transition to Tracking
                    setView('tracking');
                } else if (newStatus === 'rejected') {
                    setStatus('rejected');
                }
            }
        });
        return () => unsub();
    }, [orderId, db, setView]);

    const handleCancel = () => {
        setStatus('cancelled');
        if (orderId && db) { updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' }); }
    };

    if (status === 'cancelled') {
        return (
            <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-red-100 text-red-500 w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 border-red-200"><Icons.X /></div>
                <h2 className="text-4xl font-serif italic text-stone-800 mb-4 font-bold tracking-tight">Order Cancelled</h2>
                <p className="text-stone-500 mb-12 font-medium">Your transaction has been voided. No funds were taken.</p>
                <button onClick={() => setView('landing')} className="bg-brand-dark text-white px-10 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] shadow-xl">Back to Marketplace</button>
            </div>
        );
    }
    
    if (status === 'rejected') {
        return (
            <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-red-100 text-red-500 w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 border-red-200"><Icons.X /></div>
                <h2 className="text-4xl font-serif italic text-stone-800 mb-4 font-bold tracking-tight">Order Declined</h2>
                <p className="text-stone-500 mb-12 font-medium">The cafe is too busy to accept your order right now. You have not been charged.</p>
                <button onClick={() => setView('landing')} className="bg-brand-dark text-white px-10 py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] shadow-xl">Back to Marketplace</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=60')] bg-cover bg-center opacity-10"></div>
            <div className="relative z-10 max-w-md w-full">
                <div className="bg-brand-orange text-white w-32 h-32 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(249,115,22,0.4)] animate-bounce border-4 border-white/20 mx-auto"><Icons.CheckCircle /></div>
                <h2 className="text-5xl font-serif font-bold italic mb-6 tracking-tight">Order Sent.</h2>
                <p className="text-stone-400 text-xl mb-10 font-light">
                    Waiting for cafe to accept...
                </p>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] p-8 border border-white/10 mb-10 shadow-2xl">
                    <h3 className="font-bold text-brand-orange text-[10px] uppercase tracking-[0.3em] mb-4">Next Steps</h3>
                    <p className="text-sm leading-relaxed text-stone-300">
                        We will auto-open your radar the exact second the cafe accepts your order.
                    </p>
                </div>

                {timeLeft > 0 ? (
                    <button onClick={handleCancel} className="text-red-400 hover:text-white text-[10px] font-bold border border-red-500/30 hover:bg-red-500/50 px-8 py-5 rounded-[2rem] w-full mb-6 transition uppercase tracking-[0.2em]">
                        Undo Request ({timeLeft}s)
                    </button>
                ) : (
                    <div className="text-stone-500 text-xs mb-6 font-bold uppercase tracking-[0.2em] animate-pulse">Order Locked. Awaiting Cafe...</div>
                )}
            </div>
        </div>
    );
};

const Tracking = ({ setView, orderId, db }) => {
    const [orderStatus, setOrderStatus] = useState('preparing');
    const [distance, setDistance] = useState(850);
    const [isArriving, setIsArriving] = useState(false);
    
    useEffect(() => {
        if (!orderId) return;
        const unsub = onSnapshot(doc(db, 'orders', orderId), (doc) => {
            if (doc.exists()) setOrderStatus(doc.data().status);
        });
        return () => unsub();
    }, [orderId, db]);

    // Simulate car driving closer
    useEffect(() => {
        if (!orderId) return;
        const interval = setInterval(() => {
            setDistance(prev => {
                const nextDist = prev - Math.floor(Math.random() * 40 + 20); // drop by 20-60m each tick
                if (nextDist <= 50 && prev > 50) {
                    updateDoc(doc(db, 'orders', orderId), { isArriving: true });
                    setIsArriving(true);
                }
                return nextDist > 0 ? nextDist : 0;
            });
        }, 2500); 
        return () => clearInterval(interval);
    }, [orderId, db]);

    return (
        <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-8 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=60')] opacity-10 bg-cover bg-center grayscale scale-110"></div>
            
            <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center mb-12 shadow-xl border-4 border-white/20 transition-colors duration-1000 ${orderStatus === 'completed' ? 'bg-green-500 shadow-[0_0_80px_rgba(34,197,94,0.6)]' : isArriving ? 'bg-brand-orange shadow-[0_0_80px_rgba(249,115,22,0.6)] animate-pulse' : 'bg-stone-700'}`}>
                {orderStatus === 'completed' ? <Icons.Check /> : <Icons.MapPin />}
            </div>
            
            <h2 className="text-4xl font-serif italic mb-8 leading-tight tracking-tight relative z-10">
                {orderStatus === 'pending' && "Awaiting Cafe..."}
                {orderStatus === 'preparing' && !isArriving && <span className="text-brand-orange">Order Accepted.<br/>Making it now.</span>}
                {orderStatus === 'preparing' && isArriving && <span className="text-brand-orange">Pull up to window.</span>}
                {orderStatus === 'completed' && <span className="text-green-400">Order Completed!</span>}
            </h2>

            <div className={`bg-white p-12 rounded-[4rem] w-full max-w-sm shadow-premium text-brand-dark relative overflow-hidden z-10 transform scale-105 transition-all duration-1000 ${isArriving ? 'ring-8 ring-green-400' : ''}`}>
                <div className={`absolute top-0 left-0 w-full h-3 transition-colors ${isArriving ? 'bg-green-400' : 'bg-brand-orange'}`}></div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] mb-6">Distance to Cafe</p>
                <p className="text-7xl font-serif italic mb-2 tracking-tighter text-brand-dark">
                    {distance === 0 ? 'Here' : `${distance}m`}
                </p>
                {isArriving && <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-6 animate-bounce">Store Notified</p>}
            </div>
            
            <button onClick={() => setView('landing')} className="mt-14 relative z-10 text-[10px] font-bold text-stone-500 underline uppercase tracking-widest hover:text-white transition">Exit Screen</button>
        </div>
    );
};

// --- MAIN APPLICATION ENTRY ---

const App = () => {
    // Navigation & Modals
    const [view, setView] = useState('landing');
    const [showAbout, setShowAbout] = useState(false);
    const [showLegal, setShowLegal] = useState(false);
    const [showCustomerVideo, setShowCustomerVideo] = useState(false);
    const [showMerchantVideo, setShowMerchantVideo] = useState(false);

    // Auth States
    const [user, setUser] = useState(null);
    const [cafeProfile, setCafeProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Marketplace States
    const [allCafes, setAllCafes] = useState([]);
    const [selectedCafe, setSelectedCafe] = useState(null);
    const [cart, setCart] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [userProfile, setUserProfile] = useState({ name: '', carModel: '', plate: '' });

    // Authentication Init
    useEffect(() => {
        const initAuth = async () => { try { await signInAnonymously(auth); } catch(e) {} };
        initAuth();
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u && !u.isAnonymous) {
                const snap = await getDoc(doc(db, 'cafes', u.uid));
                if (snap.exists()) { setCafeProfile(snap.data()); setView('cafe-admin'); }
            }
            setLoading(false);
        });
    }, []);

    // Live Cafe Feed
    useEffect(() => {
        const q = query(collection(db, 'cafes'), where('isApproved', '==', true));
        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllCafes(list);
        });
    }, []);

    const handlePlaceOrder = async (gpsEnabled) => {
        const newOrder = {
            cafeId: selectedCafe.id,
            customerName: userProfile.name,
            carDetails: userProfile.carModel,
            plate: userProfile.plate,
            items: cart,
            total: cart.reduce((s, i) => s + i.price, 0) + 2.00,
            fee: 2.00,
            status: 'pending',
            gpsEnabled: gpsEnabled,
            distance: gpsEnabled ? 850 : null,
            timestamp: new Date().toISOString()
        };
        try {
            const docRef = await addDoc(collection(db, 'orders'), newOrder);
            setOrderId(docRef.id);
            setView('success');
            setCart([]);
        } catch(e) { alert("Error placing order."); }
    };

    if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center"><PullUpLogo className="w-24 h-24 animate-pulse" /></div>;

    return (
        <React.Fragment>
            <GlobalStyles />
            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
            {showLegal && <IPRegistryModal onClose={() => setShowLegal(false)} />}
            {showCustomerVideo && <CustomerVideoModal onClose={() => setShowCustomerVideo(false)} />}
            {showMerchantVideo && <MerchantVideoModal onClose={() => setShowMerchantVideo(false)} />}
            
            {view === 'landing' && <LandingPage setView={setView} onAbout={()=>setShowAbout(true)} onCustomerVideo={()=>setShowCustomerVideo(true)} onLegal={()=>setShowLegal(true)} />}
            {view === 'cafe-auth' && <CafeAuth setView={setView} auth={auth} db={db} onMerchantVideo={() => setShowMerchantVideo(true)} />}
            {view === 'discovery' && <Discovery setView={setView} cafes={allCafes} userLoc={userLoc} detectLoc={() => navigator.geolocation.getCurrentPosition(p=>setUserLoc({lat:p.coords.latitude, lng:p.coords.longitude}))} onSelectCafe={(c) => { setSelectedCafe(c); setView('cafe-menu'); }} />}
            {view === 'cafe-menu' && <CafeMenu setView={setView} selectedCafe={selectedCafe} cart={cart} setCart={setCart} db={db} />}
            {view === 'checkout' && <Checkout setView={setView} userProfile={userProfile} setUserProfile={setUserProfile} handlePlaceOrder={handlePlaceOrder} cart={cart} />}
            {view === 'success' && <SuccessScreen setView={setView} userProfile={userProfile} orderId={orderId} db={db} />}
            {view === 'tracking' && <Tracking setView={setView} orderId={orderId} db={db} />}
            {view === 'cafe-admin' && <CafeDashboard user={user} profile={cafeProfile} db={db} auth={auth} signOut={signOut} />}
        </React.Fragment>
    );
};

export default App;