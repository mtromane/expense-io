import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Règles d'architecture (ADR-002, D5) : avertissement pendant la migration,
// bloquantes une fois tous les modules en place.
const ARCHITECTURE_LEVEL = "warn";

const INFRASTRUCTURE_PACKAGES = [
  { group: ["pg", "pg/*"], message: "Accès base réservé à infrastructure/ (port + adapter)." },
  { group: ["@aws-sdk/*"], message: "S3 réservé à infrastructure/ (port ReceiptStorage)." },
  { group: ["tesseract.js"], message: "OCR réservé à infrastructure/ (port ReceiptScanner)." },
  { group: ["bcryptjs"], message: "Hachage réservé à infrastructure/." },
  { group: ["next", "next/*", "next-auth", "next-auth/*", "react", "react-dom"], message: "Le cœur métier ne dépend d'aucun framework." },
  { group: ["@/lib/*", "@/config"], message: "Le cœur métier reçoit ses dépendances par des ports." },
];

// Un module s'utilise par son index ; seul `shared` expose des sous-paquets.
const MODULE_INTERNALS = {
  regex: "^@/modules/(?!shared/)[^/]+/.+",
  message: "Importer un module par son index (@/modules/<module>), jamais ses fichiers internes.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sorties générées par les tests (rapports Playwright, mesures de perf).
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "perf-results/**",
    "coverage/**",
  ]),
  {
    // Domaine et cas d'usage : aucune dépendance d'infrastructure ni de framework.
    files: [
      "src/domain/**",
      "src/ports/**",
      "src/modules/*/domain/**",
      "src/modules/*/application/**",
      "src/modules/*/ports/**",
    ],
    rules: {
      "no-restricted-imports": [
        ARCHITECTURE_LEVEL,
        {
          patterns: [
            ...INFRASTRUCTURE_PACKAGES,
            MODULE_INTERNALS,
            {
              group: ["@/modules/shared/http", "@/modules/shared/http/*", "@/modules/shared/infrastructure", "@/modules/shared/infrastructure/*"],
              message: "Le cœur métier ne connaît ni HTTP ni l'infrastructure partagée.",
            },
            { group: ["**/infrastructure/*", "**/infrastructure"], message: "Le cœur métier ne connaît pas les adapters." },
          ],
        },
      ],
    },
  },
  {
    // Routes, pages et actions : passent par les modules, jamais par la base ou les SDK.
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        ARCHITECTURE_LEVEL,
        {
          patterns: [
            { group: ["pg", "pg/*", "@/lib/db"], message: "Pas de SQL dans un contrôleur : passer par un cas d'usage." },
            { group: ["@aws-sdk/*", "@/lib/storage"], message: "Stockage des reçus : passer par un module." },
            { group: ["tesseract.js", "@/lib/ocr"], message: "OCR : passer par le module receipt-scan." },
            MODULE_INTERNALS,
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
