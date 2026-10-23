# Catálogo de Skills Disponibles — Rankea2

Este documento cataloga todas las habilidades (*agent skills*), linters y herramientas disponibles en el entorno y en los repositorios de referencia (**Matt Pocock** y **Anthropic**), organizadas por área de utilidad para el proyecto.

---

## 1. Habilidades Activas en el Proyecto

Estas herramientas están instaladas localmente y se ejecutan directamente en la terminal:

| Herramienta / Linter | Comando de Ejecución | Utilidad en Rankea2 |
|---|---|---|
| **Anti-Slop Linter** | `python .agents/ux-ui-agent-skills/scripts/check_no_emoji.py index.html aves/index.html src/` | Caza guiones largos `—` de IA y emojis usados como iconos en la UI. |
| **Taste & Sprawl Linter** | `python .agents/ux-ui-agent-skills/scripts/lint_taste.py index.html aves/index.html` | Detecta blanco/negro puro (`#000`, `#FFF`), saturación excesiva y falta de tokens. |
| **Contraste Accesible** | `python .agents/ux-ui-agent-skills/scripts/validate_contrast.py` | Valida ratios WCAG 2.2 AA y AAA en modo claro y oscuro. |
| **Biblioteca de Design Systems** | `python .agents/ux-ui-agent-skills/scripts/design_systems.py list` | 138 sistemas de diseño curados con tokens DTCG (usados para el estilo arcade de Pokémon y natural de Aves). |

---

## 2. Habilidades de Matt Pocock (`mattpocock/skills`)

Repositorio: [github.com/mattpocock/skills](https://github.com/mattpocock/skills)

### Redacción y Documentación
* **`writing-for-agents`**:
  * **Qué hace**: Doctrina avanzada para escribir `AGENTS.md`, `CLAUDE.md` y documentos para agentes.
  * **Reglas clave**: Enunciar en positivo (*Prompt the positive*), usar punteros progresivos (*Context Pointers*), usar términos con alta carga conceptual (*Leading words*) y eliminar instrucciones obvias (*Hunt no-ops*).
* **`to-spec`**:
  * **Qué hace**: Convierte una conversación o discusión informal en una especificación técnica ejecutable: historias de usuario, decisiones de arquitectura, fronteras de prueba y exclusiones (*out of scope*).
* **`grill-me` / `grilling`**:
  * **Qué hace**: Interroga al usuario de manera incisiva para resolver cada rama de decisión de un diseño antes de tocar código.

### Datos y Arquitectura
* **`domain-modeling`**:
  * **Qué hace**: Construye y mantiene un `GLOSSARY.md` canónico del proyecto para evitar confusión de términos (ej. *Arena*, *Bracket*, *Duelo*, *Matchup*, *Seed*). Registra decisiones arquitectónicas complejas mediante ADRs (`docs/adr/`).
* **`codebase-design`**:
  * **Qué hace**: Filosofía de **Módulos Profundos** (*Deep Modules*): interfaces diminutas con gran poder de cómputo oculto detrás de la costura (*seam*).
  * **Aplicación**: [`src/core/tournament.js`](file:///c:/Users/fedep/Documents/antigravity/lucid-curie/src/core/tournament.js).

### Interfaz y Experiencia
* **`prototype`**:
  * **Qué hace**: Construye código descartable para responder preguntas de diseño antes de casarse con una solución.
  * **Técnica UI**: Permite desplegar 2 o 3 variantes estéticas radicales en una misma ruta (ej. `?variant=arcade` vs `?variant=retro`), evaluarlas en vivo con el usuario y seleccionar la mejor.
* **`diagnosing-bugs`**:
  * **Qué hace**: Protocolo disciplinado para cazar bugs difíciles: crear bucle en rojo → aislar hipótesis → reparar → verificar en verde.

---

## 3. Habilidades y Recursos de Anthropic

### De `anthropics/skills` ([github.com/anthropics/skills](https://github.com/anthropics/skills))
* **`canvas-design`**:
  * **Utilidad**: Generación de posters, infografías y tarjetas de podio exportables en HTML5 Canvas con proporciones 9:16 y 1:1, tipografía ajustada y control de CORS.
* **`theme-factory`**:
  * **Utilidad**: Generador de temas con balances armónicos de color para light/dark mode.
* **`webapp-testing`**:
  * **Utilidad**: Automatización de pruebas end-to-end con Playwright para verificar que los duelos 1v1 y los flujos de torneo no se rompan.

### De `anthropics/claude-plugins-official` ([github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official))
* **`claude-md-management`**:
  * **Utilidad**: Mantiene los archivos de directivas (`AGENTS.md`) limpios, podados y sin reglas contradictorias.

---

## 4. Evaluación de los Otros Repositorios de Anthropic

| Repositorio | ¿Es útil para Rankea2? | Motivo |
|---|---|---|
| `claude-code` | **Herramienta base** | Es el motor de terminal que ejecuta las instrucciones. |
| `claude-cookbooks` | **No prioritario** | Cuadernos Jupyter sobre cómo usar la API de Anthropic (embeddings, RAG). Nosotros operamos en frontend estático sin backend. |
| `financial-services` | **No** | Plugins específicos para finanzas y banca corporativa. |
| `claude-for-legal` | **No** | Análisis de contratos legales y regulatorios. |
| `knowledge-work-plugins` | **No** | Conectores para Google Drive, Slack, Jira y suites de oficina. |
| `prompt-eng-interactive-tutorial` / `courses` | **De consulta teórica** | Tutoriales pedagógicos de prompt engineering para humanos. |
| `claude-quickstarts` | **De referencia técnica** | Código de inicio para agentes autónomos y computer-use. |

---

## 5. Áreas Críticas y Faltantes: ¿Cómo las Cubrimos?

1. **Curaduría y enriquecimiento de datos de videojuegos (Pokémon, etc.)**:
   - *Falta*: Ni Anthropic ni Matt Pocock tienen una skill nativa para extraer sprites y datos de PokeAPI.
   - *Solución*: La resolvemos nosotros con un **adaptador de datos modular** (`src/pokemon/adapter.js`) que pre-descarga un catálogo curado de 151 criaturas para que el juego vuele a 60 fps en localhost sin depender de la red.
2. **Audio y Efectos Sonoros (SFX)**:
   - *Falta*: Skills de audio para juegos web.
   - *Solución*: Usaremos Web Audio API nativo o reproducción de *cries* oficiales de Pokémon (`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/`), activados en los duelos.
