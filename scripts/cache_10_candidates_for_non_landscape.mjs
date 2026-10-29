import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('public/data/non_landscape_report.json', 'utf8'));

async function fetch10Candidates(item) {
  const candidates = [item.photo];

  // 1. iNaturalist Observations API
  try {
    const inatId = typeof item.id === 'number' && item.id < 5000000 ? item.id : null;
    const inatQuery = inatId ? `taxon_id=${inatId}` : `q=${encodeURIComponent(item.sci_name || item.name)}`;
    const inatUrl = `https://api.inaturalist.org/v1/observations?${inatQuery}&quality_grade=research&photos=true&per_page=15&order_by=votes`;
    const res = await fetch(inatUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (res.ok) {
      const data = await res.json();
      for (const r of data.results || []) {
        for (const p of r.photos || []) {
          const u = p.url?.replace('square.', 'medium.');
          if (u && !candidates.includes(u)) {
            candidates.push(u);
            if (candidates.length >= 10) break;
          }
        }
        if (candidates.length >= 10) break;
      }
    }
  } catch (_) {}

  // 2. Commons API fallback if still < 10
  if (candidates.length < 10) {
    const clean = (item.sci_name || item.name).replace(/[()]/g, '').trim();
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(clean)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json&origin=*`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.ok) {
        const d = await res.json();
        const pages = d.query ? Object.values(d.query.pages) : [];
        for (const p of pages) {
          const info = p.imageinfo && p.imageinfo[0];
          const u = info && (info.thumburl || info.url);
          if (u && !u.endsWith('.svg') && !candidates.includes(u)) {
            candidates.push(u);
            if (candidates.length >= 12) break;
          }
        }
      }
    } catch (_) {}
  }

  return candidates;
}

async function processArena(arenaName, list, concurrency = 10) {
  console.log(`\nProcesando ${arenaName} (${list.length} especies no-apaisadas)...`);
  const cachePath = `public/data/curation_candidates_${arenaName}.json`;
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch (_) {}
  }

  let idx = 0;
  let enriched = 0;

  async function worker() {
    while (idx < list.length) {
      const currentIdx = idx++;
      const item = list[currentIdx];
      const existing = cache[String(item.id)] || [];
      if (existing.length >= 8) {
        continue;
      }

      const candidates = await fetch10Candidates(item);
      cache[String(item.id)] = candidates;
      enriched++;

      if (enriched % 20 === 0 || idx >= list.length) {
        process.stdout.write(`  [${arenaName}] ${idx}/${list.length} procesadas (${enriched} enriquecidas con 10 fotos)\r`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\n✓ ${arenaName}: Guardado en ${cachePath} (${Object.keys(cache).length} especies con candidatos).`);
}

async function run() {
  await processArena('aves', report.aves);
  await processArena('mamiferos', report.mamiferos);
  await processArena('flores', report.flores);
  console.log('\n¡Todas las especies no-apaisadas tienen ahora hasta 10 fotos candidatas en caché!');
}

run().catch(console.error);
