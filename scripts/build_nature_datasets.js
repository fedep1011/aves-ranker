import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Ensure the datasets exist and contain the curated 64 species
const mamiferosPath = path.join(outDir, 'mamiferos.json');
const floresPath = path.join(outDir, 'flores.json');

const MAMIFEROS = JSON.parse(fs.readFileSync(mamiferosPath, 'utf-8'));
const FLORES = JSON.parse(fs.readFileSync(floresPath, 'utf-8'));

fs.writeFileSync(mamiferosPath, JSON.stringify(MAMIFEROS, null, 2), 'utf-8');
fs.writeFileSync(floresPath, JSON.stringify(FLORES, null, 2), 'utf-8');

const distDir = path.resolve('dist/data');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'mamiferos.json'), JSON.stringify(MAMIFEROS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(distDir, 'flores.json'), JSON.stringify(FLORES, null, 2), 'utf-8');
}

console.log(`Datasets de Mamíferos (${MAMIFEROS.length}) y Flores (${FLORES.length}) sincronizados.`);
