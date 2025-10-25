/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // As defined in your plan and App.jsx,
      // we map CSS variables to Tailwind color names.
      colors: {
        primary: "var(--color-primary)",
        background: "var(--color-background)",
        text: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        glass: "var(--color-glass)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        "primary-text": "var(--color-primary-text)",
        "primary-hover": "var(--color-primary-hover)",
        icon: "var(--color-icon)",
      },
    },
  },
  plugins: [],
}