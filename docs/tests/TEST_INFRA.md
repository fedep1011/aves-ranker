# Infraestructura de Pruebas E2E — Rankea2

Este documento describe la arquitectura, diseño y metodología del arnés de pruebas de caja opaca (Opaque-Box E2E Testing Harness) de Rankea2.

---

## 1. Principios de Diseño y Arquitectura

1. **Cero Dependencias de Navegador Externo**: La suite corre sobre Node.js nativo con módulos ESM (`tests/e2e/test_suite.mjs`). No requiere Puppeteer, Playwright, Selenium ni Chromium, lo que garantiza ejecución instantánea (<50ms) en cualquier entorno CI/CD o máquina local sin configuración de drivers.
2. **Simulador DOM Hermético (`tests/e2e/harness.mjs`)**: Proporciona un entorno virtual ligero que emula `document`, `window`, `localStorage`, `matchMedia`, `fetch` (resolviendo datasets locales desde `public/data/*.json`) y selección CSS avanzada (`#id`, `.class`, `tag`, `tag.class`, `tag[attr="val"]`).
3. **Cálculo Matemático WCAG 2.2**: Incluye funciones de luminancia relativa y razón de contraste conformes a la especificación W3C para validar contrastes de texto y badges retro (ratio > 15:1).
4. **Ejecución Secuencial y Determinística**: Los casos de prueba asíncronos se encolan y ejecutan serialmente mediante `await harness.executeAll()`, evitando condiciones de carrera o contaminación entre niveles.

---

## 2. Metodología de 4 Niveles (4-Tier Test Suite)

La suite implementa **126 casos de prueba** estructurados en 4 niveles rigurosos:

```
tests/e2e/
├── harness.mjs                   # Motor de aserciones, simulación DOM y métricas
├── tier1_feature_coverage.mjs    # Nivel 1: Cobertura exhaustiva de las 10 funcionalidades
├── tier2_boundary_corner.mjs     # Nivel 2: Casos límite, estrés y tolerancia a fallos
├── tier3_cross_feature.mjs       # Nivel 3: Interacciones combinadas entre módulos
├── tier4_real_world.mjs          # Nivel 4: Simulaciones completas de torneos end-to-end
└── test_suite.mjs                # Entrypoint principal y generador del reporte
```

### Nivel 1: Cobertura de Funcionalidades (Tier 1: Feature Coverage)
- **Total:** 51 casos de prueba (>=5 por funcionalidad).
- **Alcance:**
  1. *Pokémon Wizard & Live Counter*: Estructura unificada en pantalla única, reactividad del contador `#step3TotalFound`, filtros por región, tipo elemental y rareza.
  2. *Pokémon Slider (8..64)*: Configuración `min="8" max="64" value="16" step="8"`, botones de acceso rápido (8, 16, 32, MAX), estimación determinística de elecciones ($\approx 0.82 \cdot N \log_2 N$).
  3. *Pokémon Animated Sprites*: Patrón URL Showdown, cascada de fallback (GIF -> `pixel_sprite` -> `artwork`), atributos `onerror` en duelos y podio.
  4. *Pokémon Legible Dex ID*: Formateo con padding `No. 025`, elementos `#dexLeft`/`#dexRight`, contraste WCAG AAA (>15:1).
  5. *Aves Zero-Cropping Framing*: Clases `object-contain object-center` en fotos principales, fondo ambiental `blur-xl`, tarjeta diagonal del Hub con encuadre curado.
  6. *Mamíferos Arena*: Estructura de vistas en `mamiferos/index.html`, dataset `mamiferos.json` (16 especies), tarjetas 4:3, podio y rest ranking, enlace en Hub y Vite.
  7. *Flores Arena*: Estructura de vistas en `flores/index.html`, dataset `flores.json` (16 flores), tarjetas 4:3, podio y rest ranking, enlace en Hub y Vite.
  8. *Core Tournament Sort & Theme*: Exportaciones de `src/core/tournament.js`, determinismo con semilla mulberry32, modos `popular` vs `random`, serialización y parsing de URL de desafío (`?r=...`), persistencia en `src/core/theme.js`.
  9. *Canvas 2.0 Export Specs*: Especificación de formatos Historia (9:16 a 1080x1920) y Póster (4:5 a 1080x1350), paletas por arena, medallas (Oro, Plata, Bronce), contratos de descarga y Web Share API.
  10. *Linters & Docs*: Validación sin emojis (`check_no_emoji.py`), taste linter (`lint_taste.py`), contrastes requeridos (`validate_contrast.py`), documentación `README.md` y ADR 0001.

### Nivel 2: Casos Límite y Extremos (Tier 2: Boundary & Corner Cases)
- **Total:** 50 casos de prueba (>=5 por funcionalidad).
- **Alcance:**
  - Consultas sin resultados (0 coincidencias) que activan `#noPokemonWarning` y deshabilitan el inicio.
  - Consultas de 1 solo resultado (inhabilitado para torneo).
  - Consulta máxima del catálogo completo (1025 criaturas).
  - Valores extremos de slider (<8, >64, NaN, no numéricos, 'MAX').
  - Criaturas de Gen 9 con sprite GIF faltante en Showdown (ej. #1025 Pecharunt) y parada de recursión.
  - Padding de identificador en bordes: 1 dígito (`No. 001`), 2 dígitos (`No. 025`), 3 dígitos (`No. 150`), 4 dígitos (`No. 1025`).
  - Aspect ratios extremos: foto ultra-vertical (1:4) y ultra-panorámica (4:1) sin amputación de cabezas o cuerpos.
  - Torneos mínimos de 2 candidatos y completos de 16 candidatos para Mamíferos y Flores.
  - Manejo de arrays vacíos `[]` y unitarios `[item]` en `interleavedBisectSortAsync`.
  - Conmutatividad y simetría de la fórmula de contraste WCAG ($C(A, B) = C(B, A)$).

### Nivel 3: Combinaciones Entre Módulos (Tier 3: Cross-Feature Combinations)
- **Total:** 15 casos de prueba.
- **Alcance:**
  - Filtro (Gen 1 + Fuego) + Slider (8) + Inicialización de torneo.
  - Filtro (Iniciales) + Slider (16) + Determinismo de ordenamiento por semilla.
  - Alternancia de tema (Oscuro -> Claro) + Contraste de badge Dex en duelo.
  - Alternancia de tema + Adaptación de paleta gráfica Canvas 2.0.
  - Ordenamiento de duelo + Generación de podio y medallas (Pokémon, Aves, Mamíferos, Flores).
  - Función Deshacer (Undo) + Desapilado de historial de elecciones + Replay determinístico.
  - Generación de link de desafío a partir de podio final + Carga y juego de revancha.
  - Fallo de sprite durante batalla + Desbloqueo de elemento de audio de grito.
  - Cruce rápido en el Hub + Enrutamiento de URL hacia cada arena.
  - Persistencia de tema en `localStorage` compartida entre el Hub y las 4 arenas.

### Nivel 4: Escenarios del Mundo Real (Tier 4: Real-World Scenarios)
- **Total:** 10 casos de prueba.
- **Alcance:**
  - Simulación completa de torneo Preset Kanto Clásicos (16 candidatos, 100% de duelos votados hasta coronación y link de desafío).
  - Simulación completa de torneo Preset Iniciales con votos alternados.
  - Simulación completa de torneo Preset Legendarios con preferencia derecha.
  - Flujo completo de Wizard personalizado (Gen 3 + Agua + 8 candidatos).
  - Torneo completo de Aves con 3 operaciones de Deshacer (Undo) en pasos 5, 10 y 15.
  - Ciclo completo de Desafío Compartido en Aves (generación de URL -> parsing -> aceptación -> juego de revancha).
  - Simulación completa de torneo de 16 Mamíferos (Jaguar, Puma, etc.) hasta podio.
  - Simulación completa de torneo de 16 Flores (Orquídeas, etc.) hasta podio.
  - Continuidad de tema visual a través de todas las pantallas navegables.
  - Ciclo de vida de exportación Canvas 2.0 (Top 3 -> Tarjeta Historia 9:16 -> Tarjeta Póster 4:5 -> Descarga).

---

## 3. Instrucciones de Ejecución

Para ejecutar la suite completa de pruebas E2E:

```bash
# Ejecutar suite principal
node tests/e2e/test_suite.mjs
```

### Salida Esperada:
```
==============================================================================
  RANKEA2 E2E TEST SUITE REPORT (4-TIER SPECIFICATION)
==============================================================================

▶ [Tier 1: Feature Coverage] — Tests: 51 | Passed: 51 | Failed: 0 | Pass Rate: 100.0%
▶ [Tier 2: Boundary & Corner Cases] — Tests: 50 | Passed: 50 | Failed: 0 | Pass Rate: 100.0%
▶ [Tier 3: Cross-Feature Combinations] — Tests: 15 | Passed: 15 | Failed: 0 | Pass Rate: 100.0%
▶ [Tier 4: Real-World Scenarios] — Tests: 10 | Passed: 10 | Failed: 0 | Pass Rate: 100.0%

==============================================================================
  AGGREGATE SUMMARY:
  Total Tests: 126 | Passed: 126 | Failed: 0 | Duration: 0.03s
  Overall Pass Rate: 100.0%
==============================================================================

✨ ALL TEST TIERS PASSED WITH 100% SUCCESS RATE!
```

---

## 4. Guía de Extensión para Futuras Arenas

Para agregar una nueva arena (ej. `/reptiles/`):
1. Crear el dataset en `public/data/reptiles.json`.
2. Crear `reptiles/index.html` consumiendo `src/core/tournament.js` y `src/core/theme.js`.
3. Registrar la entrada en `vite.config.js`.
4. En `tests/e2e/tier1_feature_coverage.mjs` y `tier2_boundary_corner.mjs`, incorporar las aserciones de estructura de vistas, dataset y tarjetas 4:3.
5. Ejecutar `node tests/e2e/test_suite.mjs` para validar la no-regresión global.
