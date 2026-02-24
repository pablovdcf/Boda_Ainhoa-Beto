/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./public/assets/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        night: "#0B3B4F",
        champagne: "#F5E6D3",
        blush: "#F8D9E0",
        ink: "#0f172a",
        gold: "#C4A26A"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(10, 30, 60, .10)"
      },
      backgroundImage: {
        hero:
          "linear-gradient(135deg, #0B3B4F 0%, #164e63 60%, #2563eb 120%)",
        paper:
          "radial-gradient(1200px 600px at 50% -200px, rgba(255,255,255,.15), transparent 65%)"
      }
    }
  },
  plugins: []
};
