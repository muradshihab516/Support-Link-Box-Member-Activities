/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FilePlus, 
  BarChart3, 
  Trophy, 
  Calendar, 
  Search, 
  History,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'activity', label: 'Input Activity', icon: FilePlus },
  { id: 'statistics', label: 'Analytics', icon: BarChart3 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'calendar', label: 'Heatmap', icon: Calendar },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'audit', label: 'Audit Log', icon: History },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { logout, adminProfile } = useAuth();

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-dark-bg neon-border rounded-lg md:hidden"
      >
        {isOpen ? <X className="text-neon-cyan" /> : <Menu className="text-neon-cyan" />}
      </button>

      {/* Sidebar Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-card-bg/80 backdrop-blur-xl border-r border-neon-cyan/20 z-40 md:translate-x-0 transition-none flex flex-col p-6",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="mb-10 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-neon-pink rounded-lg shadow-[0_0_15px_#FF0080] flex items-center justify-center transition-transform group-hover:scale-110">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white font-orbitron">LINK BOX</span>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.1)]" 
                  : "text-gray-400 hover:text-white transition-colors"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-neon-cyan" : "group-hover:text-neon-cyan transition-colors")} />
              <span className="font-rajdhani uppercase tracking-wider text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-neon-cyan/20 pt-6">
          {adminProfile ? (
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full border border-neon-cyan p-0.5 shadow-[0_0_10px_rgba(0,245,255,0.2)]">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-neon-cyan to-neon-purple"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white uppercase tracking-tighter truncate">{adminProfile.display_name}</div>
                <div className="text-[10px] text-neon-cyan uppercase tracking-widest font-mono">{adminProfile.role.replace('_', ' ')}</div>
              </div>
            </div>
          ) : (
             <div className="h-16 flex items-center justify-center text-gray-500 italic text-[10px] uppercase font-mono px-2 mb-6">
               Authenticating Metadata...
             </div>
          )}

          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neon-red font-bold hover:bg-neon-red/10 transition-all border border-transparent hover:border-neon-red/20 uppercase tracking-widest text-xs font-orbitron"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </motion.aside>
    </>
  );
}
