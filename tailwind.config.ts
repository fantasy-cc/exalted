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
        // PoE-themed colors
        poe: {
          dark: '#0a0a0c',
          darker: '#050507',
          card: '#12121a',
          border: '#2a2a3a',
          gold: '#d4af37',
          'gold-light': '#f0d060',
          'gold-dark': '#a08020',
          red: '#c41e3a',
          green: '#22c55e',
          blue: '#3b82f6',
          text: '#e8e6e3',
          'text-muted': '#8a8a8a',
        },
      },
      fontFamily: {
        poe: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'poe-gradient': 'linear-gradient(135deg, #0a0a0c 0%, #12121a 50%, #0a0a0c 100%)',
        'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #d4af37 100%)',
      },
      boxShadow: {
        poe: '0 4px 20px rgba(212, 175, 55, 0.15)',
        'poe-hover': '0 6px 30px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
}

export default config
