/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Activity, 
  Flame, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: '26 Apr', active: 45 },
  { name: '27 Apr', active: 52 },
  { name: '28 Apr', active: 48 },
  { name: '29 Apr', active: 61 },
  { name: '30 Apr', active: 55 },
  { name: '01 May', active: 67 },
  { name: '02 May', active: 63 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeToday: 0,
    participationRate: 0,
    dangerZoneCount: 0,
    warningZoneCount: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: members, error } = await supabase
          .from('members')
          .select('status');
        
        if (error) throw error;

        const total = members?.length || 0;
        const activeToday = members?.filter(m => m.status === 'active').length || 0;
        const dangerCount = members?.filter(m => m.status === 'warning').length || 0;
        
        setStats({
          totalMembers: total,
          activeToday: activeToday,
          participationRate: total > 0 ? Math.round((activeToday / total) * 100) : 0,
          dangerZoneCount: dangerCount,
          warningZoneCount: 0
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic font-orbitron">System Overview</h1>
          <p className="text-neon-cyan text-xs tracking-[0.2em] uppercase font-bold mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            Facebook Engagement Tracker / Support Link Box
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right px-4 py-2 border-r border-neon-cyan/20">
            <span className="block text-[9px] uppercase text-gray-500 font-bold tracking-widest">Operation Date</span>
            <span className="text-white font-mono tracking-widest text-sm">{new Date().toISOString().split('T')[0].replace(/-/g, '.')}</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 bg-neon-pink text-white text-[10px] font-black uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,0,128,0.3)] hover:shadow-[0_0_30px_rgba(255,0,128,0.5)] transition-all flex items-center gap-2"
          >
            <Activity size={14} />
            SYNC DATA
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Active Today" 
          value={stats.activeToday} 
          icon={Activity} 
          color="cyan" 
          subValue={`/${stats.totalMembers} Members Active`}
          trend="up"
        />
        <StatCard 
          title="Avg Participation" 
          value={`${stats.participationRate}%`} 
          icon={BarChart2} 
          color="purple" 
          subValue="+2.4% from last week"
          trend="up"
        />
        <StatCard 
          title="Streak Heroes" 
          value={24} // Mocked as per design
          icon={Flame} 
          color="amber" 
          subValue="Hot Streaks > 30 Days"
        />
        <StatCard 
          title="Danger Zone" 
          value={stats.dangerZoneCount} 
          icon={AlertTriangle} 
          color="red" 
          subValue="Critical Streaks at Risk"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Participation Trend */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border-neon-cyan/20">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neon-cyan">Activity Velocity</h3>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">30-Day Automated engagement tracking</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-neon-purple shadow-[0_0_5px_#BF00FF]"></span> Active
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_5px_#00F5FF]"></span> target
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BF00FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#BF00FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff10" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                  fontFamily="Rajdhani"
                  fontWeight="bold"
                />
                <YAxis 
                  stroke="#ffffff10" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  fontFamily="Rajdhani"
                  fontWeight="bold"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0D0D20', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(0,245,255,0.2)',
                    fontFamily: 'Rajdhani',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#00F5FF' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="active" 
                  stroke="#BF00FF" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorActive)" 
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Danger Zone List */}
        <div className="glass-card rounded-2xl p-6 border-neon-red/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <AlertTriangle size={64} className="text-neon-red" />
          </div>
          
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neon-red mb-8 flex items-center gap-2">
            <span className="animate-pulse w-2 h-2 rounded-full bg-neon-red"></span>
            Streak Risk Protocol
          </h3>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between group p-2 hover:bg-neon-red/5 border border-transparent hover:border-neon-red/10 rounded transition-all cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white uppercase italic tracking-tight">Member_User_{i}</div>
                  <div className="text-[9px] text-gray-500 font-mono tracking-widest mt-0.5 uppercase">🔥 {12 - i} Days Streak</div>
                </div>
                <div className="px-2 py-0.5 bg-neon-red/20 border border-neon-red/40 text-neon-red text-[8px] font-black italic rounded">DANGER</div>
              </div>
            ))}
          </div>

          <button className="w-full mt-8 py-3 border border-neon-red/20 hover:bg-neon-red/10 text-neon-red text-[9px] font-black tracking-[0.3em] transition-all rounded uppercase italic">
            Override Warning Signals
          </button>
        </div>
      </div>

      {/* Bottom Mini Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 flex flex-wrap gap-6">
          <div className="px-4 py-2 border-l-2 border-neon-green bg-neon-green/5">
             <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest">Latest Logged In</span>
             <span className="text-xs font-bold text-white uppercase font-orbitron italic">Admin_Murad</span>
          </div>
          <div className="px-4 py-2 border-l-2 border-neon-purple bg-neon-purple/5">
             <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest">Award Distribution</span>
             <span className="text-xs font-bold text-white uppercase font-orbitron italic">42 Active Badges</span>
          </div>
          <div className="px-4 py-2 border-l-2 border-neon-cyan bg-neon-cyan/5">
             <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest">System Engine</span>
             <span className="text-[10px] font-bold text-neon-cyan flex items-center gap-1.5 uppercase font-orbitron italic">
               <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span> Core Connected
             </span>
          </div>
        </div>
        <div className="flex justify-end items-center">
           <div className="text-[10px] text-gray-600 font-mono italic font-bold">V1.5.0 // CLOUD NATIVE</div>
        </div>
      </div>
    </motion.div>
  );
}

// Internal missing constant
const ShieldAlert = () => <Activity size={24} />;
