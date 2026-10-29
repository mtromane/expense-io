# ADR-016 · Inscription refusée sur les domaines de messagerie publics

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D16 (`M-03` ; défaut `MET-01`)

## Contexte
L'entreprise est déduite du domaine de l'email et le premier inscrit en devient la RH : le premier inscrit en `@gmail.com` devenait RH de tous les inscrits gmail suivants.

## Décision
L'inscription est refusée pour une liste de domaines publics (`identity/domain/PublicEmailDomains.ts` : Gmail, Outlook, Hotmail, Yahoo, iCloud, Proton, GMX, Orange, Free, SFR, La Poste…), avec un message explicite **ajouté** au formulaire : « Les adresses de messagerie personnelles (gmail.com, outlook.fr…) ne sont pas acceptées : inscrivez-vous avec l'adresse de votre entreprise. »

## Alternatives
* Une entreprise par utilisateur sur ces domaines : produit absurde (chacun RH de sa propre entreprise vide).
* Invitation par la RH : solution de fond, hors de portée (aucun envoi d'email dans la stack).

## Conséquences
* Liste à maintenir ; un vrai client en adresse publique ne peut pas s'inscrire.
* La vérification de l'email (`V-17`) reste hors périmètre.
