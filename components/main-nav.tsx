"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const routes = [
    {
      href: "/applications",
      label: "Discover",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
    },
    {
      href: "/submit",
      label: "Submit",
    },
  ];

  // Update URL with search query and redirect to applications page
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    router.push(`/applications?${params.toString()}`);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  return (
    <nav className="flex items-center gap-6">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === route.href
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
      <form onSubmit={handleSubmit} className="relative w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </form>
    </nav>
  );
}
