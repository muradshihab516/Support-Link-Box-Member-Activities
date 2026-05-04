export interface ParsedActivity {
  username: string;
  points: number;
  detail: string;
}

export function parseActivityBatch(data: string): ParsedActivity[] {
  const results: ParsedActivity[] = [];
  
  // High-Quality Pattern:
  // Starts with @ or a list number like 1.@ or 1. @
  // Captures everything until the next @, a new list number, or a keyword like 'post'
  const namePattern = /(?:@|\d+[\.\s]*@+)\s*([^@\n\r]+?)(?=(?:\s+\d+\.|\s+@|\s+post|\s+no|\s+points|\s+pts|\s+active|\n|\r|$))/gi;
  
  let m;
  while ((m = namePattern.exec(data)) !== null) {
    if (m[1]) {
      const username = m[1].trim();
      if (username.toLowerCase().includes('no post') || username.length < 2) continue;
      
      // Find context (points) in the line containing this match
      const startOfLine = data.lastIndexOf('\n', m.index) + 1;
      const endOfLine = data.indexOf('\n', m.index);
      const lineContext = data.substring(startOfLine, endOfLine === -1 ? data.length : endOfLine).toLowerCase();

      let points = 0;
      if (lineContext.includes('post')) {
        const numMatch = lineContext.match(/\d+/);
        points = numMatch ? parseInt(numMatch[0]) : 1;
      } else if (!lineContext.includes('no post')) {
        points = 1;
      }

      results.push({ 
        username, 
        points, 
        detail: 'Dynamic Sync' 
      });
    }
  }
  return results;
}
