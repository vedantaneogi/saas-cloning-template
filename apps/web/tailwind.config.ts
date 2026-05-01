import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        outlook: {
          primary: '#0078D4',
          'primary-hover': '#106EBE',
          'primary-dark': '#005A9E',
          'primary-light': '#C7E0F4',
          sidebar: '#F3F2F1',
          'sidebar-hover': '#EDEBE9',
          border: '#EDEBE9',
          'border-dark': '#D2D0CE',
          'text-primary': '#323130',
          'text-secondary': '#605E5C',
          'text-disabled': '#A19F9D',
          'bg-white': '#FFFFFF',
          'bg-light': '#FAF9F8',
          'unread-dot': '#0078D4',
          'flag-red': '#D13438',
          'success': '#107C10',
          'warning': '#FF8C00',
          'danger': '#D13438',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        md: ['15px', '22px'],
        lg: ['16px', '22px'],
        xl: ['18px', '24px'],
        '2xl': ['20px', '28px'],
      },
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      boxShadow: {
        'outlook-sm': '0 1px 2px rgba(0,0,0,0.1)',
        'outlook': '0 2px 8px rgba(0,0,0,0.15)',
        'outlook-lg': '0 4px 16px rgba(0,0,0,0.2)',
        'outlook-focus': '0 0 0 2px #0078D4',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
