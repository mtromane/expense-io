# 22 · Comportements étranges et métier à rendre fonctionnel

* Pour qui : l'équipe archi et la team Tests.
* Nouvelle donne (2026-10-13) : le professeur a des tests qui **échouent aujourd'hui** et qu'il attend **verts après la refacto**. Ils portent probablement sur les comportements étranges de l'application. Consigne d'équipe : **le métier doit être totalement fonctionnel**.
* Conséquence : la règle « invisible pour l'utilisateur » et la liste des « incohérences conservées » (`docs/tests/criteres-fin-de-migration.md` §2.1, §2.3, `AGENTS.md` règle 5) ne tiennent plus pour ces points. Elles doivent être révisées avec la team Tests **avant** d'implémenter (voir §5).
* Identifiants repris de l'audit (`V-xx`, `M-xx`) et des tests (`MET-xx`). `B-xx` = bizarrerie non fichée ailleurs.
* **État au 2026-10-29** : corrigés par les décisions D12 à D20, avec leur défaut rouge puis vert : `M-02`, `M-01.2`, `M-01.1`, `M-08`, `V-04.2`, `V-04.1`, `V-09`, `M-06`, `M-04`, `M-09`, `ROB-03a` à `f`, `BUG-01`, `B-01`, `B-02`, `B-04`, `SEC-05`, `V-12.3`, `V-12.2`, `V-12.1`, `M-03`. Conservés : `MET-07`, `B-03`, `B-05` (409, D18), `B-06` (D15 : API en anglais, écran inchangé), `M-07` (texte existant). Restent ouverts : `M-05.1`, `MET-06` (longueur de description, décimales), `V-13.3`, `V-14.1`, `V-14.3`, `V-17` (hors périmètre), `V-20`, `V-22`, `V-23`. Statut détaillé de chaque constat : colonne « Statut » de [12-constats.md](12-constats.md).

## 1. L'hypothèse la plus forte sur les tests du professeur

Un test de bout en bout « naturel » pour ce produit est : une entreprise s'inscrit, la RH nomme un manager, rattache un employé, l'employé soumet une note, le manager la voit avec le nom de l'auteur et la valide, l'employé voit le statut.

**Ce parcours est impossible aujourd'hui** : aucun manager ne peut être créé depuis l'interface (`M-02`). Une entreprise née d'une inscription n'a donc jamais de circuit de validation, et toutes ses notes restent en attente pour toujours (`M-01.1`, `M-01.2`). C'est très probablement le cœur des tests rouges du professeur. Priorité absolue.

## 2. Inventaire

Colonnes :
* **Confiance** : probabilité qu'un test du professeur porte dessus (élevée, moyenne, faible).
* **Arbitrage** : `non` = la bonne réponse fait consensus (standard HTTP, bug évident) ; `oui` = plusieurs réponses défendables, à trancher en équipe (`21-decisions-architecture.md`).
* **Tests à faire évoluer** : tests de parité actuels qui figent le comportement étrange. Ils appartiennent à la team Tests : c'est elle qui les modifie, dans la même PR que le correctif.

### 2.1 Circuit de validation

| ID | Aujourd'hui | Cible | Confiance | Arbitrage | Tests à faire évoluer |
|---|---|---|---|---|---|
| `M-02` | Le rôle manager n'est attribuable que par le seed ou en SQL | La RH promeut un employé en manager (et l'inverse) depuis la console RH ; nouvelle route RH, scopée à l'entreprise | élevée | oui (forme de l'écran, de la route) | aucun (ajout) ; contrat OpenAPI à étendre |
| `M-01.2` / `MET-02` | Note d'un employé sans manager visible par personne, en attente pour toujours | Validée par la RH de l'entreprise (même file que les managers racine) | élevée | non | `hr.spec.ts` (liste RH) à vérifier ; matrice inchangée |
| `M-01.1` / `MET-03` | Note d'une RH validée par personne | Validée par une autre RH, ou par un manager si la RH est rattachée ; jamais par elle même | élevée | **oui** (une entreprise n'a qu'une RH aujourd'hui) | aucun connu |
| `M-08` | Un manager rétrogradé laisse ses subordonnés rattachés à lui : leurs notes ne sont plus vues par personne | Refuser la rétrogradation tant qu'il a des subordonnés, ou les détacher dans la même transaction | moyenne (existe dès que `M-02` existe) | oui | aucun (ajout) |
| `V-04.2` / `MET-04` | Cycle accepté (A manage B, B manage A) : validation croisée, risque de fraude | Refus `409 {"error":"Invalid manager"}`, comme l'auto rattachement | élevée | non | aucun |
| `V-04.1` (`SEC-03`) | Manager d'une autre entreprise attribuable | Refus `409` | élevée | non | déjà au registre des défauts |
| `V-09` (`ROB-02`) | Une note peut être approuvée **et** rejetée | Une seule décision gagne, les autres `409` | élevée | non | déjà au registre |
| `MET-07` | Réassignation de manager : les notes en attente suivent le nouveau manager | **Garder** : le valideur est le manager courant, c'est le comportement attendu | faible | non | aucun |
| `M-05.1` / `MET-09` | Décideur et date de décision perdus | Conserver `decided_by`, `decided_at` (base) ; affichage à arbitrer | moyenne | oui (affichage) | aucun si non exposé ; contrat si exposé |

### 2.2 Notes et reçus

| ID | Aujourd'hui | Cible | Confiance | Arbitrage | Tests à faire évoluer |
|---|---|---|---|---|---|
| `M-06` / `MET-08` | Le manager voit l'id tronqué de l'auteur ; la RH voit son nom | Le manager voit le nom, comme la RH | élevée | non | contrat OpenAPI (nouveau champ dans la liste manager) ; schémas stricts |
| `M-04` | Le total « Mes notes » additionne les notes rejetées | Total hors notes rejetées (ou par statut) | moyenne | oui (forme de l'affichage) | `tests/e2e/employee.spec.ts:22` si le texte change ; le garder identique quand il n'y a pas de rejet |
| `M-09` / `MET-06` | Date de dépense dans le futur acceptée | `400 {"error":"Champs invalides"}` + `max` sur le champ date | moyenne | non | aucun |
| `MET-06` | Montant à plus de 2 décimales arrondi en silence ; description sans limite | `400 Champs invalides` au delà de 2 décimales ; longueur maximale de description | moyenne | oui (valeur de la limite) | aucun connu |
| `ROB-03a` à `e` | Entrées invalides donnent `500` ou un effet silencieux | `400` / `404` | élevée | non | déjà au registre |
| `BUG-01` | Date affichée décalée d'un jour en fuseau négatif | Date affichée telle que saisie | élevée | non | déjà au registre |
| `V-13.3` | PDF accepté au formulaire, ignoré par l'OCR sans explication | Message explicite « pas de suggestion pour un PDF » (ou OCR de la première page) | faible | oui | `ocr.spec.ts` attend `{}` pour un PDF : garder la réponse API, ne changer que l'écran |
| `V-14.1` | « Voir le reçu » ouvre l'onglet après l'appel réseau : bloqué par les anti pop up | Ouvrir l'onglet au clic, puis y charger l'URL | moyenne | non | aucun (`E2E-06` doit rester vert) |
| `V-14.3` | Erreur réseau d'un `fetch` non gérée : rien ne s'affiche | Message d'erreur dans l'encart existant | faible | non | aucun |

### 2.3 Contrôle d'accès et réponses HTTP

| ID | Aujourd'hui | Cible | Confiance | Arbitrage | Tests à faire évoluer |
|---|---|---|---|---|---|
| `B-01` (`V-15.1`) | Mauvais rôle sur `/api/manager/*` : `401` alors que l'utilisateur est connecté | `403` (connecté mais pas autorisé) | élevée | non | `authz-matrix.ts` lignes `M01` à `M04`, colonnes `owner`, `otherEmployee`, `hr`, `otherHr` |
| `B-02` (`V-15.1`) | Anonyme sur `/api/hr/*` : `403` | `401` (pas authentifié) | élevée | non | `authz-matrix.ts` lignes `H01` à `H06`, colonne `anonymous` |
| `B-03` | Note hors périmètre : `404` et non `403` | **Garder** : ne pas révéler l'existence d'une ressource d'un autre périmètre (pratique OWASP recommandée) | faible | non | aucun |
| `B-04` | `/manager` ou `/hr` avec un mauvais rôle : page « Accès réservé » renvoyée en `200` | Même page et même texte, statut `403` | faible | oui (faisabilité Next.js) | `guards.spec.ts` vérifie le titre seulement : compatible |
| `B-05` (`V-15.1`) | `Invalid manager` renvoyé en `409` | Garder `409` (conflit avec l'état de l'organigramme) ou passer en `422` | faible | oui | `hr.spec.ts:101`, `:109` si on change |
| `B-06` (`V-15.2`) | Messages d'erreur anglais (`Already decided`, `Not found`, `Invalid manager`) affichés tels quels à l'écran | Écran en français ; API à arbitrer (voir ci dessous) | moyenne | **oui** | contrat OpenAPI et tests si l'API change |
| `SEC-05` | Stack trace dans les `500` | Message générique | élevée | non | déjà au registre |

Pour `B-06`, deux options :
* traduire côté interface uniquement : l'API garde ses messages, risque nul pour les tests API, mais l'API reste incohérente (`Champs invalides` en français, `Not found` en anglais) ;
* passer l'API en français : cohérent, mais tout test (le nôtre ou celui du professeur) qui lit le message anglais casse.
Recommandation : **traduire côté interface**, garder l'API, sauf indication contraire du professeur.

### 2.4 Inscription et comptes

| ID | Aujourd'hui | Cible | Confiance | Arbitrage | Tests à faire évoluer |
|---|---|---|---|---|---|
| `V-12.3` / `MET-05` | `Alice@acme.fr` et `alice@acme.fr` sont deux comptes ; connexion sensible à la casse | Email normalisé (minuscules, espaces retirés) à l'inscription et à la connexion ; unicité sur `lower(email)` | élevée | non | aucun ; migration à coordonner (`seed-e2e.mjs`) |
| `V-12.2` | Deux inscriptions simultanées du même email : erreur non gérée | Message « Un compte existe déjà avec cet email. » | faible | non | aucun |
| `V-12.1` | Inscription non transactionnelle : entreprise sans RH possible | Entreprise et premier compte créés dans une transaction | faible | non | aucun |
| `M-03` / `MET-01` | Une « entreprise » peut naître sur `gmail.com` ; son premier inscrit devient RH de tous les suivants | Refuser les domaines publics (liste) à l'inscription | moyenne | **oui** (liste, message) | aucun ; nouveau message d'interface |
| `V-17` / `MET-01` | Email jamais vérifié | Vérification par lien | faible | **oui** (aucun envoi d'email dans la stack ; probablement hors périmètre) | aucun |
| `M-07` | Un employé sans manager affiché « racine » dans la console RH | Libellé selon le rôle (« à rattacher » pour un employé) | moyenne | oui (texte) | E2E RH si le texte du menu est ciblé |
| `V-20`, `V-22`, `V-23` | Énumération des comptes, mots de passe courants, session longue | À traiter comme sécurité, pas comme métier | faible | oui | aucun |

## 3. Ordre conseillé

1. **Circuit complet depuis l'interface** : `M-02`, puis `M-01.2`, `M-01.1`, `M-08`, `V-04.2`. C'est l'hypothèse la plus forte sur les tests du professeur, et elle tombe naturellement dans le module `approval` / `organization` de la refacto (une seule `ApprovalPolicy` répond à « qui valide quoi »).
2. **Codes HTTP** : `B-01`, `B-02`. Une ligne dans la garde centralisée (A-03) au lieu de 13 fichiers : c'est la meilleure démonstration du bénéfice de la refacto.
3. **Affichage** : `M-06`, `M-04`, `BUG-01`, `V-14.1`, `B-06` (écran).
4. **Saisie et inscription** : `M-09`, `MET-06`, `V-12.3`, `V-12.1`, `V-12.2`, puis `M-03` selon l'arbitrage.
5. **Le reste** selon le temps : `M-05.1`, `M-07`, `V-13.3`, `B-04`, `V-14.3`.

## 4. Comment ne pas casser les tests cachés en corrigeant

On ne connaît pas les tests du professeur : chaque correction peut en rendre un vert et en casser un autre. Règles de prudence :

* **Ne jamais changer un texte d'interface existant** (labels, boutons, titres) : les tests cachés ciblent probablement les éléments par leur texte. On **ajoute** (un menu de rôle, un message) sans renommer.
* **Préférer l'ajout au remplacement dans l'API** : nouvelle route pour le changement de rôle, champ ajouté (`authorName`) plutôt que champ renommé ou retiré.
* **Suivre le standard quand il existe** (`401` / `403`, `400` sur entrée invalide, `409` sur conflit) : c'est ce qu'un test écrit « à froid » attend.
* **En cas de doute sur la cible, choisir le comportement que le métier rend évident** et l'écrire dans une ADR, pour pouvoir le défendre à l'oral.

## 5. Ce qui doit changer dans les règles du dépôt

Ces fichiers sont gardés par la team Tests (`.github/CODEOWNERS`). `AGENTS.md` et `docs/tests/criteres-fin-de-migration.md` ont été révisés le 2026-10-13 ; les autres lignes restent à faire avant les PR de correction :

| Fichier | Ce qui ne tient plus |
|---|---|
| `AGENTS.md` règle 5 | « Ne corrige pas `MET-01` à `MET-09` » : ils sont désormais dans le périmètre (sauf arbitrage contraire) |
| `docs/tests/criteres-fin-de-migration.md` §2.1 « Incohérences conservées » | `401` / `403` et page « Accès réservé » en `200` deviennent des défauts à corriger |
| `docs/tests/criteres-fin-de-migration.md` §2.3 | Les défauts métier ne sont plus « non touchés » |
| `tests/defects/registry.ts` | Ajouter les nouveaux défauts (par exemple `MET-02`, `AUTHZ-01`) avec `fixed: false`, pour garder le cycle rouge → vert et le tableau de la soutenance |
| `tests/api/authz-matrix.ts` | Cellules `B-01`, `B-02` à passer en `{ status, defect }` |
| `docs/api/openapi.yaml` | Nouvelle route de rôle, champ nom de l'auteur, éventuels nouveaux codes |

Le mécanisme existant (`expectDefect` + `fixed: false`) convient tel quel : chaque comportement étrange devient un défaut rouge sur la baseline, vert après correction. Le tableau rouge → vert de la soutenance passe de 17 à environ 35 lignes, ce qui renforce le récit.
