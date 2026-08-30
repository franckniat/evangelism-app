import Link from "next/link";

import { supprimerSecteur } from "@/app/(app)/actions";
import { FormulaireSecteur } from "@/app/(app)/secteurs/formulaire";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { charger } from "@/lib/garde";

export const metadata = { title: "Secteurs" };

export default async function PageSecteurs() {
  const { sectors } = await charger(() => api.secteurs());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secteurs</h1>
        <p className="text-muted-foreground text-sm">
          Les zones où vous évangélisez, pour retrouver un dossier par
          l&apos;endroit plutôt que par le nom.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouveau secteur</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireSecteur />
        </CardContent>
      </Card>

      {sectors.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          Aucun secteur pour l&apos;instant.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sectors.map((secteur) => (
            <li
              key={secteur.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div className="min-w-40 flex-1">
                <p className="font-medium">{secteur.name}</p>
                <p className="text-muted-foreground text-sm">
                  {[secteur.city, secteur.country].filter(Boolean).join(", ") || "—"}
                </p>
              </div>

              <Link
                href={`/convertis?secteur=${secteur.id}`}
                className="text-muted-foreground text-sm hover:underline"
              >
                {secteur.convertsCount} converti
                {secteur.convertsCount > 1 ? "s" : ""}
              </Link>

              <form action={supprimerSecteur}>
                <input type="hidden" name="id" value={secteur.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Supprimer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardDescription>
            Supprimer un secteur ne supprime pas les dossiers qu&apos;il portait :
            ils se retrouvent simplement sans secteur. Perdre un libellé
            d&apos;organisation ne doit jamais faire perdre le suivi de personnes.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
