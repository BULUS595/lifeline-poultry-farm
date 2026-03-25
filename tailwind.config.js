/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: 'rgba(26, 188, 156, 0.1)',
          DEFAULT: '#1ABC9C',
          dark: '#16A085',
          glow: 'rgba(26, 188, 156, 0.2)',
        },
        background: {
          primary: '#121212',
          secondary: '#1E1E1E',
          tertiary: '#2D2D2D',
          glass: 'rgba(18, 18, 18, 0.8)',
        },
        border: 'rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
}
