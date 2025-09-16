import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A73E8',      // Electric Blue (CTA)
        secondary: '#A3FF00',    // Neon Green (Cards/Tabs)
        accent: '#FF00C8',       // Hot Pink (Badges)
        neutral: '#FFF44F',      // Lemon Yellow (bg)
        'neutral-bg': '#FFF44F', 
        'neutral-container': '#FFFFFF', // White for cards/modals
        'neutral-text': '#0D0D2B',      // Dark Navy
        'neutral-text-soft': '#4A5568', // Slate Gray
        'neutral-border': '#E6D947',     // Darker Yellow border
        'dark-text': '#0D0D2B',         // Dark text for bright buttons
      },
      animation: {
        marquee: 'marquee 60s linear infinite',
        'marquee-reverse': 'marquee-reverse 60s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
