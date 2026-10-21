# AVES — El Ranking Ornitológico Interactivo

Aplicación web interactiva de torneos 1 vs 1 para descubrir, rankear y comparar aves de todo el mundo en tiempo real.

- **Demo en vivo (v1):** [https://fedep1011.github.io/aves-ranker/](https://fedep1011.github.io/aves-ranker/)
- **Creado por:** [@fedep1011](https://github.com/fedep1011)

---

## 1. Estado Actual (v1 — Serverless Single-File)

- **Catálogo global en vivo (+11.000 especies):** Conectado en tiempo real a la API de iNaturalist (`v1`) y Wikipedia REST API sin necesidad de backend propio en esta primera etapa.
- **Nombres regionales rioplatenses y latinoamericanos (`ES`) + soporte multi-idioma (`ES` / `EN`):** Priorización de nombres vernáculos locales (*Tero, Hornero, Benteveo, Lechucita de Campo, Carancho, Chimango, Cardenal Copete Rojo, Churrinche*) y arquitectura `I18N` preparada para sumar más idiomas en el futuro.
- **Filtros combinables libres:** Selección combinada de múltiples países/regiones, gremios alimenticios/familias (carroñeras, herbívoras, rapaces, nocturnas, marinas, etc.) y colores de plumaje.
- **Muestreo inteligente (16 aves por defecto):** Modo *"Las más famosas"*, modo *"Sorpréndeme (16 al azar)"* y colección curada de *"Las 16 más icónicas del planeta"*.
- **Motor algorítmico `Merge Sort` asíncrono:** Ordenamiento por transitividad para resolver un ranking completo de 16 aves en ~45 duelos rápidos.
- **Encuadre fotográfico completo:** Visualización de aves sin recortes de cabezas ni extremidades (`object-contain` + fondo ambiental difuminado) tanto en duelos como en el podio y en las láminas exportadas.
- **Dato curioso (*Fun Fact*) del Top #1:** Ficha informativa del ave ganadora combinando datos curados y extractos en vivo de Wikipedia.
- **Desafíos compartidos por URL (`?r=id1.id2...`):** Codificación en el propio link de las mismas aves (incluso si fueron al azar) y del orden elegido para que otra persona juegue exactamente la misma partida y compare su porcentaje de coincidencia.

---

## 2. Prioridad UX / UI a revisar mañana (Pendiente inmediato)

- **Rediseñar la experiencia de "Compartir desafío / Exportar" en celular y escritorio:**
  - Actualmente el panel/modal de exportación ocupa demasiada pantalla en el celular y tapa el ranking recién terminado.
  - **Objetivo para mañana:** Hacer que la acción de compartir el desafío o exportar sea mucho más limpia, compacta y no invasiva en móvil (ej. barra mínima o acción directa sin tapar toda la pantalla) y probar/pulir la disposición en escritorio (PC).

---

## 3. Hoja de Ruta y Escalabilidad (v2 — Backend, Comunidad y Gamificación)

Para la siguiente etapa del proyecto, el objetivo es escalar **AVES** incorporando una base de datos en la nube (ej. **Supabase / PostgreSQL** o **Cloudflare D1 / Firebase**) para habilitar funciones comunitarias, perfiles persistentes y coleccionismo.

### 3.1. El Top / Duelo del Día (*Daily Bird Challenge*)
- **Partida diaria global:** Todos los días a las 00:00 se genera una selección única de 16 aves (con una temática diaria sorpresa o mundial) igual para todos los jugadores del mundo.
- **Consenso y ranking del día en vivo:**
  - Al terminar el Top del Día, el usuario ve qué puesto ocupó su ave #1 en el ranking general del día y cuál viene siendo **el ave más elegida del día** por toda la comunidad.
  - Estadísticas en vivo del día: *"% de personas que eligieron al Quetzal como #1 hoy"*, *"El duelo más parejo del día (51% vs 49%)"*.

### 3.2. Tracking y Métricas Globales en Tiempo Real
- **Contadores globales de actividad:**
  - Total histórico de rankings armados y duelos 1 vs 1 decididos.
  - Cantidad de rankings jugados hoy y cantidad de combinaciones únicas de filtros exploradas.
  - Contador de jugadores únicos que participaron.
- **Estadísticas sociales por ave (Rareza y Popularidad):**
  - Mostrar al finalizar tu partida datos cruzados con la base de datos global:
    - *"El Hornero es el ave favorita (#1) de 340 personas"*.
    - *"Hallazgo único: Esta ave es solo tu favorita (nadie más la había coronado #1 hasta hoy)"*.
    - *"Solo vos y otras 3 personas pusieron a esta especie en su Top 3"*.

### 3.3. Sistema de Login, Perfil Ornitológico e Histórico Personal
- **Inicio de sesión simple (Google / Apple / Link mágico):**
  - Sincronización de todas las partidas jugadas desde el celular o la computadora.
- **Tu Ave Insignia (Favorita Histórica Real):**
  - El sistema calcula cuál es tu verdadera ave favorita #1 cruzando todas las veces que la votaste a favor en distintos torneos y categorías a lo largo del tiempo (tasa de victoria personal o *Personal Win-Rate*).
- **Comparación entre Cuentas y Amigos:**
  - Poder comparar tu perfil histórico con el de cualquier otro usuario registrado:
    - **Índice de afinidad (% de coincidencia general)**.
    - **Aves en común en el Olimpo:** Especies que ambos tienen en su Top 10 histórico.
    - **La grieta ornitológica:** El ave que uno ama (#1-#3) y el otro siempre descarta.

### 3.4. "Avidex" (Modo Pokédex de Aves)
- **Álbum coleccionable global y por región:**
  - Registro permanente de todas las especies de aves que fuiste viendo y votando en tus distintos tops.
  - **Estados de desbloqueo en la Avidex:**
    1. *Sin avistar* (silueta bloqueada).
    2. *Avistada* (participó en al menos un torneo tuyo).
    3. *Medallista* (llegó a tu Top 3 en alguna partida).
    4. *Campeona* (salió #1 en un torneo).
- **Ficha individual de cada ave en tu Avidex:**
  - En qué puesto general la tenés posicionada dentro de tu ranking personal global.
  - Su historial con vos: *"Vista en 6 torneos · Récord de duelos: 24 victorias / 3 derrotas"*.
  - Datos curiosos desbloqueables y distribución geográfica.

---

## 4. Nuevas Features Propuestas (Alineadas con la Visión v2)

Ideas adicionales diseñadas para potenciar la retención, la viralidad y el coleccionismo:

1. **Ranking Elo Mundial en Vivo (Leaderboard Global de las 11.000 especies)**
   - Cada vez que cualquier usuario del mundo elige al Ave A sobre el Ave B en un duelo, se actualiza el puntaje **Elo** global de ambas especies (igual que en el ajedrez).
   - Esto crea una pestaña pública de **"El Top 100 Mundial en Vivo"**, con subidas y bajadas semanales (*"El Tero subió 14 puestos esta semana"*).

2. **Duelos a Ciegas por Canto Real (*Audio Bird Battles*)**
   - Integrar audios reales de cantos (vía API de *Xeno-canto* o *iNaturalist Sounds*).
   - Botón en cada tarjeta para escuchar el canto del ave durante el duelo, más un modo especial *"¿Cuál tiene el canto más lindo?"* (ideal para comparar calandrias, zorzales, teros, benteveos y cucaburras).

3. **Medallas de Explorador y Colecciones Regionales (Completismo en la Avidex)**
   - Progreso por país o bioma en el perfil del usuario:
     - *Aves de Uruguay: 42 / 150 avistadas en torneos*.
     - *Rapaces del Mundo: 18 / 60 avistadas*.
   - Al completar hitos se desbloquean insignias para mostrar junto a tu nombre al compartir un desafío.

4. **Modo "Sala en Vivo / Fiesta" para Grupos de Amigos**
   - Un usuario crea una partida de 16 aves y comparte un link de sala.
   - Varios amigos votan desde sus celulares al mismo tiempo.
   - Al terminar todos, la pantalla muestra el **Podio Promedio del Grupo**, quién fue *"El más mainstream"* (el que más coincidió con el grupo) y quién fue *"El incomprendido"* (el que votó más distinto a todos).

5. **Racha Diaria (*Streak*) y Mapa Mundi Personal**
   - Contador de días seguidos jugando el **Top del Día**.
   - Un mapa interactivo en tu perfil que va coloreando los países del mundo según la cantidad de especies nativas de ese lugar que ya desbloqueaste en tu Avidex.

---

## 5. Arquitectura Sugerida para el Paso a Base de Datos (Mañana / Fase 2)

Para mantener la velocidad actual y costos $0 en el arranque, se recomienda **Supabase (PostgreSQL + Auth + Realtime)**:

- `users`: `id`, `username`, `avatar_url`, `created_at`, `streak_days`.
- `species_stats`: `taxon_id`, `scientific_name`, `elo_score`, `total_duels`, `total_wins`, `times_ranked_first`, `times_in_top3`.
- `rankings`: `id`, `user_id` (nullable para anónimos), `category_label`, `bird_ids_ordered` (`int[]`), `is_daily_challenge`, `created_at`.
- `user_avidex`: `user_id`, `taxon_id`, `duels_seen`, `duels_won`, `times_first`, `times_top3`, `personal_elo`, `first_seen_at`.
- `daily_challenges`: `date_key` (`YYYY-MM-DD`), `title`, `taxon_ids` (`int[]`), `total_plays`.
