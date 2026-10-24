import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: "#002D4C",
            50: "#F0F5FA",
            100: "#DBE6F3",
            200: "#B8CEE7",
            300: "#8BB0D8",
            400: "#4D82BE",
            500: "#002D4C",
            600: "#002640",
            700: "#001E33",
            800: "#001625",
            900: "#000E17",
          },
          purple: {
            DEFAULT: "#3526C1",
            50: "#F2F2FA",
            100: "#E6E6F7",
            200: "#D2D5E6",
            300: "#A9A5F0",
            400: "#7F7BEE",
            500: "#3526C1",
            600: "#2B1FB0",
            700: "#221893",
            800: "#1A1373",
            900: "#130E56",
          },
          gold: {
            DEFAULT: "#FEB516",
            50: "#FFFBEB",
            100: "#FEF3C7",
            200: "#FDE68A",
            300: "#FCD34D",
            400: "#FBBF24",
            500: "#FEB516",
            600: "#D97706",
          },
          mint: {
            DEFAULT: "#6DD9A6",
            50: "#F0FDF4",
            100: "#DCFCE7",
            200: "#BBF7D0",
            500: "#6DD9A6",
            600: "#16A34A",
          },
          orange: {
            DEFAULT: "#F47200",
            50: "#FFF7ED",
            100: "#FFEDD5",
            200: "#FED7AA",
            300: "#FDBA74",
            400: "#FB923C",
            500: "#F47200",
            600: "#DC5F00",
            700: "#B44500",
            800: "#9A3412",
            900: "#7C2D12",
          },
          canvas: "#F2F2FA",
          cream: "#FCF6EA",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
