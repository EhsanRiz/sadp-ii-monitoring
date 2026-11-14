/** @type {import('tailwindcss').Config} */
// 4D Climate Solutions palette, sampled from the official logo:
//   green #00A551 (wordmark), blue #00ADEF, lime #A6CC38, brown #A78C83 / #7F6B64 (tagline)
// `brand` is a slightly deepened logo green so white text on buttons stays readable.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#008C44', dark: '#006B34', logo: '#00A551', light: '#E6F6ED' },
        fdblue: { DEFAULT: '#00ADEF', light: '#E5F7FD' },
        fdlime: { DEFAULT: '#A6CC38', light: '#F3F8E3' },
        fdbrown: { DEFAULT: '#7F6B64', light: '#A78C83' },
        lime: { DEFAULT: '#A6CC38' },
      },
    },
  },
  plugins: [],
};
