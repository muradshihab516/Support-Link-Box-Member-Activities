export type Route = 'login' | 'dashboard' | 'members' | 'activity' | 'search' | 'leaderboard' | 'audit' | 'heatmap' | 'gapchecker' | 'shortener' | 'collector' | 'listgenerator' | 'admin' | 'topperformer' | 'memberMission';

export interface Member {
  id: string;
  name: string;
  member_number: number;
  total_points: number;
  created_at?: string;
  last_activity_date?: string;
  current_streak: number;
  max_streak: number;
  total_syncs: number;
}

export function calculateLevel(points: number): string {
  if (points >= 500) return 'Wave Overlord';
  if (points >= 200) return 'Wave Titan';
  if (points >= 100) return 'Wave Vanguard';
  if (points >= 50) return 'Wave Trooper';
  return 'Wave Recruit';
}

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  admin_name: string;
  timestamp: string;
}
