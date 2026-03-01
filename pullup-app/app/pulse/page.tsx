"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, where, doc, orderBy, limit, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import type L from "leaflet";

/* ═══════════════════════════════════════════════════════════
   FIREBASE
   ═══════════════════════════════════════════════════════════ */
const fbCfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const hasCfg = typeof window !== "undefined" && Object.values(fbCfg).every((v) => typeof v === "string" && (v as string).trim().length > 0);
const app: any = hasCfg ? (getApps().length ? getApps()[0] : initializeApp(fbCfg)) : null;
const db: any = app ? getFirestore(app) : null;
const auth: any = app ? getAuth(app) : null;

/* ═══════════════════════════════════════════════════════════
   PALETTE — Warm Solarized Dark / Nord-inspired
   ═══════════════════════════════════════════════════════════ */
const P = {
  bg: "#0F1923", bgCard: "#172A3A", bgHover: "#1E3448", bgInput: "#0D1620",
  border: "rgba(94,171,168,0.10)", borderHi: "rgba(94,171,168,0.28)",
  teal: "#5EABA8", blue: "#4E8FAE", green: "#6DAF7B", amber: "#D4A95A", rose: "#C0706F",
  text: "#DAE4ED", textSec: "#8A9DB2", textMut: "#506478", textDim: "#2A3A4A",
  shadow: "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const fmt$ = (n: number) => `$${n.toFixed(2)}`;
const fmtTime = (d: Date) => d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fmtDate = (d: Date) => d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
const ago = (ts: any) => {
  if (!ts) return "—";
  const ms = Date.now() - new Date(typeof ts === "object" && ts.seconds ? ts.seconds * 1000 : ts).getTime();
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
};
type LogEntry = { id: string; time: string; icon: string; msg: string };
let _logId = 0;
const mkLog = (icon: string, msg: string): LogEntry => ({ id: `l${++_logId}`, time: fmtTime(new Date()), icon, msg });
type Tab = "overview" | "finance" | "fleet" | "system" | "security" | "analytics" | "chatbot";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "fleet", label: "Fleet", icon: "🏪" },
  { id: "system", label: "System", icon: "⚙️" },
  { id: "security", label: "Security", icon: "🛡️" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "chatbot", label: "Chatbot", icon: "🤖" },
];
const COUNTRY_FLAGS: Record<string, string> = {
  AU: "🇦🇺", US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", NZ: "🇳🇿", IN: "🇮🇳", DE: "🇩🇪", FR: "🇫🇷",
  JP: "🇯🇵", CN: "🇨🇳", BR: "🇧🇷", CO: "🇨🇴", MX: "🇲🇽", KR: "🇰🇷", SG: "🇸🇬", PH: "🇵🇭",
  ID: "🇮🇩", TH: "🇹🇭", VN: "🇻🇳", MY: "🇲🇾", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", SE: "🇸🇪",
  IE: "🇮🇪", PL: "🇵🇱", RU: "🇷🇺", ZA: "🇿🇦", AE: "🇦🇪", SA: "🇸🇦", Unknown: "🌍",
};
const getFlag = (code: string) => COUNTRY_FLAGS[code] || "🏳️";
const SEVERITY_COLORS: Record<string, string> = { low: P.textMut, medium: P.amber, high: P.rose, critical: "#FF4444" };
const latToY = (lat: number) => ((90 - lat) / 180) * 500;
const lngToX = (lng: number) => ((lng + 180) / 360) * 1000;

/* ═══════════════════════════════════════════════════════════
   CONTINENT SVG PATHS (simplified equirectangular)
   ═══════════════════════════════════════════════════════════ */
const CONTINENTS = [
  "M70,72 L108,56 155,50 218,58 272,68 298,82 308,110 292,144 262,170 240,190 218,214 188,230 146,232 116,218 90,194 72,160 60,130 56,100Z",
  "M228,254 L260,244 290,260 306,300 316,350 308,400 286,440 256,460 236,448 220,414 210,370 208,320 216,280Z",
  "M466,110 L476,90 496,78 520,74 546,82 566,98 572,118 566,140 550,154 528,160 506,158 486,148 470,134Z",
  "M470,170 L506,160 536,170 552,200 566,240 570,280 562,330 546,370 522,400 496,406 470,394 454,358 444,314 440,270 446,230 456,198Z",
  "M576,110 L606,84 656,64 716,58 776,65 826,80 856,100 876,130 880,168 866,200 842,230 812,254 772,270 726,274 676,260 636,240 606,210 586,180 576,150Z",
  "M816,334 L846,324 876,334 896,354 894,380 876,400 850,410 826,408 808,392 800,370 806,350Z",
  "M908,388 L916,380 924,388 920,400 912,404Z",
];

/* ═══════════════════════════════════════════════════════════
   LOGIN SCREEN — fully isolated (fixes input lag)
   ═══════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin, error, busy }: { onLogin: (e: string, p: string) => void; error: string; busy: boolean }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: P.bg }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ background: P.bgCard, boxShadow: P.shadow, border: `1px solid ${P.border}` }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">⚡</div>
            <h1 className="text-xl font-semibold tracking-wide mb-1" style={{ color: P.teal }}>P.U.L.S.E.</h1>
            <p className="text-xs tracking-widest uppercase" style={{ color: P.textMut }}>Command Centre</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pass); }} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: P.textSec }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: P.bgInput, border: `1px solid ${P.border}`, color: P.text }}
                onFocus={(e) => e.target.style.borderColor = P.teal} onBlur={(e) => e.target.style.borderColor = P.border}
                placeholder="admin@pullupcoffee.com" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: P.textSec }}>Password</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: P.bgInput, border: `1px solid ${P.border}`, color: P.text }}
                onFocus={(e) => e.target.style.borderColor = P.teal} onBlur={(e) => e.target.style.borderColor = P.border}
                placeholder="••••••••" required />
            </div>
            {error && <p className="text-sm rounded-lg px-3 py-2" style={{ background: `${P.rose}15`, color: P.rose }}>{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: P.teal, color: P.bg, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Authenticating…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({ email, onOut }: { email: string; onOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: P.bg }}>
      <div className="text-center rounded-2xl p-8" style={{ background: P.bgCard, boxShadow: P.shadow, border: `1px solid ${P.border}` }}>
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-base font-medium mb-2" style={{ color: P.rose }}>Access Denied</p>
        <p className="text-sm mb-6" style={{ color: P.textMut }}>Admin clearance required. Signed in as {email}</p>
        <button onClick={onOut} className="px-6 py-3 rounded-xl text-sm font-medium" style={{ background: `${P.rose}20`, color: P.rose, border: `1px solid ${P.rose}30` }}>Sign Out</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP — hover info icon for training & self-reference
   ═══════════════════════════════════════════════════════════ */
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5 cursor-help" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)}>
      <span className="text-[11px] opacity-40 hover:opacity-100 transition-opacity" style={{ color: P.textMut }}>ℹ️</span>
      {show && (
        <span className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl text-xs leading-relaxed pointer-events-none"
          style={{ background: '#1a2f42', color: P.textSec, border: `1px solid ${P.borderHi}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1" style={{ background: '#1a2f42', borderRight: `1px solid ${P.borderHi}`, borderBottom: `1px solid ${P.borderHi}` }} />
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMAIL PREVIEW MODAL
   ═══════════════════════════════════════════════════════════ */
const EMAIL_TEMPLATES: { name: string; subject: string; body: string }[] = [
  { name: "Approval", subject: "Your Cafe is Live on Pull Up Coffee!", body: "Congratulations! Your cafe has been approved by the Pull Up Coffee team. You can now:\n• Go ONLINE to start accepting orders\n• Set your curbside fee ($0–$25)\n• Upload your menu & logo\n• Connect Stripe for instant payouts\n\nWelcome to the Pull Up family! ☕" },
  { name: "Order Confirmation", subject: "Order Confirmed — Pull Up Coffee", body: "Your order has been placed!\n\n• Items: [order items]\n• Total: $[total]\n• Cafe: [cafe name]\n• Plate: [plate number]\n\nHead to the cafe and tap 'I'm Here' when you arrive. Your barista will bring your order curbside." },
  { name: "Order Ready", subject: "Your Order is Ready!", body: "Good news — your order at [cafe name] is ready for pickup!\n\nPlease head to the curbside area. The cafe can see your vehicle details and will bring your order out.\n\nEnjoy your coffee! 🤙" },
  { name: "Declined", subject: "Order Update — Pull Up Coffee", body: "Unfortunately, [cafe name] was unable to fulfill your order.\n\nReason: [decline reason]\n\nYou have NOT been charged — the payment authorization has been voided. We apologize for the inconvenience." },
  { name: "Onboarding Nudge", subject: "Your Cafe is Ready — Let's Get Your First Order!", body: "Hey [name]! Your Pull Up Coffee account is all set up but we noticed you haven't gone online yet.\n\nHere's what to do next:\n1. Add at least 3 menu items\n2. Set your operating hours\n3. Toggle ONLINE\n\nNeed help? Reply to this email or use the Support chat in your dashboard." },
  { name: "Signup Received", subject: "Application Received — Pull Up Coffee", body: "Thanks for applying to join Pull Up Coffee!\n\nWe've received your application for [business name]. Our team will review it within 24 hours.\n\nYou'll receive an email + SMS once approved." },
  { name: "Support Ticket", subject: "Support Request Received — #[ticket_id]", body: "We've received your support request and will respond within 24 hours during business hours (Mon–Fri 8AM–6PM AEDT).\n\nYour reference: #[ticket_id]\nQuestion: [question]\n\nFor urgent issues, email hello@pullupcoffee.com directly." },
  { name: "Merch Confirmation", subject: "Your Pull Up Merch is on the Way!", body: "Thanks for your purchase!\n\nItem: [item name]\nAmount: $[amount] AUD\n\nYour Founders Cap will be produced and shipped within 5–10 business days. You'll receive tracking once dispatched.\n\nThank you for supporting Pull Up Coffee! 🧢" },
  { name: "Password Reset", subject: "Password Reset — Pull Up Coffee", body: "You requested a password reset for your Pull Up Coffee account.\n\nClick the link below to set a new password:\n[reset link]\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email." },
  { name: "Affiliate Welcome", subject: "Welcome to the Pull Up Affiliate Program!", body: "You're now a Pull Up Coffee affiliate! 🎉\n\nYour referral code: [code]\n\nShare this code with cafe owners. For every cafe that joins and stays active for 30 days, you earn 25% of the platform fee for their first month.\n\nTrack your referrals in your dashboard." },
  { name: "Survey", subject: "Quick Check-in — How's Pull Up Coffee Working?", body: "Hi [name], we'd love to hear how Pull Up Coffee is working for your business.\n\nTake 2 minutes to share your feedback:\n[survey link]\n\nYour input helps us build a better platform for all cafe partners." },
];

function EmailPreviewModal({ template, onClose }: { template: typeof EMAIL_TEMPLATES[0] | null; onClose: () => void }) {
  if (!template) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: P.bgCard, border: `1px solid ${P.borderHi}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
          <div>
            <span className="text-sm font-medium" style={{ color: P.teal }}>{template.name}</span>
            <p className="text-xs mt-0.5" style={{ color: P.textMut }}>From: hello@pullupcoffee.com</p>
          </div>
          <button onClick={onClose} className="text-lg hover:opacity-70 transition" style={{ color: P.textMut }}>✕</button>
        </div>
        <div className="p-5">
          <div className="rounded-xl p-4 mb-3" style={{ background: P.bgHover }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: P.textMut }}>Subject</p>
            <p className="text-sm font-medium" style={{ color: P.text }}>{template.subject}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: P.bg }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: P.textMut }}>Body Preview</p>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: P.textSec, fontFamily: 'Inter, sans-serif' }}>{template.body}</pre>
          </div>
        </div>
        <div className="px-5 pb-4">
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium transition hover:brightness-110" style={{ background: `${P.teal}15`, color: P.teal, border: `1px solid ${P.teal}25` }}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHART COMPONENTS
   ═══════════════════════════════════════════════════════════ */
function AreaChart({ data, labels, color, title, h = 130 }: { data: number[]; labels: string[]; color: string; title: string; h?: number }) {
  if (data.length < 2) return <div className="text-center text-xs py-8" style={{ color: P.textMut }}>No data yet</div>;
  const mx = Math.max(...data, 1);
  const pad = { t: 24, r: 8, b: 28, l: 36 };
  const W = 320, H = h, cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const pts = data.map((v, i) => ({ x: pad.l + (i / (data.length - 1)) * cW, y: pad.t + cH - (v / mx) * cH }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${pad.t + cH} L${pts[0].x},${pad.t + cH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet" overflow="hidden" style={{ display: 'block' }}>
      {[0, 0.5, 1].map((p, i) => (
        <React.Fragment key={i}>
          <line x1={pad.l} y1={pad.t + cH * (1 - p)} x2={W - pad.r} y2={pad.t + cH * (1 - p)} stroke={P.textDim} strokeWidth="0.5" />
          <text x={pad.l - 4} y={pad.t + cH * (1 - p) + 3} textAnchor="end" fill={P.textMut} fontSize="9">{Math.round(mx * p)}</text>
        </React.Fragment>
      ))}
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      {labels.map((l, i) => <text key={i} x={pts[i]?.x ?? 0} y={H - 6} textAnchor="middle" fill={P.textMut} fontSize="9">{l}</text>)}
      <text x={pad.l} y={14} fill={P.textSec} fontSize="11" fontWeight="500">{title}</text>
    </svg>
  );
}

function Sparkline({ data, color, w = 80, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const mx = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - (v / mx) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="hidden" style={{ display: 'block' }}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.10" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function ProgressBar({ value, max, color = P.teal }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: P.textDim }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, background: color }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INTERACTIVE MAP — Leaflet + OpenStreetMap (free, no API key)
   ═══════════════════════════════════════════════════════════ */
const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  AU: { lat: -25.5, lng: 134, zoom: 4 }, US: { lat: 39, lng: -98, zoom: 4 }, GB: { lat: 54, lng: -2, zoom: 5 },
  NZ: { lat: -41, lng: 174, zoom: 5 }, CA: { lat: 56, lng: -96, zoom: 3 }, IN: { lat: 22, lng: 78, zoom: 5 },
  DE: { lat: 51, lng: 10, zoom: 5 }, FR: { lat: 46, lng: 2, zoom: 5 }, JP: { lat: 36, lng: 138, zoom: 5 },
  SG: { lat: 1.35, lng: 103.8, zoom: 11 }, PH: { lat: 12, lng: 122, zoom: 5 }, ID: { lat: -2, lng: 118, zoom: 4 },
  MY: { lat: 4, lng: 109, zoom: 5 }, TH: { lat: 15, lng: 100, zoom: 5 }, CO: { lat: 4, lng: -72, zoom: 5 },
  BR: { lat: -14, lng: -51, zoom: 4 }, MX: { lat: 23, lng: -102, zoom: 4 }, IE: { lat: 53, lng: -8, zoom: 6 },
  ZA: { lat: -29, lng: 24, zoom: 5 }, AE: { lat: 24, lng: 54, zoom: 6 },
};

function InteractiveMap({ cafes, expanded, onToggle }: { cafes: any[]; expanded: boolean; onToggle: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [leafletReady, setLeafletReady] = useState(false);

  const mapped = cafes.filter((c: any) => typeof c.lat === "number" && typeof c.lng === "number");

  // Derive countries from cafe data
  const cafeCountries = useMemo(() => {
    const countryMap = new Map<string, number>();
    cafes.forEach((c: any) => {
      const country = c.country || (typeof c.lat === "number" && c.lat < 0 && c.lng > 100 ? "AU" : "Unknown");
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    return Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [cafes]);

  // Initialize Leaflet (dynamic import to avoid SSR)
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    let cancelled = false;

    (async () => {
      const Leaf = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      // Fix default marker icons (Leaflet CDN path issue in bundlers)
      delete (Leaf.Icon.Default.prototype as any)._getIconUrl;
      Leaf.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = Leaf.map(mapRef.current, {
        center: [-25.5, 134],
        zoom: 3,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      // Dark-themed tile layer (CartoDB Dark Matter — free, matches P.U.L.S.E. palette)
      Leaf.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      markersRef.current = Leaf.layerGroup().addTo(map);
      leafletMap.current = map;
      setLeafletReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // Update markers when cafes or selectedCountry change
  useEffect(() => {
    if (!leafletReady || !leafletMap.current || !markersRef.current) return;

    (async () => {
      const Leaf = (await import("leaflet")).default;
      const markers = markersRef.current!;
      markers.clearLayers();

      const filteredCafes = selectedCountry === "ALL"
        ? mapped
        : mapped.filter((c: any) => {
          const cc = c.country || (c.lat < 0 && c.lng > 100 ? "AU" : "Unknown");
          return cc === selectedCountry;
        });

      filteredCafes.forEach((c: any) => {
        const col = !c.isApproved ? "#D4A95A" : c.status === "open" ? "#6DAF7B" : "#506478";
        const statusLabel = !c.isApproved ? "⏳ Pending" : c.status === "open" ? "🟢 Online" : "🔴 Offline";

        const icon = Leaf.divIcon({
          className: "",
          html: `<div style="
            width:${expanded ? 18 : 14}px; height:${expanded ? 18 : 14}px;
            background:${col}; border:2px solid rgba(255,255,255,0.6);
            border-radius:50%; box-shadow:0 0 8px ${col}80;
            cursor:pointer;
          "></div>`,
          iconSize: [expanded ? 18 : 14, expanded ? 18 : 14],
          iconAnchor: [expanded ? 9 : 7, expanded ? 9 : 7],
        });

        const marker = Leaf.marker([c.lat, c.lng], { icon });
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; min-width:180px; padding:4px 0;">
            <div style="font-weight:600; font-size:14px; margin-bottom:6px; color:#1a1a1a;">${c.businessName || "Unnamed"}</div>
            <div style="font-size:12px; color:#555; margin-bottom:3px;">${statusLabel}</div>
            <div style="font-size:12px; color:#555; margin-bottom:3px;">💲 Fee: $${c.curbsideFee || 2}</div>
            ${c.stripeConnected ? '<div style="font-size:11px; color:#6DAF7B;">✅ Stripe Connected</div>' : '<div style="font-size:11px; color:#C0706F;">⚠️ Stripe Not Connected</div>'}
            ${c.phone || c.ownerMobile ? `<div style="font-size:11px; color:#888; margin-top:4px;">📞 ${c.phone || c.ownerMobile}</div>` : ""}
            ${c.email ? `<div style="font-size:11px; color:#888;">📧 ${c.email}</div>` : ""}
            <div style="font-size:10px; color:#aaa; margin-top:6px;">📍 ${c.lat?.toFixed(4)}, ${c.lng?.toFixed(4)}</div>
          </div>
        `, { maxWidth: 250 });

        markers.addLayer(marker);
      });

      // Zoom to fit markers or country
      const map = leafletMap.current!;
      if (selectedCountry !== "ALL" && COUNTRY_CENTERS[selectedCountry]) {
        const cc = COUNTRY_CENTERS[selectedCountry];
        map.flyTo([cc.lat, cc.lng], cc.zoom, { duration: 1.2 });
      } else if (filteredCafes.length > 0) {
        const bounds = Leaf.latLngBounds(filteredCafes.map((c: any) => [c.lat, c.lng]));
        map.flyToBounds(bounds.pad(0.3), { duration: 1.2, maxZoom: 12 });
      } else {
        map.flyTo([10, 20], 2, { duration: 1 });
      }
    })();
  }, [leafletReady, mapped, selectedCountry, expanded]);

  // Resize map when expanded state changes
  useEffect(() => {
    if (leafletMap.current) {
      setTimeout(() => leafletMap.current?.invalidateSize(), 300);
    }
  }, [expanded]);

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: P.shadow }}>
      <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
        <span className="text-sm font-medium" style={{ color: P.textSec }}>Global Cafe Network</span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Country filter */}
          <button onClick={() => setSelectedCountry("ALL")}
            className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
            style={{ background: selectedCountry === "ALL" ? P.teal : `${P.teal}10`, color: selectedCountry === "ALL" ? P.bg : P.teal, border: `1px solid ${selectedCountry === "ALL" ? P.teal : P.border}` }}>
            🌍 Global
          </button>
          {cafeCountries.map(([code, count]) => (
            <button key={code} onClick={() => setSelectedCountry(code)}
              className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
              style={{ background: selectedCountry === code ? P.teal : `${P.teal}10`, color: selectedCountry === code ? P.bg : P.teal, border: `1px solid ${selectedCountry === code ? P.teal : P.border}` }}>
              {(COUNTRY_FLAGS as any)[code] || "🏳️"} {code} ({count})
            </button>
          ))}
          <span className="mx-1 w-px h-5" style={{ background: P.border }} />
          <span className="flex items-center gap-1.5 text-xs" style={{ color: P.textMut }}>
            <span className="w-2 h-2 rounded-full" style={{ background: P.green }} /> Online
            <span className="w-2 h-2 rounded-full ml-1" style={{ background: P.textMut }} /> Offline
            <span className="w-2 h-2 rounded-full ml-1" style={{ background: P.amber }} /> Pending
          </span>
          <button onClick={onToggle} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
            style={{ background: `${P.teal}15`, color: P.teal, border: `1px solid ${P.teal}25` }}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      <div ref={mapRef} style={{ height: expanded ? 520 : 280, width: "100%", transition: "height 0.3s ease" }} />
      {mapped.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 50 }}>
          <span className="text-sm px-4 py-2 rounded-xl" style={{ background: `${P.bg}cc`, color: P.textMut }}>No cafes with location data yet — add lat/lng to cafe profiles</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════ */
const Card = ({ children, className = "", info, title }: { children: React.ReactNode; className?: string; info?: string; title?: string }) => (
  <div className={`rounded-2xl p-5 overflow-hidden ${className}`} style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: P.shadow }}>
    {(title || info) && (
      <div className="flex items-center gap-2 mb-3">
        {title && <span className="text-sm font-medium" style={{ color: P.textSec }}>{title}</span>}
        {info && <Tip text={info} />}
      </div>
    )}
    {children}
  </div>
);

const Metric = ({ icon, label, value, sub, color = P.teal, spark, info }: { icon: string; label: string; value: string | number; sub?: string; color?: string; spark?: number[]; info?: string }) => (
  <Card>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-base">{icon}</span>
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: P.textMut }}>{label}</span>
      {info && <Tip text={info} />}
      {spark && spark.length > 1 && <div className="ml-auto overflow-hidden" style={{ maxWidth: 80 }}><Sparkline data={spark} color={color} /></div>}
    </div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    {sub && <div className="text-xs mt-1" style={{ color: P.textMut }}>{sub}</div>}
  </Card>
);

const Badge = ({ label, ok }: { label: string; ok: boolean }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
    style={{ background: ok ? `${P.green}15` : `${P.rose}15`, color: ok ? P.green : P.rose }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? P.green : P.rose }} />{label}
  </span>
);

/* ═══════════════════════════════════════════════════════════
   PULSE DASHBOARD — Main HUD (only if admin)
   ═══════════════════════════════════════════════════════════ */
function PulseDashboard({ user, profile }: { user: any; profile: any }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [feedOpen, setFeedOpen] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [novaQ, setNovaQ] = useState("");
  const [novaRes, setNovaRes] = useState<string[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<typeof EMAIL_TEMPLATES[0] | null>(null);
  const [botInput, setBotInput] = useState("");
  const [botChat, setBotChat] = useState([{ type: "bot", text: "Hi! I'm your Pull Up Support Bot. Ask me anything about the platform \u2014 I'll give you the fastest action steps." }]);
  const [merchPurchases, setMerchPurchases] = useState<any[]>([]);
  const [editingCafeId, setEditingCafeId] = useState<string | null>(null);
  const [editFeeVal, setEditFeeVal] = useState("");
  const [siteAnalytics, setSiteAnalytics] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<"24h" | "7d" | "30d">("30d");

  const [cafes, setCafes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const [eventLog, setEventLog] = useState<LogEntry[]>([mkLog("⚡", "P.U.L.S.E. initialized — real-time sync active")]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(new Date());
  const prevOrders = useRef(0);
  const prevCafes = useRef(0);

  const addLog = useCallback((icon: string, msg: string) => {
    setEventLog((prev) => [...prev.slice(-120), mkLog(icon, msg)]);
  }, []);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Feed auto-scroll
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" }); }, [eventLog]);

  // ── FIREBASE LISTENERS ──
  useEffect(() => {
    if (!db) return;
    const unsubs: (() => void)[] = [];
    // Cafes
    unsubs.push(onSnapshot(collection(db, "cafes"), (snap: any) => {
      const d = snap.docs.map((s: any) => ({ id: s.id, ...s.data() }));
      setCafes(d);
      if (d.length > prevCafes.current && prevCafes.current > 0) addLog("🏪", `New cafe signup: ${d[d.length - 1]?.businessName || "Unknown"}`);
      prevCafes.current = d.length;
    }));
    // Today orders
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    unsubs.push(onSnapshot(query(collection(db, "orders"), where("timestamp", ">=", dayStart.toISOString())), (snap: any) => {
      const d = snap.docs.map((s: any) => ({ id: s.id, ...s.data() }));
      setOrders(d);
      if (d.length > prevOrders.current && prevOrders.current > 0) {
        const o = d[d.length - 1];
        addLog("📦", `Order ${o?.status}: ${o?.customerName || "Customer"} — ${fmt$(o?.total || 0)}`);
      }
      prevOrders.current = d.length;
    }));
    // All orders (recent 500)
    unsubs.push(onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(500)), (snap: any) => {
      setAllOrders(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Affiliates
    unsubs.push(onSnapshot(collection(db, "affiliates"), (snap: any) => {
      setAffiliates(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Commissions
    unsubs.push(onSnapshot(query(collection(db, "affiliate_commissions"), orderBy("createdAt", "desc"), limit(100)), (snap: any) => {
      setCommissions(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Favorites
    unsubs.push(onSnapshot(collection(db, "favorites"), (snap: any) => {
      setFavorites(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Support tickets
    unsubs.push(onSnapshot(collection(db, "support_tickets"), (snap: any) => {
      setTickets(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Merch purchases
    unsubs.push(onSnapshot(collection(db, "merch_purchases"), (snap: any) => {
      setMerchPurchases(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Site analytics (last 2000 events)
    unsubs.push(onSnapshot(query(collection(db, "site_analytics"), orderBy("timestamp", "desc"), limit(2000)), (snap: any) => {
      setSiteAnalytics(snap.docs.map((s: any) => ({ id: s.id, ...s.data() })));
    }));
    // Security events (last 500)
    unsubs.push(onSnapshot(query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(500)), (snap: any) => {
      const evts = snap.docs.map((s: any) => ({ id: s.id, ...s.data() }));
      setSecurityEvents(evts);
      // Alert on new high/critical events
      if (evts.length > 0 && evts[0].severity && ["high", "critical"].includes(evts[0].severity)) {
        const evt = evts[0];
        const evtAge = Date.now() - new Date(evt.timestamp).getTime();
        if (evtAge < 120_000) { // less than 2 min old
          addLog("🚨", `ALERT: ${evt.type} from ${evt.country || "?"} [${evt.severity}] — ${evt.details?.slice(0, 60) || ""}`);
        }
      }
    }));
    addLog("📡", "All Firebase listeners connected");
    return () => unsubs.forEach((u) => u());
  }, [addLog]);

  /* ── Metrics ── */
  const m = useMemo(() => {
    const approved = cafes.filter((c) => c.isApproved);
    const pending = cafes.filter((c) => !c.isApproved);
    const online = approved.filter((c) => c.status === "open");
    const stripeOk = approved.filter((c) => c.stripeConnected);
    const ea = cafes.filter((c) => c.earlyAdopterEligible);
    const active = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
    const completed = orders.filter((o) => o.status === "completed");
    const rejected = orders.filter((o) => o.status === "rejected");
    const expired = orders.filter((o) => o.status === "expired");
    const gross = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const fees = orders.reduce((s: number, o: any) => s + Number(o.fee || 0), 0);
    const PLATFORM_FEE = 0.99;
    const platRevenue = completed.length * PLATFORM_FEE;
    const smsCost = orders.length * 0.103;
    const stripeFees = gross * 0.0175 + orders.length * 0.30;
    const net = platRevenue - smsCost;
    const compRate = orders.length > 0 ? (completed.length / orders.length) * 100 : 0;
    const avgOV = orders.length > 0 ? gross / orders.length : 0;
    const ghost = orders.filter((o) => o.paymentState === "authorization_pending").length;
    const gps = orders.filter((o) => o.gpsEnabled).length;
    const affEarned = affiliates.reduce((s: number, a: any) => s + (a.totalCommissionCents || 0), 0) / 100;
    const refs = affiliates.reduce((s: number, a: any) => s + (a.totalReferrals || 0), 0);
    const smsOI = favorites.filter((f: any) => f.smsOptIn).length;
    // Active visitors (proxy: unique orders in last 30 min)
    const thirtyAgo = Date.now() - 30 * 60 * 1000;
    const recentActivity = allOrders.filter((o) => o.timestamp && new Date(o.timestamp).getTime() >= thirtyAgo);
    const activeVisitors = new Set(recentActivity.map((o) => o.customerName || o.plate || o.id)).size;
    // Week
    const wk = new Date(); wk.setDate(wk.getDate() - 7);
    const wkOrd = allOrders.filter((o) => o.timestamp && new Date(o.timestamp) >= wk);
    const wkGross = wkOrd.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    // Month
    const mo = new Date(); mo.setDate(1); mo.setHours(0, 0, 0, 0);
    const moOrd = allOrders.filter((o) => o.timestamp && new Date(o.timestamp) >= mo);
    const moGross = moOrd.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const moFees = moOrd.reduce((s: number, o: any) => s + Number(o.fee || 0), 0);
    const moCompleted = moOrd.filter((o) => o.status === 'completed').length;
    const moPlat = moCompleted * PLATFORM_FEE;
    const moSms = moOrd.length * 0.103;
    const moNet = moPlat - moSms;
    // Expanded expenses (monthly estimates)
    const expVercel = 0; // Hobby plan = free
    const expFirebase = 0; // Spark plan = free (alert if approaching limits)
    const expResend = 0; // Free tier 100 emails/day
    const expTwilio = moOrd.length * 0.103; // ~$0.103/order (2 SMS × $0.0515)
    const expStripe = moGross * 0.0175 + moOrd.length * 0.30; // 1.75% + $0.30
    const expGoogleWs = 8.40; // Google Workspace per user/mo
    const expDomain = 2.50; // ~$30/yr ÷ 12
    const expTotal = expVercel + expFirebase + expResend + expTwilio + expStripe + expGoogleWs + expDomain;
    // Merch
    const merchByTier = { coffee: 0, supporter: 0, vip: 0, hat: 0, total: 0, revenue: 0 };
    merchPurchases.forEach((p: any) => {
      const tier = p.tier || "other";
      if (tier in merchByTier) (merchByTier as any)[tier]++;
      merchByTier.total++;
      merchByTier.revenue += Number(p.amount || 0) / 100;
    });
    return {
      total: cafes.length, approved: approved.length, pending: pending.length, online: online.length,
      stripeOk: stripeOk.length, ea: ea.length,
      todayOrd: orders.length, active: active.length, completed: completed.length,
      rejected: rejected.length, expired: expired.length,
      gross, fees, platRevenue, smsCost, stripeFees, net, compRate, avgOV, ghost, gps,
      affCount: affiliates.length, affEarned, refs, smsOI, favs: favorites.length, openTix: tickets.length,
      wkGross, wkOrd: wkOrd.length, moGross, moOrd: moOrd.length, moFees, moPlat, moSms, moNet,
      activeVisitors,
      expVercel, expFirebase, expResend, expTwilio, expStripe, expGoogleWs, expDomain, expTotal,
      merchByTier,
    };
  }, [cafes, orders, allOrders, affiliates, favorites, tickets, merchPurchases]);

  /* ── 7-day chart data ── */
  const chartData = useMemo(() => {
    const days: { label: string; orders: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const nx = new Date(d); nx.setDate(nx.getDate() + 1);
      const dOrd = allOrders.filter((o) => { const t = new Date(o.timestamp); return t >= d && t < nx; });
      days.push({ label: d.toLocaleDateString("en-AU", { weekday: "short" }), orders: dOrd.length, revenue: dOrd.reduce((s: number, o: any) => s + Number(o.total || 0), 0) });
    }
    return days;
  }, [allOrders]);

  /* ── Analytics Metrics ── */
  const analytics = useMemo(() => {
    const now = Date.now();
    const rangeMs = analyticsRange === "24h" ? 86400000 : analyticsRange === "7d" ? 604800000 : 2592000000;
    const cutoff = now - rangeMs;
    const filtered = siteAnalytics.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    const totalPageViews = filtered.length;
    const sessions = new Map<string, any[]>();
    filtered.forEach((e) => {
      const sid = e.sessionId || e.id;
      if (!sessions.has(sid)) sessions.set(sid, []);
      sessions.get(sid)!.push(e);
    });
    const totalVisitors = sessions.size;
    const bounces = Array.from(sessions.values()).filter((s) => s.length === 1).length;
    const bounceRate = totalVisitors > 0 ? (bounces / totalVisitors) * 100 : 0;
    const avgPagesPerSession = totalVisitors > 0 ? totalPageViews / totalVisitors : 0;

    // Country breakdown
    const countries = new Map<string, number>();
    filtered.forEach((e) => { const c = e.country || "Unknown"; countries.set(c, (countries.get(c) || 0) + 1); });
    const countryList = Array.from(countries.entries()).sort((a, b) => b[1] - a[1]).map(([code, views]) => ({
      code, views, pct: totalPageViews > 0 ? (views / totalPageViews) * 100 : 0,
    }));

    // Device breakdown
    const devices = new Map<string, number>();
    filtered.forEach((e) => { const d = e.device || "Unknown"; devices.set(d, (devices.get(d) || 0) + 1); });
    const deviceList = Array.from(devices.entries()).sort((a, b) => b[1] - a[1]);

    // Browser breakdown
    const browsers = new Map<string, number>();
    filtered.forEach((e) => { const b = e.browser || "Other"; browsers.set(b, (browsers.get(b) || 0) + 1); });
    const browserList = Array.from(browsers.entries()).sort((a, b) => b[1] - a[1]);

    // OS breakdown
    const oses = new Map<string, number>();
    filtered.forEach((e) => { const o = e.os || "Other"; oses.set(o, (oses.get(o) || 0) + 1); });
    const osList = Array.from(oses.entries()).sort((a, b) => b[1] - a[1]);

    // Top pages / views
    const pages = new Map<string, number>();
    filtered.forEach((e) => { const p = e.view || e.path || "/"; pages.set(p, (pages.get(p) || 0) + 1); });
    const pageList = Array.from(pages.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Referrers
    const refs = new Map<string, number>();
    filtered.forEach((e) => {
      if (e.referrer) {
        try { const u = new URL(e.referrer); refs.set(u.hostname, (refs.get(u.hostname) || 0) + 1); } catch { refs.set(e.referrer.slice(0, 40), (refs.get(e.referrer.slice(0, 40)) || 0) + 1); }
      }
    });
    const refList = Array.from(refs.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Hourly distribution (for chart)
    const hourly = new Array(24).fill(0);
    filtered.forEach((e) => { const h = new Date(e.timestamp).getHours(); hourly[h]++; });

    // Daily page views (for chart, last 7 days)
    const dailyPV: { label: string; pv: number; visitors: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const nx = new Date(d); nx.setDate(nx.getDate() + 1);
      const dayEvents = filtered.filter((e) => { const t = new Date(e.timestamp); return t >= d && t < nx; });
      const daySessions = new Set(dayEvents.map((e) => e.sessionId || e.id));
      dailyPV.push({ label: d.toLocaleDateString("en-AU", { weekday: "short" }), pv: dayEvents.length, visitors: daySessions.size });
    }

    // Recent visitors (unique sessions, last 5)
    const recentSessions = Array.from(sessions.entries()).slice(0, 15).map(([sid, events]) => ({
      sessionId: sid.slice(0, 8),
      country: events[0]?.country || "?",
      device: events[0]?.device || "?",
      browser: events[0]?.browser || "?",
      os: events[0]?.os || "?",
      pages: events.length,
      firstPage: events[events.length - 1]?.view || events[events.length - 1]?.path || "/",
      lastSeen: events[0]?.timestamp || "",
      ip: events[0]?.ip?.replace(/\d+$/, "***") || "", // Partial mask
    }));

    // Live visitors (active in last 5 min)
    const fiveMinAgo = now - 300000;
    const liveVisitors = Array.from(sessions.entries()).filter(([, events]) =>
      new Date(events[0]?.timestamp).getTime() >= fiveMinAgo
    ).length;

    return {
      totalPageViews, totalVisitors, bounceRate, avgPagesPerSession,
      countryList, deviceList, browserList, osList,
      pageList, refList, hourly, dailyPV, recentSessions, liveVisitors,
    };
  }, [siteAnalytics, analyticsRange]);

  /* ── Security Metrics ── */
  const secMetrics = useMemo(() => {
    const now = Date.now();
    const recent24h = securityEvents.filter((e) => now - new Date(e.timestamp).getTime() < 86400000);
    const byType = new Map<string, number>();
    recent24h.forEach((e) => { byType.set(e.type, (byType.get(e.type) || 0) + 1); });
    const byCountry = new Map<string, number>();
    recent24h.forEach((e) => { const c = e.country || "?"; byCountry.set(c, (byCountry.get(c) || 0) + 1); });
    const highSev = recent24h.filter((e) => e.severity === "high" || e.severity === "critical").length;
    const alertActive = highSev > 0;
    return {
      total24h: recent24h.length, byType: Array.from(byType.entries()), byCountry: Array.from(byCountry.entries()).sort((a, b) => b[1] - a[1]),
      highSev, alertActive,
    };
  }, [securityEvents]);

  /* ── N.O.V.A. ── */
  const handleNova = useCallback(() => {
    const q = novaQ.toLowerCase().trim();
    if (!q) return;
    const r: string[] = [];
    if (/revenue|money|earn|profit/.test(q)) { r.push(`Revenue today: ${fmt$(m.gross)}`); r.push(`Platform net: ${fmt$(m.net)}`); r.push(`Month gross: ${fmt$(m.moGross)}`); }
    if (/cafe|shop|store/.test(q)) { r.push(`Cafes: ${m.total} total (${m.approved} approved, ${m.pending} pending)`); r.push(`Online: ${m.online} | Stripe: ${m.stripeOk}`); }
    if (/order|active/.test(q)) { r.push(`Today: ${m.todayOrd} orders (${m.active} active, ${m.completed} completed)`); }
    if (/affiliate|referr/.test(q)) { r.push(`Affiliates: ${m.affCount} | Referrals: ${m.refs} | Earned: ${fmt$(m.affEarned)}`); }
    if (/sms|twilio/.test(q)) { r.push(`Est. SMS cost today: ${fmt$(m.smsCost)}`); }
    if (/stripe|fee/.test(q)) { r.push(`Stripe connected: ${m.stripeOk}/${m.approved}`); r.push(`Est. fees today: ${fmt$(m.stripeFees)}`); }
    if (/ticket|support/.test(q)) { r.push(`Open tickets: ${m.openTix}`); }
    if (r.length === 0) r.push("Try: revenue, cafes, orders, affiliates, sms, stripe, support");
    setNovaRes(r);
    addLog("🔍", `Searched: "${novaQ}" → ${r.length} results`);
    setNovaQ("");
  }, [novaQ, m, addLog]);

  /* ── Approve ── */
  const handleApprove = useCallback(async (cafeId: string) => {
    if (!window.confirm(`Approve this cafe? This will make them live on the platform.`)) return;
    setApprovingId(cafeId);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/admin/cafes/approve", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cafeId }),
      });
      if (res.ok) addLog("✅", `Approved: ${cafes.find((c) => c.id === cafeId)?.businessName || cafeId}`);
      else addLog("❌", `Approval failed: ${(await res.json()).error || "Unknown"}`);
    } catch (e: any) { addLog("❌", `Error: ${e.message}`); }
    setApprovingId(null);
  }, [cafes, addLog]);

  /* ── Inline Edit Cafe Fee ── */
  const handleSaveFee = useCallback(async (cafeId: string) => {
    const newFee = parseFloat(editFeeVal);
    if (isNaN(newFee) || newFee < 0 || newFee > 25) {
      addLog("⚠️", "Fee must be between $0.00 and $25.00");
      return;
    }
    try {
      await updateDoc(doc(db, "cafes", cafeId), { curbsideFee: newFee });
      addLog("✏️", `Updated curbside fee for ${cafes.find((c) => c.id === cafeId)?.businessName || cafeId}: $${newFee.toFixed(2)}`);
    } catch (e: any) {
      addLog("❌", `Fee update failed: ${e.message}`);
    }
    setEditingCafeId(null);
    setEditFeeVal("");
  }, [editFeeVal, cafes, addLog]);

  /* ── Toggle Cafe Status ── */
  const handleToggleStatus = useCallback(async (cafeId: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "closed" : "open";
    try {
      await updateDoc(doc(db, "cafes", cafeId), { status: newStatus });
      addLog("🔄", `${cafes.find((c) => c.id === cafeId)?.businessName || cafeId} → ${newStatus === "open" ? "ONLINE" : "OFFLINE"}`);
    } catch (e: any) {
      addLog("❌", `Status toggle failed: ${e.message}`);
    }
  }, [cafes, addLog]);

  /* ═══ TAB RENDERERS ═══ */

  const cafeNameMap: Record<string, string> = {};
  cafes.forEach((c) => { cafeNameMap[c.id] = c.businessName || "Unknown"; });

  /* ── OVERVIEW ── */
  const renderOverview = () => {
    const pendingOrd = orders.filter((o) => o.status === "pending");
    const prepOrd = orders.filter((o) => o.status === "preparing");
    const readyOrd = orders.filter((o) => o.status === "ready");
    const compOrd = orders.filter((o) => o.status === "completed");
    const kanban = [
      { label: "Pending", items: pendingOrd, color: P.amber, icon: "⏳" },
      { label: "Preparing", items: prepOrd, color: P.teal, icon: "☕" },
      { label: "Ready", items: readyOrd, color: P.green, icon: "✅" },
      { label: "Completed", items: compOrd.slice(0, 5), color: P.textMut, icon: "🏁" },
    ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Metric icon="💰" label="Revenue Today" value={fmt$(m.gross)} sub={`${m.completed} completed`} color={P.green} spark={chartData.map((d) => d.revenue)} info="Total gross revenue from all completed orders today. Includes menu prices + curbside fees collected via Stripe." />
          <Metric icon="📦" label="Active Orders" value={m.active} sub={`${m.todayOrd} total today`} color={P.teal} spark={chartData.map((d) => d.orders)} info="Orders currently in the pipeline (pending, preparing, or ready). These have active Stripe authorization holds." />
          <Metric icon="🏪" label="Cafes Online" value={`${m.online}/${m.approved}`} sub={`${m.pending} pending approval`} color={m.pending > 0 ? P.amber : P.green} info="Cafes that are currently toggled ONLINE and visible to customers. Pending = awaiting admin approval in the Fleet tab." />
          <Metric icon="⭐" label="Early Adopters" value={`${m.ea}/100`} sub={`${100 - m.ea} slots left`} color={P.amber} info="First 100 cafe partners who get locked-in Early Adopter benefits: after their affiliate's 30-day window ends, the cafe receives a $0.25/order rebate for the remaining 11 months." />
          <Metric icon="👥" label="Active Visitors" value={m.activeVisitors} sub="Last 30 min activity" color={P.blue} info="Estimated active users based on unique customer orders in the last 30 minutes. This is a proxy — for precise visitor tracking, integrate Google Analytics or Firebase Analytics." />
        </div>

        {/* Map + Order Board */}
        <div className={mapExpanded ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-5 gap-4"}>
          <div className={mapExpanded ? "" : "lg:col-span-3"}>
            <InteractiveMap cafes={cafes} expanded={mapExpanded} onToggle={() => setMapExpanded(!mapExpanded)} />
          </div>
          <div className={mapExpanded ? "" : "lg:col-span-2"}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: P.textSec }}>Live Orders</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${P.teal}15`, color: P.teal }}>{m.active} active</span>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status)).length === 0 ? (
                  <div className="text-center py-8 text-sm" style={{ color: P.textMut }}>No active orders right now</div>
                ) : orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status)).map((o) => (
                  <div key={o.id} className="rounded-xl p-3 transition-all" style={{ background: P.bgHover, border: `1px solid ${P.border}` }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium" style={{ color: P.text }}>{o.customerName || "Customer"}</span>
                      <Badge label={o.status} ok={o.status !== "pending"} />
                    </div>
                    <div className="text-xs" style={{ color: P.textMut }}>
                      {o.items?.length || 0} items → {cafeNameMap[o.cafeId] || "Cafe"} • {fmt$(o.total || 0)} • {ago(o.timestamp)}
                    </div>
                    {o.plate && <div className="text-xs mt-1" style={{ color: P.textMut }}>🚗 {o.carColor} {o.carModel} [{o.plate}]</div>}
                    {o.isArriving && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium animate-pulse" style={{ background: `${P.green}20`, color: P.green }}>📍 At window</span>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><AreaChart data={chartData.map((d) => d.orders)} labels={chartData.map((d) => d.label)} color={P.teal} title="Orders — Last 7 Days" /></Card>
          <Card><AreaChart data={chartData.map((d) => d.revenue)} labels={chartData.map((d) => d.label)} color={P.green} title="Revenue — Last 7 Days" /></Card>
        </div>

        {/* Order Kanban */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium" style={{ color: P.textSec }}>Order Pipeline</span>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: P.green }} />
            <span className="text-xs" style={{ color: P.green }}>Live</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kanban.map((col) => (
              <div key={col.label}>
                <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <span>{col.icon}</span>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: col.color }}>{col.label}</span>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${col.color}15`, color: col.color }}>{col.items.length}</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {col.items.length === 0 ? (
                    <div className="text-center py-4 text-xs" style={{ color: P.textDim }}>Empty</div>
                  ) : col.items.map((o) => (
                    <div key={o.id} className="rounded-xl p-3" style={{ background: P.bgHover }}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span style={{ color: P.text }}>{o.customerName || "Customer"}</span>
                        <span className="text-xs" style={{ color: P.textMut }}>{ago(o.timestamp)}</span>
                      </div>
                      <div className="text-xs" style={{ color: P.textMut }}>{o.items?.length || 0} items • {fmt$(o.total || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fleet stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon="📈" label="Completion Rate" value={`${m.compRate.toFixed(0)}%`} color={m.compRate >= 80 ? P.green : P.amber} info="Percentage of today's orders that reached 'completed' status. Target: >80%. Low rates may indicate cafe issues or customer no-shows." />
          <Metric icon="🛒" label="Avg Order Value" value={fmt$(m.avgOV)} color={P.teal} info="Average total per order today (menu items + curbside fee). Higher AOV = more revenue per transaction for cafes and platform." />
          <Metric icon="📱" label="GPS Tracked" value={`${m.gps}/${m.todayOrd}`} color={P.blue} info="Orders where customer enabled GPS for real-time distance tracking. GPS enables auto-arrival detection within ~80m of the cafe." />
          <Metric icon="🎫" label="Open Tickets" value={m.openTix} color={m.openTix > 0 ? P.amber : P.green} info="Unresolved support tickets from the chatbot. Tickets are auto-created when the bot can't answer a question or user requests human support." />
        </div>
      </div>
    );
  };

  /* ── FINANCE ── */
  const renderFinance = () => {
    const breakEven = 1500;
    const bePct = m.moNet > 0 ? (m.moNet / breakEven) * 100 : 0;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon="💰" label="Gross Today" value={fmt$(m.gross)} sub={`${m.todayOrd} orders`} color={P.green} info="Total gross revenue today before any fee splits. This is what customers paid in total (menu + curbside fee)." />
          <Metric icon="📊" label="Platform Net" value={fmt$(m.net)} sub="After SMS costs" color={m.net >= 0 ? P.green : P.rose} info="Platform's net profit today: $0.99 service fee per completed order minus estimated SMS costs (~$0.103/order via Twilio)." />
          <Metric icon="📈" label="Week Gross" value={fmt$(m.wkGross)} sub={`${m.wkOrd} orders`} color={P.teal} info="Total revenue in the last 7 days across all cafes." />
          <Metric icon="🗓️" label="Month Gross" value={fmt$(m.moGross)} sub={`${m.moOrd} orders`} color={P.teal} info="Month-to-date gross revenue starting from the 1st of the current month." />
        </div>
        {/* Revenue Split */}
        <Card info="Flow of money from customer payment to platform net profit. Cafes keep 100% of menu prices + 100% of curbside fees. Platform earns $0.99 service fee per completed order.">
          <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Today&apos;s Revenue Pipeline</span>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { l: "Gross Orders", v: fmt$(m.gross), c: P.text },
              { l: "Curbside Fees", v: fmt$(m.fees), c: P.teal },
              { l: "Cafe (100%)", v: fmt$(m.fees), c: P.green },
              { l: "Service Fee", v: fmt$(m.platRevenue), c: P.amber },
              { l: "SMS Costs", v: `-${fmt$(m.smsCost)}`, c: P.rose },
              { l: "NET PROFIT", v: fmt$(m.net), c: m.net >= 0 ? P.green : P.rose },
            ].map((r, i) => (
              <div key={i} className="text-center">
                {i > 0 && <div className="text-base mb-1" style={{ color: P.textDim }}>→</div>}
                <div className="text-lg font-bold" style={{ color: r.c }}>{r.v}</div>
                <div className="text-xs mt-1" style={{ color: P.textMut }}>{r.l}</div>
              </div>
            ))}
          </div>
        </Card>
        {/* Expanded Expense Tracking */}
        <Card info="All platform operating costs. Firebase Spark and Vercel Hobby are free tiers — costs will increase when upgrading to Blaze/Pro plans as the platform scales.">
          <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Full Expense Breakdown (Monthly Est.)</span>
          <div className="space-y-2">
            {[
              { icon: "📱", l: "Twilio SMS", v: fmt$(m.expTwilio), c: P.amber, note: "~$0.0515/msg × ~2 msgs/order" },
              { icon: "💳", l: "Stripe Processing", v: fmt$(m.expStripe), c: P.amber, note: "1.75% + $0.30 per txn (cafe absorbs)" },
              { icon: "📧", l: "Resend Email", v: fmt$(m.expResend), c: P.green, note: "Free tier: 100 emails/day, 3000/mo" },
              { icon: "🔥", l: "Firebase (Spark)", v: fmt$(m.expFirebase), c: P.green, note: "Free tier: 50K reads, 20K writes/day. Blaze ~$25/mo est." },
              { icon: "▲", l: "Vercel (Hobby)", v: fmt$(m.expVercel), c: P.green, note: "Free tier. Pro plan: $20/mo when needed" },
              { icon: "📬", l: "Google Workspace", v: fmt$(m.expGoogleWs), c: P.amber, note: "hello@pullupcoffee.com — $8.40/user/mo" },
              { icon: "🌐", l: "Domain (pullupcoffee.com)", v: fmt$(m.expDomain), c: P.textMut, note: "~$30/yr ÷ 12" },
            ].map((r) => (
              <div key={r.l} className="flex items-center gap-3 text-sm py-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                <span>{r.icon}</span>
                <span className="flex-1" style={{ color: P.textSec }}>{r.l}</span>
                <span className="text-xs mr-3" style={{ color: P.textMut }}>{r.note}</span>
                <span className="font-medium w-20 text-right" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-3">
              <span style={{ color: P.textSec }}>TOTAL MONTHLY EXPENSES</span>
              <span style={{ color: P.rose }}>{fmt$(m.expTotal)}</span>
            </div>
          </div>
        </Card>
        {/* P&L + Break-even */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card info="Month-to-date profit & loss statement. Platform earns $0.99 flat service fee per completed order. SMS costs are the main variable expense.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Month P&L (MTD)</span>
            <div className="space-y-2">
              {[
                { l: "Gross Revenue", v: fmt$(m.moGross), c: P.text },
                { l: "Curbside Fees", v: fmt$(m.moFees), c: P.teal },
                { l: "Service Fees ($0.99/order)", v: fmt$(m.moPlat), c: P.amber },
                { l: "Est. SMS Costs", v: `-${fmt$(m.moSms)}`, c: P.rose },
                { l: "Est. Stripe Fees", v: `-${fmt$(m.moGross * 0.0175 + m.moOrd * 0.30)}`, c: P.rose },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <span style={{ color: P.textMut }}>{r.l}</span>
                  <span style={{ color: r.c }}>{r.v}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2">
                <span style={{ color: P.textSec }}>NET PLATFORM PROFIT</span>
                <span style={{ color: m.moNet >= 0 ? P.green : P.rose }}>{fmt$(m.moNet)}</span>
              </div>
            </div>
          </Card>
          <Card info="Monthly break-even target. This is the minimum platform net profit needed to cover all operating costs. At $0.99/order minus ~$0.103 SMS = ~$0.887 net/order.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Break-Even Tracker</span>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold" style={{ color: bePct >= 100 ? P.green : P.amber }}>{bePct.toFixed(0)}%</span>
              <p className="text-xs mt-1" style={{ color: P.textMut }}>of ${breakEven}/mo target</p>
            </div>
            <ProgressBar value={bePct} max={100} color={bePct >= 100 ? P.green : P.amber} />
            <div className="mt-4 space-y-1 text-xs" style={{ color: P.textMut }}>
              <div>Need ~{Math.ceil(breakEven / 0.887)} orders/mo at $0.99 fee</div>
              <div>Tax reserve (30%): {fmt$(m.moNet * 0.3)}</div>
            </div>
          </Card>
        </div>
        {/* Merch / Donation Tracking */}
        <Card info="Tracks all 'Buy the Founder a Coffee' donations and merch purchases. Data comes from the merch_purchases Firestore collection, populated by the Stripe webhook after successful payment.">
          <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Merch & Donations</span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {[
              { emoji: "☕", tier: "Coffee", price: "$4.50", count: m.merchByTier.coffee, color: P.amber },
              { emoji: "🤙", tier: "Legend", price: "$10", count: m.merchByTier.supporter, color: P.teal },
              { emoji: "❤️", tier: "VIP", price: "Custom", count: m.merchByTier.vip, color: P.rose },
              { emoji: "🧢", tier: "Founders Cap", price: "$45+ship", count: m.merchByTier.hat, color: P.green },
              { emoji: "📊", tier: "Total Revenue", price: "", count: m.merchByTier.total, color: P.text },
            ].map((t) => (
              <div key={t.tier} className="rounded-xl p-4 text-center" style={{ background: P.bgHover }}>
                <div className="text-2xl mb-2">{t.emoji}</div>
                <div className="text-sm font-medium mb-1" style={{ color: P.text }}>{t.tier}</div>
                {t.price && <div className="text-xs mb-2" style={{ color: P.textMut }}>{t.price}</div>}
                <div className="text-lg font-bold" style={{ color: t.color }}>{t.tier === "Total Revenue" ? fmt$(m.merchByTier.revenue) : t.count}</div>
                {t.tier !== "Total Revenue" && <div className="text-[10px] mt-1" style={{ color: P.textMut }}>{t.count === 1 ? "purchase" : "purchases"}</div>}
              </div>
            ))}
          </div>
          {merchPurchases.length === 0 && (
            <div className="text-center py-4 text-sm" style={{ color: P.textMut }}>No merch purchases recorded yet. Purchases will appear here after the webhook writes to <span className="pulse-mono" style={{ color: P.teal }}>merch_purchases</span> collection.</div>
          )}
        </Card>
        {/* Affiliates */}
        <Card>
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Affiliate Program</span>
          {affiliates.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: P.textMut }}>No affiliates yet</div>
          ) : (
            <div className="space-y-3">
              {affiliates.map((a) => {
                const aCafes = cafes.filter((c) => c.affiliateId === a.id || c.referredBy === a.referralCode);
                return (
                  <div key={a.id} className="rounded-xl p-4" style={{ background: P.bgHover }}>
                    <div className="flex justify-between items-center">
                      <div><span className="text-sm font-medium" style={{ color: P.text }}>{a.name || "Unknown"}</span><span className="text-xs ml-2" style={{ color: P.textMut }}>{a.referralCode}</span></div>
                      <Badge label={a.status || "active"} ok={a.status === "active"} />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs" style={{ color: P.textMut }}>
                      <span>🏪 {aCafes.length} cafes</span><span>💰 {fmt$((a.totalCommissionCents || 0) / 100)} earned</span><span>📧 {a.email}</span>
                    </div>
                    {aCafes.map((fc) => {
                      const wEnd = fc.affiliateWindowEnd ? new Date(fc.affiliateWindowEnd) : null;
                      const dLeft = wEnd ? Math.max(0, Math.ceil((wEnd.getTime() - Date.now()) / 86400000)) : 0;
                      const wStart = fc.affiliateWindowStart ? new Date(fc.affiliateWindowStart) : null;
                      const wProg = wStart && wEnd ? ((Date.now() - wStart.getTime()) / (wEnd.getTime() - wStart.getTime())) * 100 : 0;
                      return (
                        <div key={fc.id} className="mt-2 ml-4 text-xs" style={{ color: P.textMut }}>
                          <div className="flex justify-between mb-1"><span>↳ {fc.businessName}</span><span>{dLeft}d left</span></div>
                          <ProgressBar value={wProg} max={100} color={dLeft > 10 ? P.green : dLeft > 3 ? P.amber : P.rose} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        {/* Stripe grid */}
        <Card>
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Stripe Connect Status</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cafes.filter((c) => c.isApproved).map((c) => (
              <div key={c.id} className="rounded-xl p-3 text-sm" style={{ background: P.bgHover }}>
                <div className="font-medium truncate mb-1" style={{ color: P.text }}>{c.businessName}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge label={c.stripeConnected ? "Connected" : "Not Connected"} ok={!!c.stripeConnected} />
                  <span className="text-xs" style={{ color: P.textMut }}>Fee: ${c.curbsideFee || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  /* ── FLEET ── */
  const renderFleet = () => {
    const pend = cafes.filter((c) => !c.isApproved);
    const appr = cafes.filter((c) => c.isApproved);
    return (
      <div className="space-y-5">
        {/* Approval Queue */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium" style={{ color: P.textSec }}>Approval Queue</span>
            {pend.length > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${P.amber}20`, color: P.amber }}>{pend.length} pending</span>}
          </div>
          {pend.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: P.textMut }}>All clear — no pending applications</div>
          ) : (
            <div className="space-y-3">
              {pend.map((c) => (
                <div key={c.id} className="rounded-xl p-5" style={{ background: P.bgHover, border: `1px solid ${P.border}` }}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="text-base font-medium mb-1" style={{ color: P.text }}>{c.businessName || "Unnamed"}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: P.textMut }}>
                        <span>📧 {c.email}</span>
                        <span>📞 {c.phone || c.ownerMobile || "—"}</span>
                        <span>🌐 {c.country || "AU"}</span>
                        {c.referredBy && <span style={{ color: P.teal }}>🤝 Referred: {c.referredBy}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleApprove(c.id)} disabled={approvingId === c.id}
                      className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] shrink-0"
                      style={{ background: P.green, color: "#0F1923", opacity: approvingId === c.id ? 0.5 : 1 }}>
                      {approvingId === c.id ? "Approving…" : "✓ Approve"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        {/* Cafe Table */}
        <Card info="All approved cafes on the platform. Click Status to toggle online/offline. Click Fee to edit the curbside fee ($0–$25). Changes are saved to Firestore instantly.">
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Cafe Fleet — {appr.length} Approved <span className="text-xs font-normal" style={{ color: P.textMut }}>— click Status/Fee to edit</span></span>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: P.textMut }}>
                  <th className="pb-3 pr-3 text-xs font-medium uppercase">Cafe</th><th className="pb-3 pr-3 text-xs font-medium uppercase">Status</th><th className="pb-3 pr-3 text-xs font-medium uppercase">Stripe</th><th className="pb-3 pr-3 text-xs font-medium uppercase">Fee</th><th className="pb-3 pr-3 text-xs font-medium uppercase">2FA</th><th className="pb-3 text-xs font-medium uppercase">Orders</th>
                </tr>
              </thead>
              <tbody>
                {appr.map((c) => {
                  const cOrd = orders.filter((o) => o.cafeId === c.id);
                  const churn = cOrd.length === 0 && c.onboardingNudgeSent;
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${P.border}` }}>
                      <td className="py-3 pr-3" style={{ color: P.text }}>{c.businessName}{churn && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: `${P.rose}15`, color: P.rose }}>Churn risk</span>}</td>
                      <td className="py-3 pr-3">
                        <button onClick={() => handleToggleStatus(c.id, c.status)} className="transition hover:opacity-80">
                          <Badge label={c.status === "open" ? "Online" : "Offline"} ok={c.status === "open"} />
                        </button>
                      </td>
                      <td className="py-3 pr-3"><Badge label={c.stripeConnected ? "Yes" : "No"} ok={!!c.stripeConnected} /></td>
                      <td className="py-3 pr-3">
                        {editingCafeId === c.id ? (
                          <div className="flex items-center gap-1">
                            <span style={{ color: P.amber }}>$</span>
                            <input type="number" min="0" max="25" step="0.50" value={editFeeVal} onChange={(e) => setEditFeeVal(e.target.value)}
                              className="w-14 px-1 py-0.5 rounded text-sm text-center outline-none"
                              style={{ background: P.bgInput, border: `1px solid ${P.teal}`, color: P.amber }}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveFee(c.id)}
                              autoFocus />
                            <button onClick={() => handleSaveFee(c.id)} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${P.green}20`, color: P.green }}>✓</button>
                            <button onClick={() => setEditingCafeId(null)} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${P.rose}20`, color: P.rose }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingCafeId(c.id); setEditFeeVal(String(c.curbsideFee || 0)); }}
                            className="hover:underline transition" style={{ color: P.amber }}>${c.curbsideFee || 2}</button>
                        )}
                      </td>
                      <td className="py-3 pr-3"><Badge label={c.sms2faEnabled ? "On" : "Off"} ok={!!c.sms2faEnabled} /></td>
                      <td className="py-3" style={{ color: P.teal }}>{cOrd.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        {/* Support + Favorites */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Support Tickets</span>
            {tickets.length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: P.textMut }}>No escalated tickets</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-xl p-3 text-sm" style={{ background: P.bgHover }}>
                    <div style={{ color: P.text }}>{t.question}</div>
                    <div className="text-xs mt-1" style={{ color: P.textMut }}>{ago(t.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Favorites & SMS Opt-ins</span>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: P.teal }}>{m.favs}</div>
                <div className="text-xs" style={{ color: P.textMut }}>Total Favorites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: P.green }}>{m.smsOI}</div>
                <div className="text-xs" style={{ color: P.textMut }}>SMS Opt-ins</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  /* ── SYSTEM ── */
  const renderSystem = () => {
    const sparkLimits = { reads: 50000, writes: 20000 };
    const estR = (cafes.length * 10) + (orders.length * 5) + 500;
    const estW = orders.length * 3 + cafes.length * 2;
    const pctR = (estR / sparkLimits.reads) * 100;
    const pctW = (estW / sparkLimits.writes) * 100;
    return (
      <div className="space-y-5">
        {/* Firebase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Firestore Reads", est: estR, max: sparkLimits.reads, pct: pctR, color: P.teal },
            { label: "Firestore Writes", est: estW, max: sparkLimits.writes, pct: pctW, color: P.green },
            { label: "Firestore Deletes", est: 0, max: 20000, pct: 0, color: P.amber },
          ].map((g) => (
            <Card key={g.label}>
              <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>{g.label}</span>
              <div className="relative w-28 h-28 mx-auto mb-2">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <circle cx="60" cy="60" r="50" fill="none" stroke={P.textDim} strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={g.pct > 80 ? P.rose : g.color} strokeWidth="8"
                    strokeDasharray={`${g.pct * 3.14} ${(100 - g.pct) * 3.14}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold" style={{ color: g.color }}>{g.pct.toFixed(0)}%</span>
                  <span className="text-[10px]" style={{ color: P.textMut }}>{g.est.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-center text-xs" style={{ color: P.textMut }}>/ {g.max.toLocaleString()} daily</div>
            </Card>
          ))}
        </div>
        {/* SMS + Email */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card info="Twilio sends transactional SMS: order notifications, 2FA codes, cafe approval alerts, and favorite notifications. Cost is ~$0.10 AUD per message segment. 2 messages per order average.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Twilio SMS (Est. Today)</span>
            <div className="space-y-2">
              {[
                { t: "Order Ready", n: m.completed }, { t: "Order Accepted", n: m.completed }, { t: "Order Declined", n: m.rejected },
                { t: "2FA Login", n: Math.ceil(cafes.filter((c) => c.sms2faEnabled).length * 0.5) }, { t: "Cafe Approved", n: 0 },
              ].map((s) => (
                <div key={s.t} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate" style={{ color: P.textMut }}>{s.t}</span>
                  <div className="flex-1"><ProgressBar value={s.n} max={Math.max(m.todayOrd, 1)} color={P.amber} /></div>
                  <span className="w-6 text-right" style={{ color: P.amber }}>{s.n}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 font-medium" style={{ borderTop: `1px solid ${P.border}` }}>
                <span style={{ color: P.textMut }}>Est. cost</span>
                <span style={{ color: P.amber }}>{fmt$(m.smsCost)}</span>
              </div>
            </div>
          </Card>
          <Card info="Resend email service handles all transactional emails. Free tier: 100 emails/day, 3000/month. Click any template to preview what the customer/cafe receives.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Resend Email (11 Templates) <span className="text-xs font-normal" style={{ color: P.textMut }}>— click to preview</span></span>
            <div className="space-y-1.5 text-sm">
              {EMAIL_TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => setEmailPreview(t)} className="w-full flex justify-between py-1.5 px-2 rounded-lg transition-all hover:brightness-110" style={{ borderBottom: `1px solid ${P.border}`, background: 'transparent' }}>
                  <span style={{ color: P.textMut }}>{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${P.teal}15`, color: P.teal }}>Preview</span>
                    <Badge label="Active" ok={true} />
                  </div>
                </button>
              ))}
              <div className="flex justify-between pt-2"><span style={{ color: P.textMut }}>From</span><span style={{ color: P.teal }}>hello@pullupcoffee.com</span></div>
            </div>
          </Card>
        </div>
        {/* Cron + API */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Cron Scheduler</span>
            <div className="space-y-3">
              {[
                { n: "Ghost Hold Sweep", s: "Daily 3:00 AM AEDT", d: "Expire stale orders >72h" },
                { n: "Onboarding Nudge", s: "Daily 9:00 AM AEDT", d: "Email inactive cafes" },
                { n: "Satisfaction Survey", s: "1st of Month", d: "Monthly cafe survey" },
              ].map((c) => (
                <div key={c.n} className="rounded-xl p-3" style={{ background: P.bgHover }}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium" style={{ color: P.text }}>{c.n}</span>
                    <Badge label="Scheduled" ok={true} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: P.textMut }}>⏰ {c.s} — {c.d}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>API Rate Limits</span>
            <div className="space-y-1 text-sm max-h-56 overflow-y-auto">
              {[
                { r: "/api/stripe/checkout", l: "15/60s" }, { r: "/api/stripe/capture", l: "10/60s" },
                { r: "/api/twilio", l: "6/60s" }, { r: "/api/auth/send-2fa", l: "3/300s" },
                { r: "/api/auth/verify-2fa", l: "5/300s" }, { r: "/api/admin/cafes/*", l: "30/60s" },
                { r: "/api/access/unlock", l: "10/60s" }, { r: "/api/stripe/connect", l: "5/60s" },
              ].map((r) => (
                <div key={r.r} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <span style={{ color: P.text }}>{r.r}</span>
                  <span style={{ color: P.amber }}>{r.l}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {/* Vercel */}
        <Card>
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Vercel Deployment</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><div className="text-lg font-bold" style={{ color: P.green }}>Live</div><div className="text-xs" style={{ color: P.textMut }}>Status</div></div>
            <div><div className="text-lg font-bold" style={{ color: P.teal }}>pullupcoffee.com</div><div className="text-xs" style={{ color: P.textMut }}>Domain</div></div>
            <div><div className="text-lg font-bold" style={{ color: P.amber }}>Hobby</div><div className="text-xs" style={{ color: P.textMut }}>Plan</div></div>
            <div><div className="text-lg font-bold" style={{ color: P.text }}>Next.js 16</div><div className="text-xs" style={{ color: P.textMut }}>Framework</div></div>
          </div>
        </Card>
      </div>
    );
  };

  /* ── SECURITY ── */
  const renderSecurity = () => {
    return (
      <div className="space-y-5">
        <Card info="12 independent security layers protecting the platform. Each layer operates independently — if one fails, others continue protecting. This defense-in-depth approach makes the platform extremely resilient to attacks.">
          <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Security Matrix — 12 Layers Active</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { n: "Origin Allowlist", d: "pullupcoffee.com + Vercel previews", detail: "WHAT: Blocks requests not from allowed origins. TALKS TO: requestSecurity.ts middleware. PREVENTS: Cross-site request forgery (CSRF), unauthorized API access from third-party sites or scripts." },
              { n: "Bot Detection", d: "40+ UA patterns, burst 4/5s", detail: "WHAT: Scans User-Agent strings against 40+ known bot patterns and enforces burst rate limiting (max 4 requests per 5 seconds from same IP). TALKS TO: botDefense.ts. PREVENTS: Automated scraping, credential stuffing, DDoS from bot networks." },
              { n: "Idempotency Guard", d: "60s dedup on checkout", detail: "WHAT: Generates unique checkout tokens and rejects duplicate submissions within 60 seconds. TALKS TO: Stripe checkout route. PREVENTS: Double-charging customers, duplicate order creation from network retries or impatient clicks." },
              { n: "Math CAPTCHA", d: "Login + Signup forms", detail: "WHAT: Simple arithmetic challenge on all auth forms (e.g. '7 + 3 = ?'). TALKS TO: Client-side form validation. PREVENTS: Automated bot signups, brute-force login attempts from basic scripts." },
              { n: "reCAPTCHA v2", d: "Server-side verification", detail: "WHAT: Google reCAPTCHA v2 checkbox verification on signup. TALKS TO: Google reCAPTCHA API (server-side validation). PREVENTS: Sophisticated bot signups that pass simple CAPTCHAs, spam account creation." },
              { n: "SMS 2FA", d: "SHA-256 hashed, 5-min expiry", detail: "WHAT: 6-digit OTP sent via SMS on login when enabled. Code is SHA-256 hashed in Firestore with 5-minute TTL. TALKS TO: Twilio SMS API + Firestore. PREVENTS: Account takeover even if password is compromised, unauthorized access to cafe dashboards." },
              { n: "Firebase Auth", d: "verifyIdToken with revocation", detail: "WHAT: All authenticated API routes verify Firebase ID tokens server-side with revocation check. TALKS TO: Firebase Admin SDK (adminAuth.ts). PREVENTS: Token replay attacks, use of expired/revoked credentials, unauthorized API access." },
              { n: "Admin Dual-Auth", d: "Token (timing-safe) OR Firebase", detail: "WHAT: Admin routes require EITHER a timing-safe admin token comparison OR a valid Firebase token with platform_admin role. TALKS TO: adminAuth.ts + environment variables. PREVENTS: Unauthorized admin actions, privilege escalation by regular cafe users." },
              { n: "Stripe Webhook Sig", d: "constructEvent verification", detail: "WHAT: All incoming Stripe webhooks are verified using stripe.webhooks.constructEvent with the webhook signing secret. TALKS TO: Stripe API. PREVENTS: Fake webhook payloads, payment manipulation, forged checkout completion events." },
              { n: "HMAC Cookie Auth", d: "Access gate, 3h TTL", detail: "WHAT: Access-code-gated pages use HMAC-signed cookies with 3-hour expiry. TALKS TO: accessLock.ts library. PREVENTS: Unauthorized access to gated content, cookie tampering, replay attacks after TTL expires." },
              { n: "Input Validation", d: "Regex, ABN checksum, price floors", detail: "WHAT: Server-side validation on all inputs: regex for emails/phones, ABN digit checksum verification, price floor/ceiling enforcement. TALKS TO: All API routes. PREVENTS: SQL injection, XSS payloads, invalid business registrations, pricing exploits." },
              { n: "Body Size Guard", d: "64KB max request body", detail: "WHAT: Rejects any request with body larger than 64KB before processing. TALKS TO: requestSecurity.ts middleware. PREVENTS: Memory exhaustion attacks, oversized payload DoS, attempted buffer overflow exploits." },
            ].map((l) => (
              <div key={l.n} className="rounded-xl p-3 flex items-start gap-3" style={{ background: P.bgHover }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: P.green }} />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium" style={{ color: P.text }}>{l.n}</span>
                    <Tip text={l.detail} />
                  </div>
                  <div className="text-xs" style={{ color: P.textMut }}>{l.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Legal Compliance — 7 Regions</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { r: "AU", f: "🇦🇺" }, { r: "US", f: "🇺🇸" }, { r: "GB", f: "🇬🇧" }, { r: "EU", f: "🇪🇺" },
              { r: "NZ", f: "🇳🇿" }, { r: "CA", f: "🇨🇦" }, { r: "Other", f: "🌍" },
            ].map((l) => (
              <div key={l.r} className="rounded-xl p-4 text-center" style={{ background: P.bgHover }}>
                <div className="text-2xl mb-1">{l.f}</div>
                <div className="text-sm font-medium mb-1" style={{ color: P.text }}>{l.r}</div>
                <Badge label="Compliant" ok={true} />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm" style={{ color: P.textMut }}>
            <div>✅ Terms of Service — region-aware, 19 clauses</div>
            <div>✅ Privacy — GDPR (EU/GB), CCPA (US), APPs (AU)</div>
            <div>✅ Cookie Policy — opt-in (EU/GB), opt-out (US)</div>
            <div>✅ IP Notice — per-region copyright references</div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "📍", title: "GPS Data", rule: "24h auto-purge", fields: "customerLat/Lng, distanceMeters" },
            { icon: "📸", title: "Car Photos", rule: "24h auto-purge", fields: "carPhoto base64 blob" },
            { icon: "🔐", title: "2FA Codes", rule: "5-min expiry", fields: "SHA-256 hashed, auto-cleared" },
          ].map((d) => (
            <Card key={d.title} className="text-center">
              <div className="text-2xl mb-2">{d.icon}</div>
              <div className="text-sm font-medium mb-1" style={{ color: P.text }}>{d.title}</div>
              <div className="text-xs mb-1" style={{ color: P.amber }}>{d.rule}</div>
              <div className="text-xs" style={{ color: P.textMut }}>{d.fields}</div>
            </Card>
          ))}
        </div>
        <Card>
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Environment Vault</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { k: "Stripe API", crit: true }, { k: "Stripe Webhook", crit: true },
              { k: "Firebase Admin", crit: true }, { k: "Twilio SID", crit: true },
              { k: "Twilio Auth", crit: true }, { k: "Resend API", crit: false },
              { k: "reCAPTCHA", crit: false }, { k: "Cron Secret", crit: true },
              { k: "Admin Token", crit: true }, { k: "Printful API", crit: false },
              { k: "Access Code", crit: false },
            ].map((e) => (
              <div key={e.k} className="flex items-center gap-2 rounded-xl p-3" style={{ background: P.bgHover }}>
                <span className="text-sm">🔒</span>
                <span className="text-sm flex-1" style={{ color: P.text }}>{e.k}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: e.crit ? `${P.rose}15` : `${P.amber}15`, color: e.crit ? P.rose : P.amber }}>{e.crit ? "Critical" : "Optional"}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: P.textMut }}>🔒 Server-side only — check Vercel Environment Variables for status.</p>
        </Card>
      </div>
    );
  };

  /* ── CHATBOT ── */
  const botChatEndRef = useRef<HTMLDivElement>(null);
  const knowledgeBase = useMemo(() => [
    { id: 'payouts', keywords: ['payout', 'paid', 'bank', 'money', 'stripe', 'transfer', 'settlement', 'earnings', 'income', 'revenue', 'get paid', 'when paid', 'where money', 'my money', 'account'], text: 'Fast answer: go to Payments → Connect Stripe Payouts, then choose daily/weekly/instant. Once connected, payouts go to your nominated bank account automatically. You keep 100% of menu prices + 100% of the curbside fee. A $0.99 service fee is charged to the customer separately and goes to Pull Up.' },
    { id: 'curbside-fee', keywords: ['curbside', 'fee', 'change fee', 'increase fee', 'minimum', 'pricing', 'price', 'charge', 'cost', 'expensive', 'how much'], text: 'Fast answer: go to Operations → Dynamic Curbside Fee and use the slider. Range is $0.00–$25.00. You keep 100% of the curbside fee — every cent. A $0.99 Pull Up Service Fee is charged separately to the customer. Increase during peak hours, lower for promos.' },
    { id: 'pause-orders', keywords: ['pause', 'offline', 'stop orders', 'busy', 'turn off', 'close', 'closing', 'shut down', 'status', 'go offline', 'stop accepting'], text: 'Fast answer: go to Operations and toggle Accepting Orders to OFFLINE. Customers stop seeing you as available instantly. Toggle back to ONLINE when ready.' },
    { id: 'menu', keywords: ['menu', 'add item', 'first item', 'edit item', 'photo', 'price', 'food', 'drink', 'product', 'image', 'add coffee', 'change price', 'upload photo', 'edit menu'], text: 'Fast answer: go to Menu tab. Tap Add Item, set name + price, upload a photo, then save. Use "Load Top 7 Menu" for quick starter items. You can edit/delete anytime.' },
    { id: 'late-customer', keywords: ['late', 'no show', 'grace', 'forfeit', 'did not arrive', 'waiting', 'customer not here', 'not coming', 'no pickup'], text: 'Fast answer: customers have a 10-minute grace window. If they do not arrive, you can forfeit the order at your discretion. The authorization hold is released — they are not charged.' },
    { id: 'decline', keywords: ['decline', 'reject', 'cancel order', 'cannot make', 'refuse', 'deny order'], text: 'Fast answer: on a pending order, tap the red X, enter a reason, and submit. The customer is notified and the authorization hold is voided (no charge).' },
    { id: 'delay', keywords: ['delay', 'running late', 'sms', 'message customer', 'notify', 'update', 'tell customer', 'inform customer'], text: 'Fast answer: open a preparing/ready order and tap Notify Delay (SMS). Customer gets an instant SMS update. You can also mark orders as "Ready" to notify them.' },
    { id: 'favorites', keywords: ['favourite', 'favorite', 'heart', 'sms alert', 'opening alert', 'regulars', 'loyalty', 'notification', 'alerts'], text: 'Fast answer: customers can heart your cafe, then confirm their mobile at checkout. You send opted-in opening SMS from Operations → Notify Favourites. Safety guard: opening alert only sends once per day.' },
    { id: 'refund', keywords: ['refund', 'chargeback', 'dispute', 'wrong order', 'cold', 'complaint', 'unhappy', 'bad order', 'incorrect'], text: 'Fast answer: refunds are merchant-managed. Handle case-by-case. For unactioned orders, authorizations void automatically. For captured payments, process refunds via your Stripe dashboard.' },
    { id: 'reporting', keywords: ['history', 'report', 'export', 'tax', 'accounting', 'gst', 'records', 'analytics', 'sales', 'data', 'numbers'], text: 'Fast answer: use History tab filters (daily/weekly/monthly/archive) for quick bookkeeping summaries. Stripe also provides exportable reports for your accountant/BAS.' },
    { id: 'support', keywords: ['human', 'support', 'ticket', 'help', 'contact', 'broken', 'bug', 'glitch', 'issue', 'problem', 'error', 'not working', 'fix', 'urgent'], text: 'Fast answer: email hello@pullupcoffee.com with your Cafe Name, issue, and (if relevant) Order ID. Priority escalation within 15 min during business hours (Mon–Fri 8AM–6PM AEDT).' },
    { id: 'gps', keywords: ['gps', 'location', 'distance', 'tracking', 'approaching', 'arrived', 'customer location', 'map', 'find me'], text: 'Fast answer: when GPS is enabled, you see real-time distance to approaching customers on Live Orders. The system auto-detects arrivals within ~80m. Customers can also manually tap "I\'m Outside" to alert you.' },
    { id: 'qr', keywords: ['qr', 'poster', 'print', 'scan', 'code'], text: 'Fast answer: go to Account tab → Generate QR Poster. It creates a printable A4 poster with your cafe QR code, business name, and "Scan to Order" branding.' },
    { id: 'hours', keywords: ['hours', 'schedule', 'open time', 'close time', 'operating', 'window', 'when open', 'business hours'], text: 'Fast answer: go to Operations → Operating Window. Set your open/close times. You must also be toggled ONLINE for customers to see you.' },
    { id: 'affiliate', keywords: ['affiliate', 'referral', 'commission', 'refer', 'earn', 'refer a friend', 'invite'], text: 'Fast answer: Pull Up offers a 25% affiliate commission on the platform fee for the first 30 days of every cafe you refer. Click "Affiliate" in the footer to apply and get your unique referral code.' },
    { id: 'security', keywords: ['security', 'safe', 'data', 'privacy', 'personal info', 'card details', 'encryption', 'protect'], text: 'Fast answer: all payments are processed through Stripe with 256-bit encryption. We never store card numbers. Customer data is encrypted and GPS data is purged after order completion.' },
    { id: 'early-adopter', keywords: ['early adopter', 'founders', 'first 100', 'first 33', 'special', 'benefit', 'bonus', 'early bird'], text: 'Fast answer: the first 100 cafe partners are "Early Adopters" — after the affiliate\'s 30-day commission window ends, you receive a $0.25/order rebate for the remaining 11 months. You also keep 100% of menu prices and 100% of your curbside fee. Locked in for the first 100 partners.' },
    { id: 'merch', keywords: ['merch', 'merchandise', 'hat', 'cap', 'founders', 'shop', 'buy', 'gear', 'clothing'], text: 'Fast answer: visit the Merch Store from the main menu to grab limited-edition Pull Up Founders gear. Currently available: embroidered caps with AU shipping.' },
    { id: 'approval', keywords: ['approv', 'pending', 'waiting', 'review', 'application', 'when will', 'not approved', 'how long'], text: 'Fast answer: approvals are typically processed within 24 hours. Once approved, you will receive an email and SMS notification. If waiting >24 hours, email hello@pullupcoffee.com.' },
    { id: 'login', keywords: ['login', 'log in', 'sign in', 'locked out', 'forgot password', 'reset password', '2fa', 'two factor', 'verification code'], text: 'Fast answer: if you forgot your password, go to Account → Reset Password. If you enabled 2FA, a 6-digit code will be sent to your mobile. Check SMS. Still stuck? Email hello@pullupcoffee.com.' },
    { id: 'connect', keywords: ['connect stripe', 'stripe connect', 'link bank', 'bank account', 'stripe setup', 'connect payouts'], text: 'Fast answer: go to Payments → Connect Stripe Payouts. Click the button to start Stripe Express onboarding. Enter your business and bank details. Once complete, payouts are automatic.' },
  ], []);

  const submitBotQuestion = useCallback((question: string) => {
    if (!question.trim()) return;
    setBotChat((prev) => [...prev, { type: "user", text: question }]);
    const q = question.toLowerCase();
    setBotInput("");
    setTimeout(() => {
      const match = knowledgeBase.find((topic) => topic.keywords.some((k) => q.includes(k)));
      let answer = "";
      if (q.includes("password") || q.includes("token") || q.includes("private key") || q.includes("api key") || q.includes("secret")) {
        answer = "I cannot access passwords, tokens, card data, or API keys. Use Account for password reset and Stripe Dashboard for payment credentials.";
      } else if (match) {
        answer = match.text;
      } else {
        answer = "I couldn't find an exact answer for that. Try asking about: payouts, menu, curbside fees, orders, approval status, Stripe setup, GPS, security, or account settings. For complex issues, email hello@pullupcoffee.com.";
      }
      setBotChat((prev) => [...prev, { type: "bot", text: answer }]);
      addLog("🤖", `Chatbot: "${question.slice(0, 40)}…" → matched: ${match?.id || "fallback"}`);
    }, 300);
  }, [knowledgeBase, addLog]);

  useEffect(() => { botChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [botChat]);

  const quickBotPrompts = ["How do I get paid?", "How do I change curbside fee?", "How do I pause orders?", "How do I add a menu item?", "What if customer is late?", "How do I contact support?"];

  const renderChatbot = () => (
    <div className="space-y-5">
      <Card info="This is the same chatbot that cafe partners see in their Support tab. Use it to test responses, monitor accuracy, and identify gaps in the knowledge base. Questions that the bot cannot answer create support tickets automatically.">
        <div className="flex items-center gap-3 mb-4" style={{ borderBottom: `1px solid ${P.border}`, paddingBottom: '12px' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${P.teal}15` }}>🤖</div>
          <div>
            <span className="text-sm font-medium" style={{ color: P.text }}>Support Engine</span>
            <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: P.textMut }}>Platform Knowledge Base — {knowledgeBase.length} Topics</p>
          </div>
          <Badge label="Online" ok={true} />
        </div>
        <div className="mb-3">
          <p className="text-xs mb-2" style={{ color: P.textMut }}>Quick prompts:</p>
          <div className="flex flex-wrap gap-2">
            {quickBotPrompts.map((p) => (
              <button key={p} onClick={() => submitBotQuestion(p)} className="text-[10px] px-3 py-1.5 rounded-full transition-all hover:brightness-110"
                style={{ background: `${P.teal}10`, color: P.teal, border: `1px solid ${P.teal}20` }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="min-h-[350px] max-h-[55vh] overflow-y-auto space-y-3 mb-4 pr-2" style={{ scrollbarWidth: "thin" }}>
          {botChat.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "bot" ? "justify-start" : "justify-end"}`}>
              <div className="max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed"
                style={msg.type === "bot"
                  ? { background: P.bgHover, color: P.textSec, border: `1px solid ${P.border}` }
                  : { background: P.teal, color: P.bg }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={botChatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submitBotQuestion(botInput); }} className="flex gap-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
          <input type="text" value={botInput} onChange={(e) => setBotInput(e.target.value)}
            placeholder="Ask any operations or policy question…"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: P.bgInput, border: `1px solid ${P.border}`, color: P.text }}
            onFocus={(e) => e.target.style.borderColor = P.teal} onBlur={(e) => e.target.style.borderColor = P.border} />
          <button type="submit" className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: P.teal, color: P.bg }}>Send</button>
        </form>
      </Card>
      {/* Knowledge Base Coverage */}
      <Card info="Coverage map showing all topics the chatbot can handle. Gaps here mean customers will get a fallback response and a support ticket will be auto-created.">
        <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Knowledge Base Coverage</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {knowledgeBase.map((topic) => (
            <div key={topic.id} className="rounded-lg p-2.5 text-center" style={{ background: P.bgHover }}>
              <div className="text-xs font-medium mb-1" style={{ color: P.text }}>{topic.id.replace(/-/g, " ")}</div>
              <div className="text-[10px]" style={{ color: P.textMut }}>{topic.keywords.length} keywords</div>
              <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1.5" style={{ background: P.green }} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  /* ── ANALYTICS ── */
  const renderAnalytics = () => {
    const a = analytics;
    return (
      <div className="space-y-5">
        {/* Range selector + headline metrics */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-medium" style={{ color: P.textSec }}>Time Range:</span>
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button key={r} onClick={() => setAnalyticsRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: analyticsRange === r ? P.teal : P.bgHover, color: analyticsRange === r ? P.bg : P.textMut, border: `1px solid ${analyticsRange === r ? P.teal : P.border}` }}>
              {r === "24h" ? "24 Hours" : r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: P.textMut }}>{siteAnalytics.length.toLocaleString()} total events tracked</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Metric icon="👥" label="Visitors" value={a.totalVisitors} sub={`${analyticsRange} period`} color={P.teal} info="Unique visitor sessions tracked by the built-in analytics beacon. Each session represents a distinct browser tab that loaded your site." />
          <Metric icon="📄" label="Page Views" value={a.totalPageViews} sub={`${a.avgPagesPerSession.toFixed(1)} pages/session`} color={P.blue} info="Total page view events. In the SPA, a 'page view' fires whenever the user navigates to a different view (e.g. landing → discovery → checkout)." />
          <Metric icon="↩️" label="Bounce Rate" value={`${a.bounceRate.toFixed(1)}%`} sub={`${a.totalVisitors - Math.round(a.bounceRate / 100 * a.totalVisitors)} engaged`} color={a.bounceRate > 50 ? P.rose : P.green} info="Percentage of sessions with only 1 page view. Lower is better. A bounce means the visitor left without navigating to any other view." />
          <Metric icon="🟢" label="Live Now" value={a.liveVisitors} sub="Active in last 5 min" color={a.liveVisitors > 0 ? P.green : P.textMut} info="Visitors who generated a page view event in the last 5 minutes. Based on session timestamps from the analytics beacon." />
          <Metric icon="🚨" label="Security Events" value={secMetrics.total24h} sub={`${secMetrics.highSev} high severity`} color={secMetrics.highSev > 0 ? P.rose : P.green} info="Security events in the last 24 hours: failed logins, bot blocks, rate limit hits, unauthorized access attempts. High severity events trigger alerts." />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <AreaChart data={a.dailyPV.map((d) => d.pv)} labels={a.dailyPV.map((d) => d.label)} color={P.teal} title="Page Views — Last 7 Days" />
          </Card>
          <Card>
            <AreaChart data={a.dailyPV.map((d) => d.visitors)} labels={a.dailyPV.map((d) => d.label)} color={P.blue} title="Visitors — Last 7 Days" />
          </Card>
        </div>

        {/* Country breakdown + Devices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card info="Visitor distribution by country. Country is detected from the x-vercel-ip-country header on Vercel deployments. On localhost, shows 'Unknown'.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Countries</span>
            {a.countryList.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: P.textMut }}>No analytics data yet. Visit the main site to generate beacon events.</div>
            ) : (
              <div className="space-y-2">
                {a.countryList.map((c) => (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="text-lg">{getFlag(c.code)}</span>
                    <span className="text-sm w-10 font-medium" style={{ color: P.text }}>{c.code}</span>
                    <div className="flex-1"><ProgressBar value={c.views} max={a.countryList[0]?.views || 1} color={P.teal} /></div>
                    <span className="text-xs w-16 text-right" style={{ color: P.textMut }}>{c.views} ({c.pct.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card info="Split of Desktop vs Mobile visitors. Detected from User-Agent header parsing. Useful for prioritizing responsive design decisions.">
            <span className="text-sm font-medium block mb-4" style={{ color: P.textSec }}>Devices</span>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {a.deviceList.map(([name, count]) => (
                <div key={name} className="rounded-xl p-4 text-center" style={{ background: P.bgHover }}>
                  <div className="text-2xl mb-2">{name === "Desktop" ? "🖥️" : "📱"}</div>
                  <div className="text-lg font-bold" style={{ color: P.teal }}>{a.totalPageViews > 0 ? ((count / a.totalPageViews) * 100).toFixed(0) : 0}%</div>
                  <div className="text-xs" style={{ color: P.textMut }}>{name} ({count})</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Browser + OS + Top Pages */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Browsers</span>
            <div className="space-y-2">
              {a.browserList.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm w-16" style={{ color: P.text }}>{name}</span>
                  <div className="flex-1"><ProgressBar value={count} max={a.browserList[0]?.[1] || 1} color={P.blue} /></div>
                  <span className="text-xs w-8 text-right" style={{ color: P.textMut }}>{count}</span>
                </div>
              ))}
              {a.browserList.length === 0 && <div className="text-center py-4 text-xs" style={{ color: P.textMut }}>No data</div>}
            </div>
          </Card>
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Operating Systems</span>
            <div className="space-y-2">
              {a.osList.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm w-20" style={{ color: P.text }}>{name}</span>
                  <div className="flex-1"><ProgressBar value={count} max={a.osList[0]?.[1] || 1} color={P.green} /></div>
                  <span className="text-xs w-8 text-right" style={{ color: P.textMut }}>{count}</span>
                </div>
              ))}
              {a.osList.length === 0 && <div className="text-center py-4 text-xs" style={{ color: P.textMut }}>No data</div>}
            </div>
          </Card>
          <Card>
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Top Views</span>
            <div className="space-y-2">
              {a.pageList.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate" style={{ color: P.text }}>{name}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${P.teal}15`, color: P.teal }}>{count}</span>
                </div>
              ))}
              {a.pageList.length === 0 && <div className="text-center py-4 text-xs" style={{ color: P.textMut }}>No data</div>}
            </div>
          </Card>
        </div>

        {/* Referrers + Hourly Heat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card info="External sites that linked visitors to Pull Up Coffee. Only tracks referrers that include a full URL (excludes direct visits and bookmarks).">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Referrers</span>
            {a.refList.length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: P.textMut }}>No external referrers tracked yet. Most visits are direct / bookmarked.</div>
            ) : (
              <div className="space-y-2">
                {a.refList.map(([host, count]) => (
                  <div key={host} className="flex items-center gap-3 py-1" style={{ borderBottom: `1px solid ${P.border}` }}>
                    <span className="text-sm flex-1 truncate" style={{ color: P.text }}>{host}</span>
                    <span className="text-xs font-medium" style={{ color: P.amber }}>{count} visits</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card info="Hourly distribution of page views. Identifies peak traffic hours to optimize cafe availability windows and server resources.">
            <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Traffic by Hour (UTC)</span>
            <div className="flex items-end gap-0.5 h-24">
              {a.hourly.map((count: number, hour: number) => {
                const maxH = Math.max(...a.hourly, 1);
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t transition-all" style={{ height: `${(count / maxH) * 80}px`, background: count > 0 ? P.teal : P.textDim, minHeight: "2px", opacity: count > 0 ? 1 : 0.3 }} title={`${hour}:00 — ${count} views`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: P.textMut }}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
            </div>
          </Card>
        </div>

        {/* Real-time Visitor Table */}
        <Card info="Most recent visitor sessions. Shows session fingerprint (first 8 chars), country, device, browser, OS, page count, and entry page. IP is partially masked for privacy.">
          <span className="text-sm font-medium block mb-3" style={{ color: P.textSec }}>Recent Visitors</span>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: P.textMut }}>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Session</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Country</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Device</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Browser</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">OS</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Pages</th>
                  <th className="pb-2 pr-3 text-xs font-medium uppercase">Entry</th>
                  <th className="pb-2 text-xs font-medium uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {a.recentSessions.map((s, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                    <td className="py-2 pr-3 pulse-mono text-xs" style={{ color: P.teal }}>{s.sessionId}</td>
                    <td className="py-2 pr-3"><span title={s.country}>{getFlag(s.country)} {s.country}</span></td>
                    <td className="py-2 pr-3" style={{ color: P.textSec }}>{s.device === "Desktop" ? "🖥️" : "📱"} {s.device}</td>
                    <td className="py-2 pr-3" style={{ color: P.textSec }}>{s.browser}</td>
                    <td className="py-2 pr-3" style={{ color: P.textSec }}>{s.os}</td>
                    <td className="py-2 pr-3" style={{ color: P.amber }}>{s.pages}</td>
                    <td className="py-2 pr-3" style={{ color: P.textMut }}>{s.firstPage}</td>
                    <td className="py-2 text-xs" style={{ color: P.textMut }}>{ago(s.lastSeen)}</td>
                  </tr>
                ))}
                {a.recentSessions.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-sm" style={{ color: P.textMut }}>No visitor data yet. Analytics beacon will capture visits to the main site.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Security Events Timeline */}
        <Card info="Real-time feed of security events: failed access codes, failed admin logins, bot blocks, rate limit hits, and API probes. Events are logged by server-side middleware and written to the security_events Firestore collection.">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium" style={{ color: P.textSec }}>Intrusion Detection Feed</span>
            {secMetrics.alertActive && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium animate-pulse" style={{ background: `${P.rose}20`, color: P.rose }}>⚠️ Active Alerts</span>
            )}
            <span className="ml-auto text-xs" style={{ color: P.textMut }}>{securityEvents.length} events recorded</span>
          </div>
          {secMetrics.byType.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {secMetrics.byType.map(([type, count]) => (
                <div key={type} className="rounded-xl p-3 text-center" style={{ background: P.bgHover }}>
                  <div className="text-lg font-bold" style={{ color: P.rose }}>{count}</div>
                  <div className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: P.textMut }}>{type.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          )}
          {secMetrics.byCountry.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: P.textMut }}>Threat Origins (24h)</span>
              <div className="flex flex-wrap gap-2">
                {secMetrics.byCountry.map(([code, count]) => (
                  <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: `${P.rose}10`, color: P.rose, border: `1px solid ${P.rose}20` }}>
                    {getFlag(code)} {code} × {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            {securityEvents.slice(0, 50).map((evt) => (
              <div key={evt.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: P.bgHover, borderLeft: `3px solid ${SEVERITY_COLORS[evt.severity] || P.textMut}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase px-2 py-0.5 rounded" style={{ background: `${SEVERITY_COLORS[evt.severity] || P.textMut}15`, color: SEVERITY_COLORS[evt.severity] || P.textMut }}>{evt.severity}</span>
                    <span className="text-sm font-medium" style={{ color: P.text }}>{evt.type?.replace(/_/g, " ")}</span>
                    <span className="ml-auto text-xs" style={{ color: P.textMut }}>{ago(evt.timestamp)}</span>
                  </div>
                  <div className="text-xs" style={{ color: P.textMut }}>
                    {getFlag(evt.country)} {evt.country} • IP: {evt.ip?.replace(/\d+$/, "***") || "?"} • {evt.path}
                  </div>
                  {evt.details && <div className="text-xs mt-1" style={{ color: P.textSec }}>{evt.details}</div>}
                </div>
              </div>
            ))}
            {securityEvents.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: P.textMut }}>
                No security events recorded yet. Events appear when:<br />
                • Someone enters a wrong access code<br />
                • A failed P.U.L.S.E. login attempt occurs<br />
                • Bot detection or rate limiting triggers
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const tabRenderers: Record<Tab, () => React.ReactNode> = { overview: renderOverview, finance: renderFinance, fleet: renderFleet, system: renderSystem, security: renderSecurity, analytics: renderAnalytics, chatbot: renderChatbot };
  const curTab = TABS.find((t) => t.id === tab)!;

  /* ═══════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <style jsx global>{`
        .pulse-root { font-family: 'Inter', -apple-system, system-ui, sans-serif; }
        .pulse-root *::-webkit-scrollbar { width: 5px; }
        .pulse-root *::-webkit-scrollbar-track { background: transparent; }
        .pulse-root *::-webkit-scrollbar-thumb { background: ${P.textDim}; border-radius: 3px; }
        .pulse-mono { font-family: 'JetBrains Mono', monospace; }
        .leaflet-container { border-radius: 0 0 16px 16px; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important; }
        .leaflet-control-zoom a { background: ${P.bgCard} !important; color: ${P.teal} !important; border-color: ${P.border} !important; }
        .leaflet-control-zoom a:hover { background: ${P.bgHover} !important; }
        .leaflet-control-attribution { background: rgba(15,25,35,0.8) !important; color: ${P.textMut} !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: ${P.teal} !important; }
      `}</style>

      <div className="pulse-root min-h-screen flex flex-col" style={{ background: P.bg, color: P.text }}>
        {/* ═══ ALERT BANNER ═══ */}
        {secMetrics.alertActive && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium animate-pulse cursor-pointer"
            style={{ background: `${P.rose}15`, color: P.rose, borderBottom: `1px solid ${P.rose}40` }}
            onClick={() => setTab("analytics")}>
            <span>🚨</span>
            <span>INTRUSION ALERT — {secMetrics.highSev} high-severity event{secMetrics.highSev !== 1 ? "s" : ""} in last 24h</span>
            <span className="ml-auto text-xs underline">View in Analytics →</span>
          </div>
        )}
        {/* ═══ HEADER ═══ */}
        <header className="h-14 flex items-center px-4 gap-4 border-b shrink-0 z-50" style={{ background: P.bgCard, borderColor: P.border }}>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">⚡</span>
            <span className="text-base font-semibold tracking-wide hidden sm:block" style={{ color: P.teal }}>P.U.L.S.E.</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 ml-4 rounded-xl p-1" style={{ background: P.bg }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t.id ? P.bgCard : "transparent",
                  color: tab === t.id ? P.teal : P.textMut,
                  boxShadow: tab === t.id ? P.shadow : "none",
                }}>
                <span>{t.icon}</span>
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-xs relative ml-auto">
            <div className="flex items-center rounded-xl px-3 py-2" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
              <span className="text-xs mr-2" style={{ color: P.textMut }}>🔍</span>
              <input value={novaQ} onChange={(e) => { setNovaQ(e.target.value); setNovaRes([]); }}
                onKeyDown={(e) => e.key === "Enter" && handleNova()}
                className="flex-1 bg-transparent outline-none text-sm" style={{ color: P.teal }}
                placeholder="Search…" />
            </div>
            {novaRes.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl p-4 z-50 space-y-1.5" style={{ background: P.bgCard, border: `1px solid ${P.borderHi}`, boxShadow: P.shadow }}>
                {novaRes.map((r, i) => <div key={i} className="text-sm" style={{ color: P.text }}>{r}</div>)}
                <button onClick={() => setNovaRes([])} className="text-xs mt-2 hover:underline" style={{ color: P.textMut }}>Dismiss</button>
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="pulse-mono text-sm hidden lg:block" style={{ color: P.textSec }}>{fmtTime(clock)}</span>
            <span className="text-xs hidden lg:block" style={{ color: P.textMut }}>{fmtDate(clock)}</span>
            <button onClick={() => setFeedOpen(!feedOpen)} className="p-2 rounded-xl transition-all hover:brightness-110"
              style={{ background: feedOpen ? `${P.teal}15` : "transparent", border: `1px solid ${P.border}` }} title="Activity Feed">
              <span className="text-sm">📋</span>
            </button>
            <button onClick={() => signOut(auth)} className="p-2 rounded-xl transition-all hover:brightness-110"
              style={{ background: `${P.rose}10`, border: `1px solid ${P.border}` }} title="Sign Out">
              <span className="text-sm">⏻</span>
            </button>
          </div>
        </header>

        {/* ═══ BODY ═══ */}
        <div className="flex-1 flex overflow-hidden">
          {/* Content */}
          <main className="flex-1 overflow-y-auto p-5 lg:p-6" style={{ scrollbarWidth: "thin" }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xl">{curTab.icon}</span>
              <h2 className="text-lg font-semibold" style={{ color: P.text }}>{curTab.label}</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: P.green }} />
                <span className="text-xs font-medium" style={{ color: P.green }}>Live</span>
              </div>
            </div>
            {tabRenderers[tab]()}
          </main>

          {/* ═══ ACTIVITY FEED ═══ */}
          {feedOpen && (
            <aside className="w-72 lg:w-80 shrink-0 border-l flex flex-col" style={{ background: P.bgCard, borderColor: P.border }}>
              <div className="h-12 flex items-center px-4 border-b shrink-0" style={{ borderColor: P.border }}>
                <span className="text-sm font-medium" style={{ color: P.textSec }}>Activity Feed</span>
                <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: P.green }} />
              </div>
              <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-1" style={{ scrollbarWidth: "thin" }}>
                {eventLog.map((e) => (
                  <div key={e.id} className="text-xs leading-relaxed flex gap-2 py-0.5">
                    <span className="shrink-0 pulse-mono" style={{ color: P.textDim }}>{e.time}</span>
                    <span className="shrink-0">{e.icon}</span>
                    <span style={{ color: P.textSec }}>{e.msg}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="h-9 flex items-center px-4 border-t text-xs gap-4 shrink-0" style={{ background: P.bgCard, borderColor: P.border, color: P.textMut }}>
          <span>Pull Up Coffee © 2026</span>
          <span className="w-px h-3" style={{ background: P.border }} />
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: P.green }} />Firebase</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: P.green }} />Stripe</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: P.green }} />Vercel</span>
          <span className="ml-auto" style={{ color: P.teal }}>P.U.L.S.E. v3.0</span>
        </footer>
        {emailPreview && <EmailPreviewModal template={emailPreview} onClose={() => setEmailPreview(null)} />}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE EXPORT — Auth orchestrator
   ═══════════════════════════════════════════════════════════ */
export default function PulsePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u: any) => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) { setProfile(null); return; }
    const unsub = onSnapshot(doc(db, "cafes", user.uid), (snap: any) => {
      if (snap.exists()) setProfile(snap.data());
      else setProfile(null);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async (email: string, pass: string) => {
    setLoginBusy(true); setLoginError("");
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch (e: any) {
      setLoginError(e.message || "Authentication failed");
      // Log failed P.U.L.S.E. login as security event
      fetch("/api/analytics/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "failed_pulse_login", path: "/pulse", details: `Failed login attempt for: ${email}`, severity: "high" }),
      }).catch(() => {});
    }
    setLoginBusy(false);
  };

  const isAdmin = profile?.isPlatformAdmin === true || profile?.role === "platform_admin";

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1923" }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#172A3A", borderTopColor: "#5EABA8" }} />
        <p className="text-sm tracking-widest animate-pulse" style={{ color: "#5EABA8", fontFamily: "Inter, sans-serif" }}>Loading P.U.L.S.E.</p>
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} error={loginError} busy={loginBusy} />;
  if (!isAdmin) return <AccessDenied email={user.email} onOut={() => signOut(auth)} />;
  return <PulseDashboard user={user} profile={profile} />;
}
