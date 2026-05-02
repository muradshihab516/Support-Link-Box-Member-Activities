/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050510] px-4 py-8">
      {/* Decorative Grid & Glows */}
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />
      <div className="bg-glow-purple top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
      <div className="scanline" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0D0D20]/80 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10"
      >
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-neon-pink rounded-2xl flex items-center justify-center shadow-[0_0_25px_#FF0080] mx-auto mb-6 transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <LayoutDashboard size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic font-orbitron">LINK BOX</h1>
          <p className="text-neon-cyan text-[10px] font-black uppercase tracking-[0.4em] mt-2">Security Protocol V1.5</p>
        </div>

        <div className="space-y-8">
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2 font-orbitron">Authorization Required</h4>
            <p className="text-xs text-gray-500 leading-relaxed italic">
              Access to the support engagement collective is restricted. Please verify your admin credentials to initialize the tracking sequence.
            </p>
          </div>

          <button
            onClick={signIn}
            className="w-full bg-neon-pink text-white font-orbitron font-black py-4 rounded-xl hover:shadow-[0_0_30px_#FF0080] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_0_20px_rgba(255,0,128,0.4)] tracking-widest text-sm uppercase italic"
          >
            <ShieldCheck size={22} />
            Authorize Access
          </button>

          <footer className="text-center pt-4 border-t border-white/5">
            <div className="flex justify-center gap-4 mb-4">
               <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_5px_#00FF88]" />
               <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_5px_#00F5FF]" />
               <div className="w-1.5 h-1.5 rounded-full bg-neon-purple shadow-[0_0_5px_#BF00FF]" />
            </div>
            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.2em] font-bold">
              Support Link Box Collective // End-to-End Encryption Active
            </p>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
