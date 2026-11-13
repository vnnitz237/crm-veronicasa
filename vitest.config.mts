import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    // Os testes de integração compartilham o mesmo banco local: rodar em série.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
