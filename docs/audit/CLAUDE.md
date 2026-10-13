# Audit Expense.io — guide pour les agents

Ce dossier contient l'audit de l'application (le code est à la racine du
dépôt, deux niveaux au-dessus). Point d'entrée humain : [README.md](README.md).

## Où chercher

| Besoin | Lire |
|---|---|
| Vue d'ensemble, priorités | `10-synthese.md` |
| Le détail d'un constat `V-xx` / `M-xx` | `12-constats.md` (index en tête, ancre `#v-07`) |
| Quoi corriger, dans quel ordre | `13-plan-remediation.md` (lots + dépendances) |
| Échelles de gravité/effort, modèle de fiche | `11-methode.md` |
| Toucher une route ou une règle d'accès | `06-autorisation.md`, puis `04-api.md` |
| Comprendre le métier (rôles, circuit d'approbation) | `01-produit.md`, `05-flux.md` |
| Schéma SQL, RLS, DTO | `03-donnees-et-objets.md` |
| Rejouer / tester un constat vérifié | `poc/README.md` |
| Ce qui est volontairement exclu | `14-hors-perimetre.md` |
| Architecture cible, modules, ports, plan de refacto (constats `A-xx`) | `20-audit-architecture-arla.md` |
| Décisions d'équipe, pour et contre | `21-decisions-architecture.md` |
| Comportements étranges à corriger, métier à rendre fonctionnel (`B-xx`) | `22-comportements-a-corriger.md` |

`07-points-de-vigilance.md` est la liste initiale de l'étape 1 : pour la
cotation et l'état à jour, `12-constats.md` fait foi.

## Règles

- **Identifiants stables** : citer `V-xx` / `M-xx` tels quels (commits,
  tickets). Ne jamais renuméroter ; un constat corrigé est marqué clos, pas
  supprimé.
- **Les `chemin:ligne` datent du 2026-10-09** (relatifs à la racine du dépôt) :
  revérifier dans le code avant d'agir, ils dérivent.
- **Contrainte projet** : toute correction reste invisible pour l'utilisateur
  (mêmes écrans, parcours et réponses), **sauf** les comportements étranges et
  le métier listés dans `22-comportements-a-corriger.md`, qui doivent être
  corrigés (décision d'équipe du 2026-10-13). Les choix ouverts sont dans
  `21-decisions-architecture.md` ; ne pas implémenter une option non tranchée.
- Ne pas se fier aux commentaires du code qui parlent de sécurité (V-00), ni
  supposer que `src/domain/` porte les règles métier : il n'est jamais appelé
  (V-01).
- Les « Règles pour les agents » de `11-methode.md` (dont « ne rien modifier
  dans le code ») concernaient la phase d'audit, pas la remédiation.
- Après une correction : marquer le constat clos dans `12-constats.md`
  (index et fiche) ; s'il a un script `poc/`, celui-ci doit passer de
  `CONFIRMÉ` à `RÉFUTÉ`.
