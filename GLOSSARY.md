# Glosario Canónico de Dominio — Rankea2

Este glosario define el vocabulario oficial de la plataforma. Todo agente, módulo de código y documentación debe usar estos términos de forma consistente.

---

## Términos de Dominio

### Arena
Espacio o juego temático independiente dentro de la plataforma (ej. `/aves/`, `/pokemon/`, `/mamiferos/`). Cada arena tiene su propia identidad visual y catálogo, pero comparte el mismo motor central.

### Candidato (Item)
Entidad individual que participa en los torneos.
Objeto normalizado con la siguiente firma mínima:
```js
{
  id: string | number,       // Identificador estable para compartir por URL
  nombre: string,            // Nombre común en el idioma activo
  nombreSecundario: string,  // Nombre científico o alternativo
  imagen: string,            // URL de fotografía o sprite
  popularidad: number,       // Ponderador para ordenar las más famosas
  audioUrl?: string,         // Canto o sonido característico opcional
  datoCurioso?: string       // Texto breve opcional para el podio
}
```

### Pool de Candidatos (Pool)
Colección de $N$ candidatos ($N \in \{8, 16, 32, 64\}$) seleccionados para una partida mediante filtros o sorteo.

### Duelo (Matchup / Battle)
Comparación cara a cara (1 vs 1) entre exactamente dos candidatos en pantalla, donde el usuario elige a uno de los dos.

### Torneo (Tournament / Bracket)
Secuencia estructurada de duelos interactivos gobernada por el algoritmo determinístico de bisección intercalada (`interleavedBisectSortAsync`), que produce un ranking completo y exacto de los $N$ elementos en $\approx 0.82 \cdot N \log_2(N)$ duelos.

### Semilla (Seed)
Número entero generado al inicio de cada torneo que alimenta el PRNG (`mulberry32`). Garantiza que la misma semilla con las mismas elecciones del usuario produzca la secuencia idéntica de duelos, haciendo posible la función **Deshacer (Undo)** y la comparación de partidas compartidas.

### Enlace de Desafío (Challenge URL)
URL corta y limpia de ~42 caracteres (`https://rankea2.pages.dev/<arena>/?s=<short_code>`), donde `short_code` es una clave alfanumérica de 8 caracteres que referencia la partida guardada en Supabase (`public.rankings`). Al ser abierta por otro usuario, recupera en destino en <100ms el podio idéntico (#1 ORO, #2 PLATA, #3 BRONCE) y la selección de 16 candidatos para disputar el torneo con las mismas opciones. Dispone de degradación transparente offline a listas directas de IDs (`?r=id1.id2...`).

### Código Corto (Short Code)
Cadena alfanumérica de exactamente 8 caracteres generada de forma determinista que actúa como clave única (`short_code`) en la tabla `public.rankings` de Supabase, resolviendo la imposibilidad física de almacenar 16 candidatos y sus permutaciones dentro de los 41 bits de entropía que proveen 8 caracteres en cliente puro.

### Adaptador de Datos (Data Adapter)
Módulo específico de una arena (`src/<arena>/adapter.js`) encargado de consultar la API externa (iNaturalist, PokéAPI) o catálogo local curado, normalizando la respuesta al contrato canónico del Candidato.
