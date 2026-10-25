/**
 * Erreurs métier typées. Le domaine et les cas d'usage les lèvent ; seule la
 * couche HTTP (shared/http) les traduit en codes et messages du contrat.
 */

/** Ressource absente ou hors du périmètre de l'acteur (même réponse : 404). */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** Conflit avec l'état courant (note déjà tranchée, manager invalide…). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/** Entrée refusée ; le message est celui renvoyé au client. */
export class InvalidInputError extends Error {
  constructor(message = 'Champs invalides') {
    super(message)
    this.name = 'InvalidInputError'
  }
}
