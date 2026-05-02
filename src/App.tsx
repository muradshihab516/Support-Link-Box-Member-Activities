/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import ParticleBackground from './components/ui/ParticleBackground';
import { Toaster } from 'react-hot-toast';

// Lazy load or import pages (for now standard imports for simplicity in the agent context)
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import ActivityInput from './pages/ActivityInput';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import HeatmapCalendar from './pages/HeatmapCalendar';
import SearchMembers from './pages/SearchMembers';
import AuditLog from './pages/AuditLog';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'members': return <Members />;
      case 'activity': return <ActivityInput />;
      case 'statistics': return <Analytics />;
      case 'leaderboard': return <Leaderboard />;
      case 'calendar': return <HeatmapCalendar />;
      case 'search': return <SearchMembers />;
      case 'audit': return <AuditLog />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 relative">
      <ParticleBackground />
      <div className="bg-glow-purple top-0 right-0 opacity-50" />
      <div className="bg-glow-cyan bottom-1/4 left-0 opacity-30" />
      <div className="scanline" />
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="md:ml-64 min-h-screen p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto w-full relative z-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0D0D20',
          color: '#fff',
          border: '1px solid rgba(0, 245, 255, 0.2)',
        },
      }} />
      <AppContent />
    </AuthProvider>
  );
}
