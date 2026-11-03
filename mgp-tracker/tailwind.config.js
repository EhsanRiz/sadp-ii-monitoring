/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#006838', dark: '#004d29', light: '#e6f2ec' },
        lime: { DEFAULT: '#8DC63F' },
      },
    },
  },
  plugins: [],
};
