"use client";

import { useActionState } from "react";

import { connexion, type EtatFormulaire } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: EtatFormulaire = { erreur: null };

export function FormulaireConnexion({ suite }: { suite: string }) {
  const [etat, action, enCours] = useActionState(connexion, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={suite} />

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
          autoComplete="current-password"
          required
        />
      </div>

      {etat.erreur && (
        <p className="text-destructive text-sm" role="alert">
          {etat.erreur}
        </p>
      )}

      <Button type="submit" size="lg" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
