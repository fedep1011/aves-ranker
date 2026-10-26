import fs from 'node:fs';

async function repairAves() {
  const aves = JSON.parse(fs.readFileSync('public/data/aves.json', 'utf8'));
  console.log('Auditing and repairing', aves.length, 'birds...');
  let fixed = 0;

  for (let i = 0; i < aves.length; i++) {
    const a = aves[i];
    let works = false;
    try {
      const res = await fetch(a.photo, { headers: { 'Range': 'bytes=0-10' } });
      works = (res.status === 200 || res.status === 206);
    } catch (_) {}

    if (!works) {
      const cleanSci = (a.sci_name || '').replace(/ /g, '_');
      try {
        let wres = await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(cleanSci));
        let wdata = wres.ok ? await wres.json() : null;
        if (!wdata || (!wdata.thumbnail && !wdata.originalimage)) {
          wres = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(cleanSci));
          wdata = wres.ok ? await wres.json() : null;
        }
        if (wdata && (wdata.thumbnail || wdata.originalimage)) {
          a.photo = (wdata.thumbnail || wdata.originalimage).source;
          fixed++;
          console.log(`[${i + 1}/${aves.length}] Fixed: ${a.name} -> Wikipedia`);
        } else {
          console.log(`[${i + 1}/${aves.length}] Warning: No wiki photo for ${a.name} (${a.sci_name})`);
        }
      } catch (err) {
        console.log(`[${i + 1}/${aves.length}] Err for ${a.name}:`, err.message);
      }
      await new Promise(r => setTimeout(r, 200)); // Rate limit pause
    }
  }

  fs.writeFileSync('public/data/aves.json', JSON.stringify(aves, null, 2), 'utf8');
  console.log('Total fixed with Wikipedia:', fixed);
}

repairAves();
