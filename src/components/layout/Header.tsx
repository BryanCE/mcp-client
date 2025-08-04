"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="secondary"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Inline SVGs for zero-flash, hydration-safe theming.
         Both icons render; hide the inactive one via CSS tied to theme class.
         Works with attribute="class" (Tailwind dark:) or data-theme setups. */}
      <svg
        className="theme-show-light"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Sun icon (lucide sun) */}
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="M4.93 4.93l1.41 1.41"></path>
        <path d="M17.66 17.66l1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="M6.34 17.66l-1.41 1.41"></path>
        <path d="M19.07 4.93l-1.41 1.41"></path>
      </svg>
      <svg
        className="theme-show-dark"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Moon icon (lucide moon) */}
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </Button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:px-4">
        {/* Left: Branding + status */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="font-semibold truncate">
            MCP Client
          </Link>
          <Separator orientation="vertical" className="mx-2 h-6 hidden sm:block" />
          {/* Hide verbose badges on mobile, show concise indicators */}
          <div className="items-center gap-2 hidden md:flex">
            <Badge variant="secondary" className="whitespace-nowrap">MCP: Disconnected</Badge>
            <Badge variant="outline" className="whitespace-nowrap">AI: Not configured</Badge>
          </div>
          <div className="flex md:hidden items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive"></span>
            <span>MCP</span>
            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground ml-2"></span>
            <span>AI</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Collapse Settings into icon on small screens */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2 sm:px-3">
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden" aria-hidden="true">⋮</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Preferences</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Shortcuts</DropdownMenuItem>
              <DropdownMenuItem disabled>About</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle remains icon-only, tap-friendly */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default Header;
