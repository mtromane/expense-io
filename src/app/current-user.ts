import { cache } from 'react'
import { getActor, getSession } from '@/modules/identity'

/**
 * Session et acteur pour le rendu des pages, lus une seule fois par rendu :
 * le layout et la page les partagent (une requête SQL au lieu de deux).
 * Réservé aux composants serveur ; les routes de l'API appellent le module
 * identity directement (une seule lecture par requête : cache() n'y apporterait rien).
 */
export const currentSession = cache(getSession)
export const currentActor = cache(getActor)
