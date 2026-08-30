import Link from "next/link";

import { FormulaireConverti } from "@/app/(app)/convertis/formulaire";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { charger } from "@/lib/garde";

export const metadata = { title: "Nouveau converti" };

export default async function PageNouveauConverti() {
  const { sectors } = await charger(() => api.secteurs());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau converti</h1>
        <Button variant="ghost" nativeButton={false} render={<Link href="/convertis" />}>
          Annuler
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
          <CardDescription>
            Un téléphone ou une adresse au minimum — sans quoi le suivi est
            précisément ce qu&apos;on ne pourra pas faire. Une première visite
            est planifiée dans trois jours.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FormulaireConverti secteurs={sectors} />
        </CardContent>
      </Card>
    </div>
  );
}
