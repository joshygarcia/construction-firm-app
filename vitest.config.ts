import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // No correr tests de copias empaquetadas del código (build artifacts).
    exclude: [...configDefaults.exclude, "**/dist-electron/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
