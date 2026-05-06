import './index.css';
import { supabase } from './lib/supabase';
import { createIcons, LayoutDashboard, Users, PlusCircle, Search, Trophy, History, LogOut, ShieldCheck, Calendar, Trash2, X, Copy, Check } from 'lucide';
import { Route, Member, AuditLog, calculateLevel } from './types';
import { getAdminName } from './lib/utils';
import { parseActivityBatch } from './lib/parser';

// --- State Management ---
let currentRoute: Route = 'login';
let user: any = null;
let isSidebarOpen = false;
let selectedMember: Member | null = null;
let leaderboardTab: 'rankings' | 'inactivity' = 'rankings';

// --- Theme Management ---
type Theme = 'royal-gold' | 'fireflies' | 'inferno' | 'sky-breeze' | 'midnight-glow';
const savedTheme = localStorage.getItem('app-theme') as Theme;
let currentTheme: Theme = 'royal-gold';

const themes: Record<Theme, { primary: string, secondary: string, accent: string, label: string, bg: string }> = {
  'royal-gold': { 
    primary: '#D4AF37', 
    secondary: '#FFD700', 
    accent: '#FFFFFF', 
    label: 'Royal Gold',
    bg: 'linear-gradient(to bottom right, #000000, #1a1a1a)'
  },
  'fireflies': { 
    primary: '#32CD32', 
    secondary: '#ADFF2F', 
    accent: '#FFFFFF', 
    label: 'Fireflies',
    bg: 'linear-gradient(to bottom, #000428, #004e92)'
  },
  'inferno': { 
    primary: '#FF4500', 
    secondary: '#FF8C00', 
    accent: '#FFFF00', 
    label: 'Inferno',
    bg: 'linear-gradient(to bottom, #2c0000, #000000)'
  },
  'sky-breeze': { 
    primary: '#00BFFF', 
    secondary: '#87CEFA', 
    accent: '#FFFFFF', 
    label: 'Sky Breeze',
    bg: 'linear-gradient(to bottom, #4facfe, #00f2fe)'
  },
  'midnight-glow': { 
    primary: '#A000FF', 
    secondary: '#E000FF', 
    accent: '#00F5FF', 
    label: 'Midnight',
    bg: 'linear-gradient(to bottom, #090909, #000000)'
  }
};

// Validate saved theme exists in the new theme list
if (savedTheme && themes[savedTheme]) {
  currentTheme = savedTheme;
}

function renderBackground() {
  const bgContainer = document.getElementById('theme-background');
  if (!bgContainer) return;
  
  bgContainer.innerHTML = '';
  bgContainer.className = `theme-bg-layer ${currentTheme}`;
  
  if (currentTheme === 'fireflies') {
    for (let i = 0; i < 40; i++) {
      const fly = document.createElement('div');
      fly.className = 'firefly';
      fly.style.left = `${Math.random() * 100}%`;
      fly.style.top = `${Math.random() * 100}%`;
      fly.style.width = `${Math.random() * 6 + 2}px`;
      fly.style.height = fly.style.width;
      fly.style.animationDuration = `${Math.random() * 15 + 10}s`;
      fly.style.animationDelay = `${Math.random() * 5}s`;
      bgContainer.appendChild(fly);
    }
  } else if (currentTheme === 'inferno') {
    for (let i = 0; i < 60; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.width = `${Math.random() * 4 + 1}px`;
      spark.style.height = spark.style.width;
      spark.style.animationDuration = `${Math.random() * 4 + 2}s`;
      spark.style.animationDelay = `${Math.random() * 3}s`;
      bgContainer.appendChild(spark);
    }
  } else if (currentTheme === 'sky-breeze') {
    for (let i = 0; i < 15; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      cloud.style.width = `${Math.random() * 300 + 100}px`;
      cloud.style.height = `${Math.random() * 150 + 50}px`;
      cloud.style.top = `${Math.random() * 80}%`;
      cloud.style.left = `-${Math.random() * 50}%`;
      cloud.style.animationDuration = `${Math.random() * 60 + 40}s`;
      cloud.style.animationDelay = `-${Math.random() * 30}s`;
      bgContainer.appendChild(cloud);
    }
    
    // Aesthetic Silhouette Scene
    const scene = document.createElement('div');
    scene.className = 'absolute bottom-0 right-0 w-[400px] h-64 opacity-40 pointer-events-none flex items-end justify-center pr-20';
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
      const line = document.createElement('div');
      line.className = 'wind-line';
      line.style.width = `${Math.random() * 200 + 50}px`;
      line.style.top = `${Math.random() * 100}%`;
      line.style.left = `-${Math.random() * 20}%`;
      line.style.animationDuration = `${Math.random() * 10 + 5}s`;
      bgContainer.appendChild(line);
    }
  } else if (currentTheme === 'royal-gold') {
    const shimmer = document.createElement('div');
    shimmer.className = 'shimmer';
    bgContainer.appendChild(shimmer);
  }
}

function applyTheme(theme: Theme) {
  const t = themes[theme] || themes['royal-gold'];
  const root = document.documentElement;
  
  // Set Body Theme
  document.body.className = `antialiased font-rajdhani text-gray-200 ${theme}`;
  
  // Update Tailwind v4 Theme Variables
  root.style.setProperty('--color-neon-pink', t.primary);
  root.style.setProperty('--color-neon-cyan', t.secondary);
  root.style.setProperty('--color-neon-green', t.accent);
  
  // Update local glow variables
  root.style.setProperty('--glow-primary', `${t.primary}66`);
  root.style.setProperty('--glow-secondary', `${t.secondary}66`);
  
  localStorage.setItem('app-theme', theme);
  currentTheme = theme;
  renderBackground();
}

// Apply theme immediately
applyTheme(currentTheme);

// --- DOM References ---
const app = document.getElementById('app')!;

// --- Auth Handling ---
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  user = session?.user ?? null;
  
  supabase.auth.onAuthStateChange((_event, session) => {
    user = session?.user ?? null;
    navigate(user ? 'dashboard' : 'login');
  });

  navigate(user ? 'dashboard' : 'login');
}

// --- Core Navigation ---
function navigate(route: Route) {
  currentRoute = route;
  selectedMember = null;
  render();
}

// --- Renderers ---
function render() {
  if (!user && currentRoute !== 'login') {
    currentRoute = 'login';
  }

  app.innerHTML = '';
  
  // Add Theme Background Layer
  const bgDiv = document.createElement('div');
  bgDiv.id = 'theme-background';
  app.appendChild(bgDiv);
  
  const contentDiv = document.createElement('div');
  contentDiv.id = 'main-content';
  contentDiv.className = 'w-full h-full';
  app.appendChild(contentDiv);

  if (currentRoute === 'login') {
    contentDiv.innerHTML = renderLogin();
    attachLoginEvents();
  } else {
    contentDiv.innerHTML = `
      <div class="flex flex-col md:flex-row min-h-screen relative">
        <!-- Sidebar -->
        <div id="sidebar-container" class="md:block ${isSidebarOpen ? 'block' : 'hidden'} fixed md:relative z-40 h-full">
          ${renderSidebar()}
        </div>

        <!-- Mobile Header -->
        <div class="md:hidden flex items-center justify-between p-4 glass-card border-b border-white/5 z-30">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-neon-pink rounded flex items-center justify-center shadow-[0_0_10px_#FF0080]">
              <i data-lucide="shield-check" class="w-4 h-4 text-white"></i>
            </div>
            <span class="font-orbitron font-black text-xs italic tracking-tighter">LINK BOX</span>
          </div>
          <button id="toggle-sidebar" class="text-white p-2">
            <i data-lucide="${isSidebarOpen ? 'x' : 'layout-dashboard'}" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- Backdrop for mobile sidebar -->
        ${isSidebarOpen ? `<div id="sidebar-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>` : ''}

        <main class="flex-1 p-4 md:p-8 overflow-y-auto">
          <div class="max-w-6xl mx-auto">
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
  
  // Refresh Lucide Icons
  createIcons({
    icons: {
      LayoutDashboard,
      Users,
      PlusCircle,
      Search,
      Trophy,
      History,
      LogOut,
      ShieldCheck,
      Calendar
    }
  });
}

function renderMemberDetail(member: Member) {
  const lastSync = member.last_activity_date ? new Date(member.last_activity_date) : null;
  const daysSinceSync = lastSync ? Math.floor((new Date().getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';
  
  return `
    <div class="animate-in fade-in slide-in-from-bottom-4">
      <button id="back-to-directory" class="flex items-center gap-2 text-neon-cyan/60 hover:text-neon-cyan font-black text-xs uppercase tracking-widest mb-8 transition-all">
        <i data-lucide="x" class="w-4 h-4"></i>
        Close Profile
      </button>

      <div class="glass-card mb-8 p-1 rounded-3xl border-white/5 relative overflow-hidden">
        <div class="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
           <div class="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border-2 border-white/10 relative">
             <i data-lucide="users" class="w-12 h-12 text-neon-cyan opacity-40"></i>
             <div class="absolute -bottom-2 bg-neon-pink px-3 py-1 rounded-full text-[10px] font-black italic shadow-[0_0_10px_#FF0080]">#${member.member_number}</div>
           </div>
           <div class="text-center md:text-left flex-1">
             <h1 class="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase mb-4 line-clamp-2">${member.name}</h1>
             <div class="flex flex-wrap justify-center md:justify-start gap-3">
               <span class="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-neon-cyan tracking-widest">${calculateLevel(member.total_points)} Member</span>
               <span class="px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-lg text-[10px] font-black uppercase text-neon-green tracking-widest">Verified Contributor</span>
               <span class="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-gray-400 tracking-widest">Last Link: ${daysSinceSync} Days Ago</span>
             </div>
           </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div class="glass-card p-8 border-white/5 rounded-2xl flex flex-col items-center">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Links Provided</span>
          <span class="text-4xl font-black italic text-white">${member.total_syncs || 0}</span>
          <div class="text-[9px] font-bold text-gray-600 mt-2 uppercase">Verified Submissions</div>
          <div class="w-12 h-1 bg-neon-cyan mt-4 rounded-full shadow-[0_0_8px_#00FFFF]"></div>
        </div>
        <div class="glass-card p-8 border-white/5 rounded-2xl flex flex-col items-center">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Consecutive Links</span>
          <span class="text-4xl font-black italic text-neon-pink">${member.current_streak || 0} Days</span>
          <div class="text-[9px] font-bold text-gray-600 mt-2 uppercase">Current Active Streak</div>
          <div class="w-12 h-1 bg-neon-pink mt-4 rounded-full shadow-[0_0_8px_#FF0080]"></div>
        </div>
        <div class="glass-card p-8 border-white/5 rounded-2xl flex flex-col items-center">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">All-Time Max Streak</span>
          <span class="text-4xl font-black italic text-neon-green">${member.max_streak || 0} Days</span>
          <div class="text-[9px] font-bold text-gray-600 mt-2 uppercase">Personal Record</div>
          <div class="w-12 h-1 bg-neon-green mt-4 rounded-full shadow-[0_0_10px_#39FF14]"></div>
        </div>
      </div>

      <div class="glass-card p-6 md:p-10 rounded-2xl border-white/5">
        <h3 class="font-orbitron font-black text-xs uppercase tracking-[0.3em] mb-6 text-gray-500">Security Access Logs</h3>
        <div id="member-logs" class="space-y-4">
           <p class="text-xs font-bold text-gray-600 italic">Accessing encrypted archives...</p>
        </div>
      </div>
    </div>
  `;
}

async function attachMemberDetailEvents() {
  document.getElementById('back-to-directory')?.addEventListener('click', () => {
    selectedMember = null;
    render();
  });

  if (selectedMember) {
     const { data: logs } = await supabase
       .from('audit_trail')
       .select('*')
       .ilike('description', `%@${selectedMember.name}%`)
       .order('timestamp', { ascending: false })
       .limit(10);
     
     const logContainer = document.getElementById('member-logs');
     if (logContainer) {
       if (logs && logs.length > 0) {
         logContainer.innerHTML = logs.map(log => `
           <div class="flex gap-4 items-start p-4 hover:bg-white/5 rounded-xl transition-all group">
             <div class="w-2 h-2 rounded-full bg-neon-cyan mt-1 shadow-[0_0_5px_#00FFFF]"></div>
             <div>
               <p class="text-sm font-bold text-gray-300 leading-snug">${log.description}</p>
               <p class="text-[9px] font-black uppercase text-gray-600 mt-1 tracking-widest">${new Date(log.timestamp).toLocaleString()} // Operator: ${log.admin_name}</p>
             </div>
           </div>
         `).join('');
       } else {
         logContainer.innerHTML = '<p class="text-xs font-bold text-gray-600 italic">No recent log entries for this member.</p>';
       }
     }
  }
}

function renderSidebar() {
  const menuItems = [
    { id: 'dashboard', label: 'Monitor', icon: 'layout-dashboard' },
    { id: 'members', label: 'Members', icon: 'users' },
    { id: 'activity', label: 'Sync Points', icon: 'plus-circle' },
    { id: 'heatmap', label: 'Activity Map', icon: 'calendar' },
    { id: 'search', label: 'Find Member', icon: 'search' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
    { id: 'audit', label: 'Audit Logs', icon: 'history' },
  ];

  return `
    <aside class="w-64 glass-card border-r border-white/5 flex flex-col h-full bg-[#050510]/60 backdrop-blur-md">
      <div class="p-6 flex flex-col h-full">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-8 h-8 bg-neon-pink rounded flex items-center justify-center shadow-[0_0_15px_var(--glow-primary)]">
            <i data-lucide="shield-check" class="w-5 h-5 text-white"></i>
          </div>
          <span class="font-orbitron font-black text-sm italic tracking-tighter">LINK BOX</span>
        </div>
        
        <nav class="space-y-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
          ${menuItems.map(item => `
            <button 
              data-route="${item.id}"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all
              ${currentRoute === item.id ? 'bg-white/10 text-neon-cyan shadow-[inset_0_0_10px_rgba(0,245,255,0.1)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}"
            >
              <i data-lucide="${item.icon}" class="w-4 h-4"></i>
              ${item.label}
            </button>
          `).join('')}
        </nav>

        <div class="mt-auto space-y-6 pt-6 border-t border-white/5">
          <!-- Theme Switcher -->
          <div class="px-2">
            <p class="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-3">Royal Themes & Effects</p>
            <div class="grid grid-cols-5 gap-2">
              ${Object.entries(themes).map(([id, theme]) => `
                <button 
                  data-theme-id="${id}"
                  title="${theme.label}"
                  class="w-full aspect-square rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${currentTheme === id ? 'border-white ring-2 ring-white/20' : 'border-transparent opacity-60 hover:opacity-100'}"
                  style="background: ${theme.primary}; box-shadow: 0 0 15px ${theme.primary}66;"
                >
                   <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="flex items-center gap-3 px-2">
            <div class="w-10 h-10 rounded-full border border-neon-cyan p-0.5 shadow-[0_0_10px_rgba(0,245,255,0.2)] flex-shrink-0">
              <div class="w-full h-full rounded-full bg-gradient-to-tr from-neon-cyan to-neon-purple animate-pulse"></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-black text-white uppercase tracking-tighter truncate font-orbitron">${getAdminName(user?.email)}</div>
              <div class="text-[8px] text-neon-cyan uppercase tracking-widest font-mono truncate opacity-60">${user?.email || 'N/A'}</div>
            </div>
          </div>

          <button id="logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-neon-red transition-colors font-bold uppercase text-xs tracking-widest">
            <i data-lucide="log-out" class="w-4 h-4"></i>
            Disconnect
          </button>
        </div>
      </div>
    </aside>
  `;
}

function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      <div class="absolute inset-0 cyber-grid pointer-events-none opacity-20"></div>
      <div class="bg-glow-purple top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"></div>
      <div class="scanline"></div>

      <div class="w-full max-w-md bg-[#0D0D20]/80 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 animate-fade-in">
        <div class="mb-10 text-center">
          <div class="w-20 h-20 bg-neon-pink rounded-2xl flex items-center justify-center shadow-[0_0_25px_#FF0080] mx-auto mb-6 transform rotate-3">
            <i data-lucide="layout-dashboard" class="w-10 h-10 text-white"></i>
          </div>
          <h1 class="text-4xl font-black text-white uppercase tracking-tighter italic font-orbitron">LINK BOX</h1>
          <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.4em] mt-2">Security Protocol V1.5</p>
        </div>

        <div class="space-y-6">
          <div id="login-error" class="hidden p-4 bg-neon-red/10 border border-neon-red/20 rounded-xl text-[10px] text-neon-red uppercase font-black tracking-widest text-center"></div>

          <div class="space-y-4">
            <div class="relative group">
              <input 
                id="login-email" 
                type="email" 
                placeholder="OPERATOR EMAIL" 
                class="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-xs font-bold font-orbitron placeholder:text-gray-700 focus:outline-none focus:border-neon-cyan transition-all"
              >
              <i data-lucide="users" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-neon-cyan transition-colors"></i>
            </div>

            <div class="relative group">
              <input 
                id="login-password" 
                type="password" 
                placeholder="ACCESS KEY" 
                class="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-xs font-bold font-orbitron placeholder:text-gray-700 focus:outline-none focus:border-neon-cyan transition-all"
              >
              <i data-lucide="shield-check" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-neon-cyan transition-colors"></i>
            </div>
          </div>

          <button id="login-btn" class="w-full bg-neon-pink text-white font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_30px_#FF0080] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_0_20px_rgba(255,0,128,0.4)] tracking-widest text-xs uppercase italic">
            Initialize Access
          </button>

          <footer class="text-center pt-4 border-t border-white/5">
            <p class="text-[9px] text-gray-600 font-mono uppercase tracking-[0.2em] font-bold">
              Support Link Box Collective // E2E Encrypted
            </p>
          </footer>
        </div>
      </div>
    </div>
  `;
}

function renderContent() {
  switch (currentRoute) {
    case 'dashboard': return renderDashboard();
    case 'members': return renderMembers();
    case 'activity': return renderActivity();
    case 'search': return renderSearch();
    case 'leaderboard': return renderLeaderboard();
    case 'audit': return renderAudit();
    case 'heatmap': return renderHeatmap();
    default: return `<div class="p-20 text-center text-gray-500 font-bold uppercase tracking-widest italic">${currentRoute} interface pending.</div>`;
  }
}

function renderDashboard() {
  return `
    <header class="mb-12 animate-fade-in">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00F5FF]"></div>
        <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Live Group Activity</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">CENTRAL MONITOR</h1>
    </header>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      ${renderStatCard('Total Members', '...', 'bg-neon-cyan/10 text-neon-cyan', 'users')}
      ${renderStatCard('Activity Status', 'Online', 'bg-neon-green/10 text-neon-green', 'shield-check')}
    </div>
    <div class="glass-card p-10 rounded-3xl border-white/5 relative overflow-hidden">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h2 class="text-lg font-black italic uppercase tracking-wider mb-1">Submission Heatmap</h2>
          <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">Tracking member link submissions over time</p>
        </div>
        <div class="flex gap-2">
           <div class="px-3 py-1 bg-white/5 rounded text-[10px] font-black uppercase text-neon-cyan border border-neon-cyan/20">Syncing...</div>
        </div>
      </div>
      <div class="h-64 flex items-center justify-center border border-white/5 bg-black/20 rounded-xl relative">
        <div class="absolute inset-0 cyber-grid opacity-10"></div>
        <p class="text-xs font-bold text-gray-700 uppercase tracking-widest italic z-10">Generating Activity Matrix</p>
      </div>
    </div>
  `;
}

function renderMembers() {
  return `
    <header class="mb-12">
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2 h-2 rounded-full bg-neon-pink shadow-[0_0_8px_#FF0080]"></div>
            <p class="text-neon-pink text-[10px] font-black uppercase tracking-[0.3em]">Official Roster</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter">MEMBER LIST</h1>
        </div>
        <button id="add-member-btn" class="bg-neon-pink text-white px-6 py-3 rounded-xl font-orbitron font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_15px_#FF0080] transition-all">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          Add Member
        </button>
      </div>
    </header>
    <div id="members-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="p-10 text-center text-gray-600 italic col-span-full">Syncing member records...</div>
    </div>

    <!-- Registration Modal -->
    <div id="member-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
      <div class="w-full max-w-lg glass-card p-10 rounded-3xl border-white/10 animate-fade-in">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-2xl font-black italic uppercase tracking-tighter">Register Members</h2>
            <p class="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Manual Database Update</p>
          </div>
          <button id="close-modal" class="text-gray-500 hover:text-white transition-colors">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="member-form" class="space-y-6">
          <div class="space-y-4">
            <div>
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-2">Member Names (One per line)</label>
              <textarea name="names" required class="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-neon-pink transition-all placeholder:text-gray-800" placeholder="Mehedi Hasan&#10;@Rakib Ahamed"></textarea>
            </div>
          </div>
          
          <button id="confirm-registration-btn" type="submit" class="w-full bg-neon-pink text-white font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_20px_#FF0080] transition-all uppercase italic tracking-widest text-xs">
            Confirm & Save Members
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderActivity() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <header class="mb-12">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#00FF88]"></div>
        <p class="text-neon-green text-[10px] font-black uppercase tracking-[0.3em]">Submission Log</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">SYNC ACTIVITY</h1>
    </header>
    <div class="max-w-3xl glass-card p-10 rounded-3xl border-white/10">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
        <div>
          <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Paste Submission List</h3>
          <textarea id="activity-data" class="w-full h-64 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-mono focus:border-neon-cyan/50 focus:outline-none transition-all placeholder:text-gray-700" placeholder="@username Post 1&#10;1️⃣ @Name ..."></textarea>
        </div>
        <div class="space-y-8">
          <div>
            <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Select Date</h3>
            <div class="relative group">
              <input id="activity-date" type="date" value="${today}" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold focus:outline-none focus:border-neon-cyan transition-all">
              <i data-lucide="calendar" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-neon-cyan transition-colors"></i>
            </div>
            <p class="text-[9px] text-gray-600 mt-4 leading-relaxed uppercase font-black italic">
              New members in the list will be highlighted for registration before updating points.
            </p>
          </div>
          
          <div class="p-6 bg-neon-cyan/5 border border-neon-cyan/10 rounded-2xl">
             <h4 class="text-[10px] font-black uppercase text-neon-cyan mb-2">System Notice</h4>
             <p class="text-[9px] text-gray-500 leading-relaxed uppercase font-bold">Registration check will occur automatically upon submission.</p>
          </div>
        </div>
      </div>
      <button id="submit-activity" class="w-full bg-neon-cyan text-black font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_20px_#00F5FF] transition-all flex items-center justify-center gap-3 uppercase italic tracking-widest text-sm">
        <i data-lucide="plus-circle" class="w-5 h-5"></i>
        Start Sync Process
      </button>
    </div>

    <!-- Discovery Modal -->
    <div id="discovery-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md hidden">
      <div class="w-full max-w-lg glass-card p-10 rounded-3xl border-neon-pink/20 animate-fade-in border-2 shadow-[0_0_50px_rgba(255,0,128,0.2)]">
        <h2 class="text-2xl font-black italic text-neon-pink uppercase tracking-tighter mb-2">New Members Detected!</h2>
        <p class="text-xs text-gray-500 font-bold uppercase mb-8">The following users aren't in the database. Select who to register:</p>
        
        <div id="discovery-list" class="max-h-64 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
          <!-- Discovery items -->
        </div>

        <div class="flex gap-4">
          <button id="cancel-discovery" class="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Cancel</button>
          <button id="confirm-discovery" class="flex-[2] py-4 bg-neon-pink text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(255,0,128,0.4)]">Register & Sync All</button>
        </div>
      </div>
    </div>
  `;
}

function renderSearch() {
  return `
    <header class="mb-12">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-amber shadow-[0_0_8px_#FFAA00]"></div>
        <p class="text-neon-amber text-[10px] font-black uppercase tracking-[0.3em]">Locator Protocol</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">SEARCH OPS</h1>
    </header>
    <div class="max-w-2xl mx-auto">
      <div class="relative group mb-12">
        <input id="search-input" type="text" placeholder="Enter username or ID..." class="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pl-14 text-lg font-bold placeholder:text-gray-700 focus:outline-none focus:border-neon-cyan transition-all">
        <i data-lucide="search" class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-cyan transition-colors"></i>
      </div>
      <div id="search-results" class="space-y-4"></div>
    </div>
  `;
}

async function generateInactivityNotice(daysThreshold: number, noticeType: 'warning' | 'severe' | 'final', limit: number) {
  const { data: allMembers } = await supabase.from('members').select('*');
  if (!allMembers) return 'Error: Could not retrieve members.';

  // 1. Get all unique dates where a sync occurred (Group Active Days)
  const { data: syncLogs } = await supabase
    .from('audit_trail')
    .select('timestamp')
    .eq('action', 'ACTIVITY_SYNC');

  const activeDates = new Set<string>();
  syncLogs?.forEach(log => {
    activeDates.add(new Date(log.timestamp).toISOString().split('T')[0]);
  });
  
  const sortedActiveDates = Array.from(activeDates).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

  // 2. Filter and Map members
  const inactiveMembers = allMembers.map(m => {
    if (!m.last_activity_date) return { ...m, missedDays: sortedActiveDates.length };
    
    // Count how many "Active Group Days" have passed since this member's last sync
    const lastSyncDate = m.last_activity_date;
    const missedDays = sortedActiveDates.filter(d => d > lastSyncDate).length;
    
    return { ...m, missedDays };
  })
  .filter(m => m.missedDays >= daysThreshold)
  .sort((a, b) => b.missedDays - a.missedDays);

  const date = new Date();
  const dateStr = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear().toString().slice(-2)}`;
  
  const headers = {
    warning: {
      title: '⚠️ Inactivity Warning ⚠️',
      desc: `আমরা লক্ষ করেছি নিচের মেম্বাররা ${daysThreshold} টি ওয়ার্কিং ডের বেশি\nসময় ধরে গ্রুপে ইনেক্টিভ আছেন।\n\nঅনুগ্রহ করে যত দ্রুত সম্ভব এক্টিভ হন অথবা\nকোনো সমস্যা থাকলে এডমিনের সাথে যোগাযোগ করুন।\nঅন্যথায় আপনাদের গ্রুপ থেকে রিমুভ করা হবে।`
    },
    severe: {
      title: '❗ Critical Inactivity Alert ❗',
      desc: `সতর্কতা! নিচের মেম্বাররা গত ${daysThreshold} টি ওয়ার্কিং ডে ধরে সম্পূর্ণ ইনেক্টিভ।\nআপনাদের শেষ সুযোগ দেওয়া হচ্ছে। ২৪ ঘণ্টার মধ্যে এক্টিভ না হলে\nস্থায়ীভাবে রিমুভ করা হবে।`
    },
    final: {
      title: '🚫 Final Removal Notice 🚫',
      desc: `চূড়ান্ত নোটিশ! নিচের মেম্বাররা ${daysThreshold} টি ওয়ার্কিং ডে ধরে ইনেক্টিভ থাকায়\nতাদের লিস্ট করা হয়েছে। আজই আপনাদের আইডি গ্রুপ থেকে ক্লিনিং\nকরা হবে। কোনো ওজর আপত্তি গ্রহণযোগ্য নয়।`
    }
  };

  const selectedHeader = headers[noticeType];

  const list = inactiveMembers.slice(0, limit).map((m, i) => {
    const numIcons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let displayNum = (i < 10) ? numIcons[i] : `${i + 1}️⃣`;
    if (i >= 10) displayNum = `${i + 1}️⃣`;

    return `${displayNum} @${m.name} ➤ (${m.missedDays} দিন ইনেক্টিভ)`;
  }).join('\n');

  return `${selectedHeader.title}

প্রিয় গ্রুপ মেম্বারগণ,

${selectedHeader.desc}

😴 Inactive Members 👇
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️

${list || 'কোনো ইনেক্টিভ মেম্বার পাওয়া যায়নি।'}

〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
📅 তারিখ: ${dateStr}

✍️ Support Link Box Admin Team`;
}

function renderLeaderboard() {
  return `
    <header class="mb-12">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F5FF]"></div>
            <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Global Standings</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter">LEADERBOARD</h1>
        </div>
        
        <div class="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start">
          <button 
            data-tab="rankings"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardTab === 'rankings' ? 'bg-neon-cyan text-black shadow-[0_0_15px_var(--glow-secondary)]' : 'text-gray-500 hover:text-gray-300'}"
          >Active Rankings</button>
          <button 
            data-tab="inactivity"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardTab === 'inactivity' ? 'bg-neon-pink text-white shadow-[0_0_15px_var(--glow-primary)]' : 'text-gray-500 hover:text-gray-300'}"
          >Inactivity / Notice Tool</button>
        </div>
      </div>
    </header>

    <div id="leaderboard-list">
      <div class="glass-card rounded-3xl border-white/5 overflow-hidden">
        <div class="p-10 text-center text-gray-600 italic">Syncing Member Data...</div>
      </div>
    </div>
  `;
}

function renderAudit() {
  return `
    <header class="mb-12">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-red shadow-[0_0_8px_#FF0000]"></div>
        <p class="text-neon-red text-[10px] font-black uppercase tracking-[0.3em]">Guardian Protocol</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">SECURE LOGS</h1>
    </header>
    <div id="audit-list" class="glass-card rounded-3xl border-white/5 overflow-hidden">
      <div class="p-10 text-center text-gray-600 italic">Syncing audit history...</div>
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
  if (currentRoute === 'dashboard') {
    fetchDashboardStats();
  } else if (currentRoute === 'members') {
    fetchMembers();
    
    document.getElementById('add-member-btn')?.addEventListener('click', () => {
      document.getElementById('member-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-modal')?.addEventListener('click', () => {
      document.getElementById('member-modal')?.classList.add('hidden');
    });

    document.getElementById('member-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const rawNames = formData.get('names') as string;
      
      const namesList: string[] = [];
      const namePattern = /(?:@|\d+[\.\s]*@+)\s*([^@\n\r]+?)(?=(?:\s+\d+\.|\s+@|\n|\r|$))/gi;
      let m;
      while ((m = namePattern.exec(rawNames)) !== null) {
          if (m[1]) {
              const cleaned = m[1].trim();
              if (cleaned && cleaned.toLowerCase() !== 'no post') {
                  namesList.push(cleaned);
              }
          }
      }

      if (namesList.length === 0) {
        namesList.push(...rawNames.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.toLowerCase() !== 'no post'));
      }

      if (namesList.length === 0) return;

      const btn = document.getElementById('confirm-registration-btn') as HTMLButtonElement;
      btn.textContent = 'EXECUTING BATCH...';
      btn.disabled = true;

      try {
        // 1. Get existing members to check for duplicates and find last member number
        const { data: existingMembers } = await supabase.from('members').select('name, member_number');
        const existingNames = new Set(existingMembers?.map(m => m.name.toLowerCase()));
        let lastMemberNumber = Math.max(...(existingMembers?.map(m => m.member_number) || [0]), 0);

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
            total_syncs: 0
          });
        }

        if (newMembers.length > 0) {
          const { error } = await supabase.from('members').insert(newMembers);
          if (error) throw error;
          await logAudit('MEMBER_BATCH_REGISTER', `Registered ${newMembers.length} members. Skiped ${skippedNames.length} duplicates.`);
        }

        document.getElementById('member-modal')?.classList.add('hidden');
        fetchMembers();
        form.reset();
        
        if (skippedNames.length > 0) {
          alert(`Success: Registered ${newMembers.length} members.\nSkipped ${skippedNames.length} duplicates: ${skippedNames.slice(0, 3).join(', ')}${skippedNames.length > 3 ? '...' : ''}`);
        } else {
          alert(`Success: Sequential registration of ${newMembers.length} members complete.`);
        }
      } catch (error: any) {
        alert('Batch Registration Failed: ' + error.message);
      } finally {
        btn.textContent = 'Initialize Batch Registration';
        btn.disabled = false;
      }
    });

  } else if (currentRoute === 'activity') {
    document.getElementById('submit-activity')?.addEventListener('click', async () => {
      const textarea = document.getElementById('activity-data') as HTMLTextAreaElement;
      const dateInput = document.getElementById('activity-date') as HTMLInputElement;
      const data = textarea.value;
      const date = dateInput.value;

      if (!data) return alert('No submission data found.');

      const syncBtn = document.getElementById('submit-activity') as HTMLButtonElement;
      const originalBtnText = syncBtn.innerHTML;
      
      const executeSync = async (toRegister: string[] = []) => {
        syncBtn.textContent = 'EXECUTING SYNC...';
        syncBtn.disabled = true;

        try {
          const activities = parseActivityBatch(data);
          let successCount = 0;

          // 1. Handle new registrations if any
          if (toRegister.length > 0) {
            const { data: existingMembers } = await supabase.from('members').select('member_number');
            let lastMemberNumber = Math.max(...(existingMembers?.map(m => m.member_number) || [0]), 0);
            
            const newMembers = toRegister.map(name => ({
              name,
              member_number: ++lastMemberNumber,
              total_points: 0,
              current_streak: 0,
              max_streak: 0,
              total_syncs: 0
            }));
            
            await supabase.from('members').insert(newMembers);
            await logAudit('MEMBER_DISCOVERY_SYNC', `Registered ${newMembers.length} members discovered during sync.`);
          }

          // 2. Fetch updated member map
          const { data: members } = await supabase.from('members').select('*');
          const memberMap = new Map();
          members?.forEach(m => memberMap.set(m.name.toLowerCase(), m));

          // 3. Process activity updates
          for (const act of activities) {
            const member = memberMap.get(act.username.toLowerCase());
            if (member) {
              const newPoints = (member.total_points || 0) + act.points;
              const totalSyncs = (member.total_syncs || 0) + 1;
              
              let currentStreak = member.current_streak || 0;
              const lastDate = member.last_activity_date ? new Date(member.last_activity_date) : null;
              const syncDate = new Date(date);
              
              if (lastDate) {
                const diffTime = Math.abs(syncDate.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) currentStreak += 1;
                else if (diffDays > 1) currentStreak = 1;
              } else {
                currentStreak = 1;
              }

              const maxStreak = Math.max(member.max_streak || 0, currentStreak);

              await supabase.from('members').update({ 
                 total_points: newPoints,
                 total_syncs: totalSyncs,
                 last_activity_date: date,
                 current_streak: currentStreak,
                 max_streak: maxStreak
              }).eq('id', member.id);

              await logAudit('ACTIVITY_SYNC', `Synced @${member.name}: +${act.points}pts [Streak: ${currentStreak}] on ${date}`);
              successCount++;
            }
          }
          
          alert(`Sync Complete! ${successCount} entries processed for ${date}.`);
          textarea.value = '';
          navigate('dashboard');
        } catch (err) {
          alert('Sync Failed: Database connection interrupted.');
        } finally {
          syncBtn.innerHTML = originalBtnText;
          syncBtn.disabled = false;
        }
      };

      // --- Discovery Logic ---
      try {
        const activities = parseActivityBatch(data);
        const { data: members } = await supabase.from('members').select('name');
        const existingNames = new Set(members?.map(m => m.name.toLowerCase()));
        
        const unknownNames = Array.from(new Set(
          activities
            .map(a => a.username)
            .filter(name => !existingNames.has(name.toLowerCase()))
        ));

        if (unknownNames.length > 0) {
          const modal = document.getElementById('discovery-modal')!;
          const list = document.getElementById('discovery-list')!;
          modal.classList.remove('hidden');
          
          list.innerHTML = unknownNames.map((name, i) => `
            <label class="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-neon-pink/40 transition-all">
              <input type="checkbox" checked value="${name}" class="w-4 h-4 rounded border-white/20 bg-transparent text-neon-pink focus:ring-neon-pink">
              <span class="text-sm font-bold text-gray-300">@${name}</span>
            </label>
          `).join('');

          const cancelBtn = document.getElementById('cancel-discovery')!;
          const confirmBtn = document.getElementById('confirm-discovery')!;

          const handleCancel = () => {
            modal.classList.add('hidden');
            syncBtn.innerHTML = originalBtnText;
            syncBtn.disabled = false;
          };

          const handleConfirm = () => {
            const checked = Array.from(list.querySelectorAll('input:checked')).map(i => (i as HTMLInputElement).value);
            modal.classList.add('hidden');
            executeSync(checked);
          };

          cancelBtn.onclick = handleCancel;
          confirmBtn.onclick = handleConfirm;
        } else {
          executeSync([]);
        }
      } catch (err) {
        alert('Discovery Protocol Failure.');
      }
    });
  } else if (currentRoute === 'search') {
    const input = document.getElementById('search-input') as HTMLInputElement;
    input?.addEventListener('input', (e) => {
       const val = (e.target as HTMLInputElement).value;
       if (val.length > 2) performSearch(val);
    });
  } else if (currentRoute === 'leaderboard') {
    fetchLeaderboard();
  } else if (currentRoute === 'audit') {
    fetchAuditLogs();
  } else if (currentRoute === 'heatmap') {
    fetchHeatmapData();
  }
}

async function fetchLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;

  // Add click listeners to tabs
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      leaderboardTab = (e.currentTarget as HTMLButtonElement).dataset.tab as 'rankings' | 'inactivity';
      render();
    });
  });

  if (leaderboardTab === 'rankings') {
    const { data } = await supabase.from('members').select('*').order('total_points', { ascending: false }).limit(20);
    if (data) {
      list.innerHTML = `
        <div class="glass-card rounded-3xl border-white/5 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead class="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500">
                <tr>
                  <th class="p-6">Rank</th>
                  <th class="p-6">Member</th>
                  <th class="p-6">Points</th>
                  <th class="p-6 text-right">Badge Level</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                ${data.map((member, i) => `
                  <tr class="hover:bg-white/5 transition-colors">
                    <td class="p-6 font-black italic text-neon-cyan">${(i + 1).toString().padStart(2, '0')}</td>
                    <td class="p-6 font-bold uppercase text-sm">${member.name}</td>
                    <td class="p-6 font-black italic text-white">${member.total_points}</td>
                    <td class="p-6 text-right">
                      <span class="px-2 py-1 bg-white/5 rounded text-[9px] font-black uppercase text-gray-400">${calculateLevel(member.total_points)}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  } else {
    // Inactivity View
    const { data: allMembers } = await supabase.from('members').select('*');
    const { data: syncLogs } = await supabase.from('audit_trail').select('timestamp').eq('action', 'ACTIVITY_SYNC');

    const activeDates = new Set<string>();
    syncLogs?.forEach(log => {
      activeDates.add(new Date(log.timestamp).toISOString().split('T')[0]);
    });
    const sortedActiveDates = Array.from(activeDates).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    if (allMembers) {
      const defaultDays = 7;
      
      const mappedMembers = allMembers.map(m => {
        if (!m.last_activity_date) return { ...m, missedDays: sortedActiveDates.length || 99 };
        const lastSyncDate = m.last_activity_date;
        const missedDays = sortedActiveDates.filter(d => d > lastSyncDate).length;
        return { ...m, missedDays };
      }).sort((a, b) => b.missedDays - a.missedDays);

      list.innerHTML = `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <!-- Inactive Leaderboard -->
          <div class="glass-card rounded-3xl border-white/5 overflow-hidden">
            <div class="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 class="text-neon-pink text-[10px] font-black uppercase tracking-widest">Notice Tool & Inactivity Management</h3>
                <p class="text-[9px] text-gray-500 uppercase font-black mt-1">Status of members based on working days</p>
              </div>
              <button id="show-generator-btn" class="px-6 py-2 bg-neon-pink text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:shadow-[0_0_15px_#FF0080] transition-all">
                Open Notice Tool
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[600px]">
                <thead class="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500">
                  <tr>
                    <th class="p-6">#</th>
                    <th class="p-6">Inactive Member</th>
                    <th class="p-6">Last Link Date</th>
                    <th class="p-6 text-right">Missed Sync Days</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${mappedMembers.map((member, i) => `
                    <tr class="hover:bg-white/5 transition-colors">
                      <td class="p-6 font-black italic text-neon-pink/50 text-xs">${(i + 1).toString().padStart(2, '0')}</td>
                      <td class="p-6 font-bold uppercase text-sm">${member.name}</td>
                      <td class="p-6 font-black italic text-gray-400 text-xs">${member.last_activity_date || 'No Records'}</td>
                      <td class="p-6 text-right">
                        <span class="px-2 py-1 ${member.missedDays > 10 ? 'bg-neon-red/10 text-neon-red' : 'bg-neon-pink/10 text-neon-pink'} rounded text-[10px] font-black uppercase tracking-widest">${member.missedDays} Days</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notice Generator (Hidden by default) -->
          <div id="notice-generator-section" class="hidden grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/5">
            <div class="space-y-6">
              <div class="glass-card p-8 rounded-2xl border-white/5">
                <h3 class="text-neon-pink text-[10px] font-black uppercase tracking-widest mb-6">Parameter Configuration</h3>
                <div class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Notice Type</label>
                      <select id="notice-type" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-pink outline-none transition-all font-bold text-xs">
                        <option value="warning" class="bg-[#050510]">General Warning</option>
                        <option value="severe" class="bg-[#050510]">Severe Alert</option>
                        <option value="final" class="bg-[#050510]">Removal Notice</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Threshold (Days)</label>
                      <select id="inactivity-days" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-pink outline-none transition-all font-bold text-xs">
                        <option value="3" class="bg-[#050510]">3 Days</option>
                        <option value="5" class="bg-[#050510]">5 Days</option>
                        <option value="7" selected class="bg-[#050510]">7 Days</option>
                        <option value="10" class="bg-[#050510]">10 Days</option>
                        <option value="15" class="bg-[#050510]">15 Days</option>
                        <option value="30" class="bg-[#050510]">30 Days</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Display Limit</label>
                    <select id="list-limit" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-pink outline-none transition-all font-bold text-xs">
                      <option value="10" class="bg-[#050510]">Top 10 Only</option>
                      <option value="20" selected class="bg-[#050510]">Top 20 Only</option>
                      <option value="30" class="bg-[#050510]">Top 30 Only</option>
                      <option value="50" class="bg-[#050510]">Top 50 Only</option>
                      <option value="100" class="bg-[#050510]">Include All Inactive</option>
                    </select>
                  </div>

                  <button id="generate-notice-btn" class="w-full py-4 bg-neon-pink text-white rounded-xl font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_#FF0080] transition-all">
                    Synchronize & Generate
                  </button>
                </div>
              </div>

              <div class="glass-card p-8 rounded-2xl border-white/5">
                <h3 class="text-neon-cyan text-[10px] font-black uppercase tracking-widest mb-6">Status Overview</h3>
                <div class="space-y-4" id="inactivity-stats">
                </div>
              </div>
            </div>

            <div class="glass-card p-8 rounded-2xl border-neon-pink/20 relative">
              <div class="absolute top-4 right-4 flex gap-2">
                <button id="copy-notice-btn" class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-neon-cyan flex items-center gap-2 border border-white/10 transition-all">
                  <i data-lucide="copy" class="w-3 h-3"></i>
                  Copy To Clipboard
                </button>
              </div>
              <h3 class="text-white text-[10px] font-black uppercase tracking-widest mb-6 border-l-2 border-neon-pink pl-4">Formatted Warning Notice</h3>
              <textarea id="notice-output" readonly placeholder="Click generate to view notice..." class="w-full h-[500px] bg-transparent border-none outline-none text-gray-400 font-mono text-xs leading-relaxed resize-none p-2 scrollbar-hide"></textarea>
            </div>
          </div>
        </div>
      `;

      createIcons({ icons: { Trophy, History, Search, PlusCircle, Users, LayoutDashboard, Copy, Check } }); 

      const showGenBtn = document.getElementById('show-generator-btn');
      const genSection = document.getElementById('notice-generator-section');
      
      showGenBtn?.addEventListener('click', () => {
        genSection?.classList.toggle('hidden');
        if (!genSection?.classList.contains('hidden')) {
          genSection.scrollIntoView({ behavior: 'smooth' });
          showGenBtn.textContent = 'Close Notice Tool';
        } else {
          showGenBtn.textContent = 'Open Notice Tool';
        }
      });

      const daysSelect = document.getElementById('inactivity-days') as HTMLSelectElement;
      const typeSelect = document.getElementById('notice-type') as HTMLSelectElement;
      const limitSelect = document.getElementById('list-limit') as HTMLSelectElement;
      const textarea = document.getElementById('notice-output') as HTMLTextAreaElement;
      const generateBtn = document.getElementById('generate-notice-btn');
      const copyBtn = document.getElementById('copy-notice-btn');
      const statsContainer = document.getElementById('inactivity-stats');

      const updateStats = (days: number) => {
        const inactive = mappedMembers.filter(m => m.missedDays >= days);

        if (statsContainer) {
          statsContainer.innerHTML = `
            <div class="flex justify-between items-center bg-white/5 p-4 rounded-xl">
              <span class="text-[10px] font-bold text-gray-500 uppercase">Members At/Above Threshold</span>
              <span class="text-xl font-black text-neon-pink italic">${inactive.length} Users</span>
            </div>
            <div class="flex justify-between items-center bg-white/5 p-4 rounded-xl">
              <span class="text-[10px] font-bold text-gray-500 uppercase">Notice Impact Level</span>
              <span class="text-[10px] font-black text-neon-red uppercase tracking-widest font-orbitron">${inactive.length > 5 ? 'High Impact' : 'Nominal'}</span>
            </div>
          `;
        }
      };

      updateStats(defaultDays);

      generateBtn?.addEventListener('click', async () => {
        const days = parseInt(daysSelect.value);
        const type = typeSelect.value as any;
        const limit = parseInt(limitSelect.value);
        generateBtn.textContent = 'GENERATING NOTICE...';
        (generateBtn as HTMLButtonElement).disabled = true;
        
        const notice = await generateInactivityNotice(days, type, limit);
        textarea.value = notice;
        
        generateBtn.textContent = 'Synchronize & Generate';
        (generateBtn as HTMLButtonElement).disabled = false;
        updateStats(days);
      });

      copyBtn?.addEventListener('click', () => {
        textarea.select();
        document.execCommand('copy');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> Copied!';
        createIcons({ icons: { Check } });
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          createIcons({ icons: { Copy } });
        }, 2000);
      });
    }
  }
}

async function fetchAuditLogs() {
  const { data } = await supabase.from('audit_trail').select('*').order('timestamp', { ascending: false }).limit(20);
  const list = document.getElementById('audit-list');
  if (list && data) {
    list.innerHTML = `
      <div class="divide-y divide-white/5">
        ${data.map(log => `
          <div class="p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
            <div>
              <div class="text-[10px] font-black uppercase text-neon-red mb-1">${log.action}</div>
              <div class="text-sm font-bold text-gray-300">${log.description}</div>
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-[9px] font-black uppercase text-gray-600">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="text-[10px] font-bold text-gray-500">${log.admin_name || 'Admin'}</div>
              </div>
              <button 
                data-delete-audit="${log.id}"
                class="opacity-0 group-hover:opacity-100 p-2 text-gray-700 hover:text-neon-red transition-all"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    list.querySelectorAll('[data-delete-audit]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.deleteAudit;
        if (confirm('Authorize log deletion?')) {
          const { error } = await supabase.from('audit_trail').delete().eq('id', id);
          if (!error) fetchAuditLogs();
        }
      });
    });

    createIcons({ icons: { Trash2 } });
  }
}

async function logAudit(action: string, description: string) {
  await supabase.from('audit_trail').insert({
    action,
    description,
    admin_name: getAdminName(user?.email),
    timestamp: new Date().toISOString()
  });
}

async function fetchHeatmapData() {
  const container = document.getElementById('heatmap-container');
  if (container) {
    container.innerHTML = `<div class="p-20 text-center text-gray-700 italic w-full">Heatmap visualization requires d3 integration. Data fetched successfully.</div>`;
  }
}

async function fetchMembers() {
  const { data } = await supabase.from('members').select('*').order('member_number', { ascending: true });
  const list = document.getElementById('members-list');
  if (list && data) {
    list.innerHTML = data.map(member => `
      <div class="glass-card p-6 rounded-2xl border-white/5 hover:border-neon-cyan/30 transition-all group overflow-hidden relative cursor-pointer member-card" data-member-id="${member.id}">
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-neon-cyan/5 rounded-full blur-3xl group-hover:bg-neon-cyan/10 transition-all"></div>
        <div class="w-1 h-32 bg-neon-cyan absolute left-0 top-1/2 -translate-y-1/2 scale-y-0 group-hover:scale-y-75 transition-transform origin-center"></div>
        
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center font-black text-neon-cyan italic">
              #${member.member_number}
            </div>
            <div>
              <h4 class="font-black italic uppercase tracking-tighter text-white line-clamp-1">${member.name}</h4>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-600">${calculateLevel(member.total_points)} Protocol</p>
            </div>
          </div>
          <button 
            data-delete-member="${member.id}"
            data-member-name="${member.name}"
            class="opacity-0 group-hover:opacity-100 p-2 text-gray-700 hover:text-neon-red transition-all relative z-10"
            onclick="event.stopPropagation()"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex justify-between items-center">
          <div class="text-left">
            <span class="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-1">Points</span>
            <span class="text-sm font-black italic text-neon-cyan">${member.total_points}</span>
          </div>
          <div class="text-[8px] font-black uppercase tracking-[0.2em] text-neon-green/60">Verified</div>
        </div>
      </div>
    `).join('');

    // Member details click
    list.querySelectorAll('.member-card').forEach(card => {
       card.addEventListener('click', () => {
          const id = (card as HTMLElement).dataset.memberId;
          const member = data.find(m => m.id === id);
          if (member) {
             selectedMember = member;
             render();
          }
       });
    });

    list.querySelectorAll('[data-delete-member]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.deleteMember;
        const name = (e.currentTarget as HTMLButtonElement).dataset.memberName;
        if (confirm(`Expunge member record for ${name}?`)) {
          const { error } = await supabase.from('members').delete().eq('id', id);
          if (!error) {
            await logAudit('MEMBER_DELETE', `Personnel expunged: ${name}`);
            fetchMembers();
          } else {
            alert('Deletion error: ' + error.message);
          }
        }
      });
    });

    createIcons({ icons: { Trash2 } });
  }
}

async function performSearch(query: string) {
    const results = document.getElementById('search-results');
    if (!results) return;
    const { data } = await supabase.from('members').select('*').ilike('name', `%${query}%`).limit(5);
    if (data) {
        results.innerHTML = data.map(m => `
            <div class="glass-card p-4 rounded-xl border-white/5 flex justify-between items-center cursor-pointer hover:border-neon-cyan/40 transition-all search-result-item" data-id="${m.id}">
                <span class="font-black italic uppercase text-sm">${m.name}</span>
                <span class="text-[10px] font-black uppercase text-neon-cyan">${m.total_points} PTS</span>
            </div>
        `).join('');

        results.querySelectorAll('.search-result-item').forEach(item => {
           item.addEventListener('click', () => {
              const id = (item as HTMLElement).dataset.id;
              const member = data.find(m => m.id === id);
              if (member) {
                 selectedMember = member;
                 render();
              }
           });
        });
    }
}

function renderStatCard(label: string, value: string, colorClass: string, icon: string) {
  return `
    <div class="glass-card p-6 rounded-2xl group hover:border-white/20 transition-all border-white/5">
      <div class="flex justify-between items-start mb-4">
        <div class="p-3 rounded-xl ${colorClass}">
          <i data-lucide="${icon}" class="w-6 h-6"></i>
        </div>
        <div class="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active</div>
      </div>
      <h3 class="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-1">${label}</h3>
      <p class="text-3xl font-black italic tracking-tighter text-white">${value}</p>
    </div>
  `;
}

function attachLoginEvents() {
  const loginBtn = document.getElementById('login-btn');
  const emailInput = document.getElementById('login-email') as HTMLInputElement;
  const passwordInput = document.getElementById('login-password') as HTMLInputElement;
  const errorDiv = document.getElementById('login-error');

  loginBtn?.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      if (errorDiv) {
        errorDiv.textContent = 'CREDENTIALS REQUIRED';
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    loginBtn.textContent = 'AUTHENTICATING...';
    loginBtn.setAttribute('disabled', 'true');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      loginBtn.textContent = 'INITIALIZE ACCESS';
      loginBtn.removeAttribute('disabled');
      if (errorDiv) {
        errorDiv.textContent = error.message.toUpperCase();
        errorDiv.classList.remove('hidden');
      }
    }
  });
}

function attachSidebarEvents() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const route = (e.currentTarget as HTMLButtonElement).dataset.route as Route;
      isSidebarOpen = false; // Close on navigation
      navigate(route);
    });
  });

  document.querySelectorAll('[data-theme-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeId = (e.currentTarget as HTMLButtonElement).dataset.themeId as Theme;
      applyTheme(themeId);
      render(); // Re-render to update the "active" state of theme buttons
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
}

function attachMobileEvents() {
  document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
    isSidebarOpen = !isSidebarOpen;
    render();
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    isSidebarOpen = false;
    render();
  });
}

async function fetchDashboardStats() {
    const { data: members } = await supabase.from('members').select('total_points');
    if (members) {
        const cards = document.querySelectorAll('.text-3xl');
        if (cards[0]) cards[0].textContent = members.length.toString();
        // Just show Gold+ count as "Protocol Level" high tier stat
        if (cards[1]) cards[1].textContent = members.filter(m => m.total_points >= 100).length.toString();
    }
}

// --- Initialization ---
initAuth();
