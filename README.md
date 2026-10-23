# Rankea2 · Plataforma de Torneos y Rankings 1 vs 1

Plataforma web interactiva para descubrir, rankear y compartir tus favoritos en cualquier temática mediante duelos directos cara a cara (1 vs 1) y torneos deterministas gobernados por ordenamiento por bisección.

- **Despliegue en producción:** [https://rankea2.pages.dev/](https://rankea2.pages.dev/)
- **Arena Aves del Mundo:** [https://rankea2.pages.dev/aves/](https://rankea2.pages.dev/aves/) *(Enlace alternativo clásico: [aves-ranker en GitHub Pages](https://fedep1011.github.io/aves-ranker/))*
- **Arena Pokémon:** [https://rankea2.pages.dev/pokemon/](https://rankea2.pages.dev/pokemon/)
- **Arena Mamíferos:** [https://rankea2.pages.dev/mamiferos/](https://rankea2.pages.dev/mamiferos/)
- **Arena Flores:** [https://rankea2.pages.dev/flores/](https://rankea2.pages.dev/flores/)

---

## Catálogo de Arenas Activas

Rankea2 cuenta con cuatro arenas temáticas activas conectadas al hub central (`/`), cada una con identidad visual propia y adaptación especializada de datos:

1. **Aves del Mundo (`/aves/`) · Activa**
   - Catálogo de más de 11.000 especies mundiales con fotografías en alta definición y cantos en vivo provistos por iNaturalist y xeno-canto.
   - Filtros por país, continente, bioma y color dominante.
   - Encuadre fotográfico *zero-crop* en batallas, podio y lista de candidatos, garantizando que ninguna cabeza, cuerpo o plumaje quede recortado.

2. **Pokémon (`/pokemon/`) · Activa**
   - Las 1025 criaturas oficiales desde Generación 1 (Kanto) hasta Generación 9 (Paldea).
   - Sprites animados de Pokémon Showdown en duelos y podios, con cadena de contingencia (*fallback*) resiliente hacia sprites estáticos y arte oficial en alta resolución.
   - Badge retro Pokédex `No. 025` de alto contraste (ratio de contraste superior a 15:1, cumpliendo WCAG AAA).
   - Wizard interactivo unificado en pantalla única: contador dinámico en tiempo real de criaturas restantes según región y tipo elemental, junto a barra deslizadora (*slider*) de candidatos configurable de 8 a 64 integrantes (valor predeterminado: 16).

3. **Mamíferos (`/mamiferos/`) · Activa**
   - Selección curada de 16 especies mundiales de fauna silvestre, felinos mayores y mamíferos emblemáticos (Yaguareté, Lobo Gris, Ballena Azul, Oso Polar, entre otros).
   - Encuadre fotográfico *zero-crop* con contenedor adaptativo y fondo ambiental difuminado (*ambient blurred backdrop*) para preservar proporciones nativas tanto en móvil como en escritorio.

4. **Flores (`/flores/`) · Activa**
   - Colección de 16 especies botánicas del mundo, orquídeas y flora emblemática con nomenclatura binomial científica y metadatos de hábitat.
   - Encuadre *zero-crop* con fondo ambiental difuminado y renderizado nítido en todas las resoluciones.

---

## Arquitectura Central (`src/core/`)

Rankea2 utiliza una arquitectura multi-página (MPA) optimizada mediante Vite, complementada por un núcleo de módulos profundos en `src/core/` que garantizan interfaces públicas mínimas con implementaciones robustas:

### 1. Motor de Torneos (`src/core/tournament.js`)
- **Algoritmo de Bisección Determinista (`interleavedBisectSortAsync`):** Resuelve el ordenamiento completo y exacto de $N$ candidatos en aproximadamente $0.82 \cdot N \log_2(N)$ comparaciones interactivas, reduciendo drásticamente la fatiga de decisión respecto a sistemas todos contra todos o suizos tradicionales.
- **Muestreo de Candidatos (`sampleCandidates`):** Selección ponderada o aleatoria del subconjunto de candidatos a partir de los filtros seleccionados.
- **Generador Pseudoaleatorio con Semilla (`mulberry32`):** PRNG determinista basado en una semilla entera (`seed`). Garantiza que la misma semilla con las mismas elecciones del usuario replique idéntica secuencia de duelos, posibilitando la funcionalidad **Deshacer (Undo)** y la comparación de partidas idénticas.
- **Enlaces de Desafío (Challenge URLs):** Codificación y decodificación de parámetros (`?r=id1.id2...&c=...&a=...`) para compartir el podio o reproducir el mismo torneo exacto entre diferentes usuarios.

### 2. Sincronización de Tema (`src/core/theme.js`)
- Sincronización desacoplada del modo claro y oscuro (`light` / `dark`) mediante la clase `.dark` en el elemento raíz del DOM (`document.documentElement`).
- Persistencia automática de la preferencia del usuario en `localStorage` (`rankea2-theme`).
- Enlace reactivo a botones de alternancia (`bindThemeButton`) con intercambio limpio de iconos SVG (`currentColor`) y etiquetas de accesibilidad `aria-label`.

### 3. Motor de Exportación Visual Canvas 2.0 (`src/core/canvas.js`)
- Generación de tarjetas gráficas de victoria en dos relaciones de aspecto estándar:
  - **Story 9:16 (1080 x 1920 px):** Optimizada para estados y publicaciones verticales en Instagram, TikTok y WhatsApp.
  - **Poster 4:5 (1080 x 1350 px):** Optimizada para feeds de redes sociales y visualización en tarjetas de escritorio.
- **Encuadre Zero-Crop con Fondo Ambiental:** Contención matemática completa de la fotografía o sprite del campeón sin recortes (`contain`), respaldada por un fondo ambiental desenfocado generado dinámicamente a partir de la misma imagen.
- **Renderizado de Pixel Art:** Detección de sprites retro con escalado por vecino más cercano (*nearest-neighbor* / `imageSmoothingEnabled = false`), evitando borrosidad en criaturas de Pokémon.
- **Compartir y Descargar:** Integración con la Web Share API nativa del navegador para compartir el archivo PNG directamente en dispositivos móviles, con copia al portapapeles y descarga de archivo local como respaldo automático.

---

## Directivas de Calidad y Linters

El proyecto adhiere estrictamente a las directivas de desarrollo definidas en `AGENTS.md`:

- **Política Cero Emojis:** Prohibición absoluta de emojis o dingbats en la interfaz de usuario y código fuente, sustituidos exclusivamente por iconos vectoriales SVG limpios (`currentColor`) y glifos tipográficos estándar.
- **Diseño Anti-Slop:** Tipografía display concisa, signos de puntuación estándar (`.` o `·`), sin guiones largos ni artificios estilísticos inflados.
- **Accesibilidad y Contraste WCAG 2.2:** Todos los pares de color de texto y fondo cumplen con el estándar WCAG 2.2 AA (ratio mínimo 4.5:1 en texto normal, 3.0:1 en componentes esenciales) y el badge retro de Pokémon supera el ratio 15:1 (WCAG AAA).
- **Linter de Gusto y Paleta:** Supervisión de la concentración cromática para evitar dispersión de paletas (*palette sprawl*) y prohibición de alineaciones justificadas que generen ríos tipográficos.

---

## Comandos de Desarrollo Local

### Requisitos Previos
- Node.js 18 o superior
- Python 3.10 o superior (para ejecutar los linters de diseño)

### Instalación
```bash
npm install
```

### Servidor de Desarrollo
Inicia el servidor local de Vite con recarga rápida (HMR):
```bash
npm run dev
```

### Compilación para Producción
Compila todas las 5 páginas MPA en `dist/` con chunks compartidos:
```bash
npm run build
```

### Previsualización de Compilación
Sirve localmente el directorio `dist/` resultante:
```bash
npm run preview
```

### Pruebas Automatizadas (E2E)
Ejecuta la suite completa de 126 pruebas extremo a extremo en 4 niveles (cobertura funcional, límites y bordes, combinaciones cruzadas y escenarios reales):
```bash
npm test
# o alternativamente:
npm run test:e2e
```

### Linters de Calidad y Estilo
Ejecuta la validación completa de ausencia de emojis, reglas de gusto y contrastes WCAG:
```bash
# Ejecutar todas las verificaciones
npm run lint

# O ejecutar cada linter por separado:
npm run lint:emoji     # Verifica ausencia de emojis y guiones tipográficos en UI
npm run lint:taste     # Audita paletas de color, títulos y reglas de estilo
npm run lint:contrast  # Valida ratios de contraste WCAG 2.2 en modos claro y oscuro
```

---

## Documentación y Referencias Técnicas

- [ADR 0001: Arquitectura Multi-Página en Vite con Motor Central Compartido](docs/adr/0001-multi-page-vite-core-engine.md)
- [Glosario Canónico de Dominio](GLOSSARY.md)
- [Directivas del Proyecto y Calidad](AGENTS.md)

---

Creado por [@fedep1011](https://github.com/fedep1011).
