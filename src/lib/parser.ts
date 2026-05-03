export interface ParsedActivity {
  username: string;
  points: number;
  detail: string;
}

export function parseActivityBatch(data: string): ParsedActivity[] {
  const lines = data.split('\n').filter(l => l.trim());
  const results: ParsedActivity[] = [];

  for (const line of lines) {
    // Skip clearly invalid lines or "No Post" markers
    if (line.toLowerCase().includes('no post')) continue;

    // Matches @ followed by a name (greedy until a known keyword or end of line)
    // Supports unicode names, spaces, and varied statuses
    const match = line.match(/@\s*(.+?)(?:\s+(post|no|pts|points|warning|inactive|active).*|$)/i);
    if (match) {
      const username = match[1].trim();
      // Exclude generic status messages or common non-name terms
      if (username.toLowerCase().includes('no post') || username.length < 2) continue;
      
      // If we matched a keyword, try to find the full detail for that line
      const fullDetailMatch = line.slice(line.indexOf(match[0]) + match[0].length - (match[2]?.length || 0));
      const activityStr = fullDetailMatch.toLowerCase();

      let points = 0;
      if (activityStr.includes('post')) {
        const numMatch = activityStr.match(/\d+/);
        points = numMatch ? parseInt(numMatch[0]) : 1;
      } else if (activityStr.length > 0 && !activityStr.includes('no')) {
        // Any other non-"no" text counts as 1 point by default
        points = 1;
      }

      if (username) {
        results.push({ 
          username, 
          points, 
          detail: activityStr || 'Logged'
        });
      }
    }
  }
  return results;
}
