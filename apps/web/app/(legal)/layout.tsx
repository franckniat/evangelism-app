import Link from "next/link";

export default function LayoutJuridique({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto w-full max-w-3xl px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg text-base font-semibold">
            +
          </span>
          <span className="font-semibold tracking-tight">HARVEST</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">{children}</main>

      <footer className="mx-auto w-full max-w-3xl px-6 py-8">
        <nav className="text-muted-foreground flex flex-wrap gap-4 text-sm">
          <Link href="/conditions" className="hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/" className="hover:underline">
            Accueil
          </Link>
        </nav>
      </footer>
    </div>
  );
}
