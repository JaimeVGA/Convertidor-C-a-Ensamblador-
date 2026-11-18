/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Satoshi', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        trigger: {
          canvas: '#1c1e21',
          ink: '#121317',
          hairline: '#3b3e45',
          steel: '#272a2e',
          ash: '#b5b8c0',
          fog: '#878c99',
          cloud: '#d7d9dd',
          bone: '#e5e7eb',
          lime: '#a8ff53',
          violet: '#9c9af2',
          pink: '#fa3abf',
          event: '#7655fd',
          loop: '#afec73',
          key: '#d9f07c',
          tag: '#e888f8',
          red: '#f43f5e',
        }
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
      },
    },
  },
  plugins: [],
}
