# Guía de Estilo UI/UX: Rankea2 · Aves del Mundo (`/aves/`)

Este documento define las reglas de diseño, tipografía, paleta de colores y componentes visuales específicos para la categoría **Aves del Mundo** dentro del ecosistema Rankea2.

---

## 1. Bases de la Interfaz y Navegación Global

* **Identidad Visual General:** Estilo editorial ornitológico contemporáneo, inspirado en publicaciones de campo ilustradas (estilo Audubon y National Geographic), con fondos orgánicos cálidos, tipografía con serif estilizada y acentos verde bosque profundo.
* **Header Logo y Breadcrumb:**
  * Estructura canónica: `Rankea2 / Aves`.
  * Tipografía: `Rankea2` en `Space Grotesk` (bold tracking-tight), separador `/` en `text-muted/50`, y `Aves` en `Instrument Serif` (28px a 32px, tracking-tight).
  * Subtítulo: `El ranking ornitológico` en escala tipográfica menor (`text-[11px] text-muted tracking-wide`).
* **Controles Globales (Alineados a la derecha):**
  * **Selector de Tema (Claro / Oscuro):** Botón redondeado (`rounded-full`) con borde sutil (`border-line`), fondo `bg-surface`. Alterna ícono SVG limpio de luna (`path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z"`) y sol.
  * **Selector de Idioma (i18n · ES / EN):** Pastilla encapsulada (`p-0.5 rounded-full border border-line bg-surface`). El botón activo lleva fondo `bg-forest text-white`, mientras el inactivo permanece en `text-muted hover:text-ink`.
  * **Indicador de Paso Activo:** Texto truncado con la etapa actual (`headerStepLabel`) y botón de retorno al inicio (`btnHeaderHome`) estilizado como pastilla `border border-line bg-surface/80 hover:text-forest`.
* **Tokens de Color y Tema (Identidad Celeste Aero / Cielo Ornitológico):**
  * Modo Claro:
    * Fondo general (`--color-canvas`): `#F0F6FA` (cielo marfil suave).
    * Superficie (`--color-surface`): `#FAFDFE` (blanco pluma).
    * Texto principal (`--color-ink`): `#0F1E29` (azul petróleo muy oscuro, legible y sobrio).
    * Texto secundario (`--color-muted`): `#5C7280` (niebla celeste).
    * Borde / División (`--color-line`): `#D4E2EB` (hielo suave).
    * Acento primario (`--color-forest` / `--color-primary`): `#0284C7` (celeste ornitológico / sky 600).
    * Hover acento (`--color-forest-hover`): `#0369A1` (sky 700).
    * Acento suave (`--color-forest-soft`): `#E0F2FE` (sky 100).
  * Modo Oscuro:
    * Fondo general (`--color-canvas`): `#0A1118` (cielo nocturno profundo).
    * Superficie (`--color-surface`): `#101C26` (nube nocturna).
    * Texto principal (`--color-ink`): `#F0F8FF` (marfil cielo).
    * Texto secundario (`--color-muted`): `#829AA8` (bruma alpina).
    * Borde / División (`--color-line`): `#1F3140`.
    * Acento primario (`--color-forest` / `--color-primary`): `#38BDF8` (celeste cielo vivo / sky 400).
    * Hover acento (`--color-forest-hover`): `#0EA5E9` (sky 500).
    * Acento suave (`--color-forest-soft`): `#142938`.
* **Atmósfera y Spot Art:**
  * Cero wallpapers o patrones SVG repetitivos de azulejos (manteniendo máxima elegancia y legibilidad editorial).
  * Spot Art focal: Silueta sutil de ave en vuelo como marca de agua única en el Hero de la portada.
* **Pastilla del Hub Principal (`index.html`):**
  * Clase base: `.arena-aves`.
  * Borde orgánico doble: Borde exterior celeste sólido de 2px + línea interna punteada (`dashed`) sutil.
  * Micro-decoración: Pluma vectorial oficial de Lucide (`lucide-feather`) en la esquina superior derecha con micro-interacción de rotación/escala en hover.
  * Pastilla de categoría `Ornitología` en `bg-sky-700/90 dark:bg-sky-500/90 text-white` y botón circular `→` en celeste.

---

## 2. Desarrollo Visual Específico del Ranking

### 2.1 Pantalla de Inicio (`viewHome`) y Modos de Entrada

* **Hero y Copete:**
  * Título en `font-serif` (`Instrument Serif` 48px): "Tus Aves Favoritas del Planeta.".
  * Subtítulo conciso en `text-muted`: "De los colibríes del bosque a las grandes rapaces del mundo. Enfrentalas 1 vs 1 hasta armar tu podio definitivo."
* **Hero CTAs (3 Disparadores Directos):**
  * **Partida Rápida (Top 16):** Botón de alto impacto con `bg-forest hover:bg-forest-hover text-white rounded-full py-4 px-8 text-base shadow-sm font-medium`. Arranca de inmediato con las 16 aves más observadas en iNaturalist.
  * **Sorprendeme (Aleatorio):** Botón secundario en `bg-surface border border-line text-ink hover:border-forest rounded-full py-3.5 px-6 text-sm font-medium`. Selecciona filtros y especies al azar de todo el planeta.
  * **Configuración Personalizada (Wizard):** Botón de acceso terciario para usuarios ornitólogos que desean filtrar por continente, familia o tamaño.
* **Grilla de Presets Curados:**
  * Cuadrícula de 2 a 4 tarjetas temáticas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`).
  * Presets: "Aves de la Selva", "Aves Rapaces y Nocturnas", "Aves Acuáticas y Costeras", "Aves del Jardín y Patio".
  * Cada tarjeta presenta imagen en miniatura con bordes sutiles, título en tipografía serif, contador de especies y botón de arranque directo.

### 2.2 Sistema de Desafíos Compartidos (Challenge Mode)

* **Banner de Desafío Entrante:**
  * Contenedor destacado `bg-surface border-2 border-forest rounded-2xl p-4 sm:p-6 shadow-md space-y-4`.
  * Encabezado: "Mirá el ranking que armaron. ¿Hacés el tuyo con las mismas aves?".
  * Previsualización visual del Top 3 del retador: 3 tarjetas compactas en miniatura con medallas dorada, plateada y de bronce.
* **Controles del Reto:**
  * Botón principal: "Jugar con estas mismas aves y comparar →" (`bg-forest text-white rounded-full py-3 px-5`).
  * Botón secundario: "Ver su lista completa" (`bg-canvas border border-line text-ink rounded-full py-2.5 px-4`).
  * Cierre accesible con botón circular discreto `×`.
* **Comparación Post-Partida (`challengeComparisonBox`):**
  * Disposición lado a lado con dos columnas: "Tu Podio" vs "Podio del Retador".
  * Resaltado de coincidencias en verde bosque suave (`bg-forest-soft border border-forest/30`).

### 2.3 Configurador / Wizard de Filtros

* **Formato Seleccionado:** Secuencial en 3 pasos (Multi-pantalla), óptimo para la densidad taxonómica y geográfica del catálogo ornitológico.
  * `viewStepPlace`: Región geográfica (Continente / País / Todo el mundo).
  * `viewStepTraits`: Arquetipo o familia ornitológica (Colibríes, Rapaces, Pájaros cantores, Loros, Aves marinas).
  * `viewStepSize`: Tamaño del torneo y modo de muestreo.
* **Dimensión 1 (Origen / Región):**
  * Píldoras geográficas con selección múltiple activa (`bg-forest text-white` vs `bg-surface text-ink border border-line`).
  * Buscador predictivo integrado con debounce para localizar países específicos.
* **Dimensión 2 (Rasgos y Arquetipos):**
  * Tags temáticos con contadores de especies disponibles.
  * Selector de color predominante del plumaje (rojo, azul, amarillo, verde, blanco y negro).
* **Dimensión 3 (Muestreo y Tamaño del Torneo):**
  * **Modos de Muestreo:** Switch de dos opciones: "Más conocidas" (ponderado por observaciones iNaturalist) y "Sorpresa" (sorteo balanceado).
  * **Slider de Cantidad (`limitSlider`):**
    * Rango canónico de 8 a 64 aves. Botones rápidos: `8`, `16`, `32`, `64`.
    * Track estilizado con altura de 4px y thumb circular en color bosque (`var(--color-forest)`).
    * Estimador interactivo de duelos en vivo: $N \log_2 N$ duelos con etiquetas de intensidad (*Partida Flash ~18 duelos*, *Torneo Estándar ~42 duelos*, *Maratón Ornitológico ~85 duelos*).

### 2.4 Motor de Duelos 1 vs 1 (`viewBattle`)

* **Encuadre Visual (Zero-Crop):**
  * Disposición de tarjetas cara a cara en dos columnas responsivas (`grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6`).
  * Contenedor fotográfico con fondo de halo difuminado ambiental (`blur-xl opacity-35`) alimentado por la misma fotografía.
  * Imagen central renderizada con `object-contain object-center` para preservar en su totalidad picos, colas largas y siluetas alares sin ningún recorte.
* **Loaders y Transiciones:**
  * Indicadores de carga independientes (`loaderLeft`, `loaderRight`) con pulsación de fondo suave en `bg-muted/15`.
  * Transición de entrada con `animation: fadeStep 0.22s cubic-bezier(0.16, 1, 0.3, 1)`.
* **UI de Combate:**
  * Encabezado de duelo con barra de progreso estilizada en verde bosque.
  * Contador numérico exacto: `Duelo X / ~Y`.
  * Ficha inferior con nombre común en `font-serif text-2xl` y nombre binomial científico en `text-xs text-muted italic`.
  * Botón de **Deshacer determinista (`Undo`)**: Pastilla flotante con atajo `Z / Backspace` para corregir la última decisión sin reiniciar el torneo.
  * Atajos de teclado: `Flecha Izquierda` (vota izquierda), `Flecha Derecha` (vota derecha).

### 2.5 Pantalla de Resultados y Podio (`viewResults`)

* **Podio Jerárquico (Top 3):**
  * **#1 Oro (Campeona):** Tarjeta destacada a ancho completo con borde orlado en oro cálido (`border-[#E5C170] shadow-lg`), corona y tipografía `font-serif text-3xl sm:text-4xl`.
  * **#2 Plata y #3 Bronce:** Tarjetas gemelas en segunda fila con ribetes metálicos pulidos y escala balanceada.
* **Dato Curioso / Biología (`resolveTop1FunFact`):**
  * Bloque de lectura curado que extrae la ficha etológica del ave campeona (habilidades de vuelo, alimentación o danza nupcial).
  * Fondo en `bg-surface border border-line rounded-2xl p-4 text-sm leading-relaxed`.
* **Audio del Ganador (`winnerAudioPromptBanner`):**
  * Integración con audios ornitológicos (cantos reales vía Xeno-Canto o iNaturalist Sound Archive).
  * Banner con botón de reproducción táctil: "Escuchar el canto del ave campeona".
  * Espectrograma vectorial sutil o indicador de onda sonora animada mientras suena el canto.
* **Lista del Resto del Ranking (#4+):**
  * Tabla compacta con columnas: Puesto (`#4`, `#5`...), miniatura circular con `object-cover`, nombre vulgar principal y nombre científico en cursiva.

### 2.6 Modal de Exportación y Viralidad (`exportModal` / Canvas 2.0)

* **Generador de Póster en Canvas (`src/core/canvas.js`):**
  * **Formatos Nativos:**
    * Historia Vertical (`9:16` · `1080×1920 px`).
    * Póster de Feed (`4:5` · `1080×1350 px`).
  * **Paleta Gráfica del Canvas:**
    * Modo Claro: Fondo pergamino `#F6F4EF`, tarjeta `#FFFFFF`, borde `#DEDAD0`, texto `#161816`, acento `#1D3B2A`.
    * Modo Oscuro: Fondo `#111613`, tarjeta `#1A211D`, borde `#2B352F`, texto `#F5F5F0`, acento `#E5C170`.
  * **Composición Gráfica:**
    * Cabecera con marca `RANKING DE AVES · RANKEA2`.
    * Fotografía del Campeón en modo contain sobre halo suave sin recortes.
    * Podio completo ilustrado con medallas vectoriales limpias.
* **Acciones de Compartido:**
  * Botón nativo para historias (`Web Share API`).
  * Botón "Copiar imagen" directa al portapapeles.
  * Botón "Descargar PNG" en alta resolución.
  * Botón "Desafiar por WhatsApp" con enlace de reto parametrizado (`?r=id1.id2...&c=aves`).
