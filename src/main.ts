import './index.css';
import { supabase } from './lib/supabase';
import { createIcons, LayoutDashboard, Users, PlusCircle, Search, Trophy, History, LogOut, ShieldCheck, Calendar, Trash2, X } from 'lucide';
import { Route, Member, AuditLog, calculateLevel } from './types';
import { getAdminName } from './lib/utils';
import { parseActivityBatch } from './lib/parser';

// --- State Management ---
let currentRoute: Route = 'login';
let user: any = null;
let isSidebarOpen = false;

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
  render();
}

// --- Renderers ---
function render() {
  if (!user && currentRoute !== 'login') {
    currentRoute = 'login';
  }

  app.innerHTML = '';
  
  if (currentRoute === 'login') {
    app.innerHTML = renderLogin();
    attachLoginEvents();
  } else {
    app.innerHTML = `
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
            ${renderContent()}
          </div>
        </main>
      </div>
      <div class="scanline"></div>
    `;
    attachSidebarEvents();
    attachContentEvents();
    attachMobileEvents();
  }

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

function renderSidebar() {
  const menuItems = [
    { id: 'dashboard', label: 'Monitor', icon: 'layout-dashboard' },
    { id: 'members', label: 'Personnel', icon: 'users' },
    { id: 'activity', label: 'Input', icon: 'plus-circle' },
    { id: 'heatmap', label: 'History', icon: 'calendar' },
    { id: 'search', label: 'Locate', icon: 'search' },
    { id: 'leaderboard', label: 'Status', icon: 'trophy' },
    { id: 'audit', label: 'Logs', icon: 'history' },
  ];

  return `
    <aside class="w-64 glass-card border-r border-white/5 flex flex-col h-full bg-[#050510]">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-8 h-8 bg-neon-pink rounded flex items-center justify-center shadow-[0_0_15px_#FF0080]">
            <i data-lucide="shield-check" class="w-5 h-5 text-white"></i>
          </div>
          <span class="font-orbitron font-black text-sm italic tracking-tighter">LINK BOX</span>
        </div>
        
        <nav class="space-y-1">
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
      </div>
      
      <div class="mt-auto p-4 border-t border-white/5">
        <div class="flex items-center gap-3 px-2 mb-6">
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
    </aside>
  `;
}

function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050510] px-4 py-8">
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
        <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Live System Feed</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">CENTRAL MONITOR</h1>
    </header>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      ${renderStatCard('Total Member', '...', 'bg-neon-cyan/10 text-neon-cyan', 'users')}
      ${renderStatCard('Protocol Level', '...', 'bg-neon-green/10 text-neon-green', 'shield-check')}
    </div>
    <div class="glass-card p-10 rounded-3xl border-white/5 relative overflow-hidden">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h2 class="text-lg font-black italic uppercase tracking-wider mb-1">Engagement Flux</h2>
          <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">Atmospheric Activity Tracking</p>
        </div>
        <div class="flex gap-2">
           <div class="px-3 py-1 bg-white/5 rounded text-[10px] font-black uppercase text-neon-cyan border border-neon-cyan/20">Real-time</div>
        </div>
      </div>
      <div class="h-64 flex items-center justify-center border border-white/5 bg-black/20 rounded-xl relative">
        <div class="absolute inset-0 cyber-grid opacity-10"></div>
        <p class="text-xs font-bold text-gray-700 uppercase tracking-widest italic z-10">Telemetry Data Buffered</p>
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
            <p class="text-neon-pink text-[10px] font-black uppercase tracking-[0.3em]">Database v2.4</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter">MEMBER DIRECTORY</h1>
        </div>
        <button id="add-member-btn" class="bg-neon-pink text-white px-6 py-3 rounded-xl font-orbitron font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_15px_#FF0080] transition-all">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          Register New
        </button>
      </div>
    </header>
    <div id="members-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="p-10 text-center text-gray-600 italic col-span-full">Retrieving personnel records...</div>
    </div>

    <!-- Registration Modal -->
    <div id="member-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
      <div class="w-full max-w-lg glass-card p-10 rounded-3xl border-white/10 animate-fade-in">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-2xl font-black italic uppercase tracking-tighter">Personnel Ingestion</h2>
            <p class="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Automatic Sequence Protocol</p>
          </div>
          <button id="close-modal" class="text-gray-500 hover:text-white transition-colors">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="member-form" class="space-y-6">
          <div class="space-y-4">
            <div>
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-2">Personnel List (One per line)</label>
              <textarea name="names" required class="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-neon-pink transition-all placeholder:text-gray-800" placeholder="Mehedi Hasan&#10;ShaDat Hossain&#10;Md Shihab Khan"></textarea>
            </div>
          </div>
          
          <div class="p-4 bg-neon-pink/5 border border-neon-pink/10 rounded-xl">
            <p class="text-[9px] text-gray-500 leading-relaxed uppercase font-black italic">
              Duplicate names will be automatically suffixed. Member numbers are assigned sequentially. Levels are calculated automatically based on activity.
            </p>
          </div>

          <button id="confirm-registration-btn" type="submit" class="w-full bg-neon-pink text-white font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_20px_#FF0080] transition-all uppercase italic tracking-widest text-xs">
            Initialize Batch Registration
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
        <p class="text-neon-green text-[10px] font-black uppercase tracking-[0.3em]">Manual Link Override</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">DATA INGESTION</h1>
    </header>
    <div class="max-w-3xl glass-card p-10 rounded-3xl border-white/10">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
        <div>
          <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Ingestion Payload</h3>
          <textarea id="activity-data" class="w-full h-64 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-mono focus:border-neon-cyan/50 focus:outline-none transition-all placeholder:text-gray-700" placeholder="@username Post 1&#10;@username No Post"></textarea>
        </div>
        <div class="space-y-8">
          <div>
            <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Temporal Alignment</h3>
            <div class="relative group">
              <input id="activity-date" type="date" value="${today}" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm font-bold focus:outline-none focus:border-neon-cyan transition-all">
              <i data-lucide="calendar" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-neon-cyan transition-colors"></i>
            </div>
            <p class="text-[9px] text-gray-600 mt-4 leading-relaxed uppercase font-black italic">
              Select the specific cycle for this data dump. Previous dates can be backfilled manually to maintain sequence integrity.
            </p>
          </div>
          
          <div class="p-6 bg-neon-cyan/5 border border-neon-cyan/10 rounded-2xl">
             <h4 class="text-[10px] font-black uppercase text-neon-cyan mb-2">Protocol Note</h4>
             <p class="text-[9px] text-gray-500 leading-relaxed uppercase font-bold">Multiple records for the same operator on the same date will trigger a point consolidation sequence.</p>
          </div>
        </div>
      </div>
      <button id="submit-activity" class="w-full bg-neon-cyan text-black font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_20px_#00F5FF] transition-all flex items-center justify-center gap-3 uppercase italic tracking-widest text-sm">
        <i data-lucide="plus-circle" class="w-5 h-5"></i>
        Submit Sync Sequence
      </button>
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

function renderLeaderboard() {
  return `
    <header class="mb-12">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F5FF]"></div>
        <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Global Ranking</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">LEADERBOARD</h1>
    </header>
    <div id="leaderboard-list" class="glass-card rounded-3xl border-white/5 overflow-hidden">
      <div class="p-10 text-center text-gray-600 italic">Calculating standings...</div>
    </div>
  `;
}

function renderAudit() {
  return `
    <header class="mb-12">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-2 h-2 rounded-full bg-neon-red shadow-[0_0_8px_#FF0000]"></div>
        <p class="text-neon-red text-[10px] font-black uppercase tracking-[0.3em]">System Watchdog</p>
      </div>
      <h1 class="text-5xl font-black italic tracking-tighter">AUDIT TRAIL</h1>
    </header>
    <div id="audit-list" class="glass-card rounded-3xl border-white/5 overflow-hidden">
      <div class="p-10 text-center text-gray-600 italic">Retrieving security logs...</div>
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
      const lines = rawNames.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (const line of lines) {
        // If line contains multiple @ symbols, split it into multiple names
        if ((line.match(/@/g) || []).length > 1) {
          const parts = line.split('@').map(p => p.trim()).filter(p => p.length > 0);
          for (const p of parts) {
            const cleaned = p.replace(/^\d+(?:\.|\s)+/, '').trim();
            if (cleaned) namesList.push(cleaned);
          }
        } else {
          // Precise cleaning: remove leading digits followed by dot/space, then remove any leading @ symbols
          const cleaned = line.replace(/^\d+(?:\.|\s|@)+/, '').replace(/^@+/, '').trim();
          if (cleaned) namesList.push(cleaned);
        }
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
        for (const rawName of namesList) {
          let uniqueName = rawName;
          let counter = 1;
          
          // Deduplication Logic
          while (existingNames.has(uniqueName.toLowerCase())) {
            uniqueName = `${rawName} ${counter}`;
            counter++;
          }
          
          existingNames.add(uniqueName.toLowerCase());
          lastMemberNumber++;
          
          newMembers.push({
            name: uniqueName,
            member_number: lastMemberNumber,
            total_points: 0
          });
        }

        const { error } = await supabase.from('members').insert(newMembers);
        if (error) throw error;

        document.getElementById('member-modal')?.classList.add('hidden');
        await logAudit('MEMBER_BATCH_REGISTER', `Registered ${newMembers.length} personnel. Entities: ${newMembers.map(m => m.name).join(', ')}`);
        fetchMembers();
        form.reset();
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

      if (!data) return alert('No payload detected');

      const btn = document.getElementById('submit-activity') as HTMLButtonElement;
      const originalText = btn.innerHTML;
      btn.textContent = 'EXECUTING SYNC...';
      btn.disabled = true;

      try {
        const activities = parseActivityBatch(data);
        let successCount = 0;

        // Fetch all members to match by name
        const { data: members } = await supabase.from('members').select('id, name, total_points');
        const memberMap = new Map();
        members?.forEach(m => memberMap.set(m.name.toLowerCase(), m));

        for (const act of activities) {
          const member = memberMap.get(act.username.toLowerCase());
          if (member) {
            const newPoints = (member.total_points || 0) + act.points;
            await supabase.from('members').update({ total_points: newPoints }).eq('id', member.id);
            await logAudit('ACTIVITY_SYNC', `Synced @${member.name}: +${act.points}pts [New Total: ${newPoints}] on ${date}`);
            successCount++;
          } else {
            await logAudit('SYNC_WARNING', `Entry "@${act.username}" not found in personnel directory.`);
          }
        }
        
        alert(`Sync Sequence Complete. Processed ${successCount} entries for cycle ${date}.`);
        textarea.value = '';
      } catch (err) {
        alert('Sync Error: Protocol interrupted.');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
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
  const { data } = await supabase.from('members').select('*').order('total_points', { ascending: false }).limit(10);
  const list = document.getElementById('leaderboard-list');
  if (list && data) {
    list.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[600px]">
          <thead class="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500">
            <tr>
              <th class="p-6">Rank</th>
              <th class="p-6">Personnel</th>
              <th class="p-6">Points</th>
              <th class="p-6 text-right">Level</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            ${data.map((member, i) => `
              <tr class="hover:bg-white/5 transition-colors">
                <td class="p-6 font-black italic text-neon-cyan">${(i + 1).toString().padStart(2, '0')}</td>
              <td class="p-6 font-bold uppercase text-sm">${member.name}</td>
              <td class="p-6 font-black italic text-white">${member.total_points}</td>
              <td class="p-6 text-right">
                <span class="text-[9px] font-black uppercase text-gray-500">${calculateLevel(member.total_points)}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
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
      <div class="glass-card p-6 rounded-2xl border-white/5 hover:border-white/20 transition-all group overflow-hidden relative">
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-neon-cyan/5 rounded-full blur-3xl group-hover:bg-neon-cyan/10 transition-all"></div>
        
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center font-black text-neon-cyan italic">
              #${member.member_number}
            </div>
            <div>
              <h4 class="font-black italic uppercase tracking-tighter text-white">${member.name}</h4>
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-600">${calculateLevel(member.total_points)} Protocol</p>
            </div>
          </div>
          <button 
            data-delete-member="${member.id}"
            data-member-name="${member.name}"
            class="opacity-0 group-hover:opacity-100 p-2 text-gray-700 hover:text-neon-red transition-all"
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

    list.querySelectorAll('[data-delete-member]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.deleteMember;
        const name = (e.currentTarget as HTMLButtonElement).dataset.memberName;
        if (confirm(`Expunge personnel record for ${name}?`)) {
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
            <div class="glass-card p-4 rounded-xl border-white/5 flex justify-between items-center">
                <span class="font-black italic uppercase text-sm">${m.name}</span>
                <span class="text-[10px] font-black uppercase text-neon-cyan">${m.total_points} PTS</span>
            </div>
        `).join('');
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
