import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    restoreMocks: true,
  },
});
