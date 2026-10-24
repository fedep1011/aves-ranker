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
  "trivia": "Posee la mordida más poderosa entre todos los felinos en relación a su tamaño."
}
```

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
3. **Exportación a Canvas 2.0**:
   - Modal compacto con opciones de formato:
     - **Historia / Story (9:16)**: Ideal para Instagram Stories, WhatsApp Status y TikTok.
     - **Tarjeta / Poster (4:5)**: Ideal para feeds de redes sociales.
   - Renderizado con `crossOrigin = 'anonymous'` y dibujo vectorial de medallas, degradados del tema y tipografías nítidas sin artefactos.

---

## 9. Desafío Compartido por URL (Sin Base de Datos)

El estado viaja comprimido en la query string de la URL:
- `?r=4183.1205.992...`: Lista de IDs en el orden del ranking.
- `?c=Nombre+de+la+Categoria`: Título de la partida.
- `?a=Nombre+del+Autor`: Nombre de quien creó el desafío.

Al ingresar con un link de desafío, la app abre `viewChallenge`, precarga esos candidatos exactos y permite al invitado jugar con el mismo pool para comparar su Top 3 contra el del retador al finalizar.

---

## 10. Checklist Paso a Paso para Nuevas Categorías

Al implementar **Insectos**, **Razas de Perros**, **Dinosaurios**, **Maravillas del Mundo** o cualquier nueva arena:

- [ ] **1. Crear dataset curado (`public/data/<arena>.json`)**:
  - Extraer entre 1.000 y 3.000 registros con foto.
  - Ejecutar script de verificación HTTP `200 OK` en cada foto (cero fotos privadas o rotas).
  - Colocar las 16 superestrellas canónicas del tema en las posiciones `0 a 15`.
- [ ] **2. Crear estructura de vistas (`<arena>/index.html`)**:
  - Replicar el asistente de 3 pasos: `viewHome` (con 4 pastillas abajo fijas), `viewStepPlace`, `viewStepTraits`, `viewStepSize`, `viewBattle`, `viewResults`.
  - Asegurar que los contenedores de duelo tengan `#loaderLeft` y `#loaderRight`.
  - Comprobar proporción rígida con fondo `blur-xl` y frente `object-contain`.
- [ ] **3. Implementar controlador (`src/<arena>/main.js`)**:
  - Cargar `public/data/<arena>.json` de forma asíncrona.
  - Conectar filtros de lugar (Paso 1) y familias/atributos (Paso 2).
  - Implementar contador en vivo (`step3TotalFound`) y cálculo de duelos estimados.
  - Conectar `interleavedBisectSortAsync` de `src/core/tournament.js`.
  - Conectar `bindThemeButton` e `initTheme` de `src/core/theme.js`.
  - Implementar modal de Canvas 2.0 adaptado a los colores del tema.
- [ ] **4. Registrar en el Hub General (`index.html`)**:
  - Añadir la tarjeta en la lista `ARENAS` del Hub con ruta `/<arena>/` y etiqueta de estado.
- [ ] **5. Registrar en `vite.config.js`**:
  - Agregar `<arena>: resolve(__dirname, '<arena>/index.html')` en `rollupOptions.input`.
- [ ] **6. Verificación de Calidad**:
  - `npm run test` (todos los tests E2E pasando al 100%).
  - `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py` (cero emojis en UI).
  - `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py` (WCAG 2.2 contrastes válidos).
  - `npm run build` (compilación sin advertencias).
