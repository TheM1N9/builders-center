import Link from "next/link";
import { Github } from "lucide-react";
import { Button } from "./ui/button";

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 py-10 px-6 md:h-24 md:flex-row md:justify-between md:py-0">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <Link
              href="https://github.com/them1n9"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              builders
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link
              href="/applications"
              className="transition-colors hover:text-foreground"
            >
              Discover
            </Link>
            <Link
              href="/submit"
              className="transition-colors hover:text-foreground"
            >
              Submit
            </Link>
          </nav>
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="https://github.com/them1n9/builders-center"
              target="_blank"
              rel="noreferrer"
              className="opacity-75 transition-opacity hover:opacity-100"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
