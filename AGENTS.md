# Instrucciones para agentes

Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.

Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything.

## Toolkit de Calidad y Diseño Activo

Linters locales ejecutables en cualquier momento:
- `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py index.html aves/index.html src/` (detecta patrones de IA, guiones largos `—` y emojis en la UI).
- `python .agents/ux-ui-agent-skills/scripts/lint_taste.py index.html aves/index.html` (detecta colores estridentes, falta de tokens y desbalances de paleta).
- `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py` (valida ratios WCAG 2.2 en modo claro y oscuro).

## Recursos externos de referencia (reinstalables si hiciera falta)

- **Auditoría de seguridad**: [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) — Análisis de vulnerabilidades y sanitización de inputs.
- **Diseño de marca e isotipos**: [logo-design](https://github.com/anthropics/anthropic-quickstarts) — Generación y validación de conceptos vectoriales SVG.
- **Reglas de interacción y heurísticas**: UI/UX Pro Max — Base de patrones de usabilidad y accesibilidad.
