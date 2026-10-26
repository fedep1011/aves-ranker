import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const S3_PREFIX = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';

function toS3Url(url) {
  if (!url) return '';
  return url
    .replace('https://static.inaturalist.org/photos/', S3_PREFIX)
    .replace('http://static.inaturalist.org/photos/', S3_PREFIX);
}

function cleanName(str) {
  if (!str) return '';
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const TOP_16_WORLD_STARS = [
  { id: 18793, name: 'Tucán Toco', sci_name: 'Ramphastos toco', family: 'Ramphastidae', group: 'Frugívoras y Selva', habitat: 'Selva Tropical', region: 'América', countries: ['uruguay', 'brasil', 'argentina', 'latinoamérica', 'sudamérica'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/63281117/medium.jpg', observations_count: 4500 },
  { id: 19022, name: 'Guacamayo Rojo', sci_name: 'Ara macao', family: 'Psittacidae', group: 'Frugívoras y Selva', habitat: 'Selva Tropical', region: 'América', countries: ['latinoamérica', 'sudamérica', 'méxico'], photo: 'https://static.inaturalist.org/photos/67503679/medium.jpg', observations_count: 3800 },
  { id: 19018, name: 'Guacamayo Azul y Amarillo', sci_name: 'Ara ararauna', family: 'Psittacidae', group: 'Frugívoras y Selva', habitat: 'Selva Tropical', region: 'América', countries: ['latinoamérica', 'sudamérica', 'brasil'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/414331/medium.jpg', observations_count: 3600 },
  { id: 20856, name: 'Quetzal Resplandeciente', sci_name: 'Pharomachrus mocinno', family: 'Trogonidae', group: 'Frugívoras y Selva', habitat: 'Selva Tropical', region: 'América', countries: ['latinoamérica', 'méxico'], photo: 'https://static.inaturalist.org/photos/208398042/medium.jpg', observations_count: 1200 },
  { id: 1204, name: 'Pavo Real', sci_name: 'Pavo cristatus', family: 'Phasianidae', group: 'Aves de Suelo', habitat: 'Terrestre', region: 'Asia', countries: ['india', 'asia'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/165318/medium.jpg', observations_count: 5100 },
  { id: 5305, name: 'Águila Calva', sci_name: 'Haliaeetus leucocephalus', family: 'Accipitridae', group: 'Rapaces', habitat: 'Costero / Bosque', region: 'América', countries: ['estados unidos', 'canadá', 'norteamérica'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/289356/medium.jpg', observations_count: 9800 },
  { id: 5321, name: 'Águila Harpía', sci_name: 'Harpia harpyja', family: 'Accipitridae', group: 'Rapaces', habitat: 'Selva Tropical', region: 'América', countries: ['brasil', 'latinoamérica', 'sudamérica'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/447085/medium.jpg', observations_count: 850 },
  { id: 4758, name: 'Cóndor Andino', sci_name: 'Vultur gryphus', family: 'Cathartidae', group: 'Carroñeras', habitat: 'Montaña / Cordillera', region: 'América', countries: ['argentina', 'chile', 'perú', 'sudamérica', 'latinoamérica'], photo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/AndeanCondorMale.jpg/330px-AndeanCondorMale.jpg?utm_source=es.wikipedia.org&utm_campaign=api&utm_content=thumbnail', observations_count: 2400 },
  { id: 4255, name: 'Flamenco Común', sci_name: 'Phoenicopterus roseus', family: 'Phoenicopteridae', group: 'Acuáticas y Costeras', habitat: 'Humedal / Laguna', region: 'África', countries: ['áfrica', 'europa', 'españa'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/606710/medium.jpg', observations_count: 7300 },
  { id: 3808, name: 'Pingüino Emperador', sci_name: 'Aptenodytes forsteri', family: 'Spheniscidae', group: 'Acuáticas y Costeras', habitat: 'Polar / Antártico', region: 'Polar', countries: ['antártida', 'polar'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/442109/medium.jpg', observations_count: 950 },
  { id: 20054, name: 'Búho Nival', sci_name: 'Bubo scandiacus', family: 'Strigidae', group: 'Rapaces', habitat: 'Tundra / Polar', region: 'Polar', countries: ['canadá', 'estados unidos', 'polar'], photo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Cross-eyed_owl.jpg/330px-Cross-eyed_owl.jpg?utm_source=es.wikipedia.org&utm_campaign=api&utm_content=thumbnail', observations_count: 3200 },
  { id: 4514, name: 'Frailecillo Atlántico', sci_name: 'Fratercula arctica', family: 'Alcidae', group: 'Acuáticas y Costeras', habitat: 'Costero / Marino', region: 'Europa', countries: ['reino unido', 'europa', 'polar'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/112901/medium.jpg', observations_count: 4400 },
  { id: 2314, name: 'Martín Pescador', sci_name: 'Alcedo atthis', family: 'Alcedinidae', group: 'Acuáticas y Costeras', habitat: 'Ríos y Lagos', region: 'Europa', countries: ['españa', 'europa', 'reino unido'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/559298/medium.jpg', observations_count: 6700 },
  { id: 7085, name: 'Pato Mandarín', sci_name: 'Aix galericulata', family: 'Anatidae', group: 'Acuáticas y Costeras', habitat: 'Humedal / Lago', region: 'Asia', countries: ['japón', 'china', 'asia'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/252423/medium.jpg', observations_count: 4900 },
  { id: 10291, name: 'Cardenal Copete Rojo', sci_name: 'Paroaria coronata', family: 'Thraupidae', group: 'Cantoras y Jardín', habitat: 'Pastizal / Arbusto', region: 'América', countries: ['uruguay', 'argentina', 'brasil', 'latinoamérica', 'sudamérica'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/348834/medium.jpg', observations_count: 3100 },
  { id: 1177, name: 'Faisán Dorado', sci_name: 'Chrysolophus pictus', family: 'Phasianidae', group: 'Aves de Suelo', habitat: 'Bosque de Montaña', region: 'Asia', countries: ['china', 'asia'], photo: 'https://inaturalist-open-data.s3.amazonaws.com/photos/522334/medium.jpg', observations_count: 2100 }
];

function classifyBird(taxon, famName) {
  let group = 'Aves Generales';
  let habitat = 'Terrestre';
  let region = 'Global';
  const countries = [];

  // 1. Grupo
  if (['Accipitridae', 'Falconidae', 'Strigidae', 'Tytonidae', 'Pandionidae'].includes(famName)) {
    group = 'Rapaces';
    habitat = 'Aéreo / Cazador';
  } else if (famName === 'Cathartidae') {
    group = 'Carroñeras';
    habitat = 'Aéreo / Pastizal';
  } else if (['Spheniscidae', 'Anatidae', 'Laridae', 'Diomedeidae', 'Ardeidae', 'Pelecanidae', 'Podicipedidae', 'Phalacrocoracidae', 'Rallidae', 'Charadriidae', 'Scolopacidae'].includes(famName)) {
    group = 'Acuáticas y Costeras';
    habitat = 'Costero / Marino / Humedal';
  } else if (['Ramphastidae', 'Psittacidae', 'Trogonidae', 'Cotingidae', 'Momotidae'].includes(famName)) {
    group = 'Frugívoras y Selva';
    habitat = 'Selva Tropical';
  } else if (['Furnariidae', 'Tyrannidae', 'Turdidae', 'Thraupidae', 'Fringillidae', 'Trochilidae', 'Icteridae', 'Parulidae', 'Passerellidae', 'Hirundinidae'].includes(famName)) {
    group = 'Cantoras y Jardín';
    habitat = 'Jardín / Bosque / Pastizal';
  }

  // 2. Región y Países heurísticos
  const lower = ((taxon.preferred_common_name || '') + ' ' + (taxon.name || '')).toLowerCase();

  if (famName === 'Furnariidae' || famName === 'Rheidae' || famName === 'Thraupidae' || lower.includes('uruguay') || lower.includes('pampa') || lower.includes('sur') || lower.includes('austral')) {
    region = 'América';
    countries.push('uruguay', 'argentina', 'brasil', 'chile', 'latinoamérica', 'sudamérica');
  } else if (lower.includes('amazon') || lower.includes('andes') || lower.includes('colombia') || lower.includes('peru') || lower.includes('chile')) {
    region = 'América';
    countries.push('latinoamérica', 'sudamérica');
  } else if (lower.includes('mexic') || lower.includes('guatemala')) {
    region = 'América';
    countries.push('méxico', 'latinoamérica', 'centroamérica');
  } else if (lower.includes('canad') || lower.includes('norteameric') || lower.includes('californi')) {
    region = 'América';
    countries.push('estados unidos', 'canadá', 'norteamérica');
  } else if (lower.includes('iberic') || lower.includes('europe') || lower.includes('españ')) {
    region = 'Europa';
    countries.push('españa', 'europa');
  } else if (lower.includes('african') || lower.includes('congo') || lower.includes('kenia')) {
    region = 'África';
    countries.push('áfrica');
  } else if (lower.includes('asiat') || lower.includes('japon') || lower.includes('chin') || lower.includes('indi')) {
    region = 'Asia';
    countries.push('asia', 'japón', 'china');
  } else if (lower.includes('austral') || lower.includes('zeland') || lower.includes('pacifi')) {
    region = 'Oceanía';
    countries.push('oceanía', 'australia', 'nueva zelanda');
  } else if (famName === 'Spheniscidae' || lower.includes('antart') || lower.includes('polar')) {
    region = 'Polar';
    countries.push('antártida', 'polar');
  } else {
    region = 'América';
    countries.push('latinoamérica', 'sudamérica', 'global');
  }

  return { group, habitat, region, countries };
}

async function buildAvesCatalog() {
  console.log('=== Generando Catálogo Completo de Aves para Rankea2 ===');

  // 1. Familias de Aves (taxon_id=3)
  console.log('1. Extrayendo Familias de Aves...');
  const famRes = await fetch('https://api.inaturalist.org/v1/taxa?taxon_id=3&rank=family&per_page=200');
  const famData = await famRes.json();
  const famMap = new Map();
  (famData.results || []).forEach(f => famMap.set(f.id, f.name));
  console.log(`Cargadas ${famMap.size} familias de aves.`);

  const seenIds = new Set();
  const catalog = [];

  // Agregar las 16 superestrellas primero
  TOP_16_WORLD_STARS.forEach(star => {
    seenIds.add(star.id);
    catalog.push(star);
  });

  // 2. Extraer especies más observadas (Páginas 1 a 6 = ~600 especies)
  console.log('2. Consultando especies de Aves ordenadas por popularidad / investigación...');
  for (let page = 1; page <= 6; page++) {
    console.log(`-> Descargando página ${page}...`);
    const url = `https://api.inaturalist.org/v1/observations/species_counts?taxon_id=3&quality_grade=research&locale=es&preferred_place_id=7259&page=${page}&per_page=100`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Error en página ${page}: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      const t = r.taxon;
      if (!t || !t.id || seenIds.has(t.id)) continue;

      const common = t.preferred_common_name;
      const photoUrl = t.default_photo?.medium_url;

      // Descartar taxones sin nombre común en español o sin foto
      if (!common || common.toLowerCase() === t.name.toLowerCase() || !photoUrl) continue;

      const famId = (t.ancestor_ids || []).find(id => famMap.has(id));
      const famName = famId ? famMap.get(famId) : 'Aves';

      const { group, habitat, region, countries } = classifyBird(t, famName);

      seenIds.add(t.id);
      catalog.push({
        id: t.id,
        name: cleanName(common),
        sci_name: t.name,
        family: famName,
        group,
        habitat,
        region,
        photo: toS3Url(photoUrl),
        observations_count: r.count || t.observations_count || 100,
        countries
      });
    }

    await sleep(400);
  }

  console.log(`Catálogo de Aves compilado: ${catalog.length} especies.`);

  // Guardar en public/data/aves.json
  const avesPath = path.resolve(ROOT_DIR, 'public/data/aves.json');
  fs.writeFileSync(avesPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Guardado en: ${avesPath}`);

  // Guardar en dist/data/aves.json si existe dist
  const distPath = path.resolve(ROOT_DIR, 'dist/data/aves.json');
  if (fs.existsSync(path.dirname(distPath))) {
    fs.writeFileSync(distPath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`Sincronizado en: ${distPath}`);
  }
}

buildAvesCatalog().catch(err => {
  console.error('Error fatal al compilar catálogo de aves:', err);
  process.exit(1);
});
