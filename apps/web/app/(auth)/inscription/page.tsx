import Link from "next/link";

import { FormulaireInscription } from "@/app/(auth)/inscription/formulaire";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Inscription" };

export default function PageInscription() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Vos convertis ne seront visibles que par vous.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <FormulaireInscription />

        <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
          En créant un compte, vous acceptez les{" "}
          <Link href="/conditions" className="text-primary hover:underline">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </Link>
          . Vous vous engagez notamment à informer chaque personne dont vous
          enregistrez les coordonnées, et à supprimer son dossier si elle le
          demande.
        </p>

        <p className="text-muted-foreground text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
