/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // You can extend Tailwind's built-in colors
      // But actually, Tailwind's slate/gray/zinc colors are already comprehensive
      // Best practice: Use Tailwind built-in colors + dark: prefix directly
      // 
      // If you want custom brand colors, you can do this:
      colors: {
        // Brand colors
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#6366f1',  // Primary color
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}