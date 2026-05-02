/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search as SearchIcon, 
  History, 
  User, 
  Calendar, 
  Target,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member, ActivityLog } from '../types';
import { cn, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function SearchMembers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMember(null);
    setHistory([]);

    try {
      const cleanQuery = searchQuery.replace(/^@/, '');
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`name.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const memberData = data[0] as Member;
        setMember(memberData);

        // Fetch logs
        const { data: logs, error: logsError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('member_id', memberData.id)
          .order('activity_date', { ascending: false })
          .limit(30);
        
        if (logsError) throw logsError;
        setHistory(logs as ActivityLog[]);
      } else {
        toast.error("Member not found in current sector.");
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Query failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12 max-w-4xl mx-auto"
    >
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-black neon-text-cyan">RECONNAISSANCE</h1>
        <p className="text-white/40 font-rajdhani uppercase tracking-[0.3em] text-xs">Access Individual Member History & Performance Data</p>
        
        <div className="relative max-w-xl mx-auto mt-8">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ENTER MEMBER IDENTIFIER (e.g. @Shihab)..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 pl-8 pr-16 font-orbitron text-sm tracking-widest focus:outline-none focus:border-neon-cyan/50 transition-all uppercase placeholder:text-white/10"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-neon-cyan text-dark-bg rounded-xl shadow-[0_0_15px_rgba(0,245,255,0.4)] hover:scale-105 active:scale-95 transition-all"
          >
            <SearchIcon size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20"
          >
             <div className="w-12 h-12 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin mb-4" />
             <p className="font-orbitron text-[10px] text-neon-cyan animate-pulse">DECRYPTING ARCHIVES...</p>
          </motion.div>
        ) : member ? (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Profile Header Card */}
            <div className="bg-card-bg/60 backdrop-blur-md rounded-2xl p-8 border border-white/5 neon-border flex flex-col md:flex-row items-center gap-8">
               <div className="w-32 h-32 bg-neon-cyan/10 border-2 border-neon-cyan rounded-2xl flex items-center justify-center relative overflow-hidden group">
                  <User size={64} className="text-neon-cyan group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/20 to-transparent" />
               </div>
               
               <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center md:items-end gap-3 mb-4">
                    <h2 className="text-3xl font-black text-white">{member.display_name || member.name}</h2>
                    <span className="px-3 py-1 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-[10px] font-orbitron font-bold text-neon-cyan mb-1 uppercase tracking-widest">{member.level}</span>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                     <div className="flex items-center gap-2 text-white/60">
                        <Target size={16} className="text-neon-cyan" />
                        <span className="text-xs font-mono">ID: {member.member_number}</span>
                     </div>
                     <div className="flex items-center gap-2 text-white/60">
                        <Calendar size={16} className="text-neon-purple" />
                        <span className="text-xs font-mono">ENROLLED: {formatDate(new Date(member.created_at))}</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-white/40 uppercase mb-1">STREAK</p>
                    <p className="text-2xl font-orbitron font-black text-neon-amber">{member.current_streak}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-white/40 uppercase mb-1">POINTS</p>
                    <p className="text-2xl font-orbitron font-black text-neon-purple">{member.total_points}</p>
                  </div>
               </div>
            </div>

            {/* Timeline */}
            <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl p-8 border border-white/5">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                <History size={24} className="text-neon-cyan" />
                ENGAGEMENT TIMELINE
              </h3>
              
              <div className="space-y-4">
                {history.length > 0 ? history.map((log, idx) => (
                  <div key={log.id} className="flex items-center gap-6 group">
                     <div className="w-24 text-right">
                       <p className="text-[10px] font-mono text-white/40 uppercase">{log.activity_date}</p>
                     </div>
                     <div className="relative flex flex-col items-center">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 border-dark-bg z-10 shadow-[0_0_10px_currentColor]",
                          log.is_active ? "bg-neon-green" : "bg-neon-red"
                        )} />
                        {idx !== history.length - 1 && <div className="w-[2px] h-12 bg-white/5 group-hover:bg-neon-cyan/20 transition-colors" />}
                     </div>
                     <div className="flex-1 p-3 bg-white/5 border border-white/5 rounded-xl group-hover:border-neon-cyan/20 transition-colors flex items-center justify-between">
                        <p className={cn(
                          "text-xs font-bold uppercase tracking-widest",
                          log.is_active ? "text-neon-green" : "text-neon-red"
                        )}>
                          {log.is_active ? 'LINK SUBMITTED' : 'NO SUBMISSION'}
                        </p>
                        <div className="flex items-center gap-2">
                           {log.is_active ? <TrendingUp size={14} className="text-neon-green" /> : <TrendingDown size={14} className="text-neon-red" />}
                           <span className="text-[10px] font-mono text-white/40">{log.is_active ? '+1 PTS' : '0 PTS'}</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-white/20 uppercase tracking-[0.2em] text-xs">
                    No recent activity logs found
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : !loading && searchQuery && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             className="text-center py-20 text-white/20"
           >
             <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
             <p className="uppercase tracking-[0.3em] text-xs">Target identifier not found in the collective</p>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
