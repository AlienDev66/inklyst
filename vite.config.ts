import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@pagina/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url),
      ),
      "@pagina/supabase": fileURLToPath(
        new URL("../../packages/supabase/src/index.ts", import.meta.url),
      ),
    },
  },
  server: { port: 5173, strictPort: true },
});
