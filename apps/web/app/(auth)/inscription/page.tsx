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
