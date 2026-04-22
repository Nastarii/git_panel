/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#0f0d0c',
          surface: '#1a1614',
          border: '#2e2826',
          muted: '#8a8280',
          text: '#d4cdc9',
          accent: '#f24e0e',
          'accent-dim': '#b83a0a',
          success: '#3fb950',
          warning: '#d29922',
          danger: '#f85149',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
