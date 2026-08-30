"use client";

import { Button } from "@/components/ui/button";

/**
 * Le filet de sécurité : API injoignable, panne de base, bogue non prévu.
 *
 * Le message d'erreur technique n'est pas affiché — il peut contenir une
 * adresse interne ou un identifiant. On dit ce qui s'est passé et ce que la
 * personne peut faire, et rien d'autre.
 */
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Quelque chose n&apos;a pas répondu
      </h1>
      <p className="text-muted-foreground max-w-md text-sm text-pretty">
        Le serveur n&apos;a pas pu répondre. Vos données ne sont pas perdues :
        rien n&apos;a été modifié.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </main>
  );
}
