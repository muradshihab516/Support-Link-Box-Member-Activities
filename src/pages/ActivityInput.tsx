/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FilePlus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ClipboardCheck,
  Undo2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member, ActivityLog } from '../types';
import { parseBulkActivity, ParseResult, ParsedEntry } from '../lib/parser';
import { cn, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function ActivityInput() {
  const [members, setMembers] = useState<Member[]>([]);
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const { user } = useAuth();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*');
      if (!error && data) setMembers(data as Member[]);
    };
    fetchMembers();
  }, []);

  const handleProcess = () => {
    if (!rawText.trim()) return;
    const result = parseBulkActivity(rawText, members);
    setParseResult(result);
    if (result.date) setSelectedDate(result.date);
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!parseResult || !user) return;

    const loadingToast = toast.loading("Executing bulk ingestion sequence...");
    const matchedEntries = parseResult.entries.filter(e => e.status === 'matched' && e.matchedMemberId);

    try {
      const logs = matchedEntries.map(entry => ({
        member_id: entry.matchedMemberId,
        activity_date: selectedDate,
        is_active: !entry.isNoPost,
        points_earned: entry.isNoPost ? 0 : 1,
        submitted_by: user.id,
      }));

      const { error } = await supabase
        .from('activity_logs')
        .insert(logs);

      if (error) throw error;

      // Note: In Supabase, you'd typically handle streak logic with a DB function/trigger
      // for real-time consistency. Here we focus on the ingestion.

      toast.success(`${matchedEntries.length} activity records synchronized successfully!`, { id: loadingToast });
      setStep(1);
      setRawText('');
      setParseResult(null);
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast.error(err.message || "Failed to synchronize activity records.", { id: loadingToast });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header>
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-neon-cyan/20 border border-neon-cyan/40 rounded-xl flex items-center justify-center">
             <FilePlus className="text-neon-cyan" />
           </div>
           <h1 className="text-4xl font-black neon-text-cyan">BULK INPUT</h1>
        </div>
        <p className="text-white/60 font-rajdhani uppercase tracking-widest text-sm">
          Phase {step}: {step === 1 ? 'Data Ingestion' : step === 2 ? 'Review & Validation' : 'Conflict Resolution'}
        </p>
      </header>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-orbitron font-bold border transition-all",
              step === s ? "bg-neon-cyan border-neon-cyan text-dark-bg shadow-[0_0_15px_rgba(0,245,255,0.4)]" : 
              step > s ? "bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan" : "bg-white/5 border-white/10 text-white/40"
            )}>
              {step > s ? <CheckCircle2 size={20} /> : s}
            </div>
            {s < 3 && <div className={cn("w-20 h-[1px]", step > s ? "bg-neon-cyan" : "bg-white/10")} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl p-8 border border-white/5 neon-border">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ClipboardCheck className="text-neon-cyan" />
                PASTE SUBMISSION LIST
              </h2>
              <p className="text-xs text-white/40 mb-4 uppercase tracking-tighter">Copy the full list from Facebook and paste it here. Smart parser will detect names and date.</p>
              
              <textarea 
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Example:
📅 তারিখ: 02-05-26
1. @MemberName
2. @AnotherMember [No Post]
..."
                rows={12}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-6 font-mono text-sm focus:outline-none focus:border-neon-cyan/50 transition-all mb-6"
              />

              <div className="flex justify-end">
                <button 
                  onClick={handleProcess}
                  disabled={!rawText.trim()}
                  className="px-8 py-4 bg-neon-cyan text-dark-bg font-orbitron font-black uppercase tracking-widest rounded-xl hover:bg-neon-cyan/80 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  PROCESS PAYLOAD
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && parseResult && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1 bg-card-bg/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <Calendar className="text-neon-cyan" size={24} />
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-mono">Parsed Date</p>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white font-orbitron focus:outline-none" 
                  />
                </div>
              </div>
              <div className="flex-1 bg-neon-cyan/5 p-4 rounded-xl border border-neon-cyan/20 flex items-center gap-4">
                <div className="text-2xl font-orbitron font-black text-neon-cyan">{parseResult.entries.length}</div>
                <p className="text-[10px] text-white/40 uppercase font-mono">Total Valid Entries Detected</p>
              </div>
            </div>

            <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
               <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                 <h3 className="font-orbitron font-bold text-sm uppercase tracking-widest">Validation Result</h3>
                 <div className="flex gap-4">
                   <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-neon-green">
                      <div className="w-2 h-2 rounded-full bg-neon-green" /> {parseResult.entries.filter(e => e.status === 'matched').length} Matched
                   </div>
                   <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-neon-amber">
                      <div className="w-2 h-2 rounded-full bg-neon-amber" /> {parseResult.entries.filter(e => e.status === 'unmatched').length} Unknown
                   </div>
                 </div>
               </div>

               <div className="max-h-[500px] overflow-y-auto">
                 {parseResult.entries.map((entry, idx) => (
                   <div key={idx} className="p-4 border-b border-white/5 flex items-center justify-between group hover:bg-white/5">
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] font-mono text-white/20 w-4">{idx + 1}</div>
                        <div>
                          <p className="text-sm font-bold">{entry.name}</p>
                          <p className="text-[10px] text-white/30 truncate max-w-[300px]">{entry.raw}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         {entry.isNoPost && (
                           <div className="px-2 py-0.5 rounded bg-neon-red/10 border border-neon-red/20 text-[10px] text-neon-red font-bold uppercase">No Post</div>
                         )}
                         {entry.status === 'matched' ? (
                           <div className="flex items-center gap-2 text-neon-green">
                             <CheckCircle2 size={16} />
                             <span className="text-[10px] font-bold uppercase">MATCHED</span>
                           </div>
                         ) : entry.status === 'duplicate' ? (
                           <div className="flex items-center gap-2 text-neon-amber">
                             <AlertTriangle size={16} />
                             <span className="text-[10px] font-bold uppercase text-neon-amber">DUPLICATE</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-2 text-white/20">
                             <AlertCircle size={16} />
                             <span className="text-[10px] font-bold uppercase">NOT FOUND</span>
                           </div>
                         )}
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="flex justify-between items-center pt-8">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-all font-orbitron text-xs uppercase"
              >
                <Undo2 size={20} />
                Abaddon Data
              </button>
              
              <button 
                onClick={handleConfirm}
                className="px-12 py-4 bg-neon-green text-dark-bg font-orbitron font-black uppercase tracking-widest rounded-xl hover:bg-neon-green/80 transition-all shadow-[0_0_20px_rgba(0,255,136,0.4)] flex items-center gap-2"
              >
                AUTHORIZE SUBMISSION
                <CheckCircle2 size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
