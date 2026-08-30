"use client";

import { useActionState } from "react";
import type { ConvertDto, SectorDto } from "@moisson/core";
import { STATUS_LABEL, STATUS_ORDER } from "@moisson/core";

import { creerConverti, modifierConverti, type Retour } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: Retour = { erreur: null };

const classeSelect =
  "border-input bg-background h-9 w-full rounded-lg border px-3 text-sm";

export function FormulaireConverti({
  secteurs,
  dossier,
}: {
  secteurs: SectorDto[];
  dossier?: ConvertDto;
}) {
  const modification = dossier != null;
  const [etat, action, enCours] = useActionState(
    modification ? modifierConverti : creerConverti,
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {dossier && <input type="hidden" name="id" value={dossier.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" required defaultValue={dossier?.firstName} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={dossier?.lastName ?? ""} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            name="telephone"
            type="tel"
            defaultValue={dossier?.phone ?? ""}
            placeholder="+237 6 90 00 00 00"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={dossier?.email ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sexe">Sexe</Label>
          <select
            id="sexe"
            name="sexe"
            defaultValue={dossier?.sex ?? ""}
            className={classeSelect}
          >
            <option value="">Non précisé</option>
            <option value="H">Homme</option>
            <option value="F">Femme</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="statut">Statut</Label>
          <select
            id="statut"
            name="statut"
            defaultValue={dossier?.status ?? "reflexion"}
            className={classeSelect}
          >
            {STATUS_ORDER.map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k].fr}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="secteur">Secteur</Label>
          <select
            id="secteur"
            name="secteur"
            defaultValue={dossier?.sectorId ?? ""}
            className={classeSelect}
          >
            <option value="">Aucun</option>
            {secteurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={dossier?.notes ?? ""}
          placeholder="Contexte de la rencontre…"
        />
      </div>

      {!modification && (
        /**
         * Le consentement est demandé une seule fois, à la création, parce
         * que c'est là qu'il est recueilli : sur le terrain, en disant à la
         * personne qu'on garde ses coordonnées pour la recontacter. Le
         * cocher plus tard depuis un bureau ne prouverait rien.
         */
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            name="consentement"
            defaultChecked
            className="mt-0.5 size-4"
          />
          <span>
            <span className="font-medium">La personne est informée</span>
            <span className="text-muted-foreground block">
              Elle sait que ses coordonnées sont conservées pour être
              recontactée.
            </span>
          </span>
        </label>
      )}

      {etat.erreur && (
        <p className="text-destructive text-sm" role="alert">
          {etat.erreur}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={enCours}>
          {enCours
            ? "Enregistrement…"
            : modification
              ? "Enregistrer les modifications"
              : "Enregistrer le converti"}
        </Button>
      </div>
    </form>
  );
}
