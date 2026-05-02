/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Users,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const levelData = [
  { name: 'Bronze', value: 45, color: '#b45309' },
  { name: 'Silver', value: 25, color: '#94a3b8' },
  { name: 'Gold', value: 15, color: '#eab308' },
  { name: 'Diamond', value: 15, color: '#00F5FF' },
];

const weeklyData = [
  { day: 'Mon', count: 32 },
  { day: 'Tue', count: 45 },
  { day: 'Wed', count: 38 },
  { day: 'Thu', count: 52 },
  { day: 'Fri', count: 48 },
  { day: 'Sat', count: 65 },
  { day: 'Sun', count: 58 },
];

export default function Analytics() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header>
        <h1 className="text-4xl font-black neon-text-purple mb-2">ANALYTICS HUB</h1>
        <p className="text-white/60 font-rajdhani uppercase tracking-widest text-sm flex items-center gap-2">
          <BarChart3 size={16} className="text-neon-purple" />
          Advanced statistics & behavior analytics
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weekly Participation */}
        <div className="lg:col-span-2 bg-card-bg/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 neon-border-purple h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
              <CalendarIcon size={20} className="text-neon-purple" />
              WEEKLY PARTICIPATION
            </h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="day" stroke="#ffffff20" fontSize={10} fontFamily="Orbitron" axisLine={false} tickLine={false} />
              <YAxis stroke="#ffffff20" fontSize={10} fontFamily="Orbitron" axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(191, 0, 255, 0.05)' }}
                contentStyle={{ backgroundColor: '#0D0D20', border: '1px solid rgba(191, 0, 255, 0.2)', borderRadius: '12px' }}
              />
              <Bar dataKey="count" fill="#BF00FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Level Distribution */}
        <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 h-[400px]">
          <h3 className="text-lg font-orbitron font-bold text-white mb-8 flex items-center gap-2">
            <PieChartIcon size={20} className="text-neon-pink" />
            LEVEL SPREAD
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={levelData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {levelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0D0D20', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {levelData.map((lvl) => (
              <div key={lvl.name} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }} />
                 <span className="text-[10px] uppercase font-bold text-white/60">{lvl.name}: {lvl.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Growing Members simulated list */}
         <div className="bg-card-bg/40 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-orbitron font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-neon-cyan" />
              UPWARD MOMENTUM
            </h3>
            <div className="space-y-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center font-bold text-neon-cyan">#{i}</div>
                     <div>
                       <p className="text-sm font-bold">@Fast_Learner_{i}</p>
                       <p className="text-[10px] text-white/40 uppercase">+4 Days Streak</p>
                     </div>
                   </div>
                   <div className="text-neon-green text-xs font-mono font-bold">↑ 25%</div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-card-bg/40 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-orbitron font-bold text-white mb-6 flex items-center gap-2">
              <Users size={20} className="text-neon-amber" />
              IDLE WARNING
            </h3>
            <div className="space-y-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-neon-amber/20 border border-neon-amber/30 flex items-center justify-center font-bold text-neon-amber">#{i}</div>
                     <div>
                       <p className="text-sm font-bold">@Inactive_User_{i}</p>
                       <p className="text-[10px] text-white/40 uppercase">7 Days Since Link</p>
                     </div>
                   </div>
                   <div className="text-neon-red text-xs font-mono font-bold">↓ 100%</div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </motion.div>
  );
}
