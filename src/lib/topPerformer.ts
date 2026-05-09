import html2canvas from 'html2canvas';
import { createIcons, Zap, Check, Redo, Download, Wand2, Calendar } from 'lucide';

let parsedData: any = null;
let currentTheme = localStorage.getItem('rpsa_theme') || 'dark-pro';

const RANK_POINTS: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4th', 5: '5th' };
const MEDAL_EMOJI = ['🏆', '🥈', '🥉'];

export function renderTopPerformer() {
  return `
    <div class="space-y-12 animate-fade-in pb-20">
      <header class="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2 h-2 rounded-full bg-neon-amber animate-pulse shadow-[0_0_8px_#F59E0B]"></div>
            <p class="text-neon-amber text-[10px] font-black uppercase tracking-[0.3em]">Performance Profile</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter uppercase italic">The Top Performer</h1>
        </div>
      </header>

      <div id="tp-input-section" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="space-y-6">
          <div class="glass-card p-8 rounded-3xl border-white/5">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-10 h-10 rounded-2xl bg-neon-amber/10 flex items-center justify-center">
                <i data-lucide="wand-2" class="w-5 h-5 text-neon-amber"></i>
              </div>
              <div>
                <h3 class="text-white text-[10px] font-black uppercase tracking-widest">Entry Parser</h3>
                <p class="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Paste weekly results below</p>
              </div>
            </div>

            <textarea 
              id="tp-smart-input" 
              placeholder="Paste raw weekly list...&#10;&#10;Format:&#10;🥇 Top 1: @Name&#10;📅 তারিখ:08-02-26" 
              class="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-mono text-gray-300 focus:border-neon-amber outline-none transition-all scrollbar-hide resize-none"
            ></textarea>

            <div class="grid grid-cols-3 gap-4 mt-6">
              <button id="tp-parse-btn" class="col-span-2 py-4 bg-neon-amber text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_20px_#F59E0B] transition-all transform active:scale-95 flex items-center justify-center gap-2">
                <i data-lucide="zap" class="w-4 h-4"></i>
                Parse & Preview
              </button>
              <button id="tp-clear-btn" class="py-4 bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/20 transition-all transform active:scale-95">
                Clear
              </button>
            </div>
            
            <button id="tp-confirm-btn" class="hidden w-full mt-4 py-4 bg-neon-green text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_20px_#10B981] transition-all transform active:scale-95 flex items-center justify-center gap-2">
              <i data-lucide="check" class="w-4 h-4"></i>
              Confirm & Generate
            </button>
          </div>
        </div>

        <div id="tp-preview-pane" class="hidden lg:block">
          <div class="glass-card p-8 rounded-3xl border-white/5 h-full">
            <h3 class="text-white text-[10px] font-black uppercase tracking-widest mb-6 border-l-2 border-neon-cyan pl-4">Cycle Preview</h3>
            <div id="tp-preview-content" class="space-y-4 max-h-[500px] overflow-y-auto scrollbar-hide pr-2 text-xs">
               <p class="text-gray-600 italic">No data parsed yet.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="tp-result-section" class="hidden space-y-12 animate-fade-in">
        <div class="flex flex-wrap gap-4 items-center justify-between">
           <div id="tp-week-info" class="px-6 py-3 bg-neon-amber/10 border border-neon-amber/20 rounded-2xl flex items-center gap-3">
              <i data-lucide="calendar" class="w-4 h-4 text-neon-amber"></i>
              <span id="tp-week-label" class="text-[10px] font-black text-neon-amber uppercase tracking-widest"></span>
           </div>
           
           <div class="flex flex-wrap bg-white/5 p-1 rounded-xl border border-white/10">
              <button data-tp-theme="dark-pro" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'dark-pro' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#1a1a2e] to-neon-amber"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Dark Pro</span>
              </button>
              <button data-tp-theme="ocean" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'ocean' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#0f2027] to-neon-blue"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Ocean</span>
              </button>
              <button data-tp-theme="sunset" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'sunset' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#f7971e] to-neon-red"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Sunset</span>
              </button>
              <button data-tp-theme="forest" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'forest' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#134e5e] to-neon-green"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Forest</span>
              </button>
              <button data-tp-theme="royal" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'royal' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#360033] to-[#c471ed]"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Royal</span>
              </button>
              <button data-tp-theme="minimal" class="tp-theme-btn px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${currentTheme === 'minimal' ? 'bg-white/10' : ''}">
                <div class="w-3 h-3 rounded-full bg-gradient-to-br from-[#ffffff] to-[#999999] border border-white/20"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Minimal</span>
              </button>
           </div>
        </div>

        <div class="grid grid-cols-1 gap-12">
          <div class="space-y-4">
             <div class="flex justify-between items-center">
                <h3 class="text-white text-[10px] font-black uppercase tracking-widest border-l-2 border-neon-amber pl-4">Rank Leaderboard</h3>
                <button id="tp-save-rank" class="btn-tp-action text-neon-amber hover:text-white transition-colors">
                  <i data-lucide="download" class="w-5 h-5"></i>
                </button>
             </div>
             <div id="tp-rank-table-container" class="rounded-3xl overflow-hidden shadow-2xl border border-white/5 font-['Baloo_Da_2',_Poppins,_sans-serif]">
                <div id="tp-rank-brand" class="p-3 text-center text-[7px] font-black uppercase tracking-[0.3em] font-mono"></div>
                <table id="tp-rank-table" class="w-full text-center border-collapse">
                   <thead>
                      <tr class="bg-black/40 text-white text-[8px] font-black uppercase tracking-widest">
                         <th class="p-4 w-20">Rank</th>
                         <th class="p-4 text-left">Participant</th>
                         <th class="p-4 w-32">Points</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-white/5"></tbody>
                </table>
             </div>
          </div>

          <div class="space-y-4">
             <div class="flex justify-between items-center">
                <h3 class="text-white text-[10px] font-black uppercase tracking-widest border-l-2 border-neon-blue pl-4">Cycle Detailed Report</h3>
                <button id="tp-save-detail" class="btn-tp-action text-neon-blue hover:text-white transition-colors">
                  <i data-lucide="download" class="w-5 h-5"></i>
                </button>
             </div>
             <div id="tp-detail-table-container" class="rounded-3xl overflow-x-auto shadow-2xl border border-white/5 bg-black/40 font-['Baloo_Da_2',_Poppins,_sans-serif]">
                <div id="tp-detail-brand" class="p-3 text-center text-[7px] font-black uppercase tracking-[0.3em] font-mono"></div>
                <table id="tp-detail-table" class="w-full text-center border-collapse text-[9px]">
                   <thead>
                      <tr id="tp-detail-head" class="bg-black/60 text-white font-black uppercase tracking-widest">
                         <th class="p-3 w-10">#</th>
                         <th class="p-3 text-left min-w-[150px]">Identity</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-white/5"></tbody>
                </table>
             </div>
          </div>
        </div>

        <div class="flex justify-center pt-8 border-t border-white/5">
           <button id="tp-reset-btn" class="px-8 py-4 bg-neon-red/10 border border-neon-red/20 text-neon-red font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-neon-red hover:text-white transition-all transform active:scale-95 flex items-center gap-3">
              <i data-lucide="redo" class="w-4 h-4"></i>
              New Cycle
           </button>
        </div>
      </div>
    </div>
    
    <style>
      .tp-theme-dark-pro { background: #1e1e3f; }
      .tp-theme-dark-pro .table-brand { background: #13132b; color: #a89fff; border-bottom: 2px solid #2a2a4a; }
      .tp-theme-dark-pro th { background: #6C63FF; color: white; }
      .tp-theme-dark-pro tr { background: #2a2a4a; color: #e9e9f3; }
      .tp-theme-dark-pro tr:nth-child(even) { background: #222244; }
      
      .tp-theme-ocean { background: #0c1e3c; }
      .tp-theme-ocean .table-brand { background: #071525; color: #64b5f6; border-bottom: 2px solid #1c3a60; }
      .tp-theme-ocean th { background: linear-gradient(to right, #1565c0, #0288d1); color: white; }
      .tp-theme-ocean tr { background: #132845; color: #e3f2fd; }
      .tp-theme-ocean tr:nth-child(even) { background: #0e2035; }
      
      .tp-theme-sunset { background: #2d0a00; }
      .tp-theme-sunset .table-brand { background: #1a0600; color: #ffab76; border-bottom: 2px solid #5a2010; }
      .tp-theme-sunset th { background: linear-gradient(to right, #e74c3c, #f39c12); color: white; }
      .tp-theme-sunset tr { background: #3d1408; color: #fff3e0; }
      .tp-theme-sunset tr:nth-child(even) { background: #2d0e04; }

      .tp-theme-forest { background: #0a2010; }
      .tp-theme-forest .table-brand { background: #061508; color: #80cbc4; border-bottom: 2px solid #1a4a24; }
      .tp-theme-forest th { background: linear-gradient(to right, #1b5e20, #00796b); color: white; }
      .tp-theme-forest tr { background: #0d2e16; color: #e8f5e9; }
      .tp-theme-forest tr:nth-child(even) { background: #0a2010; }

      .tp-theme-royal { background: #1a0028; }
      .tp-theme-royal .table-brand { background: #0d0018; color: #ce93d8; border-bottom: 2px solid #3a0058; }
      .tp-theme-royal th { background: linear-gradient(to right, #6a1b9a, #c2185b); color: white; }
      .tp-theme-royal tr { background: #250038; color: #f3e5f5; }
      .tp-theme-royal tr:nth-child(even) { background: #1a0028; }

      .tp-theme-minimal { background: #ffffff; }
      .tp-theme-minimal .table-brand { background: #f5f5f5; color: #555; border-bottom: 2px solid #eee; }
      .tp-theme-minimal th { background: #333333; color: white; }
      .tp-theme-minimal tr { background: #ffffff; color: #222222; }
      .tp-theme-minimal tr:nth-child(even) { background: #f9f9f9; }
      
      .tp-gold-row { background: linear-gradient(to right, #3b1f05, #7c4a00) !important; color: white !important; }
      
      #tp-rank-table-container, #tp-detail-table-container {
        font-family: 'Baloo Da 2', 'Poppins', sans-serif !important;
      }

      #tp-rank-table-container .table-brand, #tp-detail-table-container .table-brand {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
        padding: 12px;
      }
    </style>
  `;
}

export function initializeTopPerformer(onRender: () => void) {
  const pasteInput = document.getElementById('tp-smart-input') as HTMLTextAreaElement;
  const parseBtn = document.getElementById('tp-parse-btn');
  const confirmBtn = document.getElementById('tp-confirm-btn');
  const clearBtn = document.getElementById('tp-clear-btn');
  const resetBtn = document.getElementById('tp-reset-btn');
  const themeBtns = document.querySelectorAll('[data-tp-theme]');
  const saveRankBtn = document.getElementById('tp-save-rank');
  const saveDetailBtn = document.getElementById('tp-save-detail');

  createIcons({ icons: { Zap, Check, Redo, Download, Wand2, Calendar } });

  applyTheme(currentTheme);

  parseBtn?.addEventListener('click', () => {
    const text = pasteInput.value.trim();
    if (!text) return showAlert('Input required to initialize parser');

    const result = parseWeeklyText(text);
    if (!result || result.participants.size === 0) {
      updatePreview(null);
      confirmBtn?.classList.add('hidden');
      return showAlert('No valid entries detected in packet');
    }

    parsedData = result;
    updatePreview(result);
    confirmBtn?.classList.remove('hidden');
  });

  confirmBtn?.addEventListener('click', () => {
    if (!parsedData) return;
    executeGeneration(parsedData);
  });

  clearBtn?.addEventListener('click', () => {
    pasteInput.value = '';
    parsedData = null;
    confirmBtn?.classList.add('hidden');
    updatePreview(null);
  });

  resetBtn?.addEventListener('click', () => {
    if (confirm('Initiate new operation cycle? Current data will be lost.')) {
      parsedData = null;
      document.getElementById('tp-input-section')?.classList.remove('hidden');
      document.getElementById('tp-result-section')?.classList.add('hidden');
      pasteInput.value = '';
      confirmBtn?.classList.add('hidden');
      updatePreview(null);
    }
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = (e.currentTarget as HTMLButtonElement).dataset.tpTheme;
      if (theme) applyTheme(theme);
    });
  });

  saveRankBtn?.addEventListener('click', () => {
    saveAsImage('tp-rank-table-container', `TP_Rank_${currentTheme}.png`);
  });

  saveDetailBtn?.addEventListener('click', () => {
    saveAsImage('tp-detail-table-container', `TP_Detail_${currentTheme}.png`);
  });
}

function parseWeeklyText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let weekLabel = '';
  const weekMatch = text.match(/(\d+\s*(?:st|nd|rd|th)?\s*[Ww]eek|সপ্তাহ\s*[:\-]?\s*\d+)/i);
  if (weekMatch) weekLabel = weekMatch[0].trim();

  const days: any[] = [];
  let currentDay: any = null;

  const datePat = /তারিখ\s*[:\-]?\s*([\d\-\/]+)\s*(?:\(([^)]+)\))?/;
  const rankPat = /(?:top\s*)?(\d)\s*(?:st|nd|rd|th)?\s*[:\-]\s*@?\s*(.+)/i;

  for (const line of lines) {
    const dateM = line.match(datePat);
    if (dateM) {
      currentDay = {
        label: dateM[1] + (dateM[2] ? ` (${dateM[2]})` : ''),
        names: [],
        skipped: false,
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) continue;

    const rankM = line.match(rankPat);
    if (rankM) {
      const rankNum = parseInt(rankM[1]);
      if (rankNum >= 1 && rankNum <= 5) {
        const name = rankM[2].replace(/^@/, '').trim();
        if (name) currentDay.names[rankNum - 1] = name;
      }
    }
  }

  days.forEach(d => {
    if (d.names.filter(Boolean).length === 0) d.skipped = true;
  });

  const participantsSet = new Set<string>();
  days.forEach(d => d.names.forEach((n: string) => n && participantsSet.add(n)));

  return participantsSet.size === 0 ? null : { weekLabel, days, participants: participantsSet };
}

function updatePreview(data: any) {
  const container = document.getElementById('tp-preview-pane');
  const content = document.getElementById('tp-preview-content');
  if (!container || !content) return;

  if (!data) {
    container.classList.add('hidden');
    content.innerHTML = '<p class="text-gray-600 italic">No data parsed yet.</p>';
    return;
  }

  container.classList.remove('hidden');
  let html = '';
  
  setTimeout(() => createIcons({ icons: { Check } }), 0);

  if (data.weekLabel) {
    html += `<p class="text-neon-amber font-black mb-4">BATCH ID: ${data.weekLabel}</p>`;
  }

  data.days.forEach((day: any) => {
    html += `
      <div class="bg-white/5 p-4 rounded-xl border-l-2 border-neon-amber mb-3">
        <p class="text-[10px] font-black text-gray-400 mb-2">${day.label}</p>
        <div class="flex flex-wrap gap-2">
          ${day.names.map((n: string, i: number) => n ? `<span class="bg-white/5 px-2 py-1 rounded text-[8px] font-bold text-white">${RANK_EMOJI[i+1]} ${n}</span>` : '').join('')}
        </div>
        ${day.skipped ? '<p class="text-[8px] text-neon-red font-bold italic mt-1">EMPTY PACKET DETECTED</p>' : ''}
      </div>
    `;
  });

  content.innerHTML = html;
}

function executeGeneration(data: any) {
  const pData: Record<string, any> = {};
  data.participants.forEach((name: string) => {
    pData[name] = { totalPoints: 0, rankCounts: {1:0,2:0,3:0,4:0,5:0}, dayResults: {} };
  });

  data.days.forEach((day: any, dIdx: number) => {
    day.names.forEach((name: string, nIdx: number) => {
      if (!name || !pData[name]) return;
      const rank = nIdx + 1;
      pData[name].totalPoints += RANK_POINTS[rank];
      pData[name].rankCounts[rank]++;
      pData[name].dayResults[dIdx] = rank;
    });
  });

  const sorted = [...data.participants]
    .map(name => ({ name, ...pData[name] }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const activeDays = data.days.filter((d: any) => !d.skipped);
  const wLabel = data.weekLabel || `${activeDays.length} Day Operation`;
  
  const labelEl = document.getElementById('tp-week-label');
  if (labelEl) labelEl.textContent = `${wLabel} CYCLE`;

  const brand1 = document.getElementById('tp-rank-brand');
  const brand2 = document.getElementById('tp-detail-brand');
  if (brand1) brand1.textContent = data.weekLabel ? `🏆 THE TOP PERFORMER — ${data.weekLabel}` : `🏆 THE TOP PERFORMER`;
  if (brand2) brand2.textContent = data.weekLabel ? `📊 WEEKLY PERFORMANCE DETAIL — ${data.weekLabel}` : `📊 WEEKLY PERFORMANCE DETAIL`;

  renderTables(sorted, data.days);

  createIcons({ icons: { Download, Redo } });

  document.getElementById('tp-input-section')?.classList.add('hidden');
  document.getElementById('tp-result-section')?.classList.remove('hidden');
}

function renderTables(sorted: any[], days: any[]) {
  // Rank Table
  const tbody = document.querySelector('#tp-rank-table tbody');
  if (tbody) {
    tbody.innerHTML = sorted.map((item, idx) => `
      <tr class="${idx === 0 ? 'tp-gold-row' : ''} border-b border-white/5 last:border-0">
        <td class="p-4 text-center font-black ${idx === 0 ? 'text-2xl' : 'text-xl'} ${idx === 0 ? 'text-white' : 'text-neon-amber'}">${idx < 3 ? MEDAL_EMOJI[idx] : `#${idx + 1}`}</td>
        <td class="p-4 text-left font-bold ${idx === 0 ? 'text-xl' : 'text-lg'} text-white">${item.name}</td>
        <td class="p-4 text-center font-black ${idx === 0 ? 'text-2xl' : 'text-xl'} ${idx === 0 ? 'text-white' : 'text-neon-amber'}">${item.totalPoints}</td>
      </tr>
    `).join('');
  }

  // Detail Table
  const dHead = document.getElementById('tp-detail-head');
  const activeDays = days.filter(d => !d.skipped);
  
  if (dHead) {
    dHead.innerHTML = `
      <th class="p-3 text-center border-b border-white/10">#</th>
      <th class="p-3 text-left border-b border-white/10">Identity</th>
      ${activeDays.map(d => `<th class="p-3 text-center border-b border-white/10 min-w-[60px]">${d.label.split('(')[1]?.replace(')','') || d.label}</th>`).join('')}
      ${[RANK_EMOJI[1], RANK_EMOJI[2], RANK_EMOJI[3], '4th', '5th'].map(e => `<th class="p-3 text-center border-b border-white/10 w-12">${e}</th>`).join('')}
      <th class="p-3 text-center border-b border-white/10 w-20">Total</th>
    `;
  }

  const dTbody = document.querySelector('#tp-detail-table tbody');
  if (dTbody) {
    dTbody.innerHTML = sorted.map((item, idx) => `
      <tr class="${idx === 0 ? 'tp-gold-row' : ''} border-b border-white/5 last:border-0">
        <td class="p-3 text-center font-bold">${idx < 3 ? MEDAL_EMOJI[idx] : idx+1}</td>
        <td class="p-3 text-left font-bold">${item.name}</td>
        ${activeDays.map(day => {
          const rank = item.dayResults[days.indexOf(day)];
          return `<td class="p-3 text-center font-bold opacity-80">${rank ? RANK_EMOJI[rank] : '—'}</td>`;
        }).join('')}
        ${[1, 2, 3, 4, 5].map(r => `<td class="p-3 text-center opacity-70">${item.rankCounts[r] || 0}</td>`).join('')}
        <td class="p-3 text-center font-black text-neon-amber text-lg">${item.totalPoints}</td>
      </tr>
    `).join('');
  }
}

function applyTheme(theme: string) {
  currentTheme = theme;
  localStorage.setItem('rpsa_theme', theme);
  const container1 = document.getElementById('tp-rank-table-container');
  const container2 = document.getElementById('tp-detail-table-container');
  if (!container1 || !container2) return;

  const themes = ['tp-theme-dark-pro', 'tp-theme-ocean', 'tp-theme-sunset', 'tp-theme-forest', 'tp-theme-royal', 'tp-theme-minimal'];
  themes.forEach(t => {
    container1.classList.remove(t);
    container2.classList.remove(t);
  });
  
  container1.classList.add(`tp-theme-${theme}`);
  container2.classList.add(`tp-theme-${theme}`);

  document.querySelectorAll('.tp-theme-btn').forEach(btn => {
    const isMatched = (btn as HTMLButtonElement).dataset.tpTheme === theme;
    btn.classList.toggle('bg-white/10', isMatched);
  });
}

async function saveAsImage(id: string, filename: string) {
  const el = document.getElementById(id);
  if (!el) return;
  
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0D0D20',
      logging: false
    });
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
    showAlert('System dump completed');
  } catch (err) {
    showAlert('Dump failed: External interference detected');
  }
}

function showAlert(msg: string) {
  const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-neon-amber text-black px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest animate-in fade-in slide-in-from-bottom-5 z-[5000] shadow-[0_0_20px_rgba(245,158,11,0.4)]';
    toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-5');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
