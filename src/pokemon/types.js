export const POKEMON_TYPES = {
  normal: { name: 'Normal', color: '#A8A77A', text: '#FFFFFF' },
  fire: { name: 'Fuego', color: '#EE8130', text: '#FFFFFF' },
  water: { name: 'Agua', color: '#6390F0', text: '#FFFFFF' },
  grass: { name: 'Planta', color: '#7AC74C', text: '#FFFFFF' },
  electric: { name: 'Eléctrico', color: '#F7D02C', text: '#1E1E1E' },
  ice: { name: 'Hielo', color: '#96D9D6', text: '#1E1E1E' },
  fighting: { name: 'Lucha', color: '#C22E28', text: '#FFFFFF' },
  poison: { name: 'Veneno', color: '#A33EA1', text: '#FFFFFF' },
  ground: { name: 'Tierra', color: '#E2BF65', text: '#1E1E1E' },
  flying: { name: 'Volador', color: '#A98FF3', text: '#FFFFFF' },
  psychic: { name: 'Psíquico', color: '#F95587', text: '#FFFFFF' },
  bug: { name: 'Bicho', color: '#A6B91A', text: '#FFFFFF' },
  rock: { name: 'Roca', color: '#B6A136', text: '#FFFFFF' },
  ghost: { name: 'Fantasma', color: '#735797', text: '#FFFFFF' },
  dragon: { name: 'Dragón', color: '#6F35FC', text: '#FFFFFF' },
  steel: { name: 'Acero', color: '#B7B7CE', text: '#1E1E1E' },
  dark: { name: 'Siniestro', color: '#705746', text: '#FFFFFF' },
  fairy: { name: 'Hada', color: '#D685AD', text: '#1E1E1E' }
};

export const GENERATIONS = [
  { id: 'all', name: 'Todas las generaciones', count: 1025 },
  { id: '1', name: 'Gen I · Kanto', count: 151 },
  { id: '2', name: 'Gen II · Johto', count: 100 },
  { id: '3', name: 'Gen III · Hoenn', count: 135 },
  { id: '4', name: 'Gen IV · Sinnoh', count: 107 },
  { id: '5', name: 'Gen V · Teselia', count: 156 },
  { id: '6', name: 'Gen VI · Kalos', count: 72 },
  { id: '7', name: 'Gen VII · Alola', count: 88 },
  { id: '8', name: 'Gen VIII · Galar', count: 96 },
  { id: '9', name: 'Gen IX · Paldea', count: 120 }
];

export function getTypeBadge(typeKey) {
  const meta = POKEMON_TYPES[typeKey.toLowerCase()] || { name: typeKey, color: '#71717A', text: '#FFFFFF' };
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-semibold shadow-xs" style="background-color: ${meta.color}; color: ${meta.text}">${meta.name}</span>`;
}
