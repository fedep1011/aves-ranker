/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./aves/index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"]
      },
      colors: {
        canvas: "#F6F4EF",
        surface: "#FFFFFF",
        ink: "#161816",
        muted: "#696B65",
        line: "#E4E0D6",
        forest: { DEFAULT: "#1D3B2A", hover: "#14291D", soft: "#EBF1EC" }
      }
    }
  },
  plugins: []
};
