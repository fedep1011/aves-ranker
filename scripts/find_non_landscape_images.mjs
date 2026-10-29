import fs from 'node:fs';
import { getImageInfo } from './get_image_info.mjs';

async function scanArena(arenaName, items, concurrency = 25) {
  console.log(`\nScanning ${arenaName} (${items.length} items)...`);
  const nonLandscape = [];
  const errors = [];
  let processed = 0;

  // Process with a concurrency pool
  const pool = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const currentIdx = idx++;
      const item = items[currentIdx];
      const info = await getImageInfo(item.photo);
      processed++;

      if (processed % 100 === 0 || processed === items.length) {
        process.stdout.write(`  [${arenaName}] ${processed}/${items.length} (${nonLandscape.length} no-apaisadas)\r`);
      }

      if (!info) {
        errors.push({ id: item.id, name: item.name, photo: item.photo, reason: 'unreachable_or_unsupported' });
      } else if (!info.isLandscape || info.aspectRatio <= 1.08) {
        nonLandscape.push({
          id: item.id,
          name: item.name,
          sci_name: item.sci_name,
          photo: item.photo,
          width: info.width,
          height: info.height,
          aspectRatio: Number(info.aspectRatio.toFixed(2)),
          type: info.aspectRatio < 0.95 ? 'vertical' : 'cuadrada'
        });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log(`\n  Resultados ${arenaName}: ${nonLandscape.length} no-apaisadas de ${items.length} revisadas.`);
  return { arena: arenaName, total: items.length, nonLandscape, errors };
}

async function run() {
  const aves = JSON.parse(fs.readFileSync('public/data/aves.json', 'utf8')).filter(x => x.curated);
  const mam = JSON.parse(fs.readFileSync('public/data/mamiferos.json', 'utf8')).filter(x => x.curated);
  const flo = JSON.parse(fs.readFileSync('public/data/flores.json', 'utf8')).filter(x => x.curated);

  console.log(`Iniciando escaneo rápido de imágenes curadas:`);
  console.log(`- Aves: ${aves.length}`);
  console.log(`- Mamíferos: ${mam.length}`);
  console.log(`- Flores: ${flo.length}`);

  const avesRes = await scanArena('aves', aves);
  const mamRes = await scanArena('mamiferos', mam);
  const floRes = await scanArena('flores', flo);

  const report = {
    generated_at: new Date().toISOString(),
    totals: {
      aves: { total: avesRes.total, nonLandscape: avesRes.nonLandscape.length },
      mamiferos: { total: mamRes.total, nonLandscape: mamRes.nonLandscape.length },
      flores: { total: floRes.total, nonLandscape: floRes.nonLandscape.length }
    },
    aves: avesRes.nonLandscape,
    mamiferos: mamRes.nonLandscape,
    flores: floRes.nonLandscape
  };

  fs.writeFileSync('public/data/non_landscape_report.json', JSON.stringify(report, null, 2), 'utf8');
  console.log('\nReporte guardado en public/data/non_landscape_report.json');
}

run().catch(console.error);
