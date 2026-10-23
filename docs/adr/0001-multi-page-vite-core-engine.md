# ADR 0001: Arquitectura Multi-Página en Vite con Motor Central Compartido (`src/core/`)

- **Estado:** Aceptado (Actualizado: 2026-10-23)
- **Fecha Original:** 2026-10-22
- **Última Actualización:** 2026-10-23
- **Autor:** Equipo Rankea2 (@fedep1011)

---

## Contexto

El proyecto Rankea2 nació como un ranking interactivo monoevento centrado exclusivamente en Aves del Mundo (`/aves/`). Al evolucionar hacia una plataforma multi-temática que incorpora arenas para Pokémon (`/pokemon/`), Mamíferos (`/mamiferos/`) y Flores (`/flores/`), conectadas a un portal hub central (`/`), surgieron dos alternativas arquitectónicas contrapuestas:

1. **SPA Monolítica Tradicional (React / Vue / Svelte):**
   - Implicaba un bundle inicial voluminoso, dependencias de routers en el cliente, complejidad en el manejo de estado global y alto riesgo de contaminación de estilos entre identidades estéticas radicalmente distintas (editorial en Aves, retro arcade brutalista en Pokémon, documental safari en Mamíferos y herbario botánico en Flores).

2. **Multi-Página Estática Desconectada:**
   - Crear proyectos o carpetas estáticas completamente aisladas conducía a una duplicación insostenible del algoritmo de torneos, control de temas y renderizado de tarjetas gráficas, elevando exponencialmente la deuda técnica al incorporar cada nueva temática.

---

## Decisión

Adoptamos una **arquitectura multi-página nativa en Vite (`Rollup Multi-Page`)** combinada con un **núcleo de módulos profundos en `src/core/`**. 

Cada arena constituye un punto de entrada HTML independiente, mientras que los algoritmos de ordenamiento, control de tema y exportación visual residen en módulos centrales reutilizables y desacoplados del DOM.

### Estructura del Sistema

```
├── index.html                  # Hub central / Galería de cruces y selector de arenas
├── aves/
│   └── index.html              # Arena Aves del Mundo (Identidad editorial clásica)
├── pokemon/
│   └── index.html              # Arena Pokémon (Identidad retro arcade brutalista)
├── mamiferos/
│   └── index.html              # Arena Mamíferos (Identidad documental safari)
├── flores/
│   └── index.html              # Arena Flores (Identidad herbario botánico)
├── src/
│   ├── core/
│   │   ├── tournament.js       # Motor matemático determinista, bisección, PRNG y challenge URLs
│   │   ├── theme.js            # Sincronización reactiva de tema claro/oscuro en localStorage
│   │   └── canvas.js           # Motor de exportación Canvas 2.0 (Story 9:16 y Poster 4:5)
│   ├── aves/
│   │   └── main.js             # Adaptador de catálogo, audio iNaturalist y controladores de Aves
│   ├── pokemon/
│   │   ├── main.js             # Adaptador, wizard, precarga de sprites y controladores de Pokémon
│   │   └── types.js            # Metadatos, colores y badges oficiales de tipos
│   ├── mamiferos/
│   │   └── main.js             # Adaptador y controladores de Mamíferos
│   └── flores/
│       └── main.js             # Adaptador y controladores de Flores
├── public/
│   └── data/                   # Datasets curados estáticos (aves.json, pokemon.json, etc.)
└── vite.config.js              # Enrutador Rollup Multi-Page (5 entradas HTML)
```

---

## Principios Arquitectónicos y Contratos del Núcleo

### 1. Motor de Torneos (`src/core/tournament.js`)
- **Interfaces públicas mínimas:** Expone funciones puras y asíncronas (`interleavedBisectSortAsync`, `sampleCandidates`, `createSeededRng`, `buildChallengeUrl`, `parseChallengeUrl`).
- **Bisección intercalada determinista:** Resuelve un ranking estricto de $N$ candidatos en $O(N \log N)$ pasos ($ \approx 0.82 \cdot N \log_2 N $ duelos directos), maximizando la información obtenida en cada decisión del usuario.
- **PRNG determinista (`mulberry32`):** Permite deshacer decisiones (*Undo*) con retroceso limpio del historial y reproducción exacta del torneo compartiendo únicamente la semilla.
- **Challenge URLs:** Serialización compacta en parámetros de búsqueda (`?r=id1.id2...&c=...&a=...`) sin persistencia obligatoria en base de datos externa.

### 2. Sincronización de Tema (`src/core/theme.js`)
- Alternancia de tema (`dark` / `light`) sincronizada a través de la clase `.dark` en `document.documentElement` y persistida en `localStorage` (`rankea2-theme`).
- `bindThemeButton`: Vinculación reactiva con intercambio accesible de iconos SVG (`currentColor`).

### 3. Motor de Exportación Canvas 2.0 (`src/core/canvas.js`)
- Renderizado desacoplado de tarjetas de victoria en dos resoluciones optimizadas:
  - **Story (9:16, 1080 x 1920 px):** Orientada a historias de redes sociales.
  - **Poster (4:5, 1080 x 1350 px):** Orientada a publicaciones de feed y cuadrículas.
- **Encuadre zero-crop con fondo ambiental:** Dibuja el candidato ganador en modo contención (`contain`) sobre un fondo desenfocado generado a partir de la imagen original, previniendo recortes indeseados en cualquier relación de aspecto.
- **Pixel art nearest-neighbor:** Desactiva el suavizado bilineal (`imageSmoothingEnabled = false`) para sprites retro de Pokémon, preservando la nitidez de píxeles.
- **Exportación agnóstica:** `exportRankingCard` canaliza la salida mediante Web Share API nativa cuando está soportada (móviles), con fallback transparente a descarga de archivo PNG y copia al portapapeles.

### 4. Cero Latencia en Duelos
- Todos los torneos operan 100% en la memoria del cliente utilizando datasets pre-cargados (`public/data/*.json`) o llamadas iniciales a catálogos CDN. No se realizan llamadas de red durante la interacción de votación, eliminando cualquier riesgo de latencia, fallos de conectividad o rate-limiting en medio de una partida.

### 5. Soberanía Estética
- Cada arena preserva su identidad tipográfica, tokens cromáticos y marcado semántico independiente, evitando colisiones de clases o dependencias cruzadas en estilos globales.

---

## Consecuencias y Métricas

### Ventajas Observadas
- **Rendimiento de Compilación:** Compilación completa de las 5 páginas MPA en Vite en menos de 1 segundo (típicamente ~990ms), generando bundles y CSS purgados y optimizados por separado.
- **Tiempos de Carga Iniciales:** First Contentful Paint (FCP) inferior a 300ms en cargas iniciales locales y sobre CDN Edge (Cloudflare Pages).
- **Mantenibilidad:** Correcciones y mejoras en los algoritmos del torneo, en la lógica de temas o en el exportador de Canvas se propagan instantáneamente a todas las 4 arenas sin duplicación.
- **Escalabilidad de Contenido:** Incorporación de nuevas temáticas en cuestión de horas creando únicamente el archivo HTML, dataset curado y controlador de cliente correspondiente.

### Desventajas y Mitigaciones
- **Rutas de Recursos Multi-Página:** Al residir las arenas en subdirectorios (`/aves/`, `/pokemon/`, etc.), las rutas relativas de scripts y estilos pueden romperse. **Mitigación:** Se exige el uso estricto de rutas absolutas con barra inicial (`/src/styles/...`, `/public/data/...`) validadas en el proceso de build de Vite.
- **Duplicación de Marcado de Modales:** La estructura HTML del modal de exportación se replica en las páginas de cada arena para respetar el diseño visual nativo de cada una. **Mitigación:** La lógica de renderizado, cálculo de dimensiones y exportación está 100% centralizada en `src/core/canvas.js`.
