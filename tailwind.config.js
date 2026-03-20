/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Align with TailAdmin free palette
        primary: {
          DEFAULT: '#3C50E0',
          50: '#EEF0FC',
          100: '#D4D9F8',
          200: '#A9B3F1',
          300: '#7E8DEA',
          400: '#5367E3',
          500: '#3C50E0',
          600: '#2236C8',
          700: '#1A2A9C',
          800: '#111D6E',
          900: '#090F40',
        },
      },
    },
  },
  plugins: [],
}
