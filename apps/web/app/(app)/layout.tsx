import Link from "next/link";

import { deconnexion } from "@/app/(auth)/actions";
import { Navigation } from "@/app/(app)/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { charger } from "@/lib/garde";

/**
 * Ces pages portent des dossiers nominatifs sur des personnes qui n'ont
 * jamais demandé à figurer dans un index de moteur de recherche. La page de
 * présentation publique, elle, reste indexable.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function LayoutApplication({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Le profil est chargé ici et non dans chaque page : c'est aussi ce qui
   * vérifie, à chaque navigation, que la session tient toujours. Le cookie
   * présent ne prouvait rien ; cette requête, si.
   */
  const profil = await charger(() => api.profil());

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/aujourdhui" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg text-base font-semibold">
              +
            </span>
            <span className="font-semibold tracking-tight">MOISSON</span>
          </Link>

          <Navigation />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">
                {profil.fullName ?? profil.email}
              </p>
              {profil.church && (
                <p className="text-muted-foreground text-xs leading-tight">
                  {profil.church}
                </p>
              )}
            </div>

            <form action={deconnexion}>
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
