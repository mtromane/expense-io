# 14 — Hors périmètre : évolutions

Fonctionnalités **absentes** du produit, relevées pendant l'audit. Elles ne
sont pas proposées à l'implémentation : elles changeraient le produit au-delà
de ce que la contrainte « invisible pour l'utilisateur » permet, même avec
l'exception des correctifs métier (voir
[11-methode.md](11-methode.md#constats-métier)). Elles sont listées pour
mémoire et pour la discussion produit.

| Origine | Évolution | Lien avec un constat |
|---|---|---|
| M-05 | Motif de rejet saisi par le valideur et visible par l'auteur | M-05.1 (traçabilité) peut en préparer le stockage |
| M-05 | Notification de l'auteur à la décision (`NotificationPort` existe mais n'est jamais appelé) | V-01 |
| M-03 | Invitation par les RH, validation de l'adhésion à une entreprise | M-03, V-17 |
| M-02 | Gestion complète des rôles au-delà de employé ↔ manager (plusieurs RH, transfert du rôle RH) | M-02 |
| M-08 | Désactivation et départ d'un salarié (aucune suppression possible aujourd'hui) | V-35 |
| Phase 1, T1 | Changement et réinitialisation du mot de passe (un compte compromis ne peut pas être assaini sans accès à la base) | V-18, V-23 |
| 01-produit | Délégation ou suppléance d'un valideur absent ; escalade ; seuils de montant | — |
| 01-produit | Historique des notes déjà décidées côté valideur ; filtres, recherche, pagination | — |
| 01-produit | Modification ou suppression d'une note, brouillon, catégories, TVA, devises, plafonds, remboursement, export comptable | — |
