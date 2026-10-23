# Directivas del Proyecto — Rankea2

## Leyes Fundamentales de Interfaz y Desarrollo

1. **Claridad Estructural**: Cortar bajadas, textos de ayuda y etiquetas secundarias. Si una pantalla necesita texto para tener sentido, resolver el layout.
2. **Elevación Continua**: Maximizar simultáneamente la experiencia de usuario (UX), de desarrollo (DX) y de agentes (AX), sin regresiones en código existente.
3. **Calidad Visual Anti-Slop**:
   - Usar tipografía display concisa e iconos vectoriales SVG limpios (`currentColor`).
   - Usar puntuación estándar (`.` o `·`). Mantener la redacción en español neutro rioplatense conciso.
   - Preservar la identidad estética propia de cada arena (Aves editorial, Pokémon brutalista/arcade, etc.).
4. **Módulos Profundos**: Diseñar interfaces públicas mínimas con implementaciones ricas ocultas tras costuras limpias (`src/core/tournament.js`, `src/core/theme.js`).

## Punteros de Contexto (Progressive Disclosure)

- **Vocabulario canónico y dominio**: Consultar `GLOSSARY.md` antes de nombrar entidades, rutas o parámetros.
- **Catálogo de herramientas y skills**: Consultar `SKILLS_DISPONIBLES.md`.
- **Hoja de ruta general**: Consultar `BACKLOG_ROADMAP.md` y `ROADMAP_PRIVADO.md`.

## Verificación de Calidad y Linters Activos

Ejecutar tras cada cambio relevante en UI o marcado:
- `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py index.html aves/index.html src/`
- `python .agents/ux-ui-agent-skills/scripts/lint_taste.py index.html aves/index.html`
- `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py`
