import fs from 'node:fs';
import path from 'node:path';

// Load pokemon.json
const dataPath = path.resolve('./public/data/pokemon.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const allPokemon = JSON.parse(rawData);

console.log(`Loaded ${allPokemon.length} pokemon.`);

const GENERATIONS = [
  { id: 'all', name: 'Todas las generaciones' },
  { id: '1', name: 'Gen I · Kanto' },
  { id: '2', name: 'Gen II · Johto' },
  { id: '3', name: 'Gen III · Hoenn' },
  { id: '4', name: 'Gen IV · Sinnoh' },
  { id: '5', name: 'Gen V · Teselia' },
  { id: '6', name: 'Gen VI · Kalos' },
  { id: '7', name: 'Gen VII · Alola' },
  { id: '8', name: 'Gen VIII · Galar' },
  { id: '9', name: 'Gen IX · Paldea' }
];

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy'
];

const RARITIES = ['all', 'starter', 'legendary'];

function filterPool(gen, type, rarity) {
  return allPokemon.filter(p => {
    if (gen !== 'all' && p.gen !== parseInt(gen, 10)) return false;
    if (type !== 'all' && !p.types.includes(type.toLowerCase())) return false;
    if (rarity === 'starter' && !p.is_starter) return false;
    if (rarity === 'legendary' && !p.is_legendary) return false;
    return true;
  });
}

// 1. Find all combinations resulting in 0 or 1 items
const zeroMatches = [];
const oneMatches = [];
const twoPlusMatches = [];

for (const g of GENERATIONS) {
  for (const t of ['all', ...POKEMON_TYPES]) {
    for (const r of RARITIES) {
      const matched = filterPool(g.id, t, r);
      const entry = { gen: g.id, type: t, rarity: r, count: matched.length };
      if (matched.length === 0) {
        zeroMatches.push(entry);
      } else if (matched.length === 1) {
        oneMatches.push({ ...entry, pokemon: matched[0].name, id: matched[0].id });
      } else {
        twoPlusMatches.push(entry);
      }
    }
  }
}

console.log(`\nTotal combinations: ${GENERATIONS.length * 19 * 3}`);
console.log(`Combinations with 0 items: ${zeroMatches.length}`);
console.log(`Combinations with 1 item: ${oneMatches.length}`);
console.log(`Combinations with >=2 items: ${twoPlusMatches.length}`);

console.log('\nSample 1-item matches:');
oneMatches.slice(0, 10).forEach(m => {
  console.log(`  Gen: ${m.gen}, Type: ${m.type}, Rarity: ${m.rarity} -> ${m.pokemon} (#${m.id})`);
});

console.log('\nSample 0-item matches:');
zeroMatches.slice(0, 10).forEach(m => {
  console.log(`  Gen: ${m.gen}, Type: ${m.type}, Rarity: ${m.rarity}`);
});
