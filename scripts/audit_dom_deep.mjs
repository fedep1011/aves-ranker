import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
  {
    name: 'Hub',
    htmlPath: 'index.html',
    entryJs: null
  },
  {
    name: 'Aves',
    htmlPath: 'aves/index.html',
    entryJs: 'src/aves/main.js'
  },
  {
    name: 'Pokemon',
    htmlPath: 'pokemon/index.html',
    entryJs: 'src/pokemon/main.js'
  },
  {
    name: 'Mamiferos',
    htmlPath: 'mamiferos/index.html',
    entryJs: 'src/mamiferos/main.js'
  },
  {
    name: 'Flores',
    htmlPath: 'flores/index.html',
    entryJs: 'src/flores/main.js'
  }
];

console.log('=== AUDITORÍA PROFUNDA DEL DOM Y MANEJADORES DE EVENTOS ===\n');

let totalIssues = 0;

for (const page of PAGES) {
  console.log(`\n======================================================`);
  console.log(`PÁGINA: ${page.name} (${page.htmlPath})`);
  console.log(`======================================================`);

  const html = fs.readFileSync(page.htmlPath, 'utf8');

  // 1. Extraer todos los IDs estáticos en el HTML
  const staticIds = new Set();
  const idRegex = /\bid=["']([^"']+)["']/g;
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    staticIds.add(match[1]);
  }

  // 2. Extraer IDs dinámicos generados en plantillas JS del archivo
  let dynamicIds = new Set();
  let jsContent = '';
  if (page.entryJs && fs.existsSync(page.entryJs)) {
    jsContent = fs.readFileSync(page.entryJs, 'utf8');
    // Buscar id="${...}" o id="..." dentro de template strings en JS
    const jsIdRegex = /id=["']([^"'${}]+)["']/g;
    while ((match = jsIdRegex.exec(jsContent)) !== null) {
      dynamicIds.add(match[1]);
    }
  }

  const allAvailableIds = new Set([...staticIds, ...dynamicIds]);

  console.log(`-> IDs estáticos en HTML: ${staticIds.size}`);
  console.log(`-> IDs dinámicos detectados en JS templates: ${dynamicIds.size}`);

  // 3. Verificar getElementById en JS
  if (page.entryJs && jsContent) {
    const getElemRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    const queriedIds = new Set();
    while ((match = getElemRegex.exec(jsContent)) !== null) {
      queriedIds.add(match[1]);
    }

    const missingIds = [];
    for (const qId of queriedIds) {
      if (!allAvailableIds.has(qId)) {
        missingIds.push(qId);
      }
    }

    if (missingIds.length > 0) {
      console.warn(`\n[ALERTA DOM] JS busca ${missingIds.length} IDs inexistentes en HTML o templates:`);
      missingIds.forEach(id => console.warn(`   - #${id}`));
      totalIssues += missingIds.length;
    } else {
      console.log(`[OK] Todos los getElementById (${queriedIds.size}) existen en el HTML o templates.`);
    }

    // 4. Verificar llamadas a métodos de 'app' en onclick / oninput / onchange
    const eventAttrRegex = /\bon([a-zA-Z]+)=["']([^"']+)["']/g;
    const missingAppMethods = [];
    while ((match = eventAttrRegex.exec(html)) !== null) {
      const code = match[2];
      const appCalls = [...code.matchAll(/app\.([a-zA-Z0-9_]+)\s*\(/g)];
      for (const call of appCalls) {
        const methodName = call[1];
        // Comprobar si existe como método en el objeto app
        const regexMethod = new RegExp(`(^|\\s)${methodName}\\s*\\(`, 'm');
        const regexMethodColon = new RegExp(`(^|\\s)${methodName}\\s*:`, 'm');
        if (!regexMethod.test(jsContent) && !regexMethodColon.test(jsContent)) {
          missingAppMethods.push({ method: methodName, code });
        }
      }
    }

    if (missingAppMethods.length > 0) {
      console.error(`\n[ERROR DOM] Métodos de 'app' llamados en HTML que NO existen en ${page.entryJs}:`);
      missingAppMethods.forEach(m => console.error(`   - app.${m.method}() en: ${m.code}`));
      totalIssues += missingAppMethods.length;
    } else {
      console.log(`[OK] Todos los inline event handlers apuntan a métodos válidos en ${page.entryJs}.`);
    }
  }

  // 5. Botones sin interactividad (sin onclick, sin id para addEventListener, sin type submit)
  const buttonRegex = /<button\b([^>]*)>(.*?)<\/button>/gis;
  let deadButtons = 0;
  while ((match = buttonRegex.exec(html)) !== null) {
    const attrs = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim().slice(0, 30);
    const hasOnclick = /\bonclick=/i.test(attrs);
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : null;

    let hasListenerInJs = false;
    if (id && jsContent) {
      hasListenerInJs = jsContent.includes(`'${id}'`) || jsContent.includes(`"${id}"`);
    }
    // Also check inline script in html if any
    const htmlInlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');
    if (id && htmlInlineScripts) {
      hasListenerInJs = hasListenerInJs || htmlInlineScripts.includes(`'${id}'`) || htmlInlineScripts.includes(`"${id}"`);
    }

    if (!hasOnclick && !hasListenerInJs) {
      console.warn(`[BOTÓN SOSPECHOSO] Botón sin 'onclick' ni listener JS detectado: id="${id || 'sin-id'}" (Texto: "${text}")`);
      deadButtons++;
    }
  }
  if (deadButtons === 0) {
    console.log(`[OK] Todos los botones tienen listener o 'onclick' asignado.`);
  }

  // 6. Enlaces con href vacío o '#'
  const linkRegex = /<a\b([^>]*)>/gi;
  let emptyLinks = 0;
  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
    const href = hrefMatch ? hrefMatch[1].trim() : null;
    if (!href || href === '#' || href === 'javascript:void(0)') {
      const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
      console.warn(`[ENLACE SOSPECHOSO] Enlace con href vacío o '#': id="${idMatch ? idMatch[1] : 'sin-id'}" href="${href}"`);
      emptyLinks++;
    }
  }
  if (emptyLinks === 0) {
    console.log(`[OK] Todos los enlaces tienen destinos válidos.`);
  }

  // 7. Inputs sin id o sin event listener
  const inputRegex = /<input\b([^>]*)>/gi;
  let orphanInputs = 0;
  while ((match = inputRegex.exec(html)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
    const type = typeMatch ? typeMatch[1] : 'text';
    const hasEvent = /\b(oninput|onchange|onclick)=/i.test(attrs);
    const id = idMatch ? idMatch[1] : null;

    let listenedInJs = false;
    if (id && jsContent) {
      listenedInJs = jsContent.includes(`'${id}'`) || jsContent.includes(`"${id}"`);
    }
    if (!hasEvent && !listenedInJs) {
      console.warn(`[INPUT SOSPECHOSO] Input type="${type}" sin id o sin listener: attrs="${attrs.trim()}"`);
      orphanInputs++;
    }
  }
  if (orphanInputs === 0) {
    console.log(`[OK] Todos los inputs tienen id o eventos asignados.`);
  }
}

console.log(`\n======================================================`);
console.log(`TOTAL DE PROBLEMAS DETECTADOS: ${totalIssues}`);
console.log(`======================================================\n`);
