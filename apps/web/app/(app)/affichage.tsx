import { STATUS_LABEL, localDateOf, offsetDays, type StatusKey } from "@moisson/core";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Les quelques bouts d'affichage que trois écrans se partagent.
 *
 * Les libellés de statut viennent de `@moisson/core` : le mobile et le web
 * doivent dire « En réflexion » de la même façon, sinon deux personnes
 * regardant le même dossier ne parlent plus du même état.
 */

export function BadgeStatut({ statut }: { statut: StatusKey }) {
  const variante =
    statut === "baptise" || statut === "sauve"
      ? "default"
      : statut === "sceptique"
        ? "outline"
        : "secondary";

  return <Badge variant={variante}>{STATUS_LABEL[statut].fr}</Badge>;
}

/** « Aujourd'hui », « Dans 3 j », « En retard de 2 j », ou « — ». */
export function libelleEcheance(dateISO: string | null): string {
  const jour = localDateOf(dateISO);
  const ecart = offsetDays(jour);

  if (ecart == null) return "—";
  if (ecart < 0) return `En retard de ${-ecart} j`;
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Demain";
  return `Dans ${ecart} j`;
}

export function Echeance({ date }: { date: string | null }) {
  const ecart = offsetDays(localDateOf(date));
  const enRetard = ecart != null && ecart < 0;
  const aujourdhui = ecart === 0;

  return (
    <span
      className={cn(
        "text-sm",
        enRetard
          ? "text-destructive font-medium"
          : aujourdhui
            ? "text-primary font-medium"
            : "text-muted-foreground",
      )}
    >
      {libelleEcheance(date)}
    </span>
  );
}

export function dateCourte(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function Initiales({ prenom, nom }: { prenom: string; nom: string | null }) {
  const lettres = `${prenom[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();

  return (
    <span className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {lettres || "?"}
    </span>
  );
}
