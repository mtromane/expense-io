/**
 * Domaines de messagerie grand public (D16, ADR-016). L'entreprise est déduite
 * du domaine de l'email et son premier inscrit en devient la RH : sur ces
 * domaines, le premier inscrit deviendrait RH de tous les suivants.
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aol.fr',
  'proton.me', 'protonmail.com', 'pm.me',
  'gmx.com', 'gmx.fr', 'gmx.de', 'mail.com', 'yandex.com', 'zoho.com',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'bbox.fr',
])

/** Message du formulaire d'inscription (texte d'interface, en français). */
export const PUBLIC_DOMAIN_REFUSED =
  'Les adresses de messagerie personnelles (gmail.com, outlook.fr…) ne sont pas acceptées : inscrivez-vous avec l’adresse de votre entreprise.'

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase())
}
