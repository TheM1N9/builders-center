"use client";

import Link from "next/link";
import Image from "next/image";
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
import { signIn, signOut, useSession } from "next-auth/react";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function SiteHeader() {
  const { user } = useAuth();
  // const { data: session } = useSession();
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
                    className="flex items-center gap-2 text-lg font-semibold text-[#75fa8d]"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="relative w-6 h-6">
                      <Image
                        src="/logo.jpg"
                        alt="Builders Central Logo"
                        fill
                        className="object-contain rounded-full"
                      />
                    </div>
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
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full">
              <Image
                src="/logo.jpg"
                alt="Builders Central Logo"
                fill
                className="object-contain rounded-full"
                priority
              />
            </div>
            <span className="text-2xl font-bold text-[#75fa8d]">
              Builders Central
            </span>
          </Link>
        </div>
        {/* Right side - Navigation and Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex">
            <MainNav />
          </div>
          {user && <NotificationsDropdown />}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              {/* Direct Profile Link via Avatar */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 p-0"
                onClick={() => router.push("/profile")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.image || ""}
                    alt={user?.email || ""}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Go to profile</span>
              </Button>
            </div>
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
