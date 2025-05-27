import { SearchApplications } from "@/components/search-applications";
import { MainNav } from "./main-nav";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-orange-500/95 backdrop-blur supports-[backdrop-filter]:bg-orange-500/60 text-[#ef5a3c]">
      <div className="container flex h-14 items-center">
        <MainNav />
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full max-w-md mx-4">
            <SearchApplications />
          </div>
          <nav className="flex items-center space-x-2">
            {/* ... rest of your navbar items ... */}
          </nav>
        </div>
      </div>
    </header>
  );
}
