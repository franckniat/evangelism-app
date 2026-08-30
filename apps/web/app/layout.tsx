import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * La variable exposée ici doit rester distincte du jeton Tailwind : dans
 * `globals.css`, `--font-sans` vaut `var(--font-bricolage)`. L'ancienne
 * déclaration écrivait `--font-sans: var(--font-sans)`, qui se référence
 * lui-même — la police était chargée puis ignorée, et le site s'affichait
 * dans la police par défaut du système.
 */
const police = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const policeMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Harvest — suivi d'évangélisation",
    template: "%s — Harvest",
  },
  description:
    "Enregistrez les personnes rencontrées, planifiez les visites, ne perdez personne de vue.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${police.variable} ${policeMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
