/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Override gray with the zinc scale to get neutral blacks in dark mode
        // instead of the blue-tinted Tailwind default gray.
        gray: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
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
