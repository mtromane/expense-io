# ADR-005 · Règles d'architecture vérifiées par ESLint

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D5

## Contexte
Sans vérification, la règle de dépendance redevient une convention qui dérive, et l'agent IA du live coding n'a aucun garde-fou.

## Décision
`no-restricted-imports` dans `eslint.config.mjs` :
* `src/domain`, `src/ports`, `modules/*/domain`, `modules/*/application`, `modules/*/ports` n'importent ni `pg`, ni `@aws-sdk/*`, ni `tesseract.js`, ni `bcryptjs`, ni `next`, ni `next-auth`, ni `@/lib/*`, ni un adapter ;
* `src/app` et `src/components` n'importent ni la base, ni les SDK, ni les fichiers internes d'un module ;
* un module s'importe par son index.

Niveau `warn` pendant la migration, `error` à la fin : `npm run lint` (job `static` de la CI) prouve alors l'architecture.

## Alternatives
* Aucune règle : l'architecture dérive.
* Avertissement seul : les avertissements s'ignorent.

## Conséquences
* Le nombre d'avertissements mesure l'avancement (18 au départ).
* `.github/` n'est pas modifié : le job `static` lance déjà `npm run lint`.
