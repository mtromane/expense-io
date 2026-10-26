import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Règles d'architecture (ADR-002, ADR-005) : bloquantes depuis que tous les
// modules sont en place (étape 8).
const ARCHITECTURE_LEVEL = "error";

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

// src/lib a été vidé puis supprimé (étape 8) : le code vit dans les modules.
const LEGACY_LIB = {
  group: ["@/lib", "@/lib/*"],
  message: "src/lib n'existe plus : importer le module (@/modules/<module>).",
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
    // Adapters et assemblage des modules : pas de retour vers src/lib.
    files: ["src/modules/**"],
    rules: {
      "no-restricted-imports": [ARCHITECTURE_LEVEL, { patterns: [LEGACY_LIB] }],
    },
  },
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
            { group: ["pg", "pg/*"], message: "Pas de SQL dans un contrôleur : passer par un cas d'usage." },
            { group: ["@aws-sdk/*"], message: "Stockage des reçus : passer par un module." },
            { group: ["tesseract.js"], message: "OCR : passer par le module receipt-scan." },
            { group: ["bcryptjs"], message: "Mots de passe : passer par le module identity." },
            {
              group: ["@/modules/shared/infrastructure", "@/modules/shared/infrastructure/*"],
              message: "Pas d'accès base ni de SDK dans un contrôleur : passer par un cas d'usage.",
            },
            LEGACY_LIB,
            MODULE_INTERNALS,
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
