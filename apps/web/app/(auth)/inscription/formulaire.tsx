"use client";

import { useActionState } from "react";

import { inscription, type EtatFormulaire } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: EtatFormulaire = { erreur: null };

export function FormulaireInscription() {
  const [etat, action, enCours] = useActionState(inscription, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom complet</Label>
        <Input id="nom" name="nom" autoComplete="name" required placeholder="Jean Kamga" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="jean@exemple.cm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-muted-foreground text-xs">Huit caractères au minimum.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="eglise">Église de rattachement</Label>
        <Input id="eglise" name="eglise" placeholder="Église du Plein Évangile" />
        <p className="text-muted-foreground text-xs">Facultatif.</p>
      </div>

      {etat.erreur && (
        <p className="text-destructive text-sm" role="alert">
          {etat.erreur}
        </p>
      )}

      <Button type="submit" size="lg" disabled={enCours}>
        {enCours ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
