# Directivas del Proyecto — Rankea2

## Leyes Fundamentales de Interfaz y Desarrollo

1. **Claridad Estructural**: Cortar bajadas, textos de ayuda y etiquetas secundarias. Si una pantalla necesita texto para tener sentido, resolver el layout.
2. **Elevación Continua**: Maximizar simultáneamente la experiencia de usuario (UX), de desarrollo (DX) y de agentes (AX), sin regresiones en código existente.
3. **Calidad Visual Anti-Slop**:
   - Usar tipografía display concisa e iconos vectoriales SVG limpios (`currentColor`).
   - Usar puntuación estándar (`.` o `·`). Mantener la redacción en español neutro rioplatense conciso.
   - Preservar la identidad estética propia de cada arena (Aves editorial, Pokémon brutalista/arcade, etc.).
4. **Módulos Profundos**: Diseñar interfaces públicas mínimas con implementaciones ricas ocultas tras costuras limpias (`src/core/tournament.js`, `src/core/theme.js`).
5. **Estándar Canónico del Asistente y Duelos**: Todo ranking nuevo (Insectos, Perros, Dinosaurios, Maravillas, etc.) o actualización de existentes debe seguir estrictamente el estándar de `docs/GUIA_CLONAR_APP.md`:
   - **Wizard en 3 Pasos**: Home con los 3 botones principales ("Jugar con las 16 más famosas...", "Sorpréndeme (16 al azar)", "Armar mi búsqueda") y las **4 pastillas de partida rápida siempre visibles abajo**; Paso 1 Lugar geográfico con pastillas y autocompletado; Paso 2 Familias/Alimentación/Rasgos clave + búsqueda libre con chip activo; Paso 3 Confirmar con contador reactivo de especies con foto, modo de muestreo ("Más famosas" vs "Al azar"), selector 8/16/32/Todas y estimación de duelos/clics.
   - **Contenedor Rígido de Batalla**: Proporción rígida `aspect-[4/3]`, foto frontal completa sin recortes (`object-contain`), fondo ambiental desenfocado (`object-cover blur-xl`) y loaders `#loaderLeft` / `#loaderRight`.
   - **Protocolo de Curación y Fotos S3 200 OK**: Verificación previa obligatoria por script de HTTP 200 en cada foto (cero licencias privadas o rotas), volumen representativo (>1.000 ítems) y las 16 superestrellas mundiales en los índices `0..15` del JSON.

## Punteros de Contexto (Bajo Demanda / Progressive Disclosure)

- **Creación o modificación de arenas**: Consultar obligatoriamente `docs/GUIA_CLONAR_APP.md` antes de implementar o refactorizar cualquier categoría (Aves, Mamíferos, Flores, Insectos, Perros, Dinosaurios, Maravillas).
- **Vocabulario y dominio**: Consultar `GLOSSARY.md` únicamente ante dudas sobre nombres canónicos o entidades de torneos.
- **Herramientas y linters**: Consultar `SKILLS_DISPONIBLES.md` solo si la tarea requiere herramientas avanzadas adicionales.
- **Hoja de ruta**: Consultar `BACKLOG_ROADMAP.md` o `ROADMAP_PRIVADO.md` solo al planificar o priorizar tareas.
- **Guías visuales por arena**: En `docs/estilo/` (`guia_visual_aves.md`, etc.), a consultar únicamente al modificar la UI de la arena correspondiente.

## Verificación de Calidad y Linters Activos

- **Cambios menores / visuales**: No ejecutar suites pesadas (`npm run test`, `npm run test:dom`). Basta con verificar la compilación rápida (`npm run build`) o el linter específico si aplica.
- **Suites completas (126 tests E2E y DOM)**: Reservadas exclusivamente para hitos de lógica central, refactors profundos o cuando el usuario lo solicite expresamente.
- Linters disponibles bajo demanda:
  - `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py index.html aves/index.html pokemon/index.html mamiferos/index.html flores/index.html src/`
  - `python .agents/ux-ui-agent-skills/scripts/lint_taste.py index.html aves/index.html`
  - `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py`
