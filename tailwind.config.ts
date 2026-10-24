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
            DEFAULT: "#635BFF",
            50: "#F5F3FF",
            100: "#EDE9FE",
            200: "#DDD6FE",
            300: "#C4B5FD",
            400: "#818CF8",
            500: "#635BFF",
            600: "#4F46E5",
            700: "#4338CA",
            800: "#3730A3",
            900: "#312E81",
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
