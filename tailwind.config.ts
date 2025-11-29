import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        foreground: '#ededed',
        primary: {
          DEFAULT: '#00d9ff',
          dark: '#0099cc',
        },
        secondary: {
          DEFAULT: '#0066ff',
          dark: '#0044cc',
        },
        accent: {
          cyan: '#00ffff',
          blue: '#0080ff',
        },
      },
    },
  },
  plugins: [],
}
export default config
