/**
 * Supabase Storage Client for Rankea2
 * Lightweight, zero-dependency REST integration for 8-character clean share links.
 */

const SUPABASE_URL = 'https://xomkdblwsmuphbkppvpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbWtkYmx3c211cGhia3BwdnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTkwOTMsImV4cCI6MjEwODI3NTA5M30.yqzCo9EJ8BrHereirVUdVDWqWfXbBDS5uItEr76-pwI';

import { generateSeed } from './tournament.js';

/**
 * Saves a completed tournament ranking to Supabase and returns a clean 8-character short_code.
 * @param {Object} options
 * @param {string} options.packId - Arena pack ('aves', 'mamiferos', 'flores', 'pokemon')
 * @param {Array<string|number>} options.rankingIds - Ordered IDs of the final ranking (#1..#N)
 * @param {string} [options.author] - Optional nickname
 * @returns {Promise<string>} 8-character short code
 */
export async function saveRankingToCloud({ packId, rankingIds, author = '' }) {
  if (!rankingIds || rankingIds.length < 2) return null;
  const short_code = generateSeed();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rankings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        short_code,
        pack_id: packId,
        ranking_ids: rankingIds.map(String),
        author: author || ''
      })
    });

    if (res.ok || res.status === 201) {
      return short_code;
    }
    console.warn('Supabase save error HTTP', res.status, await res.text());
  } catch (err) {
    console.warn('Supabase save failed, falling back:', err);
  }

  return null;
}

/**
 * Retrieves a saved ranking by its 8-character short code.
 * @param {string} code - 8-character short code
 * @returns {Promise<{ ids: string[], packId: string, author: string }|null>}
 */
export async function fetchRankingFromCloud(code) {
  if (!code || typeof code !== 'string') return null;
  const cleanCode = code.trim();
  if (cleanCode.length !== 8) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rankings?short_code=eq.${encodeURIComponent(cleanCode)}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const record = rows[0];
    return {
      ids: record.ranking_ids || [],
      packId: record.pack_id,
      author: record.author || ''
    };
  } catch (err) {
    console.warn('Supabase fetch failed:', err);
    return null;
  }
}
