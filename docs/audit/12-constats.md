# 12 — Constats

État au 2026-10-13 : **phases 1 et 2 terminées**. Phase 1 = lecture statique
(+ `npm audit`, `tsc`, `eslint`). Phase 2 = vérification par exécution contre
l'instance de dev locale : **10 constats confirmés par PoC** (`poc/`, détail
dans [`poc/README.md`](poc/README.md)), dont les
3 Critiques/Hautes de sécurité majeures (V-07, V-08, V-06) et la RLS contournée
(V-05.1). Les autres fiches restent vérifiées par lecture. Méthode, échelles et
modèle de fiche : [11-methode.md](11-methode.md).

## Statut au 2026-10-29

Après la refonte (étapes 0 à 8) et les décisions D1 à D20 : colonne « Statut »
de l'index et ligne « Statut » de chaque fiche, avec la preuve (défaut du
registre `tests/defects/registry.ts`, décision, PoC). Un constat clos reste dans
le document : les identifiants ne bougent pas.

| Gravité | Clos | Partiel | Ouvert | Accepté | Hors périmètre |
|---|---|---|---|---|---|
| Critique (3) | 3 | | | | |
| Haute (12) | 10 | | 1 (V-18) | | 1 (V-17) |
| Moyenne (28) | 18 | 1 (V-26) | 6 | 2 | 1 |
| Faible (20) | 10 | | 8 | 2 | |
| **Total (63)** | **41** | **1** | **15** | **4** | **2** |

Les constats ouverts sont surtout de l'exploitation et de la sécurité de second
rang : limite de débit (V-18), journalisation (V-27), délais (V-29), `next-auth`
en bêta (V-33), en-têtes HTTP (V-25), politique de mot de passe et de session
(V-21 à V-23). « Accepté » = comportement gardé volontairement, avec sa raison
dans la fiche.

## En chiffres

63 fiches : **3 Critiques, 12 Hautes, 28 Moyennes, 20 Faibles** · 47 points
d'hygiène · 20 nouveaux constats (`V-17` à `V-36`, `M-08`, `M-09`, `V-04.2`).

| Thème | Critique | Haute | Moyenne | Faible |
|---|---|---|---|---|
| T1 Authentification et secrets | | 3 | 3 | 3 |
| T2 Autorisation et isolation | | 2 | 3 | 2 |
| T3 Injection et validation | 1 | | 1 | 3 |
| T4 Intégrité et concurrence | | | 3 | 1 |
| T5 Robustesse et exploitation | | 3 | 3 | 7 |
| T6 Maintenabilité et tests | | 1 | 7 | |
| T7 Dépendances, config, données perso. | | | 4 | 1 |
| T8 Circuit métier | 2 | 3 | 4 | 3 |

**À lire avec prudence.** Les deux Critiques métier (M-01.1, M-02) bloquent
le circuit pour une catégorie d'utilisateurs : la grille les classe Critique,
mais ce ne sont pas des failles. La synthèse présentera séparément le top
sécurité et le top métier. Un seul Critique de sécurité reste : V-07, à
confirmer par PoC.

## Décisions de consolidation

Traçabilité des écarts entre les fichiers de travail de phase 1 (non versionnés)
et ce document.

**Fusions**

| Résultat | Fusionne | Motif |
|---|---|---|
| V-03 | V-03 (T2) + V-02.1 (T6) | Même correction : un prédicat d'accès unique « qui voit et décide quelle note ». V-02.1 n'existe plus. Remonte en Haute (copies déjà divergentes, cause de V-06). |
| V-18 | force brute connexion (T1) + débit des routes coûteuses (T5) | Même mécanisme de correction (limiteur) |
| M-03 | M-03 (T8) + angle sécurité (T2) | Même correction (refuser les domaines publics) |
| V-25 | en-têtes HTTP (T3) + (T7) | Doublon |
| V-10.2 | (T2) + (T7) | Doublon ; version T2 retenue (Faible) : la clé seule ne donne rien si le stockage est privé ; le risque réel en local est V-34 |
| V-04.2 | cycles d'organigramme (T8) | Rattaché à V-04 (cartographie), thème T2 |

**Recotations**

| ID | Phase 1 | Retenu | Motif |
|---|---|---|---|
| V-17 | Critique | Haute | Vraisemblance Moyenne : prendre le rôle RH suppose d'anticiper l'arrivée d'une entreprise sur un domaine encore libre |
| V-03 | Moyenne | Haute | Voir fusion |

**Désaccords avec la cartographie retenus** : V-04.1 coté Moyenne (pas de
fuite des données de l'autre entreprise : c'est le RH fautif qui expose ses
propres salariés) ; V-08 : le jeton Auth.js est chiffré (JWE), pas signé, même
conséquence ; V-11 ne concerne que 7 routes ; V-13 relève surtout du déni de
service (V-13.1, V-13.2 en Haute) ; V-05.1 : la migration n'a pas de policy
`UPDATE` propriétaire, corriger V-05 seul casserait la création de note ;
M-06 typé `bug-metier` ; M-05 découpé (seule la traçabilité reste une fiche,
motif de rejet et notification passent en évolutions).

**Points à trancher en phase 2** : V-07 est-elle exploitable par message
d'erreur (via V-11) ou seulement à l'aveugle (V-28 fait échapper l'erreur au
`catch`) ? LocalStack vérifie-t-il les signatures (V-34, V-10.2) ? V-05 :
le rôle de connexion est-il réellement superuser ?

**Identifiants découpés** : V-02 → .2 à .4 (.1 fusionné dans V-03) · V-04 →
.1, .2 · V-05 → .1, .2 · V-10 → .1 à .4 (le 5e point, code mort, est en
hygiène) · V-12 → .1 à .3 · V-13 → .1 à .4 · V-14 → .1 à .3 · V-15 → .1, .2 ·
V-16 → .1, .2 · M-01 → .1, .2 · M-05 → .1.

## Index

Trié par gravité, puis thème.

| ID | Constat | Thème | Module | Gravité | Effort | Visible | Vérification | Statut (2026-10-29) |
|---|---|---|---|---|---|---|---|---|
| [V-07](#v-07) | Injection SQL par le paramètre de tri | T3 | notes | Critique | S | non | confirmé (PoC) | clos |
| [M-01.1](#m-01-1) | Notes des RH validées par personne | T8 | validation | Critique | M | oui | confirmé (lecture) | clos |
| [M-02](#m-02) | Rôle manager non attribuable depuis l'interface | T8 | organigramme | Critique | M | oui | confirmé (lecture) | clos |
| [V-08](#v-08) | Secret d'authentification codé en dur, variable d'environnement ignorée | T1 | auth | Haute | S | non | confirmé (PoC) | clos |
| [V-17](#v-17) | Email jamais vérifié à l'inscription | T1 | auth | Haute | L | oui | non vérifié | hors périmètre |
| [V-18](#v-18) | Connexion, inscription et OCR sans limite de débit | T1 | auth | Haute | M | oui | non vérifié | ouvert |
| [V-03](#v-03) | Règle d'accès « qui voit et décide quelle note » éclatée et divergente | T2 | validation | Haute | M | non | confirmé (lecture) | clos |
| [V-06](#v-06) | Reçu de n'importe quelle note accessible par tout manager | T2 | recus | Haute | S | non | confirmé (PoC) | clos |
| [V-11](#v-11) | Message et pile d'exception renvoyés au client | T5 | socle | Haute | S | oui | confirmé (PoC) | clos |
| [V-13.1](#v-13-1) | Worker OCR recréé à chaque requête, sans limite de concurrence ni délai | T5 | ocr | Haute | M | non | confirmé (PoC) | clos |
| [V-13.2](#v-13-2) | Corps de requête lu sans borne de taille | T5 | ocr | Haute | S | non | confirmé (PoC) | clos |
| [V-16.1](#v-16-1) | Aucun filet de tests de non-régression | T6 | socle | Haute | M | non | confirmé (lecture) | clos |
| [M-01.2](#m-01-2) | Notes d'un employé sans manager validées par personne | T8 | validation | Haute | S | oui | confirmé (lecture) | clos |
| [M-03](#m-03) | Entreprise fondée sur un domaine de messagerie public | T8 | auth | Haute | S | oui | confirmé (lecture) | clos |
| [M-06](#m-06) | Auteur d'une note présenté au manager par un id tronqué | T8 | validation | Haute | S | oui | confirmé (lecture) | clos |
| [V-12.3](#v-12-3) | Emails sensibles à la casse (comptes en double, connexion dépendante de la casse) | T1 | auth | Moyenne | M | oui | confirmé (lecture) | clos |
| [V-19](#v-19) | Rôle et existence de l'utilisateur figés dans le JWT (jusqu'à 30 jours) | T1 | auth | Moyenne | M | non | confirmé (lecture) | clos |
| [V-20](#v-20) | Énumération des comptes possible à l'inscription | T1 | auth | Moyenne | S | oui | confirmé (lecture) | accepté |
| [V-04.1](#v-04-1) | Manager d'une autre entreprise attribuable à un employé | T2 | organigramme | Moyenne | S | non | confirmé (lecture) | clos |
| [V-04.2](#v-04-2) | Deux managers peuvent se valider mutuellement (cycle d'organigramme) | T2 | organigramme | Moyenne | S | oui | non vérifié | clos |
| [V-05.1](#v-05-1) | RLS contournée : l'application se connecte avec un rôle à privilèges | T2 | donnees | Moyenne | M | non | confirmé (PoC) | clos |
| [V-10.4](#v-10-4) | Montant, date et description insuffisamment validés (500 possible) | T3 | notes | Moyenne | S | non | confirmé (lecture) | clos |
| [V-09](#v-09) | Décision concurrente non verrouillée (vérification puis écriture) | T4 | validation | Moyenne | S | non | confirmé (PoC) | clos |
| [V-12.1](#v-12-1) | Inscription non transactionnelle (entreprise sans RH possible) | T4 | auth | Moyenne | S | non | non vérifié | clos |
| [V-26](#v-26) | Contraintes d'intégrité manquantes au schéma | T4 | donnees | Moyenne | S | non | non vérifié | partiel |
| [V-27](#v-27) | Décisions et événements de sécurité non journalisés | T5 | validation | Moyenne | M | non | confirmé (lecture) | ouvert |
| [V-28](#v-28) | Erreurs contournant le gestionnaire de la route | T5 | socle | Moyenne | S | non | confirmé (lecture) | clos |
| [V-29](#v-29) | Aucun délai défini sur la base, le pool et S3 | T5 | donnees | Moyenne | S | non | non vérifié | ouvert |
| [V-00](#v-00) | Commentaires du code trompeurs sur la sécurité | T6 | socle | Moyenne | S | non | confirmé (lecture) | clos |
| [V-01](#v-01) | Couche domaine/ports/adapters/utils morte (jamais importée) | T6 | socle | Moyenne | S | non | confirmé (lecture) | clos |
| [V-02.2](#v-02-2) | Objets échangés (ligne SQL → DTO → client) dupliqués et non typés | T6 | socle | Moyenne | M | non | confirmé (lecture) | clos |
| [V-02.3](#v-02-3) | Utilitaires et appels API dupliqués côté client | T6 | socle | Moyenne | S | non | confirmé (lecture) | clos |
| [V-02.4](#v-02-4) | Contrôle de session et de rôle recopié dans chaque route | T6 | auth | Moyenne | S | non | confirmé (lecture) | clos |
| [V-16.2](#v-16-2) | Aucune intégration continue (lint, typecheck, build, tests) | T6 | socle | Moyenne | S | non | confirmé (lecture) | clos |
| [V-31](#v-31) | Logique métier et accès aux données mêlés aux route handlers | T6 | socle | Moyenne | L | non | confirmé (lecture) | clos |
| [V-32](#v-32) | Next.js exposé à des vulnérabilités connues | T7 | socle | Moyenne | S | non | partiel | clos |
| [V-34](#v-34) | Postgres et LocalStack exposés sur toutes les interfaces | T7 | socle | Moyenne | S | non | confirmé (PoC) | ouvert |
| [V-35](#v-35) | Aucune suppression ni durée de conservation des données personnelles | T7 | donnees | Moyenne | L | oui | confirmé (lecture) | hors périmètre |
| [V-36](#v-36) | Seed créant des comptes connus hors développement | T7 | donnees | Moyenne | S | non | confirmé (lecture) | ouvert |
| [M-04](#m-04) | Total « Mes notes » additionnant les notes rejetées | T8 | notes | Moyenne | S | oui | confirmé (lecture) | clos |
| [M-05.1](#m-05-1) | Auteur et date d'une décision non conservés | T8 | validation | Moyenne | M | oui | confirmé (lecture) | ouvert |
| [M-07](#m-07) | Employé sans manager présenté comme « racine » | T8 | organigramme | Moyenne | S | oui | confirmé (lecture) | accepté |
| [V-13.3](#v-13-3) | PDF accepté au formulaire mais ignoré par l'OCR | T8 | ocr | Moyenne | S | oui | confirmé (lecture) | ouvert |
| [V-21](#v-21) | Temps de réponse de la connexion révélant l'existence d'un compte | T1 | auth | Faible | S | non | confirmé (lecture) | ouvert |
| [V-22](#v-22) | Mots de passe courants acceptés | T1 | auth | Faible | S | oui | confirmé (lecture) | ouvert |
| [V-23](#v-23) | Session non bornée et non révoquée à la déconnexion | T1 | auth | Faible | S | oui | confirmé (lecture) | ouvert |
| [V-05.2](#v-05-2) | Policy RLS RH non filtrée par entreprise | T2 | donnees | Faible | S | non | confirmé (lecture) | clos |
| [V-10.2](#v-10-2) | Clés de reçu séquentielles et donc prévisibles | T2 | recus | Faible | S | non | confirmé (PoC) | clos |
| [V-10.3](#v-10-3) | Contenu du reçu non vérifié (seul le type annoncé est contrôlé) | T3 | recus | Faible | S | non | confirmé (lecture) | clos |
| [V-24](#v-24) | Format des identifiants reçus non validé | T3 | validation | Faible | S | non | confirmé (lecture) | clos |
| [V-25](#v-25) | En-têtes de sécurité HTTP absents | T3 | socle | Faible | S | non | confirmé (lecture) | ouvert |
| [V-10.1](#v-10-1) | Création de note non atomique (note ou reçu orphelins possibles) | T4 | notes | Faible | M | non | non vérifié | clos |
| [V-12.2](#v-12-2) | Conflit d'email à l'inscription remonté en erreur non gérée | T5 | auth | Faible | S | non | non vérifié | clos |
| [V-14.1](#v-14-1) | Onglet du reçu ouvert après l'appel réseau (bloqué par les anti-pop-up) | T5 | notes | Faible | S | non | confirmé (lecture) | ouvert |
| [V-14.2](#v-14-2) | Dates affichées avec un décalage de fuseau | T5 | notes | Faible | S | non | confirmé (lecture) | clos |
| [V-14.3](#v-14-3) | Erreurs réseau des appels `fetch` non gérées | T5 | notes | Faible | S | non | confirmé (lecture) | ouvert |
| [V-15.1](#v-15-1) | Codes HTTP d'erreur incohérents entre routes | T5 | socle | Faible | S | non | confirmé (lecture) | clos |
| [V-15.2](#v-15-2) | Messages d'erreur en anglais renvoyés à l'interface | T5 | validation | Faible | S | oui | confirmé (lecture) | accepté |
| [V-30](#v-30) | Erreurs du pool `pg` non gérées (arrêt possible du processus) | T5 | donnees | Faible | S | non | non vérifié | ouvert |
| [V-33](#v-33) | `next-auth` en version bêta, non épinglée | T7 | auth | Faible | S | non | confirmé (lecture) | ouvert |
| [M-08](#m-08) | Subordonnés d'un manager rétrogradé laissés sans valideur | T8 | organigramme | Faible | S | oui | non vérifié | clos |
| [M-09](#m-09) | Date de dépense dans le futur acceptée | T8 | notes | Faible | S | oui | confirmé (lecture) | clos |
| [V-13.4](#v-13-4) | Extraction OCR du montant et de la date fragile | T8 | ocr | Faible | M | oui | confirmé (lecture) | accepté |

## Fiches

## Thème T1 — Authentification et secrets

<a id="v-17"></a>

### V-17 — Email jamais vérifié à l'inscription · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **hors périmètre** — aucun envoi d’email dans la stack (14, D16) |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Élevé — n'importe qui prend l'identité d'une adresse qu'il ne contrôle pas et, si le domaine est encore libre, devient `hr_admin` de l'entreprise de ce domaine |
| Vraisemblance | Moyenne — anonyme et sans outil, mais la prise du rôle RH suppose d'anticiper l'arrivée d'une entreprise sur un domaine encore libre (cotée Élevée en phase 1, ramenée à la consolidation) |
| Gravité | Haute |
| Effort estimé | L (envoi d'email, jeton de vérification, état « non vérifié » en base) |
| Visible utilisateur | oui (étape de confirmation par email → décision équipe : à valider) |
| Vérification | non vérifié — absence de vérification confirmée (lecture) ; effet à démontrer |
| Origine | nouveau |

**Où** : `src/app/actions/auth.ts:23-34` (seule validation : forme de l'email), `src/app/actions/auth.ts:44-63` (rôle attribué selon le domaine déclaré), `src/app/actions/auth.ts:66-72` (compte créé puis connecté immédiatement).

**Constat** : l'appartenance à une entreprise et le rôle découlent du seul domaine de l'email saisi, jamais prouvé. Le premier inscrit d'un domaine devient `hr_admin` (l.53-55).

**Scénario** : un attaquant s'inscrit avec `rh@victime.fr` avant la vraie entreprise : il est RH de « victime », voit nom et email de chaque salarié qui s'inscrit ensuite (`/api/hr/users`) et contrôle l'organigramme. Les vrais RH n'ont aucun moyen de récupérer le rôle (pas d'interface, M-02). Si l'entreprise existe déjà, il s'inscrit sous `pdg@victime.fr` et apparaît comme tel dans l'annuaire RH. Il peut aussi bloquer l'inscription d'une personne en occupant son adresse (« Un compte existe déjà », l.38).

**Preuve** : PoC à écrire en phase 2 : `POST /signup` (server action) avec `rh@poc-v-17.test` → session `hr_admin` obtenue sans aucun email reçu ; puis inscription d'un 2e compte du domaine et `GET /api/hr/users` avec le cookie du 1er → le 2e est listé.

**Piste** : créer le compte en état « non vérifié » et n'attribuer entreprise et rôle qu'après clic sur un lien envoyé à l'adresse.

**Critère d'acceptation** : un compte dont l'email n'est pas confirmé ne peut ni se connecter ni être rattaché à une entreprise ; le rôle RH n'est pas attribué avant confirmation.

<a id="v-08"></a>

### V-08 — Secret d'authentification codé en dur, variable d'environnement ignorée · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-04 ; PoC V-08 réfuté (jeton forgé → 401) |
| Thème | T1 — Authentification et secrets |
| Module | auth (secondaires : socle pour `.env.example`, `Makefile`) |
| Référence | OWASP A04:2025 — Cryptographic Failures (clé en dur) |
| Type | technique |
| Impact | Élevé — avec la clé, on fabrique un cookie de session valide pour n'importe quel `id` et n'importe quel `role` |
| Vraisemblance | Moyenne — demande l'accès au code source ; passe à Élevée si le dépôt est public |
| Gravité | Haute (Critique si dépôt public) |
| Effort estimé | S |
| Visible utilisateur | non (toutes les sessions en cours sont invalidées une fois, au changement de clé) |
| Vérification | **confirmé (PoC)** — `poc/V-08-forged-session-token.sh` : jeton JWE forgé hors-ligne (`role: hr_admin`) accepté → `GET /api/hr/users` 200 ; mauvais secret → 403 |
| Origine | cartographie (V-08) |

**Où** : `src/lib/auth.ts:8`, `src/lib/auth.ts:11` ; `.env.example:6` (variable ignorée, valeur d'exemple non secrète) ; `Makefile:14-15`.

**Constat** : la constante l.8 est passée explicitement en `secret` (l.11), ce qui prime sur `AUTH_SECRET`. Précision par rapport à la cartographie : Auth.js v5 ne *signe* pas le jeton, il le **chiffre** (JWE) avec une clé dérivée du secret ; la conséquence est la même, le secret permet de produire un jeton accepté. La même clé est partagée par toutes les instances (un jeton de dev est valide en prod). En outre, la cible `make env` annonce générer `AUTH_SECRET` mais se contente de copier `.env.example` (`Makefile:14-15`).

**Scénario** : un lecteur du dépôt chiffre `{id: <uuid quelconque>, role: 'manager'}` avec `encode()` de `next-auth/jwt` et le pose en cookie `authjs.session-token` : il passe tous les tests de rôle manager, ce qui suffit pour V-06. Avec l'UUID d'un RH réel, il devient ce RH.

**Preuve** : PoC à écrire en phase 2 : script `.mjs` qui appelle `encode({ token: { id, role: 'hr_admin' }, secret: '<l.8>', salt: 'authjs.session-token' })`, puis `curl -b 'authjs.session-token=<jwe>' :3000/api/hr/users` → 200.

**Piste** : supprimer la constante, lire `process.env.AUTH_SECRET` et refuser de démarrer s'il est absent ou égal à la valeur d'exemple ; régénérer le secret.

**Critère d'acceptation** : un jeton chiffré avec l'ancienne constante est refusé (401) ; l'app ne démarre pas sans `AUTH_SECRET`.

<a id="v-18"></a>

### V-18 — Connexion, inscription et OCR sans limite de débit · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — limite de débit (429) à porter par une passerelle, non codée |
| Thème | T1 — Authentification et secrets |
| Module | auth (secondaires : socle, ocr) |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Élevé — prise de contrôle d'un compte (RH compris) par devinette du mot de passe |
| Vraisemblance | Moyenne — anonyme, mais il faut un email existant (énumérable, V-20) et un mot de passe faible ; bcrypt coût 12 ralentit sans bloquer |
| Gravité | Haute |
| Effort estimé | M |
| Visible utilisateur | oui (message « trop de tentatives ») |
| Vérification | non vérifié — absence de limitation confirmée (lecture) |
| Origine | nouveau — fusion de deux constats de phase 1 (force brute en T1, débit des routes coûteuses en T5) : même mécanisme de correction |

**Où** : `src/lib/auth.ts:22-41` (aucun compteur), `src/app/actions/auth.ts:82-102`, `src/app/api/auth/[...nextauth]/route.ts:3` (endpoint `callback/credentials` exposé aussi).

**Constat** : aucune limite de débit, aucun verrouillage, aucun délai progressif, aucune journalisation des échecs. Deux points d'entrée : la server action `login` et `POST /api/auth/callback/credentials`. Chaque essai coûte un bcrypt côté serveur (vecteur de saturation CPU, voir T5).

**Scénario** : un script essaie une liste de mots de passe courants sur `hr@<domaine>` ; la politique (8 caractères, V-22) n'exclut pas `password1`.

**Preuve** : PoC à écrire en phase 2 : boucle de 50 `curl` sur `/api/auth/callback/credentials` (avec le `csrfToken` de `/api/auth/csrf`) avec un mauvais mot de passe pour `demo@expense.io` → jamais de 429 ni de verrouillage, puis le bon mot de passe passe.

**Piste** : limiter par compte et par IP (compteur en base ou en mémoire) avec délai progressif, et journaliser les échecs.

**Critère d'acceptation** : au-delà de N échecs sur un compte en une fenêtre donnée, la tentative suivante est refusée sans évaluer le mot de passe.

**Volet débit (fusionné)** : l'inscription est anonyme et scriptable ; chaque inscription coûte un bcrypt coût 12 et crée une entreprise (`src/app/actions/auth.ts:44-49`, `:65`) ; l'OCR (`src/app/api/expense-notes/receipt-suggestion/route.ts`) n'exige qu'un compte, obtenu par l'inscription. `src/proxy.ts:17` exclut `/api` et ne limite rien. Impact Moyen (saturation CPU, croissance non bornée de `users`/`companies`) × vraisemblance Élevée = Haute aussi. PoC phase 2 : 200 inscriptions en boucle, mesure de la latence d'une connexion concurrente et comptage de `companies`.

**Critère d'acceptation (volet débit)** : au-delà de N requêtes par minute et par IP, `signup`, `login` et l'OCR répondent 429.


<a id="v-12-3"></a>

### V-12.3 — Emails sensibles à la casse (comptes en double, connexion dépendante de la casse) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-05 (D20) : casse ignorée, index unique `lower(email)` |
| Thème | T1 — Authentification et secrets |
| Module | auth (secondaires : donnees pour la contrainte) |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Faible — comptes en double pour une même personne, connexion refusée si la casse diffère, homonymes dans l'annuaire RH |
| Vraisemblance | Élevée — se produit en usage normal (majuscule automatique sur mobile) |
| Gravité | Moyenne |
| Effort estimé | M (migration : index unique sur `lower(email)`, doublons existants à traiter) |
| Visible utilisateur | oui (la connexion devient insensible à la casse) |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-12, 3e point) |

**Où** : `src/app/actions/auth.ts:36` et `:66-69` (email stocké tel quel ; seul le domaine est mis en minuscules l.41), `src/lib/auth.ts:33` (`WHERE email = $1`), `migrations/1700000000001_init-schema.sql:15` (`UNIQUE` sensible à la casse).

**Constat** : conforme à la cartographie. Effet de bord : `Alice@acme.fr` et `alice@acme.fr` tombent bien dans la même entreprise (domaine normalisé) mais sont deux comptes distincts.

**Piste** : normaliser (`trim` + minuscules) à l'inscription et à la connexion, contrainte unique sur `lower(email)`.

**Critère d'acceptation** : l'inscription de `ALICE@acme.fr` après `alice@acme.fr` est refusée ; la connexion avec l'une ou l'autre casse ouvre le même compte.

<a id="v-19"></a>

### V-19 — Rôle et existence de l'utilisateur figés dans le JWT (jusqu'à 30 jours) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROLE-03 : rôle et existence relus en base à chaque requête |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Élevé — un RH ou manager rétrogradé (ou supprimé) garde ses droits de rôle |
| Vraisemblance | Faible — les changements de rôle ne se font qu'en base, rarement |
| Gravité | Moyenne |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — le rôle n'est écrit dans le jeton qu'à la connexion |
| Origine | nouveau |

**Où** : `src/lib/auth.ts:45-50` (`if (user)` : seulement à la connexion), `src/lib/auth.ts:12` (pas de `maxAge`, défaut Auth.js 30 jours glissants), `src/lib/auth.ts:52-57`.

**Constat** : `role` et `id` sont figés dans le JWT ; aucune route ne relit `users.role`. Les tests de rôle (`session.user.role !== …`, p. ex. `src/app/api/hr/users/route.ts:8`) portent donc sur un état qui peut avoir 30 jours.

**Scénario** : un RH est rétrogradé en `employee` en base ; tant qu'il ne se déconnecte pas, il continue à lister l'annuaire et à modifier l'organigramme (`/api/hr/users/**` ne vérifie que le rôle du jeton puis l'entreprise). Un manager rétrogradé garde l'accès à V-06.

**Preuve** : `src/lib/auth.ts:46` ; scénario à rejouer en phase 2 (`UPDATE users SET role='employee'` puis `GET /api/hr/users` avec l'ancien cookie → 200).

**Piste** : relire rôle et existence en base dans le callback `jwt` (ou dans un helper d'autorisation commun) à chaque requête, ou à intervalle court.

**Critère d'acceptation** : après changement de rôle en base, la requête suivante avec l'ancien cookie est traitée avec le nouveau rôle.

<a id="v-20"></a>

### V-20 — Énumération des comptes possible à l'inscription · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **accepté** — message « Un compte existe déjà avec cet email. » figé par E2E-01 ; la correction passe par l’invitation (V-17) |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Faible — révèle qu'une adresse a un compte (cible pour V-18) |
| Vraisemblance | Élevée — anonyme, un formulaire |
| Gravité | Moyenne |
| Effort estimé | S si fait avec V-17 (message neutre « un email vous a été envoyé ») ; sinon intrinsèque |
| Visible utilisateur | oui (message d'inscription) |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `src/app/actions/auth.ts:36-39`.

**Constat** : « Un compte existe déjà avec cet email. » renvoyé avant toute autre étape.

**Scénario** : un attaquant teste une liste d'adresses `@acme.fr` et obtient celles qui ont un compte, puis cible le brute force.

**Preuve** : `src/app/actions/auth.ts:38`.

**Piste** : répondre de façon identique dans les deux cas et prévenir par email le titulaire existant (dépend de V-17).

**Critère d'acceptation** : la réponse HTTP à l'inscription est identique pour une adresse libre et une adresse déjà prise.

<a id="v-21"></a>

### V-21 — Temps de réponse de la connexion révélant l'existence d'un compte · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — pas de hachage factice pour un email inconnu |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Faible — énumération des comptes par mesure de temps |
| Vraisemblance | Moyenne — demande des mesures répétées |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `src/lib/auth.ts:35` (retour immédiat si l'email est inconnu, sans bcrypt) vs `src/lib/auth.ts:37` (bcrypt coût 12, ~200 ms).

**Piste** : comparer à un hash factice quand l'utilisateur n'existe pas.

**Critère d'acceptation** : écart de temps médian non significatif entre email inconnu et mot de passe faux.

<a id="v-22"></a>

### V-22 — Mots de passe courants acceptés · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — seule une longueur de 8 caractères est exigée |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Moyen — facilite V-18 |
| Vraisemblance | Faible — n'aggrave que si le brute force n'est pas limité |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | oui (message à l'inscription) |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `src/app/actions/auth.ts:12`, `:29` (seule règle : 8 caractères ; `12345678` accepté). bcryptjs ignore silencieusement au-delà de 72 octets (`:65`) : pas de longueur maximale annoncée.

**Piste** : liste de mots de passe courants/compromis, longueur max explicite (≥ 64).

**Critère d'acceptation** : `password1` est refusé à l'inscription.

<a id="v-23"></a>

### V-23 — Session non bornée et non révoquée à la déconnexion · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — session JWT de 30 jours ; atténué : rôle et existence relus en base (ROLE-03) |
| Thème | T1 — Authentification et secrets |
| Module | auth |
| Référence | OWASP A07:2025 — Authentication Failures |
| Type | technique |
| Impact | Moyen — un cookie volé reste valide jusqu'à 30 jours, même après « Se déconnecter » |
| Vraisemblance | Faible — suppose le vol du cookie (`httpOnly` par défaut) |
| Gravité | Faible |
| Effort estimé | S (durée) / M (révocation, liée à V-19) |
| Visible utilisateur | oui si la durée est raccourcie (reconnexion plus fréquente) |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `src/lib/auth.ts:12` (`session: { strategy: 'jwt' }`, pas de `maxAge`), `src/app/actions/auth.ts:104-106` (`signOut` efface le cookie côté navigateur seulement ; un JWT n'a pas d'état serveur).

**Piste** : `maxAge` court adapté à une appli de gestion + numéro de version de session en base, vérifié avec V-19.

**Critère d'acceptation** : un cookie copié avant la déconnexion est refusé après.

## Thème T2 — Autorisation et isolation entre entreprises

<a id="v-06"></a>

### V-06 — Reçu de n'importe quelle note accessible par tout manager · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-02 ; PoC V-06 réfuté (reçu hors périmètre → 404) |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | recus (secondaires : validation) |
| Référence | OWASP A01:2025 — Broken Access Control |
| Type | technique |
| Impact | Élevé — justificatif (données personnelles, lieux, montants) d'une note de n'importe quel utilisateur de n'importe quelle entreprise |
| Vraisemblance | Moyenne — rôle manager + UUID de la note ; un ancien manager connaît les UUID des notes de ses ex-subordonnés (vus dans sa liste) |
| Gravité | Haute |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | **confirmé (PoC)** — `poc/V-06-manager-receipt-cross-tenant.sh` : note d'une autre entreprise → `approve` 404 mais `receipt-url` 200 + URL, fichier récupéré |
| Origine | cartographie (V-06) |

**Où** : `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:17` (pool brut, `WHERE id = $1` seul) ; commentaire trompeur l.14-16 (V-00).

**Constat** : conforme à la cartographie. Seul le rôle du jeton est testé (l.9). Aggravé par V-05.1 (sans RLS effective, rien ne rattrape) et par V-08 (rôle manager forgeable).

**Scénario** : un manager réaffecté ailleurs par les RH garde les UUID des notes de son ancienne équipe et continue d'ouvrir leurs reçus ; un manager d'une entreprise B qui obtient un UUID de A (capture, log, lien partagé) ouvre le reçu.

**Preuve** : PoC à écrire en phase 2 : créer un employé `@poc-v-06.test` et une note, puis `curl -b <cookie manager@expense.io> :3000/api/manager/expense-notes/<id>/receipt-url` → 200 avec URL ; `curl` de l'URL → le fichier.

**Piste** : même requête que `approve` (jointure `users` + `u.manager_id = moi`), via `withUserScope`.

**Critère d'acceptation** : un manager obtient 404 pour une note dont l'auteur n'est pas son subordonné direct, et 200 pour celle d'un subordonné.

<a id="v-03"></a>

### V-03 — Règle d'accès « qui voit et décide quelle note » éclatée et divergente · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — `ApprovalPolicy` unique (module approval) ; SEC-02 |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | validation (secondaires : recus, notes, organigramme) |
| Référence | OWASP A01:2025 — Broken Access Control |
| Type | technique |
| Impact | Élevé — la règle est recopiée ~9 fois (routes + policies RLS) et les copies ont déjà divergé (V-06, V-05.2) ; tout changement du circuit (M-01, M-02, V-04, V-09, M-05.1) doit y être reporté à l'identique |
| Vraisemblance | Moyenne — se reproduit à chaque nouvelle route |
| Gravité | Haute |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-03), fusionné avec V-03 (phase 1, T6) : même correction |

**Où** : 14 handlers sous `src/app/api/` ; tests de rôle recopiés (p. ex. `src/app/api/manager/expense-notes/[id]/approve/route.ts:8`, `src/app/api/hr/expense-notes/[id]/approve/route.ts:8`) ; clause « manager racine de mon entreprise » recopiée 4 fois (`src/app/api/hr/expense-notes/route.ts:29-30`, `[id]/approve/route.ts:17-18`, `[id]/reject/route.ts:17-18`, `[id]/receipt-url/route.ts:18-19`) ; choix pool brut / `withUserScope` sans règle (`06-autorisation.md`).

**Constat** : conforme à la cartographie, qui le classait `lecture` ; c'est en fait la cause de V-06, d'où la cotation sécurité.

**Piste** : un helper par périmètre (« notes que je peux décider », « notes dont je peux voir le reçu ») utilisé par toutes les routes du périmètre.

**Critère d'acceptation** : les 3 routes `receipt-url` et les 4 routes de décision s'appuient sur le même prédicat d'accès, couvert par un test par rôle.

**Apport de V-03 (fusionné)** — vue maintenabilité :

**Où** : prédicat « valideur » écrit 9 fois : `api/manager/expense-notes/route.ts:27-30`, `…/[id]/approve/route.ts:14-19`, `…/[id]/reject/route.ts:14-19`, `api/hr/expense-notes/route.ts:27-31`, `…/[id]/approve/route.ts:14-19`, `…/[id]/reject/route.ts:14-19`, `…/[id]/receipt-url/route.ts:15-20`, policies `migrations/…:50-100` (×4). Transition « pending → décidé » écrite 4 fois : `{manager,hr}/…/{approve,reject}/route.ts:20-42`.

**Constat** : les copies ont déjà divergé : la RLS RH ne filtre pas l'entreprise (`migrations/…:70-84`) alors que les routes RH le font ; `manager/…/receipt-url` n'applique pas le prédicat du tout (l.17). Les 4 routes de décision ne diffèrent que du statut et du prédicat.

**Scénario** : le lot M-01.2 ajoute « employé sans manager → RH » dans la liste RH mais oublie `hr/…/reject` : la note s'affiche, le bouton Rejeter renvoie 404.

**Preuve** : PoC à écrire en phase 2 : pas de PoC d'exploitation pertinent ; la preuve sera le test de caractérisation (V-16.1) qui fige les 6 combinaisons rôle × action avant factorisation.

**Piste** : une fonction unique `canDecide(actor, note)` (ou vue SQL) + un `decide(noteId, actor, status)` appelés par 2 routes paramétrées.

**Critère d'acceptation** : un seul emplacement définit le valideur ; tests table « rôle × position dans l'organigramme × action » passent identiques avant/après.


<a id="v-04-1"></a>

### V-04.1 — Manager d'une autre entreprise attribuable à un employé · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-03 |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | organigramme |
| Référence | OWASP A01:2025 — Broken Access Control |
| Type | technique |
| Impact | Moyen — fait apparaître des notes d'une entreprise A dans la file d'un manager de B, qui peut les décider ; ne lit pas de données de B |
| Vraisemblance | Moyenne — rôle RH (facile : inscription sur un domaine neuf) + UUID d'un manager de B |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — `SELECT … WHERE id = $1 AND role = 'manager'` sans `company_id` |
| Origine | cartographie (V-04, 1er point) |

**Où** : `src/app/api/hr/users/[id]/manager/route.ts:39-42` (filtre rôle seul), `:48-51` (`UPDATE` non filtré par entreprise), `src/app/api/manager/expense-notes/route.ts:26-31` (aucun filtre entreprise côté manager).

**Constat** : conforme à la cartographie. **Désaccord sur la portée** : la cartographie suggère une fuite ; en réalité le flux va de A vers B (le RH de A expose les notes de *ses* salariés). L'atteinte pour B est l'intégrité (file polluée, décisions sur des notes étrangères). Effet annexe : la réponse 200 / 409 « Invalid manager » est un oracle sur le rôle d'un UUID de n'importe quelle entreprise.

**Scénario** : un RH de A rattache un salarié complice à un manager complice de B, qui approuve les notes sans que la hiérarchie de A les voie.

**Preuve** : `src/app/api/hr/users/[id]/manager/route.ts:40-41` vs `:24-25` (la cible, elle, est filtrée par entreprise).

**Piste** : ajouter `AND company_id = $companyId` à la requête du manager choisi.

**Critère d'acceptation** : `PUT` avec l'id d'un manager d'une autre entreprise → 409 (ou 404), aucune ligne modifiée.

<a id="v-04-2"></a>

### V-04.2 — Deux managers peuvent se valider mutuellement (cycle d'organigramme) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-04 (D18) |
| Thème | T2 — Autorisation et isolation entre entreprises (aspect métier : T8) |
| Module | organigramme (secondaires : donnees) |
| Référence | — |
| Type | bug-metier |
| Impact | Moyen — A et B s'approuvent l'un l'autre ; il n'y a plus de racine, les RH perdent la main sur leurs notes |
| Vraisemblance | Moyenne — faisable depuis l'écran RH (erreur ou complaisance), rôle RH requis |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | non vérifié |
| Origine | nouveau — **recoupe V-04 (volet cycles, T2)** : à fusionner à la consolidation si T2 découpe V-04 |

**Où** : `AdminConsole.tsx:175-176` (n'exclut que soi-même du menu) ; `api/hr/users/[id]/manager/route.ts:32` (seul `managerId === id` est refusé) ; aucune contrainte en base (`migrations/…:18`).

**Constat** : A→B puis B→A est accepté ; l'auto-validation directe est refusée par l'API mais pas par la base.

**Scénario** : la RH met A sous B puis B sous A ; chacun approuve les notes de l'autre, aucune n'arrive chez les RH.

**Preuve** : lignes citées.

**Piste** : refuser tout rattachement dont le manager choisi est un descendant de la cible (CTE récursive dans la transaction, ou trigger).

**Critère d'acceptation** : `PUT …/manager` qui fermerait un cycle (longueur 2 ou plus) renvoie une erreur ; l'organigramme reste un arbre.

- **Comportement actuel → proposé** : cycles acceptés → refus avec message explicite.
- **Justification** : bug évident (un organigramme est un arbre ; 01-produit parle de manager « racine »).
- **Ce que l'utilisateur verra** : message d'erreur RH lors d'un rattachement circulaire.
- **Décision équipe** : à valider

<a id="v-05-1"></a>

### V-05.1 — RLS contournée : l'application se connecte avec un rôle à privilèges · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-09 : RLS effective par `APP_DB_ROLE` (ADR-006) ; PoC V-05 réfuté |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | donnees (secondaires : notes, recus, socle) |
| Référence | OWASP A01:2025 — Broken Access Control (A02 pour la configuration) |
| Type | technique |
| Impact | Moyen — la couche présentée comme garantie d'isolation (`src/lib/db.ts:22-27`) est absente : tout `WHERE` oublié devient une fuite (V-06) ; V-07 lit toute la base |
| Vraisemblance | Moyenne — n'a d'effet que combinée à un autre défaut, mais ceux-ci existent |
| Gravité | Moyenne |
| Effort estimé | M (rôle applicatif, policy UPDATE propriétaire, déplacer les requêtes en pool brut) |
| Visible utilisateur | non |
| Vérification | **confirmé (PoC)** — `poc/V-05-role-postgres-bypass-rls.sh` : rôle `expense` = `rolsuper=t, rolbypassrls=t` ; sous un `app.current_user_id` étranger, `SELECT` voit les 6 notes (RLS ignorée) |
| Origine | cartographie (V-05) |

**Où** : `docker-compose.yml:6-7` (`POSTGRES_USER` → superuser), `.env.example:2`, `migrations/1700000000001_init-schema.sql:39-40` ; dépendants : `src/app/api/expense-notes/route.ts:103-106` (UPDATE en pool brut, sans policy UPDATE propriétaire), `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:17`, routes `/api/hr/users/**` (tables `users` et `companies` sans RLS du tout).

**Constat** : conforme à la cartographie ; raisonnement `06-autorisation.md` vérifié dans le code. Correctif à coordonner : passer en rôle non superuser **casse** `POST /api/expense-notes` tant que l'UPDATE l.103-106 n'est pas déplacé.

**Piste** : rôle applicatif sans `SUPERUSER`/`BYPASSRLS`, migrations sous un rôle propriétaire distinct.

**Critère d'acceptation** : `current_user` de l'app n'est ni superuser ni `bypassrls` ; une requête sans `app.current_user_id` sur `expense_notes` renvoie 0 ligne.

<a id="v-05-2"></a>

### V-05.2 — Policy RLS RH non filtrée par entreprise · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — policies RH filtrées par entreprise (migration d’isolation, ADR-006) |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | donnees |
| Référence | OWASP A01:2025 — Broken Access Control |
| Type | technique |
| Impact | Moyen — sous RLS effective, un RH verrait/modifierait les notes des managers racine de toutes les entreprises |
| Vraisemblance | Faible — sans effet aujourd'hui (RLS contournée, et les routes RH filtrent par entreprise) ; devient latent dès V-05.1 corrigé |
| Gravité | Faible |
| Effort estimé | S (migration) |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-05, dernier point) |

**Où** : `migrations/1700000000001_init-schema.sql:70-84` et `:86-100` (aucune comparaison `company_id`).

**Piste** : ajouter `u.company_id = hr.company_id` aux deux policies, dans le même lot que V-05.1.

**Critère d'acceptation** : sous le rôle applicatif, un RH de B n'obtient aucune note d'un manager racine de A, même sans `WHERE` applicatif.

<a id="v-10-2"></a>

### V-10.2 — Clés de reçu séquentielles et donc prévisibles · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-06 : clé UUID ; PoC V-34 (partie V-10.2) réfuté |
| Thème | T2 — Autorisation et isolation entre entreprises |
| Module | recus |
| Référence | OWASP A01:2025 — Broken Access Control |
| Type | technique |
| Impact | Faible — en prod (S3 privé) la clé seule ne donne pas accès ; elle révèle le volume global de notes de toutes les entreprises |
| Vraisemblance | Moyenne — la clé est renvoyée à chaque utilisateur dans `receiptKey` |
| Gravité | Faible |
| Effort estimé | S (pas de migration : seules les nouvelles clés changent) |
| Visible utilisateur | non |
| Vérification | **confirmé (PoC)** — même script que V-34 : clés `receipts/1.png`, `2.png`… (serial global) renvoyées dans `receiptKey`, énumérables combinées à V-34 |
| Origine | cartographie (V-10, 2e point) |

**Où** : `src/lib/storage.ts:25-27`, `migrations/1700000000001_init-schema.sql:26` (`serial` global), exposition : `src/app/api/expense-notes/route.ts:25`, `src/app/api/manager/expense-notes/route.ts:12`, `src/app/api/hr/expense-notes/route.ts:12`.

**Constat** : en dev, l'atténuation « accès par URL pré-signée » ne tient pas (LocalStack exposé sans contrôle de signature, voir T7) : la séquence permet alors d'aspirer tous les reçus.

**Piste** : clé aléatoire (UUID) et ne plus renvoyer `receiptKey` au client.

**Critère d'acceptation** : deux notes consécutives ont des clés sans relation ; aucune réponse API ne contient `receiptKey`.

## Thème T3 — Injection et validation des entrées

<a id="v-07"></a>

### V-07 — Injection SQL par le paramètre de tri · Critique

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-01 : tri par liste blanche ; PoC V-07 réfuté |
| Thème | T3 — Injection et validation des entrées |
| Module | notes |
| Référence | OWASP A05:2025 — Injection |
| Type | technique |
| Impact | Élevé — lecture de toute la base (hashs de mots de passe, notes et utilisateurs de toutes les entreprises) : la connexion est superuser (V-05.1), la RLS ne joue pas |
| Vraisemblance | Élevée — tout utilisateur connecté (inscription libre), un `curl` |
| Gravité | Critique |
| Effort estimé | S |
| Visible utilisateur | non (l'interface n'envoie jamais `sort`, `src/app/expenses/page.tsx:58`) |
| Vérification | **confirmé (PoC)** — `poc/V-07-sort-sql-injection.sh` : `pg_sleep(2)` → 2,03 s vs 0,03 s ; oracle booléen ; sous-requête lisant toute la table `expense_notes` |
| Origine | cartographie (V-07) |

**Où** : `src/app/api/expense-notes/route.ts:42` (lecture brute de `?sort=`), `:46` (`ORDER BY ${sort}`) ; commentaire trompeur l.39-41 (V-00).

**Constat** : conforme à la cartographie, gravité précisée. Le protocole étendu de `pg` (requête avec paramètres) interdit les requêtes empilées, mais une sous-requête dans `ORDER BY` suffit : extraction booléenne ou temporelle (`pg_sleep`) et surtout **par message d'erreur**, renvoyé tel quel au client par `respondError` (`src/lib/errors.ts:3-5`, V-11). En superuser, les fonctions d'administration (`pg_read_file`…) sont probablement accessibles aussi.

**Scénario** : un employé authentifié exfiltre **à l'aveugle** le contenu de la base. L'oracle est temporel ou booléen : `?sort=(SELECT CASE WHEN (SELECT substr(password_hash,1,1) FROM users LIMIT 1)='$' THEN pg_sleep(2) ELSE 0 END)` répond lentement si la condition est vraie. En itérant caractère par caractère, il reconstitue emails, hashs et notes de toutes les entreprises (la sous-requête n'est pas limitée au périmètre de l'employé, cf. V-05.1). Exfiltration complète mais bit par bit.

**Preuve** : `poc/V-07-sort-sql-injection.sh`. `?sort=(SELECT 1 FROM pg_sleep(2))` → 2,03 s vs 0,03 s ; oracle booléen avec `pg_sleep(CASE WHEN … THEN 2 ELSE 0 END)` ; une sous-requête `count(*) FROM expense_notes` voit les 6 notes de la base alors que l'employé n'en possède que 2. **Correction de la cartographie** : l'exfiltration est *à l'aveugle*, **pas** par message d'erreur — `GET /api/expense-notes` fait `return withUserScope(...)` sans `await` (V-28), l'exception ne passe donc pas par `respondError` (V-11) et le corps de la 500 est vide.

**Piste** : table de correspondance `{clé autorisée → fragment SQL fixe}`, valeur par défaut sinon (ou supprimer le paramètre, inutilisé).

**Critère d'acceptation** : toute valeur de `sort` hors liste blanche donne le tri par défaut (ou 400), jamais une 500 ; la sous-requête ci-dessus n'a aucun effet.

<a id="v-10-4"></a>

### V-10.4 — Montant, date et description insuffisamment validés (500 possible) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROB-03b, c, d, f ; MET-06 (date future, D20) |
| Thème | T3 — Injection et validation des entrées |
| Module | notes |
| Référence | OWASP A06:2025 — Insecure Design (validation d'entrée) |
| Type | technique |
| Impact | Faible — 500 avec trace (V-11) ou valeurs absurdes stockées sur sa propre note, que le valideur reçoit ensuite |
| Vraisemblance | Élevée — tout utilisateur connecté, `curl` (le formulaire contraint, pas l'API) |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non (sauf messages d'erreur 400 au lieu de 500) |
| Vérification | confirmé (lecture) pour la logique ; effets en base à constater en phase 2 |
| Origine | cartographie (V-10, 4e point), complété |

**Où** : `src/app/api/expense-notes/route.ts:69-80`, colonnes `migrations/1700000000001_init-schema.sql:28-30`.

**Constat** :
- Montant : `Number.parseFloat` accepte `"12abc"` (→ 12) et `"1e8"` (→ dépassement `numeric(10,2)`, 500) ; `"0.004"` passe `amount > 0` mais est arrondi à **0,00** en base : note à zéro euro.
- Date : seul `typeof === 'string'` (l.74). Postgres accepte `infinity`, `epoch`, `today`, dates av. J.-C. ; `2024-02-30` → 500.
- Description : non vide, aucune longueur maximale ; le corps de requête n'est pas borné en route handler (voir T5).

**Scénario** : un employé soumet par `curl` une note `amount=0.004&expenseDate=infinity&description=<1 Mo>` ; le manager reçoit une note « 0,00 € », « Invalid Date » et un pavé illisible dans son panneau.

**Preuve** : `src/app/api/expense-notes/route.ts:69`, `:72-76` ; `migrations/…:28` (`numeric(10, 2)`).

**Piste** : schéma de validation serveur : montant décimal `^\d{1,8}(\.\d{1,2})?$` > 0, date `YYYY-MM-DD` réelle et bornée, description ≤ N caractères.

**Critère d'acceptation** : chacune des entrées ci-dessus renvoie 400 avec message, aucune ligne insérée.

<a id="v-10-3"></a>

### V-10.3 — Contenu du reçu non vérifié (seul le type annoncé est contrôlé) · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-07 : signature du fichier |
| Thème | T3 — Injection et validation des entrées |
| Module | recus (secondaires : notes) |
| Référence | OWASP A06:2025 — Insecure Design (upload) |
| Type | technique |
| Impact | Faible — n'importe quel contenu est stocké et servi au valideur, mais toujours sous l'un des 4 types autorisés et depuis l'origine S3, pas celle de l'app |
| Vraisemblance | Moyenne — `curl` avec un `Content-Type` de partie forgé ; l'effet utile pour un attaquant reste limité |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-10, 3e point) |

**Où** : `src/app/api/expense-notes/route.ts:81` (test sur `receipt.type`, déclaré par le client), `:101` → `src/lib/storage.ts:31` (`ContentType` = valeur déclarée) ; idem OCR `src/app/api/expense-notes/receipt-suggestion/route.ts:19`.

**Constat** : conforme à la cartographie. **Nuance** : la cartographie le range en `risque` ; l'exploitation est faible car le type servi reste dans la liste blanche, et une vérification des octets magiques n'arrêterait pas un PDF piégé valide. Sert surtout à garantir que le reçu est lisible.

**Piste** : contrôler les octets magiques et dériver `ContentType`/extension du contenu réel ; servir avec `Content-Disposition` adapté (H-T2-02).

**Critère d'acceptation** : un fichier HTML envoyé avec `type=image/png` est refusé en 400.

<a id="v-24"></a>

### V-24 — Format des identifiants reçus non validé · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROB-03a : identifiant validé, 404 |
| Thème | T3 — Injection et validation des entrées |
| Module | validation (secondaires : organigramme, recus) |
| Référence | OWASP A10:2025 — Mishandling of Exceptional Conditions |
| Type | technique |
| Impact | Faible — 500 au lieu de 400/404 ; ne fuit que via V-11 |
| Vraisemblance | Moyenne — jamais en usage normal (l'UI n'envoie que des UUID) |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : les 8 routes `[id]` (`const { id } = await params` sans contrôle, p. ex. `src/app/api/manager/expense-notes/[id]/approve/route.ts:11`) ; corps du PUT `src/app/api/hr/users/[id]/manager/route.ts:12-13` (`managerId` typé par simple cast : un nombre, un objet ou `""` partent dans la requête SQL `:40-41`).

**Constat** : un `id` non UUID provoque une erreur Postgres `22P02` → 500 avec message et pile.

**Piste** : contrôler le format UUID (chemin et corps) et le type de `managerId` avant toute requête.

**Critère d'acceptation** : `GET /api/expense-notes/abc/receipt-url` → 404 (ou 400), `PUT … {"managerId": 42}` → 400.

<a id="v-25"></a>

### V-25 — En-têtes de sécurité HTTP absents · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — aucun en-tête de sécurité HTTP |
| Thème | T3 — Injection et validation des entrées |
| Module | socle |
| Référence | OWASP A02:2025 — Security Misconfiguration |
| Type | technique |
| Impact | Faible — défense en profondeur : pas de CSP contre une future XSS, pages d'approbation encadrables (clickjacking), pas de HSTS |
| Vraisemblance | Moyenne — demande un autre défaut (XSS) ou d'amener un valideur sur une page piégée |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau — relevé indépendamment en T3 et T7, fusionné |

**Où** : `next.config.ts:3-6` (pas de `headers()`, `poweredByHeader` laissé par défaut → `X-Powered-By: Next.js`), `src/proxy.ts:6-13` (n'ajoute aucun en-tête).

**Piste** : `headers()` dans `next.config.ts` : CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS en prod ; `poweredByHeader: false`.

**Critère d'acceptation** : les réponses de `/` et `/api/*` portent ces en-têtes ; `X-Powered-By` absent.

## Thème T4 — Intégrité des données et concurrence

<a id="v-09"></a>

### V-09 — Décision concurrente non verrouillée (vérification puis écriture) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROB-02 ; PoC V-09 réfuté (une seule décision par round, 10 / 10) |
| Thème | T4 — Intégrité des données et concurrence |
| Module | validation |
| Référence | OWASP A06 :2025 — Insecure Design (TOCTOU) |
| Type | technique |
| Impact | Moyen — décisions contradictoires sur une même note, dernière écriture gagnante, état final différent de ce qu'a vu l'un des décideurs ; récupérable à la main |
| Vraisemblance | Moyenne — demande un timing (deux onglets, double clic sur deux boutons, deux décideurs) ; aucun gain pour un attaquant |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non (sauf 409 dans le cas concurrent, déjà prévu) |
| Vérification | **confirmé (PoC)** — `poc/V-09-concurrent-decisions.sh` : 3 approve + 3 reject simultanés → jusqu'à 6 réponses 200 (approve ET reject), statut final = dernière écriture |
| Origine | cartographie (V-09) |

**Où** : `src/app/api/manager/expense-notes/[id]/approve/route.ts:14-31`, `.../manager/expense-notes/[id]/reject/route.ts:14-31`, `src/app/api/hr/expense-notes/[id]/approve/route.ts:14-32`, `.../hr/expense-notes/[id]/reject/route.ts:14-32`, `src/lib/db.ts:35`.

**Constat** : confirmé par lecture, conforme à la cartographie. Le `SELECT` (sans `FOR UPDATE`) puis le test JS `row.status !== 'pending'` (l.24/25) sont suivis d'un `UPDATE ... WHERE id = $1` sans condition sur le statut. `withUserScope` ouvre la transaction en `READ COMMITTED` par défaut (`db.ts:35`, simple `BEGIN`) : la seconde transaction, bloquée par le verrou de ligne de la première, réévalue seulement `id = $1` après son COMMIT et écrit à son tour. L'`UPDATE` n'a pas non plus de filtre de rattachement (`manager_id`) : seul le `SELECT` préalable en a un.

**Scénario** : un manager clique « Approuver » dans l'onglet A et « Rejeter » dans l'onglet B. Les deux `SELECT` voient `pending`, les deux `UPDATE` passent, les deux réponses sont 200 ; la note finit `rejected` alors que l'onglet A affiche l'approbation.

**Preuve** : `chemin:ligne` ci-dessus ; à rejouer en phase 2 avec deux `curl` parallèles (`&`) sur approve/reject.

**Piste** : `UPDATE ... WHERE id = $1 AND status = 'pending' RETURNING *` et 409 si 0 ligne (ou `SELECT ... FOR UPDATE`).

**Critère d'acceptation** : N requêtes approve/reject simultanées sur une note `pending` → exactement une 200, les autres 409 ; le statut final est celui de la 200.

<a id="v-12-1"></a>

### V-12.1 — Inscription non transactionnelle (entreprise sans RH possible) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — entreprise et compte créés dans une transaction (module identity) |
| Thème | T4 — Intégrité des données et concurrence |
| Module | auth (secondaire : donnees) |
| Référence | — |
| Type | technique |
| Impact | Élevé (métier) — une entreprise sans `hr_admin` : personne ne peut rattacher ni valider les notes des managers racine, pour toute l'entreprise et tous ses inscrits futurs ; réparation seulement en SQL |
| Vraisemblance | Faible — demande deux inscriptions concurrentes sur le même email d'un domaine nouveau (le bouton est désactivé pendant l'envoi, `signup/page.tsx:63`) ou une panne entre deux requêtes |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture |
| Origine | cartographie (V-12, partie transaction) |

**Où** : `src/app/actions/auth.ts:36-69`.

**Constat** : 4 à 5 requêtes `getPool().query` indépendantes (l.36, 44, 57, 66). Le rôle `hr_admin` est attribué à la requête qui a inséré l'entreprise (l.53-55), mais rien ne garantit que son INSERT utilisateur (l.66-69) réussisse.

**Scénario** : deux requêtes `signup` simultanées pour `a@nouveau.fr` (deux onglets ou `curl`). R1 crée l'entreprise → `hr_admin` ; R2 tombe sur le conflit → `employee`. Les deux font `bcrypt.hash` (l.65) ; si R2 insère en premier, R1 échoue sur `UNIQUE(email)`. Résultat : l'entreprise `nouveau.fr` n'a qu'un employé et aucun RH, et toute inscription ultérieure sur ce domaine devient `employee` (l.56-63).

**Preuve** : lecture des lignes citées.

**Piste** : une transaction unique (entreprise + utilisateur), le rôle déduit dans la transaction.

**Critère d'acceptation** : deux inscriptions concurrentes sur le même email d'un nouveau domaine → une seule réussit, et l'entreprise créée a exactement un `hr_admin`.

<a id="v-26"></a>

### V-26 — Contraintes d'intégrité manquantes au schéma · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **partiel** — montants refusés par l’API (ROB-03f) ; contraintes `CHECK` en base non ajoutées |
| Thème | T4 — Intégrité des données et concurrence |
| Module | donnees (secondaire : notes) |
| Référence | — |
| Type | technique |
| Impact | Faible — note à 0,00 € ou arrondie à l'insu de l'utilisateur, note sans reçu ; défense en profondeur |
| Vraisemblance | Élevée — un `curl` avec `amount=0.001` suffit (le formulaire a `step="0.01"`, `expenses/page.tsx:180`) |
| Gravité | Moyenne (tirée par la grille ; enjeu réel faible) |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture |
| Origine | nouveau |

**Où** : `migrations/1700000000001_init-schema.sql:18,28,31`, `src/app/api/expense-notes/route.ts:69-73`.

**Constat** : `amount numeric(10,2)` sans `CHECK (amount > 0)` ; le contrôle `amount <= 0` est fait en JS sur le flottant **avant** arrondi par Postgres : `0.001` passe le test puis est stocké `0.00`, `12.345` devient `12.35` sans avertissement. `receipt_key text NOT NULL` accepte `''` (valeur utilisée comme provisoire, V-10.1). `users.manager_id` n'a pas de `CHECK (manager_id <> id)` (seul le code l'interdit, `hr/users/[id]/manager/route.ts:32`). La cohérence d'entreprise du manager (V-04) relève de T2.

**Scénario** : `curl -F amount=0.001 ...` → note `pending` de 0,00 € soumise à validation.

**Preuve** : lecture des lignes citées.

**Piste** : migration ajoutant `CHECK (amount > 0)`, `CHECK (receipt_key <> '')` (après V-10.1), `CHECK (manager_id IS NULL OR manager_id <> id)` ; refuser côté API plus de 2 décimales.

**Critère d'acceptation** : `amount=0.001` → 400 ; un INSERT SQL direct avec `amount = 0` ou `receipt_key = ''` est rejeté par la base.

<a id="v-10-1"></a>

### V-10.1 — Création de note non atomique (note ou reçu orphelins possibles) · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROB-01 : téléversement puis insertion, compensation |
| Thème | T4 — Intégrité des données et concurrence |
| Module | notes (secondaires : recus, donnees) |
| Référence | — |
| Type | technique |
| Impact | Moyen — note `pending` avec `receipt_key = ''` (validable sans justificatif, reçu introuvable) ou objet S3 orphelin ; récupérable à la main |
| Vraisemblance | Faible — demande une panne S3 ou Postgres entre deux étapes |
| Gravité | Faible |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture |
| Origine | cartographie (V-10, partie atomicité) |

**Où** : `src/app/api/expense-notes/route.ts:88-106`, `src/lib/storage.ts:29-33`, `migrations/1700000000001_init-schema.sql:31,42-48,60-68,86-100`.

**Constat** : l'INSERT est validé par `withUserScope` (COMMIT, `route.ts:88-96`) avant `uploadReceipt` (l.101) ; l'UPDATE de `receipt_key` (l.103-106) passe ensuite par le pool brut, hors transaction et sans `app.current_user_id`. Trois états intermédiaires sont persistants : note avec `receipt_key = ''` si l'upload échoue, objet S3 sans note si l'UPDATE échoue, et doublon si l'utilisateur resoumet après l'erreur (aucune clé d'idempotence). Les routes `receipt-url` appellent alors `getReceiptUrl('')` (`storage.ts:35-37`), dont le comportement exact (exception du SDK probable) est à constater.

**Point manqué par la cartographie, important pour l'ordonnancement des lots** : la migration ne définit **aucune policy `UPDATE` pour le propriétaire** (seulement manager l.60-68 et RH l.86-100). L'UPDATE l.103 ne fonctionne que parce que le rôle applicatif est superuser et ignore la RLS (V-05). Corriger V-05 seul ferait renvoyer 0 ligne à cet UPDATE, puis `toExpenseNote(undefined)` lèverait une exception (l.108) : **toute création de note échouerait en 500 et laisserait `receipt_key = ''`**. Même dépendance pour `scripts/seed.mjs:83-94` (pool brut sans contexte, INSERT soumis à la policy l.46-48).

**Scénario** : LocalStack indisponible au moment de la soumission → 500 renvoyée, note visible dans la liste du manager sans reçu ; l'employé resoumet → deux notes.

**Preuve** : lecture des lignes citées.

**Piste** : générer la clé avant l'INSERT, uploader d'abord, puis INSERT unique avec la clé (nettoyage de l'objet si l'INSERT échoue) ; à concevoir avec V-05.

**Critère d'acceptation** : upload en échec → aucune ligne créée ; INSERT en échec → aucun objet laissé ; création fonctionnelle avec un rôle applicatif non superuser.

## Thème T5 — Robustesse et exploitation

<a id="v-11"></a>

### V-11 — Message et pile d'exception renvoyés au client · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-05 ; PoC V-11 réfuté |
| Thème | T5 — Robustesse et exploitation |
| Module | socle (secondaires : notes, recus, organigramme, ocr) |
| Référence | OWASP A10 :2025 — Mishandling of Exceptional Conditions |
| Type | technique |
| Impact | Moyen — fuite d'informations techniques : chemins du serveur, messages SQL (noms de colonnes, valeurs saisies), structure du code |
| Vraisemblance | Élevée — tout utilisateur connecté, avec une date invalide ou un id non-UUID |
| Gravité | Haute |
| Effort estimé | S |
| Visible utilisateur | oui — les messages d'erreur SQL affichés aujourd'hui dans l'interface (`expenses/page.tsx:94-98`) seront remplacés par un message générique |
| Vérification | **confirmé (PoC)** — `poc/V-11-exception-leak.sh` : 500 avec `error` (message Postgres) et `stack` (chemins serveur) sur les 7 routes awaitées |
| Origine | cartographie (V-11) |

**Où** : `src/lib/errors.ts:1-6` ; atteint par les routes qui **attendent** leurs appels (`await`) : `src/app/api/expense-notes/route.ts:56-111` (POST), `src/app/api/expense-notes/[id]/receipt-url/route.ts:14-28`, `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:17-26`, `src/app/api/hr/expense-notes/[id]/receipt-url/route.ts:14-31`, `src/app/api/hr/users/route.ts:12-30`, `src/app/api/hr/users/[id]/manager/route.ts:15-62`, `src/app/api/expense-notes/receipt-suggestion/route.ts:12-22`.

**Constat** : `respondError` renvoie `{ error: message, stack }` en 500. **Correction de la cartographie** : « toute exception » est faux. Les 7 handlers qui font `return withUserScope(...)` sans `await` ne passent pas par ce `catch` (voir V-28) ; leurs exceptions remontent au framework, qui répond une 500 sans stack. Le constat reste entier pour les 7 routes ci-dessus.

**Scénario** : un employé envoie `expenseDate=abc` au POST de création → 500 avec `invalid input syntax for type date: "abc"` et la stack (chemins `.next/server/...`). Un manager appelle `/api/manager/expense-notes/x/receipt-url` → erreur `uuid` et stack.

**Preuve** : PoC à écrire en phase 2 : `curl` connecté sur `GET /api/expense-notes/not-a-uuid/receipt-url` et `POST /api/expense-notes` avec `expenseDate=abc`, puis vérifier avec `jq '.stack'` que la stack est présente.

**Piste** : `respondError` journalise côté serveur et renvoie un message générique et un identifiant de corrélation ; les erreurs de validation attendues sont traitées en 400 en amont (T3).

**Critère d'acceptation** : aucune réponse d'API ne contient de champ `stack` ni de texte d'erreur Postgres, sur ces 7 routes avec entrées invalides.

<a id="v-13-1"></a>

### V-13.1 — Worker OCR recréé à chaque requête, sans limite de concurrence ni délai · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — PERF-01 : pool de 4 workers au plus, délai de 20 s ; PoC V-13 réfuté |
| Thème | T5 — Robustesse et exploitation |
| Module | ocr |
| Référence | OWASP A06 :2025 — Insecure Design (consommation de ressources non bornée) |
| Type | technique |
| Impact | Moyen — saturation CPU et mémoire du processus Next, indisponibilité de l'app pour toutes les entreprises tant que dure l'attaque |
| Vraisemblance | Élevée — tout utilisateur connecté, une boucle `curl` en parallèle |
| Gravité | Haute |
| Note phase 2 | Mécanisme confirmé (PoC) ; coût unitaire modeste (~0,4 s, ~15-20 Mo/worker). Gravité **maintenue à Haute** : la saturation suppose un volume concurrent soutenu, non démontré car l'intensité des PoC a été volontairement bridée. Amplifiée par V-13.2 et l'absence de rate-limit (V-18). |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | **confirmé (PoC)** — `poc/V-13-ocr-worker-and-unbounded-body.sh` : worker Tesseract par requête, 4 concurrents → RSS 657→737 Mo ; coût unitaire ~0,4 s, ~15-20 Mo/worker (voir note de gravité) |
| Origine | cartographie (V-13) |

**Où** : `src/lib/ocr.ts:117-129`, `src/app/api/expense-notes/receipt-suggestion/route.ts:18-19`.

**Constat** : chaque requête lance `createWorker('fra', …, { cacheMethod: 'none' })`, ce qui charge le cœur WASM et décompresse le modèle, puis `recognize` sans délai maximal, puis `terminate`. Rien ne limite le nombre de workers simultanés (ni file d'attente, ni sémaphore) ; aucune limite de débit (V-18).

**Scénario** : un employé lance 50 requêtes OCR simultanées avec des images de 10 Mo : 50 workers coexistent, la mémoire du serveur sature, les autres requêtes ralentissent ou le processus est tué.

**Preuve** : PoC à écrire en phase 2 : N `curl` parallèles sur `receipt-suggestion` avec une image de taille moyenne, mesure de la RSS du processus `next` et de la latence d'un `GET /api/expense-notes` concurrent.

**Piste** : un `createScheduler` ou un pool de taille fixe avec file d'attente bornée, un délai par reconnaissance, un 503 au-delà.

**Critère d'acceptation** : sous N requêtes OCR simultanées, le nombre de workers vivants ne dépasse pas la borne et la mémoire reste plafonnée ; une reconnaissance plus longue que le délai est interrompue.

<a id="v-13-2"></a>

### V-13.2 — Corps de requête lu sans borne de taille · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — SEC-08 : refus dès `Content-Length`, flux plafonné à 10 Mo (400 du contrat, pas 413) ; PoC V-13 réfuté |
| Thème | T5 — Robustesse et exploitation |
| Module | ocr (secondaire : notes) |
| Référence | OWASP A06 :2025 — Insecure Design (consommation de ressources non bornée) |
| Type | technique |
| Impact | Moyen — épuisement mémoire du processus, indisponibilité |
| Vraisemblance | Élevée — tout utilisateur connecté, un seul `curl` avec un gros fichier |
| Gravité | Haute |
| Effort estimé | S |
| Visible utilisateur | non (la limite de 10 Mo existe déjà côté création) |
| Vérification | **confirmé (PoC)** — même script : corps 40 Mo sur `receipt-suggestion` → 200 (RSS +215 Mo, aucune borne) ; sur `POST /api/expense-notes` → 400 mais après bufferisation complète, pas de 413 |
| Origine | cartographie (V-13) + nouveau (création de note) |

**Où** : `src/app/api/expense-notes/receipt-suggestion/route.ts:12-18` (aucune limite ; le commentaire `ocr.ts:106-108` le reconnaît) ; `src/app/api/expense-notes/route.ts:63,84` (la limite de 10 Mo est testée **après** `request.formData()`, qui a déjà tout chargé en mémoire ; `description` n'a pas de longueur maximale).

**Constat** : les deux routes lisent le multipart entier avant tout contrôle. Pour l'OCR s'ajoute la taille décodée : une image PNG de quelques Ko peut déclarer des dimensions énormes (bombe de décompression), et aucun plafond de pixels n'est fixé avant `recognize`.

**Scénario** : `curl -F receipt=@1Go.bin` sur `POST /api/expense-notes` → 1 Go mis en mémoire avant le refus « Fichier trop volumineux ».

**Preuve** : PoC à écrire en phase 2 : envoyer un fichier de 200 Mo sur chaque route, et observer le code HTTP et la RSS du serveur.

**Piste** : refuser sur `Content-Length` puis lire le flux avec un plafond ; même plafond pour l'OCR, plus un plafond de dimensions d'image.

**Critère d'acceptation** : une requête de plus de 10 Mo est refusée en 413 sans hausse mémoire proportionnelle, sur les deux routes.

<a id="v-27"></a>

### V-27 — Décisions et événements de sécurité non journalisés · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — seuls `request.failed`, `ocr.failed` et `receipt.orphaned` sont journalisés |
| Thème | T5 — Robustesse et exploitation |
| Module | validation (secondaires : donnees, auth, organigramme) |
| Référence | OWASP A09 :2025 — Security Logging and Alerting Failures |
| Type | technique |
| Impact | Moyen — impossible d'établir qui a approuvé ou rejeté une note, ni quand, ni de détecter un abus (V-04, V-06) ou une attaque par force brute |
| Vraisemblance | Moyenne — le manque ne se fait sentir qu'en cas de litige ou d'incident, mais il est certain à ce moment-là |
| Gravité | Moyenne |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `migrations/1700000000001_init-schema.sql:22-34` (aucune colonne `decided_by`, `decided_at`, `updated_at`), les 4 routes approve/reject (`UPDATE ... SET status` seul, l.28-31 ou 29-32), `src/app/api/hr/users/[id]/manager/route.ts:48-52`, `src/lib/auth.ts:35-38` (échec de connexion silencieux), `src/lib/errors.ts:2` (seul log de l'app, sans route, utilisateur ni corrélation).

**Constat** : la décision écrase le statut sans trace de son auteur ni de l'heure. Les seuls logs de l'app sont `console.error` sur exception (`errors.ts:2`, `ocr.ts:131`). Aucun log n'est émis pour la connexion (réussie ou non), l'inscription, la décision ou le rattachement.

**Scénario** : un employé conteste un rejet. Rien ne permet de savoir quel manager l'a prononcé : le rattachement a pu changer depuis, et un manager d'une autre entreprise a pu décider via V-04.

**Preuve** : lecture des lignes citées ; `grep -rn console src` ne renvoie que `errors.ts:2` et `ocr.ts:131`.

**Piste** : colonnes `decided_by` et `decided_at` écrites par l'UPDATE, et logs structurés (événement, acteur, cible) pour l'authentification, la décision et le rattachement.

**Critère d'acceptation** : après une approbation, la note porte l'id du décideur et l'horodatage ; une connexion échouée produit une ligne de log avec l'email visé et l'IP.

<a id="v-28"></a>

### V-28 — Erreurs contournant le gestionnaire de la route · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — garde `route()` : `await` systématique (SEC-05, ROB-03a) |
| Thème | T5 — Robustesse et exploitation |
| Module | socle (secondaires : notes, validation) |
| Référence | OWASP A10 :2025 — Mishandling of Exceptional Conditions |
| Type | technique |
| Impact | Faible — le `try/catch` visible ne protège pas ; un correctif de V-11 appliqué à `respondError` ne couvrira pas ces routes ; le comportement d'erreur diffère d'une route à l'autre |
| Vraisemblance | Élevée — tout id non-UUID sur approve/reject, toute valeur de `?sort=` invalide |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — sémantique JS : un `return promesse` dans un `try` d'une fonction `async` ne déclenche pas le `catch` si la promesse est rejetée |
| Origine | nouveau |

**Où** : `src/app/api/expense-notes/route.ts:44`, `src/app/api/manager/expense-notes/route.ts:25`, `.../manager/expense-notes/[id]/approve/route.ts:13`, `.../manager/expense-notes/[id]/reject/route.ts:13`, `src/app/api/hr/expense-notes/route.ts:25`, `.../hr/expense-notes/[id]/approve/route.ts:13`, `.../hr/expense-notes/[id]/reject/route.ts:13`.

**Constat** : `return withUserScope(...)` sans `await` dans le `try` : une exception levée dans le callback (SQL, UUID invalide) court-circuite `respondError` et remonte au framework (500 générique, journal Next). Effet de bord : V-07 (injection par `sort`) est aveugle, sans retour d'erreur SQL au client (à transmettre à T3).

**Scénario** : `POST /api/manager/expense-notes/abc/approve` → 500 du framework, alors que `GET /api/manager/expense-notes/abc/receipt-url` → 500 JSON avec stack (V-11).

**Preuve** : lecture des lignes citées ; à observer en phase 2 avec le PoC de V-11 (comparer les deux réponses).

**Piste** : `return await withUserScope(...)` (ou un wrapper commun de handler).

**Critère d'acceptation** : une exception levée dans `withUserScope` passe par le gestionnaire d'erreur commun, sur les 7 routes.

<a id="v-29"></a>

### V-29 — Aucun délai défini sur la base, le pool et S3 · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — aucun délai sur le pool `pg` ni sur le client S3 (seul l’OCR est borné, 20 s) |
| Thème | T5 — Robustesse et exploitation |
| Module | donnees (secondaire : recus) |
| Référence | OWASP A06 :2025 — Insecure Design |
| Type | technique |
| Impact | Moyen — 20 requêtes lentes suffisent à bloquer toutes les requêtes base de l'app, indéfiniment |
| Vraisemblance | Moyenne — une lenteur de la base suffit ; triviale si combinée à V-07 (`?sort=(SELECT pg_sleep(600))`) |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture |
| Origine | nouveau |

**Où** : `src/lib/db.ts:17` (`new Pool({ connectionString, max: 20 })` : pas de `connectionTimeoutMillis`, dont la valeur par défaut 0 fait attendre sans fin ; pas de `statement_timeout` ni `idle_in_transaction_session_timeout`), `src/lib/storage.ts:8-16` (client S3 sans délai de requête configuré), `src/lib/ocr.ts:125`.

**Constat** : aucune opération d'E/S n'a de délai maximal ; quand le pool est épuisé, les requêtes suivantes attendent sans limite.

**Scénario** : un utilisateur envoie 20 requêtes `GET /api/expense-notes?sort=(SELECT pg_sleep(600))` : les 20 connexions sont occupées dix minutes et toutes les autres routes restent bloquées.

**Preuve** : lecture des lignes citées ; à combiner en phase 2 avec le PoC de V-07.

**Piste** : `connectionTimeoutMillis`, `statement_timeout` côté rôle ou pool, et délai de requête du client S3.

**Critère d'acceptation** : une requête SQL dépassant le délai est annulée et renvoie une erreur ; pool épuisé → erreur en moins de N secondes.

<a id="v-12-2"></a>

### V-12.2 — Conflit d'email à l'inscription remonté en erreur non gérée · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — inscription simultanée → « Un compte existe déjà avec cet email. » |
| Thème | T5 — Robustesse et exploitation |
| Module | auth |
| Référence | OWASP A10 :2025 — Mishandling of Exceptional Conditions |
| Type | technique |
| Impact | Faible — page d'erreur générique au lieu du message « compte existant » ; la contrainte `UNIQUE` empêche le doublon |
| Vraisemblance | Faible — demande deux inscriptions concurrentes sur le même email |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture |
| Origine | cartographie (V-12) |

**Où** : `src/app/actions/auth.ts:36-39,66-69` ; l'erreur `23505` n'est pas capturée (seul `signIn` est dans un `try`, l.71-78). **Nuance par rapport à la cartographie** : il s'agit d'une Server Action, donc pas d'une 500 JSON avec stack ; l'erreur remonte à la frontière d'erreur de Next.

**Critère d'acceptation** : deux inscriptions concurrentes sur le même email → la seconde reçoit « Un compte existe déjà avec cet email. »

<a id="v-14-1"></a>

### V-14.1 — Onglet du reçu ouvert après l'appel réseau (bloqué par les anti-pop-up) · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — onglet du reçu ouvert après l’appel réseau |
| Thème | T5 — Robustesse et exploitation |
| Module | notes (secondaires : validation, organigramme) |
| Référence | — |
| Type | technique |
| Impact | Moyen — reçu non affiché ; contournement manuel (autoriser les pop-ups) |
| Vraisemblance | Faible — Chrome et Firefox tolèrent un `window.open` quelques secondes après le clic ; Safari et les bloqueurs stricts le refusent |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-14) |

**Où** : `src/app/expenses/page.tsx:146-152`, `src/components/PendingApprovalsPanel.tsx:44-50`, `src/components/AdminConsole.tsx:93-99`.

**Critère d'acceptation** : sous Safari avec le blocage des pop-ups actif, « Voir le reçu » affiche le reçu.

<a id="v-14-2"></a>

### V-14.2 — Dates affichées avec un décalage de fuseau · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — BUG-01 |
| Thème | T5 — Robustesse et exploitation |
| Module | notes (secondaires : validation, organigramme) |
| Référence | — |
| Type | technique |
| Impact | Faible — date affichée la veille |
| Vraisemblance | Faible — seulement pour les navigateurs en fuseau UTC négatif ; sans effet en France |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-14) |

**Où** : `src/app/expenses/page.tsx:285`, `src/components/PendingApprovalsPanel.tsx:120`, `src/components/AdminConsole.tsx:228` : `new Date('YYYY-MM-DD')` est interprété en UTC puis formaté en heure locale.

**Critère d'acceptation** : avec `TZ=America/New_York`, une note du 2026-10-12 s'affiche « 12 oct. 2026 ».

<a id="v-14-3"></a>

### V-14.3 — Erreurs réseau des appels `fetch` non gérées · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — erreur réseau d’un `fetch` non interceptée par `src/utils/api.ts` |
| Thème | T5 — Robustesse et exploitation |
| Module | notes (secondaires : validation, organigramme) |
| Référence | — |
| Type | technique |
| Impact | Faible — bouton bloqué sur « Envoi… » ou liste bloquée sur « Chargement… » jusqu'au rechargement de la page |
| Vraisemblance | Faible — demande une coupure réseau |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-14) |

**Où** : `src/app/expenses/page.tsx:76-85` (`setSubmitting(false)` n'est appelé qu'après un `await fetch` qui peut lever), l.115-119 (même schéma pour `extracting`) ; même schéma dans `PendingApprovalsPanel.tsx:28,44,56` et `AdminConsole.tsx:44,54,74,93,105`.

**Critère d'acceptation** : réseau coupé → message d'erreur affiché et bouton réactivé.

<a id="v-15-1"></a>

### V-15.1 — Codes HTTP d'erreur incohérents entre routes · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — AUTHZ-01, AUTHZ-02 (D12) ; 409 gardé (D18) |
| Thème | T5 — Robustesse et exploitation |
| Module | socle (secondaires : validation, organigramme, recus) |
| Référence | — |
| Type | technique |
| Impact | Faible — clients et tests ne peuvent pas distinguer les cas ; aucun accès indu |
| Vraisemblance | Moyenne — l'interface n'y conduit pas : il faut appeler l'API directement |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-15) |

**Où** : rôle refusé en 401 côté manager (`src/app/api/manager/expense-notes/route.ts:21-23` et routes `[id]`, l.8-10) et en 403 côté RH (`src/app/api/hr/expense-notes/route.ts:21-23`, etc.) ; « Invalid manager » renvoyé en 409 au lieu de 400 ou 422 (`src/app/api/hr/users/[id]/manager/route.ts:33,44`) ; un id non-UUID ou une date invalide produit une 500 au lieu d'une 400 ou 404 (V-11, V-28).

**Critère d'acceptation** : non connecté → 401 ; mauvais rôle → 403 ; entrée invalide → 400 ; partout.

<a id="v-15-2"></a>

### V-15.2 — Messages d'erreur en anglais renvoyés à l'interface · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **accepté** — D15 : API en anglais, écran inchangé |
| Thème | T5 — Robustesse et exploitation |
| Module | validation (secondaire : organigramme) |
| Référence | — |
| Type | technique |
| Impact | Faible — message anglais affiché à un utilisateur francophone |
| Vraisemblance | Moyenne — « Already decided » apparaît en cas de décision concurrente |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-15) |

**Où** : `'Already decided'`, `'Not found'` (routes approve/reject : manager l.22 et 25, RH l.23 et 26), `'Invalid manager'` (`hr/users/[id]/manager/route.ts:33,44`), affichés tels quels par `PendingApprovalsPanel.tsx:64-67` et `AdminConsole.tsx:84-86,113-116`.

**Critère d'acceptation** : aucun message en anglais n'apparaît dans l'interface.

<a id="v-30"></a>

### V-30 — Erreurs du pool `pg` non gérées (arrêt possible du processus) · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — aucun gestionnaire d’erreur sur le pool `pg` |
| Thème | T5 — Robustesse et exploitation |
| Module | donnees |
| Référence | OWASP A10 :2025 — Mishandling of Exceptional Conditions |
| Type | technique |
| Impact | Moyen — arrêt du serveur Node (indisponibilité jusqu'à redémarrage) |
| Vraisemblance | Faible — demande une coupure ou un redémarrage de Postgres pendant que des clients sont inactifs dans le pool |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | non vérifié — lecture ; le comportement de Next face à l'erreur non capturée est à observer (`docker compose restart postgres`) |
| Origine | nouveau |

**Où** : `src/lib/db.ts:17` ; `grep -rn "pool.on\|on('error'" src scripts` ne renvoie rien.

**Constat** : `node-postgres` émet `error` sur le `Pool` quand un client inactif perd sa connexion ; sans écouteur, l'événement devient une exception non capturée.

**Piste** : `pool.on('error', log)`.

**Critère d'acceptation** : un redémarrage de Postgres pendant que l'app tourne ne tue pas le processus, et les requêtes suivantes réussissent.

## Thème T6 — Maintenabilité et tests

<a id="v-16-1"></a>

### V-16.1 — Aucun filet de tests de non-régression · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — harnais : 246 unitaires, 329 tests Playwright (parité, défauts, E2E) |
| Thème | T6 — Maintenabilité et tests |
| Module | socle (transverse) |
| Référence | — |
| Type | technique |
| Impact | Élevé — les corrections à venir (« sans changement côté utilisateur ») n'ont aucun moyen de prouver l'absence de régression |
| Vraisemblance | Moyenne — la régression suppose qu'une modification casse un comportement ; ici quasi certain vu la duplication (V-03). Cotable Élevée → Critique : à arbitrer |
| Gravité | Haute |
| Effort estimé | M (outillage + tests des chemins critiques) ; L pour une couverture large |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — aucun fichier `*.test.*`/`*.spec.*`, aucune config jest/vitest/playwright, pas de script `test` (`package.json:5-15`) |
| Origine | cartographie (V-16) |

**Où** : `package.json:5-15,27-39` (ni runner ni script), arborescence entière.

**Constat** : zéro test. Ce qui freine leur écriture aujourd'hui : (1) logique enfermée dans les handlers, appelable seulement via HTTP (V-31) ; (2) `auth()` importé en dur, sans point d'injection (`lib/auth.ts:10`) ; (3) pool `pg` singleton global lu sur `process.env` (`lib/db.ts:7-19`) et client S3 module-level (`lib/storage.ts:4-21`) ; (4) les fonctions pures testables (`parseAmount`, `parseExpenseDate`, `ocr.ts:46-104`) ne sont pas exportées ; (5) seed non isolable (écrit dans l'entreprise de démo, `seed.mjs:98-105`).

**Scénario** : le correctif V-09 ajoute `AND status = 'pending'` dans 3 routes sur 4 ; personne ne le voit.

**Preuve** : PoC à écrire en phase 2 : sans objet (absence vérifiée par commande) ; les PoC `poc/` serviront de premiers tests d'intégration HTTP.

**Piste** : runner (Vitest) + tests d'intégration HTTP contre `make dev` (rejouer les PoC) + tests unitaires des fonctions pures exportées.

**Critère d'acceptation** : `npm test` existe, passe, et couvre au minimum : matrice des droits (01-produit), création de note, décision unique, parsing OCR.

<a id="v-00"></a>

### V-00 — Commentaires du code trompeurs sur la sécurité · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — `src/lib` supprimé et routes réécrites par la refonte |
| Thème | T6 — Maintenabilité et tests |
| Module | socle (secondaires : notes, validation, organigramme, auth, donnees, recus) |
| Référence | — |
| Type | technique |
| Impact | Moyen — compréhension du code faussée, précisément sur les choix de sécurité |
| Vraisemblance | Moyenne — trompe tout lecteur qui se fie au commentaire plutôt qu'au code |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-00), 3 emplacements ajoutés |

**Où** : les 5 de la cartographie (relus, toujours exacts) : `src/app/api/expense-notes/route.ts:39-41`,
`src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:14-16`,
`src/app/api/hr/users/[id]/manager/route.ts:35-38`, `src/lib/auth.ts:6-7`,
`src/lib/db.ts:22-27` + `migrations/1700000000001_init-schema.sql:36-38`. **Nouveaux** :
`Makefile:13` (« génère AUTH_SECRET si besoin » : la cible ne fait que `cp`, l.14) ;
`scripts/ensure-bucket.mjs:10-12` (évoque un job de CI qui n'existe pas, cf. V-16.2) ;
`src/lib/storage.ts:23-24` + `migrations/…:24-25` (justifient la clé séquentielle par la lisibilité, cf. V-10).

**Constat** : 8 commentaires affirment une garantie que le code ne fournit pas.

**Scénario** : un développeur qui corrige V-06 lit l.14-16 et conclut que la vérification est inutile.

**Preuve** : lecture des lignes citées vs code adjacent.

**Piste** : supprimer ou réécrire chaque commentaire dans le même commit que le correctif du V associé.

**Critère d'acceptation** : aucun commentaire n'affirme une garantie (isolation, unicité, génération de secret, CI) non assurée par le code ; revue ciblée des 8 emplacements.

<a id="v-01"></a>

### V-01 — Couche domaine/ports/adapters/utils morte (jamais importée) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — couche ranimée et branchée (ADR-004) ; `NotificationPort` gardé pour l’asynchrone (ADR-008) |
| Thème | T6 — Maintenabilité et tests |
| Module | socle |
| Référence | — |
| Type | technique |
| Impact | Moyen — fait croire que `ExpenseNote.approve()`, `User.canManage()` ou `NotificationPort` font foi |
| Vraisemblance | Moyenne — touche tout nouvel arrivant qui part de `src/domain` |
| Gravité | Moyenne |
| Effort estimé | S (suppression) / M (branchement, à décider en phase 3 avec V-03) |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — `grep -rnE "from '@/(domain\|ports\|adapters\|utils)" src` hors `src/adapters` : 0 résultat |
| Origine | cartographie (V-01) |

**Où** : `src/domain/ExpenseNote.ts:13-45`, `src/domain/User.ts:11-29`, `src/ports/*.ts`, `src/adapters/*.ts`, `src/utils/format.ts`, `src/utils/validators.ts`.

**Constat** : ~130 lignes jamais importées ; la règle réelle est ailleurs et diverge déjà : `User.canManage` (`User.ts:26-28`) ignore l'entreprise, comme la RLS ; `isRootManager` (`User.ts:22-24`) n'est pas la règle RH effective (qui ajoute l'entreprise, `api/hr/expense-notes/route.ts:29-30`).

**Scénario** : un correctif de M-01 est écrit dans `User.ts`, compile, n'a aucun effet.

**Preuve** : grep ci-dessus.

**Piste** : supprimer, ou faire de `domain/` la source unique de la règle si V-03 retient cette option.

**Critère d'acceptation** : plus aucun fichier non importé sous `src/` (vérifiable par un outil de détection de code mort ou grep en CI).

<a id="v-02-2"></a>

### V-02.2 — Objets échangés (ligne SQL → DTO → client) dupliqués et non typés · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — presenters typés (`shared/http/presenters.ts`) |
| Thème | T6 — Maintenabilité et tests |
| Module | socle (secondaires : notes, validation, organigramme, auth) |
| Référence | — |
| Type | technique |
| Impact | Moyen — un champ renommé ou ajouté compile partout et casse à l'exécution (champs `any`/`unknown`) |
| Vraisemblance | Moyenne — toute évolution du modèle (ex. décideur/date pour M-05.1) |
| Gravité | Moyenne |
| Effort estimé | M |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — 27 appels `.query(` sans paramètre de type contre 3 typés (grep) |
| Origine | cartographie (V-02, 1re et 5e puces ; 03 « copié 7 fois ») + nouveau (typage) |

**Où** : mapping note ×7 : `api/expense-notes/route.ts:18-29`, `api/manager/expense-notes/route.ts:5-16`, `api/hr/expense-notes/route.ts:5-16`, inline `{manager,hr}/…/{approve,reject}/route.ts:33-42`. Mapping utilisateur ×2 : `api/hr/users/route.ts:20-26`, `api/hr/users/[id]/manager/route.ts:54-60`. Interfaces client redéclarées : `app/expenses/page.tsx:5-12`, `components/PendingApprovalsPanel.tsx:5-12`, `components/AdminConsole.tsx:5-20`. Rôle déclaré ou écrit en littéral 6 fois : `domain/User.ts:1`, `types/next-auth.d.ts:3`, `lib/auth.ts:32,55`, `app/actions/auth.ts:52`, `AdminConsole.tsx:9`. Statut typé `string` côté client (`expenses/page.tsx:10,24-34`).

**Constat** : `toExpenseNote(row: Record<string, unknown>)` renvoie des champs `unknown` (sauf amount/createdAt) ; les lignes `pg` non typées sont `any` ; `response.json()` est injecté tel quel dans l'état React (`expenses/page.tsx:60`, `PendingApprovalsPanel.tsx:30`, `AdminConsole.tsx:46,56`). Aucun contrat partagé serveur/client : `tsc` ne peut rien détecter.

**Scénario** : renommer `expenseDate` en `date` dans un mapper : `tsc` passe, l'historique affiche « Invalid Date » ou plante dans `dateFormatter.format`.

**Preuve** : `grep -rnE "\.query\(" src | grep -v "query<" | wc -l` → 27 ; lignes citées.

**Piste** : un module de types partagés (`Row`, `DTO`, `UserRole`, `ExpenseStatus`) et un mapper unique par entité, réutilisés par les routes et les composants.

**Critère d'acceptation** : un seul mapper par entité ; renommer un champ du DTO fait échouer `tsc` dans les composants clients.

<a id="v-02-3"></a>

### V-02.3 — Utilitaires et appels API dupliqués côté client · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — `src/utils/api.ts` et `src/utils/format.ts` |
| Thème | T6 — Maintenabilité et tests |
| Module | socle (secondaires : notes, validation, organigramme) |
| Référence | — |
| Type | technique |
| Impact | Moyen — un correctif d'affichage (V-14 : date UTC, try/catch, `window.open`) doit être appliqué 3 fois |
| Vraisemblance | Moyenne — V-14 est déjà à corriger |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-02, 4e puce) + couplage UI/API (nouveau, même correction) |

**Où** : `currencyFormatter`/`dateFormatter` : `expenses/page.tsx:17-22`, `PendingApprovalsPanel.tsx:14-19`, `AdminConsole.tsx:25-30` (alors que `utils/format.ts:1-8`, mort). `inputClass` : `expenses/page.tsx:14-15`, `login/page.tsx:9-10`, `signup/page.tsx:9-10` ; `selectClass` `AdminConsole.tsx:22-23`. Bloc d'erreur `role="alert"` copié 5 fois. Séquences fetch → `ok` → `json` → message identiques : `expenses/page.tsx:57-65,145-153`, `PendingApprovalsPanel.tsx:27-35,42-71`, `AdminConsole.tsx:43-61,71-120` ; URLs d'API en dur dans les composants (12 `fetch(`).

**Constat** : pas de client API ni de composants partagés ; chaque écran recode le même cycle et affiche brut le message de l'API (V-15).

**Scénario** : on corrige l'affichage de date (V-14) dans `expenses/page.tsx:285` ; `/manager` et `/hr` restent décalés d'un jour.

**Preuve** : lignes citées.

**Piste** : un module `lib/client/` (formatters, `apiFetch` typé avec gestion d'erreur) + composants `Alert`, `Field`.

**Critère d'acceptation** : un seul formatter de date/devise et un seul helper fetch importés par les 3 écrans ; test unitaire du formatter de date (fuseau négatif).

<a id="v-02-4"></a>

### V-02.4 — Contrôle de session et de rôle recopié dans chaque route · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — garde unique `route({ role })` (ADR-012) |
| Thème | T6 — Maintenabilité et tests |
| Module | auth (secondaires : notes, validation, organigramme, recus, ocr) |
| Référence | — |
| Type | technique |
| Impact | Moyen — ajouter/renommer un rôle (M-02) ou harmoniser 401/403 (V-15) impose 13 éditions ; un oubli laisse une route ouverte |
| Vraisemblance | Moyenne — M-02 touche les rôles |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — 13 fichiers `api/` appellent `auth()`, 17 tests de rôle en littéral |
| Origine | nouveau (complète V-02) |

**Où** : `api/expense-notes/route.ts:33-36,58-61`, `…/[id]/receipt-url/route.ts:8-11`, `…/receipt-suggestion/route.ts:7-10`, `api/manager/**/route.ts:20-23` / `7-10` (×4), `api/hr/**/route.ts:7-10` / `20-23` (×6) ; pages `app/manager/page.tsx:7`, `app/hr/page.tsx:7`, `app/layout.tsx:41,44`.

**Constat** : chaque route recopie `const session = await auth(); if (!session?.user || session.user.role !== '…') return …` avec un code HTTP variable (401 côté manager, 403 côté RH).

**Scénario** : une nouvelle route RH copiée depuis une route employé oublie le test de rôle.

**Preuve** : lignes citées.

**Piste** : un helper `requireUser()` / `requireRole(role)` qui renvoie la session ou la réponse d'erreur normalisée.

**Critère d'acceptation** : aucune route n'appelle `auth()` directement ; test : chaque route `api/manager|hr` refuse les autres rôles avec le même code.

<a id="v-16-2"></a>

### V-16.2 — Aucune intégration continue (lint, typecheck, build, tests) · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — CI : static, parity, defects, baseline-proof, perf |
| Thème | T6 — Maintenabilité et tests |
| Module | socle |
| Référence | — |
| Type | technique |
| Impact | Moyen — `lint`/`typecheck` existent (`package.json:9-10`) mais rien ne les impose ; les tests de V-16.1 ne protégeront que si on les lance |
| Vraisemblance | Moyenne — dépend de la discipline de l'équipe |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) — ni `.github/` ni `.gitlab-ci.yml` ; dépôt à 1 commit (`git log`) |
| Origine | cartographie (V-16, « pas de CI ») |

**Où** : racine du dépôt ; `scripts/ensure-bucket.mjs:10-12` prétend le contraire (V-00).

**Constat** : aucune CI ; aujourd'hui `tsc` et `eslint` passent (0 erreur), état à préserver.

**Scénario** : un commit introduit une erreur de type ; elle est découverte au `next build` de la démo.

**Preuve** : `find` sans résultat ; `npx tsc --noEmit` et `npx eslint .` exécutés : 0 erreur.

**Piste** : pipeline sur chaque push : `npm ci`, `lint`, `typecheck`, `build`, `test` (services Postgres + LocalStack).

**Critère d'acceptation** : une PR qui casse `tsc` ou un test est marquée en échec.

<a id="v-31"></a>

### V-31 — Logique métier et accès aux données mêlés aux route handlers · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — monolithe modulaire (ADR-002, ADR-003) |
| Thème | T6 — Maintenabilité et tests |
| Module | socle (secondaires : notes, validation, organigramme, donnees) |
| Référence | — |
| Type | technique |
| Impact | Moyen — seul un test HTTP de bout en bout (Postgres + S3 + session) peut vérifier une règle ; coût de modification accru |
| Vraisemblance | Moyenne — chaque correctif du plan touche un handler |
| Gravité | Moyenne |
| Effort estimé | L |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : SQL inline dans 13 handlers et `app/actions/auth.ts:36-69` ; mélange `withUserScope` / `getPool()` sans règle (`api/expense-notes/route.ts:88,103`, `api/hr/users/[id]/manager/route.ts:15,23,39,48`) ; orchestration DB→S3→DB dans le handler (`api/expense-notes/route.ts:88-106`) ; pages `/manager`, `/hr` serveur qui délèguent tout à des composants client qui refont des `fetch` (`app/manager/page.tsx:18`, `app/hr/page.tsx:18`).

**Constat** : pas de couche service ni repository (02-architecture le note) ; validation, autorisation, SQL, S3 et sérialisation sont dans la même fonction. Corollaire : impossible de tester une règle (ex. « RH valide les managers racine de son entreprise ») sans monter toute la pile.

**Scénario** : pour tester M-01.2, il faut créer des comptes, se connecter, récupérer un cookie, poster un reçu S3 réel.

**Preuve** : lignes citées ; 02-architecture « pas de couche service ».

**Piste** : couche `services/` (règles) + `repositories/` (SQL typé, toujours via `withUserScope`) avec dépendances injectables ; handlers réduits à parse → service → réponse. Concevoir en phase 3 avec V-01/V-03.

**Critère d'acceptation** : les règles du circuit sont testables avec un faux repository, sans HTTP ni S3.

## Thème T7 — Dépendances, configuration et données personnelles

<a id="v-32"></a>

### V-32 — Next.js exposé à des vulnérabilités connues · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — `next` 16.3.5 → 16.4.3 et `sharp` 0.35.4 → 0.35.5 : `npm audit --omit=dev` ne trouve plus aucune vulnérabilité (avant : 3 RCE critiques, DoS des Server Actions, SSRF de l'optimiseur d'images) |
| Thème | T7 — Dépendances, configuration et données personnelles |
| Module | socle |
| Référence | OWASP A03 :2025 — Software Supply Chain Failures |
| Type | technique |
| Impact | Élevé — 1 avis critique (RCE), plusieurs avis hauts (SSRF de l'optimiseur d'images, empoisonnement de cache SSG/ISR) sur la version installée |
| Vraisemblance | Faible — la fonction visée par l'avis critique n'est pas utilisée (`grep next/og src` : rien) ; pour les autres avis, il faut vérifier que l'app est concernée (l'endpoint `/_next/image` existe par défaut, les pages `/login` et `/signup` sont prérendues) |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (commande) pour la présence des avis ; applicabilité non vérifiée |
| Origine | nouveau |

**Où** : `package.json:20` (`"next": "16.3.5"`, épinglé), `package.json:37` (`eslint-config-next` 16.3.5).

**Constat** : résultat de `npm audit --omit=dev` : 3 paquets vulnérables (1 critique, 2 hauts), sur 102 dépendances de production.

| Paquet (installé) | Gravité npm | Avis | Plage | Correctif |
|---|---|---|---|---|
| `next` 16.3.5 (direct) | critique | GHSA-vcvr-r3jv-pc5j RCE dans `next/og` `ImageResponse` | ≥16.2.0 <16.3.6 | 16.4.0 (mineure) |
| `next` | haute | GHSA-cjq9-62q9-8jv4 SSRF dans l'optimisation d'images | <16.3.8 | idem |
| `next` | modérée ×4, faible ×1 | GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p (empoisonnement de cache), GHSA-3w37-wq28-93x7, GHSA-f87g-xv8r-7p7x, GHSA-39w2-rjm5-chcv (endpoint MCP du serveur de dev) | <16.3.8 | idem |
| `sharp` 0.35.4 (via `next`) | haute | GHSA-wq5f-xc86-pv6w (librsvg) | <0.35.5 | via `next` |
| `source-map-js` 1.2.1 (via `next` → `postcss`) | haute | GHSA-68fv-2mgg-jv7q (déni de service) | <1.2.2 | via `next` |

`npm outdated` : `next` et `eslint-config-next` 16.4.0, `pg` 8.23.1, `@aws-sdk/*` 3.1150.0, `react`/`react-dom` 19.3.0 disponibles. Les autres écarts sont des versions majeures (TypeScript 7, ESLint 10, dotenv 18).

**Scénario** : à qualifier en phase 2, avis par avis. Le plus plausible est l'empoisonnement de cache sur les pages prérendues en auto-hébergement (`next start`).

**Preuve** : `npm audit --omit=dev --json` (sortie résumée ci-dessus). PoC non pertinent : la correction ne dépend pas de l'exploitabilité.

**Piste** : passer `next` et `eslint-config-next` en 16.4.0, puis relancer `npm audit`.

**Critère d'acceptation** : `npm audit --omit=dev` ne signale plus aucune vulnérabilité haute ou critique.

<a id="v-34"></a>

### V-34 — Postgres et LocalStack exposés sur toutes les interfaces · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — ports Docker liés à toutes les interfaces (infrastructure locale) ; PoC V-34 toujours confirmé : LocalStack sert un objet sans signature |
| Thème | T7 — Dépendances, configuration et données personnelles |
| Module | socle (secondaire : donnees) |
| Référence | OWASP A02 :2025 — Security Misconfiguration |
| Type | technique |
| Impact | Élevé — toute la base (rôle superuser, mot de passe `expense`) et tous les reçus sont accessibles depuis le réseau local du poste de développement |
| Vraisemblance | Faible — seulement pendant `make dev`, et depuis le même réseau (Wi-Fi partagé d'école, par exemple) ; les ports publiés par Docker contournent souvent le pare-feu de l'hôte |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | **confirmé (PoC)** — `poc/V-34-localstack-unsigned-and-sequential-keys.sh` : `GET http://localhost:4567/receipts/receipts/<n>.png` sans signature → 200 + PNG. Écoute sur toutes les interfaces non testée depuis une autre machine (consigne localhost) |
| Origine | nouveau |

**Où** : `docker-compose.yml:6-10` (`POSTGRES_USER`/`POSTGRES_PASSWORD: expense`, port `'5433:5432'` sans IP de liaison, donc toutes les interfaces), `docker-compose.yml:24-29` (LocalStack, port `'4567:4566'`, aucune option d'application de l'IAM), `.env.example:2,13-14` (identifiants `expense:expense`, `test`/`test`).

**Constat** : les deux services écoutent sur toutes les interfaces. Le rôle créé par `POSTGRES_USER` est superuser (lien avec V-05, T2). LocalStack communautaire n'impose pas de vérification de signature S3 par défaut (à confirmer).

**Scénario** : sur le même Wi-Fi, `psql postgres://expense:expense@<ip-du-poste>:5433/expense_io -c 'select email, password_hash from users'`.

**Preuve** : lecture des lignes citées.

**Piste** : lier les ports à `127.0.0.1` ; identifiants générés par `make env`.

**Critère d'acceptation** : depuis une autre machine du réseau, les ports 5433 et 4567 sont fermés.

<a id="v-35"></a>

### V-35 — Aucune suppression ni durée de conservation des données personnelles · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **hors périmètre** — départ d’un salarié (14) |
| Thème | T7 — Dépendances, configuration et données personnelles |
| Module | donnees (secondaires : recus, organigramme) |
| Référence | — |
| Type | technique |
| Impact | Moyen — données personnelles (nom, email, reçus pouvant porter nom, lieu, fin de numéro de carte, description libre) conservées sans limite, sans moyen de les supprimer ou de les exporter ; plus elles s'accumulent, plus une fuite (V-06, V-10.2, V-34) en expose |
| Vraisemblance | Moyenne — le manque devient bloquant à la première demande d'effacement, au premier départ d'un salarié, ou à la fin d'une durée légale de conservation des pièces |
| Gravité | Moyenne |
| Effort estimé | L |
| Visible utilisateur | oui (nouvelle fonction) |
| Vérification | confirmé (lecture) — `grep -rniE "delete\|DeleteObject" src migrations scripts` (hors code mort) : aucun résultat |
| Origine | nouveau |

**Où** : `migrations/1700000000001_init-schema.sql:13,18,27` (clés étrangères sans `ON DELETE` : un utilisateur qui a des notes ou des subordonnés ne peut pas être supprimé, même en SQL, sans traitement préalable), `src/lib/storage.ts:1-38` (aucune suppression d'objet), aucune route `DELETE` dans `src/app/api/**`, `docker-compose.yml:12,31` (volumes persistants).

**Constat (factuel, non juridique)** : l'app collecte et conserve indéfiniment des données personnelles et des pièces justificatives. Il n'existe ni suppression de compte ou de note, ni désactivation d'un salarié parti, ni export par l'utilisateur de ses données, ni politique de rétention (cycle de vie S3, purge). Le choix de la durée (obligations comptables contre minimisation) est une décision à prendre, pas un constat technique.

**Scénario** : un salarié quitte l'entreprise et demande l'effacement de ses données : il faut intervenir en SQL dans 2 tables, réaffecter `manager_id`, et supprimer à la main ses objets S3, dont les clés ne portent aucune trace du propriétaire (V-10.2).

**Preuve** : lecture des lignes citées.

**Piste** : définir une politique de rétention, puis désactivation de compte, suppression ou anonymisation en cascade, purge S3 associée.

**Critère d'acceptation** : un RH peut désactiver ou anonymiser un salarié ; ses reçus sont supprimés du stockage selon la politique définie ; un test vérifie qu'il ne reste aucun objet orphelin.

<a id="v-36"></a>

### V-36 — Seed créant des comptes connus hors développement · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — `scripts/seed.mjs` ne refuse pas un environnement de production |
| Thème | T7 — Dépendances, configuration et données personnelles |
| Module | donnees (secondaire : socle) |
| Référence | OWASP A02 :2025 — Security Misconfiguration (comptes par défaut) |
| Type | technique |
| Impact | Élevé — un compte `hr_admin` au mot de passe public (`hr1234`) donnerait la maîtrise de l'entreprise de démo, et quiconque s'inscrirait en `@expense.io` la rejoindrait |
| Vraisemblance | Faible — demande de lancer `npm run seed` avec un `DATABASE_URL` hors dev |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `scripts/seed.mjs:14-19` (mots de passe par défaut, dont `hr1234` et `demo1234`, plus courts que la règle de 8 caractères de l'inscription, `actions/auth.ts:12`), `scripts/seed.mjs:72,107-111` (mots de passe écrits en clair dans la sortie), aucun garde-fou sur l'environnement (`NODE_ENV`, hôte de `DATABASE_URL`).

**Critère d'acceptation** : le seed refuse de s'exécuter hors environnement de développement et n'écrit plus de mot de passe dans la sortie.

<a id="v-33"></a>

### V-33 — `next-auth` en version bêta, non épinglée · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — `next-auth` `^5.0.0-beta.32`, ni stable ni épinglé |
| Thème | T7 — Dépendances, configuration et données personnelles |
| Module | auth (secondaire : socle) |
| Référence | OWASP A03 :2025 — Software Supply Chain Failures |
| Type | technique |
| Impact | Moyen — la bibliothèque qui porte toute l'authentification est en bêta : API instable, pas de garantie de correctifs de sécurité |
| Vraisemblance | Faible — une régression demande une montée de version de la bêta |
| Gravité | Faible |
| Effort estimé | S (épinglage) / M (migration) |
| Visible utilisateur | non |
| Vérification | confirmé (lecture) |
| Origine | nouveau |

**Où** : `package.json:21` (`"next-auth": "^5.0.0-beta.32"`). `npm outdated` indique `latest` = 4.24.15 : la v5 n'a jamais eu de version stable. Le `^` sur une préversion laisse `npm install` (`Makefile:12`) prendre toute bêta 5.0.0 suivante.

**Critère d'acceptation** : la version d'authentification est épinglée exactement (ou stable), et le choix est documenté.

## Thème T8 — Circuit métier

<a id="m-01-1"></a>

### M-01.1 — Notes des RH validées par personne · Critique

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-03, MET-10 (D13) |
| Thème | T8 — Circuit métier |
| Module | validation (secondaires : organigramme, donnees) |
| Référence | — |
| Type | bug-metier |
| Impact | Élevé — circuit bloqué pour toute une catégorie (tous les `hr_admin`), sans contournement dans l'interface |
| Vraisemblance | Élevée — usage normal : un RH soumet une note |
| Gravité | Critique |
| Effort estimé | M |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) — aucune requête de validation ne sélectionne un auteur `hr_admin`, et un RH ne peut recevoir de manager |
| Origine | cartographie (M-01) |

**Où** : `api/hr/expense-notes/route.ts:29` (`u.role = 'manager'`) ; `api/manager/expense-notes/route.ts:29` (exige `manager_id` = un manager, or un RH ne peut en avoir : `api/hr/users/[id]/manager/route.ts:24` exclut `hr_admin` des cibles, `api/hr/users/route.ts:14` les exclut de l'annuaire).

**Constat** : la note d'un RH reste `pending` indéfiniment ; le formulaire `/expenses` l'accepte pourtant sans avertissement.

**Scénario** : `hr@expense.io` soumet un taxi ; aucune liste (`/manager`, `/hr`) ne l'affiche, jamais.

**Preuve** : PoC à écrire en phase 2 : soumettre une note en `hr@expense.io`, puis vérifier qu'elle est absente de `GET /api/hr/expense-notes` (autre RH) et de `GET /api/manager/expense-notes` (manager seed), et que `POST …/approve` répond 404 pour les deux.

**Piste** : router les notes d'un `hr_admin` vers les **autres** `hr_admin` de la même entreprise (jamais soi-même) ; une entreprise n'a qu'un RH aujourd'hui → dépend de M-02 (nommer un second RH), à défaut repli à définir (ex. rattacher le RH à un manager).

**Critère d'acceptation** : une note d'un RH apparaît chez un autre RH de son entreprise, qui peut la décider ; elle n'apparaît pas chez son auteur ni chez un RH d'une autre entreprise.

- **Comportement actuel → proposé** : la note d'un RH n'est visible par aucun valideur → elle est validée par un autre RH de l'entreprise.
- **Justification** : bug évident (01-produit : « personne ne la valide »).
- **Ce que l'utilisateur verra** : le RH voit dans `/hr` les notes de ses collègues RH ; ses propres notes changent de statut.
- **Décision équipe** : à valider

<a id="m-02"></a>

### M-02 — Rôle manager non attribuable depuis l'interface · Critique

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROLE-01, ROLE-04 (D14) |
| Thème | T8 — Circuit métier |
| Module | organigramme (secondaires : auth) |
| Référence | — |
| Type | bug-metier |
| Impact | Élevé — dans une entreprise née d'une inscription, aucun manager ne peut exister : le circuit hiérarchique entier est inutilisable |
| Vraisemblance | Élevée — toute entreprise créée via `/signup` |
| Gravité | Critique |
| Effort estimé | M |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) — aucune écriture de `users.role` dans `src/` hors INSERT d'inscription |
| Origine | cartographie (M-02) |

**Où** : `app/actions/auth.ts:52-63` (rôle `employee` ou `hr_admin` seulement) ; aucune route ne met à jour `role` (seule écriture de `users` hors inscription : `api/hr/users/[id]/manager/route.ts:48-51`, `manager_id` uniquement) ; `AdminConsole.tsx:166` affiche le rôle sans moyen de le changer ; `AdminConsole.tsx:69` : liste de managers vide → menu limité à « — aucun (racine) — ».

**Constat** : seul `scripts/seed.mjs:58-73` ou SQL direct crée un manager.

**Scénario** : alice@acme.fr s'inscrit (RH), 10 collègues suivent (employés) ; aucun ne peut être nommé manager, toutes les notes restent en attente (M-01.2).

**Preuve** : PoC à écrire en phase 2 : inscrire un RH puis un employé sur un domaine neuf, vérifier que `GET /api/hr/users` ne renvoie aucun manager et qu'aucune route ne permet de changer le rôle (PUT sur `/api/hr/users/<id>/manager` avec un id d'employé → 409 « Invalid manager »).

**Piste** : route RH `PUT /api/hr/users/:id/role` (employee ↔ manager, éventuellement hr_admin pour M-01.1), restreinte à l'entreprise, + menu dans `AdminConsole`. Doit traiter la rétrogradation (M-08) et la fraîcheur du rôle dans le JWT (voir « Pour un autre thème »). Vérifié : promouvoir un subordonné en manager ne casse rien (son `manager_id` est conservé, ses notes suivent toujours son manager).

**Critère d'acceptation** : un RH promeut un employé de son entreprise en manager, puis le choisit comme manager d'un autre employé ; refus pour un utilisateur d'une autre entreprise.

- **Comportement actuel → proposé** : rôle manager attribuable seulement en base → attribuable par les RH dans `/hr`.
- **Justification** : bug évident ; correctif validé dans son principe par l'utilisateur.
- **Ce que l'utilisateur verra** : un sélecteur de rôle par personne dans l'organigramme RH.
- **Décision équipe** : à valider

<a id="m-01-2"></a>

### M-01.2 — Notes d'un employé sans manager validées par personne · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-02 |
| Thème | T8 — Circuit métier |
| Module | validation (secondaires : organigramme, donnees) |
| Référence | — |
| Type | bug-metier |
| Impact | Moyen — contournement manuel : les RH rattachent l'employé, la note suit (lien calculé à la lecture) ; mais rien ne signale le blocage |
| Vraisemblance | Élevée — tout inscrit via `/signup` arrive sans manager (`app/actions/auth.ts:66-69`, pas de `manager_id`) |
| Gravité | Haute |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-01) |

**Où** : `api/hr/expense-notes/route.ts:29` (`role = 'manager'` exclut les employés) ; mêmes prédicats dans `api/hr/expense-notes/[id]/{approve,reject,receipt-url}/route.ts:17-18` ; RLS `migrations/…:70-100`.

**Constat** : une note d'employé sans manager n'est visible ni par un manager ni par les RH ; les RH ne voient pas non plus qu'elle est bloquée (M-07).

**Scénario** : Bob s'inscrit chez acme.fr, soumet une note ; tant que la RH n'a pas pensé à lui attribuer un manager (et il faut qu'il en existe un, M-02), la note dort.

**Preuve** : PoC à écrire en phase 2 : inscrire un employé sur un domaine de la démo, soumettre une note, vérifier son absence de `GET /api/hr/expense-notes` et `GET /api/manager/expense-notes`.

**Piste** : élargir le prédicat RH à « auteur sans `manager_id` et rôle ≠ `hr_admin` » (managers racine **et** employés sans manager), au même endroit unique que V-03.

**Critère d'acceptation** : la note d'un employé sans manager apparaît dans `/hr` de son entreprise et y est décidable ; après rattachement à un manager, elle quitte `/hr` pour `/manager`.

- **Comportement actuel → proposé** : note d'un employé sans manager validée par personne → validée par les RH de l'entreprise, comme celle d'un manager racine.
- **Justification** : bug évident ; correctif validé dans son principe par l'utilisateur.
- **Ce que l'utilisateur verra** : la file RH s'intitule « notes sans valideur hiérarchique » (et plus seulement « managers racine ») et contient aussi des employés.
- **Décision équipe** : à valider

<a id="m-03"></a>

### M-03 — Entreprise fondée sur un domaine de messagerie public · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-01 (D16) |
| Thème | T8 — Circuit métier |
| Module | auth (secondaires : organigramme) |
| Référence | OWASP A01:2025 — Broken Access Control (A06 Insecure Design) |
| Type | choix-discutable |
| Impact | Moyen — des inconnus forment une « entreprise » ; le premier inscrit en devient RH, voit noms et emails des suivants et valide leurs managers racine |
| Vraisemblance | Élevée — inscription libre avec `@gmail.com`, `@outlook.fr`… |
| Gravité | Haute |
| Effort estimé | S (liste de domaines refusés) / M (invitation) |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-03), fusionné avec l'angle sécurité relevé en T2 |

**Où** : `app/actions/auth.ts:41-63` (domaine = entreprise, 1er inscrit = `hr_admin`) ; `api/hr/users/route.ts:12-17` (annuaire nom + email de l'entreprise).

**Constat** : aucune liste de domaines publics, aucune vérification de propriété du domaine. Angle sécurité (T2) : la vérification d'email (V-17) ne règle pas ce cas, l'attaquant possède réellement son adresse Gmail ; le premier inscrit lit noms et emails des suivants et gère leur rattachement.

**Scénario** : le premier `x@gmail.com` devient RH de « gmail » et lit les noms/emails de tous les inscrits gmail ultérieurs.

**Preuve** : PoC à écrire en phase 2 : inscrire `a@<domaine-test>` puis `b@<domaine-test>`, vérifier que `a` est `hr_admin` et voit `b` dans `GET /api/hr/users`.

**Piste** : refuser l'inscription sur une liste de domaines publics (court terme) ; invitation par les RH en évolution.

**Critère d'acceptation** : `/signup` avec un domaine de la liste renvoie un message explicite et ne crée ni entreprise ni compte.

- **Comportement actuel → proposé** : tout domaine fonde une entreprise → les domaines de messagerie publics sont refusés.
- **Justification** : argumentaire : fuite de noms/emails entre inconnus et rôle RH attribué au hasard (cf. T2).
- **Ce que l'utilisateur verra** : message « utilisez votre adresse professionnelle » à l'inscription.
- **Décision équipe** : à valider

<a id="m-06"></a>

### M-06 — Auteur d'une note présenté au manager par un id tronqué · Haute

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-08 (D20) : `authorName` dans la liste manager |
| Thème | T8 — Circuit métier |
| Module | validation |
| Référence | — |
| Type | bug-metier (cartographie : choix-discutable — désaccord, voir Constat) |
| Impact | Moyen — le manager décide sans savoir de qui vient la note ; contournement : demander à chacun |
| Vraisemblance | Élevée — chaque consultation de `/manager` |
| Gravité | Haute |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-06) |

**Où** : `components/PendingApprovalsPanel.tsx:116-118` ; l'API ne renvoie pas le nom (`api/manager/expense-notes/route.ts:27` `SELECT en.*`). Les RH, eux, résolvent le nom via l'annuaire (`AdminConsole.tsx:223-226`).

**Constat** : incohérence entre les deux écrans de validation : pas un choix produit défendable, d'où `bug-metier`.

**Scénario** : un manager de 6 personnes voit trois notes « 3f9a1c2e… » et doit approuver à l'aveugle.

**Preuve** : PoC à écrire en phase 2 : `GET /api/manager/expense-notes` en `manager@expense.io` : la réponse ne contient aucun nom d'auteur.

**Piste** : joindre `u.name` dans la requête manager et l'ajouter au DTO (mapper unique V-02.2).

**Critère d'acceptation** : `/manager` affiche le nom de l'auteur pour chaque note.

- **Comportement actuel → proposé** : 8 premiers caractères de l'UUID → nom de l'auteur.
- **Justification** : bug évident (les RH voient déjà le nom).
- **Ce que l'utilisateur verra** : colonne « Employé » lisible dans `/manager`.
- **Décision équipe** : à valider

<a id="m-04"></a>

### M-04 — Total « Mes notes » additionnant les notes rejetées · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — UI-01 (D17) |
| Thème | T8 — Circuit métier |
| Module | notes |
| Référence | — |
| Type | choix-discutable |
| Impact | Faible — chiffre trompeur (montant « au total » ≠ ce qui sera remboursé), sans conséquence sur les données |
| Vraisemblance | Élevée — dès qu'une note est rejetée |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-04) |

**Où** : `src/app/expenses/page.tsx:155` (somme de toutes les notes), affichée `:162-164`.

**Constat** : le total mélange `pending`, `approved`, `rejected`.

**Scénario** : 100 € approuvés + 900 € rejetés → « 1 000 € au total ».

**Preuve** : ligne citée.

**Piste** : afficher un total par statut (au minimum exclure `rejected`).

**Critère d'acceptation** : avec une note de chaque statut, le total affiché exclut la rejetée (ou les trois totaux sont distincts).

- **Comportement actuel → proposé** : un total toutes notes confondues → total approuvé + total en attente, rejetées exclues.
- **Justification** : rattachable au lot qui touche `expenses/page.tsx` (V-02.3 / V-14).
- **Ce que l'utilisateur verra** : l'en-tête « Mes notes de frais » affiche deux montants.
- **Décision équipe** : à valider

<a id="m-05-1"></a>

### M-05.1 — Auteur et date d'une décision non conservés · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — affichage non tranché (D20) |
| Thème | T8 — Circuit métier |
| Module | validation (secondaires : donnees) |
| Référence | — |
| Type | choix-discutable |
| Impact | Moyen — impossible de savoir qui a approuvé quoi ; un abus (V-04, V-04.2, V-09) est indétectable a posteriori |
| Vraisemblance | Moyenne — se révèle lors d'un litige ou d'un contrôle |
| Gravité | Moyenne |
| Effort estimé | M (migration) |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-05, volet traçabilité) |

**Où** : schéma `migrations/…:22-34` (ni `decided_by` ni `decided_at`) ; les 4 UPDATE `{manager,hr}/…/{approve,reject}/route.ts:28-31`.

**Constat** : seule la colonne `status` change ; le décideur est perdu, et comme le valideur est calculé à la lecture (01-produit), un changement de manager efface même l'information implicite.

**Scénario** : une note approuvée par un manager depuis rattaché ailleurs : personne ne peut dire qui l'a validée.

**Preuve** : lignes citées.

**Piste** : colonnes `decided_by`, `decided_at` écrites par la transition unique (V-03) ; affichage dans l'historique de l'auteur.

**Critère d'acceptation** : après décision, la note porte l'id du décideur et un horodatage ; l'auteur voit « par X le JJ/MM ».

- **Comportement actuel → proposé** : décision anonyme et non datée → décideur et date conservés et affichés à l'auteur.
- **Justification** : lot validation (V-03/V-09 touchent déjà ces UPDATE) ; prérequis de toute traçabilité.
- **Ce que l'utilisateur verra** : dans « Mes notes », mention du valideur et de la date de décision.
- **Décision équipe** : à valider

<a id="m-07"></a>

### M-07 — Employé sans manager présenté comme « racine » · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **accepté** — libellé existant de l’interface, jamais renommé (règle 5 d’`AGENTS.md`) |
| Thème | T8 — Circuit métier |
| Module | organigramme |
| Référence | — |
| Type | bug-metier |
| Impact | Faible — libellé trompeur ; masque toutefois le blocage M-01.2 aux RH |
| Vraisemblance | Élevée — tout employé non rattaché, donc tout nouvel inscrit |
| Gravité | Moyenne |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (M-07) |

**Où** : `components/AdminConsole.tsx:174` (même option pour tous les rôles) ; aussi affichée à tort quand `managerId` pointe vers un utilisateur absent de la liste `managers` (`AdminConsole.tsx:69,169`, select contrôlé sans option correspondante → voir M-08).

**Constat** : « racine » n'a de sens que pour un manager (son valideur = RH) ; pour un employé, cela signifie « personne ».

**Scénario** : la RH voit « — aucun (racine) — » pour Bob et pense que c'est normal.

**Preuve** : ligne citée.

**Piste** : libellé selon le rôle (« à rattacher » + mise en évidence pour un employé) ; si M-01.2 est retenu, « validé par les RH » devient exact pour tous.

**Critère d'acceptation** : un employé sans manager n'est jamais libellé « racine » ; un `managerId` inconnu est signalé comme tel.

- **Comportement actuel → proposé** : « — aucun (racine) — » pour tous → libellé distinct pour un employé non rattaché.
- **Justification** : bug évident ; dépend de la décision sur M-01.2.
- **Ce que l'utilisateur verra** : libellé et mise en évidence différents dans l'organigramme `/hr`.
- **Décision équipe** : à valider

<a id="v-13-3"></a>

### V-13.3 — PDF accepté au formulaire mais ignoré par l'OCR · Moyenne

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **ouvert** — non tranché : message à l’écran ou OCR de la première page |
| Thème | T8 — Circuit métier (à confirmer à la consolidation) |
| Module | ocr |
| Référence | — |
| Type | choix-discutable |
| Impact | Faible — le pré-remplissage répond « Aucune information reconnue », la saisie manuelle reste possible |
| Vraisemblance | Élevée — tout reçu PDF |
| Gravité | Moyenne (tirée par la grille ; enjeu réel faible) |
| Effort estimé | S (exclusion) / M (rendu PDF) |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-13) |

**Où** : `src/lib/ocr.ts:4,113-115`, `src/app/expenses/page.tsx:225`.

**Constat** : le formulaire accepte `application/pdf` ; `suggestFields` renvoie `{}` sans erreur pour tout type hors image.

**Comportement actuel → proposé** : PDF → « Aucune information reconnue » → message explicite « pré-remplissage indisponible pour les PDF » (ou OCR du PDF). Justification : bug évident d'ergonomie. Décision équipe : à valider.

**Critère d'acceptation** : sur un PDF, l'utilisateur voit un message qui dit que le pré-remplissage ne s'applique pas aux PDF.

<a id="m-08"></a>

### M-08 — Subordonnés d'un manager rétrogradé laissés sans valideur · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — ROLE-02 (D14) |
| Thème | T8 — Circuit métier |
| Module | organigramme (secondaires : validation, auth) |
| Référence | — |
| Type | bug-metier |
| Impact | Moyen — les notes en attente des subordonnés n'ont plus de valideur et l'organigramme affiche « — aucun (racine) — » à tort |
| Vraisemblance | Faible — le rôle ne change aujourd'hui qu'en base ; **passe à Moyenne/Élevée dès que M-02 est implémenté** |
| Gravité | Faible (à réévaluer avec M-02) |
| Effort estimé | S (à inclure dans le correctif M-02) |
| Visible utilisateur | oui |
| Vérification | non vérifié |
| Origine | nouveau |

**Où** : rien ne nettoie `users.manager_id` quand le rôle du manager change ; `api/manager/expense-notes/route.ts:21` exige le rôle `manager` (après reconnexion, l'ancien manager reçoit 401) ; `api/hr/expense-notes/route.ts:29` exige que l'auteur soit `manager` racine (ses subordonnés ont un `manager_id`, donc exclus) ; `AdminConsole.tsx:69,169,174-181` : `managerId` absent de `managers` → le select affiche la 1re option « aucun (racine) ».

**Constat** : un manager repassé `employee` laisse ses subordonnés rattachés à lui ; leurs notes en attente ne sont visibles par personne, et l'écran RH ment sur leur rattachement. Pas de suppression de compte possible (FK sans `ON DELETE`, `migrations/…:18,27`) : la suppression n'est pas un cas atteignable.

**Scénario** : après M-02, la RH rétrograde Paul ; ses 4 subordonnés semblent « racine », leurs notes disparaissent des écrans.

**Preuve** : lignes citées (raisonnement ; à confirmer en phase 2 par `UPDATE users SET role='employee'` sur le manager de démo).

**Piste** : refuser la rétrogradation d'un manager qui a encore des subordonnés, ou les détacher/réaffecter dans la même transaction.

**Critère d'acceptation** : après changement de rôle d'un manager, aucun utilisateur n'a de `manager_id` pointant vers un non-manager.

- **Comportement actuel → proposé** : subordonnés orphelins silencieux → rétrogradation bloquée tant que l'équipe n'est pas réaffectée.
- **Justification** : lot M-02 (même route, même écran).
- **Ce que l'utilisateur verra** : message RH « réaffectez d'abord les N personnes rattachées ».
- **Décision équipe** : à valider

<a id="m-09"></a>

### M-09 — Date de dépense dans le futur acceptée · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **clos** — MET-06 (D20) |
| Thème | T8 — Circuit métier |
| Module | notes |
| Référence | — |
| Type | choix-discutable |
| Impact | Faible — note incohérente que le valideur peut rejeter |
| Vraisemblance | Moyenne — erreur de saisie ou suggestion OCR (`ddmmyy` → `2000+yy`, `lib/ocr.ts:91-95`) |
| Gravité | Faible |
| Effort estimé | S |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | nouveau (01-produit : « aucune borne ») |

**Où** : `api/expense-notes/route.ts:74` (seul `typeof === 'string'`) ; `expenses/page.tsx:192-200` (pas de `max`).

**Constat / Scénario** : une note datée de 2027 est acceptée et part en validation.

**Preuve** : lignes citées.

**Piste** : borne `≤ aujourd'hui` côté serveur (+ `max` côté formulaire), avec la validation de format de V-10 (T3).

**Critère d'acceptation** : POST avec une date future → 400 avec message ; date du jour acceptée.

- **Comportement actuel → proposé** : date libre → date future refusée.
- **Justification** : lot validation des entrées (V-10, T3).
- **Ce que l'utilisateur verra** : message d'erreur à la soumission ; sélecteur de date borné.
- **Décision équipe** : à valider

<a id="v-13-4"></a>

### V-13.4 — Extraction OCR du montant et de la date fragile · Faible

| Champ | Valeur |
|---|---|
| Statut (2026-10-29) | **accepté** — sortie OCR figée par le contrat (`tests/fixtures/ocr/`) |
| Thème | T8 — Circuit métier (à confirmer à la consolidation) |
| Module | ocr |
| Référence | — |
| Type | choix-discutable |
| Impact | Faible — suggestion erronée, que l'utilisateur doit vérifier (les champs restent éditables) |
| Vraisemblance | Moyenne — reçus avec sous-total, ou avec plusieurs dates |
| Gravité | Faible |
| Effort estimé | M |
| Visible utilisateur | oui |
| Vérification | confirmé (lecture) |
| Origine | cartographie (V-13) |

**Où** : `src/lib/ocr.ts:48-58` (première ligne contenant un mot-clé ; « sous-total » contient « total »), `src/lib/ocr.ts:79-103` (premier motif de date trouvé).

**Critère d'acceptation** : jeu de reçus de référence (sous-total puis total, date d'impression ou d'échéance) → montant total et date de dépense corrects.

## Hygiène

Points sans fiche individuelle (ne changent ni priorité ni lot). À traiter au passage, dans le lot qui touche le fichier.

| ID | Thème | Emplacement | Point |
|---|---|---|---|
| H-01 | T1 | `Makefile:14-15` | La cible `env` dit « génère AUTH_SECRET si besoin » mais ne génère rien (copie de `.env.example` avec `changeme-…`). À corriger avec V-08. |
| H-02 | T1 | `scripts/seed.mjs:15-19`, `:72`, `:109-111` | Mots de passe de démo de 6 à 11 caractères, inférieurs à la règle d'inscription (`hr1234`), affichés en console. Acceptable en dev ; à interdire hors dev. |
| H-03 | T1 | `src/lib/auth.ts:10-60` | Aucune défense CSRF explicite sur les routes `/api` mutantes (approve/reject/PUT manager) : repose entièrement sur `SameSite=Lax` par défaut. Défense en profondeur (vérifier `Origin`). |
| H-04 | T1 | `src/proxy.ts:7-8`, `:17` | `startsWith('/hr')` couvre aussi `/hrx…` ; les chemins se terminant par `.png`, `.svg`… échappent au proxy. Sans effet sur les données (pages `/manager`, `/hr` retestent le rôle, `/expenses` est client et l'API teste la session). |
| H-05 | T1 | `src/app/actions/auth.ts:13`, `src/utils/validators.ts:1` | Regex email très permissive (`a@b.c`, domaine avec point final `acme.fr.` = autre entreprise). |
| H-06 | T2 | `src/app/api/*/receipt-url/route.ts` (3) | Pas de `Cache-Control: no-store` sur la réponse qui contient l'URL pré-signée (jeton porteur 5 min, `src/lib/storage.ts:35`). |
| H-07 | T2 | `src/lib/storage.ts:35-37` | URL pré-signée sans `ResponseContentDisposition`/`ResponseContentType` : le type servi est celui déclaré par le client à l'upload (cf. V-10.3, T3). |
| H-08 | T3 | `src/app/actions/auth.ts:25-26`, `:68` | Nom sans longueur maximale ni filtrage des caractères de contrôle (borné à ~1 Mo par la limite des server actions). |
| H-09 | T3 | `src/app/api/expense-notes/route.ts:98` | Repli `path.extname(receipt.name)` inatteignable (déjà V-10, dernier point) ; s'il servait, ce serait une extension contrôlée par le client. |
| H-10 | T3 | `src/app/api/expense-notes/route.ts:93` | `description` stockée sans `trim()` alors que la validation l.76 se fait sur la version trimée. |
| H-11 | T3 | `src/app/api/hr/users/[id]/manager/route.ts:12` | Corps JSON invalide traité comme `managerId: null` (détachement silencieux) au lieu d'un 400. |
| H-12 | T4 | `migrations/1700000000001_init-schema.sql:13,18,27,32` | Aucun index sur les clés étrangères (`users.company_id`, `users.manager_id`, `expense_notes.user_id`) ni sur `status`, alors que toutes les requêtes de validation filtrent dessus |
| H-13 | T4 | `src/lib/db.ts:40-42` | Si `ROLLBACK` échoue (connexion perdue), son exception masque l'erreur d'origine ; `release()` sans argument d'erreur |
| H-14 | T4 | `scripts/seed.mjs:58-65`, `Makefile:45` | Le seed, relancé à chaque `make dev`, remet le rôle, l'entreprise et le manager des comptes démo : il écrase les changements faits dans l'app |
| H-15 | T4 | `scripts/seed.mjs:76-95` | Même séquence non atomique que V-10.1 ; une note créée avec `receipt_key = ''` n'est jamais réparée (l'existence est testée sur la description, l.77-81) |
| H-16 | T4 | `migrations/1700000000001_init-schema.sql:26` | `receipt_seq serial` sans `UNIQUE` ; si la séquence est réinitialisée (down/up, restauration) alors que le bucket est conservé, les nouveaux reçus écrasent d'anciens objets (pas d'écriture conditionnelle, `storage.ts:29-33`) |
| H-17 | T4 | `migrations/1700000000001_init-schema.sql:102-105` | La migration down ne supprime pas l'extension `pgcrypto` créée par le up (l.2) |
| H-18 | T4 | `src/app/expenses/page.tsx:155` | Total affiché calculé par somme de flottants (sans effet visible grâce au formatage, mais fragile) |
| H-19 | T4 | `migrations/1700000000001_init-schema.sql:11-20` | Aucune policy RLS sur `users` ni `companies`, alors que les commentaires présentent la RLS comme la garantie d'isolation (l.36-38) |
| H-20 | T5 | `src/lib/ocr.ts:130-132` | Toute panne de l'OCR (modèle introuvable, WASM) est convertie en suggestion vide : l'utilisateur voit « Aucune information reconnue » et rien ne signale la panne côté exploitation, hormis un `console.error` |
| H-21 | T5 | `src/lib/ocr.ts:5` | `TESSDATA_PATH` dépend de `process.cwd()` : si le serveur est lancé depuis un autre répertoire (déploiement standalone), l'OCR échoue en silence (H-T5-01) |
| H-22 | T5 | `src/lib/errors.ts:2` | Log non structuré, sans route, utilisateur ni identifiant de corrélation |
| H-23 | T5 | `.env.example:7-8` | `AUTH_TRUST_HOST` commenté : `next start` derrière un reverse proxy échoue à l'authentification (`UntrustedHost`) sans indication |
| H-24 | T5 | `src/lib/db.ts:11-20` | Pas de fermeture du pool à l'arrêt (SIGTERM), ni de route de santé pour un orchestrateur |
| H-25 | T5 | `next.config.ts:1-8` | Aucun réglage d'exploitation : `output`, en-têtes, `poweredByHeader` (le reste est en T7) |
| H-26 | T5 | `scripts/ensure-bucket.mjs:28-48` | Toute erreur de `HeadBucket` (pas seulement « bucket absent ») déclenche une création ; les identifiants invalides donnent 15 tentatives avant un message peu clair |
| H-27 | T6 | `package.json:2` | Nom de paquet « expense-io-version-b » (artefact d'exercice) |
| H-28 | T6 | `package.json:5-15`, `README.md:7` | Pas de script `test`, pas de champ `engines` alors que README exige Node 24+, pas de formateur (Prettier) |
| H-29 | T6 | `expenses/page.tsx:70`, `AdminConsole.tsx:64`, `PendingApprovalsPanel.tsx:38` | Règle `react-hooks/set-state-in-effect` désactivée 3 fois pour le même motif fetch-dans-useEffect |
| H-30 | T6 | `next.config.ts:5` | `agentRules: false` sans explication |
| H-31 | T6 | `tsconfig.json:2-18`, `app/actions/auth.ts:61`, `{manager,hr}/…/{approve,reject}/route.ts:32` | `noUncheckedIndexedAccess` absent : `rows[0]` supposé défini sans test |
| H-32 | T6 | `lib/auth.ts:54-55` | Casts `token.id as string` / `token.role as …` masquent un JWT incomplet |
| H-33 | T6 | `scripts/seed.mjs:34-43,90`, `scripts/ensure-bucket.mjs:15-23`, `lib/storage.ts:8-16,26` | Seed et ensure-bucket redupliquent la config S3 et le format de clé de `storage.ts` (diverge si `receiptKeyFor` change) |
| H-34 | T6 | `lib/ocr.ts:46,78` | Fonctions pures OCR non exportées (empêche le test unitaire) |
| H-35 | T7 | `.env.example:6` | Valeur par défaut `AUTH_SECRET=changeme-…` utilisable telle quelle, sans contrôle au démarrage |
| H-36 | T7 | `Makefile:11-12` | `npm install` au lieu de `npm ci` : installation non reproductible, le lockfile peut dériver |
| H-37 | T7 | `package.json:16-40` | Plages `^` larges (`@types/react ^19`, `eslint ^9`, `typescript ^5`) ; pas de champ `engines` ni de `.nvmrc` (Node 24.16 utilisé localement) |
| H-38 | T7 | `package.json:22,35`, `scripts/seed.mjs:8`, `scripts/ensure-bucket.mjs:8` | `node-pg-migrate` est en `dependencies`, alors que `dotenv`, importé par les scripts d'exploitation, est en `devDependencies` : une installation `--omit=dev` casse le seed et `ensure-bucket` |
| H-39 | T7 | `docker-compose.yml:3` | `postgres:16-alpine` est un tag flottant, alors que LocalStack est épinglé (l.24) |
| H-40 | T7 | `src/lib/errors.ts:2`, `src/lib/ocr.ts:131` | `console.error` de l'objet d'erreur complet : les erreurs `pg` incluent `detail`, qui peut contenir les valeurs en cause (email en conflit, etc.), donc des données personnelles dans les logs |
| H-41 | T7 | `src/lib/storage.ts:29-33` | `PutObject` sans chiffrement côté serveur explicite (`ServerSideEncryption`) ; dépend du réglage par défaut du fournisseur |
| H-42 | T7 | `src/app/layout.tsx:3` | `next/font/google` : le build a besoin du réseau (polices auto-hébergées ensuite, pas d'appel à Google à l'exécution) |
| H-43 | T8 | `components/AdminConsole.tsx:166` | Rôle affiché brut et en anglais (« Employee », « Manager ») |
| H-44 | T8 | `app/layout.tsx:39-57` | Pas de lien « Mes notes » dans la barre (retour via le logo) |
| H-45 | T8 | `components/PendingApprovalsPanel.tsx:78-79` | Texte « employés qui vous sont rattachés » alors que des managers peuvent l'être aussi |
| H-46 | T8 | `components/AdminConsole.tsx:226` | Repli sur l'id tronqué si l'auteur d'une note RH n'est pas dans l'annuaire |
| H-47 | T8 | `api/manager/expense-notes/route.ts:29` | Changer le manager d'un employé déplace ses notes en attente chez le nouveau (comportement documenté, assumé ; à garder en tête pour M-05.1) |

## Vérifié sans constat

Alimente la checklist de couverture OWASP de [11-methode.md](11-methode.md#checklist-de-couverture-owasp-top-10-2025).

### T1

| Point | Résultat |
|---|---|
| Redirection ouverte (`callbackUrl`) | `redirect` non surchargé dans `src/lib/auth.ts:44-59` → comportement par défaut d'Auth.js (même origine uniquement). Les server actions utilisent un `redirectTo` fixe (`src/app/actions/auth.ts:72`, `:94`). |
| Message d'échec de connexion | Générique (`src/app/actions/auth.ts:97`), `authorize` renvoie `null` dans les deux cas (`src/lib/auth.ts:35`, `:38`). |
| Stockage des mots de passe | bcrypt coût 12 (`src/app/actions/auth.ts:65`). |
| CSRF | Server actions : contrôle d'origine natif de Next.js ; `/api/auth/*` : jeton CSRF Auth.js ; autres routes `/api` : pas de jeton, mais cookie de session `SameSite=Lax` par défaut (non surchargé, `src/lib/auth.ts:10-60`) → POST/PUT inter-sites sans cookie. Reste un risque depuis un sous-domaine frère (même site) : voir H-T1-03. |
| Couverture authentification des routes `/api` | Les 14 handlers (hors `/api/auth`) appellent `auth()` en tête (relu un par un) ; `proxy.ts` les exclut volontairement (`src/proxy.ts:17`). |

### T2

| Point | Résultat |
|---|---|
| `GET /api/expense-notes`, `[id]/receipt-url` | Filtre `user_id = moi` (`src/app/api/expense-notes/route.ts:46`, `[id]/receipt-url/route.ts:16`). |
| Manager liste / approve / reject | Filtre `u.manager_id = moi` (`src/app/api/manager/expense-notes/route.ts:29`, `[id]/approve/route.ts:17`, `[id]/reject/route.ts:17`). Pas de filtre entreprise, correct tant que V-04.1 est corrigé. |
| RH liste / approve / reject / reçu | Filtre racine + même entreprise (4 routes, cf. V-03). |
| `GET /api/hr/users`, cible du `PUT` | Filtre entreprise (`src/app/api/hr/users/route.ts:15`, `[id]/manager/route.ts:24`) ; un RH ne peut pas se rattacher lui-même ni rattacher un autre RH (`:24`). |
| Pages `/manager`, `/hr` | Test de rôle serveur (`src/app/manager/page.tsx:7`, `src/app/hr/page.tsx:7`). |

### T3

| Point | Résultat |
|---|---|
| Autres requêtes SQL | Toutes paramétrées (`$1…`) : `src/lib/auth.ts:33`, `src/app/actions/auth.ts:36-69`, les 14 handlers, `scripts/seed.mjs`. |
| XSS | Aucun `dangerouslySetInnerHTML` ni `innerHTML` dans `src/` ; les champs utilisateur (nom, email, description) sont rendus par React, donc échappés. `window.open` n'ouvre que l'URL renvoyée par l'API (`src/app/expenses/page.tsx:152` et équivalents). |
| Clé S3 / traversée de chemin | Clé = séquence + extension issue d'une table fixe (`src/app/api/expense-notes/route.ts:98`, `src/lib/storage.ts:26`) ; le nom de fichier client n'est jamais utilisé en pratique. |
| Server actions inscription/connexion | Types vérifiés (`src/app/actions/auth.ts:23-30`, `:89`) ; corps limité à 1 Mo par défaut par Next. |

### T4

- Fuite de clients `pg` : `withUserScope` libère dans `finally` (`src/lib/db.ts:43-45`) ; toutes les autres requêtes passent par `pool.query`, qui libère automatiquement. Aucune fuite trouvée.
- Migrations : un seul fichier, appliqué une fois grâce à la table de suivi de `node-pg-migrate` ; pas de problème d'idempotence en usage normal.
- Montants côté serveur : `numeric` relu par `Number.parseFloat` (`route.ts:22`) : sans perte jusqu'à 10 chiffres significatifs.
