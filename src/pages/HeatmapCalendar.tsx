/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
} from 'date-fns';
import { cn } from '../lib/utils';

export default function HeatmapCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthActivity = async () => {
      setLoading(true);
      try {
        const firstDay = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const lastDay = format(endOfMonth(currentDate), 'yyyy-MM-dd');

        const { data, error } = await supabase
          .from('activity_logs')
          .select('activity_date')
          .gte('activity_date', firstDay)
          .lte('activity_date', lastDay);
        
        if (error) throw error;
        
        const counts: Record<string, number> = {};
        data?.forEach(log => {
          const date = log.activity_date;
          counts[date] = (counts[date] || 0) + 1;
        });
        setActivityData(counts);
      } catch (err) {
        console.error("Heatmap error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMonthActivity();
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getIntensity = (count: number) => {
    if (!count) return 'bg-white/5 border-white/5';
    if (count < 10) return 'bg-neon-cyan/20 border-neon-cyan/20';
    if (count < 30) return 'bg-neon-cyan/40 border-neon-cyan/40';
    if (count < 50) return 'bg-neon-cyan/60 border-neon-cyan/60';
    return 'bg-neon-cyan border-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.4)]';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black neon-text-cyan mb-2">ENGAGEMENT HEATMAP</h1>
          <p className="text-white/60 font-rajdhani uppercase tracking-widest text-sm flex items-center gap-2">
            <CalendarIcon size={16} className="text-neon-cyan" />
            Group-wide activity density distribution
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-card-bg/40 p-2 rounded-xl border border-white/5">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-orbitron font-bold uppercase tracking-widest text-sm w-40 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-card-bg/40 backdrop-blur-md rounded-2xl p-8 border border-white/5 neon-border">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center text-[10px] font-orbitron font-bold text-white/40 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const count = activityData[dateStr] || 0;
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isSameDay(day, new Date());

              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className={cn(
                    "aspect-square rounded-lg border transition-all flex flex-col items-center justify-center relative group cursor-pointer",
                    getIntensity(count),
                    !isCurrentMonth && "opacity-10 grayscale pointer-events-none",
                    isTodayDate && "ring-2 ring-white/50"
                  )}
                >
                  <span className={cn(
                    "text-xs font-orbitron font-bold",
                    count > 30 ? "text-dark-bg" : "text-white/60"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {count > 0 && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-dark-bg/90 rounded-lg transition-opacity">
                       <span className="text-[10px] font-orbitron font-bold text-neon-cyan">{count} ACTS</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
             <h3 className="text-sm font-orbitron font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
               <Info size={16} className="text-neon-cyan" />
               Intensity Legend
             </h3>
             <div className="space-y-3">
               {[
                 { label: '0 Active', color: 'bg-white/5' },
                 { label: '1 - 10 Active', color: 'bg-neon-cyan/20' },
                 { label: '11 - 30 Active', color: 'bg-neon-cyan/40' },
                 { label: '31 - 50 Active', color: 'bg-neon-cyan/60' },
                 { label: '50+ Critical', color: 'bg-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.4)]' }
               ].map((item) => (
                 <div key={item.label} className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded", item.color)} />
                    <span className="text-[10px] font-mono text-white/60 uppercase">{item.label}</span>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20">
             <p className="text-xs text-white/80 leading-relaxed italic">
               The engagement heatmap visualizes overall group activity levels. Darker neon areas indicate peak link submission periods.
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
