# Guía de Estilo UI/UX: Rankea2 · Categoría [Nombre de la Categoría]

Este documento define las reglas de diseño, tipografía, paleta de colores y componentes visuales específicos para la categoría **[Nombre de la Categoría]** dentro del ecosistema Rankea2.

---

## 1. Bases de la Interfaz y Navegación Global

* **Header Logo y Breadcrumb:**
  * Estructura canónica: `Rankea2 / [Categoría]`.
  * Tipografía: [Definir fuente de display específica de la categoría].
  * Subtítulo: Breve frase contextual en escala tipográfica menor (`text-[11px] text-muted`).
* **Controles Globales (Alineados a la derecha):**
  * **Selector de Tema (Claro / Oscuro):** Persistente en `localStorage` (`rankea2_theme`) y sincronizado entre arenas con `src/core/theme.js`. [Definir estilo del toggle e íconos SVG limpios].
  * **Selector de Idioma (i18n · ES / EN):** Traducción reactiva de interfaz y nombres de candidatos (`getLocalizedName`).
  * **Indicador de Paso Activo:** Muestra la etapa actual del usuario con botón de retorno a Inicio (`btnHeaderHome`).
* **Pastilla del Hub Principal (`index.html`):**
  * [Definir colores, sombras, marco diagonal o tarjeta partida, ícono y tipografía de la categoría en la home general].

---

## 2. Desarrollo Visual Específico del Ranking

### 2.1 Pantalla de Inicio (`viewHome`) y Modos de Entrada

* **Hero CTAs (3 Disparadores Directos):**
  * **Partida Rápida (Top 16):** [Definir estilo del botón principal, arranque con los 16 más populares].
  * **Sorprendeme (Aleatorio):** [Definir estilo del botón secundario con filtros al azar].
  * **Configuración Personalizada (Wizard):** [Definir estilo del botón terciario para abrir el configurador].
* **Grilla de Presets Curados:**
  * Tarjetas temáticas de un clic (ej. por región, arquetipo, rareza o color). [Definir grid, bordes, imágenes de fondo e interacciones hover].

### 2.2 Sistema de Desafíos Compartidos (Challenge Mode)

* **Banner de Desafío Entrante:**
  * Detectado automáticamente vía query string `?r=id1.id2...&c=cat&a=autor` mediante `src/core/tournament.js`.
  * [Definir UI del banner, colores de alerta y disposición de la vista previa del Top 3 del retador].
* **Controles del Reto:**
  * Botón desplegable para ver la lista completa de contendientes.
  * Botones para "Aceptar desafío" (juega exactamente el mismo pool) y "Descartar".
* **Comparación Post-Partida (`challengeComparisonBox`):**
  * Layout lado a lado comparando tu Top 3 coronado contra el del retador. [Definir columnas y resaltado de coincidencias].

### 2.3 Configurador / Wizard de Filtros

> [!NOTE]
> **Elección de Formato según la Densidad del Catálogo:**
> - **Formato Secuencial (Multi-pantalla):** Recomendado para catálogos enciclopédicos con taxonomías densas (como Aves: Paso 1 Lugar $\to$ Paso 2 Rasgos $\to$ Paso 3 Tamaño).
> - **Formato Unificado (Mono-pantalla):** Recomendado para categorías dinámicas con filtros concisos (como Pokémon: Región/Generación + Tipo elemental + Rareza + Slider en un único panel reactivo sin saltos de vista).

* **Dimensión 1 (Origen / Región):**
  * Selección múltiple, buscador con autocompletado y botón "Todo el mundo". [Definir estilo de las píldoras o checkboxes de región].
* **Dimensión 2 (Rasgos, Arquetipos y Color):**
  * Píldoras combinables, paleta visual de colores dominantes o tipos elementales, input de búsqueda libre y botón "Al azar". [Definir diseño de las píldoras/tags].
* **Dimensión 3 (Muestreo y Tamaño del Torneo):**
  * **Modos de Muestreo:** "Populares / Más famosos" vs "Sorpresa / Aleatorio".
  * **Contador en vivo y Preview:** Total de candidatos encontrados reactivo y tira de miniaturas de previsualización. Si el pool cae a 0, deshabilitar botón de inicio y advertir en pantalla.
  * **Slider de Cantidad (`limitSlider`):**
    * Rango dinámico (8 a 64 candidatos, configurable según el tamaño filtrado).
    * Botones rápidos (`8`, `16`, `32`, `MAX`).
    * Cálculo en tiempo real de duelos estimados ($N \log_2 N$) y duración con etiquetas de intensidad (*Partida Rápida*, *Duración Ideal*, *Torneo Épico*). [Definir color del track del slider y selector].

### 2.4 Motor de Duelos 1 vs 1 (`viewBattle`)

* **Algoritmo Central:**
  * `interleavedBisectSortAsync` gobernado por semilla (`battleSeed`) determinista (`src/core/tournament.js`).
* **Encuadre Visual (Zero-Crop):**
  * Imágenes principales completas (`object-contain` + `object-center`) con fondo ambiental difuminado (`blur-xl`) derivado de la misma imagen, evitando cualquier recorte en cabezas o cuerpos.
  * Cadena de fallback finita en caso de imágenes caídas o errores 404.
* **Loaders y Transiciones:**
  * Precarga en segundo plano (`preloadPoolImagesInBackground`) con loaders independientes (`loaderLeft`, `loaderRight`) para evitar que la tarjeta previa quede congelada.
* **UI de Combate:**
  * Barra de progreso (% de avance y `Duelo X / ~Y`).
  * Botón de **Deshacer determinista (`Undo`)**: Desenrolla el historial exacto sin romper el árbol de bisección.
  * Atajos de teclado: `Flecha Izquierda` (vota izquierda), `Flecha Derecha` (vota derecha), `Z` o `Backspace` (deshacer).

### 2.5 Pantalla de Resultados y Podio (`viewResults`)

* **Podio Jerárquico (Top 3):**
  * Tarjetas destacadas para **#1 Oro (Campeón)**, **#2 Plata** y **#3 Bronce** con imagen completa sin recortes. [Definir acabados o bordes distintivos para cada puesto].
* **Dato Curioso / Lore (`resolveTop1FunFact`):**
  * [Definir caja de texto para la curiosidad o descripción biográfica/temática del Campeón].
* **Audio del Ganador (`winnerAudioPromptBanner`):**
  * Desbloqueo en el primer gesto del usuario (`unlockWinnerAudioOnGesture`).
  * Banner unificado para reproducir, repetir o detener el audio característico.
  * *Modularidad temática:* Canto ornitológico en Aves, grito (*cry*) en Pokémon, o jingle sintético con Web Audio API para categorías inanimadas (Flores, Arquitectura, Películas).
* **Lista del Resto del Ranking (#4+):**
  * Tabla compacta con miniatura, puesto, nombre principal y metadato secundario (ID, nombre binomial, región). [Definir filas y contraste de tabla].

### 2.6 Modal de Exportación y Viralidad (`exportModal` / Canvas 2.0)

* **Generador de Póster en Canvas (`src/core/canvas.js`):**
  * **Formatos Nativos:** Historia vertical (`9:16` · `1080×1920`) y Póster feed (`4:5` · `1080×1350`).
  * **Personalización en Vivo:** Inputs directos para Título del ranking, Autor y Subtítulo antes de generar el archivo. [Definir paleta temática de exportación].
* **Acciones de Compartido:**
  * Menú nativo del celular (`Web Share API`).
  * Copiar imagen directa al portapapeles (`ClipboardItem`).
  * Descargar imagen PNG en alta definición.
  * Enlace directo para desafiar amigos por WhatsApp con el mismo pool.
