import { createIcons, ClipboardCopy, Check, Trash2, List, Search, Layers } from 'lucide';

let listGeneratorTab: 'support' | 'gap' = 'support';

export function renderListGenerator() {
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
            <div class="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00F5FF]"></div>
            <p class="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em]">Support Management</p>
          </div>
          <h1 class="text-5xl font-black italic tracking-tighter uppercase italic">Tool Center</h1>
        </div>

        <div class="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            data-list-tab="support"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${listGeneratorTab === 'support' ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00F5FF]' : 'text-gray-500 hover:text-gray-300'}"
          >
            Support List
          </button>
          <button 
            data-list-tab="gap"
            class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${listGeneratorTab === 'gap' ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00F5FF]' : 'text-gray-500 hover:text-gray-300'}"
          >
            Gap Checker
          </button>
        </div>
      </header>

      ${listGeneratorTab === 'support' ? renderSupportGenerator() : renderGapFinder()}
    </div>
  `;
}

function renderSupportGenerator() {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="space-y-6">
        <div class="glass-card p-8 rounded-3xl border-white/5">
          <h3 class="text-white text-[10px] font-black uppercase tracking-widest mb-6 border-l-2 border-neon-cyan pl-4">Paste Raw List</h3>
          <textarea 
            id="list-input" 
            placeholder="লিস্ট এখানে পেস্ট করুন...&#10;&#10;উদাহরণ:&#10;1️⃣➤Name ✅&#10;2️⃣➤Name" 
            class="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-mono text-gray-300 focus:border-neon-cyan outline-none transition-all scrollbar-hide resize-none"
          ></textarea>
          <button id="process-list-btn" class="w-full mt-6 py-4 bg-neon-cyan text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_20px_#00F5FF] transition-all transform active:scale-95">
            Generate List
          </button>
        </div>

        <div id="duplicate-alert" class="hidden glass-card p-6 rounded-2xl border-neon-red/30 bg-neon-red/5">
          <div class="flex items-center gap-3 mb-4">
            <i data-lucide="alert-triangle" class="w-5 h-5 text-neon-red animate-pulse"></i>
            <h4 class="text-neon-red text-[10px] font-black uppercase tracking-widest">Duplication Detected</h4>
            <span id="dup-count" class="ml-auto px-2 py-0.5 bg-neon-red text-white text-[8px] font-black rounded-full">0</span>
          </div>
          <div id="dup-details" class="space-y-3 max-h-40 overflow-y-auto scrollbar-hide"></div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="list-stats">
          <div class="glass-card p-4 rounded-xl border-white/5 text-center">
            <p id="stat-total" class="text-xl font-black italic text-neon-cyan">0</p>
            <p class="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Total</p>
          </div>
          <div class="glass-card p-4 rounded-xl border-white/5 text-center">
            <p id="stat-done" class="text-xl font-black italic text-neon-green">0</p>
            <p class="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Done</p>
          </div>
          <div class="glass-card p-4 rounded-xl border-white/5 text-center">
            <p id="stat-pending" class="text-xl font-black italic text-neon-red">0</p>
            <p class="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Pending</p>
          </div>
          <div class="glass-card p-4 rounded-xl border-white/5 text-center">
            <p id="stat-nopost" class="text-xl font-black italic text-neon-amber">0</p>
            <p class="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">No Post</p>
          </div>
        </div>

        <div class="glass-card p-8 rounded-3xl border-white/5">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-white text-[10px] font-black uppercase tracking-widest border-l-2 border-neon-green pl-4">All Done List</h3>
            <button id="copy-done-btn" class="p-2 text-gray-500 hover:text-neon-green transition-colors">
              <i data-lucide="clipboard-copy" class="w-4 h-4"></i>
            </button>
          </div>
          <textarea id="done-output" readonly class="w-full h-40 bg-black/40 rounded-2xl p-6 text-[10px] font-mono text-neon-green/80 scrollbar-hide resize-none border border-white/5"></textarea>
        </div>

        <div class="glass-card p-8 rounded-3xl border-white/5">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-white text-[10px] font-black uppercase tracking-widest border-l-2 border-neon-red pl-4">Unsupporter List</h3>
            <button id="copy-fail-btn" class="p-2 text-gray-500 hover:text-neon-red transition-colors">
              <i data-lucide="clipboard-copy" class="w-4 h-4"></i>
            </button>
          </div>
          <textarea id="fail-output" readonly class="w-full h-40 bg-black/40 rounded-2xl p-6 text-[10px] font-mono text-neon-red/80 scrollbar-hide resize-none border border-white/5"></textarea>
        </div>
      </div>
    </div>
  `;
}

function renderGapFinder() {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-1 space-y-6">
        <div class="glass-card p-8 rounded-3xl border-white/5">
          <h3 class="text-white text-[10px] font-black uppercase tracking-widest mb-6 border-l-2 border-neon-purple pl-4">Gap List Finder</h3>
          <textarea 
            id="gap-input" 
            placeholder="গ্যাপ লিস্ট এখানে পেস্ট করুন...&#10;&#10;Link No 1:-&#10;1. Name&#10;2. Name" 
            class="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-mono text-gray-300 focus:border-neon-purple outline-none transition-all scrollbar-hide resize-none"
          ></textarea>
          
          <div class="mt-6 space-y-4">
            <div>
              <label class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">Criticality Threshold</label>
              <input type="number" id="gap-threshold" value="3" min="1" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-black text-white focus:border-neon-purple outline-none transition-all">
            </div>
            <button id="process-gap-btn" class="w-full py-4 bg-neon-purple text-white font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">
              Find Gaps
            </button>
          </div>
        </div>

        <div class="glass-card p-6 rounded-2xl border-white/5">
          <h4 class="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-4">Real-time Metrics</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white/5 p-3 rounded-xl border border-white/5">
              <p id="gap-stat-links" class="text-sm font-black text-white">0</p>
              <p class="text-[7px] text-gray-600 uppercase font-black tracking-tighter">Links Processed</p>
            </div>
            <div class="bg-white/5 p-3 rounded-xl border border-white/5">
              <p id="gap-stat-members" class="text-sm font-black text-white">0</p>
              <p class="text-[7px] text-gray-600 uppercase font-black tracking-tighter">Identity Matches</p>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-8">
         <div id="gap-results-container" class="space-y-6">
            <div class="glass-card p-20 text-center rounded-3xl border-white/5 border-dashed">
              <i data-lucide="search" class="w-12 h-12 text-gray-800 mx-auto mb-4"></i>
              <p class="text-xs font-black uppercase text-gray-700 tracking-widest italic">Awaiting Input Stream</p>
            </div>
         </div>
      </div>
    </div>
  `;
}

export function initializeListGenerator(onRender: () => void) {
  // Tab Switching
  document.querySelectorAll('[data-list-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      listGeneratorTab = (e.currentTarget as HTMLButtonElement).dataset.listTab as 'support' | 'gap';
      onRender();
    });
  });

  if (listGeneratorTab === 'support') {
    setupSupportLogic();
  } else {
    setupGapLogic();
  }
}

function setupSupportLogic() {
  const input = document.getElementById('list-input') as HTMLTextAreaElement;
  const processBtn = document.getElementById('process-list-btn');
  const copyDone = document.getElementById('copy-done-btn');
  const copyFail = document.getElementById('copy-fail-btn');

  processBtn?.addEventListener('click', () => {
    const raw = input.value.trim();
    if (!raw) return;

    const { done, fail, stats, duplicates } = processSupportList(raw);
    
    const doneArea = document.getElementById('done-output') as HTMLTextAreaElement;
    const failArea = document.getElementById('fail-output') as HTMLTextAreaElement;
    
    if (doneArea) doneArea.value = done;
    if (failArea) failArea.value = fail;

    // Update Stats
    if (document.getElementById('stat-total')) (document.getElementById('stat-total') as HTMLElement).textContent = stats.total.toString();
    if (document.getElementById('stat-done')) (document.getElementById('stat-done') as HTMLElement).textContent = stats.done.toString();
    if (document.getElementById('stat-pending')) (document.getElementById('stat-pending') as HTMLElement).textContent = stats.pending.toString();
    if (document.getElementById('stat-nopost')) (document.getElementById('stat-nopost') as HTMLElement).textContent = stats.nopost.toString();

    // Duplicates
    const dupAlert = document.getElementById('duplicate-alert');
    const dupCount = document.getElementById('dup-count');
    const dupDetails = document.getElementById('dup-details');

    if (duplicates.length > 0) {
      dupAlert?.classList.remove('hidden');
      if (dupCount) dupCount.textContent = duplicates.length.toString();
      if (dupDetails) {
        dupDetails.innerHTML = duplicates.map(d => `
          <div class="bg-black/20 p-3 rounded-lg border border-neon-red/10">
            <p class="text-[10px] font-black text-white uppercase">${d.name}</p>
            <p class="text-[8px] text-gray-600 mt-1 uppercase">Appears at positions: ${d.positions.join(', ')}</p>
          </div>
        `).join('');
      }
    } else {
      dupAlert?.classList.add('hidden');
    }
  });

  copyDone?.addEventListener('click', () => {
    const area = document.getElementById('done-output') as HTMLTextAreaElement;
    if (area.value) {
      navigator.clipboard.writeText(area.value);
      const icon = copyDone.querySelector('i');
      if (icon) icon.dataset.lucide = 'check';
      createIcons({ icons: { Check } });
      setTimeout(() => {
        if (icon) icon.dataset.lucide = 'clipboard-copy';
        createIcons({ icons: { ClipboardCopy } });
      }, 2000);
    }
  });

  copyFail?.addEventListener('click', () => {
    const area = document.getElementById('fail-output') as HTMLTextAreaElement;
    if (area.value) {
      navigator.clipboard.writeText(area.value);
      const icon = copyFail.querySelector('i');
      if (icon) icon.dataset.lucide = 'check';
      createIcons({ icons: { Check } });
      setTimeout(() => {
        if (icon) icon.dataset.lucide = 'clipboard-copy';
        createIcons({ icons: { ClipboardCopy } });
      }, 2000);
    }
  });
}

function setupGapLogic() {
  const input = document.getElementById('gap-input') as HTMLTextAreaElement;
  const thresholdInput = document.getElementById('gap-threshold') as HTMLInputElement;
  const processBtn = document.getElementById('process-gap-btn');

  processBtn?.addEventListener('click', () => {
    const raw = input.value.trim();
    if (!raw) return;

    const threshold = parseInt(thresholdInput.value) || 3;
    const { critical, others, stats } = analyzeGaps(raw, threshold);

    // Update Stats
    if (document.getElementById('gap-stat-links')) (document.getElementById('gap-stat-links') as HTMLElement).textContent = stats.links.toString();
    if (document.getElementById('gap-stat-members')) (document.getElementById('gap-stat-members') as HTMLElement).textContent = stats.members.toString();

    const container = document.getElementById('gap-results-container');
    if (!container) return;

    container.innerHTML = `
      <div class="glass-card rounded-3xl border-neon-red/20 overflow-hidden">
        <div class="p-6 bg-neon-red/5 border-b border-white/5 flex justify-between items-center">
          <div>
             <h4 class="text-neon-red text-[10px] font-black uppercase tracking-[0.3em]">Critical Gap List</h4>
             <p class="text-[8px] text-gray-600 mt-1 uppercase font-bold">Members at or above ${threshold} missed posts</p>
          </div>
          <button id="copy-critical-btn" class="px-4 py-2 bg-neon-red text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(248,81,73,0.3)]">
            Copy Notice
          </button>
        </div>
        <div class="p-6 space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
          ${critical.length > 0 ? critical.map((item, i) => `
            <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 group hover:border-neon-red/30 transition-all">
              <span class="text-[10px] font-black italic text-gray-500">${(i + 1).toString().padStart(2, '0')}</span>
              <div class="flex-1">
                <p class="text-[10px] font-black text-white uppercase">${item.name}</p>
                <p class="text-[8px] text-neon-red uppercase font-black mt-1">${item.count} Gaps detected</p>
              </div>
              <p class="text-[7px] text-gray-700 font-mono">LINKS: ${item.links.join(', ')}</p>
            </div>
          `).join('') : '<p class="text-center py-10 text-[10px] uppercase font-black text-gray-700">No Critical Gaps Detected</p>'}
        </div>
      </div>

      <div class="glass-card rounded-3xl border-white/5 overflow-hidden">
        <div class="p-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
          <div>
             <h4 class="text-neon-purple text-[10px] font-black uppercase tracking-[0.3em]">Watchlist</h4>
             <p class="text-[8px] text-gray-600 mt-1 uppercase font-bold">Members with minor gaps (below ${threshold})</p>
          </div>
          <button id="copy-watchlist-btn" class="px-4 py-2 bg-white/5 text-neon-purple text-[8px] font-black uppercase tracking-widest rounded-lg border border-neon-purple/20">
            Copy Watchlist
          </button>
        </div>
        <div class="p-6 space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
           ${others.length > 0 ? others.map((item, i) => `
            <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <span class="text-[10px] font-black italic text-gray-500">${(i + 1).toString().padStart(2, '0')}</span>
              <div class="flex-1">
                <p class="text-[10px] font-black text-white uppercase">${item.name}</p>
              </div>
              <span class="px-2 py-1 bg-neon-purple/10 text-neon-purple text-[7px] font-black rounded uppercase">${item.count} GAPS</span>
            </div>
          `).join('') : '<p class="text-center py-10 text-[10px] uppercase font-black text-gray-700">Watchlist Clear</p>'}
        </div>
      </div>
    `;

    document.getElementById('copy-critical-btn')?.addEventListener('click', () => {
      const header = `.  .  . 🚨 OFFICEIAL NOTICE 🚨 .  .  . \n🚫 KICKED OUT ALERT 🚫\n\nThreshold: ${threshold}+ Missed Posts\n\n`;
      const body = critical.map((item, i) => `${i + 1}. ${item.name} - ${item.count} Gaps (Links: ${item.links.join(', ')})`).join('\n');
      const footer = '\n\nAction: Protocol Removal Initiated.';
      navigator.clipboard.writeText(header + body + footer);
      showToast('Critical Notice Copied');
    });

    document.getElementById('copy-watchlist-btn')?.addEventListener('click', () => {
      const body = others.map((item, i) => `${i + 1}. ${item.name} - ${item.count} Gaps`).join('\n');
      navigator.clipboard.writeText('Watchlist:\n' + body);
      showToast('Watchlist Copied');
    });
  });
}

function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-neon-cyan text-black px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest animate-in fade-in slide-in-from-bottom-5 z-50 shadow-[0_0_20px_#00F5FF]';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-5');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Logic implementations
function processSupportList(raw: string) {
  const lines = raw.split('\n');
  let date = '';
  let day = '';

  for (let line of lines) {
    if (line.includes('তারিখ:')) date = line.split('তারিখ:')[1]?.trim() || '';
    if (line.includes('বার:')) day = line.split('বার:')[1]?.trim() || '';
  }

  const entries: any[] = [];
  lines.forEach(line => {
    line = line.trim();
    if (line.match(/[0-9]️⃣/) || line.match(/^[0-9]+[➤➔→]/)) {
      const posMatch = line.match(/^([0-9]️⃣|[0-9]+)/);
      let pos = posMatch ? (posMatch[0].includes('️⃣') ? parseInt(posMatch[0][0]) : parseInt(posMatch[0])) : entries.length + 1;
      
      const parts = line.split('➤');
      const content = parts.length > 1 ? parts[1].trim() : line;
      const hasCheck = content.includes('✅');
      const isNoPost = content.includes('𝙉𝙤 𝙋𝙤𝙨𝙩') || content.toLowerCase().includes('no post');
      const name = content.replace(/✅/g, '').trim();

      entries.push({ pos, name, hasCheck, isNoPost });
    }
  });

  const getEmoji = (n: number) => n.toString().split('').map(d => '0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣'.substr(parseInt(d) * 3, 3)).join('');

  let doneText = `📅 তারিখ: ${date}\n📆 বার: ${day}\n\nযারা সাপোর্ট করেছেন\n\n👇👇👇\n\n`;
  entries.forEach(e => {
    const num = getEmoji(e.pos);
    if (e.isNoPost) doneText += `${num}➤🅾️𝙉𝙤 𝙋𝙤𝙨𝙩🅾️\n`;
    else if (e.hasCheck) doneText += `${num}➤${e.name}\n`;
    else doneText += `${num}➤@\n`;
  });

  const fails = entries.filter(e => !e.hasCheck && !e.isNoPost);
  let failText = `🌟 সাপোর্ট লিংক বক্স টিম নোটিশ 🌟\n📅 তারিখ: ${date} (${day})\n\n📋 সাপোর্ট বাকি মেম্বার:\n\n`;
  fails.forEach((e, i) => {
    failText += `${getEmoji(i + 1)} ${e.name} 📌/${e.pos}\n`;
  });
  if (fails.length === 0) failText += "🎉 সবাই সাপোর্ট করেছে!";
  else failText += `\n\nAction: Removal Protocol pending.`;

  // Duplicates check
  const nameMap = new Map<string, number[]>();
  entries.forEach(e => {
    if (e.isNoPost) return;
    const clean = e.name.replace(/@/g, '').trim().toLowerCase();
    if (!nameMap.has(clean)) nameMap.set(clean, []);
    nameMap.get(clean)!.push(e.pos);
  });

  const duplicates: any[] = [];
  nameMap.forEach((positions, name) => {
    if (positions.length > 1) {
      duplicates.push({ name: name.toUpperCase(), positions });
    }
  });

  return {
    done: doneText,
    fail: failText,
    stats: {
      total: entries.filter(e => !e.isNoPost).length,
      done: entries.filter(e => e.hasCheck && !e.isNoPost).length,
      pending: fails.length,
      nopost: entries.filter(e => e.isNoPost).length
    },
    duplicates
  };
}

function analyzeGaps(raw: string, threshold: number) {
  const lines = raw.split('\n');
  let currentLink = '';
  const database: {[key: string]: string[]} = {};
  const linksFound = new Set<string>();

  lines.forEach(line => {
    line = line.trim();
    const linkMatch = line.match(/Link\s*(?:No)?[-:\s]*(\d+)/i);
    if (linkMatch) {
      currentLink = linkMatch[1];
      linksFound.add(currentLink);
      return;
    }

    const nameMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
    if (nameMatch && currentLink) {
      const name = nameMatch[1].trim();
      const cleanName = name.startsWith('@') ? name : '@' + name;
      if (!database[cleanName]) database[cleanName] = [];
      if (!database[cleanName].includes(currentLink)) database[cleanName].push(currentLink);
    }
  });

  const names = Object.keys(database).sort((a, b) => database[b].length - database[a].length);
  const critical: any[] = [];
  const others: any[] = [];

  names.forEach(name => {
    const gaps = database[name];
    const count = gaps.length;
    const item = { name: name.toUpperCase(), count, links: gaps };
    if (count >= threshold) critical.push(item);
    else others.push(item);
  });

  return {
    critical,
    others,
    stats: {
      links: linksFound.size,
      members: names.length
    }
  };
}
