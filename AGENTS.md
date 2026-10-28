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
   - **Desafíos Compartidos de 8 Caracteres Cloud-First**: Persistencia en Supabase (`src/core/supabase.js`) con enlace ultra-corto estricto `${origin}/<arena>/?s=${short_code}` (~42 caracteres), recuperación del podio exacto (#1 ORO, #2 PLATA, #3 BRONCE) en <100ms y fallback transparente offline a `?r=id1.id2...`. Prohibido generar URLs largas con query params innecesarios (`&c=`, `&a=`).
6. **Sincronización Rigurosa de Documentación**: Al finalizar cualquier funcionalidad, corrección o hito, actualizar inmediatamente la documentación afectada (`BACKLOG_ROADMAP.md` para marcar ítems resueltos con `[x]`, `docs/GUIA_CLONAR_APP.md` si cambian estándares visuales, componentes o modelos de datos, etc.). Si se modifica código que altera o expande lo documentado, la documentación debe actualizarse en el mismo paso sin esperar una petición explícita.

## Punteros de Contexto (Bajo Demanda / Progressive Disclosure)

- **Creación o modificación de arenas**: Consultar obligatoriamente `docs/GUIA_CLONAR_APP.md` antes de implementar o refactorizar cualquier categoría (Aves, Mamíferos, Flores, Insectos, Perros, Dinosaurios, Maravillas).
- **Vocabulario y dominio**: Consultar `GLOSSARY.md` únicamente ante dudas sobre nombres canónicos o entidades de torneos.
- **Herramientas y linters**: Consultar `SKILLS_DISPONIBLES.md` solo si la tarea requiere herramientas avanzadas adicionales.
- **Hoja de ruta**: Consultar `BACKLOG_ROADMAP.md` solo al planificar o priorizar tareas.
- **Guías visuales por arena**: En `docs/estilo/` (`guia_visual_aves.md`, etc.), a consultar únicamente al modificar la UI de la arena correspondiente.

## Verificación de Calidad y Economía de Comandos

- **Economía de Ejecución**: NO ejecutar comandos automáticos (`git status`, `npm run build`, linters) por reflejo en cada prompt. Si el cambio es de documentación, texto simple o consultas, responder directamente sin ejecutar herramientas redundantes.
- **`git status`**: Usar únicamente cuando sea indispensable conocer el estado de archivos antes de una operación de git o si el usuario lo pide; nunca como paso rutinario a cada respuesta.
- **`npm run build`**: Reservar exclusivamente para cuando se cree o modifique una nueva página/arena completa, se alteren bundles (`vite.config.js`, `tailwind.config.js`) o al cerrar un hito importante de código frontend. NUNCA ejecutarlo tras editar archivos markdown (`.md`) o cambios triviales de copy.
- **Linters de Calidad (Emoji, Taste, Contraste)**: Disponibles bajo demanda. Ejecutar únicamente a pedido expreso del usuario o al diseñar desde cero nuevos componentes visuales de UI complejos. No ejecutarlos en cascada en cada turno.
  - `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py ...`
  - `python .agents/ux-ui-agent-skills/scripts/lint_taste.py ...`
  - `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py`
- **Suites completas (126 tests E2E y DOM)**: Reservadas exclusivamente para hitos de lógica central de torneos (`src/core/`), refactors profundos o cuando el usuario lo solicite expresamente.
