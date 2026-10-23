import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page: "/" is the hub, each versus lives in its own folder ("/aves/", ...).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        hub: resolve(__dirname, "index.html"),
        aves: resolve(__dirname, "aves/index.html"),
        pokemon: resolve(__dirname, "pokemon/index.html"),
        mamiferos: resolve(__dirname, "mamiferos/index.html"),
        flores: resolve(__dirname, "flores/index.html")
      }
    }
  }
});
