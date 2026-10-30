/**
 * Core Territory Hierarchy Engine — Rankea2
 *
 * Implements geographic inheritance (País -> Subregión -> Continente -> Global)
 * guaranteeing queries for specific countries (Uruguay, Chile, Nueva Zelanda, Japón, etc.)
 * return accurate, representative, authentic results without continental score inflation.
 */

export function normalizePlace(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const MACRO_REGIONS = new Set([
  'america',
  'sudamerica',
  'america del sur',
  'latinoamerica',
  'norteamerica',
  'america del norte',
  'centroamerica',
  'europa',
  'asia',
  'africa',
  'oceania',
  'polar',
  'antartida',
  'artico',
  'global',
  'todo el mundo',
  'all'
]);

export const TERRITORY_MAP = {
  // Cono Sur & Sudamérica
  'uruguay': {
    region: 'América',
    subregion: 'Cono Sur',
    aliases: ['uruguay', 'cono sur', 'rio de la plata', 'pampa']
  },
  'argentina': {
    region: 'América',
    subregion: 'Cono Sur',
    aliases: ['argentina', 'cono sur', 'patagonia', 'pampa', 'chaco']
  },
  'chile': {
    region: 'América',
    subregion: 'Cono Sur',
    aliases: ['chile', 'chileno', 'chilena', 'cono sur', 'patagonia', 'andes']
  },
  'brasil': {
    region: 'América',
    subregion: 'Amazonia',
    aliases: ['brasil', 'brazil', 'amazonia', 'pantanal', 'cerrado', 'mata atlantica']
  },
  'peru': {
    region: 'América',
    subregion: 'Andes',
    aliases: ['peru', 'andes', 'amazonia', 'costa pacifica']
  },
  'colombia': {
    region: 'América',
    subregion: 'Andes',
    aliases: ['colombia', 'andes', 'amazonia', 'caribe', 'pacifico']
  },
  'paraguay': {
    region: 'América',
    subregion: 'Chaco',
    aliases: ['paraguay', 'chaco', 'pantanal', 'cuenca del plata']
  },
  'bolivia': {
    region: 'América',
    subregion: 'Andes',
    aliases: ['bolivia', 'andes', 'chaco', 'amazonia', 'altiplano']
  },
  'ecuador': {
    region: 'América',
    subregion: 'Andes',
    aliases: ['ecuador', 'galapagos', 'andes', 'amazonia']
  },
  'venezuela': {
    region: 'América',
    subregion: 'Llanos',
    aliases: ['venezuela', 'llanos', 'caribe', 'amazonia', 'guayana']
  },
  'sudamerica': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['sudamerica', 'america del sur']
  },
  'latinoamerica': {
    region: 'América',
    subregion: 'Latinoamérica',
    aliases: ['latinoamerica', 'sudamerica', 'centroamerica']
  },

  // Norteamérica & Centroamérica
  'mexico': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['mexico']
  },
  'estados unidos': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['estados unidos', 'usa', 'eeuu', 'norteamerica']
  },
  'canada': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['canada', 'artico', 'norteamerica']
  },
  'costa rica': {
    region: 'América',
    subregion: 'Centroamérica',
    aliases: ['costa rica', 'centroamerica']
  },

  // Europa
  'espana': {
    region: 'Europa',
    subregion: 'Europa Occidental',
    aliases: ['espana', 'peninsula iberica', 'mediterraneo']
  },
  'francia': {
    region: 'Europa',
    subregion: 'Europa Occidental',
    aliases: ['francia']
  },
  'italia': {
    region: 'Europa',
    subregion: 'Europa del Sur',
    aliases: ['italia', 'mediterraneo']
  },
  'reino unido': {
    region: 'Europa',
    subregion: 'Europa',
    aliases: ['reino unido', 'uk', 'gran bretana', 'inglaterra', 'escocia']
  },
  'alemania': {
    region: 'Europa',
    subregion: 'Europa Central',
    aliases: ['alemania']
  },
  'europa': {
    region: 'Europa',
    subregion: 'Europa',
    aliases: ['europa', 'eurasia']
  },

  // Asia
  'japon': {
    region: 'Asia',
    subregion: 'Asia Oriental',
    aliases: ['japon', 'japan', 'asia oriental']
  },
  'china': {
    region: 'Asia',
    subregion: 'Asia Oriental',
    aliases: ['china', 'asia oriental']
  },
  'india': {
    region: 'Asia',
    subregion: 'Asia del Sur',
    aliases: ['india', 'subcontinente indio']
  },
  'rusia': {
    region: 'Asia',
    subregion: 'Eurasia',
    aliases: ['rusia', 'siberia', 'eurasia']
  },
  'asia': {
    region: 'Asia',
    subregion: 'Asia',
    aliases: ['asia', 'eurasia']
  },

  // Oceanía & Australasia
  'nueva zelanda': {
    region: 'Oceanía',
    subregion: 'Australasia',
    aliases: ['nueva zelanda', 'new zealand', 'australasia']
  },
  'australia': {
    region: 'Oceanía',
    subregion: 'Australasia',
    aliases: ['australia', 'australasia']
  },
  'oceania': {
    region: 'Oceanía',
    subregion: 'Oceanía',
    aliases: ['oceania', 'australasia', 'pacifico']
  },

  // África
  'sudafrica': {
    region: 'África',
    subregion: 'África Austral',
    aliases: ['sudafrica', 'africa austral']
  },
  'kenia': {
    region: 'África',
    subregion: 'África Oriental',
    aliases: ['kenia', 'sabana']
  },
  'madagascar': {
    region: 'África',
    subregion: 'Madagascar',
    aliases: ['madagascar']
  },
  'africa': {
    region: 'África',
    subregion: 'África',
    aliases: ['africa']
  },

  // Polar
  'antartida': {
    region: 'Polar',
    subregion: 'Antártida',
    aliases: ['antartida', 'polo sur']
  },
  'artico': {
    region: 'Polar',
    subregion: 'Ártico',
    aliases: ['artico', 'polo norte']
  },
  'polar': {
    region: 'Polar',
    subregion: 'Polar',
    aliases: ['polar', 'antartida', 'artico']
  }
};

/**
 * Evaluates whether a candidate matches a set of selected places,
 * applying geographic inheritance (exact match -> regional match -> continental match).
 *
 * @param {Object} candidate - Item from dataset (must have `region` and/or `countries`)
 * @param {Array<string>} selectedPlaceKeys - Array of raw or normalized place keys
 * @returns {{ matches: boolean, score: number }}
 *   score 3: exact country / direct place match
 *   score 2: subregional/alias/biome match
 *   score 1: continental fallback match
 *   score 0: no match
 */
export function matchTerritory(candidate, selectedPlaceKeys) {
  if (!selectedPlaceKeys || selectedPlaceKeys.length === 0) {
    return { matches: true, score: 3 };
  }

  const candRegion = normalizePlace(candidate.region || '');
  const candCountries = Array.isArray(candidate.countries)
    ? candidate.countries.map(normalizePlace)
    : [];

  let bestScore = 0;

  for (const rawKey of selectedPlaceKeys) {
    const key = normalizePlace(rawKey);
    if (!key || key === 'todo el mundo' || key === 'global' || key === 'all') {
      return { matches: true, score: 3 };
    }

    const tInfo = TERRITORY_MAP[key];

    // 1. Direct country / territory tag match
    if (candCountries.includes(key)) {
      bestScore = Math.max(bestScore, 3);
      continue;
    }

    // 2. Direct region match (when user chose a continent or broad region)
    if (candRegion === key) {
      bestScore = Math.max(bestScore, 3);
      continue;
    }

    // 3. Hierarchical inheritance via aliases & subregions
    if (tInfo) {
      // Subregion / biome match (e.g. cono sur, patagonia, andes, chaco)
      // Must not be a macro-region to avoid continental score inflation
      const aliasMatch = tInfo.aliases.some(alias => !MACRO_REGIONS.has(alias) && candCountries.includes(alias));
      if (aliasMatch) {
        bestScore = Math.max(bestScore, 2);
        continue;
      }

      const tSubNorm = normalizePlace(tInfo.subregion || '');
      if (tSubNorm && !MACRO_REGIONS.has(tSubNorm) && candCountries.includes(tSubNorm)) {
        bestScore = Math.max(bestScore, 2);
        continue;
      }

      // Continental fallback (Score 1)
      const tRegionNorm = normalizePlace(tInfo.region || '');
      if (
        candRegion === tRegionNorm ||
        candCountries.includes(tRegionNorm) ||
        (tSubNorm && MACRO_REGIONS.has(tSubNorm) && candCountries.includes(tSubNorm))
      ) {
        bestScore = Math.max(bestScore, 1);
        continue;
      }
    } else {
      // Unknown place fallback: simple substring search in countries
      if (candCountries.some(c => c.includes(key))) {
        bestScore = Math.max(bestScore, 3);
      } else if (candRegion.includes(key)) {
        bestScore = Math.max(bestScore, 1);
      }
    }
  }

  return { matches: bestScore > 0, score: bestScore };
}

/**
 * Filters a pool by territory with hierarchical inheritance,
 * guaranteeing at least minResults candidates whenever possible
 * without flooding country queries with the entire continental pool.
 */
export function filterCandidatesByTerritory(pool, selectedPlaceKeys, minResults = 16) {
  if (!selectedPlaceKeys || selectedPlaceKeys.length === 0) {
    return [...pool];
  }

  const keys = selectedPlaceKeys.map(normalizePlace).filter(k => k && k !== 'todo el mundo' && k !== 'global' && k !== 'all');
  if (keys.length === 0) return [...pool];

  // Check if any queried key is an explicit continent or macro-region
  const isDirectMacroQuery = keys.some(k => MACRO_REGIONS.has(k));

  const scored = pool
    .map(item => ({ item, ...matchTerritory(item, keys) }))
    .filter(res => res.matches);

  // If the user explicitly searched for a macro-region (e.g. Sudamérica, Europa, Asia, Todo el mundo), return all matches
  if (isDirectMacroQuery) {
    return scored.map(s => s.item);
  }

  // --- COUNTRY / SPECIFIC PLACE QUERY ---
  // Pass 1: exact matches (score 3)
  const exact = scored.filter(s => s.score === 3).map(s => s.item);
  if (exact.length >= minResults) {
    return exact;
  }

  // Pass 2: exact + subregional matches (score >= 2)
  const subregional = scored.filter(s => s.score >= 2).map(s => s.item);
  if (subregional.length >= minResults) {
    return subregional;
  }

  // Pass 3: continental fallback (fill up to minResults without flooding)
  const base = subregional.length > 0 ? subregional : exact;
  const baseIds = new Set(base.map(b => b.id));
  const continentalFill = scored.filter(s => s.score === 1 && !baseIds.has(s.item.id)).map(s => s.item);
  const needed = Math.max(0, minResults - base.length);
  const result = [...base, ...continentalFill.slice(0, needed)];
  if (result.length >= minResults) {
    return result;
  }

  return pool.slice(0, minResults);
}
