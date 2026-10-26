import fs from 'node:fs';

const rawMd = fs.readFileSync('cambios mamiferos.md', 'utf-8');

// The file has two JSON arrays separated by whitespace
// Let's extract all json arrays using regex or parsing
const arrayMatches = rawMd.match(/\[\s*\{[\s\S]*?\}\s*\]/g);

if (!arrayMatches) {
  console.error('No JSON arrays found in cambios mamiferos.md');
  process.exit(1);
}

console.log(`Found ${arrayMatches.length} JSON array(s) in cambios mamiferos.md`);

const allEntries = [];
const idMap = new Map();

arrayMatches.forEach((arrStr, idx) => {
  try {
    const list = JSON.parse(arrStr);
    console.log(`Array ${idx + 1}: ${list.length} entries`);
    list.forEach(entry => {
      if (idMap.has(entry.id)) {
        console.log(`Overriding ID ${entry.id} (${entry.name}): old=${idMap.get(entry.id).photo.substring(0, 60)}... new=${entry.photo.substring(0, 60)}...`);
      }
      idMap.set(entry.id, entry);
    });
  } catch (err) {
    console.error(`Error parsing array ${idx + 1}:`, err.message);
  }
});

console.log(`Total unique IDs to update/curate: ${idMap.size}`);

// Load mamiferos.json
const mamiferosPath = 'public/data/mamiferos.json';
const mamiferos = JSON.parse(fs.readFileSync(mamiferosPath, 'utf-8'));

let updatedCount = 0;
const missingInJson = [];

idMap.forEach((entry, id) => {
  const target = mamiferos.find(m => m.id === id);
  if (target) {
    const oldPhoto = target.photo;
    target.photo = entry.photo;
    if (entry.name && !target.name) target.name = entry.name;
    if (oldPhoto !== entry.photo) {
      updatedCount++;
    }
  } else {
    missingInJson.push(entry);
  }
});

console.log(`Updated photo in ${updatedCount} species in mamiferos.json`);
if (missingInJson.length > 0) {
  console.log(`Missing in mamiferos.json:`, missingInJson.map(m => `${m.id}: ${m.name}`));
}

// Save mamiferos.json
fs.writeFileSync(mamiferosPath, JSON.stringify(mamiferos, null, 2), 'utf-8');
console.log(`Saved ${mamiferosPath} with ${mamiferos.length} items`);

// Print list of all curated IDs for curador.html
const curatedIds = Array.from(idMap.keys());
// Make sure Tigre (41967) is also included if curated previously
if (!curatedIds.includes(41967)) curatedIds.push(41967);
curatedIds.sort((a, b) => a - b);

console.log(`All curated IDs count: ${curatedIds.length}`);
console.log(`Curated IDs:`, JSON.stringify(curatedIds));
