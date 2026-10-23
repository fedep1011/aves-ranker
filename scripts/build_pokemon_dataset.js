// Build script to generate public/data/pokemon.json from official PokeAPI GraphQL
import fs from 'node:fs';
import path from 'node:path';

const query = `
query GetAllPokemon {
  pokemon_v2_pokemon(where: {id: {_lte: 1025}}, order_by: {id: asc}) {
    id
    name
    pokemon_v2_pokemontypes {
      pokemon_v2_type {
        name
      }
    }
    pokemon_v2_pokemonspecy {
      generation_id
      is_legendary
      is_mythical
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: 7}}) {
        name
      }
    }
  }
}
`;

// Known starter IDs across Gen 1-9 (base, stage 1, stage 2)
const STARTER_IDS = new Set([
  // Gen 1: Bulbasaur, Charmander, Squirtle families
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  // Gen 2: Chikorita, Cyndaquil, Totodile families
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  // Gen 3: Treecko, Torchic, Mudkip families
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  // Gen 4: Turtwig, Chimchar, Piplup families
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  // Gen 5: Snivy, Tepig, Oshawott families
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  // Gen 6: Chespin, Fennekin, Froakie families
  650, 651, 652, 653, 654, 655, 656, 657, 658,
  // Gen 7: Rowlet, Litten, Popplio families
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  // Gen 8: Grookey, Scorbunny, Sobble families
  810, 811, 812, 813, 814, 815, 816, 817, 818,
  // Gen 9: Sprigatito, Fuecoco, Quaxly families
  906, 907, 908, 909, 910, 911, 912, 913, 914
]);

const GEN_REGIONS = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Teselia',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
  9: 'Paldea'
};

const TYPE_TRANSLATIONS = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Eléctrico',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  steel: 'Acero',
  dark: 'Siniestro',
  fairy: 'Hada'
};

async function main() {
  console.log('Consultando PokeAPI GraphQL...');
  const res = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const rawList = json.data.pokemon_v2_pokemon;
  console.log(`Recibidos ${rawList.length} Pokémon.`);

  const formatted = rawList.map(p => {
    const id = p.id;
    const specy = p.pokemon_v2_pokemonspecy;
    const esName = specy?.pokemon_v2_pokemonspeciesnames?.[0]?.name;
    const rawName = p.name.charAt(0).toUpperCase() + p.name.slice(1);
    const displayName = esName || rawName;
    const types = p.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
    const gen = specy?.generation_id || 1;
    const isLegendary = specy?.is_legendary || false;
    const isMythical = specy?.is_mythical || false;
    const isStarter = STARTER_IDS.has(id);

    let rarity = 'standard';
    if (isLegendary) rarity = 'legendary';
    else if (isMythical) rarity = 'mythical';
    else if (isStarter) rarity = 'starter';

    return {
      id,
      name: displayName,
      en_name: rawName,
      types,
      gen,
      region: GEN_REGIONS[gen] || 'Desconocida',
      rarity,
      is_legendary: isLegendary || isMythical,
      is_starter: isStarter,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
      animated_sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
      pixel_sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      home_sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
      artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
    };
  });

  const outDir = path.resolve('public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'pokemon.json');
  fs.writeFileSync(outPath, JSON.stringify(formatted, null, 2), 'utf-8');
  console.log(`Guardado catálogo de Pokémon en: ${outPath} (${formatted.length} candidatos)`);
}

main().catch(err => {
  console.error('Error generando dataset:', err);
  process.exit(1);
});
