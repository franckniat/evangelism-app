import Link from "next/link";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-lg font-semibold">
          +
        </span>
        <span className="text-lg font-semibold tracking-tight">HARVEST</span>
      </Link>

      {children}
    </main>
  );
}
