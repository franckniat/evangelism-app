"use client";

import { useActionState, useRef } from "react";

import { ajouterNote, type Retour } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: Retour = { erreur: null };

export function FormulaireNote({ id }: { id: string }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action, enCours] = useActionState(
    async (precedent: Retour, donnees: FormData) => {
      const resultat = await ajouterNote(precedent, donnees);
      if (!resultat.erreur) formulaire.current?.reset();
      return resultat;
    },
    initial,
  );

  return (
    <form ref={formulaire} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <Textarea
        name="texte"
        rows={2}
        required
        placeholder="Ce qui s'est dit, ce qu'il faut retenir…"
      />

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input type="checkbox" name="appel" className="size-4" />
          Consigner comme un appel
        </label>

        <Button type="submit" size="sm" variant="secondary" disabled={enCours}>
          {enCours ? "Ajout…" : "Ajouter au fil"}
        </Button>
      </div>

      {etat.erreur && (
        <p className="text-destructive text-sm" role="alert">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}
