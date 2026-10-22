/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0f766e",
          700: "#115e59",
          800: "#134e4a",
          900: "#0b3b38",
          950: "#042f2e",
          DEFAULT: "#0f766e",
        },
        "primary-dark": "#115e59",
        accent: "#e11d48",
        surface: "#ffffff",
        background: "#f8fafc",
        border: "#e2e8f0",
        text: "#0f172a",
        muted: "#64748b",
        "muted-light": "#94a3b8",
        success: "#16a34a",
        danger: "#dc2626",
        warning: "#d97706",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
