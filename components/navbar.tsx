"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/news", label: "News" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === tab.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
