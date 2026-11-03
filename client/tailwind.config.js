/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a8a',
          900: '#0f172a',
          950: '#0a0f1d'
        },
        brown: {
          50: '#fbf7f4',
          100: '#f4ece5',
          200: '#e7d8cb',
          300: '#d5bca7',
          400: '#be997e',
          500: '#a67c5c',
          600: '#8c6043',
          700: '#714c35',
          800: '#5c3d2c',
          900: '#451a03',
          950: '#2b1002'
        },
        brandTeal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a'
        }
      }
    },
  },
  plugins: [],
}

