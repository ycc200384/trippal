/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm terracotta — sunset on ancient town walls
        clay: { DEFAULT: '#C75B39', light: '#D4785C', dark: '#A8462A', glow: '#FDF0EB' },
        // Sage green — mountain forests
        sage: { DEFAULT: '#5B8C5A', light: '#7AA879', dark: '#3D6B3C', glow: '#EDF5EC' },
        // Warm neutrals
        warm: {
          bg: '#FBF7F0',       // aged journal paper
          card: '#FFFBF5',     // warm white
          ink: '#2D2A26',      // warm charcoal
          muted: '#8B7E74',    // taupe
          border: '#E8DFD5',   // warm border
        },
        // Gold sunlight accent
        sun: { DEFAULT: '#D4A853', light: '#E8CC7A' },
        // Blush
        blush: { DEFAULT: '#E8C4B8', light: '#F5E0D8' },
      },
      fontFamily: {
        display: ['"Playfair Display"', '"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"Lora"', '"Noto Sans SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        'blob': '30% 70% 70% 30% / 30% 30% 70% 70%',
      },
    },
  },
  plugins: [],
};
