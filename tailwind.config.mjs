/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./public/assets/**/*.js"
  ],
  container: {
    center: true,
    padding: {
      DEFAULT: "1rem",
      sm: "1.25rem",
      lg: "1.5rem",
      xl: "2rem"
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1080px",
      xl: "1200px",
      "2xl": "1320px"
    }
  },
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#deecff",
          200: "#bddcff",
          300: "#8ec5ff",
          400: "#58a7ff",
          500: "#2f88f4",
          600: "#1e67c9",
          700: "#194f99",
          800: "#173f78",
          900: "#183861"
        },
        blush: "#ffdce6",
        sand: "#f8efe3",
        forest: "#32503f",
        ink: "#0f172a",
        cream: "#fffdf8"
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Manrope"', "system-ui", "sans-serif"],
        script: ['"Parisienne"', "cursive"]
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        xl2: "1.25rem",
        xl3: "1.75rem",
        "4xl": "2.25rem"
      },
      spacing: {
        14: "3.5rem",
        16: "4rem",
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem"
      },
      boxShadow: {
        soft: "0 12px 28px rgba(15, 23, 42, 0.12)",
        softLg: "0 18px 38px rgba(15, 23, 42, 0.14)",
        card: "0 22px 48px rgba(15, 23, 42, 0.14)",
        glow: "0 18px 55px rgba(47, 136, 244, 0.25)"
      },
      fontSize: {
        hero: ["clamp(2.25rem, 6vw, 4.5rem)", { lineHeight: "1.05" }],
        lead: ["clamp(1.05rem, 2vw, 1.3rem)", { lineHeight: "1.65" }]
      },
      backgroundImage: {
        hero:
          "radial-gradient(1200px 500px at 20% 0%, rgba(255, 220, 230, 0.6), transparent 50%), radial-gradient(800px 420px at 85% 20%, rgba(88, 167, 255, 0.4), transparent 45%), linear-gradient(135deg, #19385f 0%, #205f8d 45%, #1f8a87 100%)"
      }
    }
  },
  plugins: []
};
