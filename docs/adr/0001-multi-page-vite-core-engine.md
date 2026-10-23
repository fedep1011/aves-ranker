# ADR 0001: Arquitectura Multi-Página en Vite con Motor Central Compartido (`src/core/`)

- **Estado:** Aceptado
- **Fecha:** 2026-10-22
- **Autor:** Equipo Rankea2 (@fedep1011)

## Contexto

El proyecto Rankea2 nació como un ranking interactivo monoevento centrado en Aves del Mundo (`aves/`). Al evolucionar hacia una plataforma multi-temática (Aves, Pokémon, Mamíferos, Flores), surgieron tensiones entre dos alternativas arquitectónicas:

1. **SPA Clásica Monolítica con React/Vue**: Mayor overhead de empaquetado, dependencia de routers en cliente, bundle pesado y riesgo de fricción entre identidades visuales totalmente distintas (Aves editorial vs Pokémon arcade brutalista).
2. **Multi-Página Estática Desconectada**: Duplicación de lógica de ordenamiento de torneos, control de estado y manipulación de temas, aumentando drásticamente la deuda técnica al clonar cada nueva arena.

## Decisión

Adoptamos una **arquitectura multi-página nativa en Vite (`Rollup Multi-Page`)** respaldada por un **núcleo modular profundo en `src/core/`**:

```
├── index.html                  # Hub central / Galería de cruces
├── aves/
│   └── index.html              # Arena Aves del Mundo (Identidad editorial)
├── pokemon/
│   └── index.html              # Arena Pokémon (Identidad retro arcade / Pokedle)
├── src/
│   ├── core/
│   │   ├── tournament.js       # Motor matemático de ordenamiento, bisect, RNG y challenge URLs
│   │   └── theme.js            # Sincronización desacoplada de tema claro/oscuro
│   ├── aves/
│   │   └── main.js             # Adaptador y controladores de Aves
│   └── pokemon/
│       ├── main.js             # Adaptador, precarga y controladores de Pokémon
│       └── types.js            # Metadatos, colores y badges oficiales de tipos
└── vite.config.js              # Enrutador de entradas estáticas multi-página
```

### Reglas de Diseño
1. **Interfaces Mínimas en el Núcleo**: `src/core/tournament.js` expone funciones puras y asíncronas (`interleavedBisectSortAsync`, `createSeededRng`, `buildChallengeUrl`, `parseChallengeUrl`) sin asumir dependencias de DOM.
2. **Cero Latencia en Votaciones**: Las arenas consumen datasets locales o precacheados (`public/data/pokemon.json`) ejecutando duelos 100% en el cliente sin llamadas de red durante las votaciones.
3. **Identidades Visuales Soberanas**: Cada arena preserva su paleta tipográfica y estética propia sin contaminar al resto.

## Consecuencias

### Positivas
- Tiempos de carga instantáneos (First Contentful Paint < 300ms).
- Nuevas arenas se construyen en horas reutilizando el motor de torneos y el ciclo de promesas/Undo probado de Aves.
- Build multi-página con `npx vite build` genera chunks optimizados y aislados para cada arena.

### Negativas / Mitigaciones
- Rutas compartidas de imágenes entre páginas requieren paths absolutos (`/src/styles/...` o `/data/...`). Se mitiga con aliases y configuración estricta en `vite.config.js`.
