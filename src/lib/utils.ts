export const ADMIN_NAMES: Record<string, string> = { 
  'muradshihab516@gmail.com': 'Murad Shihab',
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

/**
 * Robustly cleans a name fragment by removing numbering, symbols, and junk prefixes.
 * Handles English, Bengali, and Stylized/Accented Latin characters.
 */
export function cleanName(raw: string): string {
  let cleaned = raw.trim();
  if (!cleaned) return "";

  // Aggressively remove noise from the start: numbers, punctuation, list symbols
  let last = "";
  while (cleaned !== last) {
    last = cleaned;
    // 1. Remove common list noise (numbers, dots, symbols, arrows, @, etc.)
    cleaned = cleaned.replace(/^[0-9০০-৯\s\.\-#*️⃣🔟\uFE0F\u20E3➤।৷\-–—\/\\|_:;,)\]>»\+@\[\{\(]+/, '');
    // 2. Remove anything that isn't a "name character" from the start 
    // Name characters include: A-Z, Bengali, and Accented Latin (for stylized names)
    cleaned = cleaned.replace(/^[^a-zA-Z\u0980-\u09FF\u00C0-\u024F]+/, '');
  }
  
  // Final global symbol removal (like internal @)
  cleaned = cleaned.replace(/@/g, ' ').replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
