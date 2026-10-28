# Guía: cómo construir un "Ranker 1v1" para cualquier tema (Rankea2)

Receta canónica para crear o clonar una página de ranking por duelos 1 vs 1 en **Rankea2** para cualquier categoría: **Aves, Mamíferos, Flores/Plantas, Insectos, Razas de Perros, Dinosaurios, Maravillas del Mundo**, etc.

Describe la **arquitectura del wizard definitivo, modelo de datos, curación estricta de fotos y contenedor rígido de batalla**.

> Para reutilizar esto: reemplazá la entidad del tema (`criatura`, `mamífero`, `planta`, `insecto`, `perro`, `dinosaurio`, `maravilla`) y seguí cada sección sin desviarte del estándar.

---

## 1. Concepto y Flujo de Usuario

1. **Hub Principal (`/`)**: El usuario entra al selector global y elige el ranking temático deseado.
2. **Pantalla Principal de la Arena (`viewHome`)**:
   - Título canónico: *"Tus [entidades] favoritas del planeta"* (ej. *Tus aves favoritas del planeta*, *Tus mamíferos favoritos del planeta*, *Tus flores y plantas favoritas*, *Tus dinosaurios favoritos*).
   - Opciones inmediatas:
     - Jugar con las 16 más famosas
     - Sorpréndeme (16 al azar)
     - Armar mi búsqueda
   - **Pastillas de opciones de partida rápida siempre visibles abajo de todo**.
3. **Wizard de 3 Pasos (Armar mi búsqueda)**:
   - **Paso 1 de 3**: ¿De qué parte del mundo? (Filtro geográfico con pastillas rápidas y autocompletado).
   - **Paso 2 de 3**: Características clave (Familia, alimentación, hábitat, color, o período geológico + buscador libre).
   - **Paso 3 de 3**: Confirmar partida (Carga de especies con foto en vivo, filtro populares vs azar, cantidad 8/16/32/Todas, estimación de clics y botón de arranque).
4. **Duelos 1 vs 1 (`viewBattle`)**: Contenedor rígido estandarizado, foto frontal completa sin recortes (`object-contain`), fondo desenfocado ambiental (`blur-xl`), loaders y soporte de flechas / Deshacer.
5. **Pantalla de Resultados (`viewResults`)**: Podio Top 3, resto del ranking, dato curioso del #1, sonido/grito opcional del #1 y exportación a Canvas 2.0 (Story 9:16 / Tarjeta 4:5).
6. **Desafío Compartido (`viewChallenge`)**: Vía URL con `?r=id1.id2...` sin base de datos ni backend.

---

## 2. Stack y Estructura Modular

La plataforma está organizada en una arquitectura multi-página modular con Vite y Tailwind CSS:

- **Hub principal (`/`)**: `index.html` — Selector de rankings, cruces destacados y accesos a cada arena.
- **Arenas temáticas existentes**:
  - `/aves/` (`aves/index.html` + `src/aves/`)
  - `/pokemon/` (`pokemon/index.html` + `src/pokemon/`)
  - `/mamiferos/` (`mamiferos/index.html` + `src/mamiferos/`)
  - `/flores/` (`flores/index.html` + `src/flores/`)
- **Próximas arenas planificadas**:
  - `/insectos/` (`insectos/index.html` + `src/insectos/`)
  - `/perros/` (`perros/index.html` + `src/perros/`)
  - `/dinosaurios/` (`dinosaurios/index.html` + `src/dinosaurios/`)
  - `/maravillas/` (`maravillas/index.html` + `src/maravillas/`)
- **Motor centralizado (`src/core/`)**:
  - `src/core/tournament.js`: Algoritmo determinístico (`interleavedBisectSortAsync`), PRNG con semilla (`createSeededRng`), estimación de pasos, generación y parseo de enlaces de desafío (`?r=id1.id2...`).
  - `src/core/theme.js`: Sincronización global Dark/Light Mode con clase `.dark` y persistencia en `localStorage.getItem('rankea2_theme')`.
  - `src/core/canvas.js`: Motor de renderizado en Canvas 2.0 para láminas en alta resolución (Story 9:16 y Tarjeta 4:5).

### Vistas Canónicas Obligatorias por Arena
Cada pantalla es un `<section id="view..." class="hidden ...">` alternado mediante `goToView(viewId)`:

| ID de Vista | Función Estándar |
|---|---|
| `viewHome` | Portada con título de arena, 3 disparadores hero y 4 pastillas de presets rápidos abajo |
| `viewStepPlace` | **Paso 1 de 3**: Filtro de ubicación geográfica / continentes / países |
| `viewStepTraits` | **Paso 2 de 3**: Familias, rasgos clave (alimentación, hábitat, color, época) y búsqueda libre |
| `viewStepSize` | **Paso 3 de 3**: Conteo en vivo de especies con foto, selector 8/16/32/Todas y confirmación |
| `viewBattle` | Tarjetas de duelos rígidas 1v1 con fondo ambiental y loaders |
| `viewResults` | Podio Top 3, grilla del resto, curiosidad del #1 y exportador |
| `viewChallenge` | Pantalla de bienvenida al desafío compartido por URL |

---

## 3. Modelo de Datos Estandarizado

Cada ítem se normaliza en `public/data/<arena>.json` a un objeto con la siguiente estructura:

```json
{
  "id": 4183,
  "name": "Jaguar",
  "sci_name": "Panthera onca",
  "family": "Felidae",
  "group": "felinos",
  "habitat": "selva",
  "diet": "carnívoro",
  "region": "Sudamérica",
  "photo": "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg",
  "observations_count": 52800,
  "trivia": "Posee la mordida más poderosa entre todos los felinos en relación a su tamaño.",
  "countries": ["uruguay", "argentina", "brasil", "paraguay", "bolivia", "sudamérica", "latinoamérica"]
}
```

### 3.1 Jerarquía Territorial con Herencia Geográfica
Para evitar que la selección de un país específico arroje cero resultados (ej. Nueva Zelanda, Japón o Uruguay), el filtrado territorial debe aplicar una **jerarquía descendente con herencia**:

1. **Nivel 1 — Coincidencia Puntual**: Coincidencia en el array `countries` normalizado en minúsculas y sin tildes (ej. `m.countries.includes("uruguay")`).
2. **Nivel 2 — Herencia Regional/Subcontinental**: Si el usuario selecciona un país perteneciente a una región mayor (ej. Uruguay en Sudamérica, Japón en Asia Oriental, Nueva Zelanda en Oceanía), el filtro debe incluir automáticamente especies con rango regional amplio (`region = "Sudamérica"` o `"Latinoamérica"`).
3. **Nivel 3 — Especies Cosmopolitas o Globales**: Especies marinas, migratorias o de distribución mundial (`region = "Global"` o `"Cosmopolita"`) se consideran presentes si su hábitat coincide.
4. **Regla de Cobertura Mínima**: Ningún país listado en el selector rápido o autocompletado debe arrojar menos de 16 candidatos. Si la fauna o flora nativa local es reducida, el dataset debe incluir especies regionales o migratorias que frecuentan dicho territorio.

Estado global estándar de la arena (`app.state`):
```js
{
  catalog: [],             // Catálogo total cargado del JSON local
  filteredPool: [],        // Pool filtrado tras el paso 1 y 2
  battleCandidates: [],    // N candidatos elegidos para el torneo
  initialBattlePool: [],   // Copia congelada para reinicio o deshacer
  finalRanking: [],        // Resultados ordenados 1..N
  selectedRegion: 'all',   // Filtro de lugar
  selectedGroup: 'all',    // Filtro de familia/grupo principal
  selectedSubTrait: 'all', // Filtro secundario (hábitat, uso, color, época)
  searchKeyword: '',       // Texto de búsqueda libre puntual
  candidateLimit: 16,      // 8, 16, 32 o Todas
  samplingMode: 'popular', // 'popular' (más famosas) o 'random' (al azar)
  battleStep: 0,           // Paso actual del torneo
  choiceHistory: [],       // Historial de elecciones para Deshacer
  replayDecisions: [],     // Cola para reproducción automática al deshacer
  battleSeed: 0            // Semilla determinista PRNG
}
```

---

## 4. Curación Estricta de Datasets y Fotos (Protocolo S3 200 OK)

> [!CAUTION]
> ### ⚠️ Por qué fallan las fotos y cómo prevenirlo
> En APIs abiertas como iNaturalist o Wikidata, miles de fotos poseen `license_code: null` (All Rights Reserved / Todos los derechos reservados) o han sido eliminadas por sus autores. Estas fotos **nunca se replican en el bucket público de Amazon S3 Open Data** (`inaturalist-open-data.s3.amazonaws.com`). Intentar cargarlas en el navegador devuelve errores XML `403 Forbidden` o `404 Not Found`, provocando que la UI caiga en iconos o siluetas genéricas.

### Reglas Obligatorias para Cualquier Nueva Categoría:
1. **Verificación previa obligatoria por Script (HTTP 200 OK)**:
   Antes de generar o comitear el archivo `public/data/<arena>.json`, ejecutar un script automatizado que realice peticiones `HEAD` o `GET` con timeout a **cada una de las fotos candidatas**. Solo las fotos que respondan estrictamente con código `200 OK` pueden incluirse en el archivo JSON. Descartar cualquier registro cuya foto falle o sea privada.
2. **Las 16 Superestrellas Canónicas en los Índices 0..15**:
   Los primeros 16 elementos (`índices 0 a 15`) del array JSON DEBEN ser las especies más famosas, emblemáticas y visualmente impactantes del tema a nivel mundial:
   - *Mamíferos*: Jaguar, Tigre de Bengala, León Africano, Oso Polar, Lobo Gris, Elefante Africano, etc.
   - *Flores*: Orquídea Mariposa, Lavanda, Flor de Loto, Rosa Silvestre, Pasionaria, Flor de Cerezo, etc.
   - *Insectos*: Mariposa Monarca, Escarabajo Hércules, Mantis Religiosa, Abeja Reina, Libélula Emperador, etc.
   - *Perros*: Pastor Alemán, Golden Retriever, Border Collie, Husky Siberiano, Beagle, Labrador, etc.
   - *Dinosaurios*: Tyrannosaurus Rex, Triceratops, Velociraptor, Brachiosaurus, Spinosaurus, Stegosaurus, etc.
   - *Maravillas*: Gran Muralla China, Petra, Coliseo Romano, Chichén Itzá, Machu Picchu, Taj Mahal, Cristo Redentor, etc.
   Esto asegura que el botón de partida rápida "Las 16 más famosas" arranque de inmediato con calidad máxima y los tests E2E pasen de forma determinística.
3. **Volumen de Catálogo Representativo**:
   Evitar datasets raquíticos de 16 o 64 ítems. El catálogo local debe contar con un volumen de **1.000 a 4.000 ejemplares** totalmente curados con foto garantizada para que los filtros geográficos y por atributos siempre arrojen decenas de opciones disponibles.

---

## 5. El Wizard Definitivo Canónico (Pantalla por Pantalla)

El configurador oficial para todas las categorías sigue esta experiencia precisa:

### 5.1 Pantalla Principal (`viewHome`)
- **Kicker y Título Display**:
  - Kicker: `Rankea2 · [Categoría]` en mayúsculas espaciadas.
  - Título editorial: *"Tus [entidades] favoritas del planeta"* (ej. *Tus mamíferos favoritos del planeta*, *Tus flores y plantas favoritas*).
  - Subtítulo: Breve frase descriptiva sin relleno redundante.
- **Los 3 Disparadores Hero**:
  - `[ Botón Principal ]`: **"Jugar con las 16 más famosas del mundo →"** (fondo de color primario de la arena, inicia de inmediato el torneo con el top 16).
  - `[ Botón Secundario ]`: **"Sorpréndeme (16 al azar)"** (sortea categoría y filtros e inicia de inmediato).
  - `[ Botón Terciario / Enlace ]`: **"Armar mi búsqueda"** (navega al Paso 1 del wizard).
- **4 Pastillas de Opciones de Partida Rápida (Abajo de todo)**:
  - **REGLA INQUEBRANTABLE**: Las 4 pastillas/tarjetas de presets rápidos **NUNCA se deben ocultar ni eliminar de la pantalla principal**.
  - Ubicadas bajo el titular *"O elige una partida rápida temática"*, en una grilla de 2 a 4 columnas.
  - Cada tarjeta incluye: foto representativa, título del preset (ej. "Grandes felinos", "Acuáticas y loto", "Depredadores jurásicos") y botón con flecha que arranca el torneo con ese filtro precargado en 1 clic.

### 5.2 Paso 1 de 3: ¿De qué parte del mundo? (`viewStepPlace`)
- **Kicker**: `Paso 1 de 3 · Ubicación geográfica`.
- **Pregunta**: *"¿De qué parte del mundo querés ver [entidades]?"*.
- **Pastillas rápidas de selección**:
  - `Todo el mundo` (activo por defecto).
  - Países y regiones clave: `Argentina`, `Uruguay`, `Brasil`, `Chile`, `Perú`, `Toda Latinoamérica`, `Norteamérica`, `Europa`, `Asia`, `África`, `Oceanía`.
- **Buscador con autocompletado**: Campo para ingresar países específicos, con lista desplegable reactiva y chip de selección activa con botón para limpiar (`×`).
- **Navegación**:
  - `← Volver al inicio` (regresa a `viewHome`).
  - `Siguiente: Tipo y categoría →` (avanza a `viewStepTraits`).

### 5.3 Paso 2 de 3: Características Clave (`viewStepTraits`)
- **Kicker**: `Paso 2 de 3 · Tipo y características`.
- **Pregunta**: *"¿Qué características querés incluir?"*.
- **Grupo 1: Familia o Arquetipo Principal**:
  - Grilla de botones interactivos con los grupos clave del tema (ej. en Mamíferos: Felinos, Cánidos, Cetáceos; en Flores: Orquídeas, Rosas, Suculentas; en Perros: Pastores, Sabuesos, Terriers; en Dinosaurios: Terópodos, Saurópodos, Ceratópsidos).
- **Grupo 2: Rasgo Secundario**:
  - Atributo diferenciador: Hábitat ecológico, Tipo de alimentación, Usos, Color predominante o Período geológico.
- **Buscador de Especie en Particular (Opcional)**:
  - Input de texto libre (ej. *Jaguar, Lobo, Lavanda, T-Rex*) con chip activo visible (`activeKeywordChip`) que actualiza la selección en tiempo real.
- **Navegación**:
  - `← Cambiar lugar` (regresa a `viewStepPlace`).
  - `Siguiente: Confirmar →` (avanza a `viewStepSize`).

### 5.4 Paso 3 de 3: Confirmar Partida y Muestreo (`viewStepSize`)
- **Kicker**: `Paso 3 de 3 · Confirmar partida`.
- **Título**: *"Tu selección está lista."* con resumen legible de los filtros aplicados (ej. *Mamíferos · Sudamérica · Felinos*).
- **Contador Dinámico Reactivo**:
  - Muestra en número grande el total de ejemplares disponibles en el catálogo filtrado: `<span id="step3TotalFound">1.842</span> especies con foto`.
  - Si el conteo es menor a 2, muestra una advertencia visual y bloquea el botón de inicio pidiendo ajustar los filtros.
- **Modo de Muestreo ("¿Cuáles entran al juego?")**:
  - Botones de opción: **"Las más famosas"** (`popular`) vs **"Al azar"** (`random`).
- **Selector de Cantidad**:
  - Píldoras seleccionables para `8`, `16` (defecto recomendado), `32` o `Todas` (hasta el tope filtrado).
- **Caja de Estimación de Esfuerzo y Duración**:
  - Badge de intensidad: `Duración Ideal` (para 16), `Partida Rápida` (para 8), `Torneo Épico` (para 32 o más).
  - Tiempo estimado en minutos (`~1.5 min`).
  - Cálculo de duelos y clics: `~42 clics · duelos 1 vs 1` (calculado dinámicamente con la fórmula $N \log_2 N \cdot 0.82$).
- **Disparador Final**:
  - Botón prominente de ancho completo: **"Comenzar partida →"** (inicia `viewBattle`).
- **Navegación inferior**:
  - `← Ajustar filtros` (vuelve a `viewStepTraits`).
  - `Sortear otra categoría al azar` (baraja filtros aleatorios sin salir).

---

## 6. Algoritmo de Duelos (Core Matemático)

Utiliza el algoritmo centralizado en `src/core/tournament.js` basado en **Interleaved Midpoint-Bisect Tournament**:
- **Complejidad óptima**: Resuelve un ordenamiento estricto de N elementos en $\approx N \log_2 N \cdot 0.82$ comparaciones (ej. ~42 duelos para N=16).
- **Determinismo estricto**: Gobernado por una semilla PRNG (`battleSeed`), lo que permite reproducibilidad idéntica y serialización por URL.
- **Deshacer (`Undo`) no destructivo**: El botón `Deshacer` (`#btnUndoBattleChoice`) hace `pop()` del historial en `choiceHistory`, reinicia el árbol de ordenamiento y replaya automáticamente las decisiones hasta el estado anterior instantáneamente.
- **Precarga Anticipada del Primer Duelo**: Antes de conmutar a `viewBattle`, se ejecuta obligatoriamente `await preloadImagePair(candidates[0].photo, candidates[1].photo)` para garantizar que el primer enfrentamiento aparezca sin flash blanco ni spinner.
- **Precarga en Background del Pool**: Justo al iniciar el juego se invoca `preloadCandidatePool(candidates)` para descargar asíncronamente las imágenes de los siguientes duelos en memoria.
- **Transición Sincronizada y Dinámica de Duelos**: Para evitar que una tarjeta se actualice antes que la otra (izq y luego der) o cambios estáticos, se utiliza `await animateDuelTransition(container, updateDomFn, [leftPhoto, rightPhoto], winnerSide)` en `#battleCardsGrid`. Ejecuta una física de empuje visible (la carta ganadora embiste con scale, rotación y sombra profunda noqueando a la perdedora fuera de pantalla en horizontal en PC o vertical en Mobile), seguida de una entrada convergente elástica con spring hacia el centro con las nuevas imágenes precargadas.
- **Carrete Vertical Continuo en Portada (`slideSplitRoll`)**: Las tarjetas divididas diagonalmente del hub (`half-split-left` y `half-split-right`) rotan enfrentamientos emblemáticos mediante un deslizamiento opuesto continuo: mientras una mitad sale hacia arriba, la otra sale hacia abajo y sus reemplazos entran en ese mismo deslizamiento continuo desde los extremos opuestos.

---

## 7. Pantalla de Duelo Rígida (`viewBattle`)

Para evitar desfases entre tarjetas y que las fotos deformen el layout, el contenedor de batalla debe cumplir obligatoriamente esta arquitectura CSS:

```html
<!-- CONTENEDOR RÍGIDO GARANTIZADO -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
  
  <!-- CANDIDATO IZQUIERDO -->
  <button id="cardLeftBtn" type="button" onclick="app.chooseCandidate('left')"
    class="relative w-full rounded-2xl border-2 border-line hover:border-primary bg-surface text-left transition group overflow-hidden focus:outline-hidden flex flex-col justify-between">
    
    <!-- CONTENEDOR DE IMAGEN CON PROPORCIÓN ESTRICTA -->
    <div class="relative w-full h-[27.5dvh] min-h-[175px] max-h-[250px] sm:h-auto sm:max-h-none sm:aspect-[4/3] bg-stone-900 overflow-hidden shrink-0">
      
      <!-- LOADER OBLIGATORIO (Tests 6.3 / 7.3) -->
      <div id="loaderLeft" class="hidden absolute inset-0 z-20 bg-stone-900/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 transition-opacity pointer-events-none">
        <div class="w-6 h-6 rounded-full border-stone-500 border-t-primary animate-spin" style="border-width: 2.5px;"></div>
        <span class="text-[10px] font-medium text-stone-300">Cargando foto...</span>
      </div>

      <!-- FONDO AMBIENTAL BLUR-XL (RELLENA ESPACIO SIN DEFORMAR) -->
      <img id="imgLeftBg" src="" alt="" class="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60 pointer-events-none" aria-hidden="true" />
      
      <!-- FOTO FRONTAL COMPLETA (ZERO-CROP) -->
      <img id="imgLeft" src="" alt="Candidato 1" onload="app.onBattleImgLoad('left')"
        class="absolute inset-0 w-full h-full object-contain object-center z-10 transition duration-300 group-hover:scale-105" />
      
      <span class="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-white backdrop-blur-xs">A</span>
    </div>

    <!-- METADATOS EN UNA SOLA LÍNEA SIN SOLAPAMIENTO -->
    <div class="p-3 sm:p-4 space-y-1 flex-1 flex flex-col justify-center">
      <h3 id="nameLeft" class="font-serif text-lg sm:text-xl text-ink line-clamp-1 leading-snug">...</h3>
      <p id="sciLeft" class="font-mono text-xs text-muted italic line-clamp-1">...</p>
      <div class="flex items-center gap-1.5 pt-1">
        <span id="familyLeft" class="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-canvas border border-line text-muted">...</span>
        <span id="regionLeft" class="text-[10px] font-mono text-muted/70">...</span>
      </div>
    </div>
  </button>

  <!-- CANDIDATO DERECHO (ESTRUCTURA IDÉNTICA CON cardRightBtn, loaderRight, imgRightBg, imgRight) -->
</div>
```

**Reglas de interacción:**
- Atajos de teclado: Flechas `←` y `→` para votar con una sola mano.
- Barra de progreso interactiva con porcentaje numérico (`Duelo X / ~Y · Z%`).
- Botón `Deshacer` habilitado dinámicamente cuando el historial es mayor a 0.

---

## 8. Pantalla de Resultados y Exportación (`viewResults`)

1. **Podio Top 3**:
   - Tarjeta Oro (#1): Mayor escala, corona o badge dorado, dato curioso destacado (`trivia`) y audio si corresponde.
   - Tarjetas Plata (#2) y Bronce (#3): Con sus respectivas medallas e identificadores taxonómicos.
2. **Resto del Ranking (#4 en adelante)**:
   - Grilla ordenada con número de puesto, miniatura cuadrada, nombre común y científico.
3. **Exportación a Canvas 2.0 y Prevención de Tainted Canvas**:
   - Modal compacto con opciones de formato:
     - **Historia / Story (9:16)**: 1080x1920 px, ideal para Instagram Stories, WhatsApp Status y TikTok.
     - **Tarjeta / Poster (4:5)**: 1080x1350 px, ideal para feeds de redes sociales.
   - **Protocolo Anti-Tainted Canvas (Seguridad CORS)**:
     - Las imágenes de AWS S3 Open Data o CDNs de terceros a menudo carecen de cabeceras `Access-Control-Allow-Origin: *`.
     - Si se dibuja una imagen remota directamente en el canvas sin CORS válido, el navegador marca el canvas como *tainted* (contaminado) y bloquea `toDataURL()` o `toBlob()` con un error `SecurityError`.
     - **Regla de oro**: `src/core/canvas.js` debe usar un proxy seguro (ej. `https://wsrv.nl/?url=...` o proxy propio) o un fallback vectorial/gradiente para que el canvas siempre pueda exportarse, copiarse y descargarse limpiamente.
4. **Semillas Deterministas (`battleSeed`) y Desafíos**:
   - Generar `state.battleSeed` como cadena alfanumérica de 8 caracteres con prefijo funcional (`generateSeed('r')` para azar o `'p'` para populares) antes de muestrear candidatos.
   - Sincronizar la semilla en la URL del desafío compartido strictly como `?s=r7x9b2kf` mediante `buildSeedChallengeUrl` (~43 caracteres, sin query params innecesarios).
   - Al abrir la URL, regenerar el pool con `createSeededRng(state.battleSeed)` y `sampleCandidates`, garantizando que ambos jugadores reciban exactamente los mismos candidatos y el mismo orden inicial de duelos.

---

## 9. Desafío Compartido por URL (Sin Base de Datos)

El estado viaja en la query string de la URL:
- **Compartir Resultado / Podio Final**: `?r=id1.id2.id3...` (secuencia ordenada de las especies del ranking final, ej. `?r=5020.4981.144455...`). Esto permite que el receptor vea de inmediato en el banner el podio idéntico del creador (#1 ORO, #2 PLATA, #3 BRONCE) y juegue con esas mismas especies para comparar decisiones.
- **Desafío por Semilla (Partida Virgen / Chaos Pool)**: `?s=r7x9b2kf` (URL ultra-corta de ~43 caracteres para sortear 16 especies al azar idénticas).
- **Formatos y Parámetros Soportados**:
  - `?r=...`: IDs ordenados del ranking.
  - `?s=...`: Semilla de 8 caracteres o lista de IDs dot-separated.
  - `?cid=...`: Formato comprimido base64.

Al ingresar con un link de desafío, la app abre el banner de desafío, precarga los candidatos exactos y permite al invitado jugar con el mismo pool para comparar su Top 3 contra el del retador al finalizar.

---

## 10. Footer Canónico y Créditos de Autor

Cada arena **debe incluir obligatoriamente** el footer estándar con navegación cruzada a las demás arenas y el crédito al creador con enlace a su GitHub:

```html
<footer class="border-t border-line py-6 text-center text-xs text-muted mt-auto">
  <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <span class="font-serif font-bold text-sm text-ink">Rankea2</span>
      <span class="text-muted/60">·</span>
      <span>[Nombre y descripción corta de la arena]</span>
    </div>
    <div class="flex flex-wrap items-center gap-4 text-muted/80">
      <div class="flex items-center gap-3">
        <a href="/" class="hover:text-ink transition">Arenas</a>
        <a href="/aves/" class="hover:text-ink transition">Aves</a>
        <a href="/pokemon/" class="hover:text-ink transition">Pokémon</a>
        <a href="/flores/" class="hover:text-ink transition">Flores</a>
        <a href="/mamiferos/" class="hover:text-ink transition">Mamíferos</a>
        <a href="/que-prefieres/" class="text-purple-600 dark:text-purple-400 font-semibold hover:underline transition">¿Qué Prefieres?</a>
      </div>
      <span class="opacity-40">·</span>
      <div>
        <span>Creado por</span> <a href="https://github.com/fedep1011" target="_blank" rel="noopener" class="font-medium text-ink hover:text-primary underline underline-offset-4 transition">fedep1011</a>
      </div>
    </div>
  </div>
</footer>
```

### Reglas del Footer:
1. **Atribución visible**: El texto `Creado por fedep1011` debe estar presente en todas las páginas con enlace externo seguro (`target="_blank" rel="noopener"`).
2. **Navegación cruzada**: Enlaces directos a `/` (Hub de Arenas) y a las categorías activas.
3. **Sticky footer**: La clase `mt-auto` en el `<footer>` garantiza que permanezca siempre al pie de página incluso con contenido corto en pantallas altas.

---

## 11. Marco Legal, Privacidad, Atribuciones y Deslindes (A Implementar)

Para asegurar el cumplimiento normativo internacional, proteger la autoría de terceros y deslindar responsabilidades comerciales, toda arena y la plataforma general deben contemplar las siguientes directivas legales y de atribución:

### 11.1 Términos y Condiciones, Privacidad y Cookies
- **Política de Privacidad**:
  - Principio *Offline-First* y respeto estricto a los datos del usuario: sin tracking invasivo ni venta de datos.
  - Almacenamiento local transparente: explicitar el uso de `localStorage` para guardar preferencias de tema (`rankea2_theme`), historial de elecciones, rachas y estados de torneos en el dispositivo.
  - Futuro login (Supabase): consentimiento previo e informado para sincronizar partidas en la nube.
- **Términos de Servicio**:
  - Uso recreativo, educativo y de entretenimiento sin fines de lucro.
  - Responsabilidad del usuario respecto a enlaces compartidos generados.
- **Política de Cookies / LocalStorage**:
  - Banner o aviso informativo minimalista y no invasivo para cumplimiento normativo (GDPR / ePrivacy / CCPA), informando el uso técnico de almacenamiento local.
- **Herramienta Legal de Claude**:
  - Emplear el asistente/herramienta legal de Claude para la redacción, estandarización y auditoría periódica de los textos de términos, privacidad y cookies, garantizando claridad en español rioplatense neutro sin oscuridad jurídica.

### 11.2 Reconocimiento y Atribución a Creadores y Fuentes
- **Licencias Abiertas de Fotografía y Datos**:
  - Los datos y contenidos multimedia provienen de repositorios abiertos (**iNaturalist Open Data**, **GBIF**, **Wikimedia Commons**, **PokéAPI / Showdown**).
  - Reconocimiento explícito a los fotógrafos, naturalistas y creadores que licencian su trabajo bajo Creative Commons (CC BY, CC BY-SA, etc.).
  - Enlace o modal de atribuciones (`viewAttributions` o modal de licencias) accesible desde el footer para dar crédito a las fuentes y permitir solicitudes de rectificación o retiro.

### 11.3 Deslinde de Responsabilidad y Marcas Registradas (IP Disclaimers)
- **Deslinde Específico de Nintendo y Franquicias**:
  - En la arena de **Pokémon** y en cualquier futura arena vinculada a propiedades intelectuales comerciales, debe incluirse una cláusula visible y explícita de deslinde:
    > *Rankea2 es un proyecto independiente desarrollado por fans con fines educativos y de entretenimiento. Pokémon y los nombres de las criaturas son marcas registradas y propiedad intelectual de Nintendo, Creatures Inc. y Game Freak. Este proyecto no está afiliado, respaldado, asociado ni patrocinado por Nintendo ni The Pokémon Company.*
- **Deslinde General para Marcas Registradas de Terceros**:
  - Aplicable a cualquier marca, monumento protegido o entidad con derechos reservados que se incluya en el futuro: uso legítimo (*fair use / nominative use*) únicamente con propósitos lúdicos, culturales y de comparación pública.

---

## 11.4 Triple Frente de Identidad Visual Canónica por Ranking

Cada arena del ecosistema Rankea2 debe crearse o actualizarse resolviendo **los tres frentes de identidad visual**:

1. **Página de la Arena (`/<ranking>/`)**:
   - Paleta temática exclusiva (Light y Dark mode sin colisión de tokens con otras arenas).
   - Filigranas vectoriales de fondo anti-slop SVG puras (`currentColor`) con opacidades sutiles (`0.10` en claro, `0.08` en oscuro) ubicadas en capa `z-0 pointer-events-none`.
   - Orientación coherente de los vectores (ej. aves mirando hacia el centro/frente, no hacia los márgenes).
   - Cero dependencias de iconos pesados o emojis en la UI.
2. **Tarjeta en el Hub Principal (`index.html`)**:
   - Tarjeta interactiva con split dinámico o estático de especies representativas.
   - Borde y acento temático acorde a la paleta de la arena.
   - La foto utilizada en el split debe ser idéntica a la foto canónica curada de esa especie en el ranking.
3. **Tarjeta de Exportación Canvas 2.0 (`src/core/canvas.js`)**:
   - Renderizado en alta definición para Story (9:16) y Poster (4:5 / 1:1).
   - Marco temático distintivo, medallas vectoriales de podio (#1, #2, #3) y tipografía concisa.

---

## 11.5 Protocolo de Curaduría Fotográfica y Unificación (`/kurador.html`)

- **Herramienta Kurador**: Acceso en `/kurador.html` para shootouts 1 vs 1 entre fuentes fotográficas (iNaturalist S3 actual vs Wikipedia REST API vs carga manual).
- **Persistencia Cloud-First**: Se guarda en Supabase (`pack_id = curation_<arena>`) con respaldo en `localStorage`.
- **Regla de Oro de Unificación**: La foto ganadora seleccionada en Kurador se propaga sin excepción a:
  1. El archivo de datos de la arena (`public/data/<arena>.json`).
  2. La portada y split de la arena en el Hub (`index.html`).
  3. La tarjeta descargable Canvas 2.0 (`src/core/canvas.js`).
- **Curaduría Colaborativa**: Si dos personas curan simultáneamente, el flujo estándar es asignar categorías diferentes (ej. Usuario A en Mamíferos, Usuario B en Aves) para lograr 100% de velocidad con cero colisiones.

---

## 12. Checklist Exhaustiva para Clonar o Crear una Nueva Arena

Al implementar **Insectos**, **Razas de Perros**, **Dinosaurios**, **Maravillas del Mundo** o auditar las existentes (Aves, Mamíferos, Flores, Pokémon):

- [ ] **1. Curación y Modelo de Datos (`public/data/<arena>.json`)**:
  - [ ] Volumen representativo: entre 1.000 y 3.000 registros con foto.
  - [ ] Protocolo S3 200 OK: Verificación por script de respuesta `200` en cada foto (cero links privados o rotos).
  - [ ] Anti-Slop fotográfico: Eliminar fotos de cámaras trampa nocturnas, fotos borrosas de celulares o flores marchitas. Usar Wikipedia API si la especie principal tiene foto deficiente.
  - [ ] Las 16 superestrellas canónicas mundiales en los índices `0..15`.
  - [ ] Jerarquía territorial con herencia: Array `countries` con países y regiones asociadas, garantizando que países como Uruguay, Japón o Nueva Zelanda no queden en cero.
- [ ] **2. Estructura de Vistas y Plantilla (`<arena>/index.html`)**:
  - [ ] `viewHome`: Título display conciso, los 3 botones hero ("16 más famosas...", "Sorpréndeme", "Armar mi búsqueda") y las **4 pastillas de partida rápida siempre visibles abajo**.
  - [ ] `viewStepPlace`: Paso 1 Lugar con selector rápido, buscador autocompletado y conteo reactivo de especies.
  - [ ] `viewStepTraits`: Paso 2 Rasgos/Familias/Alimentación con buscador libre y chip de filtro activo.
  - [ ] `viewStepSize`: Paso 3 Confirmación con selector 8/16/32/Todas, modo populares vs azar, estimación de duelos y arranque.
  - [ ] `viewBattle`: Contenedor rígido `aspect-[4/3]`, foto frontal completa `object-contain`, fondo ambiental `blur-xl`, loaders `#loaderLeft` / `#loaderRight`, atajos de teclado y botón Deshacer.
  - [ ] `viewResults`: Podio Top 3, grilla ordenada restante, curiosidad (`trivia`) del #1 y botón exportador.
  - [ ] `viewChallenge`: Pantalla de desafío compartido.
  - [ ] `footer`: Footer canónico con créditos de autoría (`fedep1011`), navegación cruzada y clase `mt-auto`.
- [ ] **3. Controlador y Lógica (`src/<arena>/main.js`)**:
  - [ ] Carga asíncrona de `public/data/<arena>.json` con fallback seguro.
  - [ ] Conexión del algoritmo determinista `interleavedBisectSortAsync` de `src/core/tournament.js`.
  - [ ] Generación y persistencia de `state.battleSeed` alfanumérico canónico de 8 caracteres (`generateSeed` / `parseSeed`).
  - [ ] Generación y decodificación de URLs de desafío ultra-cortas (`?s=a7x9b2kf`) mediante `buildSeedChallengeUrl` y `parseChallengeUrl` (con soporte retrocompatible para `?cid=` y `?r=`).
  - [ ] Motor de jerarquía territorial con herencia (`País -> Subregión -> Continente -> Global`).
  - [ ] Conexión de Dark Mode e iconos reactivos con `bindThemeButton` e `initTheme` de `src/core/theme.js`.
  - [ ] Modal y exportación Canvas 2.0 (Story 9:16 y Tarjeta 4:5) conectado a `src/core/canvas.js` con protocolo anti-tainted canvas.
  - [ ] Auditoría de interactivos: Cero botones mudos o listeners desconectados (probar cada botón del DOM).
- [ ] **4. Registro en el Ecosistema Multi-Página**:
  - [ ] Registrar en el Hub General ([`index.html`](file:///c:/Users/fedep/Documents/antigravity/lucid-curie/index.html)) dentro del array `ARENAS` y en las pastillas de cruces.
  - [ ] Registrar en [`vite.config.js`](file:///c:/Users/fedep/Documents/antigravity/lucid-curie/vite.config.js) en `rollupOptions.input`.
  - [ ] Registrar en [`tailwind.config.js`](file:///c:/Users/fedep/Documents/antigravity/lucid-curie/tailwind.config.js) en la lista `content`.
  - [ ] Definir tokens de paleta en [`src/styles/tailwind.css`](file:///c:/Users/fedep/Documents/antigravity/lucid-curie/src/styles/tailwind.css) (`body.arena-<arena>`).
- [ ] **5. Cumplimiento Legal y Atribuciones**:
  - [ ] Atribución visible a fotógrafos y fuentes de datos (iNaturalist Open Data, GBIF, Wikimedia).
  - [ ] Cláusula de deslinde de responsabilidad (IP disclaimer) si incluye marcas o personajes de terceros (ej. Nintendo en Pokémon).
- [ ] **6. Verificación de Calidad**:
  - [ ] `npm run lint` (0 emojis en UI, 0 errores de taste, ratios WCAG 2.2 superados).
  - [ ] `npm run build` (compilación exitosa sin errores de bundle).
