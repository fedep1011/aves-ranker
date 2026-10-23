import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
  { name: 'Hub', htmlPath: 'index.html', jsPaths: [] },
  { name: 'Aves', htmlPath: 'aves/index.html', jsPaths: ['src/aves/main.js'] },
  { name: 'Pokemon', htmlPath: 'pokemon/index.html', jsPaths: ['src/pokemon/main.js', 'src/pokemon/types.js'] },
  { name: 'Mamiferos', htmlPath: 'mamiferos/index.html', jsPaths: ['src/mamiferos/main.js'] },
  { name: 'Flores', htmlPath: 'flores/index.html', jsPaths: ['src/flores/main.js'] }
];

console.log('=== INICIANDO AUDITORÍA ESTÁTICA Y DOM DE TODAS LAS PÁGINAS ===\n');

let totalBugs = 0;

for (const page of PAGES) {
  console.log(`\n--- Auditando: ${page.name} (${page.htmlPath}) ---`);
  const htmlContent = fs.readFileSync(page.htmlPath, 'utf8');

  // 1. Extraer todos los IDs definidos en el HTML
  const idRegex = /\bid=["']([^"']+)["']/g;
  const htmlIds = new Set();
  const duplicateIds = [];
  let match;
  while ((match = idRegex.exec(htmlContent)) !== null) {
    const id = match[1];
    if (htmlIds.has(id)) {
      duplicateIds.push(id);
    }
    htmlIds.add(id);
  }

  if (duplicateIds.length > 0) {
    console.error(`  [BUG] IDs duplicados en HTML: ${duplicateIds.join(', ')}`);
    totalBugs += duplicateIds.length;
  } else {
    console.log(`  [OK] Cero IDs duplicados en HTML (${htmlIds.size} IDs encontrados).`);
  }

  // 2. Extraer todos los onclick/oninput/onload/onerror en el HTML
  const eventRegex = /\bon([a-zA-Z]+)=["']([^"']+)["']/g;
  const inlineEvents = [];
  while ((match = eventRegex.exec(htmlContent)) !== null) {
    inlineEvents.push({ event: match[1], code: match[2] });
  }

  // 3. Revisar cada archivo JS asociado
  for (const jsPath of page.jsPaths) {
    if (!fs.existsSync(jsPath)) {
      console.error(`  [BUG] Archivo JS no existe: ${jsPath}`);
      totalBugs++;
      continue;
    }
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // Buscar todos los document.getElementById('...')
    const getElemRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    const missingIdsInHtml = [];
    while ((match = getElemRegex.exec(jsContent)) !== null) {
      const neededId = match[1];
      if (!htmlIds.has(neededId)) {
        missingIdsInHtml.push(neededId);
      }
    }

    if (missingIdsInHtml.length > 0) {
      console.error(`  [BUG EN ${path.basename(jsPath)}] JS busca IDs que NO existen en ${page.htmlPath}:`);
      missingIdsInHtml.forEach(id => console.error(`       -> #${id}`));
      totalBugs += missingIdsInHtml.length;
    } else {
      console.log(`  [OK] Todos los getElementById en ${path.basename(jsPath)} existen en el HTML.`);
    }

    // Verificar funciones llamadas en inline events (ej. app.onLimitChange)
    for (const ev of inlineEvents) {
      const appCallMatch = ev.code.match(/app\.([a-zA-Z0-9_]+)\s*\(/);
      if (appCallMatch) {
        const methodName = appCallMatch[1];
        // Buscar si existe methodName en jsContent
        const methodExists = new RegExp(`\\b${methodName}\\s*\\(`).test(jsContent) ||
                             new RegExp(`\\b${methodName}\\s*:`).test(jsContent);
        if (!methodExists) {
          console.error(`  [BUG EVENTO] HTML llama a app.${methodName}() pero NO existe en ${path.basename(jsPath)}! Código: ${ev.code}`);
          totalBugs++;
        }
      }
    }
  }

  // 4. Verificar etiquetas sin cerrar básicas o atributos rotos
  const unclosedTags = [];
  const openButtons = (htmlContent.match(/<button\b/g) || []).length;
  const closeButtons = (htmlContent.match(/<\/button>/g) || []).length;
  if (openButtons !== closeButtons) {
    console.error(`  [BUG ESTRUCTURA] Desbalance de <button>: ${openButtons} abiertos vs ${closeButtons} cerrados`);
    totalBugs++;
  } else {
    console.log(`  [OK] Balance de <button>: ${openButtons} botones correctamente balanceados.`);
  }

  const openSections = (htmlContent.match(/<section\b/g) || []).length;
  const closeSections = (htmlContent.match(/<\/section>/g) || []).length;
  if (openSections !== closeSections) {
    console.error(`  [BUG ESTRUCTURA] Desbalance de <section>: ${openSections} abiertas vs ${closeSections} cerradas`);
    totalBugs++;
  } else {
    console.log(`  [OK] Balance de <section>: ${openSections} secciones correctamente balanceadas.`);
  }

  const openDivs = (htmlContent.match(/<div\b/g) || []).length;
  const closeDivs = (htmlContent.match(/<\/div>/g) || []).length;
  if (openDivs !== closeDivs) {
    console.error(`  [BUG ESTRUCTURA] Desbalance de <div>: ${openDivs} abiertos vs ${closeDivs} cerrados`);
    totalBugs++;
  } else {
    console.log(`  [OK] Balance de <div>: ${openDivs} divs correctamente balanceados.`);
  }
}

console.log(`\n==============================================`);
console.log(`AUDITORÍA FINALIZADA. TOTAL DE BUGS DETECTADOS: ${totalBugs}`);
console.log(`==============================================`);
