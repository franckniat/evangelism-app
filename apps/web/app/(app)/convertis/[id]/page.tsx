import Link from "next/link";
import { notFound } from "next/navigation";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  statusTransitionLabel,
  type EventDto,
} from "@harvest/core";

import {
  changerStatut,
  cloreVisite,
  planifierVisite,
  supprimerConverti,
} from "@/app/(app)/actions";
import {
  BadgeStatut,
  Echeance,
  Initiales,
  dateCourte,
} from "@/app/(app)/affichage";
import { FormulaireConverti } from "@/app/(app)/convertis/formulaire";
import { FormulaireNote } from "@/app/(app)/convertis/[id]/note";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { charger } from "@/lib/garde";
import { cn } from "@/lib/utils";

/**
 * Un titre volontairement neutre : le nom de la personne suivie n'a pas à
 * se retrouver dans l'historique du navigateur ni dans un onglet visible
 * par-dessus l'épaule.
 */
export const metadata = { title: "Dossier" };

export default async function PageConverti({ params }: PageProps<"/convertis/[id]">) {
  const { id } = await params;

  const donnees = await charger(async () => {
    try {
      return await api.converti(id);
    } catch (erreur) {
      /**
       * 404 couvre aussi bien « ce dossier n'existe pas » que « il n'est pas
       * à vous » — le serveur ne fait exprès pas la différence, car répondre
       * « interdit » confirmerait l'existence d'un dossier sur une personne.
       */
      if (erreur instanceof ApiError && erreur.status === 404) notFound();
      throw erreur;
    }
  });

  const { convert, visits, events } = donnees;
  const { sectors } = await charger(() => api.secteurs());

  const secteur = convert.sectorId
    ? (sectors.find((s) => s.id === convert.sectorId)?.name ?? "—")
    : "—";

  const planifiees = visits.filter((v) => v.status === "planned");
  const prochaine = planifiees[planifiees.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start gap-4">
        <Initiales prenom={convert.firstName} nom={convert.lastName} />

        <div className="min-w-50 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {convert.firstName} {convert.lastName ?? ""}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <BadgeStatut statut={convert.status} />
            <span className="text-muted-foreground text-sm">
              {secteur} · ajouté le {dateCourte(convert.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {convert.phone && (
            <Button
              variant="outline" nativeButton={false}
              render={<a href={`tel:${convert.phone.replace(/\s/g, "")}`} />}
            >
              Appeler
            </Button>
          )}
          {convert.email && (
            <Button variant="outline" nativeButton={false} render={<a href={`mailto:${convert.email}`} />}>
              Écrire
            </Button>
          )}
        </div>
      </div>

      {!convert.hasConsented && (
        /**
         * Un dossier sans consentement enregistré n'est pas une erreur
         * technique, c'est une question restée sans réponse. Le signaler
         * plutôt que de le laisser dans un coin de la base.
         */
        <p className="border-destructive/40 text-destructive rounded-lg border px-4 py-3 text-sm">
          Aucun consentement enregistré pour ce dossier. Vérifiez que la
          personne sait que ses coordonnées sont conservées.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Ligne libelle="Téléphone" valeur={convert.phone ?? "—"} />
              <Ligne libelle="Adresse" valeur={convert.email ?? "—"} />
              <Ligne
                libelle="Sexe"
                valeur={
                  convert.sex === "H" ? "Homme" : convert.sex === "F" ? "Femme" : "—"
                }
              />
              <Ligne libelle="Secteur" valeur={secteur} dernier />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((k) => (
                <form key={k} action={changerStatut}>
                  <input type="hidden" name="id" value={convert.id} />
                  <input type="hidden" name="statut" value={k} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={convert.status === k ? "default" : "outline"}
                  >
                    {STATUS_LABEL[k].fr}
                  </Button>
                </form>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prochaine visite</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {prochaine ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Echeance date={prochaine.scheduledAt} />
                  <span className="text-muted-foreground text-sm">
                    {dateCourte(prochaine.scheduledAt)}
                  </span>

                  <form action={cloreVisite} className="ml-auto">
                    <input type="hidden" name="visite" value={prochaine.id} />
                    <input type="hidden" name="converti" value={convert.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Marquer faite
                    </Button>
                  </form>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aucune visite planifiée. Sans date, on ne revient jamais.
                </p>
              )}

              <form action={planifierVisite} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={convert.id} />
                <div className="min-w-40 flex-1">
                  <label
                    htmlFor="date"
                    className="text-muted-foreground mb-1 block text-xs"
                  >
                    Planifier une visite
                  </label>
                  <Input id="date" name="date" type="date" />
                </div>
                <Button type="submit" variant="secondary" size="lg">
                  Planifier
                </Button>
              </form>
            </CardContent>
          </Card>

          {convert.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{convert.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajouter au fil</CardTitle>
            </CardHeader>
            <CardContent>
              <FormulaireNote id={convert.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fil d&apos;activité</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">Rien encore.</p>
              ) : (
                <ol className="border-border ml-2 border-l pl-5">
                  {events.map((evenement) => (
                    <li key={evenement.id} className="relative pb-5 last:pb-0">
                      <span className="bg-border absolute top-1.5 -left-[1.4rem] size-2 rounded-full" />
                      <p className="text-muted-foreground text-xs">
                        {dateCourte(evenement.createdAt)}
                      </p>
                      <p className="text-sm">{libelleEvenement(evenement)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Modifier ce dossier
        </summary>
        <div className="border-t px-4 py-5">
          <FormulaireConverti secteurs={sectors} dossier={convert} />
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Link href="/convertis" className="text-muted-foreground text-sm hover:underline">
          ← Retour à la liste
        </Link>

        <form action={supprimerConverti}>
          <input type="hidden" name="id" value={convert.id} />
          <Button type="submit" variant="destructive" size="sm">
            Supprimer ce dossier
          </Button>
        </form>
      </div>
    </div>
  );
}

function Ligne({
  libelle,
  valeur,
  dernier,
}: {
  libelle: string;
  valeur: string;
  dernier?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-4 py-2", !dernier && "border-b")}>
      <span className="text-muted-foreground">{libelle}</span>
      <span className="text-right">{valeur}</span>
    </div>
  );
}

/**
 * Les libellés du fil.
 *
 * Le serveur stocke un type et un texte brut ; c'est ici qu'on en fait une
 * phrase. Le mobile fait la même chose de son côté, avec les mêmes types :
 * les deux clients racontent la même histoire.
 */
function libelleEvenement(evenement: EventDto): string {
  switch (evenement.type) {
    case "created":
      return "Premier contact";
    case "visit_planned":
      return "Visite planifiée";
    case "visit_done":
      return evenement.text ? `Visite effectuée — ${evenement.text}` : "Visite effectuée";
    case "status_changed":
      return `Statut : ${statusTransitionLabel(evenement.text, "fr")}`.trim();
    case "call":
      return evenement.text ? `Appel — ${evenement.text}` : "Appel";
    case "note":
      return evenement.text ?? "Note";
    default:
      return evenement.text ?? "";
  }
}
