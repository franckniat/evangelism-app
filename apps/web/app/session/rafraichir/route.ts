import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/api";
import { ecrireJetons, effacerJetons, lireJetons } from "@/lib/session";

/**
 * Le seul endroit qui fait tourner un jeton de rafraîchissement.
 *
 * Le serveur invalide un jeton dès qu'il est utilisé et considère une
 * seconde présentation comme un vol : il révoque alors toute la famille et
 * déconnecte l'appareil. Deux rotations concurrentes suffiraient donc à
 * éjecter quelqu'un qui n'a rien fait de mal.
 *
 * D'où ce point de passage unique, atteint par une navigation réelle et non
 * par un préchargement. Les composants serveur, eux, ne peuvent pas écrire
 * de cookies : ils lèvent `SessionExpiree` et la mise en page protégée
 * redirige ici.
 */
export async function GET(request: NextRequest) {
  const suite = request.nextUrl.searchParams.get("suite");

  /**
   * Uniquement un chemin interne. Sans ce contrôle, `?suite=https://…`
   * ferait de cette route un tremplin de redirection vers n'importe quel
   * site — le genre de détail qui transforme une page de connexion en outil
   * d'hameçonnage.
   */
  const destination =
    suite && suite.startsWith("/") && !suite.startsWith("//")
      ? suite
      : "/aujourdhui";

  const jetons = await lireJetons();

  if (!jetons) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  try {
    const renouvele = await auth.rotation(jetons.rafraichissement);
    await ecrireJetons({
      acces: renouvele.accessToken.value,
      rafraichissement: renouvele.refreshToken.value,
    });
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    /**
     * Refus du serveur : la session est morte — expirée, révoquée depuis un
     * autre appareil, ou détectée comme rejouée. On efface plutôt que de
     * laisser des cookies qui feront échouer chaque page.
     */
    await effacerJetons();
    const connexion = new URL("/connexion", request.url);
    connexion.searchParams.set("expiree", "1");
    return NextResponse.redirect(connexion);
  }
}
