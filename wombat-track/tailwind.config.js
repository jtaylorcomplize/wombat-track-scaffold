/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for status indicators
        'status-complete': '#16a34a',
        'status-progress': '#eab308',
        'status-pending': '#6b7280',
        'status-error': '#dc2626',
        'status-blocked': '#f59e0b',
        // RAG status colors
        'rag-red': '#dc2626',
        'rag-amber': '#f59e0b',
        'rag-green': '#16a34a',
        'rag-blue': '#2563eb',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}