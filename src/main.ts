import "./index.css";
import { supabase } from "./lib/supabase";
import {
  createIcons,
  LayoutDashboard,
  Users,
  PlusCircle,
  Search,
  Trophy,
  History,
  LogOut,
  ShieldCheck,
  Calendar,
  Trash2,
  X,
  Copy,
  Check,
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  SpellCheck,
  ListFilter,
  ScanSearch,
  Bolt,
  Rocket,
  Wand2,
  CalendarCheck,
  Link,
  AlertCircle,
  Edit3,
  Clipboard,
  RefreshCw,
  Inbox,
  BarChart,
  Facebook,
  Clock,
  ArrowUp,
  ScanLine,
  FileText,
  BellRing,
  Lock,
  Waves,
  Info,
  ChevronLeft,
} from "lucide";
import { Route, Member, AuditLog, calculateLevel } from "./types";
import { getAdminName, ADMIN_NAMES } from "./lib/utils";
import { parseActivityBatch } from "./lib/parser";

import { renderAdminPanel, initializeAdminPanel } from "./lib/admin";
import { renderListGenerator, initializeListGenerator } from "./lib/listTools";
import { renderTopPerformer, initializeTopPerformer } from "./lib/topPerformer";
import {
  renderMemberMission,
  initializeMission,
  attachMissionEvents,
} from "./lib/memberMission";

// --- Global Sync ---
(window as any).refreshApp = () => render();
(window as any).render = () => render();

// --- State Management ---
let currentRoute: Route = "login";
let user: any = null;
let isLoading = true;
let isSidebarOpen = false;
let selectedMember: Member | null = null;
let membersCache: Member[] | null = null;
let lastMembersFetch: number = 0;
let loadedMemberLogsId: string | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let leaderboardTab: "rankings" | "inactivity" = "rankings";

// --- GapChecker State ---
const GAP_STORAGE_KEYS = {
  allDoneList: "gapchecker_allDone",
  commenterList: "gapchecker_commenter",
  history: "gapchecker_history",
  activityData: "activity_data",
  activityDate: "activity_date",
};

// --- Shortener & Collector State ---
const SHORTENER_STORAGE_KEYS = {
  history: "shortener_history",
  todaySorted: "shortener_today_sorted",
};

let shortenerHistory: any[] = JSON.parse(
  localStorage.getItem(SHORTENER_STORAGE_KEYS.history) || "[]",
);
let collectorLinks: string[] = JSON.parse(
  localStorage.getItem("ordered_links") || "[]",
);

let shortenerOutputData = "";
let shortenerFBWatch: number[] = [];
let shortenerMissing: number[] = [];

let currentSpellingSuggestions: any[] = [];
let currentResultsData: any = null;
let removedFromGap = new Set<string>();

// --- GapChecker Utilities ---
function proNormalize(name: string): string {
  if (!name || typeof name !== "string") return "";
  let normalized = name.normalize("NFKC").normalize("NFC");
  normalized = normalized.replace(/@/g, "");
  normalized = normalized.replace(
    /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD\u061C\u180E\u3000]/g,
    "",
  );
  normalized = normalized.replace(
    /[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g,
    "",
  );
  normalized = normalized.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, "");
  normalized = normalized.replace(/[\u2600-\u26FF\u2700-\u27BF]/g, "");
  normalized = normalized.replace(
    /[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2300-\u23FF]/g,
    "",
  );
  normalized = normalized.replace(/[\u0300-\u036F]/g, "");

  // Fancy letter conversion logic
  const smallCapsMap: Record<string, string> = {
    ᴀ: "a",
    ʙ: "b",
    ᴄ: "c",
    ᴅ: "d",
    ᴇ: "e",
    ꜰ: "f",
    ɢ: "g",
    ʜ: "h",
    ɪ: "i",
    ᴊ: "j",
    ᴋ: "k",
    ʟ: "l",
    ᴍ: "m",
    ɴ: "n",
    ᴏ: "o",
    ᴘ: "p",
    ʀ: "r",
    ꜱ: "s",
    ᴛ: "t",
    ᴜ: "u",
    ᴠ: "v",
    ᴡ: "w",
    ʏ: "y",
    ᴢ: "z",
  };
  let result = "";
  for (const char of normalized) {
    result += smallCapsMap[char] || char;
  }

  result = result.toLowerCase();
  result = result.replace(
    /[^\u0980-\u09FF\u0600-\u06FF\u0900-\u097Fa-zA-Z0-9]/g,
    "",
  );
  return result;
}

function generateNameVariations(name: string): string[] {
  const variations: string[] = [];
  const normalized = proNormalize(name);
  if (normalized.length >= 2) variations.push(normalized);
  const noNumbers = normalized.replace(/[0-9]/g, "");
  if (noNumbers.length >= 2 && noNumbers !== normalized)
    variations.push(noNumbers);
  return variations;
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  const l1 = str1.length;
  const l2 = str2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= l1; i++) matrix[i] = [i];
  for (let j = 0; j <= l2; j++) matrix[0][j] = j;
  for (let i = 1; i <= l1; i++) {
    for (let j = 1; j <= l2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const maxLen = Math.max(l1, l2);
  return (maxLen - matrix[l1][l2]) / maxLen;
}

function findSpellingSuggestions(gapList: any[], commenters: any[]) {
  const suggestions: any[] = [];
  for (const gapUser of gapList) {
    let bestMatch = null;
    let bestSimilarity = 0;
    for (const commenter of commenters) {
      const commenterVars = commenter.variations || [commenter.norm];
      for (const alias of gapUser.aliases) {
        for (const commVar of commenterVars) {
          const sim = calculateSimilarity(alias, commVar);
          if (sim >= 0.7 && sim > bestSimilarity && sim < 1) {
            bestSimilarity = sim;
            bestMatch = commenter.原名;
          }
        }
      }
    }
    if (bestMatch) {
      suggestions.push({
        gapName: gapUser.原名,
        similarTo: bestMatch,
        similarity: Math.round(bestSimilarity * 100),
      });
    }
  }
  return suggestions;
}

// --- Theme Management ---
type Theme =
  | "royal-gold"
  | "fireflies"
  | "inferno"
  | "sky-breeze"
  | "midnight-glow"
  | "wave-neon";
const savedTheme = localStorage.getItem("app-theme") as Theme;
let currentTheme: Theme = "wave-neon";

const themes: Record<
  Theme,
  {
    primary: string;
    secondary: string;
    accent: string;
    label: string;
    bg: string;
  }
> = {
  "royal-gold": {
    primary: "#D4AF37",
    secondary: "#D4AF37",
    accent: "#FFFFFF",
    label: "Royal Gold",
    bg: "radial-gradient(circle at 50% 50%, #0d0a00, #050510)",
  },
  fireflies: {
    primary: "#00FF88",
    secondary: "#00FF88",
    accent: "#FFFFFF",
    label: "Fireflies",
    bg: "radial-gradient(circle at 50% 50%, #000d05, #050510)",
  },
  inferno: {
    primary: "#FF3131",
    secondary: "#FF3131",
    accent: "#FFFF00",
    label: "Inferno",
    bg: "radial-gradient(circle at 50% 100%, #0d0300, #050510)",
  },
  "sky-breeze": {
    primary: "#00F5FF",
    secondary: "#00F5FF",
    accent: "#FFFFFF",
    label: "Sky Breeze",
    bg: "linear-gradient(to bottom, #050d15, #000000)",
  },
  "midnight-glow": {
    primary: "#BF00FF",
    secondary: "#00F5FF",
    accent: "#00F5FF",
    label: "Midnight",
    bg: "radial-gradient(circle at 50% 50%, #080315, #050510)",
  },
  "wave-neon": {
    primary: "#00F5FF",
    secondary: "#BF00FF",
    accent: "#FF0080",
    label: "Wave Neon Pro",
    bg: "linear-gradient(135deg, #020008 0%, #080315 50%, #020008 100%)",
  },
};

// Validate saved theme exists in the new theme list
if (savedTheme && themes[savedTheme]) {
  currentTheme = savedTheme;
}

function renderBackground() {
  const bgContainer = document.getElementById("theme-background");
  if (!bgContainer) return;

  bgContainer.innerHTML = "";
  bgContainer.className = `theme-bg-layer ${currentTheme}`;

  if (currentTheme === "fireflies") {
    for (let i = 0; i < 40; i++) {
      const fly = document.createElement("div");
      fly.className = "firefly";
      fly.style.left = `${Math.random() * 100}%`;
      fly.style.top = `${Math.random() * 100}%`;
      fly.style.width = `${Math.random() * 6 + 2}px`;
      fly.style.height = fly.style.width;
      fly.style.animationDuration = `${Math.random() * 15 + 10}s`;
      fly.style.animationDelay = `${Math.random() * 5}s`;
      bgContainer.appendChild(fly);
    }
  } else if (currentTheme === "inferno") {
    for (let i = 0; i < 60; i++) {
      const spark = document.createElement("div");
      spark.className = "spark";
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.width = `${Math.random() * 4 + 1}px`;
      spark.style.height = spark.style.width;
      spark.style.animationDuration = `${Math.random() * 4 + 2}s`;
      spark.style.animationDelay = `${Math.random() * 3}s`;
      bgContainer.appendChild(spark);
    }
  } else if (currentTheme === "sky-breeze") {
    for (let i = 0; i < 15; i++) {
      const cloud = document.createElement("div");
      cloud.className = "cloud";
      cloud.style.width = `${Math.random() * 300 + 100}px`;
      cloud.style.height = `${Math.random() * 150 + 50}px`;
      cloud.style.top = `${Math.random() * 80}%`;
      cloud.style.left = `-${Math.random() * 50}%`;
      cloud.style.animationDuration = `${Math.random() * 60 + 40}s`;
      cloud.style.animationDelay = `-${Math.random() * 30}s`;
      bgContainer.appendChild(cloud);
    }

    // Aesthetic Silhouette Scene
    const scene = document.createElement("div");
    scene.className =
      "absolute bottom-0 right-0 w-[400px] h-64 opacity-40 pointer-events-none flex items-end justify-center pr-20";
    scene.innerHTML = `
      <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
        <!-- Grass/Hill -->
        <path d="M0 180C50 170 100 190 150 185C200 180 250 195 300 185V200H0V180Z" fill="white" />
        <!-- Person 1 (Sitting) -->
        <path d="M120 180C120 160 130 155 135 150C140 145 135 135 130 130C125 125 135 110 145 115C155 120 150 135 145 140C140 145 150 160 150 180" stroke="white" stroke-width="4" stroke-linecap="round" class="windy-sway" />
        <!-- Person 2 (Sitting) -->
        <path d="M180 180C180 160 170 155 165 150C160 145 165 135 170 130C175 125 165 110 155 115C145 120 150 135 155 140C160 145 150 160 150 180" stroke="white" stroke-width="4" stroke-linecap="round" class="windy-sway" />
      </svg>
    `;
    bgContainer.appendChild(scene);

    for (let i = 0; i < 20; i++) {
      const line = document.createElement("div");
      line.className = "wind-line";
      line.style.width = `${Math.random() * 200 + 50}px`;
      line.style.top = `${Math.random() * 100}%`;
      line.style.left = `-${Math.random() * 20}%`;
      line.style.animationDuration = `${Math.random() * 10 + 5}s`;
      bgContainer.appendChild(line);
    }
  } else if (currentTheme === "royal-gold") {
    const shimmer = document.createElement("div");
    shimmer.className = "shimmer";
    bgContainer.appendChild(shimmer);
  } else if (currentTheme === "wave-neon") {
    // Hyper-Colorful Wave Blobs - Max Vibrancy
    const colors = [
      "bg-neon-cyan",
      "bg-neon-purple",
      "bg-neon-pink",
      "bg-neon-green",
      "bg-neon-amber",
      "bg-blue-500",
      "bg-purple-600",
    ];
    for (let i = 0; i < 12; i++) {
      const blob = document.createElement("div");
      blob.className =
        "absolute rounded-full blur-[120px] opacity-40 animate-pulse";
      blob.classList.add(colors[i % colors.length]);
      const size = Math.random() * 500 + 300;
      blob.style.width = `${size}px`;
      blob.style.height = `${size}px`;
      blob.style.top = `${Math.random() * 120 - 20}%`;
      blob.style.left = `${Math.random() * 120 - 20}%`;
      blob.style.animationDuration = `${Math.random() * 8 + 5}s`;
      blob.style.animationDelay = `${i * 1}s`;
      bgContainer.appendChild(blob);
    }
  }
}

function applyTheme(theme: Theme) {
  const t = themes[theme] || themes["royal-gold"];
  const root = document.documentElement;

  // Set Body Theme
  document.body.className = `antialiased font-rajdhani text-gray-200 ${theme}`;

  // Update Tailwind v4 Theme Variables
  root.style.setProperty("--color-neon-pink", t.primary);
  root.style.setProperty("--color-neon-cyan", t.secondary);
  root.style.setProperty("--color-neon-green", t.accent);

  // Update local glow variables
  root.style.setProperty("--glow-primary", `${t.primary}66`);
  root.style.setProperty("--glow-secondary", `${t.secondary}66`);

  localStorage.setItem("app-theme", theme);
  currentTheme = theme;
  renderBackground();
}

// Apply theme immediately
applyTheme(currentTheme);

// --- DOM References ---
const app = document.getElementById("app")!;

// --- Auth Handling ---
async function initAuth() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;

    user = session?.user ?? null;

    if (user) {
      currentRoute = "dashboard";
    } else {
      currentRoute = "login";
    }
  } catch (error) {
    console.error("Auth Init Error:", error);
    currentRoute = "login";
  } finally {
    isLoading = false;
    render();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    const newUser = session?.user ?? null;

    // Only navigate if the user state actually changed to avoid loop
    if (newUser?.id !== user?.id) {
      user = newUser;
      currentRoute = user ? "dashboard" : "login";
      render();
    } else {
      user = newUser; // Update user object in case metadata changed
    }
  });
}

// --- Core Navigation ---
function navigate(route: Route) {
  currentRoute = route;
  selectedMember = null;
  render();
}
(window as any).navigateTo = navigate;

function showNotice(title: string, message: string, type: "info" | "warning" | "success" = "info") {
  const noticeId = `notice-${Date.now()}`;
  const noticeHtml = `
    <div id="${noticeId}" class="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-6">
      <div class="glass-card p-6 flex items-start gap-4 border-l-4 ${type === "warning" ? "border-l-neon-pink" : "border-l-neon-cyan"} shadow-2xl backdrop-blur-3xl bg-black/80">
        <div class="w-10 h-10 rounded-xl ${type === "warning" ? "bg-neon-pink/20" : "bg-neon-cyan/20"} flex items-center justify-center shrink-0">
          <i data-lucide="${type === "warning" ? "alert-triangle" : "info"}" class="w-5 h-5 ${type === "warning" ? "text-neon-pink" : "text-neon-cyan"}"></i>
        </div>
        <div>
          <h4 class="text-[11px] font-black uppercase tracking-widest ${type === "warning" ? "text-neon-pink" : "text-neon-cyan"} mb-1">${title}</h4>
          <p class="text-[9px] font-bold text-gray-400 leading-relaxed uppercase italic">${message}</p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", noticeHtml);
  refreshIcons();
  setTimeout(() => {
    const el = document.getElementById(noticeId);
    if (el) {
      el.classList.add("animate-out", "fade-out", "translate-y-[-20px]");
      setTimeout(() => el.remove(), 500);
    }
  }, 4000);
}

function refreshIcons() {
  createIcons({
    icons: {
      LayoutDashboard, Users, PlusCircle, Search, Trophy, History, LogOut, ShieldCheck,
      Calendar, Trash2, X, Copy, Check, ClipboardCheck, MessageSquare, BarChart3,
      AlertTriangle, SpellCheck, ListFilter, ScanSearch, Bolt, Rocket, Wand2,
      CalendarCheck, Link, AlertCircle, Edit3, Clipboard, RefreshCw, Inbox, BarChart,
      Facebook, Clock, ArrowUp, ScanLine, FileText, BellRing, Lock, Waves, Info, ChevronLeft
    }
  });
}

// --- Renderers ---
function render() {
  if (isLoading) {
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-[#050510] text-neon-cyan">
        <div class="flex flex-col items-center gap-6">
          <div class="w-16 h-16 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin shadow-[0_0_20px_rgba(0,245,255,0.2)]"></div>
          <p class="font-orbitron font-black text-[10px] tracking-[0.5em] animate-pulse">RECOVERING SESSION</p>
        </div>
      </div>
    `;
    return;
  }

  if (!user && currentRoute !== "login") {
    currentRoute = "login";
  }

  app.innerHTML = "";

  // Add Theme Background Layer
  const bgDiv = document.createElement("div");
  bgDiv.id = "theme-background";
  app.appendChild(bgDiv);

  const contentDiv = document.createElement("div");
  contentDiv.id = "main-content";
  contentDiv.className = "w-full h-full";
  app.appendChild(contentDiv);

  if (currentRoute === "login") {
    contentDiv.innerHTML = renderLogin();
    attachLoginEvents();
  } else {
    contentDiv.innerHTML = `
      <div class="flex flex-col md:flex-row min-h-screen relative">
        <!-- Sidebar -->
        <div id="sidebar-container" class="md:block ${isSidebarOpen ? "block" : "hidden"} fixed md:relative z-40 h-full">
          ${renderSidebar()}
        </div>

        <!-- Mobile Header -->
        <div class="md:hidden flex items-center justify-between p-4 glass-card border-b border-white/5 z-30">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-neon-pink rounded flex items-center justify-center shadow-[0_0_10px_#FF0080]">
              <i data-lucide="shield-check" class="w-4 h-4 text-white"></i>
            </div>
            <span class="font-orbitron font-black text-[10px] whitespace-nowrap uppercase tracking-[0.4em] text-neon-cyan/80 font-orbitron italic">WAVE SYSTEM</span>
          </div>
          <button id="toggle-sidebar" class="text-white p-2">
            <i data-lucide="${isSidebarOpen ? "x" : "layout-dashboard"}" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- Backdrop for mobile sidebar -->
        ${isSidebarOpen ? `<div id="sidebar-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>` : ""}

        <main class="flex-1 p-3 md:p-6 overflow-y-auto">
          <div class="max-w-7xl mx-auto">
            ${selectedMember ? renderMemberDetail(selectedMember) : renderContent()}
          </div>
        </main>
      </div>
      <div class="scanline"></div>
    `;
    attachSidebarEvents();
    attachContentEvents();
    attachMobileEvents();
    if (selectedMember) attachMemberDetailEvents();
  }

  renderBackground();
  refreshIcons();
}

function renderMemberDetail(member: Member) {
  const lastSync = member.last_activity_date
    ? new Date(member.last_activity_date)
    : null;
  const daysSinceSync = lastSync
    ? Math.floor(
        (new Date().getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24),
      )
    : "N/A";

  return `
    <div class="animate-in fade-in slide-in-from-bottom-2">
      <button id="back-to-directory" class="flex items-center gap-1.5 text-neon-cyan/40 hover:text-neon-cyan font-black text-[9px] uppercase tracking-widest mb-4 transition-all group">
        <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
        Back to Matrix
      </button>

      <div class="glass-card mb-4 p-1 rounded-2xl border-white/5 relative overflow-hidden">
        <div class="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
           <div class="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 relative">
             <i data-lucide="users" class="w-8 h-8 text-neon-cyan opacity-40"></i>
             <div class="absolute -bottom-2 bg-neon-pink px-2 py-0.5 rounded-full text-[8px] font-black italic shadow-[0_0_10px_#FF0080]">#${member.member_number}</div>
           </div>
           <div class="text-center md:text-left flex-1 min-w-0">
             <h1 class="text-2xl font-black italic tracking-tighter text-white uppercase mb-2 truncate">${member.name}</h1>
             <div class="flex flex-wrap justify-center md:justify-start gap-2">
               <span class="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black uppercase text-neon-cyan tracking-widest">${calculateLevel(member.total_points)}</span>
               <span class="px-2 py-0.5 bg-neon-green/10 border border-neon-green/20 rounded text-[8px] font-black uppercase text-neon-green tracking-widest">Active Member</span>
               <span class="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black uppercase text-white/20 tracking-widest">Last Activity: ${daysSinceSync}d</span>
             </div>
           </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="glass-card p-4 border-white/5 rounded-xl flex flex-col items-center">
          <span class="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Total Unit Syncs</span>
          <span class="text-2xl font-black italic text-white">${member.total_syncs || 0}</span>
          <div class="w-8 h-0.5 bg-neon-cyan mt-3 rounded-full opacity-30 shadow-[0_0_8px_#00FFFF]"></div>
        </div>
        <div class="glass-card p-4 border-white/5 rounded-xl flex flex-col items-center">
          <span class="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Active Chain</span>
          <span class="text-2xl font-black italic text-neon-pink">${member.current_streak || 0}d</span>
          <div class="w-8 h-0.5 bg-neon-pink mt-3 rounded-full opacity-30 shadow-[0_0_8px_#FF0080]"></div>
        </div>
        <div class="glass-card p-4 border-white/5 rounded-xl flex flex-col items-center">
          <span class="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Max Chain</span>
          <span class="text-2xl font-black italic text-neon-green">${member.max_streak || 0}d</span>
          <div class="w-8 h-0.5 bg-neon-green mt-3 rounded-full opacity-30 shadow-[0_0_10px_#39FF14]"></div>
        </div>
      </div>

      <div class="glass-card p-5 rounded-xl border-white/5 bg-black/20">
        <h3 class="font-orbitron font-black text-[9px] uppercase tracking-[0.3em] mb-4 text-white/20">Archive Interaction Logs</h3>
        <div id="member-logs" class="space-y-2">
           <p class="text-[9px] font-bold text-white/10 animate-pulse italic">Deciphering logs...</p>
        </div>
      </div>
    </div>
  `;
}

async function attachMemberDetailEvents() {
  document
    .getElementById("back-to-directory")
    ?.addEventListener("click", () => {
      selectedMember = null;
      loadedMemberLogsId = null;
      render();
    });

  if (selectedMember && loadedMemberLogsId !== selectedMember.id) {
    const currentMemberId = selectedMember.id;
    const { data: logs } = await supabase
      .from("audit_trail")
      .select("*")
      .ilike("description", `%@${selectedMember.name}%`)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (selectedMember?.id !== currentMemberId) return; // Guard against race condition

    const logContainer = document.getElementById("member-logs");
    if (logContainer) {
      loadedMemberLogsId = currentMemberId;
      if (logs && logs.length > 0) {
        logContainer.innerHTML = logs
          .map(
            (log) => `
           <div class="flex gap-4 items-start p-4 hover:bg-white/5 rounded-xl transition-all group">
             <div class="w-2 h-2 rounded-full bg-neon-cyan mt-1 shadow-[0_0_5px_#00FFFF]"></div>
             <div>
               <p class="text-sm font-bold text-gray-300 leading-snug">${log.description}</p>
               <p class="text-[9px] font-black uppercase text-gray-600 mt-1 tracking-widest">${new Date(log.timestamp).toLocaleString()} // Operator: ${log.admin_name}</p>
             </div>
           </div>
         `,
          )
          .join("");
      } else {
        logContainer.innerHTML =
          '<p class="text-xs font-bold text-gray-600 italic">No recent log entries for this member.</p>';
      }
    }
  }
}

function renderSidebar() {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { id: "members", label: "Members", icon: "users" },
    { id: "activity", label: "Activity", icon: "plus-circle" },
    { id: "leaderboard", label: "Leaderboard", icon: "trophy" },
  ];

  const isAdmin = user?.email && ADMIN_NAMES[user.email];
  const adminName = isAdmin ? ADMIN_NAMES[user.email] : "Agent";

  const extendedItems = [
    { id: "gapchecker", label: "Gap Checker", icon: "scan-search" },
    { id: "memberMission", label: "Missions", icon: "rocket", locked: true },
    { id: "admin", label: "Notice Box", icon: "lock", locked: true },
    { id: "audit", label: "Audit", icon: "history" },
  ];

  return `
    <aside class="w-52 h-full flex flex-col bg-[#050508] border-r border-white/10 animate-in slide-in-from-left-2 duration-500 select-none shrink-0 relative overflow-hidden z-50">
      <!-- Subtle Glow Sidebar -->
      <div class="absolute -top-32 -left-32 w-80 h-80 bg-neon-cyan/5 blur-[100px] rounded-full"></div>
      
      <div class="p-8 mb-6 flex items-center gap-4 relative z-10 border-b border-white/10">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple p-[1px]">
          <div class="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center">
             <i data-lucide="waves" class="w-6 h-6 text-white animate-pulse"></i>
          </div>
        </div>
        <h2 class="text-white font-black italic tracking-[0.1em] uppercase text-lg font-cinzel">SUPPORT BOX</h2>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-8 relative z-10">
        <div>
          <p class="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] mb-4 italic px-4 font-orbitron">Main Menu</p>
          <nav class="space-y-2">
            ${menuItems.map((item) => `
              <button 
                data-route="${item.id}"
                class="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 group
                ${currentRoute === item.id ? "bg-white text-black shadow-lg scale-[1.02]" : "text-white/60 hover:text-white hover:bg-white/5"}"
              >
                <i data-lucide="${item.icon}" class="w-5 h-5 ${currentRoute === item.id ? "text-black" : "text-neon-cyan"} transition-all"></i>
                <span class="font-orbitron">${item.label}</span>
                ${currentRoute === item.id ? '<div class="ml-auto w-2 h-2 rounded-full bg-black"></div>' : ''}
              </button>
            `).join("")}
          </nav>
        </div>

        <div>
          <p class="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] mb-4 italic px-4 font-orbitron">Tools</p>
          <nav class="space-y-2">
            ${extendedItems.map((item) => `
              <button 
                data-route="${item.locked ? '' : item.id}"
                data-locked="${item.locked || false}"
                class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all duration-300 group
                ${currentRoute === item.id ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"}
                ${item.locked ? "opacity-30" : ""}"
              >
                <i data-lucide="${item.icon}" class="w-4 h-4 ${currentRoute === item.id ? "text-black" : "text-neon-purple"} transition-all"></i>
                <span class="font-orbitron">${item.label}</span>
                ${item.locked ? '<i data-lucide="lock" class="w-3.5 h-3.5 ml-auto text-neon-pink"></i>' : ''}
              </button>
            `).join("")}
          </nav>
        </div>
      </div>

      <div class="p-6 relative z-10 border-t border-white/20 bg-black/80">
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 lighting-border">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(191,0,255,0.4)] shrink-0">
            ${adminName.charAt(0)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-black uppercase tracking-widest text-white truncate font-orbitron">${adminName}</p>
            <p class="text-[8px] font-black text-white/30 truncate">${user?.email || ''}</p>
            <p class="text-[7px] font-black text-neon-cyan animate-pulse uppercase mt-1 tracking-[0.2em] italic">ACTIVE LINK</p>
          </div>
          <button id="logout-btn" class="p-2 text-white hover:text-neon-red transition-all">
            <i data-lucide="log-out" class="w-5 h-5 glow-icon"></i>
          </button>
        </div>
      </div>
    </aside>
  `;
}


function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#010103] font-rajdhani">
      <!-- Hyper Neon Wave Background -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-1/4 -left-1/4 w-full h-full bg-neon-cyan/10 blur-[150px] rounded-full animate-pulse"></div>
        <div class="absolute -bottom-1/4 -right-1/4 w-full h-full bg-neon-purple/10 blur-[150px] rounded-full animate-pulse" style="animation-delay: 2s"></div>
        <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20"></div>
      </div>
      
      <div class="w-full max-w-lg px-8 text-center animate-in fade-in zoom-in duration-1000 relative z-10">
        <div class="relative mb-12 inline-block">
           <div class="absolute -inset-2 blur-3xl rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-30 animate-pulse"></div>
           <div class="w-20 h-20 bg-black/60 rounded-[1.5rem] border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-2xl shadow-2xl text-white group">
              <i data-lucide="waves" class="w-10 h-10 text-neon-cyan group-hover:scale-110 transition-transform duration-500"></i>
           </div>
        </div>

        <div class="mb-12 space-y-4">
           <div class="flex items-center justify-center gap-4 mb-2">
              <span class="w-12 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent"></span>
              <p class="text-[10px] font-black uppercase tracking-[0.6em] text-neon-cyan font-orbitron italic">Secure Entry</p>
              <span class="w-12 h-px bg-gradient-to-l from-transparent via-neon-cyan to-transparent"></span>
           </div>
           <h1 class="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter uppercase font-cinzel leading-none text-white whitespace-nowrap">
              SUPPORT LINK<br/>
              <span class="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">BOX</span>
           </h1>
           <p class="text-[9px] font-black uppercase tracking-[0.8em] text-white/20 font-orbitron mt-6">Wave Protocol // Neural Link</p>
        </div>

        <div id="login-container" class="max-w-xs mx-auto space-y-6">
          <div class="space-y-3 text-left">
            <label class="text-[8px] font-black uppercase tracking-[0.2em] text-neon-cyan/60 px-4 italic font-orbitron">Operator Registry</label>
            <input type="email" id="login-email" class="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-neon-cyan/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/10 shadow-inner" placeholder="EMAIL IDENTITY">
          </div>
          <div class="space-y-3 text-left">
            <label class="text-[8px] font-black uppercase tracking-[0.2em] text-neon-purple/60 px-4 italic font-orbitron">Cipher Authorization</label>
            <input type="password" id="login-password" class="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-neon-purple/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/10 shadow-inner" placeholder="ACCESS CIPHER">
          </div>
          
          <div id="login-error" class="hidden text-[10px] font-black text-neon-red uppercase tracking-widest bg-neon-red/10 p-4 rounded-xl border border-neon-red/20 shadow-[0_0_20px_rgba(255,49,49,0.1)]">
            AUTH PROTOCOL FAILURE
          </div>

          <button id="login-btn" class="w-full relative group mt-6 h-16 transition-transform active:scale-95">
             <div class="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
             <div class="relative w-full h-full bg-white text-black font-black uppercase tracking-[0.4em] text-[12px] rounded-2xl flex items-center justify-center font-orbitron group-hover:bg-transparent group-hover:text-white transition-all duration-500 overflow-hidden">
                <span class="relative z-10">Authorize Access</span>
                <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             </div>
          </button>
        </div>

        <div class="mt-20 flex flex-col items-center gap-4">
           <div class="w-px h-12 bg-gradient-to-b from-white/20 to-transparent"></div>
           <p class="text-[7px] font-black uppercase tracking-[0.4em] text-white/10">Build Index v1.5.0 // Matrix.Encrypted</p>
        </div>
      </div>

      <!-- Live Diagnostics -->
      <div class="absolute bottom-8 left-8 hidden md:block">
         <div class="flex items-center gap-3 text-white/10">
           <div class="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping"></div>
           <p class="text-[8px] font-black uppercase tracking-widest font-mono italic">Terminal: secure.matrix.slb</p>
         </div>
      </div>
    </div>
  `;
}

function renderContent() {
  switch (currentRoute) {
    case "dashboard":
      return renderDashboard();
    case "members":
      return renderMembers();
    case "activity":
      return renderActivity();
    case "search":
      return renderSearch();
    case "leaderboard":
      return renderLeaderboard();
    case "audit":
      return renderAudit();
    case "heatmap":
      return renderHeatmap();
    case "gapchecker":
      return renderGapChecker();
    case "shortener":
      return renderShortener();
    case "listgenerator":
      return renderListGenerator();
    case "admin":
      return renderAdminPanel(user?.email);
    case "topperformer":
      return renderTopPerformer();
    case "memberMission":
      return renderMemberMission(() => render());
    default:
      return `<div class="p-20 text-center text-gray-500 font-bold uppercase tracking-widest italic">${currentRoute} interface pending.</div>`;
  }
}

function renderDashboard() {
  const tools = [
    { id: 'members', label: 'Members', icon: 'users', desc: 'Personnel Registry', color: 'text-neon-cyan', borderColor: 'border-neon-cyan/50 shadow-[0_0_25px_rgba(0,245,255,0.2)]' },
    { id: 'activity', label: 'Activity', icon: 'plus-circle', desc: 'Active Logging', color: 'text-neon-purple', borderColor: 'border-neon-purple/50 shadow-[0_0_25px_rgba(191,0,255,0.2)]' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy', desc: 'Ranking Matrix', color: 'text-neon-pink', borderColor: 'border-neon-pink/50 shadow-[0_0_25px_rgba(255,0,128,0.2)]' },
    { id: 'gapchecker', label: 'Gap Checker', icon: 'scan-search', desc: 'Matrix Logic', color: 'text-neon-green', borderColor: 'border-neon-green/50 shadow-[0_0_25px_rgba(0,255,136,0.2)]' },
  ];

  const secondaryTools = [
    { id: 'admin', label: 'Notice Box', icon: 'shield-check', desc: 'Core Systems', color: 'border-white/20' },
    { id: 'listgenerator', label: 'List Generator', icon: 'file-text', desc: 'Data Export', color: 'border-white/20' },
    { id: 'memberMission', label: 'Missions', icon: 'rocket', desc: 'Active Ops', color: 'border-white/20', locked: true },
    { id: 'shortener', label: 'Shortener', icon: 'link', desc: 'Flux Paths', color: 'border-white/20' },
    { id: 'topperformer', label: 'Top Performer', icon: 'bar-chart', desc: 'Metric Flow', color: 'border-white/20' },
  ];

  const statusIndicators = [
    { label: 'Total Members', status: 'Optimal', id: 'stat-total-members', value: '...' },
    { label: 'System', status: 'Secured', id: 'stat-system-load', value: 'OPTIMAL' },
    { label: 'Database', status: 'Syncing', id: 'stat-wave-cycle', value: 'ACTIVE' }
  ];

  return `
    <div class="space-y-12 animate-in fade-in duration-1000 pb-20">
      <header class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gradient-to-br from-white/[0.05] via-transparent to-neon-cyan/10 p-10 rounded-[3rem] border border-white/10 lighting-border relative overflow-hidden group shadow-[0_0_50px_rgba(0,245,255,0.1)]">
        <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 via-neon-purple/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>
        <div class="absolute -top-32 -right-32 w-64 h-64 bg-neon-cyan/30 blur-[100px] rounded-full animate-pulse"></div>
        
        <div class="relative z-10 space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink p-[2px] animate-spin-slow">
              <div class="w-full h-full rounded-[14px] bg-black flex items-center justify-center">
                <i data-lucide="waves" class="w-7 h-7 text-white animate-pulse"></i>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-3 mb-1">
                <div class="w-2.5 h-2.5 rounded-full bg-neon-cyan shadow-[0_0_15px_#00F5FF] animate-pulse"></div>
                <p class="text-neon-cyan text-[11px] font-black uppercase tracking-[0.6em] font-orbitron italic">System Online</p>
              </div>
              <h1 class="text-2xl md:text-3xl font-black italic tracking-tighter uppercase font-cinzel text-white leading-none">
                SUPPORT LINK <span class="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent underline decoration-white/10 decoration-4 underline-offset-4">BOX</span>
              </h1>
            </div>
          </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-8 lg:border-l border-white/10 lg:pl-10 relative z-10 w-full lg:w-auto">
          <div class="grid grid-cols-3 gap-6">
            ${statusIndicators.map(s => `
              <div>
                <p class="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1 italic font-orbitron">${s.label}</p>
                <h3 id="${s.id}" class="text-sm sm:text-base font-black italic text-neon-cyan uppercase tracking-wider">${s.value}</h3>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center gap-4 ml-auto">
            <div class="text-right">
              <p class="text-[7px] font-black uppercase text-white/20 tracking-widest mb-0.5">Operator ID</p>
              <h3 class="text-[12px] font-black italic text-white uppercase font-cinzel tracking-widest">${getAdminName(user?.email)}</h3>
            </div>
            <div class="w-14 h-14 rounded-[1.2rem] bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink p-[1px] shadow-[0_0_20px_rgba(191,0,255,0.3)]">
              <div class="w-full h-full rounded-[1.15rem] bg-black flex items-center justify-center">
                <i data-lucide="shield-check" class="w-7 h-7 text-neon-cyan animate-pulse"></i>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section class="grid grid-cols-2 md:grid-cols-4 gap-8">
        ${tools.map(tool => `
          <button onclick="navigateTo('${tool.id}')" class="group relative aspect-square transition-all duration-700 hover:scale-[1.05]">
            <div class="absolute -inset-2 bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-1000"></div>
            <div class="glass-card-neon lighting-border p-10 h-full flex flex-col justify-between border-white/20 hover:border-white/40 transition-all duration-700 bg-black/80 shadow-2xl !rounded-[3rem] overflow-hidden relative ${tool.borderColor || ''}">
               <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-white/10 to-transparent -mr-24 -mt-24 rounded-full group-hover:scale-150 transition-transform duration-1000 opacity-10"></div>
              
              <div class="flex justify-between items-start relative z-10">
                <div class="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-xl">
                  <i data-lucide="${tool.icon}" class="w-8 h-8 glow-icon"></i>
                </div>
                <div class="w-2 h-2 rounded-full bg-white/20 group-hover:bg-neon-cyan transition-all shadow-[0_0_15px_#00F5FF]"></div>
              </div>

              <div class="relative z-10">
                <div class="flex items-center gap-2 mb-2">
                  <p class="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] italic font-orbitron">${tool.desc}</p>
                </div>
                <h3 class="text-base sm:text-lg font-black italic uppercase tracking-widest leading-none transition-all duration-700 ${tool.color}">${tool.label}</h3>
              </div>
            </div>
          </button>
        `).join('')}
      </section>

      <section class="space-y-8">
        <div class="flex items-center gap-6">
          <div class="w-2.5 h-2.5 rounded-full bg-neon-purple shadow-[0_0_10px_#BF00FF] animate-pulse"></div>
          <p class="text-[11px] font-black uppercase text-white/30 tracking-[0.8em] italic font-orbitron">WAVE EXPANSION INFRASTRUCTURE</p>
          <div class="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          ${secondaryTools.map((tool) => `
            <button 
              onclick="${tool.locked ? "showNotice('Protocol Lock', 'Access Denied')" : `navigateTo('${tool.id}')`}" 
              class="glass-card-neon lighting-border p-8 flex flex-col justify-between group text-left border-white/10 relative transition-all rounded-[2.5rem] h-72 bg-black/60 hover:bg-black/80 hover:-translate-y-4 duration-700 shadow-xl ${tool.locked ? 'opacity-40' : ''}"
            >
              <div class="flex justify-between items-start">
                <div class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-700 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                  <i data-lucide="${tool.icon}" class="w-7 h-7 text-white/40 group-hover:text-black transition-all"></i>
                </div>
                <div class="w-2.5 h-2.5 rounded-full ${tool.locked ? 'bg-neon-pink shadow-[0_0_15px_#FF0080]' : 'bg-neon-cyan/20 group-hover:bg-neon-cyan shadow-[0_0_15px_#00F5FF]'} transition-all animate-pulse"></div>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs sm:text-sm font-black uppercase text-white tracking-tighter italic group-hover:text-neon-cyan transition-colors underline decoration-transparent group-hover:decoration-neon-cyan/30 decoration-2 underline-offset-4">${tool.label}</h4>
                  ${tool.locked ? '<i data-lucide="lock" class="w-3 h-3 text-neon-pink"></i>' : ''}
                </div>
                <p class="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] italic font-orbitron group-hover:text-white/60 transition-colors">${tool.desc}</p>
              </div>
            </button>
          `).join('')}
        </div>
      </section>

      <div class="relative pt-12">
        <div class="glass-card-neon lighting-border bg-black/40 p-8 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-8 group overflow-hidden shadow-2xl relative">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-[3000ms] transition-transform"></div>
          
          <div class="flex items-center gap-4 shrink-0 relative z-10">
            <div class="w-16 h-16 rounded-[1.2rem] bg-white/5 border-white/10 flex items-center justify-center transition-all duration-700 shadow-xl relative overflow-hidden">
              <i data-lucide="bell-ring" class="w-8 h-8 text-white animate-bounce relative z-10 glow-icon"></i>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-white text-2xl font-black uppercase tracking-[0.2em] italic font-orbitron">NOTICE BOX</span>
              </div>
            </div>
          </div>

          <div id="notice-box-display" onclick="navigateTo('admin')" class="flex-1 w-full bg-black/60 border border-white/5 p-6 rounded-[1.5rem] shadow-inner min-h-[100px] flex items-center justify-center relative z-10 cursor-pointer hover:bg-black/80 transition-all">
            <p class="text-lg text-white font-black italic animate-pulse font-orbitron tracking-[0.2em] uppercase">Checking System Status...</p>
          </div>

          <div class="flex items-center gap-4 grow-0 shrink-0 relative z-10 w-full lg:w-auto justify-center">
             <button onclick="renderDashboard()" class="w-16 h-16 rounded-[1.2rem] bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-700 text-white group/btn shadow-2xl">
               <i data-lucide="refresh-cw" class="w-6 h-6 group-hover/btn:rotate-180 transition-transform duration-1000"></i>
             </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMembers() {
  return `
    <header class="mb-8 animate-in fade-in slide-in-from-top-2">
      <div class="flex items-center gap-3 mb-6">
        <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
          <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
          Back
        </button>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2.5 h-2.5 rounded-full bg-neon-cyan shadow-[0_0_15px_#00F5FF] animate-pulse"></div>
            <p class="text-neon-cyan text-[11px] font-black uppercase tracking-[0.5em] italic font-orbitron">Wave Registry Protocol</p>
          </div>
          <h1 class="text-3xl md:text-4xl font-black italic tracking-tighter uppercase whitespace-nowrap">
            MEMBERS <span class="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent underline decoration-neon-cyan/30 decoration-4 underline-offset-8">DATABASE</span>
          </h1>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-4 items-center">
          <div class="relative group min-w-[300px]">
             <div class="absolute -inset-1 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-all"></div>
             <input id="member-search-input" type="text" placeholder="SEARCH IDENTITY..." class="w-full h-16 bg-black/60 border border-white/10 rounded-2xl px-12 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/40 transition-all placeholder:text-white/20 backdrop-blur-xl">
             <i data-lucide="search" class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-neon-cyan transition-colors"></i>
          </div>

          <div class="flex gap-2">
            <button id="batch-delete-btn" class="h-16 px-6 rounded-2xl bg-neon-red/10 border border-neon-red/20 text-neon-red font-black uppercase tracking-widest text-[10px] hover:bg-neon-red hover:text-white transition-all hidden flex items-center gap-3">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
              Batch Purge (<span id="selected-count">0</span>)
            </button>
            <button id="add-member-btn" class="relative group h-16 px-8 sm:px-12 overflow-hidden rounded-2xl bg-gradient-to-r from-neon-cyan via-white to-neon-purple text-black font-black uppercase tracking-widest text-[11px] transition-all hover:scale-[1.05] shadow-[0_0_40px_rgba(0,245,255,0.2)] active:scale-[0.98] font-orbitron shrink-0">
               <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan via-white to-neon-purple opacity-0 group-hover:opacity-20 transition-opacity"></div>
               <div class="flex items-center gap-3 relative z-10 italic">
                 <i data-lucide="plus-circle" class="w-5 h-5"></i>
                 Register
               </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Selection Toolbar -->
      <div id="bulk-selection-toolbar" class="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl mb-4 hidden">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" id="select-all-members" class="w-4 h-4 rounded border-white/10 bg-transparent text-neon-cyan focus:ring-neon-cyan">
          <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Select All in View</span>
        </label>
      </div>
    </header>

    <div id="members-list" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
      <div class="p-10 text-center col-span-full">
         <div class="w-8 h-8 border-2 border-white/5 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
         <p class="text-[8px] font-black uppercase text-white/20 tracking-widest italic">Syncing matrix data...</p>
      </div>
    </div>

    <!-- Registration Modal -->
    <div id="member-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl hidden">
      <div class="w-full max-w-xl glass-card p-8 md:p-12 rounded-[2.5rem] border-white/10 animate-in zoom-in duration-500 relative">
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-4">
             <div class="w-1.5 h-6 bg-neon-cyan rounded-full"></div>
             <p class="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-orbitron italic">Personnel Registry</p>
          </div>
          <h2 class="text-3xl font-black italic uppercase font-cinzel tracking-tighter text-white">Batch Enrollment</h2>
          <p class="text-[9px] text-white/20 font-black uppercase mt-2 tracking-widest italic">Input identities below for matrix synchronization</p>
        </div>

        <form id="member-form" class="space-y-6">
          <div class="space-y-3">
            <label class="text-[10px] font-black uppercase tracking-widest text-white/40 px-2">Identity Sequence</label>
            <textarea 
              name="names" 
              required 
              rows="6"
              class="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/40 transition-all placeholder:text-white/5 resize-none font-rajdhani"
              placeholder="1. @Identity One&#10;২. @Identity Two&#10;1️⃣ @Identity Three&#10;@Identity Four"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button type="button" id="close-modal" class="py-4 bg-white/[0.03] border border-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all text-white/40 hover:text-white">Abort</button>
            <button type="submit" id="confirm-registration-btn" class="py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">Initialize Enrollment</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderActivity() {
  const today = new Date().toISOString().split("T")[0];
  const savedData = localStorage.getItem(GAP_STORAGE_KEYS.activityData) || "";
  const savedDate =
    localStorage.getItem(GAP_STORAGE_KEYS.activityDate) || today;

  return `
    <header class="mb-10 animate-in fade-in slide-in-from-top-2">
      <div class="flex items-center gap-3 mb-6">
        <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
          <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
          Back
        </button>
      </div>
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2.5 h-2.5 rounded-full bg-neon-purple shadow-[0_0_15px_#BF00FF] animate-pulse"></div>
        <p class="text-neon-cyan text-[11px] font-black uppercase tracking-[0.5em] italic font-orbitron">Temporal Sync Link</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter uppercase origin-left">
        ACTIVITY <span class="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-amber bg-clip-text text-transparent underline decoration-neon-purple/20 decoration-4 underline-offset-8">FEED</span>
      </h1>
    </header>

    <div class="max-w-6xl mx-auto px-4 md:px-0 pb-32">
      <div class="glass-card-neon lighting-border p-12 md:p-20 rounded-[4rem] border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent shadow-[0_0_50px_rgba(191,0,255,0.05)]">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-20">
          <div class="lg:col-span-2 space-y-10">
            <div class="flex items-center justify-between px-4">
              <div class="flex items-center gap-3">
                 <div class="w-1.5 h-6 bg-neon-purple rounded-full"></div>
                 <p class="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-orbitron italic">Submission Parameters</p>
              </div>
              <p class="text-[9px] font-black uppercase text-neon-cyan/40 italic font-rajdhani">Auto-Mapping Protocol Active</p>
            </div>
            <textarea 
              id="activity-data" 
              class="w-full h-96 bg-black/40 border border-white/10 rounded-[2.5rem] p-10 text-lg font-bold text-white focus:outline-none focus:border-neon-purple/50 focus:shadow-[0_0_30px_rgba(191,0,255,0.1)] transition-all placeholder:text-white/5 resize-none font-rajdhani leading-relaxed" 
              placeholder="@Operator Input Sequence..."
            >${savedData}</textarea>
          </div>

          <div class="space-y-16 py-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-orbitron italic mb-8 px-2">Temporal Control</p>
              <div class="relative group">
                <input 
                  id="activity-date" 
                  type="date" 
                  value="${savedDate}" 
                  class="w-full bg-white/[0.04] border border-white/10 rounded-[1.5rem] p-6 pl-16 text-sm font-black text-white focus:outline-none focus:border-neon-cyan/40 transition-all font-rajdhani uppercase"
                >
                <i data-lucide="calendar" class="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-cyan/40 group-focus-within:text-neon-cyan transition-colors"></i>
              </div>
              <div class="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                 <p class="text-[10px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                   New entities detected in the sequence will be automatically enrolled into the Wave Database before synchronization.
                 </p>
              </div>
            </div>
            
            <div class="p-8 bg-gradient-to-br from-neon-purple/10 to-transparent rounded-3xl border border-white/5">
               <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple mb-4 font-orbitron">Sequence Buffer</h4>
               <p class="text-[9px] font-black text-white/30 uppercase leading-relaxed italic">Full relational integrity check will be performed on all document pointers.</p>
            </div>

            <button id="submit-activity" class="w-full py-10 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-amber text-black font-black uppercase tracking-[0.4em] text-[12px] rounded-[2rem] transition-all duration-700 hover:scale-[1.05] active:scale-[0.98] shadow-[0_30px_80px_-15px_rgba(191,0,255,0.4)] hover:shadow-[0_40px_100px_-20px_rgba(191,0,255,0.6)]">
              Establish Sync Link
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Discovery Modal -->
    <div id="discovery-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl hidden">
      <div class="w-full max-w-xl glass-card p-12 md:p-16 rounded-[3rem] border-white/10 animate-in zoom-in duration-700 relative overflow-hidden">
        <div class="mb-12">
          <p class="premium-label mb-6">Detection Alert</p>
          <h2 class="text-4xl font-black italic uppercase font-cinzel tracking-tighter">Unknown Entities</h2>
          <p class="text-[9px] text-white/20 font-black uppercase mt-4 tracking-widest italic">The following identities were not found in the grid:</p>
        </div>
        
        <div id="discovery-list" class="max-h-80 overflow-y-auto space-y-3 mb-12 pr-4 custom-scrollbar">
          <!-- Discovery items -->
        </div>

        <div class="grid grid-cols-2 gap-6">
          <button id="cancel-discovery" class="py-6 bg-white/[0.03] border border-white/5 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all">Abort</button>
          <button id="confirm-discovery" class="py-6 bg-white text-black rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-2xl hover:scale-105 transition-all">Enroll & Sync</button>
        </div>
      </div>
    </div>
  `;
}

function renderSearch() {
  return `
    <header class="mb-8 animate-in fade-in slide-in-from-top-2">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_10px_#00F5FF]"></div>
        <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.4em] italic">Global Identity</p>
      </div>
      <h1 class="text-4xl font-black italic tracking-tighter uppercase">Search Protocol</h1>
    </header>
    
    <div class="max-w-xl mx-auto pb-20">
      <div class="relative group mb-10">
        <div class="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-all duration-500"></div>
        <input 
          id="search-input" 
          type="text" 
          class="w-full h-16 bg-black/60 border border-white/10 rounded-2xl px-12 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/40 transition-all placeholder:text-white/20 backdrop-blur-xl" 
          placeholder="ENTER IDENTITY COMMAND..."
        >
        <i data-lucide="search" class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-neon-cyan transition-colors"></i>
      </div>

      <div id="search-results" class="space-y-2">
        <div class="p-10 text-center opacity-20">
          <p class="text-[8px] font-black uppercase tracking-[0.5em]">Input identity parameters...</p>
        </div>
      </div>
    </div>
  `;
}

async function generateInactivityNotice(
  daysThreshold: number,
  noticeType: "warning" | "critical" | "reminder",
  limit: number,
) {
  const { data: allMembers } = await supabase.from("members").select("*");
  if (!allMembers) return "Error: Could not retrieve members.";

  // 1. Get all unique dates where a sync occurred (Group Active Days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: syncLogs } = await supabase
    .from("audit_trail")
    .select("timestamp")
    .ilike("action", "ACTIVITY_SYNC%")
    .gte("timestamp", sixtyDaysAgo.toISOString());

  const activeDates = new Set<string>();
  syncLogs?.forEach((log) => {
    activeDates.add(new Date(log.timestamp).toISOString().split("T")[0]);
  });

  const sortedActiveDates = Array.from(activeDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // 2. Filter and Map members
  const inactiveMembers = allMembers
    .map((m) => {
      if (!m.last_activity_date)
        return { ...m, missedDays: sortedActiveDates.length };

      // Count how many "Active Group Days" have passed since this member's last sync
      const lastSyncDate = m.last_activity_date;
      const missedDays = sortedActiveDates.filter(
        (d) => d > lastSyncDate,
      ).length;

      return { ...m, missedDays };
    })
    .filter((m) => m.missedDays >= daysThreshold)
    .sort((a, b) => b.missedDays - a.missedDays);

  const date = new Date();
  const dateStr = `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear().toString().slice(-2)}`;

  const headers = {
    warning: {
      title: "⚠️ Inactivity Warning ⚠️",
      desc: `আমরা লক্ষ করেছি নিচের মেম্বাররা ${daysThreshold} টি ওয়ার্কিং ডের বেশি\nসময় ধরে গ্রুপে ইনেক্টিভ আছেন।\n\nঅনুগ্রহ করে যত দ্রুত সম্ভব এক্টিভ হন অথবা\nকোনো সমস্যা থাকলে এডমিনের সাথে যোগাযোগ করুন।\nঅন্যথায় আপনাদের গ্রুপ থেকে রিমুভ করা হবে।`,
    },
    critical: {
      title: "❗ Critical Inactivity Alert ❗",
      desc: `সতর্কতা! নিচের মেম্বাররা গত ${daysThreshold} টি ওয়ার্কিং ডে ধরে সম্পূর্ণ ইনেক্টিভ।\nআপনাদের শেষ সুযোগ দেওয়া হচ্ছে। ২৪ ঘণ্টার মধ্যে এক্টিভ না হলে\nস্থায়ীভাবে রিমুভ করা হবে।`,
    },
    reminder: {
      title: "🚫 Final Removal Notice 🚫",
      desc: `চূড়ান্ত নোটিশ! নিচের মেম্বাররা ${daysThreshold} টি ওয়ার্কিং ডে ধরে ইনেক্টিভ থাকায়\nতাদের লিস্ট করা হয়েছে। আজই আপনাদের আইডি গ্রুপ থেকে ক্লিনিং\nকরা হবে। কোনো ওজর আপত্তি গ্রহণযোগ্য নয়।`,
    },
  };

  const selectedHeader = headers[noticeType];

  const list = inactiveMembers
    .slice(0, limit)
    .map((m, i) => {
      const numIcons = [
        "1️⃣",
        "2️⃣",
        "3️⃣",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
      ];
      let displayNum = i < 10 ? numIcons[i] : `${i + 1}️⃣`;
      if (i >= 10) displayNum = `${i + 1}️⃣`;

      return `${displayNum} @${m.name} ➤ (${m.missedDays} দিন ইনেক্টিভ)`;
    })
    .join("\n");

  return `${selectedHeader.title}

প্রিয় গ্রুপ মেম্বারগণ,

${selectedHeader.desc}

😴 Inactive Members 👇
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️

${list || "কোনো ইনেক্টিভ মেম্বার পাওয়া যায়নি।"}

〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
📅 তারিখ: ${dateStr}

✍️ Support Link Box Admin Team`;
}

function renderLeaderboard() {
  return `
    <header class="mb-16 px-4 md:px-0">
      <div class="flex items-center gap-3 mb-8">
        <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
          <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
          Back
        </button>
      </div>
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
        <div class="relative">
          <div class="flex items-center gap-6 mb-8">
            <span class="w-12 h-px bg-neon-pink/40"></span>
            <p class="text-neon-pink text-[10px] font-black uppercase tracking-[0.4em] italic font-orbitron">Performance Pulse</p>
          </div>
          <h1 class="text-4xl md:text-5xl font-black italic tracking-tighter uppercase font-cinzel leading-none text-white whitespace-nowrap">
            GLOBAL<br/><span class="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">LEADERBOARD</span>
          </h1>
        </div>
        
        <div class="flex bg-white/[0.02] p-2 rounded-3xl border border-white/5 self-start">
          <button 
            data-tab="rankings"
            class="px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-700 ${leaderboardTab === "rankings" ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/20 hover:text-white/60"}"
          >Active Rankings</button>
          <button 
            data-tab="inactivity"
            class="px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-700 ${leaderboardTab === "inactivity" ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/20 hover:text-white/60"}"
          >Inactivity Check</button>
        </div>
      </div>
    </header>

    <div id="leaderboard-list" class="px-4 md:px-0 pb-32">
      <div class="p-40 text-center">
         <div class="w-12 h-12 border-4 border-white/5 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
         <p class="premium-label opacity-40">Synchronizing records...</p>
      </div>
    </div>
  `;
}

function renderAudit() {
  return `
    <header class="mb-16 px-4 md:px-0">
      <div class="flex items-center gap-3 mb-8">
        <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
          <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
          Back
        </button>
      </div>
      <div class="relative">
        <div class="flex items-center gap-6 mb-8">
          <span class="w-12 h-px bg-neon-purple/40"></span>
          <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.4em] italic font-orbitron">Archive Protocol</p>
        </div>
        <h1 class="text-4xl md:text-5xl font-black italic tracking-tighter uppercase font-cinzel leading-none text-white whitespace-nowrap">
          SYSTEM<br/><span class="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">AUDIT</span>
        </h1>
      </div>
    </header>

    <div id="audit-list" class="mx-4 md:mx-0 pb-32">
      <div class="p-40 text-center glass-card rounded-[3rem] border-white/5 overflow-hidden">
        <div class="w-12 h-12 border-4 border-white/5 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
        <p class="premium-label opacity-40">Retrieving security records...</p>
      </div>
    </div>
  `;
}

function renderHeatmap() {
  return `
    <header class="mb-12">
       <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#00FF88]"></div>
        <p class="text-neon-green text-[10px] font-black uppercase tracking-[0.3em]">Temporal Flow</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">ACTIVITY HEATMAP</h1>
    </header>
    <div class="glass-card p-10 rounded-3xl border-white/5">
       <div id="heatmap-container" class="flex flex-wrap gap-2">
          <div class="p-20 text-center text-gray-600 italic w-full">Mapping temporal activity...</div>
       </div>
    </div>
  `;
}

function attachContentEvents() {
  if (currentRoute === "dashboard") {
    fetchDashboardStats();
    
    // Live Notice Box Broadcaster
    const noticeDisplay = document.getElementById("notice-box-display");
    if (noticeDisplay) {
      const messages = [
        "Welcome Back. System is fully operational.",
        "Security Sweep Complete. No issues found.",
        "Database Link is stable and secured.",
        "Notice: Member registry updated successfully.",
        "Matrix Scan: Everything at optimal levels.",
        "Support Link Box: Ready for operation."
      ];
      
      if ((window as any).noticeIdx === undefined) (window as any).noticeIdx = 0;
      
      const updateDisplay = () => {
        const display = document.getElementById("notice-box-display");
        if (display) {
          const i = (window as any).noticeIdx;
          display.innerHTML = `<p class="text-lg font-black italic animate-in slide-in-from-bottom-2 duration-500 font-orbitron tracking-[0.1em] leading-relaxed text-center text-white drop-shadow-[0_0_10px_rgba(0,245,255,0.6)]">
            <span class="text-neon-cyan animate-pulse">>></span> ${messages[i % messages.length]}
          </p>`;
          (window as any).noticeIdx++;
        }
      };

      // Initial update
      updateDisplay();

      if ((window as any).noticeInterval) clearInterval((window as any).noticeInterval);
      (window as any).noticeInterval = setInterval(() => {
        if (currentRoute !== "dashboard" || !document.getElementById("notice-box-display")) {
          clearInterval((window as any).noticeInterval);
          return;
        }
        updateDisplay();
      }, 4000);
    }
  } else if (currentRoute === "members") {
    fetchMembers();

    const searchInput = document.getElementById("member-search-input") as HTMLInputElement;
    let searchTimeout: any;
    if (searchInput) {
      searchInput.oninput = (e) => {
        const val = (e.target as HTMLInputElement).value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          filterMembersInList(val);
        }, 300);
      };
    }

    const addBtn = document.getElementById("add-member-btn");
    if (addBtn) addBtn.onclick = () => {
      document.getElementById("member-modal")?.classList.remove("hidden");
    };

    const closeBtn = document.getElementById("close-modal");
    if (closeBtn) closeBtn.onclick = () => {
      document.getElementById("member-modal")?.classList.add("hidden");
    };

    const memberForm = document.getElementById("member-form");
    if (memberForm) {
      memberForm.onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const rawNames = formData.get("names") as string;

        const namesList: string[] = [];
        // ... (Extraction logic below)
        
        // Robust Name Extraction Logic
        const lines = rawNames.split('\n');
        for (let line of lines) {
          let cleaned = line.trim();
          if (!cleaned) continue;

          // 1. Remove common list numbering and prefixes (1., ১., 1️⃣, etc.)
          // We target digits (0-9, ০-৯), symbols, and prefix noise
          cleaned = cleaned.replace(/^[0-9০০-৯\.\s#*️⃣🔟\uFE0F\u20E3@।৷\-–—]+/, '');
          
          // 2. Aggressively strip any non-word characters from the start
          // This handles cases like "@ @ Name" or ". Name" or "১. @ Name"
          cleaned = cleaned.replace(/^[^a-zA-Z0-9\u0980-\u09FF]+/, '');
          
          // 3. Final cleanup of any leading @ or spaces
          cleaned = cleaned.replace(/^[@\.\s]+/, '');
          
          cleaned = cleaned.trim();

          // 2. Filter out keywords and short strings
          const lower = cleaned.toLowerCase();
          if (cleaned && 
              cleaned.length >= 2 && 
              !lower.includes("no post") && 
              !lower.includes("points") && 
              !lower.includes("sync")) {
            namesList.push(cleaned);
          }
        }

        if (namesList.length === 0) {
          alert("Matrix Error: No valid identifications found in current stream. Please ensure names follow the enrollment format.");
          return;
        }

        const btn = document.getElementById(
          "confirm-registration-btn",
        ) as HTMLButtonElement;
        btn.textContent = "EXECUTING BATCH...";
        btn.disabled = true;

        try {
          // 1. Get existing members to check for duplicates and find last member number
          const { data: existingMembers } = await supabase
            .from("members")
            .select("name, member_number");
          const existingNames = new Set(
            existingMembers?.map((m) => m.name.toLowerCase()),
          );
          let lastMemberNumber = Math.max(
            ...(existingMembers?.map((m) => m.member_number) || [0]),
            0,
          );

          const newMembers = [];
          const skippedNames = [];

          for (const rawName of namesList) {
            if (existingNames.has(rawName.toLowerCase())) {
              skippedNames.push(rawName);
              continue;
            }

            existingNames.add(rawName.toLowerCase());
            lastMemberNumber++;

            newMembers.push({
              name: rawName,
              member_number: lastMemberNumber,
              total_points: 0,
              current_streak: 0,
              max_streak: 0,
              total_syncs: 0,
            });
          }

          if (newMembers.length > 0) {
            const { error } = await supabase.from("members").insert(newMembers);
            if (error) throw error;
            await logAudit(
              "MEMBER_BATCH_REGISTER",
              `Registered ${newMembers.length} members. Skiped ${skippedNames.length} duplicates.`,
            );
          }

          membersCache = null; // Invalidate cache
          document.getElementById("member-modal")?.classList.add("hidden");
          fetchMembers();
          form.reset();

          if (skippedNames.length > 0) {
            alert(
              `Success: Registered ${newMembers.length} members.\nSkipped ${skippedNames.length} duplicates: ${skippedNames.slice(0, 3).join(", ")}${skippedNames.length > 3 ? "..." : ""}`,
            );
          } else {
            alert(
              `Success: Sequential registration of ${newMembers.length} members complete.`,
            );
          }
        } catch (error: any) {
          alert("Batch Registration Failed: " + error.message);
        } finally {
          btn.textContent = "Initialize Batch Registration";
          btn.disabled = false;
        }
      };
    }

    // --- Header-level Batch Logic (Outside the form handler) ---
    const selectAllToggle = document.getElementById("select-all-members") as HTMLInputElement | null;
    const executeBatchPurge = document.getElementById("batch-delete-btn") as HTMLButtonElement | null;

    if (selectAllToggle) {
      selectAllToggle.onchange = () => {
        const list = document.getElementById("members-list");
        if (!list) return;
        const allListCbs = list.querySelectorAll(".member-select-checkbox") as NodeListOf<HTMLInputElement>;
        allListCbs.forEach(cb => {
          const cardParent = cb.closest(".member-card") as HTMLElement;
          if (cardParent && !cardParent.classList.contains("hidden")) {
            cb.checked = (selectAllToggle as HTMLInputElement).checked;
          }
        });
        const refreshUI = (window as any).refreshBatchUI;
        if (refreshUI) refreshUI();
      };
    }

    if (executeBatchPurge) {
      executeBatchPurge.onclick = async () => {
        console.log("Execute Batch Purge Initialized");
        const list = document.getElementById("members-list");
        if (!list) return;
        
        const allCbs = list.querySelectorAll(".member-select-checkbox") as NodeListOf<HTMLInputElement>;
        const selectedIds = Array.from(allCbs)
          .filter(cb => cb.checked)
          .map(cb => (cb as HTMLElement).dataset.selectId)
          .filter(id => !!id) as string[];
        
        if (selectedIds.length === 0) {
          showNotice("No Selection", "Please mark identities for purging.", "warning");
          return;
        }

        if (confirm(`Authorize mass deletion of ${selectedIds.length} units?`)) {
          showNotice("Batch Purge", "Initiating mass removal...", "info");
          const originalBtnLabel = executeBatchPurge.innerHTML;
          executeBatchPurge.innerHTML = "PURGING...";
          executeBatchPurge.disabled = true;

          try {
            const { error } = await supabase.from("members").delete().in("id", selectedIds);
            if (error) throw error;

            await logAudit("MEMBER_BATCH_DELETE", `Mass purge of ${selectedIds.length} identities.`);
            membersCache = null;
            await fetchMembers();
            showNotice("Success", `${selectedIds.length} identifies purged.`, "success");
          } catch (err: any) {
            console.error("Batch Delete Error Logged:", err);
            alert("Purge Failed: " + (err.message || String(err)));
          } finally {
            executeBatchPurge.disabled = false;
            executeBatchPurge.innerHTML = originalBtnLabel;
            refreshIcons();
          }
        }
      };
    }
  } else if (currentRoute === "activity") {
    const textarea = document.getElementById(
      "activity-data",
    ) as HTMLTextAreaElement;
    const dateInput = document.getElementById(
      "activity-date",
    ) as HTMLInputElement;

    textarea?.addEventListener("input", () => {
      localStorage.setItem(GAP_STORAGE_KEYS.activityData, textarea.value);
    });

    dateInput?.addEventListener("input", () => {
      localStorage.setItem(GAP_STORAGE_KEYS.activityDate, dateInput.value);
    });

    document
      .getElementById("submit-activity")
      ?.addEventListener("click", async () => {
        const textarea = document.getElementById(
          "activity-data",
        ) as HTMLTextAreaElement;
        const dateInput = document.getElementById(
          "activity-date",
        ) as HTMLInputElement;
        const data = textarea.value;
        const date = dateInput.value;

        if (!data) return alert("No submission data found.");

        const syncBtn = document.getElementById(
          "submit-activity",
        ) as HTMLButtonElement;
        const originalBtnText = syncBtn.innerHTML;

        const executeSync = async (toRegister: string[] = []) => {
          syncBtn.textContent = "EXECUTING SYNC...";
          syncBtn.disabled = true;

          try {
            const activities = parseActivityBatch(data);
            let successCount = 0;

            // 1. Handle new registrations if any
            if (toRegister.length > 0) {
              const { data: existingMembers } = await supabase
                .from("members")
                .select("member_number");
              let lastMemberNumber = Math.max(
                ...(existingMembers?.map((m) => m.member_number) || [0]),
                0,
              );

              const newMembers = toRegister.map((name) => ({
                name,
                member_number: ++lastMemberNumber,
                total_points: 0,
                current_streak: 0,
                max_streak: 0,
                total_syncs: 0,
              }));

              await supabase.from("members").insert(newMembers);
              await logAudit(
                "MEMBER_DISCOVERY_SYNC",
                `Registered ${newMembers.length} members discovered during sync.`,
              );
            }

            // 2. Fetch updated member map
            const { data: members } = await supabase
              .from("members")
              .select("*");
            const memberMap = new Map();
            members?.forEach((m) => memberMap.set(m.name.toLowerCase(), m));

            // 3. Process activity updates
            const updates = [];
            for (const act of activities) {
              const member = memberMap.get(act.username.toLowerCase());
              if (member) {
                const newPoints = (member.total_points || 0) + act.points;
                const totalSyncs = (member.total_syncs || 0) + 1;

                let currentStreak = member.current_streak || 0;
                const lastDate = member.last_activity_date
                  ? new Date(member.last_activity_date)
                  : null;
                const syncDate = new Date(date);

                if (lastDate) {
                  const diffTime = Math.abs(
                    syncDate.getTime() - lastDate.getTime(),
                  );
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays === 1) currentStreak += 1;
                  else if (diffDays > 1) currentStreak = 1;
                } else {
                  currentStreak = 1;
                }

                const maxStreak = Math.max(
                  member.max_streak || 0,
                  currentStreak,
                );

                updates.push(
                  supabase
                    .from("members")
                    .update({
                      total_points: newPoints,
                      total_syncs: totalSyncs,
                      last_activity_date: date,
                      current_streak: currentStreak,
                      max_streak: maxStreak,
                    })
                    .eq("id", member.id),
                );

                successCount++;
              }
            }

            if (updates.length > 0) {
              await Promise.all(updates);
              await logAudit(
                "ACTIVITY_SYNC_BATCH",
                `Personnel sync complete: ${successCount} units updated on ${date}.`,
              );
            }

            membersCache = null; // Invalidate cache
            alert(
              `Sync Complete! ${successCount} entries processed for ${date}.`,
            );
            textarea.value = "";
            localStorage.removeItem(GAP_STORAGE_KEYS.activityData);
            localStorage.removeItem(GAP_STORAGE_KEYS.activityDate);
            navigate("dashboard");
          } catch (err: any) {
            console.error("Sync Error:", err);
            alert(
              "Sync Failed: " +
                (err.message || "Database connection interrupted."),
            );
          } finally {
            syncBtn.innerHTML = originalBtnText;
            syncBtn.disabled = false;
          }
        };

        // --- Discovery Logic ---
        try {
          const activities = parseActivityBatch(data);
          const { data: members } = await supabase
            .from("members")
            .select("name");
          const existingNames = new Set(
            members?.map((m) => m.name.toLowerCase()),
          );

          const unknownNames = Array.from(
            new Set(
              activities
                .map((a) => a.username)
                .filter((name) => !existingNames.has(name.toLowerCase())),
            ),
          );

          if (unknownNames.length > 0) {
            const modal = document.getElementById("discovery-modal")!;
            const list = document.getElementById("discovery-list")!;
            modal.classList.remove("hidden");

            list.innerHTML = unknownNames
              .map(
                (name, i) => `
            <label class="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-neon-pink/40 transition-all">
              <input type="checkbox" checked value="${name}" class="w-4 h-4 rounded border-white/20 bg-transparent text-neon-pink focus:ring-neon-pink">
              <span class="text-sm font-bold text-gray-300">@${name}</span>
            </label>
          `,
              )
              .join("");

            const cancelBtn = document.getElementById("cancel-discovery")!;
            const confirmBtn = document.getElementById("confirm-discovery")!;

            const handleCancel = () => {
              modal.classList.add("hidden");
              syncBtn.innerHTML = originalBtnText;
              syncBtn.disabled = false;
            };

            const handleConfirm = () => {
              const checked = Array.from(
                list.querySelectorAll("input:checked"),
              ).map((i) => (i as HTMLInputElement).value);
              modal.classList.add("hidden");
              executeSync(checked);
            };

            cancelBtn.onclick = handleCancel;
            confirmBtn.onclick = handleConfirm;
          } else {
            executeSync([]);
          }
        } catch (err) {
          alert("Discovery Protocol Failure.");
        }
      });
  } else if (currentRoute === "leaderboard") {
    fetchLeaderboard();
  } else if (currentRoute === "listgenerator") {
    initializeListGenerator(() => render());
  } else if (currentRoute === "admin") {
    initializeAdminPanel(() => render());
  } else if (currentRoute === "topperformer") {
    initializeTopPerformer(() => render());
  } else if (currentRoute === "memberMission") {
    initializeMission(() => render());
    attachMissionEvents(() => render());
  } else if (currentRoute === "audit") {
    fetchAuditLogs();
  } else if (currentRoute === "heatmap") {
    fetchHeatmapData();
  } else if (currentRoute === "gapchecker") {
    attachGapCheckerEvents();
  } else if (currentRoute === "shortener") {
    attachShortenerEvents();
  }
}

async function fetchLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  // Re-attach tab events immediately
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    (btn as HTMLButtonElement).onclick = (e) => {
      const tab = (e.currentTarget as HTMLButtonElement).dataset.tab as any;
      if (tab !== leaderboardTab) {
        leaderboardTab = tab;
        render();
      }
    };
  });

  try {
    if (leaderboardTab === "rankings") {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      container.innerHTML = `
        <div class="glass-card rounded-[1.5rem] border-white/5 overflow-hidden animate-in fade-in duration-700">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-white/[0.02] border-b border-white/5">
                <th class="p-3 premium-label !text-white/20">Pos</th>
                <th class="p-3 premium-label !text-white/20">Identity</th>
                <th class="p-3 premium-label !text-white/20">Points</th>
                <th class="p-3 premium-label !text-white/20 text-right">Badge</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.01]">
              ${data?.map((m, i) => `
                <tr class="hover:bg-white/[0.01] transition-colors group">
                  <td class="p-3">
                    <span class="text-[11px] font-black italic text-white/20 group-hover:text-white transition-colors">
                      ${(i + 1).toString().padStart(2, "0")}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="text-[10px] font-bold uppercase tracking-tight text-white/60 group-hover:text-white transition-colors font-rajdhani">
                      ${m.name}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="text-[11px] font-black italic text-neon-cyan/60 group-hover:text-neon-cyan transition-colors">
                      ${m.total_points}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <span class="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[7px] font-black uppercase tracking-widest text-white/10 uppercase italic">
                      ${calculateLevel(m.total_points)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Inactivity View
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [{ data: allMembers }, { data: syncLogs }] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("audit_trail").select("timestamp").ilike("action", "ACTIVITY_SYNC%").gte("timestamp", sixtyDaysAgo.toISOString())
      ]);

      if (!allMembers) throw new Error("Personnel records inaccessible");

      const activeDates = new Set<string>();
      syncLogs?.forEach((log) => {
        activeDates.add(new Date(log.timestamp).toISOString().split("T")[0]);
      });
      const sortedActiveDates = Array.from(activeDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      const mappedMembers = allMembers
        .map((m) => {
          if (!m.last_activity_date) return { ...m, missedDays: sortedActiveDates.length || 99 };
          const missedDays = sortedActiveDates.filter((d) => d > m.last_activity_date).length;
          return { ...m, missedDays };
        })
        .sort((a, b) => b.missedDays - a.missedDays);

      container.innerHTML = `
        <div class="space-y-6 animate-in fade-in duration-700">
          <div class="glass-card rounded-[1.5rem] border-white/5 overflow-hidden">
            <div class="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/[0.01]">
              <div>
                <p class="premium-label !text-[7px] mb-1">Override Protocol</p>
                <h3 class="text-base font-black italic uppercase font-cinzel leading-none">Matrix Gaps</h3>
              </div>
              <button id="show-generator-btn" class="px-6 py-2.5 bg-white text-black rounded-xl font-black uppercase text-[8px] tracking-widest hover:scale-[1.05] transition-all">
                Notice Tool
              </button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="bg-white/[0.02] border-b border-white/5">
                    <th class="p-4 premium-label !text-white/20 text-[7px]">ID</th>
                    <th class="p-4 premium-label !text-white/20 text-[7px]">Identity</th>
                    <th class="p-4 premium-label !text-white/20 text-[7px]">Status</th>
                    <th class="p-4 premium-label !text-white/20 text-right text-[7px]">Gaps</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.01]">
                  ${mappedMembers.map((m) => `
                    <tr class="hover:bg-white/[0.01] transition-colors">
                      <td class="p-4 text-[10px] font-black text-white/10 italic">#${m.member_number}</td>
                      <td class="p-4 text-[10px] font-bold uppercase text-white/60 font-rajdhani">${m.name}</td>
                      <td class="p-4">
                        <span class="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border border-white/5
                          ${m.missedDays >= 3 ? "bg-neon-red/10 text-neon-red border-neon-red/20" : m.missedDays > 0 ? "bg-neon-amber/10 text-neon-amber border-neon-amber/20" : "bg-neon-green/10 text-neon-green border-neon-green/20"}"
                        >
                          ${m.missedDays >= 3 ? "CRITICAL" : m.missedDays > 0 ? "STREAK RISK" : "SYNCED"}
                        </span>
                      </td>
                      <td class="p-4 text-right text-[10px] font-black italic text-white/20">${m.missedDays} Cycles</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div id="notice-generator-section" class="hidden glass-card p-12 md:p-20 rounded-[3rem] border-white/5 animate-in slide-in-from-top-12 duration-700">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-16">
              <div class="space-y-12">
                <div>
                  <p class="premium-label mb-8">Notice Logic</p>
                  <div class="space-y-8">
                    <div>
                      <label class="premium-label !text-[8px] mb-3 block opacity-40">Gap Threshold</label>
                      <select id="inactivity-days" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-xs text-white font-black uppercase outline-none focus:border-white/20 transition-all font-rajdhani">
                        <option value="1">1+ Day Missed</option>
                        <option value="2">2+ Days Missed</option>
                        <option value="3" selected>3+ Days Missed</option>
                        <option value="5">5+ Days Missed</option>
                        <option value="7">7+ Days Missed</option>
                      </select>
                    </div>
                    <div>
                      <label class="premium-label !text-[8px] mb-3 block opacity-40">Protocol Mode</label>
                      <select id="notice-type" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-xs text-white font-black uppercase outline-none focus:border-white/20 transition-all font-rajdhani">
                        <option value="warning">Warning Protocol</option>
                        <option value="critical">Critical Extraction</option>
                        <option value="reminder">Standard Reminder</option>
                      </select>
                    </div>
                    <button id="generate-notice-btn" class="w-full py-6 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl">
                      Generate Logic
                    </button>
                  </div>
                </div>
                
                <div class="p-8 bg-white/[0.01] rounded-2xl border border-white/5" id="inactivity-stats">
                   <!-- Stats will hydrate here -->
                </div>
              </div>

              <div class="xl:col-span-2 relative group">
                <div class="absolute top-6 right-6 z-10">
                   <button id="copy-notice-btn" class="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-white/10 transition-all flex items-center gap-3">
                      <i data-lucide="copy" class="w-3 h-3"></i>
                      Copy Protocol
                   </button>
                </div>
                <p class="premium-label mb-8">Output Matrix</p>
                <textarea id="notice-output" readonly placeholder="System awaiting generation..." class="w-full h-[600px] bg-white/[0.01] border border-white/5 rounded-[2rem] p-10 text-white/60 font-mono text-xs leading-relaxed resize-none scrollbar-hide focus:outline-none"></textarea>
              </div>
            </div>
          </div>
        </div>
      `;

      // Hydrate child events
      const showGenBtn = document.getElementById("show-generator-btn");
      const genSection = document.getElementById("notice-generator-section");
      showGenBtn?.addEventListener("click", () => {
        genSection?.classList.toggle("hidden");
        showGenBtn.textContent = genSection?.classList.contains("hidden") ? "Open Notice Tool" : "Close Notice Tool";
      });

      const daysSelect = document.getElementById("inactivity-days") as HTMLSelectElement;
      const typeSelect = document.getElementById("notice-type") as HTMLSelectElement;
      const generateBtn = document.getElementById("generate-notice-btn");
      const copyBtn = document.getElementById("copy-notice-btn");
      const textarea = document.getElementById("notice-output") as HTMLTextAreaElement;

      const updateStats = (days: number) => {
        const inactive = mappedMembers.filter(m => m.missedDays >= days);
        const stats = document.getElementById("inactivity-stats");
        if (stats) stats.innerHTML = `
          <p class="premium-label !text-[7px] mb-3 opacity-30 text-center">Threshold Conflict Report</p>
          <div class="text-center">
            <span class="text-4xl font-black italic font-cinzel text-white leading-none">${inactive.length}</span>
            <p class="premium-label mt-2">Active Targets</p>
          </div>
        `;
      };

      updateStats(parseInt(daysSelect.value));
      daysSelect.onchange = () => updateStats(parseInt(daysSelect.value));

      generateBtn?.addEventListener("click", async () => {
        generateBtn.textContent = "SYNCHRONIZING...";
        (generateBtn as HTMLButtonElement).disabled = true;
        const notice = await generateInactivityNotice(parseInt(daysSelect.value), typeSelect.value as any, 100);
        textarea.value = notice;
        generateBtn.textContent = "Generate Logic";
        (generateBtn as HTMLButtonElement).disabled = false;
      });

      copyBtn?.addEventListener("click", () => {
        textarea.select();
        document.execCommand("copy");
        copyBtn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> Copied';
        setTimeout(() => {
          copyBtn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i> Copy Protocol';
          refreshIcons();
        }, 2000);
      });
    }

    refreshIcons();
  } catch (err: any) {
    if (container) container.innerHTML = `<div class="p-20 text-center text-white/20 premium-label">Grid Sync Error: ${err.message}</div>`;
  }
}

async function fetchAuditLogs() {
  const { data } = await supabase
    .from("audit_trail")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(20);
  const list = document.getElementById("audit-list");
  if (list && data) {
    list.innerHTML = `
      <div class="divide-y divide-white/5">
        ${data
          .map(
            (log) => `
          <div class="p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
            <div>
              <div class="text-[10px] font-black uppercase text-neon-red mb-1">${log.action}</div>
              <div class="text-sm font-bold text-gray-300">${log.description}</div>
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-[9px] font-black uppercase text-gray-600">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="text-[10px] font-bold text-gray-500">${log.admin_name || "Admin"}</div>
              </div>
              <button 
                data-delete-audit="${log.id}"
                class="opacity-0 group-hover:opacity-100 p-2 text-gray-700 hover:text-neon-red transition-all"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    list.querySelectorAll("[data-delete-audit]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.deleteAudit;
        if (confirm("Authorize log deletion?")) {
          const { error } = await supabase
            .from("audit_trail")
            .delete()
            .eq("id", id);
          if (!error) fetchAuditLogs();
        }
      });
    });

    refreshIcons();
  }
}

async function logAudit(action: string, description: string) {
  await supabase.from("audit_trail").insert({
    action,
    description,
    admin_name: getAdminName(user?.email),
    timestamp: new Date().toISOString(),
  });
}

async function fetchHeatmapData() {
  const container = document.getElementById("heatmap-container");
  if (container) {
    container.innerHTML = `<div class="p-20 text-center text-gray-700 italic w-full">Heatmap visualization requires d3 integration. Data fetched successfully.</div>`;
  }
}

function renderMemberCardHtml(member: Member) {
  return `
    <div class="group relative member-card" data-member-id="${member.id}">
      <div class="glass-card-neon lighting-border p-4 h-full flex flex-col border-white/10 hover:border-white/30 transition-all duration-500 cursor-pointer overflow-hidden rounded-[1.5rem] bg-black/40">
        <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-neon-cyan/10 to-transparent -mr-12 -mt-12 rounded-full"></div>
        
        <!-- Batch Selection Checkbox -->
        <div class="absolute top-4 left-4 z-20">
          <input 
            type="checkbox" 
            class="member-select-checkbox w-4 h-4 rounded border-white/10 bg-black/40 text-neon-cyan focus:ring-neon-cyan/50 cursor-pointer opacity-40 group-hover:opacity-100 transition-opacity" 
            data-select-id="${member.id}"
          >
        </div>

        <div class="flex items-center gap-3 mb-4 mt-2 relative z-10 pl-6">
          <div class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center font-black text-neon-cyan italic text-xs group-hover:bg-white group-hover:text-black transition-all duration-500 shadow-xl shrink-0">
            #${member.member_number}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-black italic uppercase tracking-tight text-white text-[12px] sm:text-[14px] leading-tight group-hover:text-neon-cyan transition-colors duration-500 font-cinzel truncate">${member.name}</h4>
            <p class="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mt-1 flex items-center gap-2 font-orbitron group-hover:text-neon-cyan/60 transition-colors">
              <span class="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F5FF] animate-pulse"></span>
              ${calculateLevel(member.total_points || 0)}
            </p>
          </div>
          <button 
            type="button"
            onclick="event.stopPropagation(); if(typeof window.initiateMemberPurge === 'function') window.initiateMemberPurge('${member.id}', '${member.name}')"
            class="delete-single-btn p-2.5 bg-neon-red/20 text-neon-red rounded-xl opacity-100 hover:bg-neon-red hover:text-white transform transition-all duration-300 hover:scale-110 active:scale-90 z-30 flex items-center justify-center"
          >
            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 relative z-10">
          <div class="text-left">
            <span class="block text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 italic font-orbitron">Neural Pts</span>
            <span class="text-xl font-black italic text-white group-hover:text-neon-cyan transition-colors">${member.total_points || 0}</span>
          </div>
          <div class="text-right">
            <span class="block text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 italic font-orbitron">Max Chain</span>
            <span class="text-xl font-black italic text-white/40 group-hover:text-white/80 transition-colors">${member.max_streak || 0}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachMemberCardEvents(data: Member[]) {
  const list = document.getElementById("members-list");
  if (!list) return;

  // 1. Definition of UI update logic for selection (Used by check-boxes)
  const refreshBatchUI = () => {
    const listEl = document.getElementById("members-list");
    if (!listEl) return;
    
    const cbs = listEl.querySelectorAll(".member-select-checkbox") as NodeListOf<HTMLInputElement>;
    const selected = Array.from(cbs).filter(cb => cb.checked);
    
    const count = selected.length;
    const batchBtn = document.getElementById("batch-delete-btn") as HTMLButtonElement | null;
    const countLabel = document.getElementById("selected-count");
    const selectionToolbar = document.getElementById("bulk-selection-toolbar");
    const allToggle = document.getElementById("select-all-members") as HTMLInputElement | null;

    if (countLabel) countLabel.textContent = count.toString();
    
    if (count > 0) {
      batchBtn?.classList.remove("hidden");
      selectionToolbar?.classList.remove("hidden");
    } else {
      batchBtn?.classList.add("hidden");
      selectionToolbar?.classList.add("hidden");
      if (allToggle) allToggle.checked = false;
    }
  };
  (window as any).refreshBatchUI = refreshBatchUI;

  // 2. Global Purge Handler (Guaranteed availability)
  (window as any).initiateMemberPurge = async (id: string, name: string) => {
    if (!id) return;
    
    // Explicit console logging for debugging
    console.log("DELETION PROTOCOL INITIATED:", name, id);

    if (confirm(`AUTHORIZE IMMEDIATE PURGE FOR IDENTITY: ${name}?`)) {
      showNotice("Processing", `Establishing secure link to database...`, "info");
      try {
        const { error } = await supabase.from("members").delete().eq("id", id);
        if (error) throw error;
        
        await logAudit("MEMBER_DELETE", `Purged identity: ${name}`);
        membersCache = null;
        await fetchMembers();
        showNotice("Success", `${name} purged from Matrix successfully.`, "success");
      } catch (err: any) {
        console.error("CRITICAL PURGE ERROR:", err);
        alert("Operation Failed: " + (err.message || String(err)));
      }
    }
  };

  // 3. Delegation for Card Details and Checkboxes
  list.onclick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Stop propagation for checkboxes
    if (target.closest(".member-select-checkbox")) {
      e.stopPropagation();
      return;
    }

    // Details logic
    const card = target.closest(".member-card") as HTMLElement;
    if (card) {
      const id = card.dataset.memberId;
      const member = data.find((m) => m.id === id);
      if (member) {
        selectedMember = member;
        render();
      }
    }
  };

  // 4. Checkbox change listeners for immediate UI feedback
  list.querySelectorAll(".member-select-checkbox").forEach(cb => {
    (cb as HTMLInputElement).onchange = (e) => {
      e.stopPropagation();
      refreshBatchUI();
    };
  });

  refreshBatchUI();
  refreshIcons();
}

function filterMembersInList(query: string) {
  const list = document.getElementById("members-list");
  if (!list || !membersCache) return;
  
  if (!query || query.length < 1) {
    list.innerHTML = membersCache.map(member => renderMemberCardHtml(member)).join('');
    attachMemberCardEvents(membersCache);
    return;
  }
  
  const filtered = membersCache.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="p-20 text-center col-span-full opacity-30 text-[10px] font-black uppercase tracking-widest italic">No matching identities found in roster.</div>`;
    return;
  }
  
  list.innerHTML = filtered.map(member => renderMemberCardHtml(member)).join('');
  attachMemberCardEvents(filtered);
}

async function fetchMembers() {
  const list = document.getElementById("members-list");
  if (!list) return;

  try {
    const now = Date.now();
    const isCacheValid =
      membersCache && now - lastMembersFetch < CACHE_DURATION;

    let data: Member[] | null = membersCache;

    if (!isCacheValid) {
      list.innerHTML = `<div class="p-20 text-center col-span-full"><div class="w-10 h-10 border-4 border-neon-pink/20 border-t-neon-pink rounded-full animate-spin mx-auto mb-4"></div><p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Accessing Roster...</p></div>`;
      const { data: fetchedData, error } = await supabase
        .from("members")
        .select("*")
        .order("member_number", { ascending: true });
      if (error) throw error;
      data = fetchedData;
      membersCache = fetchedData;
      lastMembersFetch = now;
    }

    if (data) {
      list.innerHTML = data.map((member) => renderMemberCardHtml(member)).join("");
      attachMemberCardEvents(data);
    }
  } catch (err: any) {
    list.innerHTML = `<div class="p-10 text-center text-neon-red font-black uppercase italic tracking-widest">Database Sync Failure: ${err.message}</div>`;
  }
}

async function performSearch(query: string) {
  const results = document.getElementById("search-results");
  if (!results) return;
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (!data || data.length === 0) {
    results.innerHTML = `<div class="p-10 text-center text-gray-600 italic">No members match your criteria.</div>`;
    return;
  }

  if (data) {
    results.innerHTML = data
      .map(
        (m) => `
            <div class="glass-card p-4 rounded-xl border-white/5 flex justify-between items-center cursor-pointer hover:border-neon-cyan/40 transition-all search-result-item" data-id="${m.id}">
                <span class="font-black italic uppercase text-sm">${m.name}</span>
                <span class="text-[10px] font-black uppercase text-neon-cyan">${m.total_points} PTS</span>
            </div>
        `,
      )
      .join("");

    results.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = (item as HTMLElement).dataset.id;
        const member = data.find((m) => m.id === id);
        if (member) {
          selectedMember = member;
          render();
        }
      });
    });
  }
}

function renderStatCard(
  label: string,
  value: string,
  colorClass: string,
  icon: string,
  id?: string,
) {
  return `
    <div class="glass-card p-8 rounded-3xl border-white/5 flex flex-col items-center text-center group">
       <div class="w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">
         <i data-lucide="${icon}" class="w-8 h-8"></i>
       </div>
       <span class="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2">${label}</span>
       <span id="${id || ""}" class="text-3xl font-black italic tracking-tighter text-white">${value}</span>
    </div>
  `;
}

function attachLoginEvents() {
  const loginBtn = document.getElementById("login-btn");
  const emailInput = document.getElementById("login-email") as HTMLInputElement;
  const passwordInput = document.getElementById("login-password") as HTMLInputElement;
  const errorDiv = document.getElementById("login-error");

  const handleLogin = async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      if (errorDiv) {
        errorDiv.textContent = "CREDENTIALS REQUIRED";
        errorDiv.classList.remove("hidden");
      }
      return;
    }

    if (loginBtn) {
      loginBtn.innerHTML = `
        <div class="relative w-full h-full bg-transparent text-white font-black uppercase tracking-[0.4em] text-[12px] rounded-2xl flex items-center justify-center font-orbitron overflow-hidden">
           <span class="relative z-10">AUTHORIZING...</span>
           <div class="absolute inset-0 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-amber animate-pulse"></div>
        </div>
      `;
      loginBtn.setAttribute("disabled", "true");
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (loginBtn) {
          loginBtn.innerHTML = `
            <div class="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div class="relative w-full h-full bg-white text-black font-black uppercase tracking-[0.4em] text-[12px] rounded-2xl flex items-center justify-center font-orbitron group-hover:bg-transparent group-hover:text-white transition-all duration-500 overflow-hidden">
                <span class="relative z-10">Authorize Access</span>
                <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          `;
          loginBtn.removeAttribute("disabled");
        }
        if (errorDiv) {
          errorDiv.textContent = "PROTOCOL DENIED: INVALID CIPHER";
          errorDiv.classList.remove("hidden");
        }
      } else {
        user = data.user;
        currentRoute = "dashboard";
        render();
      }
    } catch (err: any) {
      console.error(err);
      if (loginBtn) {
        loginBtn.innerHTML = `
          <div class="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <div class="relative w-full h-full bg-white text-black font-black uppercase tracking-[0.4em] text-[12px] rounded-2xl flex items-center justify-center font-orbitron group-hover:bg-transparent group-hover:text-white transition-all duration-500 overflow-hidden">
              <span class="relative z-10">Authorize Access</span>
              <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        `;
        loginBtn.removeAttribute("disabled");
      }
    }
  };

  loginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    handleLogin();
  });
  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  emailInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") passwordInput.focus();
  });
}

function attachSidebarEvents() {
  document.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const isLocked = target.dataset.locked === 'true';
      
      if (isLocked) {
        showNotice('Protocol Lock', 'Restricted Authorization Required', 'warning');
        return;
      }

      const route = target.dataset.route as Route;
      if (route) {
        isSidebarOpen = false; // Close on navigation
        navigate(route);
      }
    });
  });

  document.querySelectorAll("[data-theme-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const themeId = (e.currentTarget as HTMLButtonElement).dataset
        .themeId as Theme;
      applyTheme(themeId);
      render(); // Re-render to update the "active" state of theme buttons
    });
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
}

function attachMobileEvents() {
  document.getElementById("toggle-sidebar")?.addEventListener("click", () => {
    isSidebarOpen = !isSidebarOpen;
    render();
  });

  document.getElementById("sidebar-backdrop")?.addEventListener("click", () => {
    isSidebarOpen = false;
    render();
  });
}

async function fetchDashboardStats() {
  try {
    const { count, error } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true });
    if (error) throw error;

    const memberCount = document.getElementById("stat-total-members");
    if (memberCount)
      memberCount.textContent = count !== null ? count.toString() : "0";

    const systemPulse = document.getElementById("stat-system-load");
    if (systemPulse) {
      const now = new Date();
      systemPulse.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
    }
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err);
    const memberCount = document.getElementById("stat-total-members");
    if (memberCount) memberCount.textContent = "ERR";
  }
}

// --- GapChecker Logic ---
function renderGapChecker() {
  const savedAllDone = localStorage.getItem(GAP_STORAGE_KEYS.allDoneList) || "";
  const savedCommenter =
    localStorage.getItem(GAP_STORAGE_KEYS.commenterList) || "";

  return `
        <header class="mb-10 animate-in fade-in slide-in-from-top-2 relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
                <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
                Back
              </button>
            </div>
            <div class="flex items-center gap-2 mb-2">
                <div class="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_12px_#00F5FF] animate-pulse"></div>
                <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.4em] font-orbitron italic">Wave Matrix Validation</p>
            </div>
            <h1 class="text-5xl font-black italic tracking-tighter uppercase font-cinzel text-white">Gap Checker</h1>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="glass-card-neon lighting-border p-8 rounded-[2.5rem] border-white/10 bg-black/60 shadow-2xl overflow-hidden relative">
                <div class="absolute -top-12 -left-12 w-32 h-32 bg-neon-cyan/10 blur-[60px] rounded-full"></div>
                <div class="flex justify-between items-center mb-6 relative z-10">
                    <h3 class="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 flex items-center gap-3 italic font-orbitron">
                        <i data-lucide="clipboard-check" class="w-5 h-5 text-neon-cyan shadow-[0_0_10px_#00F5FF]"></i>
                        Target Registry
                    </h3>
                    <div class="flex gap-3">
                         <button id="paste-all-done" class="p-2 hover:bg-neon-cyan/20 rounded-xl text-neon-cyan transition-all border border-transparent hover:border-neon-cyan/30 shadow-lg"><i data-lucide="copy" class="w-4 h-4"></i></button>
                         <button id="clear-all-done" class="p-2 hover:bg-neon-red/20 rounded-xl text-neon-red transition-all border border-transparent hover:border-neon-red/30 shadow-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <textarea id="all-done-list" class="w-full h-48 bg-black/60 border border-white/10 rounded-[1.5rem] p-6 text-[12px] font-mono focus:border-neon-cyan/60 transition-all resize-none scrollbar-hide text-white/80 placeholder:text-white/5" placeholder="Input target roster...">${savedAllDone}</textarea>
            </div>

            <div class="glass-card-neon lighting-border p-8 rounded-[2.5rem] border-white/10 bg-black/60 shadow-2xl overflow-hidden relative">
                <div class="absolute -top-12 -right-12 w-32 h-32 bg-neon-green/10 blur-[60px] rounded-full"></div>
                <div class="flex justify-between items-center mb-6 relative z-10">
                    <h3 class="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 flex items-center gap-3 italic font-orbitron">
                        <i data-lucide="message-square" class="w-5 h-5 text-neon-green shadow-[0_0_10px_#39FF14]"></i>
                        Active Signals
                    </h3>
                    <div class="flex gap-3">
                         <button id="paste-commenter" class="p-2 hover:bg-neon-green/20 rounded-xl text-neon-green transition-all border border-transparent hover:border-neon-green/30 shadow-lg"><i data-lucide="copy" class="w-4 h-4"></i></button>
                         <button id="clear-commenter" class="p-2 hover:bg-neon-red/20 rounded-xl text-neon-red transition-all border border-transparent hover:border-neon-red/30 shadow-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <textarea id="commenter-list" class="w-full h-48 bg-black/60 border border-white/10 rounded-[1.5rem] p-6 text-[12px] font-mono focus:border-neon-green/60 transition-all resize-none scrollbar-hide text-white/80 placeholder:text-white/5" placeholder="Input signal source...">${savedCommenter}</textarea>
            </div>
        </div>

        <button id="run-gap-analysis" class="w-full py-8 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink text-black font-orbitron font-black text-sm uppercase tracking-[0.4em] italic rounded-[2rem] hover:shadow-[0_0_50px_rgba(0,245,255,0.4)] transition-all mb-12 shadow-2xl active:scale-[0.98] hover:scale-[1.01]">
            INITIATE NEURAL SCAN
        </button>

        <div id="gap-results" class="hidden animate-in fade-in slide-in-from-bottom-4 duration-500"></div>
    `;
}

function attachGapCheckerEvents() {
  const allDoneTextarea = document.getElementById(
    "all-done-list",
  ) as HTMLTextAreaElement;
  const commenterTextarea = document.getElementById(
    "commenter-list",
  ) as HTMLTextAreaElement;

  allDoneTextarea?.addEventListener("input", () => {
    localStorage.setItem(GAP_STORAGE_KEYS.allDoneList, allDoneTextarea.value);
  });

  commenterTextarea?.addEventListener("input", () => {
    localStorage.setItem(
      GAP_STORAGE_KEYS.commenterList,
      commenterTextarea.value,
    );
  });

  document
    .getElementById("paste-all-done")
    ?.addEventListener("click", async () => {
      const text = await navigator.clipboard.readText();
      allDoneTextarea.value = text;
      localStorage.setItem(GAP_STORAGE_KEYS.allDoneList, text);
    });

  document
    .getElementById("paste-commenter")
    ?.addEventListener("click", async () => {
      const text = await navigator.clipboard.readText();
      commenterTextarea.value = text;
      localStorage.setItem(GAP_STORAGE_KEYS.commenterList, text);
    });

  document.getElementById("clear-all-done")?.addEventListener("click", () => {
    allDoneTextarea.value = "";
    localStorage.removeItem(GAP_STORAGE_KEYS.allDoneList);
  });

  document.getElementById("clear-commenter")?.addEventListener("click", () => {
    commenterTextarea.value = "";
    localStorage.removeItem(GAP_STORAGE_KEYS.commenterList);
  });

  document
    .getElementById("run-gap-analysis")
    ?.addEventListener("click", () => performGapAnalysis());
}

async function performGapAnalysis() {
  const allDoneVal = (
    document.getElementById("all-done-list") as HTMLTextAreaElement
  ).value;
  const commenterVal = (
    document.getElementById("commenter-list") as HTMLTextAreaElement
  ).value;

  if (!allDoneVal || !commenterVal) return;

  const resultsDiv = document.getElementById("gap-results")!;
  resultsDiv.classList.remove("hidden");
  resultsDiv.innerHTML = `
        <div class="p-32 flex flex-col items-center justify-center">
            <div class="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-6"></div>
            <p class="text-sm font-black text-gray-500 uppercase italic tracking-[0.3em] animate-pulse">Running Diagnostics...</p>
        </div>
    `;

  // Wait for animation effect
  await new Promise((r) => setTimeout(r, 800));

  // Advanced Parsing Logic
  const parseAllDone = (text: string) => {
    const lines = text.split("\n");
    const results: any[] = [];
    lines.forEach((line) => {
      let cleaned = line
        .replace(/^[\d️⃣]+[.)\-:\s]*/g, "")
        .replace(/^@+/, "")
        .trim();
      if (
        cleaned.length < 2 ||
        cleaned.toLowerCase().includes("date:") ||
        cleaned.toLowerCase().includes("link no")
      )
        return;

      let mainName = cleaned;
      let aliases: string[] = [];
      const bracketMatch = cleaned.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (bracketMatch) {
        mainName = bracketMatch[1].trim();
        const rawAliases = bracketMatch[2].split(/[+,\/]/);
        rawAliases.forEach((a) => {
          generateNameVariations(a.trim()).forEach((v) => {
            if (!aliases.includes(v)) aliases.push(v);
          });
        });
      }

      generateNameVariations(mainName).forEach((v) => {
        if (!aliases.includes(v)) aliases.push(v);
      });

      results.push({ 原名: cleaned, norm: proNormalize(mainName), aliases });
    });
    return results;
  };

  const parseCommenters = (text: string) => {
    const lines = text.split("\n");
    const results: any[] = [];
    lines.forEach((line) => {
      let cleaned = line.replace(/^@+/, "").trim();
      if (cleaned.length < 2 || cleaned.toLowerCase().includes("link no"))
        return;
      results.push({
        原名: cleaned,
        norm: proNormalize(cleaned),
        variations: generateNameVariations(cleaned),
      });
    });
    return results;
  };

  const targetUsers = parseAllDone(allDoneVal);
  const commenters = parseCommenters(commenterVal);

  const commenterSet = new Set<string>();
  commenters.forEach((c) => {
    commenterSet.add(c.norm);
    c.variations.forEach((v) => commenterSet.add(v));
  });

  let matched: any[] = [];
  let gap: any[] = [];

  targetUsers.forEach((user) => {
    let isMatch = false;
    for (const alias of user.aliases) {
      if (commenterSet.has(alias)) {
        isMatch = true;
        break;
      }
    }
    if (isMatch) matched.push(user);
    else gap.push(user);
  });

  currentResultsData = { targetUsers, commenters, matched, gap };

  const percent =
    targetUsers.length > 0
      ? Math.round((matched.length / targetUsers.length) * 100)
      : 0;

  resultsDiv.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="glass-card p-6 border-white/5 rounded-2xl flex flex-col items-center">
                <span class="text-[10px] font-black uppercase text-gray-500 mb-2">Processed</span>
                <span class="text-3xl font-black text-white">${targetUsers.length}</span>
            </div>
            <div class="glass-card p-6 border-white/5 rounded-2xl flex flex-col items-center">
                <span class="text-[10px] font-black uppercase text-gray-500 mb-2">Comments</span>
                <span class="text-3xl font-black text-neon-green">${commenters.length}</span>
            </div>
            <div class="glass-card p-6 border-white/5 rounded-2xl flex flex-col items-center">
                <span class="text-[10px] font-black uppercase text-gray-500 mb-2">Matches</span>
                <span class="text-3xl font-black text-neon-cyan">${matched.length}</span>
            </div>
            <div class="glass-card p-6 border-white/5 rounded-2xl flex flex-col items-center">
                <span class="text-[10px] font-black uppercase text-gray-500 mb-2">Gap Detected</span>
                <span class="text-3xl font-black text-neon-pink">${gap.length}</span>
            </div>
        </div>

        <div class="glass-card p-10 rounded-3xl border-white/5 mb-12 relative overflow-hidden group">
            <div class="absolute inset-0 bg-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex justify-between items-center mb-8 relative">
                <h3 class="text-sm font-black italic uppercase text-white flex items-center gap-3">
                    <i data-lucide="alert-triangle" class="w-6 h-6 text-neon-pink shadow-[0_0_10px_#FF0080]"></i>
                    Detected Gaps (${gap.length})
                </h3>
                <button id="copy-gap-list" class="px-6 py-3 bg-neon-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_20px_#FF0080] transition-all">
                    <i data-lucide="copy" class="w-4 h-4"></i> Copy List
                </button>
            </div>
            <div id="gap-list-container" class="space-y-2 relative">
                ${gap
                  .map(
                    (user, i) => `
                    <div class="gap-item" data-name="${user.原名}">
                        <span class="w-6 text-[10px] font-black text-gray-600">${i + 1}.</span>
                        <span class="text-xs font-bold text-gray-300 flex-1">${user.原名}</span>
                        <button class="gap-remove-btn" data-name="${user.原名}">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>
                `,
                  )
                  .join("")}
                ${gap.length === 0 ? '<div class="p-10 text-center text-neon-green font-black uppercase italic tracking-widest">🎉 Analysis Perfect: No Gaps Detected!</div>' : ""}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div class="glass-card p-8 rounded-2xl border-white/5">
                <h4 class="text-[10px] font-black uppercase text-neon-green mb-6 flex items-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    Successful Support (${matched.length})
                </h4>
                <div class="text-[9px] text-gray-600 font-bold uppercase overflow-y-auto max-h-48 break-words leading-relaxed custom-scrollbar p-2">
                    ${matched.map((m) => (m as any).原名).join(" // ")}
                </div>
             </div>
             <div class="glass-card p-8 rounded-2xl border-white/5">
                <h4 class="text-[10px] font-black uppercase text-gray-500 mb-6 font-orbitron">Efficiency Insight</h4>
                <div class="space-y-6">
                    <div class="flex justify-between text-xs items-end">
                        <div>
                            <span class="text-gray-500 font-bold uppercase block mb-1">Success Rating</span>
                            <span class="text-neon-cyan font-black italic text-xl">${percent}%</span>
                        </div>
                        <span class="text-[9px] font-black text-gray-700 uppercase tracking-widest">Score</span>
                    </div>
                    <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_10px_var(--glow-secondary)]" style="width: ${percent}%"></div>
                    </div>
                </div>
             </div>
        </div>
    `;

  refreshIcons();
  attachGapResultEvents();
}

function attachGapResultEvents() {
  document.getElementById("copy-gap-list")?.addEventListener("click", () => {
    if (!currentResultsData) return;
    const text = currentResultsData.gap
      .map((u: any, i: number) => `${i + 1}. ${u.原名}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("Copied results to clipboard.");
  });

  document.querySelectorAll(".gap-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const name = (e.currentTarget as HTMLElement).dataset.name;
      const item = (e.currentTarget as HTMLElement).closest(".gap-item")!;
      item.classList.add("removing");
      setTimeout(() => {
        currentResultsData.gap = currentResultsData.gap.filter(
          (u: any) => u.原名 !== name,
        );
        item.remove();
      }, 300);
    });
  });
}

// --- Shortener & Collector Utilities ---
const BENGALI_NUMBERS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};
const EMOJI_NUMBERS: Record<string, string> = {
  "0️⃣": "0",
  "1️⃣": "1",
  "2️⃣": "2",
  "3️⃣": "3",
  "4️⃣": "4",
  "5️⃣": "5",
  "6️⃣": "6",
  "7️⃣": "7",
  "8️⃣": "8",
  "9️⃣": "9",
  "🔟": "10",
};

function unfancy(str: string) {
  if (!str) return "";
  return str
    .normalize("NFKD")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (char) {
      const code = char.codePointAt(0);
      if (code && code >= 120782 && code <= 120831) {
        return String.fromCharCode(48 + (code % 10));
      }
      return char;
    })
    .normalize("NFKC");
}

function renderMiniStat(
  label: string,
  value: string,
  colorClass: string,
  icon: string,
  id: string,
) {
  return `
        <div class="glass-card p-4 rounded-xl border-white/5 flex items-center gap-4 group hover:border-white/20 transition-all">
            <div class="w-10 h-10 ${colorClass}/10 rounded-lg flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform">
                <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-[8px] font-black uppercase text-gray-600 block leading-tight tracking-widest">${label}</span>
                <span id="${id}" class="text-xl font-black italic tracking-tighter text-white">${value}</span>
            </div>
        </div>
    `;
}

function getTodaySorted() {
  const data = JSON.parse(
    localStorage.getItem(SHORTENER_STORAGE_KEYS.todaySorted) || "{}",
  );
  return data.date === new Date().toDateString() ? data.count : 0;
}

function addTodaySorted(c: number) {
  const cur = getTodaySorted();
  const count = cur + c;
  localStorage.setItem(
    SHORTENER_STORAGE_KEYS.todaySorted,
    JSON.stringify({ date: new Date().toDateString(), count }),
  );
  const el = document.getElementById("short-today");
  if (el) el.textContent = count.toString();
}

function normalizeShortenerText(text: string) {
  if (!text) return "";
  let t = unfancy(text);
  for (let bn in BENGALI_NUMBERS) {
    t = t.replace(new RegExp(bn, "g"), BENGALI_NUMBERS[bn]);
  }
  for (let em in EMOJI_NUMBERS) {
    t = t.split(em).join(EMOJI_NUMBERS[em]);
  }
  t = t.replace(/\u00A0/g, " ").replace(/\s+/g, " ");
  return t;
}

let currentShortenerTab: "processor" | "collector" = "processor";

function renderShortener() {
  const stats = {
    today: getTodaySorted(),
    total: 0,
    dupe: 0,
    fb: 0,
  };

  return `
        <header class="mb-8 animate-fade-in">
            <div class="flex items-center gap-3 mb-6">
              <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
                <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
                Back
              </button>
            </div>
            <div class="flex items-center gap-3 mb-2">
                <div class="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F5FF]"></div>
                <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Advanced Neural Processor</p>
            </div>
            <h1 class="text-5xl font-black italic tracking-tighter text-white uppercase">Shortener Pro</h1>
        </header>

        <div class="flex gap-4 mb-8 bg-black/40 p-2 rounded-2xl border border-white/5 max-w-md">
            <button id="show-processor" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentShortenerTab === "processor" ? "bg-neon-cyan text-black" : "text-gray-500 hover:text-white"}">Processor</button>
            <button id="show-collector" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentShortenerTab === "collector" ? "bg-neon-purple text-black" : "text-gray-500 hover:text-white"}">Fast Collector</button>
        </div>

        ${currentShortenerTab === "processor" ? renderProcessorUI(stats) : renderCollectorUI()}
    `;
}

function renderProcessorUI(stats: any) {
  return `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            ${renderMiniStat("Today Sorted", stats.today.toString(), "text-neon-cyan", "calendar-check", "short-today")}
            ${renderMiniStat("Total Links", "0", "text-neon-purple", "link", "short-total")}
            ${renderMiniStat("Duplicate", "0", "text-neon-green", "check", "short-dupe")}
            ${renderMiniStat("fb.watch", "0", "text-neon-amber", "alert-circle", "short-fb")}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div class="glass-card p-8 rounded-3xl border-white/5 bg-black/40">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <i data-lucide="edit-3" class="w-4 h-4 text-neon-cyan"></i>
                        Input Streams
                    </h3>
                    <div class="flex gap-2">
                         <button id="paste-short" class="p-2 hover:bg-white/5 rounded-lg text-neon-cyan transition-all"><i data-lucide="clipboard" class="w-4 h-4"></i></button>
                         <button id="clear-short" class="p-2 hover:bg-white/5 rounded-lg text-neon-red transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <textarea id="short-input" class="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono focus:border-neon-cyan transition-all resize-none mb-6 scrollbar-hide" placeholder="Paste data here..."></textarea>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-gray-600 tracking-widest">Batch Name</label>
                        <input type="text" id="short-batch" placeholder="Auto" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-neon-cyan transition-all outline-none uppercase font-black italic">
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-gray-600 tracking-widest">Start No</label>
                        <input type="number" id="short-start" placeholder="Auto" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-neon-cyan transition-all outline-none font-black italic">
                    </div>
                </div>

                <div class="flex items-center gap-4 mb-8">
                     <label class="flex items-center gap-3 cursor-pointer group">
                        <div class="relative">
                            <input type="checkbox" id="short-breaks" checked class="sr-only">
                            <div class="w-10 h-5 bg-white/10 rounded-full transition-all group-hover:bg-white/20"></div>
                            <div class="dot absolute left-1 top-1 w-3 h-3 bg-gray-500 rounded-full transition-all"></div>
                        </div>
                        <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest">10 Link Breaks</span>
                     </label>
                </div>

                <div class="flex gap-4">
                    <button id="btn-execute-sort" class="flex-1 py-4 bg-neon-cyan text-black font-black uppercase tracking-widest text-xs italic rounded-xl hover:shadow-[0_0_25px_#00F5FF] transition-all flex items-center justify-center gap-3">
                        <i data-lucide="wand-2" class="w-5 h-5"></i> Execute Sort
                    </button>
                    <button id="btn-reset-short" class="p-4 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-neon-red/10 hover:text-neon-red transition-all">
                        <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <div class="glass-card p-8 rounded-3xl border-white/5 bg-black/40">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4 text-neon-green"></i>
                        Transmission Output
                    </h3>
                    <button id="copy-short-main" class="p-2 hover:bg-white/5 rounded-lg text-neon-green transition-all"><i data-lucide="copy" class="w-4 h-4"></i></button>
                </div>
                <div id="short-alert" class="hidden mb-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"></div>
                <div id="short-output" class="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono overflow-y-auto custom-scrollbar mb-6 whitespace-pre-wrap text-gray-300">
                    <div class="flex flex-col items-center justify-center h-full text-gray-700">
                        <i data-lucide="inbox" class="w-10 h-10 mb-4 opacity-20"></i>
                        <p class="uppercase tracking-widest font-black italic">Awaiting Execution</p>
                    </div>
                </div>
                <div id="short-summary" class="hidden glass-card p-6 border-white/5 rounded-2xl mb-6">
                    <h4 class="text-[10px] font-black uppercase text-gray-600 mb-4 flex items-center gap-2"><i data-lucide="bar-chart" class="w-3 h-3"></i> Stats</h4>
                    <div class="grid grid-cols-3 gap-4" id="short-summary-grid"></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <button id="copy-plain" class="py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-white/20 transition-all flex items-center justify-center gap-2 text-white"><i data-lucide="clipboard" class="w-4 h-4 text-neon-cyan"></i> Plain</button>
                    <button id="copy-fb" class="py-4 bg-[#1877f2]/10 border border-[#1877f2]/20 text-[#1877f2] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1877f2]/20 transition-all flex items-center justify-center gap-2"><i data-lucide="facebook" class="w-4 h-4"></i> FB Ready</button>
                </div>
            </div>
        </div>

        <div class="glass-card p-8 rounded-3xl border-white/5">
            <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2 mb-8"><i data-lucide="history" class="w-4 h-4 text-neon-amber"></i> Pulse History</h3>
            <div id="short-history-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"></div>
        </div>
    `;
}

function renderCollectorUI() {
  return `
        <div class="flex justify-between items-end mb-8">
            <div>
                <p class="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-1">Extracted Units</p>
                <span id="coll-count" class="text-4xl font-black italic text-white">${collectorLinks.length}</span>
            </div>
        </div>

        <div class="glass-card p-8 rounded-3xl border-white/5 bg-black/40 mb-8 relative">
            <textarea id="coll-input" class="w-full h-32 bg-transparent border-none text-center text-xl font-black italic text-neon-cyan placeholder:text-gray-800 focus:outline-none resize-none scrollbar-hide" placeholder="TAP TO PROCESS CLIPBOARD STREAM..." autofocus></textarea>
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] animate-pulse">Neural Active</div>
        </div>

        <div id="coll-list" class="space-y-3 mb-32 min-h-[200px]"></div>

        <div class="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 flex gap-4 z-50">
             <button id="coll-clear" class="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-500 hover:text-neon-red transition-all shadow-xl backdrop-blur-xl">
                <i data-lucide="trash-2" class="w-6 h-6"></i>
             </button>
             <button id="coll-copy-all" class="flex-1 h-16 bg-gradient-to-r from-neon-green to-neon-cyan text-black font-black uppercase tracking-widest text-xs italic rounded-2xl hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] transition-all flex items-center justify-center gap-4 shadow-xl">
                <i data-lucide="scan-line" class="w-6 h-6"></i> Copy Sequence
             </button>
        </div>
        
        <div id="coll-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] hidden items-center justify-center p-6">
            <div class="glass-card p-8 rounded-3xl border-white/10 max-w-sm w-full animate-in zoom-in-95">
                <h3 class="text-neon-amber text-xs font-black uppercase tracking-widest mb-4">Admin/Mod Detected!</h3>
                <p class="text-xs text-gray-400 leading-relaxed mb-8">Standardize headers?</p>
                <div class="flex gap-4">
                    <button id="modal-no" class="flex-1 py-4 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:bg-white/5">Original</button>
                    <button id="modal-yes" class="flex-1 py-4 bg-neon-green text-black rounded-xl text-[10px] font-black uppercase">Standardize</button>
                </div>
            </div>
        </div>
        <div id="coll-toast" class="fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-neon-cyan text-black font-black uppercase text-[10px] tracking-widest rounded-full opacity-0 pointer-events-none transition-all z-[100] shadow-[0_0_20px_rgba(0,245,255,0.4)]"></div>
    `;
}

function attachShortenerEvents() {
  const showProc = document.getElementById("show-processor");
  const showColl = document.getElementById("show-collector");

  showProc?.addEventListener("click", () => {
    currentShortenerTab = "processor";
    render();
  });
  showColl?.addEventListener("click", () => {
    currentShortenerTab = "collector";
    render();
  });

  if (currentShortenerTab === "processor") {
    const input = document.getElementById("short-input") as HTMLTextAreaElement;
    const batchInput = document.getElementById(
      "short-batch",
    ) as HTMLInputElement;
    const startInput = document.getElementById(
      "short-start",
    ) as HTMLInputElement;
    const breakToggle = document.getElementById(
      "short-breaks",
    ) as HTMLInputElement;

    input?.addEventListener("input", () => updateShortenerLiveStats());
    document
      .getElementById("paste-short")
      ?.addEventListener("click", async () => {
        input.value = await navigator.clipboard.readText();
        updateShortenerLiveStats();
      });
    document.getElementById("clear-short")?.addEventListener("click", () => {
      input.value = "";
      updateShortenerLiveStats();
    });
    document
      .getElementById("btn-reset-short")
      ?.addEventListener("click", () => {
        input.value = "";
        batchInput.value = "";
        startInput.value = "";
        updateShortenerLiveStats();
        render();
      });

    document
      .getElementById("btn-execute-sort")
      ?.addEventListener("click", () => executeShortenerSort());
    document
      .getElementById("copy-short-main")
      ?.addEventListener("click", () => {
        const out = document.getElementById("short-output") as HTMLTextAreaElement;
        if (out) copyToClipboard(out.innerText || out.textContent || "");
      });
    document
      .getElementById("copy-plain")
      ?.addEventListener("click", () => copyToClipboard(shortenerOutputData));
    document
      .getElementById("copy-fb")
      ?.addEventListener("click", () => copyToClipboard(shortenerOutputData));
    document
      .getElementById("clear-short-history")
      ?.addEventListener("click", () => {
        shortenerHistory = [];
        localStorage.removeItem(SHORTENER_STORAGE_KEYS.history);
        renderShortenerHistory();
      });

    renderShortenerHistory();
    updateShortenerLiveStats();

    if (breakToggle) {
      const dot = breakToggle.nextElementSibling
        ?.nextElementSibling as HTMLElement;
      if (dot) {
        dot.style.left = breakToggle.checked ? "20px" : "4px";
        dot.classList.toggle("bg-neon-cyan", breakToggle.checked);
      }
    }
  } else {
    attachCollectorEvents();
  }
}

function updateShortenerLiveStats() {
  const text =
    (document.getElementById("short-input") as HTMLTextAreaElement)?.value ||
    "";
  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const unique = new Set(urls.map((u) => u.toLowerCase()));

  const totalEl = document.getElementById("short-total");
  if (totalEl) totalEl.textContent = urls.length.toString();

  const dupeEl = document.getElementById("short-dupe");
  if (dupeEl) dupeEl.textContent = (urls.length - unique.size).toString();

  const fbCount = (text.match(/fb\.watch/gi) || []).length;
  const fbEl = document.getElementById("short-fb");
  if (fbEl) fbEl.textContent = fbCount.toString();
}

function executeShortenerSort() {
  const rawText = (
    document.getElementById("short-input") as HTMLTextAreaElement
  ).value;
  if (!rawText.trim()) return;

  let entries: any[] = [];
  let splitBlocks = rawText.match(/-{4,}/) ? rawText.split(/-{4,}/) : [rawText];

  splitBlocks.forEach((block) => {
    if (block.trim()) {
      const urlMatches = [...block.matchAll(/(https?:\/\/[^\s"'<>]+)/gi)];
      urlMatches.forEach((match, i) => {
        const url = match[1];
        const prevEnd =
          i === 0 ? 0 : urlMatches[i - 1].index! + urlMatches[i - 1][0].length;
        const segment = block.substring(prevEnd, match.index);

        let type = "regular";
        let norm = normalizeShortenerText(segment);
        if (/#vip|#ভিআইপি/i.test(norm)) type = "vip";
        else if (/#notice|#নোটিশ/i.test(norm)) type = "notice";
        else if (/#admin|#এডমিন|#mod/i.test(norm)) type = "admin";

        let num = extractShortenerNumber(segment);
        if (type === "regular" && num === null) type = "admin";

        entries.push({
          num,
          url,
          type,
          inst: cleanShortenerInstruction(segment),
        });
      });
    }
  });

  let regular = entries.filter((e) => e.type === "regular" && e.num !== null);
  let vip = entries.filter((e) => e.type === "vip");
  let notice = entries.filter((e) => e.type === "notice");
  let admin = entries.filter((e) => e.type === "admin");

  const seen = new Set();
  regular = regular
    .filter((e) => {
      if (seen.has(e.num)) return false;
      seen.add(e.num);
      return true;
    })
    .sort((a, b) => a.num - b.num);

  const startVal = (document.getElementById("short-start") as HTMLInputElement)
    .value;
  const batchInput = document.getElementById("short-batch") as HTMLInputElement;

  let finalRegularList: any[] = [];
  shortenerMissing = [];
  shortenerFBWatch = [];

  if (startVal.trim() !== "") {
    let current = parseInt(startVal);
    regular.forEach((item) => {
      if (/fb\.watch/i.test(item.url)) shortenerFBWatch.push(current);
      finalRegularList.push({
        displayNum: current,
        url: item.url,
        inst: item.inst,
      });
      current++;
    });
  } else if (regular.length > 0) {
    let min = regular[0].num;
    let max = regular[regular.length - 1].num;
    const map = new Map(regular.map((e) => [e.num, e]));
    for (let i = min; i <= max; i++) {
      const item = map.get(i);
      if (item) {
        if (/fb\.watch/i.test(item.url)) shortenerFBWatch.push(i);
        finalRegularList.push({
          displayNum: i,
          url: item.url,
          inst: item.inst,
        });
      } else {
        shortenerMissing.push(i);
        finalRegularList.push({ displayNum: i, url: null, inst: null });
      }
    }
  }

  const min = finalRegularList.length ? finalRegularList[0].displayNum : 0;
  const max = finalRegularList.length
    ? finalRegularList[finalRegularList.length - 1].displayNum
    : 0;
  const range = `${min}-${max}`;
  if (!batchInput.value.trim() || /^\d+-\d+$/.test(batchInput.value.trim()))
    batchInput.value = range;

  const EMOJIS = [
    "🎯",
    "🌟",
    "🌀",
    "🔥",
    "🌈",
    "⚡",
    "🌸",
    "💎",
    "🎉",
    "🌍",
    "🦋",
    "🌷",
    "🌺",
    "🌼",
    "🍂",
    "🍁",
    "🪷",
    "🌙",
    "☁️",
    "🫧",
  ];
  const LABELS = [
    "Post No",
    "Serial No",
    "Count",
    "Link",
    "Memo No",
    "Case No",
    "Receipt No",
    "Booking No",
    "Ticket No",
    "Doc No",
  ];

  let result = `Batch: ${batchInput.value.trim() || range}\n\n`;
  finalRegularList.forEach((item, idx) => {
    result += `${EMOJIS[idx % EMOJIS.length]} ${LABELS[idx % LABELS.length]}: ${item.displayNum}\n`;
    if (item.url) {
      result += `📌 ${item.url}\n`;
      if (item.inst) result += `💬 ${item.inst}\n`;
    } else {
      result += `📌 (নেই — Skipped)\n`;
    }
    result += "\n";
    if (
      (idx + 1) % 10 === 0 &&
      idx + 1 !== finalRegularList.length &&
      (document.getElementById("short-breaks") as HTMLInputElement).checked
    ) {
      result += "✨🔥 --- 🔥✨\n\n";
    }
  });

  const append = (title: string, list: any[], icon: string) => {
    if (list.length) {
      result += `\n${icon}═══ ${title} ═══${icon}\n\n`;
      list.forEach((item, i) => {
        result += `⭐ ${title} ${i + 1}\n📌 ${item.url}\n${item.inst ? `💬 ${item.inst}\n` : ""}\n`;
      });
    }
  };

  append("VIP Links", vip, "🏆");
  append("Notice Links", notice, "📢");
  append("Admin Links", admin, "👑");

  shortenerOutputData = result;
  document.getElementById("short-output")!.textContent = result;

  const alertBox = document.getElementById("short-alert")!;
  alertBox.classList.remove(
    "hidden",
    "bg-neon-pink/10",
    "text-neon-pink",
    "bg-neon-green/10",
    "text-neon-green",
    "bg-neon-amber/10",
    "text-neon-amber",
  );
  if (shortenerFBWatch.length) {
    alertBox.classList.add("bg-neon-pink/10", "text-neon-pink", "show");
    alertBox.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4"></i> fb.watch detected at numbers: ${shortenerFBWatch.join(", ")}`;
  } else if (shortenerMissing.length) {
    alertBox.classList.add("bg-neon-amber/10", "text-neon-amber", "show");
    alertBox.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> Missing numbers: ${shortenerMissing.join(", ")}`;
  } else {
    alertBox.classList.add("bg-neon-green/10", "text-neon-green", "show");
    alertBox.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Sort Protocol Perfect!`;
  }
  refreshIcons();

  const summarySection = document.getElementById("short-summary")!;
  summarySection.classList.remove("hidden");
  document.getElementById("short-summary-grid")!.innerHTML = `
        <div class="p-4 bg-white/5 rounded-xl text-center">
            <div class="text-xl font-black text-neon-cyan">${regular.length}</div>
            <div class="text-[8px] font-black uppercase text-gray-600 tracking-widest">Regular</div>
        </div>
        <div class="p-4 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10" onclick="alert('Missing: ${shortenerMissing.join(", ")}')">
            <div class="text-xl font-black ${shortenerMissing.length ? "text-neon-pink" : "text-gray-700"}">${shortenerMissing.length}</div>
            <div class="text-[8px] font-black uppercase text-gray-600 tracking-widest">Missing</div>
        </div>
        <div class="p-4 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10" onclick="alert('fb.watch: ${shortenerFBWatch.join(", ")}')">
            <div class="text-xl font-black ${shortenerFBWatch.length ? "text-neon-amber" : "text-gray-700"}">${shortenerFBWatch.length}</div>
            <div class="text-[8px] font-black uppercase text-gray-600 tracking-widest">fb.watch</div>
        </div>
    `;

  addTodaySorted(regular.length + vip.length + notice.length + admin.length);
  saveShortenerHistory({
    id: Date.now(),
    batch: batchInput.value || range,
    total: entries.length,
    output: result,
    date: new Date().toLocaleString(),
  });
}

function saveShortenerHistory(item: any) {
  shortenerHistory.unshift(item);
  if (shortenerHistory.length > 8) shortenerHistory.pop();
  localStorage.setItem(
    SHORTENER_STORAGE_KEYS.history,
    JSON.stringify(shortenerHistory),
  );
  renderShortenerHistory();
}

function renderShortenerHistory() {
  const list = document.getElementById("short-history-list");
  if (!list) return;
  if (!shortenerHistory.length) {
    list.innerHTML =
      '<div class="col-span-full py-12 text-center text-gray-700 italic uppercase tracking-widest text-[10px] font-black">Archive Empty</div>';
    return;
  }
  list.innerHTML = shortenerHistory
    .map(
      (h) => `
        <div class="glass-card p-4 rounded-xl border-white/5 hover:border-white/20 transition-all cursor-pointer group" onclick="loadShortenerHistoryItem(${h.id})">
            <div class="text-xs font-black italic text-white mb-1 group-hover:text-neon-cyan transition-colors">Batch: ${h.batch}</div>
            <div class="text-[9px] font-black text-gray-600 uppercase tracking-widest">${h.total} Entries // ${h.date.split(",")[0]}</div>
        </div>
    `,
    )
    .join("");
}

(window as any).loadShortenerHistoryItem = (id: number) => {
  const item = shortenerHistory.find((h) => h.id === id);
  if (item) {
    shortenerOutputData = item.output;
    document.getElementById("short-output")!.textContent = item.output;
    document.getElementById("short-summary")?.classList.add("hidden");
    document.getElementById("short-alert")?.classList.add("hidden");
  }
};

function attachCollectorEvents() {
  const input = document.getElementById("coll-input") as HTMLTextAreaElement;
  input?.focus();

  input?.addEventListener("input", () => {
    const val = input.value.trim();
    if (!val) return;

    if (isLikelyAdminBox(val)) {
      const modal = document.getElementById("coll-modal")!;
      modal.classList.remove("hidden");
      modal.classList.add("flex");

      const handle = (norm: boolean) => {
        let text = norm ? normalizeAdminBox(val) : val;
        addCollectorUnit(text);
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        input.value = "";
        input.focus();
      };

      document.getElementById("modal-yes")!.onclick = () => handle(true);
      document.getElementById("modal-no")!.onclick = () => handle(false);
    } else {
      addCollectorUnit(val);
      input.value = "";
    }
  });

  document.getElementById("coll-clear")?.addEventListener("click", () => {
    if (confirm("Wipe extraction buffer?")) {
      collectorLinks = [];
      updateCollectorUI();
    }
  });

  document.getElementById("coll-copy-all")?.addEventListener("click", () => {
    if (!collectorLinks.length) return collectorToast("BUFFER EMPTY");
    const text = collectorLinks.join(
      "\n\n---------------------------------------\n\n",
    );
    copyToClipboard(text);
    collectorToast("SEQUENCE COPIED");
  });

  updateCollectorUI();
}

function isLikelyAdminBox(text: string) {
  const lower = text.toLowerCase();
  const hasAdmin = /admin|moderator|modaretor|অ্যাডমিন|মডারেটর/i.test(lower);
  const hasLink = /http|facebook.com|share\/|posts\//i.test(lower);
  const hasDecor = /box|─|█|╔|╚|✨|🌀|────────────────/i.test(lower);
  return hasAdmin && hasLink && hasDecor;
}

function normalizeAdminBox(text: string) {
  let lines = text.split("\n");
  let result: string[] = [];
  let started = false;
  for (let line of lines) {
    let trimmed = line.trim();
    if (!started) {
      if (
        !trimmed ||
        /^[═╔╚╗║─█✨🌀🟨 ░▒▓]+$/i.test(trimmed) ||
        /BOX|সাপোর্ট লিঙ্ক বক্স/i.test(trimmed)
      )
        continue;
      let adminMatch = trimmed.match(
        /(?:👤\s*)?((?:Admin|অ্যাডমিন|Moderator|মডારેটর|Modaretor)\s*[:：]\s*.+)/i,
      );
      if (adminMatch) {
        started = true;
        result.push(adminMatch[1].trim());
        continue;
      }
    }
    if (started && trimmed) {
      if (/^[═╔╚╗║─✨🌀 █]+$/.test(trimmed)) continue;
      result.push(trimmed);
    }
  }
  return result.join("\n").trim();
}

function addCollectorUnit(text: string) {
  if (!collectorLinks.includes(text)) {
    collectorLinks.push(text);
    updateCollectorUI();
    collectorToast("UNIT EXTRACTED");
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    collectorToast("DUPLICATE REJECTED");
  }
}

function updateCollectorUI() {
  localStorage.setItem("ordered_links", JSON.stringify(collectorLinks));
  const countEl = document.getElementById("coll-count");
  if (countEl) countEl.textContent = collectorLinks.length.toString();
  const list = document.getElementById("coll-list");
  if (!list) return;

  list.innerHTML = collectorLinks
    .map(
      (link, i) => `
        <div class="glass-card p-6 rounded-2xl border-white/5 border-l-4 border-l-neon-purple relative animate-in slide-in-from-right-4 duration-300 group">
            <div class="text-[10px] font-black text-gray-700 absolute top-2 right-4 tracking-widest italic group-hover:text-neon-cyan transition-colors">#${i + 1}</div>
            <div class="text-xs font-bold text-gray-300 whitespace-pre-wrap break-all leading-relaxed">${link}</div>
            <button class="absolute -right-2 -top-2 w-6 h-6 bg-neon-red text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110" onclick="removeCollectorItem(${i})">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `,
    )
    .join("");
  refreshIcons();
}

(window as any).removeCollectorItem = (i: number) => {
  collectorLinks.splice(i, 1);
  updateCollectorUI();
};

function collectorToast(msg: string) {
  const t = document.getElementById("coll-toast")!;
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.top = "4rem";
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.top = "2rem";
  }, 2000);
}

function copyToClipboard(text: string) {
  if (!text) return;
  navigator.clipboard.writeText(text);
}

function extractShortenerNumber(text: string) {
  const match = text.match(/(\d+)/);
  return match ? match[1] : "";
}

function cleanShortenerInstruction(text: string) {
  return text.replace(/^\d+[\s>▶️➤➡→]*/, "").trim();
}

// --- Initialization ---
initAuth();
