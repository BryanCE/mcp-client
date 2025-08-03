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
  // Use resolvedTheme to avoid SSR/client mismatch when defaultTheme="system"
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="secondary"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? "🌙" : "☀️"}
    </Button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold">
            MCP Client
          </Link>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="flex items-center gap-2">
            <Badge variant="secondary">MCP: Disconnected</Badge>
            <Badge variant="outline">AI: Not configured</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Settings</Button>
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default Header;
