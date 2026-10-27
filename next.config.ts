import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  agentRules: false,
  // forbidden() : page « Accès réservé » servie en 403 (D19, ADR-019).
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
