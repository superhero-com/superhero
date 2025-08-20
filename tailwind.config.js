/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,html}'
  ],
  corePlugins: {
    preflight: false,
    container: false,
  },
  theme: {
    extend: {
      colors: {
        fg: 'var(--standard-font-color)',
        bg: 'var(--background-color)',
        primary: 'var(--primary-color)',
        accent: 'var(--accent-color)',
        success: 'var(--success-color)',
        warning: 'var(--warning-color)',
        error: 'var(--error-color)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};


