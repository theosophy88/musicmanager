/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#baccff',
          300: '#84a9ff',
          400: '#527aff',
          500: '#2952e3',
          600: '#1e3fc7',
          700: '#1830a0',
          800: '#192a82',
          900: '#1a2768',
        },
      },
    },
  },
  plugins: [],
}
