/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0f14',
        panel: '#11161d',
        edge: '#1f2933',
        accent: '#f59e0b',
      },
    },
  },
  plugins: [],
}
