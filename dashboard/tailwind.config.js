/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16213D',
        'ink-soft': '#4A5470',
        paper: '#EFEEE7',
        'paper-raised': '#F8F7F2',
        saffron: '#E8A33D',
        track: '#2F7A4F',
        clay: '#C1462F',
        line: '#D9D4C8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
