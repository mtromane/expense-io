# 21 · Décisions d'architecture à prendre en équipe : pour et contre

* Pour qui : l'équipe, en séance de décision. Une décision par section, à trancher puis à reporter dans l'ADR correspondante.
* **D1 à D19 validées en équipe le 2026-10-28** (réunion d'équipe ; ADR-001 à ADR-019 acceptées). D13 et D14 avec un ajout : une RH peut en nommer une autre (voir leur section). D15 et D17 s'écartent de la recommandation initiale (D13 la suit désormais en entier) ; D15 change des messages du contrat (exception de la règle 5 d'`AGENTS.md`).
* **D20 proposée le 2026-10-29** (revue de l'audit avant la soutenance : comportements « sans arbitrage » restés ouverts), à valider en revue de la PR ; ADR-020.
* Source : §9 de [20-audit-architecture-arla.md](20-audit-architecture-arla.md), complété des décisions implicites que le jury risque de poser en question.
* Grille utilisée (cours ARLA) : délai, coût, maturité de l'équipe, sécurité, performance (0 au barème si plus lent), contrat figé par les tests, valeur pour la soutenance.
* Les points métier (`MET-01` à `MET-09`, lot 8) sont désormais dans le périmètre : le métier doit être totalement fonctionnel. Inventaire complet dans [22-comportements-a-corriger.md](22-comportements-a-corriger.md) ; seuls ceux qui demandent un choix figurent ici (D12 à D19).

## Récapitulatif

| # | Décision | Options | Recommandation | Urgence |
|---|---|---|---|---|
| D1 | Fusion de `tests/p2-unitaires` | maintenant / plus tard | maintenant | bloque tout |
| D2 | Découpage de l'application | monolithe modulaire / microservices / statu quo | monolithe modulaire | avant D3 |
| D3 | Étendue de la refacto (`V-31`) | strict nécessaire / modules complets | modules complets | avant de coder |
| D4 | Couche `src/domain` (`V-01`) | supprimer / ranimer | ranimer | avant l'étape 2 |
| D5 | Règles d'architecture en CI | aucune / avertissement / bloquantes | avertissement puis bloquantes | étape 0 |
| D6 | RLS (`SEC-09`) | effective / retirée | effective | avant l'étape 6 |
| D7 | `company_id` sur `expense_notes` | oui par trigger / non | oui | avec D6 |
| D8 | Socle asynchrone préparé à l'avance | aucun code / socle outbox / broker | aucun code, recette prête dans `AGENTS.md` | avant la fin de migration |
| D9 | Exécution du worker (si outbox un jour) | script séparé / `after()` / les deux | les deux | avec D8 |
| D10 | Fonctionnalité du live coding | sans objet : imposée par les professeurs | préparer `AGENTS.md` en fin de migration | fin de migration |
| D11 | Types de réponse | générés depuis OpenAPI / écrits à la main | à la main d'abord | faible |
| D12 | Incohérence 401 / 403 | conserver / corriger | **Choix : corriger** (401 non connecté, 403 mauvais rôle) | [ADR-012](../architecture/adr/ADR-012-codes-401-403.md) |
| D13 | Qui valide les notes d'une RH (`M-01.1`) | autre RH / manager rattaché / les deux / interdire | **Choix : manager rattaché, sinon autre RH** (recommandation complète, réunion du 28/10) | [ADR-013](../architecture/adr/ADR-013-validation-des-notes-rh.md) |
| D14 | Changement de rôle (`M-02`, `M-08`) | nouvelle route / route existante étendue / implicite | **Choix : nouvelle route** (employé, manager ou RH), jamais son propre rôle ni la dernière RH, refus s'il reste des subordonnés | [ADR-014](../architecture/adr/ADR-014-changement-de-role.md) |
| D15 | Langue des messages d'erreur (`B-06`) | écran seul / API / codes stables | **Choix : API entièrement en anglais** (écart avec la recommandation), écran inchangé | [ADR-015](../architecture/adr/ADR-015-messages-api-en-anglais.md) |
| D16 | Domaines publics (`M-03`) | liste de refus / accepter / invitation | **Choix : liste de refus** | [ADR-016](../architecture/adr/ADR-016-domaines-publics.md) |
| D17 | Total « Mes notes » (`M-04`) | hors rejetées / par statut | **Choix : total par statut** (écart avec la recommandation) (ajouté, texte existant conservé) | [ADR-017](../architecture/adr/ADR-017-total-par-statut.md) |
| D18 | Code de `Invalid manager` | 409 / 422 | **Choix : garder 409**, aussi pour les cycles | [ADR-018](../architecture/adr/ADR-018-invalid-manager-409.md) |
| D19 | Statut de la page « Accès réservé » | 200 / 403 | **Choix : 403** | [ADR-019](../architecture/adr/ADR-019-acces-reserve-403.md) |
| D20 | Comportements « sans arbitrage » restés ouverts (`M-06`, `V-12.3`, `M-09`) | corriger / laisser | **Choix : corriger** (proposé le 2026-10-29, à valider en revue de PR) | [ADR-020](../architecture/adr/ADR-020-comportements-sans-arbitrage.md) |

---

## D1 · Fusionner `tests/p2-unitaires` maintenant ?

Contexte : la branche ajoute Vitest et 115 tests unitaires sur le code actuel (`lib/`, `domain/`, `utils/`, `proxy`). Elle n'est pas sur `main`.

| Option | Pour | Contre |
|---|---|---|
| **Maintenant** | Filet sur les modules qu'on va déplacer ; preuve de testabilité dès la première PR ; évite un conflit de fusion plus tard, quand `src/` aura bougé ; `make test` inclut déjà les unitaires dans la doc de la branche | Fige l'API de `ExpenseNote`, `User`, `withUserScope`, `utils/*` : on ne peut plus les redessiner librement (seul le chemin d'import peut changer) ; quelques tests de plus à maintenir pendant la refacto |
| Plus tard | Liberté totale de redessiner le domaine | Refacto sans filet unitaire ; fusion douloureuse quand les fichiers auront bougé ; on perd l'argument « testabilité démontrée » sur les premières étapes |

Recommandation : **maintenant**. La contrainte de figer l'API est faible (le domaine actuel est petit et correct) et elle force à ranimer plutôt que réécrire, ce qui sert D4.

## D2 · Monolithe modulaire, microservices ou statu quo ?

Contexte : une seule application Next.js, une base, une équipe étudiante, un contrat figé (routes, ports 3000 / 5433 / 4567, scripts npm).

| Option | Pour | Contre |
|---|---|---|
| **Monolithe modulaire** | Un seul déployable, `make dev` inchangé ; respecte le contrat sans effort ; modules extractibles plus tard si besoin ; adapté à la maturité et à la taille de l'équipe ; aucun coût réseau ajouté (perf) | Les frontières entre modules ne tiennent que si on les vérifie (d'où D5) ; scalabilité par module impossible (non requise aujourd'hui) |
| Microservices | Déploiement et scalabilité indépendants ; isolation forte des pannes | Contrat quasi impossible à tenir (ports, scripts, une seule URL) ; latence réseau entre services, donc risque de 0 au barème perf ; traçabilité distribuée, monitoring, déploiement multiples à construire ; hors de proportion avec la charge mesurée |
| Statu quo (pas d'architecture) | Zéro risque de régression, zéro effort | Le cours demande une absence d'architecture **assumée** : ici elle est subie et cause des failles réelles (`V-06`, `V-09`) ; aucune matière pour la soutenance |

Recommandation : **monolithe modulaire** (ADR-001). Les microservices sont la question piège classique du jury : avoir l'argumentaire écrit vaut des points.

## D3 · Étendue de la refacto (`V-31`)

Contexte : l'audit sécurité coté `V-31` en « à décider selon l'appétit de l'équipe ». Les 17 défauts peuvent se corriger sans refacto.

| Option | Pour | Contre |
|---|---|---|
| Strict nécessaire (corriger les défauts dans les routes) | Rapide ; risque de régression minimal ; peu de fichiers touchés | Les doublons restent (4 routes de décision, 7 mappings, 12 contrôles de rôle) ; aucun principe du cours démontré ; le live coding se fera dans un code qui ne respecte aucune guideline |
| **Modules complets** (Clean Architecture légère, tous les endpoints migrés) | C'est le cœur de la note ARLA ; chaque défaut corrigé prouve un principe ; le live coding s'appuie sur des ports existants ; les doublons disparaissent | Plus long (estimation : 8 étapes, une PR chacune) ; risque de régression, couvert par 181 tests de parité et le contrat OpenAPI ; risque perf si un use case fait plus de requêtes qu'avant |
| Intermédiaire (modules `approval` et `expenses` seulement) | Montre la démarche sur les deux domaines riches ; temps maîtrisé | Codebase hétérogène à la soutenance, avec deux façons d'écrire une route ; le jury peut ouvrir une route non migrée |

Recommandation : **modules complets**, en commençant par `approval` (le plus de règles et de doublons). Si le temps manque, s'arrêter proprement à l'option intermédiaire et l'assumer dans une ADR.

## D4 · Supprimer ou ranimer `src/domain`, `src/ports`, `src/adapters` (`V-01`)

Contexte : ces fichiers ne sont importés nulle part. L'audit sécurité propose de les supprimer.

| Option | Pour | Contre |
|---|---|---|
| Supprimer | Moins de code ; plus de confusion pour un lecteur ; repart d'une page blanche | Casse les unitaires de `tests/p2-unitaires` (interdit de modifier les assertions) ; on réécrira presque le même code ; on perd le récit « piège fréquent démasqué puis corrigé » |
| **Ranimer et brancher** | Compatible avec les unitaires existants ; démonstration directe du piège du cours (terminologie juste, métier couplé) ; peu de code nouveau | On garde une API qu'on n'aurait pas forcément dessinée ainsi ; le message d'erreur du domaine (`Cette note a déjà été tranchée.`) diffère du contrat (`Already decided`) et doit être traduit par l'adapter HTTP |

Recommandation : **ranimer**. Mettre à jour la piste de `V-01` dans `12-constats.md` pour tracer le changement d'avis.

## D5 · Règles d'architecture vérifiées en CI

Contexte : la règle de dépendance (domaine et use cases sans import de `pg`, `@aws-sdk`, `tesseract.js`, `next`) peut être vérifiée par ESLint (`no-restricted-imports`) ou rester une convention.

| Option | Pour | Contre |
|---|---|---|
| Aucune règle | Rien à configurer | L'architecture redevient une convention qui dérive, comme dans l'existant ; l'agent IA du live coding n'a aucun garde fou |
| Avertissement | N'interrompt pas la migration pendant que l'ancien code coexiste | Les avertissements s'ignorent |
| **Avertissement puis bloquantes** à la fin de la migration | Progressif pendant la transition, puis l'architecture est **prouvée** par `npm run lint` ; très bon argument en soutenance et garde fou pour le live coding | Un peu de configuration ; ajustements quand une exception légitime apparaît |

Recommandation : **avertissement dès l'étape 0, bloquant à l'étape 8**. Attention : `eslint.config.mjs` est à nous, mais `.github/` appartient à la team Tests ; le job `static` lance déjà `npm run lint`, rien à changer côté CI.

## D6 · RLS effective ou retirée (`SEC-09`)

Contexte : la RLS existe mais l'app se connecte en superuser, donc elle ne sert à rien. La team Tests accepte les deux issues.

| Option | Pour | Contre |
|---|---|---|
| **Rendre effective** (`SET LOCAL ROLE` sur un rôle sans privilège, via `APP_DB_ROLE`, `DATABASE_URL` inchangée) | Isolation structurelle demandée par le cours : une requête oubliée ne fuit plus ; défense en profondeur avec le repository scopé ; ferme la portée globale de `V-07` et `V-06` | Policies à compléter (`UPDATE` propriétaire, RH filtré par entreprise) sous peine de casser la création de note ; coût par requête à mesurer (`make test-perf`) ; nouvelle variable d'environnement à ajouter (pas de renommage, donc autorisé) ; `seed-perf.mjs` doit continuer à écrire en superuser |
| Retirer la RLS | Plus simple ; aucune surprise de performance ; une seule source de vérité (le code) | L'isolation repose à nouveau sur le seul code applicatif, ce que le cours déconseille ; supprimer un test avec la team Tests ; argumentaire faible face au jury sur le multitenant, pire incident possible en B2B |

Recommandation : **rendre effective**, livrée dans le même lot que D7 et seulement après que toutes les écritures passent par les repositories.

## D7 · Ajouter `company_id` sur `expense_notes`

Contexte : l'entreprise d'une note est aujourd'hui retrouvée par jointure sur `users`, recopiée dans 5 routes RH.

| Option | Pour | Contre |
|---|---|---|
| **Oui, rempli par trigger `BEFORE INSERT`** | Policies RLS simples et rapides ; index direct (`PERF-02`) ; aucun script de seed à modifier grâce au trigger | Dénormalisation : la colonne doit rester cohérente si un utilisateur changeait d'entreprise (cas impossible aujourd'hui, à verrouiller par contrainte) ; une migration de plus ; logique cachée dans un trigger, à documenter |
| Oui, rempli par l'application | Logique visible dans le code | Casse `scripts/seed.mjs` et `scripts/seed-perf.mjs` (colonne `NOT NULL` absente des `INSERT`), or `seed-perf` doit rester compatible avec la baseline |
| Non | Schéma inchangé, aucun risque de migration | Policies RLS avec sous requêtes coûteuses ; filtres d'entreprise par jointure partout |

Recommandation : **oui, par trigger**, dans une nouvelle migration. Prévenir la team Tests même si leurs scripts ne bougent pas.

## D8 · Asynchrone : préparer un socle à l'avance ou non

Contexte : il n'existe aucun asynchrone aujourd'hui et aucune fonctionnalité existante n'en a besoin (l'OCR reste synchrone, ADR-004). La fonctionnalité du live coding est imposée par les professeurs : elle **pourrait** demander un traitement asynchrone (notification, appel à un service externe), ou non.

| Option | Pour | Contre |
|---|---|---|
| **Aucun code, mais la recette prête** (ADR-005 rédigée, pattern outbox décrit dans `AGENTS.md`) | KISS : pas de code sans usage ; cohérent avec la critique de `V-01` (code mort) ; l'agent sait quoi construire si le besoin apparaît ; argument fort au jury (« on n'a pas construit ce qui ne sert pas ») | Si la fonctionnalité imposée exige de l'asynchrone, la table outbox, le worker, l'idempotence et la DLQ sont à coder en direct : difficile à finir en 15 minutes |
| Socle outbox codé à l'avance, sans consommateur | Le jour J, il ne reste qu'à brancher un événement et un handler ; démonstration rapide des bonnes pratiques | Exactement le travers reproché à l'existant : une infrastructure que rien n'utilise ; à justifier devant le jury ; à maintenir et tester sans cas réel |
| Broker (Redis, RabbitMQ, SQS) | Pub/Sub natif, ack et DLQ fournis | Nouveau service dans `docker-compose` et en CI ; double écriture base + broker sans outbox ; hors de proportion ; équipe peu habituée à l'opérer |

Recommandation : **aucun code, recette prête**. Si l'équipe juge le risque du jour J trop élevé, l'option « socle à l'avance » se défend à condition de l'assumer dans l'ADR comme une préparation volontaire, pas comme une architecture spéculative.

## D9 · Où tourne le worker de l'outbox

Contexte : ne se pose que si une fonctionnalité introduit l'outbox (D8). À trancher à l'avance pour que la recette de `AGENTS.md` soit complète.

| Option | Pour | Contre |
|---|---|---|
| Script séparé (`npm run worker`) | Processus dédié, reprise propre, logs séparés ; modèle Producer / Consumer clair à montrer | Un processus de plus à lancer en dev, en CI et en démo ; nouveau script npm (ajout autorisé, à signaler à la team Tests) |
| `after()` de Next.js à la fin de la requête | Rien à lancer en plus ; latence de notification quasi nulle | Pas de reprise si le processus tombe ; mélange traitement de fond et serveur web |
| **Les deux** : `after()` pour la rapidité, script pour la reprise | Rapide dans le cas nominal, fiable en cas d'échec ; l'idempotence rend le double passage sans danger | Deux chemins à tester ; à bien expliquer |

Recommandation : **les deux**, c'est aussi la meilleure illustration de l'idempotence (« le même message peut être traité deux fois sans doublon »).

## D10 · Fonctionnalité du live coding : sans objet

La fonctionnalité est imposée par les professeurs le jour de la soutenance. Rien à choisir ni à coder avant. La préparation (un `AGENTS.md` soigné, le guide « ajouter une fonctionnalité », les règles ESLint bloquantes, une répétition à blanc) se fait en fin de migration : voir §8 de [20-audit-architecture-arla.md](20-audit-architecture-arla.md). Identifiant conservé pour ne pas renuméroter.

## D11 · Types de réponse générés depuis OpenAPI ou écrits à la main

| Option | Pour | Contre |
|---|---|---|
| Générés (`openapi-typescript`) | Contract First réel : le contrat est la source des types ; partagés entre serveur et client ; `make api-diff` prouve l'absence de rupture | Dépendance de dev en plus ; étape de génération à maintenir ; peu de gain sur 14 endpoints |
| **À la main d'abord** | Immédiat ; les tests de contrat vérifient déjà chaque réponse | Le type peut diverger du contrat sans que le compilateur le voie (les tests le verront) |

Recommandation : **à la main**, et générer seulement s'il reste du temps en fin de migration. Faible enjeu.

## D12 · Incohérence 401 / 403 : corriger

Contexte : mauvais rôle donne `401` sur `/api/manager/*`, anonyme donne `403` sur `/api/hr/*`. Les tests de parité figent ce comportement, mais le professeur attend que la refacto corrige ce genre de bizarrerie (voir [22-comportements-a-corriger.md](22-comportements-a-corriger.md)).

| Option | Pour | Contre |
|---|---|---|
| Conserver | Aucun test de parité à toucher | Contraire au standard HTTP ; très probablement un des tests rouges du professeur ; contredit la consigne « métier totalement fonctionnel » |
| **Corriger** : `401` si non connecté, `403` si connecté sans le rôle | Standard (RFC 9110) ; une seule ligne dans la garde centralisée au lieu de 13 fichiers : démonstration directe du bénéfice de la refacto | Cellules de `authz-matrix.ts` à faire évoluer par la team Tests ; un client qui se fierait au `401` pour rediriger vers la connexion (aucun dans le code) |

Recommandation : **corriger**, en passant les cellules concernées en défauts (`fixed: false`) avant le correctif, pour garder le cycle rouge → vert.

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** 401 si non connecté, 403 si connecté sans le rôle, sur toutes les routes `/api/manager/*` et `/api/hr/*`. Défauts `AUTHZ-01` et `AUTHZ-02`.

## D13 · Qui valide les notes d'une RH (`M-01.1`)

Contexte : une entreprise n'a qu'une RH aujourd'hui. Elle ne peut ni se valider elle même (séparation des pouvoirs) ni être rattachée à un manager (l'annuaire l'exclut).

| Option | Pour | Contre |
|---|---|---|
| Une autre RH de la même entreprise | Logique métier claire ; même file que les autres notes RH | Impossible tant qu'on ne peut pas nommer une seconde RH : impose d'étendre `M-02` au rôle `hr_admin` |
| **La RH peut être rattachée à un manager**, qui valide ses notes comme pour un employé | Réutilise le circuit existant ; aucune nouvelle notion | Un manager valide sa RH : hiérarchie inversée dans certaines entreprises ; sans manager rattaché, la note reste bloquée (à signaler à l'écran) |
| Les deux : manager rattaché sinon autre RH | Couvre tous les cas | Deux règles à implémenter et tester |
| Interdire la soumission de notes aux RH | Simple | Retire une fonctionnalité ; un test du professeur qui fait soumettre une RH échoue |

Recommandation : **rattachement à un manager**, avec « autre RH » ajouté si `M-02` permet de nommer plusieurs RH. Dans tous les cas, jamais d'auto validation.

**Choix (2026-10-26, validé en équipe le 2026-10-28, complété le même jour) :** la recommandation complète. Une RH rattachée à un manager est validée par ce manager ; une RH sans manager est validée par n'importe quelle autre RH de son entreprise ; jamais par elle-même. Sans manager ni autre RH, ses notes restent en attente et la console l'indique. Défauts `MET-03`, `MET-10` ; ADR-013.

## D14 · Forme du changement de rôle (`M-02`, `M-08`)

| Option | Pour | Contre |
|---|---|---|
| **Nouvelle route `PUT /api/hr/users/:id/role`** + menu de rôle dans la console RH | Ajout pur : aucune route existante ne change ; facile à tester ; même garde et même scoping que le rattachement | Une route de plus au contrat ; rôle figé dans le JWT jusqu'à reconnexion (`V-19`) |
| Étendre `PUT /api/hr/users/:id/manager` pour accepter un rôle | Pas de nouvelle route | Change le contrat d'une route existante ; mélange deux intentions |
| Promotion automatique au premier rattachement d'un subordonné | Aucune interface à ajouter | Comportement implicite, surprenant ; impossible de rétrograder |

Pour la rétrogradation d'un manager qui a des subordonnés (`M-08`) :

| Option | Pour | Contre |
|---|---|---|
| **Refuser** (`409`) tant qu'il a des subordonnés | Simple, explicite, aucune donnée modifiée en silence | La RH doit d'abord réaffecter à la main |
| Détacher les subordonnés dans la même transaction | Une seule action pour la RH | Leurs notes en attente basculent vers la RH sans qu'elle l'ait voulu |

Recommandation : **nouvelle route** et **refus** de la rétrogradation tant qu'il reste des subordonnés. Traiter `V-19` en même temps (relire le rôle en base à chaque requête, ou raccourcir la session), sinon une promotion n'a d'effet qu'après reconnexion.

**Choix (2026-10-26, validé en équipe le 2026-10-28, complété le même jour) :** nouvelle route `PUT /api/hr/users/:id/role` (`employee`, `manager` ou `hr_admin` : une RH peut en nommer une autre) et boutons de rôle dans la console RH, plus `GET /api/hr/admins` pour la section « Équipe RH ». Refusés en `409` : changer son propre rôle (`Cannot change own role`), rétrograder la dernière RH (`Last HR admin`), retirer son rôle à un manager qui a encore des subordonnés (`Manager has direct reports`). Un manager sans manager rétrogradé voit ses notes aller à la RH (`MET-02`). Le rôle est relu en base pour tout contrôle de rôle (`V-19`) : une promotion prend effet sans reconnexion. Tout passe par la transaction verrouillée par entreprise. Défauts `ROLE-01` à `ROLE-07` ; ADR-014.

## D15 · Langue des messages d'erreur (`B-06`, `V-15.2`)

| Option | Pour | Contre |
|---|---|---|
| **Traduire à l'écran, garder l'API** | Aucun risque pour les tests API ; l'utilisateur voit du français | API incohérente (`Champs invalides` et `Not found` côte à côte) |
| Tout passer en français dans l'API | Cohérent | Casse tout test qui lit le message anglais (les nôtres, probablement ceux du professeur) ; contrat à réécrire |
| Codes d'erreur stables (`ALREADY_DECIDED`) + message traduit | Propre et durable | Change la forme JSON du contrat ; le plus coûteux |

Recommandation : **traduire à l'écran**, sauf indication contraire du professeur.

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** tous les messages d'erreur de l'**API** passent en anglais (`Invalid fields`, `Receipt file type not allowed`, `File too large`), cohérents avec `Not found`, `Already decided`, `Invalid manager`. L'**écran** garde ses textes actuels. Défaut `API-01`.

## D16 · Domaines de messagerie publics (`M-03`, `MET-01`)

| Option | Pour | Contre |
|---|---|---|
| **Refuser l'inscription sur une liste de domaines publics** | Ferme le scénario « premier inscrit sur gmail.com devient RH de tous les suivants » ; simple | Liste à maintenir ; un vrai client en adresse publique ne peut plus s'inscrire ; nouveau message d'erreur à l'écran |
| Accepter, mais une entreprise par utilisateur sur ces domaines | Personne n'est bloqué | Chaque utilisateur gmail devient RH de sa propre entreprise vide : produit absurde |
| Invitation par la RH | Solution de fond | Hors de portée (pas d'email dans la stack, `V-17`) |

Recommandation : **liste de refus**, message explicite, en ajout (aucun texte existant modifié).

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** inscription refusée sur une liste de domaines de messagerie publics, avec un message explicite ajouté au formulaire. Défaut `MET-01`.

## D17 · Total « Mes notes » (`M-04`)

| Option | Pour | Contre |
|---|---|---|
| **Exclure les notes rejetées du total** | Correction minimale ; le texte reste identique quand aucune note n'est rejetée (le test `employee.spec.ts:22` reste vert) | Le total ne dit plus combien a été demandé au total |
| Un total par statut | Plus informatif | Change le texte affiché, donc les tests qui le ciblent |

Recommandation : **exclure les rejetées**, sans changer le format du texte.

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** total par statut (en attente, approuvées, rejetées) **ajouté** sous le total existant, dont le texte ne change pas. Défaut `UI-01`.

## D18 · Code de `Invalid manager` (`B-05`)

| Option | Pour | Contre |
|---|---|---|
| **Garder `409`** | Défendable (conflit avec l'état de l'organigramme : cycle, auto rattachement) ; aucun test à toucher | Un validateur strict pourrait attendre `422` |
| Passer en `422` | Sémantique « entrée invalide » | Change le contrat sans bénéfice métier ; `hr.spec.ts` à modifier |

Recommandation : **garder `409`** et l'utiliser aussi pour les cycles (`V-04.2`).

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** garder `409 Invalid manager`, et l'utiliser aussi pour refuser un cycle hiérarchique (`V-04.2`). Défaut `MET-04`.

## D19 · Statut de la page « Accès réservé » (`B-04`)

| Option | Pour | Contre |
|---|---|---|
| Garder `200` | Rien à faire ; texte et E2E inchangés | Un test qui vérifie le statut HTTP attendrait `403` |
| **Même page, statut `403`** | Standard ; texte inchangé, donc `guards.spec.ts` reste vert | Dépend de ce que Next.js 16 permet proprement (`forbidden()`), à vérifier |

Recommandation : **`403` si Next.js le permet sans changer le rendu**, sinon garder `200` et l'assumer. Faible priorité.

**Choix (2026-10-26, validé en équipe le 2026-10-28) :** même page et même texte, statut `403` (`forbidden()` de Next.js). Défaut `AUTHZ-03`.

## D20 · Comportements « sans arbitrage » restés ouverts (`M-06`, `V-12.3`, `M-09`)

Contexte : [22-comportements-a-corriger.md](22-comportements-a-corriger.md) classe ces comportements « arbitrage : non », la cible faisant consensus. Mais la règle 5 d'`AGENTS.md` n'autorise que les options tranchées ici : la revue de l'audit du 2026-10-29 les a trouvés ni au registre ni corrigés. `M-06` est coté Haute et se trouve sur le parcours le plus probable des tests du professeur (22 §1).

| Comportement | Cible retenue | Alternative écartée |
|---|---|---|
| `M-06` : le manager voit l'id tronqué de l'auteur | champ `authorName` **ajouté** à `GET /api/manager/expense-notes`, nom affiché dans la colonne « Employé » ; une seule requête SQL | route d'annuaire pour le manager : une requête de plus à l'écran, une route de plus au contrat |
| `V-12.3` : emails sensibles à la casse | casse ignorée à l'inscription et à la connexion, unicité sur `lower(email)` (index unique), email stocké tel que saisi | minuscules à l'écriture : l'email affiché changerait |
| `M-09` : date de dépense future acceptée | `400 Invalid fields` au-delà de demain (UTC), un jour de marge pour les fuseaux | refus dès demain (bloque les fuseaux en avance sur UTC) ; attribut `max` (le navigateur bloque l'envoi sans message de l'application) |

Pour `M-09`, le test de parité `tests/api/integrity.spec.ts` soumettait une note datée du 2026-12-31 : sa date passe au 2025-12-31 (évolution voulue, même intention). Un test caché qui soumettrait une date postérieure à demain échouerait : risque accepté par l'équipe, le constat étant un défaut de saisie réel.

**Choix (2026-10-29, team Tests, à valider en revue de la PR) :** corriger les trois. Défauts `MET-08`, `MET-05`, `MET-06` ; ADR-020. Restent sans code, faute d'arbitrage : longueur de description et montants à plus de deux décimales (`MET-06`), décideur et date de décision (`M-05.1`).

---

## Après la séance

* Reporter chaque décision dans son ADR (`docs/architecture/adr/`), au format contexte, décision, alternatives, conséquences.
* Mettre à jour `20-audit-architecture-arla.md` §9 avec les choix retenus.
* Prévenir la team Tests pour D1, D6 et D7 (nouvelle variable, migration), et pour D9 si un script de worker est ajouté.
* Réviser avec la team Tests `AGENTS.md` (règle 5) et `docs/tests/criteres-fin-de-migration.md` (§2.1, §2.3), puis ajouter les nouveaux défauts au registre avant toute PR de correction métier (voir §5 de `22`).
