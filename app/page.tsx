import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Code2, Rocket } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-2 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Welcome to Builders Central
            </h1>
            <p className="mt-3 max-w-md mx-auto text-xl text-muted-foreground sm:text-2xl md:mt-5 md:max-w-3xl">
              Showcase your web applications and discover innovative projects
              from developers around the world.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/applications">Explore Applications</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/submit">Submit Your App</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="p-6 bg-background/50 backdrop-blur">
              <Building2 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Centralized Hub</h3>
              <p className="text-muted-foreground">
                Manage and showcase your web applications in one place with
                powerful tools and analytics.
              </p>
            </Card>
            <Card className="p-6 bg-background/50 backdrop-blur">
              <Code2 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Developer Focused</h3>
              <p className="text-muted-foreground">
                Built by developers, for developers. Share your work and get
                discovered by the community.
              </p>
            </Card>
            <Card className="p-6 bg-background/50 backdrop-blur">
              <Rocket className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Launch & Grow</h3>
              <p className="text-muted-foreground">
                Get insights, feedback, and exposure for your applications to
                help them reach new heights.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
