/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame, 
  Trash2, 
  Archive, 
  ExternalLink, 
  Award,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import { Member, MemberStatus, MemberLevel } from '../../types';
import { cn } from '../../lib/utils';

interface MemberCardProps {
  member: Member;
  onView?: (member: Member) => void;
  onArchive?: (member: Member) => void;
  key?: string | number;
}

const levelColors = {
  [MemberLevel.BRONZE]: 'text-amber-700 border-amber-700/20 bg-amber-700/5',
  [MemberLevel.SILVER]: 'text-slate-400 border-slate-400/20 bg-slate-400/5',
  [MemberLevel.GOLD]: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
  [MemberLevel.DIAMOND]: 'text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5'
};

const statusColors = {
  [MemberStatus.ACTIVE]: 'text-neon-green border-neon-green/20',
  [MemberStatus.WARNING]: 'text-neon-amber border-neon-amber/20',
  [MemberStatus.INACTIVE]: 'text-neon-red border-neon-red/20',
  [MemberStatus.ARCHIVED]: 'text-white/20 border-white/10'
};

export default function MemberCard({ member, onView, onArchive }: MemberCardProps) {
  const isAtRisk = member.status === MemberStatus.WARNING || member.consecutive_inactive_days >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={cn(
        "glass-card p-5 rounded-xl transition-all duration-300 group relative",
        isAtRisk ? "border-neon-red/30 shadow-[0_0_20px_#FF313111]" : "border-neon-cyan/20 hover:border-neon-cyan/40"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 overflow-hidden group-hover:scale-105 transition-transform">
               <span className="text-xl font-orbitron font-black text-neon-cyan">#{member.member_number}</span>
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0D0D20] shadow-[0_0_8px_currentColor]",
              member.status === MemberStatus.ACTIVE ? "bg-neon-green text-neon-green" : 
              member.status === MemberStatus.WARNING ? "bg-neon-amber text-neon-amber" : "bg-neon-red text-neon-red"
            )} />
          </div>
          <div>
            <h4 className="font-bold text-white tracking-tight truncate max-w-[150px] font-orbitron text-sm uppercase italic">{member.display_name || member.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className={cn(
                 "w-1.5 h-1.5 rounded-full animate-pulse",
                 member.status === MemberStatus.ACTIVE ? "bg-neon-green" : "bg-neon-red"
               )} />
               <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                 {member.status === MemberStatus.ACTIVE ? 'Synced' : 'Inactive'}
               </span>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "px-2 py-0.5 border text-[9px] font-black italic uppercase tracking-tighter rounded shadow-sm",
          levelColors[member.level]
        )}>
          {member.level}
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between p-2 bg-white/3 rounded border border-white/5 group-hover:border-white/10 transition-colors">
          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Streak Count</span>
          <div className="flex items-center gap-1.5">
            <Flame size={12} className={cn(member.current_streak > 10 ? "text-neon-amber animate-pulse" : "text-gray-500")} />
            <span className="text-xs font-orbitron font-black text-white">{member.current_streak}D</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 bg-white/3 rounded border border-white/5 group-hover:border-white/10 transition-colors">
          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Total Points</span>
          <div className="flex items-center gap-1.5">
            <Award size={12} className="text-neon-purple" />
            <span className="text-xs font-orbitron font-black text-white">{member.total_points}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative z-10">
        <button 
          onClick={() => onView?.(member)}
          className="flex-1 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-black italic uppercase tracking-[0.2em] rounded hover:bg-neon-cyan/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          Inspect
        </button>
        <button 
          onClick={() => onArchive?.(member)}
          className="p-1.5 bg-white/5 border border-white/10 text-gray-500 hover:text-neon-red hover:border-neon-red/30 rounded transition-all"
        >
          <Archive size={14} />
        </button>
      </div>

      {isAtRisk && (
        <div className="absolute -top-1 -right-1">
          <div className="bg-neon-red text-white text-[8px] font-black italic px-2 py-0.5 rounded shadow-[0_0_10px_#FF3131]">DANGER</div>
        </div>
      )}
    </motion.div>
  );
}
