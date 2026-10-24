# Guía de Estilo UI/UX: Rankea2 · Pokémon / Pokes (`/pokemon/`)

Este documento define las reglas de diseño, tipografía, paleta de colores y componentes visuales específicos para la categoría **Pokémon** (Pokes) dentro del ecosistema Rankea2.

---

## 1. Bases de la Interfaz y Navegación Global

* **Identidad Visual General:** Estilo arcade retro y brutalismo pixel-art (inspirado en Game Boy Advance y estéticas de batalla de los juegos clásicos de Pokémon). Bloques angulares de alto contraste, bordes gruesos de $2\text{px}$ a $3\text{px}$, sombras proyectadas duras (*hard drop shadows*) sin desenfoque gaussiano, y tipografías monoespaciadas y de display de consola retro.
* **Header Logo y Breadcrumb:**
  * Estructura canónica: `Rankea2 / Pokémon`.
  * Tipografía: `Rankea2` en `Space Grotesk` (extrabold, tracking-tight), separador `/` en `text-muted/50`, y `Pokémon` en `Space Grotesk` mayúsculas o `Press Start 2P` en acentos display.
  * Subtítulo: `Duelos 1v1 y Podio de Entrenador` (`text-[11px] text-muted tracking-wider uppercase font-mono`).
* **Controles Globales (Alineados a la derecha):**
  * **Selector de Tema (Claro / Oscuro):** Botón retro rectangular o píldora con borde sólido (`retro-btn`), ícono de luna y sol vectoriales en trazo limpio de $2\text{px}$.
  * **Selector de Modo Gráfico (Pixel UI / Moderno):** Toggle específico para alternar entre acabado visual pixel-art 8-bit / 16-bit (`body.pixel-ui`) y modo vectorial contemporáneo.
  * **Botón de Retorno:** Pastilla con sombra dura: `box-shadow: 3px 3px 0px 0px rgba(0,0,0,0.9)`.
* **Tokens de Color y Tema:**
  * Paleta Principal de Marca:
    * Amarillo Eléctrico Pikachu: `#FFDE59`.
    * Rojo Pokéball / Acento: `#E11D48` / `#EF4444`.
    * Azul Agua / Secundario: `#3B82F6`.
    * Carbón / Tinta Primaria: `#111111` / `#0F172A`.
  * Modo Claro:
    * Fondo general (`--color-canvas`): `#FFFDF0` / fondo cuadriculado cuadricula retro 8px.
    * Superficie (`--color-surface`): `#FFFFFF`.
    * Texto principal (`--color-ink`): `#111111`.
    * Texto secundario (`--color-muted`): `#64748B`.
    * Borde retro: `3px solid #111111`.
    * Sombra dura: `4px 4px 0px 0px #111111`.
  * Modo Oscuro:
    * Fondo general (`--color-canvas`): `#0F1117` / `#18181B`.
    * Superficie (`--color-surface`): `#181B23` / `#1F1D16`.
    * Texto principal (`--color-ink`): `#F8FAFC`.
    * Texto secundario (`--color-muted`): `#94A3B8`.
    * Borde retro: `3px solid #FFDE59` o `3px solid #F8FAFC`.
    * Sombra dura dorada: `4px 4px 0px 0px rgba(255, 222, 89, 0.35)`.
* **Pastilla del Hub Principal (`index.html`):**
  * Clase base: `.arena-poke`.
  * Fondo amarillo `#FFDE59`, borde de `3px solid #111111` y sombra dura de `5px 5px 0px #111111` (en modo oscuro: borde y sombra en amarillo `#FFDE59`).
  * Tarjeta partida diagonal de combate: Charizard en lado rojo (`#EF4444`) vs Blastoise en lado azul (`#3B82F6`), divididos por una línea diagonal negra de $2.5\text{px}$.
  * Botón indicador `→` cuadrado con fondo negro y flecha amarilla.

---

## 2. Desarrollo Visual Específico del Ranking

### 2.1 Pantalla de Inicio (`viewHome`) y Modos de Entrada

* **Hero y Copete:**
  * Título en `font-poke` (`Space Grotesk` uppercase 40px) o `Press Start 2P`: "Elige a tu Pokémon Supremo.".
  * Subtítulo: "Duelos directos sin empates. Enfrentá criaturas de todas las generaciones hasta coronar a tu campeón."
* **Hero CTAs (3 Disparadores Rápidos):**
  * **Partida Rápida (Kanto 16 Clásicos):** Botón retro en amarillo chillón `#FFDE59` con texto `#111111` y sombra dura de $3\text{px}$. Inicia con los 16 favoritos de la primera generación.
  * **Pila de Iniciales (Starters):** Botón retro en rojo Pokéball con los 16 Pokémon iniciales más icónicos de todas las regiones.
  * **Torneo de Legendarios:** Botón retro con borde violeta dragón/psíquico para batallas de alta escala.
* **Grilla de Presets Curados:**
  * Tarjetas cuadradas con sprites animados (`showdown` animated GIF o artwork oficial).
  * Presets canónicos: Kanto Gen 1, Starters de Todas las Eras, Legendarios y Singulares, Eeveeluciones, Dragones y Fantasmas.

### 2.2 Sistema de Desafíos Compartidos (Challenge Mode)

* **Banner de Desafío Entrante:**
  * Tarjeta estilo cuadro de diálogo de batalla RPG: `border: 3px solid currentColor`, caja de texto estilo Game Boy con fondo de superficie y sombra dura.
  * Encabezado: "¡Un entrenador te desafió! ¿Podés defender tu podio con los mismos Pokémon?".
  * Vista previa de los 3 Pokémon del retador montados sobre pequeñas plataformas elípticas de combate (`battle-platform`).
* **Controles del Reto:**
  * Botón "Aceptar desafío Pokémon →" (`retro-btn bg-[#FFDE59] text-black font-bold`).
  * Botón "Ver equipo rival completo".
* **Comparación Post-Partida (`challengeComparisonBox`):**
  * Layout de estadio de combate: Comparación cara a cara con sprites animados enfrentados y badges de tipos elementales.

### 2.3 Configurador / Wizard de Filtros

* **Formato Seleccionado:** Unificado Mono-pantalla (todo el configurador se controla de forma reactiva en un único panel dinámico sin transiciones de paso).
* **Dimensión 1 (Generación / Región):**
  * Tira de botones de generaciones (Gen I a Gen IX + "Todas las generaciones") con conteo vivo de criaturas.
* **Dimensión 2 (Tipos Elementales y Rareza):**
  * 18 pastillas con los colores oficiales de cada tipo elemental (`POKEMON_TYPES`):
    * Fuego (`#EE8130`), Agua (`#6390F0`), Planta (`#7AC74C`), Eléctrico (`#F7D02C`), Psíquico (`#F95587`), Fantasma (`#735797`), Dragón (`#6F35FC`), Siniestro (`#705746`), Hada (`#D685AD`), Acero (`#B7B7CE`), etc.
  * Selector de rareza: "Todos los Pokémon", "Solo Iniciales", "Solo Legendarios y Míticos", "Formas Base".
* **Dimensión 3 (Muestreo y Slider de Cantidad):**
  * Switch: "Más populares (por orden y uso)" vs "Equipo sorpresa (azar)".
  * **Slider de Cantidad (`limitSlider`):**
    * Rango dinámico: 8, 16, 32, 64 Pokémon.
    * Estilo de barra pixel: `input[type="range"]` con carril sólido y thumb cuadrado estilo botón de consola.
    * Conteo estimado de duelos y tiempo de partida (ej. *Duelo rápido de gimnasio ~18 turnos* vs *Torneo Liga Pokémon ~85 duelos*).

### 2.4 Motor de Duelos 1 vs 1 (`viewBattle`)

* **Encuadre Visual y Plataforma de Combate:**
  * Las criaturas se presentan sobre una elipse radial de combate (`battle-platform`) simulando un estadio de arena o hierba.
  * Renderizado dual: Sprite oficial de alta resolución (`official-artwork`) o sprite pixelado animado (`showdown` GIF con propiedad CSS `image-rendering: pixelated`).
  * Cero recorte en cuernos, alas o colas (`object-contain object-center`).
* **Ficha de Contendiente:**
  * Número de Pokédex (`#006`, `#025`), nombre en mayúsculas estilo arcade y badges con su combinación elemental dual (ej. `Fuego / Volador`).
* **UI de Combate:**
  * Barra de progreso de combate segmentada tipo barra de PS / vida.
  * Botón **Deshacer (`Undo`)** con estilo `retro-btn` y atajo de teclado `Z / Backspace`.
  * Atajos de teclado: `Flecha Izquierda` (elegir izquierda), `Flecha Derecha` (elegir derecha).

### 2.5 Pantalla de Resultados y Podio (`viewResults`)

* **Podio Jerárquico (Top 3 Entrenador):**
  * **#1 Oro (Campeón del Hall de la Fama):** Tarjeta con marco retro dorado, sprite animado en escala mayor, trofeo vectorial y rótulo "CAMPEÓN SUPREMO".
  * **#2 Plata y #3 Bronce:** Puestos de escolta en recuadros retro con medallas pulidas.
* **Grito del Ganador / Audio (`winnerCryAudio`):**
  * Reproducción del grito oficial (*cry*) del Pokémon ganador en alta fidelidad extraído de los archivos originales del juego.
  * Botón interactivo con ícono de altavoz arcade para repetir el grito.
* **Dato de la Pokédex (`resolveTop1FunFact`):**
  * Caja de texto estilo Pokédex clásica con la descripción de la especie, altura, peso y categoría taxonómica.
* **Lista del Resto del Equipo (#4+):**
  * Grilla de tarjetas compactas numeradas con mini sprites, nombres y badges de tipo.

### 2.6 Modal de Exportación y Viralidad (`exportModal` / Canvas 2.0)

* **Generador de Póster en Canvas (`src/core/canvas.js`):**
  * **Formatos Nativos:**
    * Historia Vertical (`9:16` · `1080×1920 px`).
    * Póster de Feed (`4:5` · `1080×1350 px`).
  * **Paleta Gráfica del Canvas:**
    * Modo Claro: Fondo blanco hueso `#FFF8F8`, tarjeta `#FFFFFF`, bordes `#E2E8F0`, texto `#0F172A`, acento `#E11D48`.
    * Modo Oscuro: Fondo espacial `#0F1117`, tarjeta `#181B23`, bordes `#2D3342`, texto `#F8FAFC`, acento `#E11D48`.
  * **Diseño del Póster:**
    * Cabecera retro: `POKÉMON · TORNEO 1V1`.
    * Arte del Campeón sin recortes sobre plataforma circular con su ID de Pokédex.
    * Tipografía en `Space Grotesk` y trazado de píxeles nítido (`imageSmoothingEnabled = false`).
* **Acciones de Compartido:**
  * Compartir en Instagram / TikTok / WhatsApp vía `Web Share API`.
  * Copia directa al portapapeles y descarga de PNG en alta densidad.
  * Enlace directo para retar amigos con el mismo equipo Pokémon (`?r=id1.id2...&c=pokemon`).
