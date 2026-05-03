export const ADMIN_NAMES: Record<string, string> = { 
  'shihab@linkbox.com': 'Md Shihab Khan', 
  'mamun@linkbox.com': 'Mamun Aravi', 
  'shuvo@linkbox.com': 'Shuvo Sutradhar', 
  'shadat@linkbox.com': 'ShaDat Hossain', 
  'rubel@linkbox.com': 'Ariyan Ahmed Rubel', 
  'mustakim@linkbox.com': 'MD Mustakim Islam', 
  'hanif@linkbox.com': 'Mohammad Abu Hanif' 
};

export function getAdminName(email: string | undefined): string {
  if (!email) return 'Guest Operator';
  return ADMIN_NAMES[email] || email.split('@')[0];
}
