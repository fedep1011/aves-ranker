# Guía: cómo construir un "Ranker 1v1" para cualquier tema

Receta para crear una página como **AVES** (ranking por duelos 1 vs 1) con otro tema: Pokémon, insectos, mamíferos, dinosaurios, razas de perros, etc. Describe **funcionalidad, datos y lógica**. No define colores, tipografías ni estilo visual: eso se decide aparte.

> Para reutilizar esto: reemplazá "ave" por la entidad de tu tema (`criatura`, `pokemon`, `insecto`) y seguí cada sección.

---

## 1. Concepto

1. El usuario elige **qué colección** quiere rankear (categoría, filtros, cantidad).
2. La app arma un **pool** de N elementos (ej. 16).
3. El usuario ve **duelos 1 vs 1** y elige uno en cada uno.
4. Con esas elecciones la app construye un **ranking exacto** de los N.
5. Pantalla de resultados: podio Top 3, resto del ranking, dato curioso del #1, audio/extra del #1 si existe.
6. El usuario **comparte** su resultado y otra persona puede hacer **el mismo desafío** y comparar.

Sin backend ni base de datos: todo corre en el navegador y el estado compartido viaja en la URL.

---

## 2. Stack y estructura modular (Rankea2)

La plataforma está organizada en una arquitectura multi-página modular con Vite y Tailwind CSS:

- **Hub principal (`/`)**: `index.html` — Selector de rankings, cruces destacados y accesos a cada arena.
- **Arenas temáticas**:
  - `/aves/` (`aves/index.html` + `src/aves/`)
  - `/pokemon/` (`pokemon/index.html` + `src/pokemon/`)
  - `/mamiferos/` (`mamiferos/index.html` + `src/mamiferos/`)
  - `/flores/` (`flores/index.html` + `src/flores/`)
- **Motor centralizado (`src/core/`)**:
  - `src/core/tournament.js`: Algoritmo de torneos determinístico (`interleavedBisectSortAsync`), PRNG con semilla (`createSeededRng`), estimación de pasos, generación y parseo de enlaces de desafío (`?r=id1.id2...`).
  - `src/core/theme.js`: Sincronización global de Dark Mode / Light Mode vía clase `.dark` y persistencia en `localStorage.getItem('rankea2_theme')`.
- **Estilos globales (`src/styles/tailwind.css`)**:
  - Variables semánticas (`--color-canvas`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-line`, etc.) que adaptan toda la plataforma en modo claro y oscuro.

Estructura de vistas recomendada por arena (cada una es un `<section>` que se muestra/oculta con `goToView(id)`):

| Vista | Función |
|---|---|
| `viewHome` | Presets rápidos + entrada a "personalizar" |
| `viewConfig` (pasos) | Elegir categoría, filtros, cantidad, idioma |
| `viewBattle` | Duelos 1v1 |
| `viewResults` | Podio, ranking, compartir/exportar |
| `viewChallenge` | Entrada por link compartido |

---

## 3. Modelo de datos

Cada elemento normalizado a un objeto único, venga de la API que venga:

```js
{
  id: 12345,                 // id estable (clave para compartir por URL)
  nombre: "Nombre común",    // en el idioma elegido
  nombreCientifico: "...",   // o nombre alternativo (ej. nombre en japonés/inglés)
  imagen: "https://...",     // URL de foto
  popularidad: 0,            // para ordenar "los más famosos"
  audioUrl: "",              // opcional
  datoCurioso: ""            // opcional
}
```

Estado global (`app.state`) mínimo:

```
lang, limit, samplingMode ("popular" | "random"),
selectedCategories, keyword (filtro por especie/nombre),
candidatePool, initialBattlePool, finalRanking,
choiceHistory, replayDecisions, battleStep, battleSeed,
pendingResolver, imageCache
```

---

## 4. Fuente de datos

Elegí una por tema. La app necesita: **lista filtrable + foto + nombre localizado + popularidad**.

| Tema | Fuentes sugeridas |
|---|---|
| Aves, insectos, mamíferos, plantas | iNaturalist API v1 (`/taxa`, `/observations/species_counts`) con `taxon_id`, `locale`, `place_id`, `per_page`, `q` |
| Pokémon | PokeAPI (`/pokemon`, `/pokemon-species`; nombres en varios idiomas) |
| Cualquier cosa | JSON propio curado dentro del repo (`data/*.json`) |

Pautas:

1. **Categorías = grupos taxonómicos o filtros** (ej. iNaturalist: `taxon_id` de "Insecta", "Mammalia"; PokeAPI: tipo, generación).
2. **Presets curados** (los "más famosos", "legendarios", "extintos"): listas de ids escritas a mano en el código. Son lo más confiable y lo más divertido; siempre incluir 1 o 2.
3. **Popularidad**: cantidad de observaciones (iNaturalist), o lista manual / orden de la Pokédex.
4. **Filtrar basura**: descartar ítems sin foto, sin nombre común, fósiles o especies que no pertenecen a la categoría (ej. un fósil en "aves vivas"). Mantener una lista de exclusión por id.
5. **Cachear** respuestas en memoria (`Map`) para no repetir requests.
6. **Fallback de imagen**: si falla la foto, mostrar placeholder con el nombre (`onerror="app.handleImgFallback(this)"`).
7. Proxy de imágenes opcional (ej. `wsrv.nl`) para redimensionar y evitar problemas CORS al exportar a canvas.

### Nombres en español de Latinoamérica
Los nombres de la API suelen ser raros regionalmente (ej. "Avefría tero" en vez de "Tero"). Solución:

- Pasar `locale=es` y `preferred_place_id` de la región (ej. 7259 = Argentina/Rioplatense).
- Mantener un **diccionario de correcciones** `{ id: "nombre local" }` que pisa el de la API.
- Guardar siempre el nombre científico como respaldo.

---

## 5. Pantalla de inicio y configuración

1. **Presets en la home**: botones grandes de 1 click ("Los 16 más famosos del mundo", "Extintos legendarios", "Al azar"). Cada preset fija categoría + cantidad + modo y arranca el duelo directo.
2. **Personalizar** (pasos):
   - Paso 1: modo (populares / aleatorio) y cantidad (8, 16, 32…).
   - Paso 2: categoría/grupo (lista de gremios + preset curado).
   - Paso 3 (opcional): filtro por palabra clave (ej. "águila", "pikachu"). Cuando hay filtro activo, mostrar un **chip visible** y reflejarlo en las tarjetas y en el título del resultado.
3. Selector de **idioma** (ES / EN). Todo texto de UI vive en un diccionario `i18n[lang]`; los datos usan `locale` de la API.
4. Diseño **mobile-first**: probar siempre en celular; en pantallas chicas las tarjetas de duelo deben ser más cuadradas y nada debe quedar tapado por modales.

---

## 6. Algoritmo de duelos (lo más importante)

### Requisitos
- Ranking **exacto** de N elementos con pocos duelos (~42–48 para N=16).
- Que **no se sienta predecible** ("bajar un escalón por vez").
- Soporte de **Deshacer**.
- Reproducible a partir de una semilla.

### Por qué no usar Merge Sort clásico
Compara siempre `left[i]` vs `right[j]`: el que pierde queda clavado en pantalla mientras el otro lado avanza `0,1,2,3…`. Se siente como una escalera y las tarjetas no cambian de lado.

### Solución usada: Interleaved Midpoint-Bisect Tournament

1. **Rondas de abajo hacia arriba**: empezar con N listas de 1 elemento y fusionarlas de a pares ronda tras ronda.
2. **Fusión por bisección**: para fusionar listas ordenadas `A` y `B`, comparar el **elemento del medio de B** contra el **del medio de A** y buscar su posición por búsqueda binaria; eso divide el problema en dos sub-fusiones independientes (`A_izq,B_izq` y `A_der,B_der`).
3. **Intercalado**: dentro de una ronda, todos los sub-problemas que están listos compiten por el siguiente duelo. Se elige uno **que no comparta aves con el duelo anterior** (si hay opción), desempatando con el PRNG.
4. **Lado aleatorio**: en cada duelo se sortea quién va a la izquierda y quién a la derecha.
5. **PRNG con semilla** (`mulberry32`) generada una vez al empezar (`battleSeed`). Misma semilla + mismas elecciones = misma secuencia.

```js
createSeededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

El shuffle del pool inicial es Fisher-Yates (2 pasadas).

### Deshacer
- Guardar cada elección en `choiceHistory`.
- Al deshacer: `pop()`, copiar el historial a `replayDecisions`, **reiniciar el algoritmo** desde cero. Cuando `askUserPreference` encuentra `replayDecisions`, responde automáticamente sin mostrar nada hasta consumirlo.
- Rechazar la promesa pendiente con `Error("UndoStep")` para cortar la ejecución anterior.
- Funciona porque la semilla es la misma.

### Progreso
`estimatedTotalSteps ≈ N · log2(N) · 0.82`. Mostrar "duelo X / ~Y" y barra de progreso con tope de 98% hasta terminar.

---

## 7. Pantalla de duelo

- Dos tarjetas grandes con foto completa, nombre y nombre científico/alternativo (en una línea cada uno, **sin superponerse**).
- Botón **Deshacer** (visible solo si hay historial).
- Insignias: categoría actual, chip de filtro activo.
- Precargar las fotos del pool en segundo plano (`preloadPoolImagesInBackground`).

### Fotos bien encuadradas
Evitar recortar al animal/criatura:

- Usar `object-fit: contain` sobre un fondo (por ejemplo la misma foto desenfocada detrás) en vez de `cover` con recorte.
- Si usás `cover`, usar `object-position` hacia arriba/centro.
- En exportar a canvas, calcular la escala para que **entre completa** (contain), no para llenar.

---

## 8. Pantalla de resultados

1. **Podio Top 3** con distintivos: oro (#1), plata (#2), bronce (#3).
2. **Resto del ranking** (#4 en adelante) en grilla compacta.
3. Título y subtítulo dinámicos que incluyen categoría y filtro activo.
4. **Dato curioso del #1**: de Wikipedia REST (`/api/rest_v1/page/summary/{slug}` en `es.` o `en.`) o de un campo propio curado.
5. Enlace "Ficha" a Wikipedia en cada tarjeta.
6. **Audio del #1** (si el tema lo tiene: cantos de aves, sonidos de insectos, grito de Pokémon):
   - **Un único banner** arriba del podio. No repetir botones de audio en otros lugares.
   - Estados: *¿Querés reproducir?* → *Reproduciendo (Repetir desde el inicio / Detener)* → *¿Volver a escuchar? (Repetir)*.
   - **Nunca autoreproducir**: los navegadores lo bloquean y molesta. Preguntar y reproducir al toque del usuario.
   - Detener el audio al salir de la vista.

---

## 9. Compartir y desafío por link (sin base de datos)

Todo el estado viaja en la URL. Parámetros:

| Param | Contenido |
|---|---|
| `r` | ids del ranking separados por coma, en orden |
| `c` | nombre legible de la categoría |
| `a` | nombre del autor (opcional) |
| `l` | idioma (`en`; si falta, es) |

Ejemplo: `https://usuario.github.io/app/?r=123,456,789&c=Los+16+m%C3%A1s+famosos&a=Fede`

Flujo:
1. Al terminar, generar el link con `URLSearchParams`.
2. **Compartir por WhatsApp**: `https://wa.me/?text=` + `encodeURIComponent(mensaje + link)`. Mensaje corto y simpático, tipo: *"Mirá el ranking que armé. Hacé el tuyo y comparemos."*
3. Si el navegador lo soporta, usar `navigator.share({ text, url })`.
4. Al abrir con `?r=...`: leer ids, pedir sus datos a la API (un solo request con todos los ids), y mostrar `viewChallenge`: "X armó este ranking, ¿querés hacer el mismo desafío?" con **el mismo set de elementos**.
5. El invitado juega con ese pool exacto (mismo N, mismos ids) y al terminar ve **comparación** entre ambos rankings (coincidencias, diferencias, #1 de cada uno).

> Los ids en la URL reconstruyen el desafío sin servidor. Si el link se hace muy largo (N grande), usar ids cortos o comprimir (base36).

---

## 10. Exportar imagen

- **Botón discreto y pequeño** ("Exportar resultado"), no un banner enorme. Al tocarlo, abrir un modal con las opciones.
- Generar con `<canvas>`: formato Story (9:16) y cuadrado.
- Contenido: título, Top 1 con **foto completa sin recortar**, dato curioso del #1, lista del top, nombre del autor.
- Cargar imágenes con `crossOrigin="anonymous"` (usar proxy si hace falta).
- Descargar (`canvas.toBlob`) o compartir como archivo con `navigator.share({ files })`.
- Evitar solapar texto: medir con `ctx.measureText` y truncar/reducir fuente.
- El modal **no debe tapar toda la pantalla en celular**: altura máxima con scroll interno y botón cerrar siempre visible.

---

## 11. Checklist rápido para clonar una nueva arena (ej. Pokémon o Felinos)

1. **Crear la carpeta de la arena**:
   - `mkdir <tema> && cp aves/index.html <tema>/index.html`
   - `mkdir src/<tema>`
2. **Importar el motor compartido**:
   ```js
   import { interleavedBisectSortAsync, estimateTotalSteps, buildChallengeUrl, parseChallengeUrl } from '/src/core/tournament.js';
   import { bindThemeButton, initTheme } from '/src/core/theme.js';
   ```
3. **Definir el adaptador de datos (`src/<tema>/data.js`)**:
   - Para Pokémon: llamar a PokeAPI o cargar catálogo curado local.
   - Para Felinos/Mamíferos: llamar a iNaturalist con taxon `Mammalia` o IDs curados.
   - Retornar la lista de objetos normalizada `{ id, nombre, nombreCientifico, imagen, popularidad }`.
4. **Configurar la identidad visual**:
   - En `<tema>/index.html`, definir las tipografías o acentos de color propios (ej. brutalist para Pokémon, editorial para Aves).
5. **Vincular en el Hub (`index.html`)**:
   - Actualizar el href y estado en el array `ARENAS` de `index.html`.
6. **Probar localmente**:
   - Abrir `http://localhost:5173/<tema>/` y verificar selector, duelos, podio y dark mode.

### Ejemplos concretos

**Pokémon**
- Fuente: PokeAPI. Id = número de Pokédex. Foto: `official-artwork`. Audio: `cries.latest`.
- Categorías: generación, tipo, legendarios, iniciales.
- Presets: "Los 16 más icónicos", "Todos los iniciales", "Legendarios".

**Insectos / bichos**
- Fuente: iNaturalist con `taxon_id=47158` (Insecta); también arañas (`47119`), etc.
- Categorías: mariposas, escarabajos, abejas y avispas, hormigas, arácnidos.
- Presets: "Los más llamativos del mundo", "Los más venenosos".

**Mamíferos**
- Fuente: iNaturalist con `taxon_id=40151` (Mammalia).
- Categorías: felinos, cánidos, primates, marinos, roedores, extintos (mamut, tigre dientes de sable).
- Presets: "Los 16 más icónicos", "Grandes depredadores".

> Los ids de taxón deben verificarse en `https://api.inaturalist.org/v1/taxa?q=...` antes de usarlos.

---

## 12. Buenas prácticas

1. Mantener los datos curados (presets, correcciones) separados del código de UI.
2. No usar emojis en la UI si se quiere un look sobrio; usar íconos SVG.
3. No guardar información sensible en el repo público; roadmaps internos van en archivos ignorados por `.gitignore`.
4. Validar sintaxis del JS antes de publicar (`node -e "new Function(src)"` sobre el script) y probar flujo completo: duelo, deshacer, compartir, abrir link de desafío, exportar.
5. Ideas a futuro (requieren backend): ranking del día global, estadísticas de uso, login con "Pokédex" personal de lo ya visto, comparación entre cuentas, "este favorito es de 100 personas".
