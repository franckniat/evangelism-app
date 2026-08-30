import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  // `absolute` : sans quoi le gabarit de la racine y ajouterait « — Harvest ».
  title: { absolute: "Harvest — suivi d'évangélisation" },
  description:
    "Enregistrez les personnes rencontrées, planifiez les visites, ne perdez personne de vue. Logiciel libre, sous licence AGPL-3.0.",
};

const POINTS = [
  {
    titre: "Sur le terrain, sans réseau",
    texte:
      "L'application mobile enregistre tout de suite et envoie quand la connexion revient. Une cour sans réseau ne doit pas empêcher de noter un nom.",
  },
  {
    titre: "Personne ne se perd",
    texte:
      "Chaque converti porte une prochaine échéance. Ce qui est en retard remonte en premier — c'est l'information la plus utile de la journée.",
  },
  {
    titre: "Vos dossiers restent les vôtres",
    texte:
      "Un dossier n'est visible que par la personne qui l'a créé. Rien n'est partagé, revendu, ni exploité à d'autres fins que le suivi.",
  },
];

export default function PagePublique() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-5">
        <span className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-lg font-semibold">
            +
          </span>
          <span className="text-lg font-semibold tracking-tight">HARVEST</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/connexion" />}>
            Connexion
          </Button>
          <Button nativeButton={false} render={<Link href="/inscription" />}>Créer un compte</Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-12">
        <section className="flex max-w-2xl flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Le suivi d&apos;évangélisation, tenu jusqu&apos;au bout
          </h1>
          <p className="text-muted-foreground text-lg text-pretty">
            Enregistrez les personnes rencontrées, planifiez les visites, gardez
            la trace de chaque échange. Sur le téléphone pendant la sortie, sur
            le web pour organiser la semaine.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/inscription" />}>
              Commencer
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/connexion" />}>
              J&apos;ai déjà un compte
            </Button>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.titre} className="flex flex-col gap-2">
              <h2 className="font-semibold">{point.titre}</h2>
              <p className="text-muted-foreground text-sm text-pretty">
                {point.texte}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-6">
          <h2 className="font-semibold">Sur les données des personnes suivies</h2>
          <p className="text-muted-foreground text-sm text-pretty">
            Un dossier de suivi porte le nom, le numéro et le positionnement
            religieux d&apos;une personne qui n&apos;a jamais ouvert de compte
            ici. C&apos;est pourquoi le consentement est demandé à la saisie,
            pourquoi rien n&apos;est partagé sans décision explicite, et pourquoi
            une suppression en est bien une.
          </p>
          <p className="text-muted-foreground text-sm text-pretty">
            Vendre ces données ou les employer à autre chose que la prédication
            expose à des poursuites et à un bannissement définitif de la
            plateforme.
          </p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/conditions" className="hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="hover:underline">
            Politique de confidentialité
          </Link>
        </nav>
        <p className="text-muted-foreground text-sm">
          Harvest est un logiciel libre, publié sous licence AGPL-3.0. Le code
          est consultable, modifiable et redistribuable par tous.
        </p>
      </footer>
    </div>
  );
}
