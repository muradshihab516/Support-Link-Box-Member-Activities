/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  History, 
  User, 
  Terminal,
  Activity,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuditLog } from '../types';
import { cn } from '../lib/utils';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_trail')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setLogs(data as AuditLog[]);
      } catch (err) {
        console.error("Audit fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <header>
        <h1 className="text-4xl font-black neon-text-red mb-2">AUDIT TRAIL</h1>
        <p className="text-white/60 font-rajdhani uppercase tracking-widest text-sm flex items-center gap-2">
          <Shield size={16} className="text-neon-red" />
          Immutable record of admin operations & system changes
        </p>
      </header>

      <div className="bg-card-bg/40 backdrop-blur-md rounded-2xl border border-white/5 neon-border-red overflow-hidden">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center gap-3">
           <Terminal size={18} className="text-neon-red" />
           <span className="text-xs font-orbitron font-bold uppercase tracking-widest text-white/60">Console Logs [Latest 50 Operations]</span>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-neon-red/20 border-t-neon-red rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-orbitron text-neon-red uppercase">Fetching Logs...</p>
            </div>
          ) : logs.length > 0 ? logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-white/5 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Activity size={16} className="text-neon-red opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] bg-neon-red/10 border border-neon-red/20 px-2 py-0.5 rounded text-neon-red font-mono uppercase tracking-tighter">{log.action}</span>
                      <span className="text-xs font-bold text-white/80">{log.description}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-white/30 uppercase font-mono">
                      <div className="flex items-center gap-1">
                        <User size={10} />
                        {log.admin_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="opacity-50">Entity:</span> {log.entity_type}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-mono text-white/40">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center text-white/10">
              <History size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-orbitron uppercase tracking-widest text-sm">No activity records found in the audit collective</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-neon-red/5 border border-neon-red/20 rounded-2xl flex gap-4 items-start">
        <AlertCircle className="text-neon-red shrink-0" size={24} />
        <div>
          <h4 className="font-orbitron font-bold text-neon-red text-sm uppercase mb-1">Security Directive</h4>
          <p className="text-xs text-white/60 leading-relaxed italic">
            All administrative actions are logged with timestamps and identity verification. Modification of these logs is prohibited by the system protocol.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
