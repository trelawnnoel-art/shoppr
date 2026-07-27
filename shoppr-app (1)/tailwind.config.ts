import type { Config } from 'tailwindcss';

// SHOPPR design tokens.
// Soft off-white background, near-black type, neutral gray surfaces,
// with subtle blue / violet / emerald accents used sparingly.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#14141A',
        'ink-soft': '#4A4A52',
        muted: '#8A8A92',
        paper: '#F7F6F3',
        surface: '#FFFFFF',
        line: 'rgba(20, 20, 26, 0.08)',
        'line-strong': 'rgba(20, 20, 26, 0.14)',
        accent: {
          blue: '#3454D1',
          'blue-soft': '#E8ECFB',
          violet: '#7C5CFC',
          'violet-soft': '#EFEAFE',
          emerald: '#1FA97A',
          'emerald-soft': '#E3F6EE',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        card: '22px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 20px 50px -28px rgba(20, 20, 26, 0.25)',
        floating: '0 10px 28px -8px rgba(20, 20, 26, 0.3)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
