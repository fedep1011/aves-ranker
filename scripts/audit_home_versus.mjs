import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf-8');

function extractPairs(varName) {
  const regex = new RegExp(`const\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\n\\s*\\]);`);
  const match = html.match(regex);
  if (!match) return [];
  try {
    return eval(match[1]);
  } catch (e) {
    console.error('Eval error for', varName, e);
    return [];
  }
}

const avesPairs = extractPairs('AVES_CARD_PAIRS');
const floraPairs = extractPairs('FLORA_CARD_PAIRS');
const faunaPairs = extractPairs('FAUNA_CARD_PAIRS');

const allPairs = [
  ...avesPairs.map(p => ({ category: 'aves', ...p })),
  ...floraPairs.map(p => ({ category: 'flores', ...p })),
  ...faunaPairs.map(p => ({ category: 'mamiferos', ...p }))
];

const urls = [];
allPairs.forEach(p => {
  urls.push({ category: p.category, name: p.left.name, url: p.left.url });
  urls.push({ category: p.category, name: p.right.name, url: p.right.url });
});

// Load the local datasets
const avesJson = JSON.parse(fs.readFileSync('public/data/aves.json', 'utf8'));
const mamJson = JSON.parse(fs.readFileSync('public/data/mamiferos.json', 'utf8'));
const floJson = JSON.parse(fs.readFileSync('public/data/flores.json', 'utf8'));

const datasets = {
  aves: avesJson,
  mamiferos: mamJson,
  flores: floJson
};

console.log('--- Matching home versus with datasets ---');
for (const item of urls) {
  const ds = datasets[item.category];
  const found = ds.filter(x => {
    const n = (x.name || '').toLowerCase();
    const query = item.name.toLowerCase().split('(')[0].trim();
    return n.includes(query) || query.includes(n);
  });
  
  if (found.length === 0) {
    console.log(`[NOT FOUND IN ${item.category}] "${item.name}"`);
  } else {
    const match = found[0];
    const isSamePhoto = match.photo === item.url;
    if (!isSamePhoto) {
      console.log(`[DIFF PHOTO] ${item.name} (${item.category}, ID: ${match.id})`);
    }
  }
}
