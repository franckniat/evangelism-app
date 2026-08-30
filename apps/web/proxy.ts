import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { NOMS_COOKIES } from "@/lib/session";

/**
 * Une redirection optimiste, et rien de plus.
 *
 * Ce fichier ne décide d'aucune autorisation : il regarde s'il existe un
 * cookie de session pour éviter d'afficher une coquille vide à quelqu'un qui
 * n'est pas connecté. La vraie vérification est faite par l'API, à chaque
 * requête, et c'est la seule qui compte — un cookie présent ne prouve
 * strictement rien sur sa validité.
 *
 * Aucune rotation de jeton ici, volontairement. Le proxy s'exécute aussi sur
 * les préchargements, et le serveur invalide un jeton de rafraîchissement dès
 * qu'il est utilisé : deux rotations concurrentes lui feraient conclure au vol
 * et déconnecteraient la personne. Le renouvellement vit donc dans un
 * gestionnaire de route, que seule une navigation réelle atteint.
 */
const PRIVE = ["/aujourdhui", "/convertis", "/secteurs", "/profil"];
const AUTH = ["/connexion", "/inscription"];

export function proxy(request: NextRequest) {
  const chemin = request.nextUrl.pathname;
  const connecte = request.cookies.has(NOMS_COOKIES.RAFRAICHISSEMENT);

  if (!connecte && PRIVE.some((p) => chemin.startsWith(p))) {
    const destination = new URL("/connexion", request.url);
    destination.searchParams.set("suite", chemin);
    return NextResponse.redirect(destination);
  }

  if (connecte && AUTH.some((p) => chemin.startsWith(p))) {
    return NextResponse.redirect(new URL("/aujourdhui", request.url));
  }

  /**
   * Le chemin demandé, transmis à l'application.
   *
   * Une mise en page ne connaît pas l'URL courante. Or, quand le jeton
   * d'accès a expiré, il faut savoir où renvoyer la personne après le
   * renouvellement — sans quoi elle retombe systématiquement sur l'accueil,
   * en perdant ce qu'elle était en train de consulter.
   */
  const entetes = new Headers(request.headers);
  entetes.set("x-chemin", chemin + request.nextUrl.search);

  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: [
    /**
     * Tout sauf les ressources internes de Next et les fichiers statiques :
     * inutile de faire tourner ce code pour une image.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
