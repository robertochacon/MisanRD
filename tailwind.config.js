/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca MisanRD (extraída del logo)
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          300: '#8eb6ff',
          400: '#598eff',
          500: '#1e63f0', // azul principal
          600: '#1550d6',
          700: '#123fad',
          800: '#14388a',
          900: '#16336f',
          950: '#0e1e45', // navy oscuro
        },
        gold: {
          50: '#fffaeb',
          100: '#fff0c6',
          200: '#ffdf88',
          300: '#ffc94a',
          400: '#fbb614', // dorado del logo
          500: '#f59e0b',
          600: '#d97a06',
          700: '#b45509',
          800: '#92420e',
          900: '#78370f',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 30 69 / 0.04), 0 4px 16px -2px rgb(16 30 69 / 0.08)',
        'card-hover': '0 2px 4px 0 rgb(16 30 69 / 0.06), 0 12px 28px -6px rgb(16 30 69 / 0.14)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
