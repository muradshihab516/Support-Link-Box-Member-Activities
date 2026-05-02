/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Download, 
  Filter,
  Plus,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Member, MemberStatus, MemberLevel } from '../types';
import MemberCard from '../components/ui/MemberCard';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<MemberStatus | 'all'>('all');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('member_number', { ascending: true });
      
      if (error) throw error;
      setMembers(data as Member[]);
    } catch (err) {
      console.error("Error fetching members:", err);
      toast.error("Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || m.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const names = formData.get('names') as string;
    
    // Support bulk add via @mention or lines
    const parsedNames = names.split(/[\s\n,]+/).filter(n => n.trim() !== '').map(n => n.replace(/^@/, ''));
    
    if (parsedNames.length === 0) return;

    const loadingToast = toast.loading(`Registering ${parsedNames.length} personnel...`);

    try {
      // Prepare bulk data
      const newMembers = parsedNames.map(name => ({
        name,
        display_name: name,
        status: MemberStatus.ACTIVE,
        level: MemberLevel.BRONZE,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        total_active_days: 0,
        consecutive_inactive_days: 0,
        notes: '',
      }));

      const { error } = await supabase
        .from('members')
        .insert(newMembers);

      if (error) throw error;

      toast.success(`${parsedNames.length} protocol(s) initialized!`, { id: loadingToast });
      setIsAddModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      console.error("Error adding members:", err);
      toast.error(err.message || "Failed to register personnel.", { id: loadingToast });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black neon-text-cyan mb-2">DIRECTORY</h1>
          <p className="text-white/60 font-rajdhani uppercase tracking-widest text-sm flex items-center gap-2">
            <Users size={16} className="text-neon-cyan" />
            {members.length} Registered Members
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded-xl font-orbitron font-bold text-xs uppercase tracking-widest hover:bg-neon-cyan/30 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,245,255,0.2)]"
          >
            <UserPlus size={16} />
            Register Member
          </button>
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all">
            <Download size={20} />
          </button>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card-bg/40 backdrop-blur-md rounded-2xl border border-white/5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH BY NAME OR @ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 font-orbitron text-xs tracking-wider focus:outline-none focus:border-neon-cyan/50 transition-all uppercase"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'warning', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all border",
                filter === s 
                  ? "bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
          {filteredMembers.length === 0 && (
            <div className="col-span-full py-20 text-center text-white/20">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-orbitron tracking-widest uppercase">No members found matching your search</p>
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-card-bg/90 border border-neon-cyan/30 p-8 rounded-2xl relative z-10 neon-border"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black neon-text-cyan flex items-center gap-3">
                  <UserPlus size={24} />
                  REGISTER PERSONNEL
                </h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-white/40 hover:text-neon-red">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-6">
                <div>
                  <label className="block text-[10px] text-white/40 font-orbitron mb-2 uppercase tracking-widest">Member Names (Bulk supported with @mention or newline)</label>
                  <textarea 
                    name="names"
                    required
                    placeholder="@Shihab @Mamun @Shuvo..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-neon-cyan/50 transition-all"
                  />
                </div>
                
                <div className="p-4 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg flex gap-3">
                  <AlertCircle className="text-neon-cyan shrink-0" size={20} />
                  <p className="text-xs text-white/70 leading-relaxed italic">
                    Sequential IDs will be assigned automatically. Names will be cross-referenced for duplicates.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-neon-cyan text-dark-bg font-orbitron font-black text-sm uppercase tracking-widest rounded-xl hover:bg-neon-cyan/80 transition-all shadow-[0_0_20px_rgba(0,245,255,0.4)]"
                >
                  INITIALIZE REGISTRATION
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
