/**
 * Core Territory Hierarchy Engine — Rankea2
 *
 * Implements geographic inheritance (País -> Subregión -> Continente -> Global)
 * guaranteeing queries for specific countries (Uruguay, Nueva Zelanda, Japón, etc.)
 * never return 0 or sparse results.
 */

export function normalizePlace(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const TERRITORY_MAP = {
  // Cono Sur & Sudamérica
  'uruguay': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['uruguay', 'cono sur', 'rio de la plata', 'sudamerica', 'latinoamerica', 'america']
  },
  'argentina': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['argentina', 'cono sur', 'patagonia', 'pampa', 'sudamerica', 'latinoamerica', 'america']
  },
  'chile': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['chile', 'cono sur', 'patagonia', 'andes', 'sudamerica', 'latinoamerica', 'america']
  },
  'brasil': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['brasil', 'brazil', 'amazonia', 'pantanal', 'sudamerica', 'latinoamerica', 'america']
  },
  'peru': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['peru', 'andes', 'amazonia', 'sudamerica', 'latinoamerica', 'america']
  },
  'colombia': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['colombia', 'andes', 'amazonia', 'sudamerica', 'latinoamerica', 'america']
  },
  'paraguay': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['paraguay', 'chaco', 'sudamerica', 'latinoamerica', 'america']
  },
  'bolivia': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['bolivia', 'andes', 'chaco', 'amazonia', 'sudamerica', 'latinoamerica', 'america']
  },
  'ecuador': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['ecuador', 'galapagos', 'andes', 'sudamerica', 'latinoamerica', 'america']
  },
  'venezuela': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['venezuela', 'llanos', 'caribe', 'sudamerica', 'latinoamerica', 'america']
  },
  'sudamerica': {
    region: 'América',
    subregion: 'Sudamérica',
    aliases: ['sudamerica', 'latinoamerica', 'america del sur', 'america']
  },
  'latinoamerica': {
    region: 'América',
    subregion: 'Latinoamérica',
    aliases: ['latinoamerica', 'sudamerica', 'centroamerica', 'mexico', 'america']
  },

  // Norteamérica & Centroamérica
  'mexico': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['mexico', 'latinoamerica', 'centroamerica', 'norteamerica', 'america']
  },
  'estados unidos': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['estados unidos', 'usa', 'eeuu', 'norteamerica', 'america']
  },
  'canada': {
    region: 'América',
    subregion: 'Norteamérica',
    aliases: ['canada', 'artico', 'norteamerica', 'america']
  },
  'costa rica': {
    region: 'América',
    subregion: 'Centroamérica',
    aliases: ['costa rica', 'centroamerica', 'latinoamerica', 'america']
  },

  // Europa
  'espana': {
    region: 'Europa',
    subregion: 'Europa Occidental',
    aliases: ['espana', 'peninsula iberica', 'mediterraneo', 'europa']
  },
  'francia': {
    region: 'Europa',
    subregion: 'Europa Occidental',
    aliases: ['francia', 'europa']
  },
  'italia': {
    region: 'Europa',
    subregion: 'Europa del Sur',
    aliases: ['italia', 'mediterraneo', 'europa']
  },
  'reino unido': {
    region: 'Europa',
    subregion: 'Europa',
    aliases: ['reino unido', 'uk', 'gran bretana', 'inglaterra', 'escocia', 'europa']
  },
  'alemania': {
    region: 'Europa',
    subregion: 'Europa Central',
    aliases: ['alemania', 'europa']
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
    aliases: ['japon', 'japan', 'asia oriental', 'asia']
  },
  'china': {
    region: 'Asia',
    subregion: 'Asia Oriental',
    aliases: ['china', 'asia oriental', 'asia']
  },
  'india': {
    region: 'Asia',
    subregion: 'Asia del Sur',
    aliases: ['india', 'subcontinente indio', 'asia']
  },
  'rusia': {
    region: 'Asia',
    subregion: 'Eurasia',
    aliases: ['rusia', 'siberia', 'eurasia', 'asia', 'europa']
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
    aliases: ['nueva zelanda', 'new zealand', 'oceania', 'australasia', 'pacifico']
  },
  'australia': {
    region: 'Oceanía',
    subregion: 'Australasia',
    aliases: ['australia', 'oceania', 'australasia']
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
    aliases: ['sudafrica', 'africa austral', 'africa']
  },
  'kenia': {
    region: 'África',
    subregion: 'África Oriental',
    aliases: ['kenia', 'sabana', 'africa']
  },
  'madagascar': {
    region: 'África',
    subregion: 'Madagascar',
    aliases: ['madagascar', 'africa']
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
    aliases: ['antartida', 'polar', 'polo sur']
  },
  'artico': {
    region: 'Polar',
    subregion: 'Ártico',
    aliases: ['artico', 'polar', 'polo norte']
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
 *   score 3: exact country match
 *   score 2: subregional/alias match
 *   score 1: continental match
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

    // 1. Direct country match
    if (candCountries.includes(key)) {
      bestScore = Math.max(bestScore, 3);
      continue;
    }

    // 2. Direct region match
    if (candRegion === key || candCountries.some(c => c.includes(key))) {
      bestScore = Math.max(bestScore, 3);
      continue;
    }

    // 3. Hierarchical inheritance via aliases & subregions
    if (tInfo) {
      const aliasMatch = tInfo.aliases.some(alias =>
        candCountries.includes(alias) || candRegion.includes(alias)
      );
      if (aliasMatch) {
        bestScore = Math.max(bestScore, 2);
        continue;
      }

      const tRegionNorm = normalizePlace(tInfo.region);
      if (candRegion === tRegionNorm || candRegion.includes(tRegionNorm)) {
        bestScore = Math.max(bestScore, 1);
        continue;
      }
    } else {
      // Unknown place fallback: simple substring search
      if (candRegion.includes(key) || candCountries.some(c => c.includes(key))) {
        bestScore = Math.max(bestScore, 2);
      }
    }
  }

  return { matches: bestScore > 0, score: bestScore };
}

/**
 * Filters a pool by territory with hierarchical inheritance,
 * guaranteeing at least minResults candidates whenever possible.
 */
export function filterCandidatesByTerritory(pool, selectedPlaceKeys, minResults = 16) {
  if (!selectedPlaceKeys || selectedPlaceKeys.length === 0) {
    return [...pool];
  }

  const keys = selectedPlaceKeys.map(normalizePlace).filter(k => k && k !== 'todo el mundo' && k !== 'global' && k !== 'all');
  if (keys.length === 0) return [...pool];

  // Pass 1: exact matches (score 3)
  const scored = pool
    .map(item => ({ item, ...matchTerritory(item, keys) }))
    .filter(res => res.matches);

  const exact = scored.filter(s => s.score === 3).map(s => s.item);
  if (exact.length >= minResults) {
    return exact;
  }

  // Pass 2: exact + subregional matches (score >= 2)
  const subregional = scored.filter(s => s.score >= 2).map(s => s.item);
  if (subregional.length >= minResults) {
    return subregional;
  }

  // Pass 3: continental fallback (score >= 1)
  const continental = scored.map(s => s.item);
  if (continental.length > 0) {
    return continental;
  }

  // Fallback: entire pool
  return [...pool];
}
