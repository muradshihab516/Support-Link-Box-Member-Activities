/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Medal, 
  Flame, 
  Crown, 
  Star,
  Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member } from '../types';
import { cn } from '../lib/utils';

export default function Leaderboard() {
  const [topMembers, setTopMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        setTopMembers(data as Member[]);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const topThree = topMembers.slice(0, 3);
  const rest = topMembers.slice(3);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12 pb-12"
    >
      <header className="text-center">
        <div className="inline-flex items-center gap-3 bg-neon-cyan/10 border border-neon-cyan/20 px-6 py-2 rounded-full mb-6">
           <Trophy size={20} className="text-neon-cyan" />
           <span className="font-orbitron font-bold text-neon-cyan tracking-widest text-sm uppercase">Hall of Excellence</span>
        </div>
        <h1 className="text-5xl font-black text-white mb-2 italic">GROUP LEADERS</h1>
        <p className="text-white/40 font-rajdhani uppercase tracking-[0.4em] text-xs">Performance Matrix Rankings</p>
      </header>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto px-4">
        {topThree.length >= 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-2 md:order-1 flex flex-col items-center"
          >
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-slate-400 bg-card-bg flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(148,163,184,0.3)]">
                <span className="text-4xl font-orbitron font-black text-slate-400 opacity-20">2</span>
              </div>
              <div className="absolute -top-3 -right-3 p-2 bg-slate-400 rounded-lg text-dark-bg">
                <Medal size={20} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg truncate w-32">{topThree[1].display_name || topThree[1].name}</h3>
              <p className="text-neon-purple font-orbitron text-sm font-bold tracking-tighter">{topThree[1].total_points} PTS</p>
            </div>
            <div className="w-full h-32 bg-gradient-to-t from-neon-purple/20 to-transparent border-x border-t border-white/5 mt-4 rounded-t-xl" />
          </motion.div>
        )}

        {topThree.length >= 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-1 md:order-2 flex flex-col items-center"
          >
             <div className="relative group mb-6 scale-125">
              <div className="w-24 h-24 rounded-full border-4 border-neon-cyan bg-card-bg flex items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.4)] animate-pulse">
                 <span className="text-4xl font-orbitron font-black text-neon-cyan opacity-20">1</span>
              </div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-neon-cyan animate-bounce">
                <Crown size={32} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-black text-2xl truncate w-40 text-white shadow-neon-cyan">{topThree[0].display_name || topThree[0].name}</h3>
              <p className="text-neon-cyan font-orbitron text-xl font-black tracking-tighter">{topThree[0].total_points} PTS</p>
            </div>
            <div className="w-full h-48 bg-gradient-to-t from-neon-cyan/30 to-transparent border-x border-t border-neon-cyan/40 mt-6 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,245,255,0.1)]" />
          </motion.div>
        )}

        {topThree.length >= 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="order-3 flex flex-col items-center"
          >
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-amber-700 bg-card-bg flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(180,83,9,0.3)]">
                <span className="text-4xl font-orbitron font-black text-amber-700 opacity-20">3</span>
              </div>
              <div className="absolute -top-3 -right-3 p-2 bg-amber-700 rounded-lg text-dark-bg">
                <Medal size={20} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg truncate w-32">{topThree[2].display_name || topThree[2].name}</h3>
              <p className="text-neon-pink font-orbitron text-sm font-bold tracking-tighter">{topThree[2].total_points} PTS</p>
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-neon-pink/20 to-transparent border-x border-t border-white/5 mt-4 rounded-t-xl" />
          </motion.div>
        )}
      </div>

      {/* Rest of the list */}
      <div className="max-w-4xl mx-auto space-y-4">
        {rest.map((member, index) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            key={member.id}
            className="p-4 rounded-xl bg-card-bg/40 border border-white/5 hover:border-neon-cyan/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-6">
              <span className="w-6 font-orbitron font-black text-white/20 text-center">{index + 4}</span>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 font-bold group-hover:neon-border transition-all">
                  <Star size={18} className="text-white/20 group-hover:text-neon-cyan" />
                </div>
                <div>
                  <h4 className="font-bold">{member.display_name || member.name}</h4>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{member.level} LEVEL</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase font-mono">Streak</p>
                <div className="flex items-center gap-1">
                  <Flame size={14} className="text-neon-amber" />
                  <span className="text-sm font-bold">{member.current_streak}</span>
                </div>
              </div>
              <div className="text-right w-24">
                <p className="text-[10px] text-white/40 uppercase font-mono">Score</p>
                <p className="text-lg font-orbitron font-black text-neon-cyan">{member.total_points}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
