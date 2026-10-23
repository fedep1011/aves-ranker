/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./aves/index.html", "./pokemon/index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        poke: ['"Space Grotesk"', "system-ui", "sans-serif"],
        flora: ['"Cormorant Garamond"', "Georgia", "serif"]
      },
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        forest: {
          DEFAULT: "var(--color-forest)",
          hover: "var(--color-forest-hover)",
          soft: "var(--color-forest-soft)"
        }
      }
    }
  },
  plugins: []
};
