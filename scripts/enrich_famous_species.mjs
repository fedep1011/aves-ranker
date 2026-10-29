import fs from 'node:fs';
import { getImageInfo } from './get_image_info.mjs';

const SPECIES_TO_ADD = {
  flores: [
    {
      sci: 'Bougainvillea glabra',
      name: 'Santa Rita (Buganvilla)',
      family: 'Nyctaginaceae',
      color: 'Fucsia / Violeta',
      usage: 'Ornamental trepadora',
      climate: 'Cálido / Templado',
      region: 'América del Sur',
      countries: ['Brasil', 'Argentina', 'Uruguay', 'México', 'Colombia', 'España']
    },
    {
      sci: 'Jasminum officinale',
      name: 'Jazmín común (Jazmín del país)',
      family: 'Oleaceae',
      color: 'Blanco',
      usage: 'Aromática ornamental',
      climate: 'Templado / Mediterráneo',
      region: 'Asia / Global',
      countries: ['España', 'Argentina', 'Uruguay', 'Italia', 'Francia']
    },
    {
      sci: 'Rosa gallica',
      name: 'Rosa de jardín (Rosa de Provenza)',
      family: 'Rosaceae',
      color: 'Rosa / Carmesí',
      usage: 'Ornamental y perfumería',
      climate: 'Templado',
      region: 'Europa / Global',
      countries: ['España', 'Francia', 'Italia', 'Argentina', 'Alemania']
    },
    {
      sci: 'Paeonia lactiflora',
      name: 'Peonía china',
      family: 'Paeoniaceae',
      color: 'Rosa / Blanco',
      usage: 'Ornamental de corte',
      climate: 'Templado / Frío',
      region: 'Asia oriental',
      countries: ['China', 'Japón', 'Estados Unidos', 'España']
    },
    {
      sci: 'Dahlia pinnata',
      name: 'Dalia de jardín',
      family: 'Asteraceae',
      color: 'Multicolor',
      usage: 'Flor nacional de México',
      climate: 'Templado',
      region: 'América del Norte / Centroamérica',
      countries: ['México', 'Colombia', 'España', 'Estados Unidos']
    },
    {
      sci: 'Chrysanthemum morifolium',
      name: 'Crisantemo de jardín',
      family: 'Asteraceae',
      color: 'Amarillo / Blanco / Violeta',
      usage: 'Ornamental y cultural',
      climate: 'Templado',
      region: 'Asia oriental',
      countries: ['Japón', 'China', 'España', 'Reino Unido']
    },
    {
      sci: 'Anthurium andraeanum',
      name: 'Anturio rojo (Flor de flamenco)',
      family: 'Araceae',
      color: 'Rojo escarlata',
      usage: 'Ornamental de interior',
      climate: 'Tropical húmedo',
      region: 'América tropical',
      countries: ['Colombia', 'Ecuador', 'Costa Rica', 'Brasil']
    },
    {
      sci: 'Camellia japonica',
      name: 'Camelia común',
      family: 'Theaceae',
      color: 'Rojo / Rosa / Blanco',
      usage: 'Ornamental noble',
      climate: 'Templado húmedo',
      region: 'Asia oriental',
      countries: ['Japón', 'China', 'España', 'Portugal']
    },
    {
      sci: 'Prunus serrulata',
      name: 'Sakura (Cerezo de flor japonés)',
      family: 'Rosaceae',
      color: 'Rosa pálido',
      usage: 'Flor nacional de Japón',
      climate: 'Templado',
      region: 'Asia oriental',
      countries: ['Japón', 'Corea', 'China', 'Estados Unidos']
    },
    {
      sci: 'Jacaranda mimosifolia',
      name: 'Jacarandá en flor',
      family: 'Bignoniaceae',
      color: 'Lila / Azul violáceo',
      usage: 'Árbol ornamental icónico',
      climate: 'Subtropical / Templado',
      region: 'América del Sur',
      countries: ['Argentina', 'Uruguay', 'Brasil', 'Bolivia', 'España']
    },
    {
      sci: 'Erythrina crista-galli',
      name: 'Ceibo (Flor nacional argentina y uruguaya)',
      family: 'Fabaceae',
      color: 'Rojo carmín',
      usage: 'Flor nacional rioplatense',
      climate: 'Templado / Húmedo',
      region: 'América del Sur',
      countries: ['Argentina', 'Uruguay', 'Brasil', 'Paraguay']
    },
    {
      sci: 'Handroanthus impetiginosus',
      name: 'Lapacho rosado',
      family: 'Bignoniaceae',
      color: 'Rosa intenso',
      usage: 'Árbol ornamental majestuoso',
      climate: 'Subtropical',
      region: 'América del Sur',
      countries: ['Paraguay', 'Argentina', 'Brasil', 'Bolivia']
    },
    {
      sci: 'Plumeria rubra',
      name: 'Plumeria (Frangipani)',
      family: 'Apocynaceae',
      color: 'Blanco y amarillo / Rosa',
      usage: 'Flores aromáticas de Hawái',
      climate: 'Tropical',
      region: 'América tropical / Polinesia',
      countries: ['México', 'Costa Rica', 'Estados Unidos', 'Tailandia']
    },
    {
      sci: 'Wisteria sinensis',
      name: 'Glicina china',
      family: 'Fabaceae',
      color: 'Lila / Lavanda',
      usage: 'Pérgolas floridas',
      climate: 'Templado',
      region: 'Asia oriental',
      countries: ['China', 'Japón', 'España', 'Argentina', 'Francia']
    },
    {
      sci: 'Clivia miniata',
      name: 'Clivia',
      family: 'Amaryllidaceae',
      color: 'Naranja intenso',
      usage: 'Ornamental de sombra',
      climate: 'Subtropical / Templado',
      region: 'África austral',
      countries: ['Sudáfrica', 'Argentina', 'España', 'Australia']
    },
    {
      sci: 'Pelargonium hortorum',
      name: 'Malvón (Geranio común)',
      family: 'Geraniaceae',
      color: 'Rojo / Fucsia / Salmón',
      usage: 'Flor de balcón clásica',
      climate: 'Templado',
      region: 'África austral / Global',
      countries: ['España', 'Argentina', 'Uruguay', 'Italia', 'Sudáfrica']
    },
    {
      sci: 'Euphorbia pulcherrima',
      name: 'Estrella federal (Flor de Pascua)',
      family: 'Euphorbiaceae',
      color: 'Rojo vivo',
      usage: 'Flor navideña tradicional',
      climate: 'Subtropical',
      region: 'América Central',
      countries: ['México', 'Guatemala', 'España', 'Estados Unidos', 'Argentina']
    },
    {
      sci: 'Cyclamen persicum',
      name: 'Ciclamen (Violeta de Persia)',
      family: 'Primulaceae',
      color: 'Rosa / Magenta / Blanco',
      usage: 'Floración invernal',
      climate: 'Templado fresco',
      region: 'Mediterráneo oriental',
      countries: ['España', 'Grecia', 'Italia', 'Turquía', 'Francia']
    },
    {
      sci: 'Gladiolus communis',
      name: 'Gladiolo silvestre',
      family: 'Iridaceae',
      color: 'Púrpura / Rosa',
      usage: 'Flor de corte y jardines',
      climate: 'Mediterráneo',
      region: 'Mediterráneo / Europa meridional',
      countries: ['España', 'Italia', 'Francia', 'Grecia']
    }
  ],
  mamiferos: [
    {
      sci: 'Pan troglodytes',
      name: 'Chimpancé común',
      family: 'Hominidae',
      group: 'Primates',
      habitat: 'Selva tropical y sabana',
      region: 'África',
      countries: ['Congo', 'Uganda', 'Tanzania', 'Gabón']
    },
    {
      sci: 'Pan paniscus',
      name: 'Bonobo (Chimpancé pigmeo)',
      family: 'Hominidae',
      group: 'Primates',
      habitat: 'Selvas húmedas del Congo',
      region: 'África',
      countries: ['República Democrática del Congo']
    },
    {
      sci: 'Suricata suricatta',
      name: 'Suricata',
      family: 'Herpestidae',
      group: 'Carnívoros',
      habitat: 'Desierto y sabana árida',
      region: 'África',
      countries: ['Sudáfrica', 'Namibia', 'Botsuana']
    },
    {
      sci: 'Vulpes zerda',
      name: 'Fénec (Zorro del desierto)',
      family: 'Canidae',
      group: 'Cánidos',
      habitat: 'Dunas del desierto',
      region: 'África',
      countries: ['Marruecos', 'Egipto', 'Argelia', 'Túnez']
    },
    {
      sci: 'Lycaon pictus',
      name: 'Licaón (Perro salvaje africano)',
      family: 'Canidae',
      group: 'Cánidos',
      habitat: 'Sabana abierta',
      region: 'África',
      countries: ['Tanzania', 'Botsuana', 'Kenia', 'Sudáfrica']
    },
    {
      sci: 'Canis dingo',
      name: 'Dingo australiano',
      family: 'Canidae',
      group: 'Cánidos',
      habitat: 'Matorrales y desierto australiano',
      region: 'Oceanía',
      countries: ['Australia']
    },
    {
      sci: 'Lemur catta',
      name: 'Lémur de cola anillada',
      family: 'Lemuridae',
      group: 'Primates',
      habitat: 'Bosques secos y espinosos',
      region: 'África',
      countries: ['Madagascar']
    }
  ],
  aves: [
    {
      sci: 'Rupicola peruvianus',
      name: 'Gallito de las rocas (Ave nacional del Perú)',
      family: 'Cotingidae',
      group: 'Aves de bosque',
      habitat: 'Bosques de neblina andinos',
      region: 'América del Sur',
      countries: ['Perú', 'Colombia', 'Ecuador', 'Bolivia']
    },
    {
      sci: 'Phoenicopterus ruber',
      name: 'Flamenco del Caribe (Flamenco rojo)',
      family: 'Phoenicopteridae',
      group: 'Aves acuáticas',
      habitat: 'Lagunas salobres y costas',
      region: 'América',
      countries: ['México', 'Cuba', 'Bahamas', 'Colombia', 'Venezuela']
    },
    {
      sci: 'Opisthocomus hoazin',
      name: 'Hoatzín (Pájaro dinosaurio)',
      family: 'Opisthocomidae',
      group: 'Aves tropicales',
      habitat: 'Pantanos y riberas amazónicas',
      region: 'América del Sur',
      countries: ['Brasil', 'Perú', 'Colombia', 'Venezuela']
    },
    {
      sci: 'Ensifera ensifera',
      name: 'Colibrí pico espada',
      family: 'Trochilidae',
      group: 'Colibríes',
      habitat: 'Bosques altos andinos',
      region: 'América del Sur',
      countries: ['Colombia', 'Ecuador', 'Perú', 'Bolivia']
    },
    {
      sci: 'Haliaeetus vocifer',
      name: 'Pigargo vocinglero (Águila pescadora africana)',
      family: 'Accipitridae',
      group: 'Rapaces',
      habitat: 'Lagos y ríos africanos',
      region: 'África',
      countries: ['Kenia', 'Uganda', 'Tanzania', 'Sudáfrica', 'Botsuana']
    },
    {
      sci: 'Anodorhynchus hyacinthinus',
      name: 'Guacamayo Jacinto',
      family: 'Psittacidae',
      group: 'Loros y guacamayos',
      habitat: 'Pantanal y palmerales',
      region: 'América del Sur',
      countries: ['Brasil', 'Bolivia', 'Paraguay']
    },
    {
      sci: 'Buceros rhinoceros',
      name: 'Cálao rinoceronte',
      family: 'Bucerotidae',
      group: 'Aves tropicales',
      habitat: 'Selvas tropicales primarias',
      region: 'Asia',
      countries: ['Indonesia', 'Malasia', 'Tailandia']
    },
    {
      sci: 'Aix galericulata',
      name: 'Pato mandarín',
      family: 'Anatidae',
      group: 'Aves acuáticas',
      habitat: 'Lagos boscosos',
      region: 'Asia oriental',
      countries: ['Japón', 'China', 'Rusia', 'Reino Unido']
    }
  ]
};

async function fetchBestLandscapePhoto(scientificName) {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&locale=es`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const taxon = data.results?.[0];
    if (!taxon) return null;

    const candidates = [];
    if (taxon.default_photo?.medium_url) {
      candidates.push(taxon.default_photo.medium_url);
    }

    // Also fetch observations to find guaranteed landscape photos
    const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&quality_grade=research&photos=true&per_page=8&order_by=votes`;
    const obsRes = await fetch(obsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (obsRes.ok) {
      const obsData = await obsRes.json();
      for (const o of obsData.results || []) {
        for (const p of o.photos || []) {
          const u = p.url?.replace('square.', 'medium.');
          if (u && !candidates.includes(u)) candidates.push(u);
        }
      }
    }

    // Check sizes to find the best landscape photo
    let bestPhoto = null;
    for (const cUrl of candidates) {
      const info = await getImageInfo(cUrl);
      if (info && info.isLandscape && info.aspectRatio >= 1.25) {
        bestPhoto = { url: cUrl, width: info.width, height: info.height, aspectRatio: info.aspectRatio, candidates };
        break;
      }
    }

    if (!bestPhoto && candidates.length > 0) {
      bestPhoto = { url: candidates[0], width: 500, height: 375, aspectRatio: 1.33, candidates };
    }

    return {
      taxonId: taxon.id,
      obsCount: taxon.observations_count || 1000,
      photo: bestPhoto?.url,
      candidates: bestPhoto?.candidates || []
    };
  } catch (err) {
    console.error(`Error fetching ${scientificName}:`, err.message);
    return null;
  }
}

async function enrichCategory(catName) {
  console.log(`\n========================================`);
  console.log(`Enriqueciendo ${catName.toUpperCase()} con especies famosas...`);
  console.log(`========================================`);

  const filePath = `public/data/${catName}.json`;
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const toAdd = SPECIES_TO_ADD[catName] || [];

  const candidatesCachePath = `public/data/curation_candidates_${catName}.json`;
  let candidatesCache = {};
  if (fs.existsSync(candidatesCachePath)) {
    candidatesCache = JSON.parse(fs.readFileSync(candidatesCachePath, 'utf8'));
  }

  const existingSci = new Set(items.map(x => (x.sci_name || '').toLowerCase()));
  const existingNames = new Set(items.map(x => (x.name || '').toLowerCase()));

  const addedItems = [];

  for (const spec of toAdd) {
    if (existingSci.has(spec.sci.toLowerCase())) {
      console.log(`  [EXISTE] ${spec.name} (${spec.sci})`);
      continue;
    }

    console.log(`  -> Buscando en iNaturalist: ${spec.name} (${spec.sci})...`);
    const fetched = await fetchBestLandscapePhoto(spec.sci);
    if (!fetched || !fetched.photo) {
      console.log(`     ⚠️ No se pudo obtener foto válida para ${spec.sci}`);
      continue;
    }

    // Generate unique ID
    const newId = fetched.taxonId || (Date.now() + Math.floor(Math.random() * 1000));

    const newItem = {
      id: newId,
      name: spec.name,
      sci_name: spec.sci,
      family: spec.family || '',
      ...(spec.color ? { color: spec.color } : {}),
      ...(spec.usage ? { usage: spec.usage } : {}),
      ...(spec.group ? { group: spec.group } : {}),
      ...(spec.habitat ? { habitat: spec.habitat } : {}),
      ...(spec.climate ? { climate: spec.climate } : {}),
      region: spec.region || 'Global',
      countries: spec.countries || [],
      photo: fetched.photo,
      observations_count: fetched.obsCount,
      curated: true,
      curated_source: 'enriched_master'
    };

    addedItems.push(newItem);

    if (fetched.candidates?.length) {
      candidatesCache[String(newId)] = fetched.candidates;
    }

    console.log(`     ✓ Agregado #${newId}: ${newItem.name} [${newItem.photo.slice(0, 55)}...]`);
  }

  if (addedItems.length > 0) {
    // Put newly added famous curated items right after the top 16 so they are immediately accessible
    const first16 = items.slice(0, 16);
    const rest = items.slice(16);
    const updated = [...first16, ...addedItems, ...rest];

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
    fs.writeFileSync(candidatesCachePath, JSON.stringify(candidatesCache, null, 2), 'utf8');
    console.log(`\n✓ ${catName}: Se agregaron ${addedItems.length} nuevas especies famosas. Total ahora: ${updated.length}`);
  } else {
    console.log(`\n✓ ${catName}: Todas las especies de la lista ya existían.`);
  }
}

async function run() {
  await enrichCategory('flores');
  await enrichCategory('mamiferos');
  await enrichCategory('aves');
  console.log('\n========================================');
  console.log('¡Enriquecimiento completado con éxito!');
  console.log('========================================');
}

run().catch(console.error);
