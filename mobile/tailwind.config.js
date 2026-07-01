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
        primary: "#1a56db",
        "primary-dark": "#1444b8",
        surface: "#ffffff",
        background: "#f3f4f6",
        border: "#e5e7eb",
        text: "#111827",
        muted: "#6b7280",
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
