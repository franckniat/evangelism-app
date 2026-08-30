"use client";

import { useActionState, useRef } from "react";

import { creerSecteur, type Retour } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: Retour = { erreur: null };

export function FormulaireSecteur() {
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action, enCours] = useActionState(
    async (precedent: Retour, donnees: FormData) => {
      const resultat = await creerSecteur(precedent, donnees);
      if (!resultat.erreur) formulaire.current?.reset();
      return resultat;
    },
    initial,
  );

  return (
    <form ref={formulaire} action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-40 flex-1">
        <Label htmlFor="nom" className="mb-1">
          Nom
        </Label>
        <Input id="nom" name="nom" required placeholder="Bonabéri" />
      </div>

      <div className="min-w-32 flex-1">
        <Label htmlFor="ville" className="mb-1">
          Ville
        </Label>
        <Input id="ville" name="ville" placeholder="Douala" />
      </div>

      <div className="min-w-32 flex-1">
        <Label htmlFor="pays" className="mb-1">
          Pays
        </Label>
        <Input id="pays" name="pays" placeholder="Cameroun" />
      </div>

      <Button type="submit" size="lg" disabled={enCours}>
        {enCours ? "Ajout…" : "Ajouter"}
      </Button>

      {etat.erreur && (
        <p className="text-destructive w-full text-sm" role="alert">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}
