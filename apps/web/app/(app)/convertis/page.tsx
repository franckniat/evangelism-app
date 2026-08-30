import Link from "next/link";
import { STATUS_LABEL, STATUS_ORDER } from "@harvest/core";

import { BadgeStatut, Echeance, Initiales } from "@/app/(app)/affichage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { charger } from "@/lib/garde";

export const metadata = { title: "Convertis" };

/**
 * Les filtres passent par l'URL, dans un formulaire `GET`.
 *
 * Le résultat est donc partageable, se recharge à l'identique, survit au
 * bouton « précédent » — et fonctionne sans JavaScript. Pour trois champs,
 * un état client n'apporterait rien de tout cela.
 */
export default async function PageConvertis({ searchParams }: PageProps<"/convertis">) {
  const parametres = await searchParams;
  const recherche = typeof parametres.q === "string" ? parametres.q : "";
  const secteur = typeof parametres.secteur === "string" ? parametres.secteur : "";
  const statut = typeof parametres.statut === "string" ? parametres.statut : "";

  const [{ converts }, { sectors }] = await charger(() =>
    Promise.all([
      api.convertis({
        search: recherche || undefined,
        sectorId: secteur || undefined,
        status: statut || undefined,
      }),
      api.secteurs(),
    ]),
  );

  const nomDeSecteur = new Map(sectors.map((s) => [s.id, s.name]));
  const filtre = Boolean(recherche || secteur || statut);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convertis</h1>
          <p className="text-muted-foreground text-sm">
            {converts.length} dossier{converts.length > 1 ? "s" : ""}
            {filtre ? " correspondant à ces critères" : ""}
          </p>
        </div>

        <Button nativeButton={false} render={<Link href="/convertis/nouveau" />}>Nouveau converti</Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div className="min-w-50 flex-1">
          <label htmlFor="q" className="text-muted-foreground mb-1 block text-xs">
            Recherche
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={recherche}
            placeholder="Nom, prénom ou numéro"
          />
        </div>

        <div>
          <label htmlFor="secteur" className="text-muted-foreground mb-1 block text-xs">
            Secteur
          </label>
          <select
            id="secteur"
            name="secteur"
            defaultValue={secteur}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">Tous</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="statut" className="text-muted-foreground mb-1 block text-xs">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={statut}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">Tous</option>
            {STATUS_ORDER.map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k].fr}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="secondary" size="lg">
          Filtrer
        </Button>

        {filtre && (
          <Button variant="ghost" size="lg" nativeButton={false} render={<Link href="/convertis" />}>
            Effacer
          </Button>
        )}
      </form>

      {converts.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          {filtre
            ? "Aucun dossier ne correspond à ces critères."
            : "Aucun converti pour l'instant."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {converts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/convertis/${c.id}`}
                className="hover:bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors"
              >
                <Initiales prenom={c.firstName} nom={c.lastName} />

                <div className="min-w-40 flex-1">
                  <p className="font-medium">
                    {c.firstName} {c.lastName ?? ""}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[c.sectorId ? nomDeSecteur.get(c.sectorId) : null, c.phone]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>

                <BadgeStatut statut={c.status} />
                <Echeance date={c.nextVisitAt} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
