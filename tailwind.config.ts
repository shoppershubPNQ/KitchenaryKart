import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#A01818',
          dark: '#7A1212',
          hover: '#C02020',
        },
        'top-strip': '#0F5E5C',
        ink: {
          DEFAULT: '#1A1A1A',
          soft: '#3A3A3A',
        },
        muted: '#6B6B6B',
        line: '#E5E5E5',
        cream: {
          DEFAULT: '#EFE3D0',
          dark: '#E8DCC4',
        },
        'bg-soft': '#F7F7F7',
        gold: '#D4A574',
        success: '#137B37',
      },
      fontFamily: {
        head: ['Montserrat', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,.05)',
        md: '0 8px 24px rgba(0,0,0,.08)',
        lg: '0 20px 50px rgba(0,0,0,.12)',
      },
      maxWidth: {
        site: '1600px',
      },
    },
  },
  plugins: [],
};

export default config;
