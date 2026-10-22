# Rankea2 — Plataforma de Torneos y Rankings 1 vs 1

Plataforma web interactiva para descubrir, rankear y compartir tus favoritos en cualquier temática mediante duelos directos cara a cara y torneos de 16 candidatos.

- **Jugar en línea:** [https://rankea2.pages.dev/](https://rankea2.pages.dev/)
- **Arena Aves del Mundo:** [https://rankea2.pages.dev/aves/](https://rankea2.pages.dev/aves/) *(Enlace alternativo clásico: [aves-ranker en GitHub Pages](https://fedep1011.github.io/aves-ranker/))*

---

## Arenas y Categorías

- **Aves del Mundo (Activa):** Más de 11.000 especies con fotografías en tiempo real, cantos en vivo de iNaturalist y filtros por país/color/bioma.
- **Pokémon (En desarrollo):** Duelos de criaturas, generaciones y tipos elementales mediante PokeAPI.
- **Botánica & Fauna (Próximamente):** Flores, orquídeas y mamíferos del planeta.

## Características Técnicas

- **Ordenamiento Inteligente:** Torneos rápidos optimizados con `Merge Sort` asíncrono e historial de deshacer (*undo*).
- **Semillas Determinísticas:** Desafíos reproducibles mediante links de invitación (`?r=...`) que permiten jugar exactamente con los mismos contrincantes y comparar resultados.
- **Exportación en Alta Resolución:** Láminas para compartir en historias (9:16) y pósters (4:5) con podio Oro, Plata y Bronce.
- **Arquitectura:**
  - Frontend moderno: **Vite + Tailwind CSS** (compilado).
  - Alojamiento y CDN: **Cloudflare Pages**.
  - Escalabilidad de datos: Preparado para persistencia y desafíos diarios con **Supabase**.

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor local
npm run dev

# Compilar para producción
npm run build
```

---

Creado por [@fedep1011](https://github.com/fedep1011).
