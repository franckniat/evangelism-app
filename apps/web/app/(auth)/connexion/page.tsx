import Link from "next/link";

import { FormulaireConnexion } from "@/app/(auth)/connexion/formulaire";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  const parametres = await searchParams;
  const suite = typeof parametres.suite === "string" ? parametres.suite : "";
  const expiree = parametres.expiree === "1";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          {expiree
            ? "Votre session a expiré. Reconnectez-vous pour continuer."
            : "Suivi d'évangélisation"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <FormulaireConnexion suite={suite} />

        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-primary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
