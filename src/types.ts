/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum MemberStatus {
  ACTIVE = 'active',
  WARNING = 'warning',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum MemberLevel {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  DIAMOND = 'Diamond'
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin'
}

export interface Member {
  id: string;
  name: string;
  display_name: string;
  member_number: number;
  status: MemberStatus;
  level: MemberLevel;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  last_active_date: string | null; // ISO string
  consecutive_inactive_days: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  member_id: string;
  activity_date: string; // YYYY-MM-DD
  is_active: boolean;
  points_earned: number;
  submitted_by: string; // Admin ID
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  description: string;
  timestamp: string;
}

export interface Badge {
  id: string;
  member_id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}
