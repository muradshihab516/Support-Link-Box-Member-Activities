/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Fuse from 'fuse.js';
import { Member } from '../types';

export interface ParsedEntry {
  raw: string;
  name: string;
  matchedMemberId?: string;
  status: 'matched' | 'unmatched' | 'duplicate' | 'skip';
  isNoPost: boolean;
}

export interface ParseResult {
  date?: string; // YYYY-MM-DD
  entries: ParsedEntry[];
}

export function parseBulkActivity(text: string, members: Member[]): ParseResult {
  const result: ParseResult = { entries: [] };
  const lines = text.split('\n');

  // Regex for date extraction: DD-MM-YY or DD-MM-YYYY
  const dateRegex = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    let day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;
    result.date = `${year}-${month}-${day}`;
  }

  const fuse = new Fuse(members, {
    keys: ['name', 'display_name'],
    threshold: 0.3,
    includeScore: true
  });

  const memberIdSet = new Set<string>();

  for (const line of lines) {
    if (!line.trim() || line.includes('তারিখ')) continue;

    // Check for @mention or name
    // Assuming format is like "1. @Name" or "1️⃣➤ @Name"
    const cleanedLine = line.replace(/[0-9️⃣➤|.*#\-\.]/g, '').trim();
    if (!cleanedLine) continue;

    const isNoPost = line.toLowerCase().includes('no post');
    const nameMatch = cleanedLine.replace(/^@/, '').trim();

    if (!nameMatch) continue;

    const searchResults = fuse.search(nameMatch);
    const topMatch = searchResults[0];

    const entry: ParsedEntry = {
      raw: line.trim(),
      name: nameMatch,
      isNoPost,
      status: 'unmatched'
    };

    if (topMatch && topMatch.item.id) {
      entry.matchedMemberId = topMatch.item.id;
      if (memberIdSet.has(topMatch.item.id)) {
        entry.status = 'duplicate';
      } else {
        entry.status = 'matched';
        memberIdSet.add(topMatch.item.id);
      }
    }

    if (isNoPost) {
       entry.status = 'skip';
    }

    result.entries.push(entry);
  }

  return result;
}
