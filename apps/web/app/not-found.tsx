import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Page introuvable" };

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
      <p className="text-muted-foreground max-w-md text-sm text-pretty">
        Cette adresse ne correspond à rien — ou au dossier de quelqu&apos;un
        d&apos;autre. Les deux se répondent de la même façon : dire
        « interdit » confirmerait l&apos;existence d&apos;un dossier sur une
        personne.
      </p>
      <Button nativeButton={false} render={<Link href="/aujourdhui" />}>
        Retour à l&apos;accueil
      </Button>
    </main>
  );
}
