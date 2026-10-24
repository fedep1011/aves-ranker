# Guía de Estilo UI/UX: Rankea2 · Animales / Mamíferos (`/mamiferos/`)

Este documento define las reglas de diseño, tipografía, paleta de colores y componentes visuales específicos para la categoría **Animales y Mamíferos** (Fauna Salvaje y Grandes Depredadores) dentro del ecosistema Rankea2.

---

## 1. Bases de la Interfaz y Navegación Global

* **Identidad Visual General:** Estilo documental cinematográfico de vida salvaje y expedición naturalista (inspirado en la fotografía de National Geographic y documentales de la sabana y el océano). Transmite poder, majestuosidad animal y arraigo terroso, empleando tonalidades ámbar, cuero salvaje, terracota y carbón de sabana, combinados con tipografía con serif imponente.
* **Header Logo y Breadcrumb:**
  * Estructura canónica: `Rankea2 / Mamíferos`.
  * Tipografía: `Rankea2` en `Space Grotesk` (bold tracking-tight), separador `/` en `text-muted/50`, y `Mamíferos` en `Instrument Serif` (28px a 32px, tracking-tight).
  * Subtítulo: `Fauna y depredadores del mundo` (`text-[11px] text-muted tracking-wide`).
* **Controles Globales (Alineados a la derecha):**
  * **Selector de Tema (Claro / Oscuro):** Píldora redondeada con borde ámbar suave (`border-[#E5DED5]` en claro y `border-[#3B352E]` en oscuro), ícono de sol y luna con trazo limpio de $2\text{px}$.
  * **Selector de Idioma (i18n · ES / EN):** Pastilla con acento en ámbar terracota (`bg-amber-800 text-white`).
  * **Botón de Retorno a Inicio:** Píldora estilizada en `border border-line bg-surface/80 hover:text-amber-800`.
* **Tokens de Color y Tema:**
  * Paleta Principal de Marca:
    * Terracota Salvaje / Ámbar Profundo: `#92400E` / `#8C6239`.
    * Ámbar Fuego / Acento Oscuro: `#B45309` / `#D97706`.
    * Marfil y Arena Claro: `#F5EFE6` / `#FAF7F2`.
    * Carbón Sabana / Tierra Quemada: `#1E1B18` / `#141210`.
  * Modo Claro:
    * Fondo general (`--color-canvas`): `#FAF7F2` (arena de sabana suave).
    * Superficie (`--color-surface`): `#FFFFFF` (lienzo limpio).
    * Texto principal (`--color-ink`): `#1F1D1A` (cuero negro).
    * Texto secundario (`--color-muted`): `#736B63` (ceniza volcánica).
    * Borde / División (`--color-line`): `#E5DED5`.
    * Acento primario: `#92400E` (ámbar terroso).
    * Plataforma / Fondo pedestal: `#F3EFEA`.
  * Modo Oscuro:
    * Fondo general (`--color-canvas`): `#141210` (noche de sabana).
    * Superficie (`--color-surface`): `#1F1C18` (terracota noche).
    * Texto principal (`--color-ink`): `#F7F5F0` (hueso marfil).
    * Texto secundario (`--color-muted`): `#A39B91`.
    * Borde / División (`--color-line`): `#3B352E`.
    * Acento primario: `#D97706` (ámbar dorado luminoso).
    * Plataforma / Fondo pedestal: `#181512`.
* **Pastilla del Hub Principal (`index.html`):**
  * Clase base: `.arena-fauna`.
  * Fondo carbón `#1E1B18`, texto marfil `#F5EFE6`, borde de $2\text{px}$ en `#8C6239` (modo oscuro: fondo `#1A1714` y borde `#A67848`).
  * Tarjeta partida diagonal de depredadores: Yaguareté (*Panthera onca*) en lado izquierdo y Tigre de Bengala en lado derecho, divididos por una línea diagonal de $1.8\text{px}$ en tono ámbar `#8C6239`.
  * Título en `font-aves` (`Instrument Serif` 36px) con botón circular terracota `#8C6239` y flecha marfil `#F5EFE6`.

---

## 2. Desarrollo Visual Específico del Ranking

### 2.1 Pantalla de Inicio (`viewHome`) y Modos de Entrada

* **Hero y Copete:**
  * Distintivo superior: Píldora monospaciada `Fauna salvaje y terrestre · Biodiversidad global`.
  * Título en `font-serif` (`Instrument Serif` 44px a 52px): "Grandes Depredadores y Fauna del Mundo.".
  * Subtítulo: "Desde los felinos de la sabana hasta los cetáceos del océano. Tu criterio define la cumbre del reino animal."
* **Hero CTAs (3 Disparadores Directos):**
  * **Partida Rápida (16 Clásicos Salvajes):** Botón principal en `bg-amber-800 hover:bg-amber-900 text-white rounded-full py-3.5 px-8 text-base shadow-sm font-medium`. Arranca de inmediato con leones, tigres, lobos, elefantes y osos.
  * **Expedición Salvaje (Aleatorio):** Botón secundario en `bg-surface border border-line text-ink hover:border-amber-800 rounded-full py-3 px-6 text-sm font-medium`. Selecciona mamíferos de todos los continentes al azar.
  * **Personalizar Expedición:** Entrada para filtrar por orden taxonómico, bioma o peso corporal.
* **Grilla de Presets Curados:**
  * Tarjetas de estilo documental: "Grandes Felinos del Mundo", "Megafauna y Gigantes Terrestres", "Depredadores del Océano (Cetáceos)", "Cánidos y Cazadores de Manada".

### 2.2 Sistema de Desafíos Compartidos (Challenge Mode)

* **Banner de Desafío Entrante:**
  * Contenedor en `bg-surface border-2 border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`.
  * Etiqueta: `DESAFÍO RECIBIDO` en microtipografía monoespaciada terracota.
  * Título en `font-serif`: "¿Hacés tu ranking con los mismos animales?".
  * Vista previa del Top 3 animal del rival con miniaturas de fotografía salvaje.
* **Controles del Reto:**
  * Botón: "Aceptar desafío salvaje →" (`bg-amber-800 hover:bg-amber-900 text-white rounded-xl py-2.5 px-5`).
  * Botón para ver la manada completa del retador.
* **Comparación Post-Partida (`challengeComparisonBox`):**
  * Layout cinematográfico lado a lado con resaltado de coincidencias en tonos terracota suave.

### 2.3 Configurador / Wizard de Filtros

* **Formato Seleccionado:** Secuencial / Unificado Híbrido, organizado por ecosistemas y gremios ecológicos.
* **Dimensión 1 (Bioma y Continente):**
  * Sabana africana, Selva tropical amazónica, Taiga y tundra ártica, Bosque templado, Océanos y costas.
* **Dimensión 2 (Gremios y Familias):**
  * Grandes felinos (*Felidae*), Cánidos salvajes (*Canidae*), Úrsidos (*Ursidae*), Cetáceos y mamíferos marinos, Primates, Ungulados y herbívoros.
  * Filtro de tamaño y peso: Megafauna (>500 kg), Depredadores medianos, Mamíferos ágiles.
* **Dimensión 3 (Muestreo y Tamaño del Torneo):**
  * Switch: "Más emblemáticos y conocidos" vs "Especies salvajes poco comunes".
  * **Slider de Cantidad (`limitSlider`):**
    * Rango: 8, 16, 32 animales.
    * Carril en tono arena oscura y selector circular ámbar terracota.
    * Etiquetas de duración: *Duelo de sabana (~18 duelos)* vs *Cumbre animal completa (~42 duelos)*.

### 2.4 Motor de Duelos 1 vs 1 (`viewBattle`)

* **Encuadre Visual (Zero-Crop):**
  * Encuadre panorámico y vertical con fondo desenfocado ambiental cálido derivado del pelaje o entorno del animal.
  * Visualización completa `object-contain object-center` asegurando que garras, astas, colmillos y siluetas corporales no sufran recortes.
* **Ficha Animal:**
  * Nombre vulgar en `font-serif text-2xl sm:text-3xl font-semibold`.
  * Nombre científico en latín con cursiva sobria (ej. *Panthera onca*, *Acinonyx jubatus*).
  * Distintivo de hábitat o estado de conservación (ej. *Vulnerable*, *En Peligro*, *Preocupación Menor*).
* **UI de Combate:**
  * Barra de avance en terracota ámbar con indicador `Duelo X / ~Y`.
  * Botón **Deshacer (`Undo`)** determinista con atajo `Z / Backspace`.
  * Atajos de teclado: `Flecha Izquierda` (vota izquierda) y `Flecha Derecha` (vota derecha).

### 2.5 Pantalla de Resultados y Podio (`viewResults`)

* **Podio Jerárquico (Top 3 Alfa):**
  * **#1 Oro (Rey / Depredador Supremo):** Tarjeta destacada a ancho completo con marco orlado en ámbar dorado `#D97706`, fotografía en gran formato y título en `font-serif text-3xl sm:text-4xl`.
  * **#2 Plata y #3 Bronce:** Tarjetas escolta con acabados pulidos en plata ártica y bronce salvaje.
* **Dato Curioso / Lore Etológico (`resolveTop1FunFact`):**
  * Ficha biográfica sobre la fuerza de mordida, velocidad punta, técnicas de caza o estructura social del animal campeón.
* **Audio del Ganador (`winnerAudioPromptBanner`):**
  * Rugido, aullido o llamada salvaje real del animal coronado.
  * Botón interactivo táctil: "Escuchar el rugido del campeón salvaje".
* **Tabla de Posiciones (#4+):**
  * Grilla compacta con miniatura circular, posición numérica, nombre común y hábitat característico.

### 2.6 Modal de Exportación y Viralidad (`exportModal` / Canvas 2.0)

* **Generador de Póster en Canvas (`src/core/canvas.js`):**
  * **Formatos Nativos:**
    * Historia Vertical (`9:16` · `1080×1920 px`).
    * Póster de Feed (`4:5` · `1080×1350 px`).
  * **Paleta Gráfica del Canvas:**
    * Modo Claro: Fondo arena `#FAF7F2`, tarjeta `#FFFFFF`, borde `#E5DED5`, texto `#1F1D1A`, acento `#92400E`.
    * Modo Oscuro: Fondo sabana `#141210`, tarjeta `#1F1C18`, borde `#3B352E`, texto `#F7F5F0`, acento `#D97706`.
  * **Diseño del Póster:**
    * Cabecera con tipografía display: `MAMÍFEROS · FAUNA SALVAJE`.
    * Imagen sin recortes del Animal Campeón sobre pedestal circular terroso `#F3EFEA`.
    * Tipografía en `Instrument Serif` para nombres y `Inter` para datos taxonómicos.
* **Acciones de Compartido:**
  * Menú de compartir nativo (`Web Share API`).
  * Copia directa al portapapeles y descarga de imagen PNG en alta definición.
  * Enlace directo para retar a amigos con el mismo grupo de animales (`?r=id1.id2...&c=mamiferos`).
