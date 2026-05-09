import { noticeBoxSupabase as supabase } from './supabase';
import html2canvas from 'html2canvas';

interface MissionParticipant {
  id: string;
  name: string;
  points: number;
  week_number: number;
}

interface MissionHistory {
  id: string;
  week_number: number;
  data: {
    participants: MissionParticipant[];
    group: string;
  };
  note: string | null;
  created_at: string;
}

let currentWeek = 30;
let participants: MissionParticipant[] = [];
let missionHistory: MissionHistory[] = [];
let groupName = 'Support Link Box';

function getMissionWeek(date: Date = new Date()): number {
  const anchorDate = new Date('2026-05-09T00:00:00Z');
  const anchorWeek = 30;
  
  // Calculate difference in days (UTC)
  const diffTime = date.getTime() - anchorDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Saturday to Friday cycle starts at diffDays 0
  const diffWeeks = Math.floor(diffDays / 7);
  
  return Math.max(1, anchorWeek + diffWeeks);
}

let isInitializing = false;
let isLoaded = false;
let lastLoadedWeek: number | null = null;

export async function initializeMission(onRender: () => void) {
  if (isInitializing) return;
  
  if (isLoaded && lastLoadedWeek === currentWeek) {
    return;
  }

  isInitializing = true;
  try {
    console.log(`[Mission] Initializing Week ${currentWeek}...`);
    
    const { data: cfg } = await supabase.from('slb_mam_config').select('*').eq('id', 'main').single();
    if (cfg) {
      currentWeek = cfg.week_number || currentWeek;
      groupName = cfg.group_name || groupName;
    }

    await Promise.all([
      loadMissionParticipants(),
      loadMissionHistory()
    ]);

    isLoaded = true;
    lastLoadedWeek = currentWeek;
    onRender();
  } catch (error) {
    console.error('[Mission] Initialization failed:', error);
  } finally {
    isInitializing = false;
  }
}

async function loadMissionParticipants() {
  const { data, error } = await supabase
    .from('slb_mam_participants')
    .select('*')
    .eq('week_number', currentWeek)
    .order('points', { ascending: false });
    
  if (error) {
    console.error('[Mission] Participants fetch error:', error);
    throw error;
  }
  participants = data || [];
}

async function loadMissionHistory() {
  const { data, error } = await supabase
    .from('slb_mam_history')
    .select('*')
    .order('week_number', { ascending: false });
    
  if (error) {
    console.error('[Mission] History fetch error:', error);
    // History is not critical, don't throw
  }
  missionHistory = data || [];
}

export function renderMemberMission(onRender: () => void) {
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="w-2 h-2 rounded-full bg-neon-amber shadow-[0_0_8px_#F59E0B]"></div>
            <p class="text-neon-amber text-[10px] font-black uppercase tracking-[0.3em] font-orbitron">MISSION TRACKER</p>
          </div>
          <h1 class="text-4xl font-black italic tracking-tighter uppercase text-white font-cinzel">Member Adding Mission</h1>
          <p class="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 font-orbitron">STATUS: ${ordinal(currentWeek).toUpperCase()} WEEK (${currentWeek === getMissionWeek() ? 'CURRENT' : 'HISTORICAL'})</p>
        </div>
        <div class="flex items-center gap-4">
          <button id="mission-refresh" class="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-neon-cyan transition-all group" title="Sync All Data">
            <svg class="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <div class="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-xl font-orbitron">
           <button id="mission-prev-week" class="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
           </button>
           <div class="px-4 py-1 text-center min-w-[100px]">
             <p class="text-[8px] text-gray-500 font-black uppercase tracking-tighter">Selected Week</p>
             <p class="text-xl font-black italic tracking-tighter text-neon-amber">W—${String(currentWeek).padStart(2, '0')}</p>
           </div>
           <button id="mission-next-week" class="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
           </button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-8 space-y-6">
          <!-- Leaderboard Card -->
          <div class="glass-card rounded-3xl border-white/10 overflow-hidden relative group" id="mission-lb-capture">
            <div class="absolute inset-0 bg-gradient-to-br from-neon-amber/5 to-transparent pointer-events-none"></div>
            
            <div class="p-8 text-center border-b border-white/5 relative">
              <p class="text-[8px] text-neon-amber font-black uppercase tracking-[0.4em] mb-2 font-orbitron">◆ Global Leaderboard ◆</p>
              <h2 class="text-2xl font-black italic tracking-tighter uppercase text-white mb-1 font-cinzel">MISSION STANDINGS</h2>
              <div class="flex items-center justify-center gap-2 font-orbitron">
                <span class="bg-neon-amber text-black text-[9px] font-black px-2 py-0.5 rounded uppercase">WEEK ${currentWeek}</span>
                <span class="text-gray-500 text-[9px] font-black uppercase tracking-widest">${groupName}</span>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-white/[0.02]">
                    <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neon-amber italic font-orbitron">Pos</th>
                    <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neon-amber italic font-orbitron">Member Name</th>
                    <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neon-amber italic text-right font-orbitron">Points</th>
                    <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-neon-amber italic text-right font-orbitron">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.03]">
                  ${!isLoaded ? `
                    <tr><td colspan="4" class="px-6 py-20 text-center"><div class="w-8 h-8 border-2 border-neon-amber/20 border-t-neon-amber rounded-full animate-spin mx-auto mb-4"></div><p class="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Synchronizing Mission Data...</p></td></tr>
                  ` : participants.length === 0 ? `
                    <tr><td colspan="4" class="px-6 py-20 text-center text-gray-500 italic text-xs font-orbitron">No active members found for Week ${currentWeek}. Add someone to deploy.</td></tr>
                  ` : participants.map((p, i) => {
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    const rankColor = rank === 1 ? 'text-neon-amber' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-700' : 'text-gray-500';
                    return `
                      <tr class="hover:bg-white/[0.02] transition-colors group/row">
                        <td class="px-6 py-4">
                          <span class="text-lg font-black italic tracking-tighter ${rankColor} font-orbitron">${isTop3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : rank}</span>
                        </td>
                        <td class="px-6 py-4">
                          <p class="font-bold text-white tracking-tight">${p.name}</p>
                        </td>
                        <td class="px-6 py-4 text-right">
                          <p class="text-xl font-black italic tracking-tighter text-white font-orbitron">${p.points}</p>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center justify-end gap-1 opacity-40 group-hover/row:opacity-100 transition-opacity">
                            <button onclick="window.memberMissionActions.updatePoints('${p.id}', 1)" class="p-1.5 hover:bg-neon-cyan/20 rounded-lg text-neon-cyan transition-all" title="Add Point">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
                            </button>
                            <button onclick="window.memberMissionActions.updatePoints('${p.id}', -1)" class="p-1.5 hover:bg-neon-red/20 rounded-lg text-neon-red transition-all" title="Remove Point">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"/></svg>
                            </button>
                            <button onclick="window.memberMissionActions.setPoints('${p.id}', '${p.name}', ${p.points})" class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-all" title="Edit Manually">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onclick="window.memberMissionActions.deleteParticipant('${p.id}')" class="p-1.5 hover:bg-neon-red/20 rounded-lg text-neon-red/60 hover:text-neon-red transition-all" title="Delete">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="p-6 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div class="flex gap-6 font-orbitron">
                <div>
                  <p class="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1 italic">Total Members</p>
                  <p class="text-xl font-black italic tracking-tighter text-white">${participants.length}</p>
                </div>
                <div>
                  <p class="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1 italic">Total Points</p>
                  <p class="text-xl font-black italic tracking-tighter text-neon-amber">${participants.reduce((s, p) => s + p.points, 0)}</p>
                </div>
              </div>
              <button id="mission-end-week" class="px-6 py-2.5 bg-neon-amber text-black font-black italic tracking-tighter uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all font-cinzel">
                🏁 Finish Week & Export
              </button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-4 space-y-6">
          <!-- Quick Add -->
          <div class="glass-card p-6 rounded-3xl border-white/10">
            <h3 class="text-xs font-black italic tracking-widest uppercase text-white mb-4 flex items-center gap-2">
              <svg class="w-4 h-4 text-neon-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              Add Participant
            </h3>
            <div class="space-y-3 font-orbitron">
              <button id="mission-add-btn" class="w-full py-4 bg-neon-amber/10 hover:bg-neon-amber/20 border border-neon-amber/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-neon-amber transition-all shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                + Register New Member
              </button>
            </div>
          </div>

          <!-- History -->
          <div class="glass-card p-6 rounded-3xl border-white/10">
            <h3 class="text-xs font-black italic tracking-widest uppercase text-white mb-4">Challenge History</h3>
            <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              ${missionHistory.length === 0 ? `
                <p class="text-[10px] text-gray-500 italic text-center py-4">No past results found.</p>
              ` : missionHistory.map(h => `
                <div class="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group">
                  <div class="font-orbitron">
                    <p class="text-[10px] font-black italic text-neon-amber uppercase tracking-widest">Week ${h.week_number}</p>
                    <p class="text-[8px] text-gray-500 uppercase font-bold">${new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.memberMissionActions.downloadPoster('${h.id}')" class="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-all" title="View Summary">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                    <button onclick="window.memberMissionActions.deleteHistory('${h.id}')" class="p-1.5 hover:bg-neon-red/20 rounded-lg text-neon-red/60 transition-all" title="Delete Archive">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Modal for Inputs -->
    <div id="mission-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
      <div class="glass-card max-w-md w-full p-8 rounded-3xl border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <h2 id="mission-modal-title" class="text-2xl font-black italic tracking-tighter uppercase text-white mb-6 font-cinzel">Input Required</h2>
        <div class="space-y-4">
          <div id="mission-modal-body"></div>
          <div class="flex gap-3 pt-4">
            <button id="mission-modal-cancel" class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all">Cancel</button>
            <button id="mission-modal-save" class="flex-1 py-3 bg-neon-amber text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] transition-all">Confirm</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Poster Capture Area (Styled for High Quality) -->
    <div id="mission-poster-wrapper" style="position:fixed; left:-9999px; top:-9999px; width:600px; background:#000; color:#fff; font-family:'Cinzel', serif;">
    </div>
  `;
}

export function attachMissionEvents(onRender: () => void) {
  const logError = (msg: string, e: any) => {
    console.error(msg, e);
    alert(`${msg}: ${e?.message || 'Unknown Error'}`);
  };

  // Week Controls
  const prevBtn = document.getElementById('mission-prev-week');
  if (prevBtn) {
    prevBtn.onclick = async () => {
      if (currentWeek > 1) {
        currentWeek--;
        await saveConfig();
        await initializeMission(onRender);
      }
    };
  }

  const nextBtn = document.getElementById('mission-next-week');
  if (nextBtn) {
    nextBtn.onclick = async () => {
      currentWeek++;
      await saveConfig();
      await initializeMission(onRender);
    };
  }

  // Expose Modal Utility to window
  (window as any).missionModal = {
    show: (title: string, bodyHtml: string, onSave: (val: string) => void) => {
      const modal = document.getElementById('mission-modal');
      const titleEl = document.getElementById('mission-modal-title');
      const bodyEl = document.getElementById('mission-modal-body');
      const saveBtn = document.getElementById('mission-modal-save');
      const cancelBtn = document.getElementById('mission-modal-cancel');
      
      if (!modal || !titleEl || !bodyEl || !saveBtn || !cancelBtn) return;
      
      titleEl.textContent = title;
      bodyEl.innerHTML = bodyHtml;
      modal.classList.remove('hidden');
      
      const cleanup = () => {
        modal.classList.add('hidden');
        (saveBtn as HTMLButtonElement).onclick = null;
        (cancelBtn as HTMLButtonElement).onclick = null;
      };

      (saveBtn as HTMLButtonElement).onclick = async () => {
        const input = bodyEl.querySelector('input, textarea') as HTMLInputElement;
        const value = input?.value || '';
        
        try {
          // Await the save operation
          await onSave(value);
          cleanup();
        } catch (e) {
          console.error('[Modal] Save failed:', e);
          // Don't cleanup so user can see/fix error
        }
      };
      
      (cancelBtn as HTMLButtonElement).onclick = cleanup;

      // Auto-focus the input
      setTimeout(() => {
        const input = bodyEl.querySelector('input, textarea') as HTMLInputElement;
        input?.focus();
        if (input instanceof HTMLInputElement && (input.type === 'number' || input.type === 'text')) {
          input.select();
        }
      }, 50);
    }
  };

  // Add Participant via Modal logic (for better UX and text box visibility)
  const addBtn = document.getElementById('mission-add-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      (window as any).missionModal.show(
        'Register Member',
        `<div class="space-y-4">
          <p class="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] italic font-orbitron">Enter full name to deploy member</p>
          <input type="text" id="modal-name-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-amber outline-none font-orbitron" placeholder="Member Name...">
        </div>`,
        async (name: string) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          if (participants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
             alert('Member already registered for this week.');
             throw new Error('Duplicate');
          }

          const saveBtn = document.getElementById('mission-modal-save') as HTMLButtonElement;
          const cancelBtn = document.getElementById('mission-modal-cancel') as HTMLButtonElement;
          
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Deploying...';
          }
          if (cancelBtn) cancelBtn.disabled = true;

          try {
            console.log(`[Mission] Registering ${trimmed}...`);
            
            // Standard insert without complex race for now to isolate issue
            const { data, error } = await supabase.from('slb_mam_participants')
              .insert({ 
                name: trimmed, 
                 points: 0, 
                 week_number: currentWeek 
              })
              .select();

            if (error) {
              console.error('[Mission] Register Error:', error);
              throw error;
            }

            console.log('[Mission] Saved successfully:', data);
            
            if (data && data.length > 0) {
              const newMember = data[0];
              if (!participants.some(p => p.id === newMember.id)) {
                participants.push(newMember);
                participants.sort((a, b) => b.points - a.points);
              }
            } else {
              // If no data returned but no error, re-fetch just in case
              await loadMissionParticipants();
            }
            
            // Update UI
            onRender();
            // Success alert
            setTimeout(() => alert(`Member "${trimmed}" registered successfully!`), 100);
          } catch (e: any) {
            console.error('[Mission] Deployment Catch:', e);
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Confirm';
            }
            if (cancelBtn) cancelBtn.disabled = false;
            alert(`Registration Failed: ${e.message || 'Network Timeout'}`);
            throw e;
          }
        }
      );
    };
  }

  // Refresh Button
  const refreshBtn = document.getElementById('mission-refresh');
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      isLoaded = false; // Force re-fetch
      await initializeMission(onRender);
    };
  }

  // End Week
  const endBtn = document.getElementById('mission-end-week');
  if (endBtn) {
    endBtn.onclick = () => {
      if (participants.length === 0) return;
      
      const calWeek = getMissionWeek();
      const nextWeek = Math.max(currentWeek + 1, calWeek);
  
      (window as any).missionModal.show(
        'Finish Week',
        `<div class="space-y-4 font-orbitron">
          <p class="text-xs text-gray-400 uppercase font-bold tracking-widest text-center">Closing Week ${currentWeek}</p>
          <div class="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <span class="text-[8px] text-neon-amber uppercase font-black block mb-1">New Protocol Starts At</span>
              <span class="text-2xl text-white font-black italic">WEEK ${nextWeek}</span>
          </div>
          <div>
            <p class="text-[8px] text-gray-500 mb-2 uppercase font-black tracking-widest italic">Mission Period Note (Optional)</p>
            <input type="text" id="mission-note-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-amber outline-none" placeholder="Summary of achievements...">
          </div>
        </div>`,
        async (note: string) => {
          try {
            const sorted = [...participants].sort((a, b) => b.points - a.points);
            await downloadMissionPoster(sorted, currentWeek);
  
            const { data: hist, error } = await supabase.from('slb_mam_history').insert({
              week_number: currentWeek,
              data: { participants: sorted, group: groupName },
              note: note || null
            }).select().single();
            if (error) throw error;
  
            currentWeek = nextWeek;
            await saveConfig();
            await initializeMission(onRender);
            alert(`Week ${currentWeek - 1} archived. New protocol: Week ${currentWeek}`);
          } catch (e) {
            logError('Archive Failure', e);
          }
        }
      );
    };
  }

  // Expose actions to window for onclick handlers
  (window as any).memberMissionActions = {
    updatePoints: async (id: string, delta: number) => {
      const p = participants.find(x => x.id === id);
      if (!p) return;
      const newPoints = Math.max(0, p.points + delta);
      const { error } = await supabase.from('slb_mam_participants').update({ points: newPoints }).eq('id', id);
      if (!error) {
        p.points = newPoints;
        participants.sort((a, b) => b.points - a.points);
        onRender();
      }
    },
    setPoints: async (id: string, name: string, current: number) => {
      (window as any).missionModal.show(
        `Update: ${name}`,
        `<p class="text-xs text-gray-500 mb-2 uppercase font-black tracking-widest italic font-orbitron">Current Points: ${current}</p>
         <input type="number" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-2xl font-black italic text-neon-amber focus:border-neon-amber outline-none font-orbitron" value="${current}" min="0">`,
        async (val: string) => {
          const points = parseInt(val);
          if (isNaN(points) || points < 0) return;
          const { error } = await supabase.from('slb_mam_participants').update({ points }).eq('id', id);
          if (!error) {
            const p = participants.find(x => x.id === id);
            if (p) p.points = points;
            participants.sort((a, b) => b.points - a.points);
            onRender();
          }
        }
      );
    },
    deleteParticipant: async (id: string) => {
      if (!confirm('Remove member from this week?')) return;
      const { error } = await supabase.from('slb_mam_participants').delete().eq('id', id);
      if (!error) {
        participants = participants.filter(x => x.id !== id);
        onRender();
      }
    },
    downloadPoster: (histId: string) => {
      const h = missionHistory.find(x => x.id === histId);
      if (h) {
        const sorted = (h.data.participants || []).sort((a, b) => b.points - a.points);
        downloadMissionPoster(sorted, h.week_number);
      }
    },
    deleteHistory: async (id: string) => {
      if (!confirm('Delete this historical result?')) return;
      const { error } = await supabase.from('slb_mam_history').delete().eq('id', id);
      if (!error) {
        missionHistory = missionHistory.filter(x => x.id !== id);
        onRender();
      }
    }
  };
}

async function saveConfig() {
  await supabase.from('slb_mam_config').upsert({
    id: 'main',
    week_number: currentWeek,
    group_name: groupName
  });
}

async function downloadMissionPoster(sorted: MissionParticipant[], weekNum: number) {
  const wrapper = document.getElementById('mission-poster-wrapper');
  if (!wrapper) return;

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const rows = sorted.map((p, i) => {
    const rank = i + 1;
    const color = rank === 1 ? '#F59E0B' : rank === 2 ? '#D1D5DB' : rank === 3 ? '#B45309' : '#4B5563';
    const bg = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
    return `
      <div style="display:flex; align-items:center; padding:12px 20px; background:${bg}; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="width:50px; font-weight:900; font-style:italic; font-size:1.2rem; color:${color};">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}</div>
        <div style="flex:1; font-weight:800; font-size:1rem; letter-spacing:-0.5px;">${p.name.toUpperCase()}</div>
        <div style="font-weight:900; font-size:1.4rem; font-style:italic; color:#F59E0B;">${p.points}</div>
      </div>
    `;
  }).join('');

  wrapper.innerHTML = `
    <div style="padding:40px; background-image: radial-gradient(circle at top right, #1a1a2e, #000); border: 2px solid #FFAA00; position:relative; overflow:hidden; font-family:'Cinzel', serif;">
      <div style="text-align:center; margin-bottom:30px; position:relative; z-index:1;">
        <div style="color:#FFAA00; font-size:8px; font-weight:900; letter-spacing:5px; margin-bottom:10px; font-family:'Orbitron', sans-serif;">◆ MISSION SUMMARY ◆</div>
        <h1 style="font-size:32px; font-weight:900; font-style:italic; letter-spacing:-2px; margin-bottom:5px; color:#fff;">MEMBER ADDING MISSION</h1>
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; font-family:'Orbitron', sans-serif;">
          <span style="background:#FFAA00; color:#000; font-weight:900; padding:2px 10px; font-size:10px; border-radius:4px;">WEEK ${weekNum}</span>
          <span style="color:#9CA3AF; font-size:10px; font-weight:900; border:1px solid #374151; padding:2px 8px; border-radius:4px;">COMPLETE</span>
        </div>
        <p style="color:#BF9B30; font-size:12px; font-weight:900; margin-top:10px; letter-spacing:3px;">${groupName.toUpperCase()}</p>
      </div>
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:15px; overflow:hidden; font-family:'Orbitron', sans-serif;">
        ${rows}
      </div>
      <div style="text-align:center; margin-top:30px; font-size:8px; color:#4B5563; font-weight:900; letter-spacing:4px; opacity:0.5; font-family:'Orbitron', sans-serif;">
        OFFICIAL RESULTS · ${groupName.toUpperCase()}
      </div>
    </div>
  `;

  // Give fonts a moment to ensure they're ready
  await new Promise(r => setTimeout(r, 500));

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#000',
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const link = document.createElement('a');
    link.download = `mission-report-week-${weekNum}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error('Poster generation failed:', e);
  } finally {
    wrapper.innerHTML = '';
  }
}
