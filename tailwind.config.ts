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
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        bg: withOpacity("--bg"),
        "bg-deep": withOpacity("--bg-deep"),
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
      borderColor: {
        glass: "var(--glass-border-soft)",
        "glass-lit": "var(--glass-border)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "22px",
        "3xl": "28px",
      },
      backdropBlur: {
        glass: "22px",
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
        "modal-in": "modal-in 200ms ease-out",
        "sheet-in": "sheet-in 250ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
        "rise-in": "rise-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
