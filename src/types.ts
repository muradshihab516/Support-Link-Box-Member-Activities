export type Route = 'login' | 'dashboard' | 'members' | 'activity' | 'search' | 'leaderboard' | 'audit' | 'heatmap';

export interface Member {
  id: string;
  name: string;
  member_number: number;
  status: 'active' | 'warning' | 'inactive';
  total_points: number;
  created_at?: string;
}

export function calculateLevel(points: number): string {
  if (points >= 500) return 'Diamond';
  if (points >= 200) return 'Platinum';
  if (points >= 100) return 'Gold';
  if (points >= 50) return 'Silver';
  return 'Bronze';
}

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  admin_name: string;
  timestamp: string;
}
