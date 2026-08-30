import Link from "next/link";
import type { VisitDto } from "@moisson/core";

import { cloreVisite } from "@/app/(app)/actions";
import { Echeance } from "@/app/(app)/affichage";
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

export const metadata = { title: "Aujourd'hui" };

export default async function PageAujourdhui() {
  const [{ visits }, { converts }] = await charger(() =>
    Promise.all([api.visites("upcoming"), api.convertis()]),
  );

  /**
   * Lire l'heure pendant le rendu est impur, et la règle a raison de le
   * signaler — pour un composant client, qui peut se rendre à nouveau à tout
   * moment. Cette page est rendue sur le serveur, une fois par requête :
   * « maintenant » y est précisément ce qu'on veut dire.
   */
  // eslint-disable-next-line react-hooks/purity
  const maintenant = Date.now();
  const finDuJour = new Date();
  finDuJour.setHours(23, 59, 59, 999);

  /**
   * « En retard » d'abord, et séparé du reste.
   *
   * L'écran qui compte pour un évangéliste n'est pas la liste de ses
   * convertis, c'est « qu'est-ce que je fais aujourd'hui ». Une personne
   * qu'on a dit rappeler la semaine dernière et qu'on n'a pas rappelée est
   * l'information la plus utile de la page.
   */
  const enRetard = visits.filter(
    (v) => v.scheduledAt && new Date(v.scheduledAt).getTime() < maintenant,
  );
  const duJour = visits.filter(
    (v) =>
      v.scheduledAt &&
      new Date(v.scheduledAt).getTime() >= maintenant &&
      new Date(v.scheduledAt).getTime() <= finDuJour.getTime(),
  );
  const aVenir = visits.filter(
    (v) => v.scheduledAt && new Date(v.scheduledAt).getTime() > finDuJour.getTime(),
  );

  const avecVisite = new Set(visits.map((v) => v.convertId));
  const sansSuite = converts.filter((c) => !avecVisite.has(c.id));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aujourd&apos;hui</h1>
        <p className="text-muted-foreground text-sm">
          Ce qu&apos;il reste à faire, du plus urgent au moins pressé.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Statistique valeur={enRetard.length} libelle="En retard" alerte />
        <Statistique valeur={duJour.length} libelle="Aujourd'hui" />
        <Statistique valeur={sansSuite.length} libelle="Sans visite" />
        <Statistique valeur={converts.length} libelle="Convertis" />
      </div>

      <Groupe
        titre="En retard"
        description="À rattraper en priorité."
        visites={enRetard}
        vide="Rien en retard."
      />

      <Groupe
        titre="Aujourd'hui"
        description="Prévu pour la journée."
        visites={duJour}
        vide="Aucune visite prévue aujourd'hui."
      />

      <Groupe
        titre="À venir"
        description="Les prochains rendez-vous."
        visites={aVenir.slice(0, 10)}
        vide="Rien de planifié pour la suite."
      />

      {sansSuite.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sans visite planifiée</CardTitle>
            <CardDescription>
              {sansSuite.length} dossier{sansSuite.length > 1 ? "s" : ""} sans
              prochaine échéance. Sans date, on ne revient jamais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {sansSuite.slice(0, 12).map((c) => (
              <Link
                key={c.id}
                href={`/convertis/${c.id}`}
                className="bg-secondary hover:bg-muted rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                {c.shortName}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Statistique({
  valeur,
  libelle,
  alerte,
}: {
  valeur: number;
  libelle: string;
  alerte?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-1">
        <p
          className={
            alerte && valeur > 0
              ? "text-destructive text-2xl font-semibold"
              : "text-2xl font-semibold"
          }
        >
          {valeur}
        </p>
        <p className="text-muted-foreground text-xs">{libelle}</p>
      </CardContent>
    </Card>
  );
}

function Groupe({
  titre,
  description,
  visites,
  vide,
}: {
  titre: string;
  description: string;
  visites: VisitDto[];
  vide: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{titre}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {visites.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          {vide}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visites.map((visite) => (
            <li
              key={visite.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <Link
                href={`/convertis/${visite.convertId}`}
                className="font-medium hover:underline"
              >
                {visite.convert?.shortName ?? "Dossier"}
              </Link>

              {visite.convert?.phone && (
                <a
                  href={`tel:${visite.convert.phone.replace(/\s/g, "")}`}
                  className="text-muted-foreground text-sm hover:underline"
                >
                  {visite.convert.phone}
                </a>
              )}

              <div className="ml-auto flex items-center gap-3">
                <Echeance date={visite.scheduledAt} />

                <form action={cloreVisite}>
                  <input type="hidden" name="visite" value={visite.id} />
                  <input type="hidden" name="converti" value={visite.convertId} />
                  <Button type="submit" variant="outline" size="sm">
                    Fait
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
