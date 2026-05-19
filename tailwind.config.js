/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-clinic, ui-sans-serif)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["ui-serif", "Georgia", "serif"],
      },
      colors: {
        ink: "#1a1a1a",
        paper: "#fafaf7",
        accent: "#0f6e56",
        warn: "#854f0b",
        danger: "#a32d2d",
        // Brand colors are sourced from CSS variables (set per-clinic at runtime
        // by lib/branding-server.ts). Owner edits at /owner/branding to change.
        brand: {
          DEFAULT: "var(--brand, #0d9488)",
          50: "var(--brand-50, #f0fdfa)",
          100: "var(--brand-50, #ccfbf1)",
          500: "var(--brand, #14b8a6)",
          600: "var(--brand, #0d9488)",
          700: "var(--brand-dark, #0f766e)",
          800: "var(--brand-dark, #115e59)",
          900: "var(--brand-dark, #134e4a)",
        },
      },
      borderRadius: {
        btn: "var(--button-radius, 6px)",
      },
    },
  },
  plugins: [],
};
