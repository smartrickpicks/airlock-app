import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface palette (OLED dark)
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          sunken: "var(--surface-sunken)",
          border: "var(--surface-border)",
          // Glassmorphic variants (rgba, for backdrop-blur layers)
          glass: "var(--surface-glass)",
          "glass-toolbar": "var(--surface-glass-toolbar)",
          "glass-border": "var(--surface-glass-border)",
          "glass-highlight": "var(--surface-glass-highlight)",
        },
        // Chamber colors
        chamber: {
          discover: "var(--chamber-discover)",
          "discover-muted": "var(--chamber-discover-muted)",
          build: "var(--chamber-build)",
          "build-muted": "var(--chamber-build-muted)",
          review: "var(--chamber-review)",
          "review-muted": "var(--chamber-review-muted)",
          ship: "var(--chamber-ship)",
          "ship-muted": "var(--chamber-ship-muted)",
        },
        // Gate colors (semantic aliases)
        gate: {
          red: "var(--gate-red)",
          yellow: "var(--gate-yellow)",
          purple: "var(--gate-purple)",
          green: "var(--gate-green)",
          amber: "var(--gate-amber)",
        },
        // Accent colors
        accent: {
          primary: "var(--accent-primary)",
          "primary-hover": "var(--accent-primary-hover)",
          secondary: "var(--accent-secondary)",
          danger: "var(--accent-danger)",
          warning: "var(--accent-warning)",
          success: "var(--accent-success)",
        },
        // Text colors
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "350ms",
        panel: "300ms",
      },
      zIndex: {
        raised: "10",
        dropdown: "100",
        sticky: "200",
        overlay: "300",
        modal: "400",
        toast: "500",
        tooltip: "600",
      },
    },
  },
  plugins: [],
};
export default config;
