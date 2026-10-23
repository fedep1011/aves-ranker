# Rankea2 — Plataforma de Torneos y Rankings 1 vs 1

Plataforma web interactiva para descubrir, rankear y compartir tus favoritos en cualquier temática mediante duelos directos cara a cara y torneos de 16 candidatos.

- **Jugar en línea:** [https://rankea2.pages.dev/](https://rankea2.pages.dev/)
- **Arena Aves del Mundo:** [https://rankea2.pages.dev/aves/](https://rankea2.pages.dev/aves/) *(Enlace alternativo clásico: [aves-ranker en GitHub Pages](https://fedep1011.github.io/aves-ranker/))*

---

## Arenas y Categorías

- **Aves del Mundo (Activa):** Más de 11.000 especies con fotografías en tiempo real, cantos en vivo de iNaturalist y filtros por país/color/bioma. [Jugar Aves →](/aves/)
- **Pokémon (Activa):** Las 1025 criaturas de Generaciones 1 a 9, filtros por región, 18 tipos elementales y rareza (iniciales y legendarios) con sprites animados y estética arcade retro. [Jugar Pokémon →](/pokemon/)
- **Mamíferos y Felinos (En camino):** Depredadores, felinos y fauna silvestre mundial.
- **Flores y Botánica (En camino):** Orquídeas y flora emblemática.

## Arquitectura y Decisiones Técnicas

- **Multi-Página Vite:** Entrada multi-página nativa con aislamiento estético y empaquetado optimizado (`vite.config.js`). Consultar [ADR 0001: Arquitectura Multi-Página](docs/adr/0001-multi-page-vite-core-engine.md).
- **Motor Central Compartido (`src/core/`):**
  - `tournament.js`: Ordenamiento asíncrono determinista `interleavedBisectSortAsync`, generador pseudoaleatorio seeded mulberry32 y serializador de desafíos compartidos (`?r=id1.id2...`).
  - `theme.js`: Sincronización desacoplada de tema claro y oscuro persistido en `localStorage`.
- **Cero Latencia en Duelos:** Ejecución 100% en memoria del cliente sin bloqueos por rate-limiting durante las votaciones.
- **Auditoría de Calidad:** Sin emojis en la interfaz pública y validación estricta de contraste WCAG 2.2 AA.

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor local
npm run dev

# Compilar para producción
npm run build
```

---

Creado por [@fedep1011](https://github.com/fedep1011).
