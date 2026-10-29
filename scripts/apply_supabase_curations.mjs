import fs from 'node:fs';
import { syncHomePairs } from './sync_home_pairs.mjs';

const SUPABASE_URL = 'https://xomkdblwsmuphbkppvpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbWtkYmx3c211cGhia3BwdnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTkwOTMsImV4cCI6MjEwODI3NTA5M30.yqzCo9EJ8BrHereirVUdVDWqWfXbBDS5uItEr76-pwI';

async function fetchAllRows(packId) {
  const allRows = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const to = from + batchSize - 1;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rankings?pack_id=eq.${encodeURIComponent(packId)}&order=created_at.asc&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Range': `${from}-${to}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${packId} range ${from}-${to}: ${res.statusText}`);
    }

    const rows = await res.json();
    allRows.push(...rows);
    if (rows.length < batchSize) break;
    from += batchSize;
  }

  return allRows;
}

function parseChoices(rows) {
  const map = new Map();
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.author);
      const itemId = Number(r.ranking_ids[0]) || r.ranking_ids[0];
      map.set(itemId, {
        source: parsed.source,
        photo: parsed.photo,
        name: parsed.name
      });
    } catch (e) {
      console.warn('Error parsing row:', e.message);
    }
  }
  return map;
}

async function syncArena(arena, packId) {
  console.log(`\n=== Sincronizando ${arena} (${packId}) ===`);
  const rows = await fetchAllRows(packId);
  console.log(`Descargadas ${rows.length} filas de Supabase.`);
  const choices = parseChoices(rows);
  console.log(`Parseadas ${choices.size} elecciones únicas.`);

  const filePath = `public/data/${arena}.json`;
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updatedPhotos = 0;
  let markedCurated = 0;

  for (const it of items) {
    const choice = choices.get(it.id);
    if (choice) {
      if (it.photo !== choice.photo) {
        it.photo = choice.photo;
        updatedPhotos++;
      }
      it.curated = true;
      it.curated_source = choice.source || 'kurador';
      markedCurated++;
    } else {
      it.curated = Boolean(it.curated);
      if (!it.curated_source) it.curated_source = 'default';
    }
  }

  // Sort so that curated items are at the front, preserving relative original order
  const curatedList = items.filter(x => x.curated);
  const uncuratedList = items.filter(x => !x.curated);
  const reordered = [...curatedList, ...uncuratedList];

  fs.writeFileSync(filePath, JSON.stringify(reordered, null, 2), 'utf8');
  console.log(`[${arena}] Guardado en ${filePath}: Total=${items.length}, Curados=${markedCurated}, Fotos cambiadas=${updatedPhotos}`);
}

async function run() {
  await syncArena('aves', 'curation_aves_v2');
  await syncArena('mamiferos', 'curation_mamiferos_v2');
  await syncArena('flores', 'curation_flores_v2');
  console.log('\n✓ ¡Todos los JSONs fueron unificados y actualizados exitosamente!');
  syncHomePairs();
}

run().catch(console.error);
