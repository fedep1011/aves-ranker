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
URL compartible que contiene en sus parámetros (`?r=id1.id2.id3&c=...&a=...`) el orden exacto del podio o del ranking de un jugador, permitiendo a otro usuario jugar con el mismo pool y comparar resultados.

### Adaptador de Datos (Data Adapter)
Módulo específico de una arena (`src/<arena>/adapter.js`) encargado de consultar la API externa (iNaturalist, PokéAPI) o catálogo local curado, normalizando la respuesta al contrato canónico del Candidato.
