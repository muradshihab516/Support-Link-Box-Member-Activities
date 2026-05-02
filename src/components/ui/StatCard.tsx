/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subValue?: string;
  trend?: 'up' | 'down';
  color?: 'cyan' | 'purple' | 'pink' | 'amber' | 'red' | 'green';
  className?: string;
}

const colorMap = {
  cyan: {
    border: 'border-neon-cyan/20',
    bg: 'bg-neon-cyan/5',
    text: 'text-neon-cyan',
    glow: 'shadow-[0_0_20px_rgba(0,245,255,0.15)]',
    iconBg: 'bg-neon-cyan/10'
  },
  purple: {
    border: 'border-neon-purple/20',
    bg: 'bg-neon-purple/5',
    text: 'text-neon-purple',
    glow: 'shadow-[0_0_20px_rgba(191,0,255,0.15)]',
    iconBg: 'bg-neon-purple/10'
  },
  pink: {
    border: 'border-neon-pink/20',
    bg: 'bg-neon-pink/5',
    text: 'text-neon-pink',
    glow: 'shadow-[0_0_20px_rgba(255,0,128,0.15)]',
    iconBg: 'bg-neon-pink/10'
  }
};

export default function StatCard({ title, value, icon: Icon, subValue, trend, color = 'cyan', className }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "glass-card p-5 rounded-xl transition-all duration-300 relative overflow-hidden group",
        color === 'cyan' && "border-neon-cyan/30 shadow-[0_0_20px_#00F5FF22]",
        color === 'purple' && "border-neon-purple/30 shadow-[0_0_20px_#BF00FF22]",
        color === 'pink' && "border-neon-pink/30 shadow-[0_0_20px_#FF008022]",
        color === 'amber' && "border-neon-amber/30 shadow-[0_0_20px_#FFAA0022]",
        color === 'red' && "border-neon-red/30 shadow-[0_0_20px_#FF313122]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className={cn(
          "text-[10px] uppercase font-bold tracking-widest",
          color === 'cyan' && "text-neon-cyan",
          color === 'purple' && "text-neon-purple",
          color === 'pink' && "text-neon-pink",
          color === 'amber' && "text-neon-amber",
          color === 'red' && "text-neon-red"
        )}>{title}</span>
        <Icon size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="flex items-end gap-2 relative z-10">
        <div className="text-4xl font-black text-white tracking-tighter uppercase font-orbitron">{value}</div>
        {trend && (
          <div className={cn(
            "text-[10px] font-bold pb-1",
            trend === 'up' ? "text-neon-green" : "text-neon-red"
          )}>
            {trend === 'up' ? '▲' : '▼'} {trend === 'up' ? '+12%' : '-5%'}
          </div>
        )}
      </div>

      {subValue && (
        <p className="text-[10px] text-gray-500 mt-2 italic uppercase tracking-wider font-medium relative z-10">{subValue}</p>
      )}
      
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '75%' }}
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            color === 'cyan' && "bg-neon-cyan shadow-[0_0_10px_#00F5FF]",
            color === 'purple' && "bg-neon-purple shadow-[0_0_10px_#BF00FF]",
            color === 'pink' && "bg-neon-pink shadow-[0_0_10px_#FF0080]",
            color === 'amber' && "bg-neon-amber shadow-[0_0_10px_#FFAA00]",
            color === 'red' && "bg-neon-red shadow-[0_0_10px_#FF3131]"
          )}
        />
      </div>

      {/* Subtle interior glow */}
      <div className={cn(
        "absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none",
        color === 'cyan' && "bg-neon-cyan",
        color === 'purple' && "bg-neon-purple",
        color === 'pink' && "bg-neon-pink"
      )} />
    </motion.div>
  );
}
