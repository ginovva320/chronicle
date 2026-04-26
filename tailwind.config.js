/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper:        'var(--paper)',
        'paper-2':    'var(--paper-2)',
        ink:          'var(--ink)',
        'ink-2':      'var(--ink-2)',
        'ink-3':      'var(--ink-3)',
        'rule-soft':  'var(--rule-soft)',
        accent:       'var(--accent)',
        good:         'var(--good)',
        destructive:  'var(--destructive)',
      },
      fontFamily: {
        sans:  ['Inter Tight', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:  ['IBM Plex Mono', 'ui-monospace', 'Menlo', 'monospace'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
}
