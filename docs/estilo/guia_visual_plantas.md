# Guía de Estilo UI/UX: Rankea2 · Flores y Plantas (`/flores/`)

Este documento define las reglas de diseño, tipografía, paleta de colores y componentes visuales específicos para la categoría **Flores y Plantas** dentro del ecosistema Rankea2.

---

## 1. Bases de la Interfaz y Navegación Global

* **Identidad Visual General:** Estilo herbario botánico ilustrado y catálogo de expedición naturalista (inspirado en las láminas botánicas clásicas de Linneo y los jardines botánicos reales). Transmite serenidad, elegancia orgánica y rigor taxonómico, con fondos en tonalidades salvia y lino, líneas finas y tipografía serif itálica renacentista.
* **Header Logo y Breadcrumb:**
  * Estructura canónica: `Rankea2 / Flores`.
  * Tipografía: `Rankea2` en `Space Grotesk` (bold tracking-tight), separador `/` en `text-muted/50`, y `Flores` en `Cormorant Garamond` itálica (`font-flora italic font-semibold` 28px a 32px).
  * Subtítulo: `Botánica y flora del mundo` (`text-[11px] text-muted tracking-wide`).
* **Controles Globales (Alineados a la derecha):**
  * **Selector de Tema (Claro / Oscuro):** Píldora suave con bordes sutiles en tono salvia (`border-[#D1E0D7]`), ícono de luna y sol vectoriales en trazo limpio.
  * **Selector de Idioma (i18n · ES / EN):** Pastilla con acento en verde esmeralda botánico (`bg-emerald-700 text-white`).
  * **Botón de Inicio:** Píldora redondeada `border border-line bg-surface/80 hover:text-emerald-800`.
* **Tokens de Color y Tema:**
  * Paleta Principal de Marca:
    * Verde Esmeralda Botánico: `#047857` / `#065F46`.
    * Verde Salvia / Follaje Pálido: `#B7C4B8` / `#DDE5DD`.
    * Carbón Clorofila: `#132219` / `#2B332C`.
  * Modo Claro:
    * Fondo general (`--color-canvas`): `#F4F8F5` (lino vegetal pálido).
    * Superficie (`--color-surface`): `#FFFFFF` (papel de prensado botánico).
    * Texto principal (`--color-ink`): `#132219`.
    * Texto secundario (`--color-muted`): `#5C7365`.
    * Borde / División (`--color-line`): `#D1E0D7`.
    * Acento primario: `#047857` (esmeralda vivo).
    * Plataforma / Base fotográfica: `#EAF2EC`.
  * Modo Oscuro:
    * Fondo general (`--color-canvas`): `#0E1712` (invernadero nocturno).
    * Superficie (`--color-surface`): `#16241D` (tierra fértil oscura).
    * Texto principal (`--color-ink`): `#F0FDF4`.
    * Texto secundario (`--color-muted`): `#86A393`.
    * Borde / División (`--color-line`): `#273D32`.
    * Acento primario: `#10B981` (menta botánico luminoso).
    * Plataforma / Base fotográfica: `#121D17`.
* **Pastilla del Hub Principal (`index.html`):**
  * Clase base: `.arena-flora`.
  * Fondo salvia claro `#EFECE6`, borde estilizado de $1.5\text{px}$ en `#B7C4B8` (modo oscuro: fondo `#151A16` y borde `#38473A`).
  * Tarjeta partida diagonal de exhibición botánica: Flor de Mburucuyá (*Passiflora caerulea*) en lado izquierdo y Orquídea en lado derecho, separadas por una línea diagonal de $1.8\text{px}$ en tono pergamino.
  * Título en `font-flora` (`Cormorant Garamond` itálica 36px) con botón circular verde oscuro `#2B332C` y flecha marfil.

---

## 2. Desarrollo Visual Específico del Ranking

### 2.1 Pantalla de Inicio (`viewHome`) y Modos de Entrada

* **Hero y Copete:**
  * Distintivo superior: Píldora monospaciada `Herbario ilustrado · Colección botánica`.
  * Título en `font-flora` itálica (`Cormorant Garamond` 44px a 52px): "El Jardín Botánico de Favoritos.".
  * Subtítulo: "De las orquídeas más exóticas a las flores silvestres de campo. Armá tu podio botánico en duelos 1 vs 1."
* **Hero CTAs (3 Disparadores Directos):**
  * **Partida Rápida (16 Flores Icónicas):** Botón principal en `bg-emerald-700 hover:bg-emerald-800 text-white rounded-full py-3.5 px-8 text-base shadow-sm font-medium`. Arranca con las 16 flores y plantas más reconocidas del mundo.
  * **Jardín Silvestre (Aleatorio):** Botón secundario en `bg-surface border border-line text-ink hover:border-emerald-700 rounded-full py-3 px-6 text-sm font-medium`. Selecciona especies botánicas al azar de diferentes biomas.
  * **Personalizar Colección:** Acceso a filtrado botánico por familia (orquídeas, rosas, liliáceas, cactáceas).
* **Grilla de Presets Curados:**
  * Tarjetas de estilo lámina herbolaria: "Orquídeas del Trópico", "Flores Silvestres y de Campo", "Flores Acuáticas (Nenúfares y Lotos)", "Árboles en Flor (Jacarandás y Cerezos)".

### 2.2 Sistema de Desafíos Compartidos (Challenge Mode)

* **Banner de Desafío Entrante:**
  * Contenedor en `bg-surface border-2 border-emerald-700 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`.
  * Etiqueta: `DESAFÍO RECIBIDO` en microtipografía monoespaciada verde esmeralda.
  * Título en `font-flora` itálica: "¿Hacés tu ranking con las mismas flores?".
  * Vista previa del Top 3 botánico del retador con miniatura de flor y nombre común.
* **Controles del Reto:**
  * Botón: "Aceptar desafío botánico →" (`bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2.5 px-5`).
  * Botón para ver el herbario completo del retador.
* **Comparación Post-Partida (`challengeComparisonBox`):**
  * Comparador visual simétrico con tarjetas de marco botánico y resaltado de flores compartidas en el podio.

### 2.3 Configurador / Wizard de Filtros

* **Formato Seleccionado:** Secuencial / Unificado Híbrido, organizado por dimensiones botánicas claras.
* **Dimensión 1 (Bioma y Hábitat):**
  * Opciones: Trópico húmedo, Clima templado y pradera, Desierto y zonas áridas, Acuático y ribera, Alta montaña.
* **Dimensión 2 (Tipo de Floración y Morfología):**
  * Píldoras de morfología: Flores solitarias, Inflorescencias, Orquídeas y epífitas, Plantas suculentas, Flores aromáticas.
  * Filtro por color floral: Blanco, Rojo y carmesí, Amarillo y naranja, Azul y violeta, Rosa pastel.
* **Dimensión 3 (Muestreo y Tamaño del Torneo):**
  * Switch: "Más cultivadas y populares" vs "Variedades exóticas y raras".
  * **Slider de Cantidad (`limitSlider`):**
    * Rango: 8, 16, 32 flores.
    * Barra esbelta con carril salvia y selector redondeado esmeralda.
    * Indicadores de ritmo: *Paseo botánico corto (~18 duelos)* vs *Colección completa de jardín (~42 duelos)*.

### 2.4 Motor de Duelos 1 vs 1 (`viewBattle`)

* **Encuadre Visual (Zero-Crop):**
  * Presentación fotográfica sin recortes con halo ambiental desenfocado derivado del tono de los pétalos.
  * Encuadre central `object-contain object-center` para que pétalos, estambres y corolas se aprecien en su totalidad.
* **Ficha Botánica:**
  * Nombre popular en `font-flora italic text-2xl sm:text-3xl font-semibold`.
  * Nombre binomial en latín científico en `font-sans text-xs text-muted tracking-wider` (ej. *Passiflora caerulea*, *Nelumbo nucifera*).
  * Tag de familia botánica en pastilla discreta (ej. *Passifloraceae*, *Orchidaceae*).
* **UI de Combate:**
  * Barra de progreso en verde esmeralda botánico con contador `Duelo X / ~Y`.
  * Botón **Deshacer (`Undo`)** con retroceso determinista sin alterar el árbol de bisección.
  * Atajos de teclado: `Flecha Izquierda` / `Flecha Derecha` y `Z` para deshacer.

### 2.5 Pantalla de Resultados y Podio (`viewResults`)

* **Podio Jerárquico (Top 3 de la Colección):**
  * **#1 Oro (Flor Suprema):** Tarjeta destacada orlada con ribete esmeralda y laurel dorado, imagen botánica en gran formato y título en `font-flora italic text-3xl sm:text-4xl`.
  * **#2 Plata y #3 Bronce:** Tarjetas de escolta con marcos finos en plata y bronce natural.
* **Curiosidad Botánica (`resolveTop1FunFact`):**
  * Ficha sobre mecanismos de polinización, origen botánico, simbolismo o propiedades medicinales de la flor campeona.
* **Sonido Ambiental / Jingle Botánico (`winnerAudioPromptBanner`):**
  * Campana o jingle acústico orgánico sintetizado (sonido de brisa y agua o notas de marimba vegetal) activado con el podio.
* **Catálogo del Resto (#4+):**
  * Tabla limpia de herbario con miniatura circular, posición, nombre vernáculo y nombre en latín.

### 2.6 Modal de Exportación y Viralidad (`exportModal` / Canvas 2.0)

* **Generador de Lámina Botánica en Canvas (`src/core/canvas.js`):**
  * **Formatos Nativos:**
    * Historia Vertical (`9:16` · `1080×1920 px`).
    * Póster de Feed (`4:5` · `1080×1350 px`).
  * **Paleta Gráfica del Canvas:**
    * Modo Claro: Fondo lino `#F4F8F5`, tarjeta `#FFFFFF`, borde `#D1E0D7`, texto `#132219`, acento `#047857`.
    * Modo Oscuro: Fondo `#0E1712`, tarjeta `#16241D`, borde `#273D32`, texto `#F0FDF4`, acento `#10B981`.
  * **Estética del Póster:**
    * Título de lámina: `COLECCIÓN BOTÁNICA · RANKEA2`.
    * Fotografía central de la Flor Campeona sobre pedestal circular salvia `#EAF2EC`.
    * Tipografía en `Cormorant Garamond` itálica para los nombres y `Inter` para los subtítulos.
* **Acciones de Compartido:**
  * Menú de compartir nativo (`Web Share API`).
  * Copiar lámina al portapapeles y descarga de archivo PNG.
  * Enlace para retar amigos por redes sociales (`?r=id1.id2...&c=flores`).
