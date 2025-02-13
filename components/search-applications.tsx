"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function SearchApplications() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get the current search query from URL
  const currentQuery = searchParams.get("q") || "";

  // Update the URL with the search query
  const createQueryString = useCallback(
    (query: string) => {
      const params = new URLSearchParams();
      // Copy existing params
      searchParams.forEach((value, key) => params.set(key, value));

      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      return params.toString();
    },
    [searchParams]
  );

  // Only show search on relevant pages
  const searchablePages = ["/applications", "/admin"];
  if (!searchablePages.includes(pathname)) return null;

  return (
    <div className="relative max-w-md w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search applications..."
        value={currentQuery}
        onChange={(e) => {
          const newQuery = e.target.value;
          router.push(
            `${pathname}${newQuery ? `?${createQueryString(newQuery)}` : ""}`,
            { scroll: false }
          );
        }}
        className="pl-9 w-full"
      />
    </div>
  );
}
