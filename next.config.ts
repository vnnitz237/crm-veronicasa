import type { NextConfig } from "next";

// cacheComponents fica desligado: todas as telas do CRM dependem da sessão e
// das regras de acesso do Supabase, então são renderizadas por requisição.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
