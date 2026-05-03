export interface ParsedActivity {
  username: string;
  points: number;
  detail: string;
}

export function parseActivityBatch(data: string): ParsedActivity[] {
  const lines = data.split('\n').filter(l => l.trim());
  const results: ParsedActivity[] = [];

  for (const line of lines) {
    const match = line.match(/@([\w\-\.]+)\s*(.*)/);
    if (match) {
      const username = match[1];
      const detail = match[2].toLowerCase();
      
      let points = 0;
      if (detail.includes('post')) {
        const numMatch = detail.match(/\d+/);
        points = numMatch ? parseInt(numMatch[0]) : 1;
      } else if (detail.length > 0 && !detail.includes('no')) {
        points = 1;
      }

      if (points > 0) {
        results.push({ username, points, detail });
      }
    }
  }
  return results;
}
