import { DICT } from "@moisson/core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const t = DICT.fr;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Badge variant="secondary">Initialisation</Badge>
          <CardTitle>Moisson — Web</CardTitle>
          <CardDescription>{t.login_sub}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Next.js + shadcn/ui sont en place. Le contenu métier (landing et
            tableau de bord) sera implémenté ensuite.
          </p>
          <Button>{t.login_signin}</Button>
        </CardContent>
      </Card>
    </main>
  );
}
