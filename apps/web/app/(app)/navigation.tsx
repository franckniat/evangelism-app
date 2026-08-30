"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LIENS = [
  { href: "/aujourdhui", libelle: "Aujourd'hui" },
  { href: "/convertis", libelle: "Convertis" },
  { href: "/secteurs", libelle: "Secteurs" },
] as const;

export function Navigation() {
  const chemin = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Navigation principale">
      {LIENS.map((lien) => {
        const actif = chemin === lien.href || chemin.startsWith(`${lien.href}/`);

        return (
          <Link
            key={lien.href}
            href={lien.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              actif
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {lien.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
