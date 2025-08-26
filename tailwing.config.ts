import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#836EF9",
        secondary: "#200052",
        background: "#FBFAF9",
        text: "#0E100F",
      },
    },
  },
  plugins: [],
};
export default config;
