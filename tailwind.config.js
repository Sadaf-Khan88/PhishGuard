/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f5f8fb',
          100: '#e7eef5',
          200: '#cdd9e5',
          300: '#b0c1d1',
          400: '#8fa5b9',
          500: '#70869b',
          600: '#50677e',
          700: '#2a4055',
          800: '#1b2f43',
          900: '#102031',
          950: '#081522',
        },
      },
    },
  },
  plugins: [],
};
