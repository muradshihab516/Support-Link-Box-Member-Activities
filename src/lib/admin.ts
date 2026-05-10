import { noticeBoxSupabase as supabase } from './supabase';
import { ADMIN_NAMES } from './utils';

let adminTab: 'submit' | 'active' | 'history' = 'submit';
let reports: any[] = [];
let formType: 'single' | 'multi' = 'single';

const IMGBB_API_KEY = "18269b500c7f745cd899da9cdad1bc50";

export function renderAdminPanel(userEmail: string | undefined) {
  const adminName = userEmail ? ADMIN_NAMES[userEmail] : null;

  if (!adminName) {
    return `
      <div class="p-20 text-center">
        <div class="w-20 h-20 bg-neon-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <i data-lucide="shield-alert" class="w-10 h-10 text-neon-red"></i>
        </div>
        <h2 class="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Access Denied</h2>
        <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Unauthorized personnel detected.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-12 animate-fade-in pb-20">
      <div class="flex items-center gap-3">
        <button onclick="navigateTo('dashboard')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all group">
          <i data-lucide="chevron-left" class="w-3 h-3 group-hover:-translate-x-1 transition-transform"></i>
          Back
        </button>
      </div>

      <header class="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-2 h-2 rounded-full bg-neon-purple animate-pulse shadow-[0_0_8px_#A855F7]"></div>
            <p class="text-neon-purple text-[10px] font-black uppercase tracking-[0.3em]">Command Oversight</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter uppercase italic">Notice Box</h1>
        </div>

        <div class="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            data-admin-tab="submit"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'submit' ? 'bg-neon-purple text-white shadow-[0_0_15px_#A855F7]' : 'text-gray-500 hover:text-gray-300'}"
          >
            Submit
          </button>
          <button 
            data-admin-tab="active"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'active' ? 'bg-neon-purple text-white shadow-[0_0_15px_#A855F7]' : 'text-gray-500 hover:text-gray-300'}"
          >
            Active <span id="active-badge" class="ml-2 px-1.5 py-0.5 bg-neon-red text-white rounded-full text-[8px] ${reports.filter(r => !r.dismissed).length === 0 ? 'hidden' : ''}">${reports.filter(r => !r.dismissed).length}</span>
          </button>
          <button 
            data-admin-tab="history"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'history' ? 'bg-neon-purple text-white shadow-[0_0_15px_#A855F7]' : 'text-gray-500 hover:text-gray-300'}"
          >
            History
          </button>
        </div>
      </header>

      ${adminTab === 'submit' ? renderSubmitForm() : renderReportsList()}
    </div>
  `;
}

function renderSubmitForm() {
  return `
    <div class="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div class="glass-card p-8 rounded-3xl border-white/5">
        <div class="flex gap-4 mb-8">
          <button data-form-type="single" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formType === 'single' ? 'bg-white/10 text-white border-white/10' : 'text-gray-600 hover:text-gray-400'} border border-transparent">Single Report</button>
          <button data-form-type="multi" class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formType === 'multi' ? 'bg-white/10 text-white border-white/10' : 'text-gray-600 hover:text-gray-400'} border border-transparent">Multi Upload</button>
        </div>

        <div id="admin-form-container" class="space-y-6">
          ${formType === 'single' ? `
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Protocol Date</label>
                  <input type="datetime-local" id="report-date" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-white outline-none focus:border-neon-purple transition-all">
                </div>
                <div class="space-y-1">
                  <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Member Name</label>
                  <input type="text" id="report-name" placeholder="Name or @handle" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-white outline-none focus:border-neon-purple transition-all">
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Violation Type</label>
                <select id="report-reason" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-bold text-white outline-none focus:border-neon-purple appearance-none">
                  <option value="" class="bg-gray-900">Select Reason...</option>
                  <option value="Support incomplete" class="bg-gray-900">Support incomplete</option>
                  <option value="Support Gap" class="bg-gray-900">Support Gap</option>
                  <option value="Sticker / Emoji / NC" class="bg-gray-900">Sticker / Emoji / NC</option>
                  <option value="18+/Political post" class="bg-gray-900">18+/Political post</option>
                  <option value="Others" class="bg-gray-900">Others</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Evidence / Logs</label>
                <textarea id="report-desc" placeholder="Operational details..." class="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-gray-300 outline-none focus:border-neon-purple resize-none"></textarea>
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Proof Upload</label>
                <div class="relative group">
                  <input type="file" id="report-file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                  <div class="w-full bg-white/5 border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center group-hover:border-neon-purple transition-all">
                    <i data-lucide="cloud-upload" class="w-6 h-6 text-gray-600 mb-2 group-hover:text-neon-purple"></i>
                    <p class="text-[8px] font-black text-gray-500 uppercase tracking-widest">Select Evidence Image</p>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <div class="space-y-4">
              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Protocol Date</label>
                <input type="datetime-local" id="report-date" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-white outline-none focus:border-neon-purple transition-all">
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Violation Type</label>
                <select id="report-reason" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-bold text-white outline-none focus:border-neon-purple appearance-none">
                  <option value="" class="bg-gray-900">Multiple Reason...</option>
                  <option value="Support Incomplete" class="bg-gray-900">Support Incomplete</option>
                  <option value="Support Gap" class="bg-gray-900">Support Gap</option>
                  <option value="Sticker / Emoji / NC" class="bg-gray-900">Sticker / Emoji / NC</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Batch Identity Feed</label>
                <textarea id="report-list" placeholder="Paste full list with @usernames..." class="w-full h-60 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-gray-300 outline-none focus:border-neon-purple resize-none"></textarea>
              </div>

              <div class="space-y-1">
                <label class="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Batch Description</label>
                <textarea id="report-desc" placeholder="Common details for all entries..." class="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-gray-300 outline-none focus:border-neon-purple resize-none"></textarea>
              </div>
            </div>
          `}

          <button id="submit-report-btn" class="w-full py-4 bg-neon-purple text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-3 group active:scale-95">
            <span>Execute Protocol</span>
            <i data-lucide="zap" class="w-4 h-4 group-hover:animate-pulse"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderReportsList() {
  const filtered = reports.filter(r => adminTab === 'active' ? !r.dismissed : r.dismissed);
  
  return `
    <div class="space-y-8 animate-fade-in">
      <div class="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
        <div class="relative flex-1 w-full">
           <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"></i>
           <input type="text" id="report-search" placeholder="Filter by name..." class="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-[10px] font-mono text-white outline-none focus:border-neon-purple">
        </div>
        <p class="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total: ${filtered.length} Entries</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="reports-grid">
        ${filtered.length === 0 ? `
          <div class="col-span-full py-20 text-center">
             <i data-lucide="box" class="w-12 h-12 text-gray-800 mx-auto mb-4"></i>
             <p class="text-[10px] font-black uppercase text-gray-700 tracking-widest">No entries in this sector</p>
          </div>
        ` : filtered.map(r => renderReportCard(r)).join('')}
      </div>
    </div>
  `;
}

function renderReportCard(r: any) {
  const date = new Date(r.created_at).toLocaleString('bn-BD', { hour12: true });
  
  return `
    <div class="glass-card flex flex-col rounded-3xl border-white/5 overflow-hidden group hover:border-white/10 transition-all">
      <div class="p-6 space-y-4">
        <div class="flex justify-between items-start gap-4">
          <h4 class="text-white text-sm font-black uppercase italic tracking-tighter leading-tight flex-1 break-words">${r.name}</h4>
          <span class="px-2 py-0.5 bg-neon-purple text-white text-[7px] font-black rounded uppercase tracking-widest shrink-0">${r.reason}</span>
        </div>

        <div class="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
          ${r.link_number ? `
            <div class="${r.link_number.includes('সাপোর্ট গ্যাপ') ? 'text-neon-red bg-neon-red/10 border-neon-red/20' : 'text-neon-amber bg-neon-amber/10 border-neon-amber/20'} border px-3 py-2 rounded-lg text-[9px] font-bold">
              ${r.link_number}
            </div>
          ` : ''}
          
          ${r.description ? `<p class="text-[9px] text-gray-400 italic">"${r.description}"</p>` : ''}
          
          <div class="flex flex-col gap-1 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
            <span class="flex items-center gap-1.5"><i data-lucide="user" class="w-3 h-3"></i> ${r.admin_name}</span>
            <span class="flex items-center gap-1.5"><i data-lucide="calendar" class="w-3 h-3"></i> ${date}</span>
          </div>

          ${r.screenshots && r.screenshots.length > 0 ? `
            <div class="mt-4 relative group/img overflow-hidden rounded-lg border border-white/5 cursor-zoom-in">
              <img src="${r.screenshots[0]}" class="w-full h-32 object-cover transition-transform group-hover/img:scale-110" onclick="window.open('${r.screenshots[0]}', '_blank')">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <i data-lucide="maximize-2" class="w-5 h-5 text-white"></i>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="mt-auto p-4 flex gap-2 border-t border-white/5 bg-white/5">
        <button class="flex-1 py-2 rounded-lg text-[9px] font-black uppercase bg-black hover:bg-neon-purple transition-colors text-white ${adminTab === 'history' ? 'text-neon-green/80' : ''}" onclick="window.updateReportStatus(${r.id}, ${!r.dismissed})">
          ${adminTab === 'history' ? 'Restore' : 'Dismiss'}
        </button>
        <button class="w-10 h-10 flex items-center justify-center rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red hover:text-white transition-all" onclick="window.deleteReport(${r.id})">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
}

export async function initializeAdminPanel(onRender: () => void) {
  // Tab Switching
  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      adminTab = (e.currentTarget as HTMLButtonElement).dataset.adminTab as any;
      onRender();
    });
  });

  if (adminTab === 'submit') {
    setupSubmitLogic();
  } else {
    setupListLogic(onRender);
  }

  // Load reports every time we enter the admin panel to ensure data is fresh
  loadReports(onRender);
}

async function loadReports(onRender: () => void) {
  const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  reports = data || [];
  onRender();
}

function setupSubmitLogic() {
  const dateInput = document.getElementById('report-date') as HTMLInputElement;
  if (dateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);
  }

  document.querySelectorAll('[data-form-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      formType = (e.currentTarget as HTMLButtonElement).dataset.formType as any;
      const onRender = (window as any).refreshApp;
      if (onRender) onRender();
    });
  });

  const submitBtn = document.getElementById('submit-report-btn');
  submitBtn?.addEventListener('click', handleReportSubmission);
}

async function handleReportSubmission() {
  const date = (document.getElementById('report-date') as HTMLInputElement).value;
  const reason = (document.getElementById('report-reason') as HTMLSelectElement).value;
  const desc = (document.getElementById('report-desc') as HTMLTextAreaElement).value;
  const adminName = (window as any).currentUserAdminName || 'Admin';

  if (!reason) {
    showToast('Violation Type Required', 'error');
    return;
  }

  const btn = document.getElementById('submit-report-btn');
  if (btn) (btn as HTMLButtonElement).disabled = true;

  try {
    if (formType === 'single') {
      const name = (document.getElementById('report-name') as HTMLInputElement).value;
      if (!name) throw new Error('Member Name required');
      
      const fileInput = document.getElementById('report-file') as HTMLInputElement;
      let screenshots: string[] = [];
      
      if (fileInput.files?.length) {
        showToast('Encrypting Proof...', 'info');
        const fd = new FormData();
        fd.append("image", fileInput.files[0]);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.success) screenshots = [d.data.url];
      }

      const { error } = await supabase.from('reports').insert({
        name, reason, description: desc,
        screenshots, admin_name: adminName,
        created_at: new Date(date).toISOString()
      });

      if (error) throw error;
      showToast('Protocol Executed Successfully');
      await loadReports((window as any).refreshApp || (() => {}));
    } else {
      const listText = (document.getElementById('report-list') as HTMLTextAreaElement).value;
      if (!listText) throw new Error('List required');
      
      const lines = listText.split('\n');
      const rows: any[] = [];
      
      lines.forEach(line => {
        const nameMatch = line.match(/@(.+?)(?=📌|সাপোর্ট গ্যাপ|$)/);
        if (nameMatch) {
          const mName = nameMatch[1].trim();
          const extraInfo = line.split(mName)[1]?.trim() || "";
          rows.push({
            name: mName, reason: reason, description: desc,
            admin_name: adminName, link_number: extraInfo, 
            created_at: new Date(date).toISOString()
          });
        }
      });

      if (!rows.length) throw new Error('No @handles detected');
      
      const { error } = await supabase.from('reports').insert(rows);
      if (error) throw error;
      showToast(`${rows.length} Protocols Logged`);
      await loadReports((window as any).refreshApp || (() => {}));
    }

    // Refresh and sync
    if ((window as any).refreshApp) (window as any).refreshApp();
  } catch (err: any) {
    showToast(err.message, 'error');
  } finally {
    if (btn) (btn as HTMLButtonElement).disabled = false;
  }
}

function setupListLogic(onRender: () => void) {
  const searchInput = document.getElementById('report-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => onRender());

  (window as any).updateReportStatus = async (id: number, status: boolean) => {
    const { error } = await supabase.from('reports').update({ dismissed: status }).eq('id', id);
    if (!error) loadReports(onRender);
  };

  (window as any).deleteReport = async (id: number) => {
    if (confirm('Permanently redact this record?')) {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (!error) loadReports(onRender);
    }
  };
}

function showToast(msg: string, type: 'info' | 'error' = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-10 left-1/2 -translate-x-1/2 ${type === 'error' ? 'bg-neon-red' : 'bg-neon-purple'} text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest animate-in fade-in slide-in-from-bottom-5 z-[5000] shadow-[0_0_20px_rgba(168,85,247,0.4)]`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-5');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
