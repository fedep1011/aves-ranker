import fs from 'node:fs';

const aves = JSON.parse(fs.readFileSync('public/data/aves.json', 'utf8'));
const mamiferos = JSON.parse(fs.readFileSync('public/data/mamiferos.json', 'utf8'));
const flores = JSON.parse(fs.readFileSync('public/data/flores.json', 'utf8'));

const avesMap = new Map(aves.map(a => [a.id, a]));
const mamMap = new Map(mamiferos.map(m => [m.id, m]));
const floMap = new Map(flores.map(f => [f.id, f]));

const AVES_DEFS = [
  { leftId: 5074, rightId: 4647, leftPos: '35% 25%', rightPos: '60% 25%' }, // Águila Real vs Halcón Peregrino
  { leftId: 1204, rightId: 1584281, leftPos: '35% 20%', rightPos: '65% 25%' }, // Pavo Real vs Ave del Paraíso
  { leftId: 20059, rightId: 8010, leftPos: '35% 20%', rightPos: '60% 30%' }, // Búho Real vs Cuervo Común
  { leftId: 6126, rightId: 2599, leftPos: '35% 35%', rightPos: '60% 35%' }, // Colibrí Topacio vs Martín Pescador
  { leftId: 116993, rightId: 19079, leftPos: '35% 20%', rightPos: '60% 30%' }, // Cacatúa Ninfa vs Agapornis
  { leftId: 6921, rightId: 73222, leftPos: '35% 30%', rightPos: '65% 20%' }, // Cisne Vulgar vs Flamenco del Caribe
  { leftId: 18793, rightId: 19018, leftPos: '30% center', rightPos: '70% center' }, // Tucán Toco vs Guacamayo Azul y Amarillo
  { leftId: 4328, rightId: 3786, leftPos: '35% 25%', rightPos: '60% 25%' }, // Pelícano café vs Piquero Patiazul
  { leftId: 9083, rightId: 10227, leftPos: '35% 30%', rightPos: '60% 30%' }, // Cardenal Rojo vs Colorín azul
  { leftId: 20526, rightId: 20500, leftPos: '35% 15%', rightPos: '60% 20%' }, // Avestruz Común vs Casuario del Sur
  { leftId: 4747, rightId: 5379, leftPos: '35% 30%', rightPos: '60% 30%' }, // Cóndor Andino vs Quebrantahuesos
  { leftId: 3820, rightId: 4504, leftPos: '35% 20%', rightPos: '60% 25%' }, // Pingüino Emperador vs Frailecillo Atlántico
  { leftId: 53, rightId: 4733, leftPos: '35% 20%', rightPos: '60% 25%' }, // Grulla Coronada vs Cigüeña blanca
  { leftId: 1230, rightId: 8877, leftPos: '35% 30%', rightPos: '65% 30%' }, // Faisán Dorado vs Gallito de las rocas
  { leftId: 1986, rightId: 117214, leftPos: '35% 35%', rightPos: '60% 20%' } // Correcaminos norteño vs Ave Secretario
];

const FAUNA_DEFS = [
  { leftId: 41970, rightId: 41967, leftPos: '40% center', rightPos: '60% center' }, // Jaguar vs Tigre
  { leftId: 41964, rightId: 74831, leftPos: '40% center', rightPos: '60% center' }, // León vs Leopardo de las nieves
  { leftId: 41955, rightId: 42007, leftPos: '40% center', rightPos: '60% center' }, // Guepardo vs Puma
  { leftId: 42048, rightId: 42069, leftPos: '40% center', rightPos: '60% center' }, // Lobo gris vs Zorro Rojo
  { leftId: 41644, rightId: 41641, leftPos: '40% center', rightPos: '60% center' }, // Oso Polar vs Oso Pardo
  { leftId: 43694, rightId: 43348, leftPos: '40% center', rightPos: '60% center' }, // Elefante africano vs Rinoceronte Blanco
  { leftId: 41659, rightId: 68790, leftPos: '40% center', rightPos: '60% center' }, // Panda gigante vs Gorila oriental
  { leftId: 1510571, rightId: 41845, leftPos: '40% center', rightPos: '60% center' } // Jirafa del Sur vs Nutria gigante
];

const FLORA_DEFS = [
  { leftId: 167982, rightId: 83085, leftPos: '35% center', rightPos: '65% center' }, // Rosa de jardín vs Orquídea piramidal
  { leftId: 57983, rightId: 82814, leftPos: '35% center', rightPos: '65% center' }, // Girasol vs Loto sagrado
  { leftId: 61904, rightId: 126637, leftPos: '35% center', rightPos: '65% center' }, // Cantueso (Lavanda) vs Jacinto
  { leftId: 129054, rightId: 49143, leftPos: '35% center', rightPos: '65% center' }, // Tulipán de jardín vs Ave del Paraíso
  { leftId: 85027, rightId: 56006, leftPos: '35% center', rightPos: '65% center' }, // Azucena silvestre vs Alcatraz (Calla)
  { leftId: 122034, rightId: 83063, leftPos: '35% center', rightPos: '65% center' }, // Hortensia japonesa vs Clavel común
  { leftId: 125742, rightId: 83074, leftPos: '35% center', rightPos: '65% center' }, // Sakura vs Magnolia común
  { leftId: 161582, rightId: 53806, leftPos: '35% center', rightPos: '65% center' }, // Dalia de jardín vs Crisantemo de jardín
  { leftId: 54404, rightId: 55845, leftPos: '35% center', rightPos: '65% center' }, // Amapola silvestre vs Violeta común
  { leftId: 69235, rightId: 1628098, leftPos: '35% center', rightPos: '65% center' }, // Anturio rojo vs Rosa de China (Hibisco)
  { leftId: 1640238, rightId: 127857, leftPos: '35% center', rightPos: '65% center' }, // Flor de Lis de Santiago vs Peonía china
  { leftId: 131250, rightId: 337568, leftPos: '35% center', rightPos: '65% center' }, // Orquídea Fantasma vs Rafflesia
  { leftId: 55848, rightId: 223666, leftPos: '35% center', rightPos: '65% center' }, // Narciso trompón vs Azucena blanca
  { leftId: 55563, rightId: 47602, leftPos: '35% center', rightPos: '65% center' }, // Margarita común vs Diente de león
  { leftId: 83056, rightId: 164233, leftPos: '35% center', rightPos: '65% center' } // Camelia común vs Jazmín común
];

function toHomeCardThumb(url) {
  if (!url || typeof url !== 'string') return url;
  // For 250px half-split hero cards, 500px (2x Retina) gives 1:1 bilinear sampling with zero Nyquist aliasing on fur/feathers
  const clean = url.split('?')[0];
  const mThumb = clean.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/([^/]+))\/\d+px-(.+)$/i);
  if (mThumb) {
    return `https://thumb.wikimedia.org/wikipedia/commons/thumb/${mThumb[1]}/500px-${mThumb[3]}`;
  }
  const mRaw = clean.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2}\/([^/]+))$/i);
  if (mRaw) {
    const suffix = /\.(tif|tiff)$/i.test(mRaw[2]) ? `${mRaw[2]}.jpg` : mRaw[2];
    return `https://thumb.wikimedia.org/wikipedia/commons/thumb/${mRaw[1]}/500px-${suffix}`;
  }
  return url.replace('/large.jpg', '/medium.jpg').replace('/large.jpeg', '/medium.jpeg');
}

function buildPairsArray(defs, map) {
  return defs.map(d => {
    const l = map.get(d.leftId);
    const r = map.get(d.rightId);
    if (!l) throw new Error(`Missing item id ${d.leftId}`);
    if (!r) throw new Error(`Missing item id ${d.rightId}`);
    const leftUrl = toHomeCardThumb(l.photo || l.imagen || '');
    const rightUrl = toHomeCardThumb(r.photo || r.imagen || '');
    return {
      left: { id: l.id, name: l.name, url: leftUrl, pos: d.leftPos },
      right: { id: r.id, name: r.name, url: rightUrl, pos: d.rightPos }
    };
  });
}

export function syncHomePairs() {
  const avesPairs = buildPairsArray(AVES_DEFS, avesMap);
  const faunaPairs = buildPairsArray(FAUNA_DEFS, mamMap);
  const floraPairs = buildPairsArray(FLORA_DEFS, floMap);

  let html = fs.readFileSync('index.html', 'utf8');

  // Replace AVES_CARD_PAIRS
  const avesRegex = /const AVES_CARD_PAIRS = \[[\s\S]*?\n    \];/;
  const avesFormatted = 'const AVES_CARD_PAIRS = ' + JSON.stringify(avesPairs, null, 6).replace(/\n/g, '\n    ') + ';';
  html = html.replace(avesRegex, avesFormatted);

  // Replace FAUNA_CARD_PAIRS
  const faunaRegex = /const FAUNA_CARD_PAIRS = \[[\s\S]*?\n    \];/;
  const faunaFormatted = 'const FAUNA_CARD_PAIRS = ' + JSON.stringify(faunaPairs, null, 6).replace(/\n/g, '\n    ') + ';';
  html = html.replace(faunaRegex, faunaFormatted);

  // Replace FLORA_CARD_PAIRS
  const floraRegex = /const FLORA_CARD_PAIRS = \[[\s\S]*?\n    \];/;
  const floraFormatted = 'const FLORA_CARD_PAIRS = ' + JSON.stringify(floraPairs, null, 6).replace(/\n/g, '\n    ') + ';';
  html = html.replace(floraRegex, floraFormatted);

  fs.writeFileSync('index.html', html);
  console.log('✓ index.html sincronizado exitosamente con las fotos canónicas de los rankings:');
  console.log(`  - Aves: ${avesPairs.length} parejas`);
  console.log(`  - Fauna: ${faunaPairs.length} parejas`);
  console.log(`  - Flora: ${floraPairs.length} parejas`);
}

// Direct execution
if (process.argv[1]?.endsWith('sync_home_pairs.mjs')) {
  syncHomePairs();
}
