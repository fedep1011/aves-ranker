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

async function fetchMammals() {
  console.log('\n--- 1. Extrayendo Familias y Órdenes de Mamíferos ---');
  const famRes = await fetch('https://api.inaturalist.org/v1/taxa?taxon_id=40151&rank=family&per_page=200');
  const famData = await famRes.json();
  const famMap = new Map();
  famData.results.forEach(f => famMap.set(f.id, f.name));

  const ordRes = await fetch('https://api.inaturalist.org/v1/taxa?taxon_id=40151&rank=order&per_page=50');
  const ordData = await ordRes.json();
  const ordMap = new Map();
  ordData.results.forEach(o => ordMap.set(o.id, o.name));

  console.log(`Cargadas ${famMap.size} familias y ${ordMap.size} órdenes de mamíferos.`);

  function classifyMammal(taxon, famName, ordName) {
    let group = 'Otros Mamíferos';
    let habitat = 'Terrestre';
    let region = 'Global';

    // 1. Grupo Canónico
    if (famName === 'Felidae') {
      group = 'Felinos';
    } else if (famName === 'Canidae') {
      group = 'Cánidos y Zorros';
    } else if (famName === 'Ursidae') {
      group = 'Osos';
    } else if (['Mustelidae', 'Mephitidae', 'Procyonidae', 'Ailuridae'].includes(famName)) {
      group = 'Mustélidos y Carnívoros';
    } else if (ordName === 'Primates' || ['Hominidae', 'Cercopithecidae', 'Cebidae', 'Atelidae', 'Lemuridae'].includes(famName)) {
      group = 'Primates y Simios';
      habitat = 'Arbóreo / Selva';
    } else if (
      ['Delphinidae', 'Phocoenidae', 'Balaenopteridae', 'Balaenidae', 'Physeteridae', 'Monodontidae', 'Ziphiidae', 'Phocidae', 'Otariidae', 'Odobenidae', 'Trichechidae', 'Dugongidae'].includes(famName) ||
      ordName === 'Sirenia'
    ) {
      group = 'Cetáceos y Marinos';
      habitat = 'Marino / Costero';
    } else if (['Cervidae', 'Bovidae', 'Equidae', 'Giraffidae', 'Camelidae', 'Suidae', 'Tapiridae', 'Rhinocerotidae', 'Hippopotamidae', 'Antilocapridae'].includes(famName) || ordName === 'Artiodactyla' || ordName === 'Perissodactyla') {
      group = 'Herbívoros y Ungulados';
    } else if (ordName === 'Proboscidea' || famName === 'Elephantidae') {
      group = 'Herbívoros y Ungulados';
    } else if (ordName === 'Rodentia' || famName === 'Sciuridae' || famName === 'Cricetidae' || famName === 'Muridae' || famName === 'Castoridae') {
      group = 'Roedores';
    } else if (ordName === 'Lagomorpha' || famName === 'Leporidae') {
      group = 'Conejos y Liebres';
    } else if (ordName === 'Chiroptera' || ['Vespertilionidae', 'Phyllostomidae', 'Pteropodidae'].includes(famName)) {
      group = 'Murciélagos';
      habitat = 'Aéreo';
    } else if (['Diprotodontia', 'Dasyuromorphia', 'Didelphimorphia', 'Peramelemorphia', 'Monotremata'].includes(ordName)) {
      group = 'Marsupiales y Monotremas';
    } else if (['Cingulata', 'Pilosa'].includes(ordName)) {
      group = 'Desdentados y Perezosos';
    }

    // Habitat overrides
    const lowerName = (taxon.preferred_common_name + ' ' + taxon.name).toLowerCase();
    if (lowerName.includes('polar') || lowerName.includes('ártic') || lowerName.includes('nival') || lowerName.includes('marítimo') || taxon.name === 'Ursus maritimus') {
      habitat = 'Polar / Glaciar';
      region = 'Polar';
    } else if (lowerName.includes('marina') || lowerName.includes('marino') || lowerName.includes('foca') || lowerName.includes('delfín') || lowerName.includes('ballena')) {
      habitat = 'Marino / Costero';
    } else if (lowerName.includes('arbóreo') || lowerName.includes('mono') || lowerName.includes('lémur') || lowerName.includes('perezoso') || lowerName.includes('ardilla')) {
      if (habitat !== 'Marino / Costero' && habitat !== 'Aéreo') habitat = 'Arbóreo / Selva';
    }

    // Región heurística
    if (region === 'Global') {
      if (lowerName.includes('américa') || lowerName.includes('carolina') || lowerName.includes('andino') || lowerName.includes('amazón') || lowerName.includes('patag') || lowerName.includes('mexic') || lowerName.includes('chileno') || lowerName.includes('brasile') || lowerName.includes('canadiense') || lowerName.includes('norteamerican')) {
        region = 'América';
      } else if (lowerName.includes('áfrica') || lowerName.includes('africano') || lowerName.includes('kalahari') || lowerName.includes('congo') || lowerName.includes('madagascar') || famName === 'Giraffidae' || famName === 'Hippopotamidae') {
        region = 'África';
      } else if (lowerName.includes('asia') || lowerName.includes('asiático') || lowerName.includes('bengala') || lowerName.includes('siberia') || lowerName.includes('japon') || lowerName.includes('china') || lowerName.includes('india') || lowerName.includes('himalaya')) {
        region = 'Asia';
      } else if (lowerName.includes('europa') || lowerName.includes('europeo') || lowerName.includes('ibérico') || lowerName.includes('alpes')) {
        region = 'Europa';
      } else if (lowerName.includes('australi') || lowerName.includes('tasmania') || lowerName.includes('canguro') || lowerName.includes('koala') || ordName === 'Monotremata' || ordName === 'Diprotodontia') {
        region = 'Oceanía';
      } else {
        region = 'América'; // Default predominante en iNat research grade
      }
    }

    return { group, habitat, region };
  }

  console.log('--- 2. Descargando Especies de Mamíferos desde iNaturalist ---');
  const speciesList = [];
  const seenSci = new Set();

  for (let page = 1; page <= 10; page++) {
    console.log(`Descargando página ${page}/10 de mamíferos...`);
    const res = await fetch(`https://api.inaturalist.org/v1/observations/species_counts?taxon_id=40151&quality_grade=research&locale=es&preferred_place_id=7259&per_page=500&page=${page}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      const t = r.taxon;
      if (!t || !t.id || !t.name) continue;
      if (seenSci.has(t.name)) continue;

      const common = t.preferred_common_name;
      const photoUrl = t.default_photo?.medium_url;

      // Validación estricta: nombre en español distinto al nombre científico, y foto válida
      if (!common || common.toLowerCase() === t.name.toLowerCase() || !photoUrl) continue;

      // Buscar familia y orden
      const famId = (t.ancestor_ids || []).find(id => famMap.has(id));
      const famName = famId ? famMap.get(famId) : 'Mammalia';

      const ordId = (t.ancestor_ids || []).find(id => ordMap.has(id));
      const ordName = ordId ? ordMap.get(ordId) : 'Mammalia';

      const { group, habitat, region } = classifyMammal(t, famName, ordName);

      seenSci.add(t.name);
      speciesList.push({
        id: t.id,
        name: cleanName(common),
        sci_name: t.name,
        family: famName,
        group,
        habitat,
        region,
        photo: toS3Url(photoUrl),
        observations_count: r.count || t.observations_count || 10
      });
    }

    await sleep(350);
  }

  console.log(`Mamíferos procesados con éxito: ${speciesList.length} especies.`);
  return speciesList;
}

async function fetchFlowers() {
  console.log('\n--- 3. Extrayendo Familias de Flores (Angiospermas) ---');
  const famRes = await fetch('https://api.inaturalist.org/v1/taxa?taxon_id=47125&rank=family&per_page=500');
  const famData = await famRes.json();
  const famMap = new Map();
  famData.results.forEach(f => famMap.set(f.id, f.name));

  console.log(`Cargadas ${famMap.size} familias botánicas.`);

  // Familias con floración destacada / ornamental / silvestre colorida
  const EXCLUDED_NON_FLOWER_FAMILIES = new Set([
    'Poaceae', 'Cyperaceae', 'Juncaceae', 'Fagaceae', 'Betulaceae', 'Pinaceae', 'Cupressaceae', 'Salicaceae', 'Juglandaceae'
  ]);

  function classifyFlower(taxon, famName) {
    let color = 'Blanco';
    let usage = 'Silvestre de campo';
    let climate = 'Templado';
    let region = 'Global';

    const lower = (taxon.preferred_common_name + ' ' + taxon.name).toLowerCase();

    // 1. Color de Flor
    if (
      lower.includes('amarill') || lower.includes('dorad') || lower.includes('oro') ||
      lower.includes('lutea') || lower.includes('aurea') || lower.includes('girasol') ||
      lower.includes('diente de león') || lower.includes('mimosa') || lower.includes('caléndula') ||
      lower.includes('naranj') || lower.includes('aurantiaca')
    ) {
      color = 'Amarillo / Naranja';
    } else if (
      lower.includes('roj') || lower.includes('carmes') || lower.includes('escarlat') ||
      lower.includes('rubra') || lower.includes('coccinea') || lower.includes('rosad') ||
      lower.includes('rosa') || lower.includes('roseus') || lower.includes('cerezo') ||
      lower.includes('amapola') || lower.includes('clavel') || lower.includes('dalia')
    ) {
      color = 'Rojo / Rosa';
    } else if (
      lower.includes('azul') || lower.includes('caerulea') || lower.includes('violet') ||
      lower.includes('lila') || lower.includes('púrpur') || lower.includes('purpurea') ||
      lower.includes('lavanda') || lower.includes('hortensia') || lower.includes('campanilla') ||
      lower.includes('iris') || lower.includes('jacinto')
    ) {
      color = 'Azul / Violeta';
    } else if (famName === 'Orchidaceae' || famName === 'Passifloraceae' || lower.includes('paraíso') || lower.includes('orquídea')) {
      color = 'Multicolor / Exótica';
    } else {
      color = 'Blanco';
    }

    // 2. Entorno y Uso
    if (
      famName === 'Nymphaeaceae' || famName === 'Nelumbonaceae' || famName === 'Pontederiaceae' ||
      lower.includes('loto') || lower.includes('nenúfar') || lower.includes('acuátic') || lower.includes('agua')
    ) {
      usage = 'Acuática / Loto';
    } else if (
      famName === 'Lamiaceae' || famName === 'Apiaceae' ||
      lower.includes('lavanda') || lower.includes('menta') || lower.includes('romero') ||
      lower.includes('tomillo') || lower.includes('salvia') || lower.includes('manzanilla') ||
      lower.includes('albahaca') || lower.includes('árnica') || lower.includes('medicinal')
    ) {
      usage = 'Aromática y Medicinal';
    } else if (
      famName === 'Orchidaceae' || famName === 'Bromeliaceae' || famName === 'Heliconiaceae' ||
      famName === 'Zingiberaceae' || famName === 'Passifloraceae' || famName === 'Gesneriaceae' ||
      famName === 'Begoniaceae' || lower.includes('selva') || lower.includes('tropical')
    ) {
      usage = 'Selva Tropical';
      climate = 'Tropical';
    } else if (
      famName === 'Rosaceae' || famName === 'Paeoniaceae' || famName === 'Hydrangeaceae' ||
      famName === 'Liliaceae' || famName === 'Iridaceae' || famName === 'Amaryllidaceae' ||
      lower.includes('jardín') || lower.includes('ornamental') || lower.includes('peonía') ||
      lower.includes('hortensia') || lower.includes('tulipán') || lower.includes('rosa')
    ) {
      usage = 'Jardín Ornamental';
    } else {
      usage = 'Silvestre de campo';
    }

    // 3. Clima y Región
    if (famName === 'Cactaceae' || famName === 'Crassulaceae' || famName === 'Aizoaceae' || famName === 'Agavaceae') {
      climate = 'Árido / Desértico';
    } else if (famName === 'Lamiaceae' || famName === 'Cistaceae' || lower.includes('mediterrán')) {
      climate = 'Mediterráneo';
    } else if (usage === 'Selva Tropical') {
      climate = 'Tropical';
    } else {
      climate = 'Templado';
    }

    if (lower.includes('américa') || lower.includes('mexic') || lower.includes('amazón') || lower.includes('andina') || lower.includes('patagon')) {
      region = 'América';
    } else if (lower.includes('asia') || lower.includes('chin') || lower.includes('japón') || lower.includes('oriental') || lower.includes('sakura')) {
      region = 'Asia';
    } else if (lower.includes('europa') || lower.includes('mediterrán') || lower.includes('ibéric')) {
      region = 'Europa';
    } else if (lower.includes('áfrica') || lower.includes('africana') || lower.includes('madagascar') || lower.includes('paraíso')) {
      region = 'África';
    } else if (lower.includes('australia')) {
      region = 'Oceanía';
    } else {
      region = 'América';
    }

    return { color, usage, climate, region };
  }

  console.log('--- 4. Descargando Especies de Flores desde iNaturalist ---');
  const speciesList = [];
  const seenSci = new Set();

  // Descargar hasta 8 páginas (4.000 especies evaluadas)
  for (let page = 1; page <= 8; page++) {
    console.log(`Descargando página ${page}/8 de flores...`);
    const res = await fetch(`https://api.inaturalist.org/v1/observations/species_counts?taxon_id=47125&quality_grade=research&locale=es&preferred_place_id=7259&per_page=500&page=${page}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) break;

    for (const r of data.results) {
      const t = r.taxon;
      if (!t || !t.id || !t.name) continue;
      if (seenSci.has(t.name)) continue;

      const common = t.preferred_common_name;
      const photoUrl = t.default_photo?.medium_url;

      // Validación estricta
      if (!common || common.toLowerCase() === t.name.toLowerCase() || !photoUrl) continue;

      const famId = (t.ancestor_ids || []).find(id => famMap.has(id));
      const famName = famId ? famMap.get(famId) : 'Magnoliophyta';

      // Filtrar pastos y árboles maderables sin valor floral
      if (EXCLUDED_NON_FLOWER_FAMILIES.has(famName)) continue;

      const { color, usage, climate, region } = classifyFlower(t, famName);

      seenSci.add(t.name);
      speciesList.push({
        id: t.id,
        name: cleanName(common),
        sci_name: t.name,
        family: famName,
        color,
        usage,
        climate,
        region,
        photo: toS3Url(photoUrl),
        observations_count: r.count || t.observations_count || 10
      });
    }

    await sleep(350);
  }

  console.log(`Flores procesadas con éxito: ${speciesList.length} especies.`);
  return speciesList;
}

async function main() {
  console.log('=== Generador de Catálogos Masivos de Naturaleza para Rankea2 ===');
  
  const mammals = await fetchMammals();
  const flowers = await fetchFlowers();

  const mamiferosPath = path.resolve(ROOT_DIR, 'public/data/mamiferos.json');
  const floresPath = path.resolve(ROOT_DIR, 'public/data/flores.json');

  fs.writeFileSync(mamiferosPath, JSON.stringify(mammals, null, 2), 'utf8');
  console.log(`\nGuardado catálogo de mamíferos en: ${mamiferosPath} (${mammals.length} especies)`);

  fs.writeFileSync(floresPath, JSON.stringify(flowers, null, 2), 'utf8');
  console.log(`Guardado catálogo de flores en: ${floresPath} (${flowers.length} especies)`);

  console.log('\n¡Extracción y generación completada con éxito!');
}

main().catch(err => {
  console.error('Error fatal durante la generación:', err);
  process.exit(1);
});
