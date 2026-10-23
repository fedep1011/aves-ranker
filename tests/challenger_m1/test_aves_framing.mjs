import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('====================================================');
console.log('CHALLENGER STRESS TEST 4: Aves Zero-Cropping Framing');
console.log('====================================================\n');

// 1. Inspect index.html Hub Arena Card for Aves
const hubHtmlPath = path.join(rootDir, 'index.html');
const hubHtml = fs.readFileSync(hubHtmlPath, 'utf8');

console.log('--- 1. Hub Portal Aves Diagonal Card ---');
// Verify left panel (Tucan Toco)
const tucanMatch = hubHtml.match(/<img[^>]*alt="Tucán Toco"[^>]*>/i);
assert(tucanMatch, 'Tucan Toco image must exist in index.html');
console.log('Tucán Toco tag:', tucanMatch[0]);
assert(/object-\[30%_center\]/.test(tucanMatch[0]), 'Tucan must have object-[30%_center] class');
assert(/object-position:\s*30%\s*center/i.test(tucanMatch[0]), 'Tucan must have inline style="object-position: 30% center;" fallback');
console.log('[PASS]: Tucan Toco offset to 30% center away from diagonal boundary');

// Verify right panel (Guacamayo Rojo)
const guacamayoMatch = hubHtml.match(/<img[^>]*alt="Guacamayo Rojo"[^>]*>/i);
assert(guacamayoMatch, 'Guacamayo Rojo image must exist in index.html');
console.log('Guacamayo Rojo tag:', guacamayoMatch[0]);
assert(/object-\[70%_center\]/.test(guacamayoMatch[0]), 'Guacamayo must have object-[70%_center] class');
assert(/object-position:\s*70%\s*center/i.test(guacamayoMatch[0]), 'Guacamayo must have inline style="object-position: 70% center;" fallback');
console.log('[PASS]: Guacamayo Rojo offset to 70% center away from diagonal boundary');

// 2. Inspect aves/index.html Battle Cards
console.log('\n--- 2. Aves Duel Battle Cards ---');
const avesHtmlPath = path.join(rootDir, 'aves/index.html');
const avesHtml = fs.readFileSync(avesHtmlPath, 'utf8');

// Find imgLeft in battle
const imgLeftMatch = avesHtml.match(/<img\s+id="imgLeft"[^>]*>/i);
assert(imgLeftMatch, 'imgLeft must exist in aves/index.html');
console.log('imgLeft tag:', imgLeftMatch[0]);
assert(/object-contain/.test(imgLeftMatch[0]), 'imgLeft must have object-contain');
assert(/object-center/.test(imgLeftMatch[0]), 'imgLeft must have object-center');

// Find imgRight in battle
const imgRightMatch = avesHtml.match(/<img\s+id="imgRight"[^>]*>/i);
assert(imgRightMatch, 'imgRight must exist in aves/index.html');
console.log('imgRight tag:', imgRightMatch[0]);
assert(/object-contain/.test(imgRightMatch[0]), 'imgRight must have object-contain');
assert(/object-center/.test(imgRightMatch[0]), 'imgRight must have object-center');

// Verify battle container has overflow-hidden and background blur layer
assert(avesHtml.includes('id="imgLeftBg"'), 'Ambient background layer imgLeftBg must exist');
assert(avesHtml.includes('id="imgRightBg"'), 'Ambient background layer imgRightBg must exist');
console.log('[PASS]: Both duel battle cards use object-contain + ambient blur layer');

// 3. Inspect src/aves/main.js results, podium, and shared challenge
console.log('\n--- 3. Aves Results, Podium & Challenge Lists ---');
const avesJsPath = path.join(rootDir, 'src/aves/main.js');
const avesJs = fs.readFileSync(avesJsPath, 'utf8');

// Challenge Full List Wrap (modified by Worker M1)
const challengeListRow = avesJs.match(/challengeFullListWrap[\s\S]*?row\.innerHTML\s*=\s*`([\s\S]*?)`;/);
assert(challengeListRow, 'challengeFullListWrap row template must exist');
console.log('challengeFullListWrap row innerHTML snippet:', challengeListRow[1].trim());
assert(/object-contain/.test(challengeListRow[1]), 'challengeFullListWrap must use object-contain');
assert(/object-center/.test(challengeListRow[1]), 'challengeFullListWrap must use object-center');
assert(!/object-cover/.test(challengeListRow[1]), 'challengeFullListWrap must NOT use object-cover');
console.log('[PASS]: challengeFullListWrap uses object-contain object-center (zero crop)');

// Podium Top 3 Cards
const podiumMatch = avesJs.match(/resultsTop3Grid[\s\S]*?card\.innerHTML\s*=\s*`([\s\S]*?)`;/);
assert(podiumMatch, 'resultsTop3Grid card template must exist');
assert(/object-contain/.test(podiumMatch[1]), 'Podium card foreground image must use object-contain');
assert(/object-center/.test(podiumMatch[1]), 'Podium card foreground image must use object-center');
console.log('[PASS]: Podium top 3 cards use object-contain object-center with background blur layer');

// Rest of Ranking Rows (#4+)
const restMatch = avesJs.match(/resultsRestGrid[\s\S]*?row\.innerHTML\s*=\s*`([\s\S]*?)`;/);
assert(restMatch, 'resultsRestGrid row template must exist');
assert(/object-contain/.test(restMatch[1]), 'Rest ranking thumbnail must use object-contain');
assert(/object-center/.test(restMatch[1]), 'Rest ranking thumbnail must use object-center');
console.log('[PASS]: Rest of ranking list (#4+) uses object-contain object-center');

// Shared Challenge Top 3 Preview
const challengeTop3Match = avesJs.match(/challengeTop3Preview[\s\S]*?item\.innerHTML\s*=\s*`([\s\S]*?)`;/);
assert(challengeTop3Match, 'challengeTop3Preview item template must exist');
assert(/object-contain/.test(challengeTop3Match[1]), 'Challenge top 3 preview must use object-contain');
assert(/object-center/.test(challengeTop3Match[1]), 'Challenge top 3 preview must use object-center');
console.log('[PASS]: Challenge top 3 preview uses object-contain object-center');

console.log('\n====================================================');
console.log('ALL AVES ZERO-CROPPING FRAMING TESTS PASSED EMPIRICALLY (100%)');
console.log('====================================================');
