"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signIn, signOut } from "next-auth/react";

export function SiteHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-6">
        {/* Left side - Logo */}
        <div className="flex items-center">
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[280px]">
                <nav className="flex flex-col gap-4">
                  <Link
                    href="/"
                    className="text-lg font-semibold"
                    onClick={() => setIsOpen(false)}
                  >
                    Builders Central
                  </Link>
                  <Link
                    href="/applications"
                    className="text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Discover
                  </Link>
                  <Link
                    href="/submit"
                    className="text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Submit
                  </Link>
                  {user && (
                    <Link
                      href="/profile"
                      className="text-sm"
                      onClick={() => setIsOpen(false)}
                    >
                      Profile
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <Link href="/" className="text-2xl font-bold">
            Builders Central
          </Link>
        </div>

        {/* Right side - Navigation and Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex">
            <MainNav />
          </div>
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/submit">Submit Application</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signIn("google")}
              >
                Login
              </Button>
              <Button size="sm" onClick={() => signIn("google")}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
