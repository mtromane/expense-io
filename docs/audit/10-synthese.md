# 10 — Synthèse de l'audit

Support de présentation. Pour le détail d'un constat, suivre son identifiant
vers [12-constats.md](12-constats.md) ; pour l'ordre des corrections, voir
[13-plan-remediation.md](13-plan-remediation.md).

- Objet : Expense.io, circuit de validation de notes de frais par entreprise.
- Méthode : lecture statique de tout le code (≈2 500 lignes), puis
  **vérification par exécution** des constats majeurs contre l'instance de dev
  ([11-methode.md](11-methode.md)). Relevé des 9 au 13 octobre 2026.
- Contrainte : les correctifs doivent rester **invisibles pour l'utilisateur**,
  sauf bugs métier validés par l'équipe.

## Bilan au 2026-10-29 : avant / après

La remédiation est faite : refonte en monolithe modulaire (étapes 0 à 8 de
[20-audit-architecture-arla.md](20-audit-architecture-arla.md)) et décisions
D1 à D20 ([21-decisions-architecture.md](21-decisions-architecture.md)).
Chiffres relevés sur la branche `fix/p0-metier-et-docs`.

| Mesure | Avant (baseline `265924b`) | Après |
|---|---|---|
| Constats Critiques et Hauts clos | 0 / 15 | 13 / 15 (restent V-18 ouvert, V-17 hors périmètre) |
| Constats clos, tous niveaux | 0 / 63 | 40 / 63 ; 1 partiel, 16 ouverts, 4 acceptés, 2 hors périmètre ([12](12-constats.md)) |
| Défauts du registre (rouge → vert) | 38 rouges | 38 verts : 18 techniques, 20 métier |
| Tests automatisés | aucun | 246 unitaires, 329 Playwright (231 parité, 98 défauts) |
| CI | aucune | `static`, `parity`, `defects`, `baseline-proof`, `perf` |
| Couverture unitaire de `src/modules` | 0 % | 72 % des instructions, 75 % des branches |
| Routes API | 14 fichiers, 592 lignes | 17 fichiers, 127 lignes (3 routes ajoutées) |
| Accès directs à la base dans `src/app` | 34 | 0 (tout passe par les modules) |
| Contrôles de rôle écrits dans les routes | 10 | 0 (garde unique `route({ role })`) |
| Performance (p95, même machine) | référence | aucun scénario plus lent : OCR −97 %, liste RH −78 %, création −21 %, liste employé −20 %, liste manager −4 % ; PERF-01 atteint, PERF-02 non (listes employé et manager au-dessus de 50 % de la baseline) |

Ce qui reste ouvert relève surtout de l'exploitation et de la sécurité de
second rang (limite de débit, journalisation des décisions, délais, mise à
jour de `next`) : liste et raisons dans [12-constats.md](12-constats.md).

## Verdict (audit initial, 2026-10-13)

L'application **fonctionne**, mais **n'isole pas réellement les données entre
entreprises** et **ne protège pas les comptes**. Plusieurs failures graves ont
été **démontrées par exécution**, pas seulement lues : un utilisateur peut lire
la base d'une autre entreprise, et n'importe qui connaissant le code peut se
faire passer pour un RH. La sécurité annoncée dans les commentaires (RLS, JWT)
est en grande partie **décorative**.

En face, **aucun test automatisé** n'existe. Toute correction « invisible »
exige donc d'abord un filet de non-régression — c'est le point de départ
obligé du plan.

Le socle est petit et lisible : les corrections les plus graves sont à faible
effort. **Les 3 failles critiques/hautes de sécurité majeures se corrigent en
moins d'une journée chacune.**

## En un coup d'œil

**63 constats** (hors 47 points d'hygiène) :

| Gravité | Nombre | Confirmés par PoC |
|---|---|---|
| Critique | 3 | 1 (V-07) |
| Haute | 12 | 5 |
| Moyenne | 28 | 3 |
| Faible | 20 | 1 |

| Thème | Crit. | Haute | Moy. | Faible |
|---|---|---|---|---|
| Authentification & secrets | | 3 | 3 | 3 |
| Autorisation & isolation | | 2 | 3 | 2 |
| Injection & validation | 1 | | 1 | 3 |
| Intégrité & concurrence | | | 3 | 1 |
| Robustesse & exploitation | | 3 | 3 | 7 |
| Maintenabilité & tests | | 1 | 7 | |
| Dépendances, config, RGPD | | | 4 | 1 |
| Circuit métier | 2 | 3 | 4 | 3 |

## Top risques — sécurité et intégrité

Classé par gravité. Tous **confirmés par PoC** (`poc/`).

| # | ID | Risque | Démontré | Effort |
|---|---|---|---|---|
| 1 | **V-07** | **Injection SQL** par le paramètre de tri : lecture à l'aveugle de **toute** la base (emails, hashs, notes de toutes les entreprises) | `pg_sleep(2)` → 2,03 s ; sous-requête lisant les 6 notes au lieu de 2 | S |
| 2 | **V-08** | **Secret d'authentification codé en dur** : un jeton forgé hors-ligne usurpe n'importe quel compte et rôle, sans mot de passe | Jeton `hr_admin` forgé → `GET /api/hr/users` 200 | S |
| 3 | **V-05.1** | **RLS contournée** : l'app se connecte en superuser, les policies sont ignorées → c'est ce qui rend V-06 et V-07 globaux | rôle `expense` = `rolsuper=t, rolbypassrls=t` | M |
| 4 | **V-06** | **Reçu de n'importe quelle note** accessible par tout manager, même d'une autre entreprise (IDOR) | note d'une autre entreprise : `receipt-url` 200, fichier récupéré | S |
| 5 | **V-11** | **Message et pile d'exception renvoyés au client** (messages SQL, chemins serveur) | 500 avec `error` + `stack` | S |
| 6 | **V-09** | **Décisions concurrentes non verrouillées** : une note peut être approuvée **et** rejetée | 3+3 requêtes → 6 réponses 200 | S |
| 7 | **V-13.1/.2** | **OCR non borné** : worker par requête, corps lu sans limite de taille | 4 workers → RSS +80 Mo ; corps 40 Mo accepté | M/S |

À quoi s'ajoutent, non rejouées mais établies par lecture : rôle figé dans le
JWT jusqu'à 30 jours (V-19), absence de limite de tentatives (V-18), email
jamais vérifié à l'inscription (V-17).

## Top risques — circuit métier

Ce ne sont **pas** des failles mais des **bugs de conception** : le produit ne
tient pas ses promesses pour certains utilisateurs. Leur correction est
**visible** et doit être **validée par l'équipe**.

| # | ID | Problème |
|---|---|---|
| 1 | **M-02** | Le rôle **manager n'est pas attribuable** depuis l'interface : une entreprise née d'une inscription n'a jamais de manager |
| 2 | **M-01.1 / M-01.2** | Les notes des **RH** et des **employés sans manager** ne sont validées **par personne** et restent en attente indéfiniment — or tout nouvel inscrit arrive sans manager |
| 3 | **M-03** | Une « entreprise » peut se fonder sur un **domaine public** (gmail…) : le premier inscrit en devient RH et voit les noms et emails des suivants |
| 4 | **M-06** | Le manager voit l'**id technique tronqué** de l'auteur, pas son nom |

## Ce qu'on recommande

1. **D'abord un filet de tests** (lot 0) : sans lui, aucune correction ne peut
   être garantie « invisible ». Les PoC existants en forment la base.
2. **Puis les quick wins de sécurité** (lots 1-2) : V-07, V-08, V-11 —
   gravité maximale, effort minimal, aucune dépendance.
3. **Puis l'isolation** (lots 3-4) : centraliser le contrôle d'accès (V-03) et
   remettre la RLS en service (V-05 + V-10.1, à faire ensemble).
4. **En parallèle** : mise à jour des dépendances et de la config (lot 7).
5. **Les changements métier** (lot 8) sont réservés à une **décision d'équipe**
   avant implémentation.

Détail et dépendances : [13-plan-remediation.md](13-plan-remediation.md).

## Livrables de l'audit

| Fichier | Contenu |
|---|---|
| [10-synthese.md](10-synthese.md) | Ce document |
| [11-methode.md](11-methode.md) | Méthode, échelles, modèle de fiche |
| [12-constats.md](12-constats.md) | 63 fiches + hygiène + couverture OWASP |
| [13-plan-remediation.md](13-plan-remediation.md) | Lots ordonnés |
| [14-hors-perimetre.md](14-hors-perimetre.md) | Évolutions non traitées |
| [`poc/`](poc/) | 8 démonstrations rejouables |

> Rappel : l'audit initial **constatait et proposait**. L'implémentation a suivi
> en équipe, à partir du plan : voir le bilan au 2026-10-29 en tête de document.
