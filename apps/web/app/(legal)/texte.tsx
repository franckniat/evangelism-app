import { cn } from "@/lib/utils";

/**
 * La mise en forme des pages juridiques, et rien d'autre.
 *
 * Ces pages sont du texte long : elles ont besoin d'une largeur de lecture
 * contenue, de titres lisibles et de listes propres — pas d'un système de
 * composants. D'où trois primitives, ici, plutôt que du balisage répété sur
 * deux pages.
 */

export const DERNIERE_MISE_A_JOUR = "3 septembre 2026";

export function Article({
  titre,
  date,
  children,
}: {
  titre: string;
  date: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{titre}</h1>
        <p className="text-muted-foreground text-sm">Dernière mise à jour : {date}</p>
      </header>

      {children}
    </article>
  );
}

export function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{titre}</h2>
      <div className="[&_li]:text-pretty [&_p]:text-pretty flex flex-col gap-3 text-sm leading-relaxed [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function Encadre({
  children,
  variante = "note",
}: {
  children: React.ReactNode;
  variante?: "note" | "avertissement";
}) {
  return (
    <p
      className={cn(
        "rounded-xl border p-4 text-sm leading-relaxed text-pretty",
        variante === "avertissement"
          ? "border-destructive/40 text-destructive"
          : "bg-muted/40 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
