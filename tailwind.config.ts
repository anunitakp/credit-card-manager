import type { Config } from "tailwindcss";

function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        bg: withOpacity("--bg"),
        surface: withOpacity("--surface"),
        "surface-elevated": withOpacity("--surface-elevated"),
        "surface-hover": withOpacity("--surface-hover"),
        border: {
          DEFAULT: withOpacity("--border"),
          strong: withOpacity("--border-strong"),
        },
        text: {
          primary: withOpacity("--text-primary"),
          secondary: withOpacity("--text-secondary"),
          tertiary: withOpacity("--text-tertiary"),
        },
        primary: {
          DEFAULT: withOpacity("--primary"),
          hover: withOpacity("--primary-hover"),
          foreground: withOpacity("--primary-foreground"),
          tint: withOpacity("--primary-tint"),
        },
        success: {
          DEFAULT: withOpacity("--success"),
          bg: withOpacity("--success-bg"),
        },
        warning: {
          DEFAULT: withOpacity("--warning"),
          bg: withOpacity("--warning-bg"),
        },
        danger: {
          DEFAULT: withOpacity("--danger"),
          bg: withOpacity("--danger-bg"),
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
        "modal-in": "modal-in 200ms ease-out",
        "sheet-in": "sheet-in 250ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
