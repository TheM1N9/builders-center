"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Code2,
  Rocket,
  Star,
  Users,
  ArrowRight,
  ChevronRight,
  Mail,
  Download,
  MessageSquare,
  TrendingUp,
  Youtube,
  Instagram,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type FeaturedApp = {
  title: string;
  description: string;
  image: string;
  category: string;
  stars: number;
  id: string;
};

export default function Home() {
  const [featuredApps, setFeaturedApps] = useState<FeaturedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedApps();
  }, []);

  const fetchFeaturedApps = async () => {
    try {
      // First, get the applications with their star counts
      const { data: appsWithStars, error: countError } = await supabase
        .from("applications")
        .select(
          `
          id,
          star_count:stars(count)
        `
        )
        .eq("status", "approved");

      if (countError) throw countError;

      // Sort applications by star count and get top 3 IDs
      const topAppIds = appsWithStars
        .sort(
          (a, b) =>
            (b.star_count[0]?.count || 0) - (a.star_count[0]?.count || 0)
        )
        .slice(0, 3)
        .map((app) => app.id);

      // Fetch full details for top 3 applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count),
          creator:profiles!creator_id(user_id, role)
        `
        )
        .in("id", topAppIds);

      if (appsError) throw appsError;

      // Sort the results to maintain the order by star count
      const sortedApps = apps.sort((a, b) => {
        const aStars = a.stars[0]?.count || 0;
        const bStars = b.stars[0]?.count || 0;
        return bStars - aStars;
      });

      const formattedApps = sortedApps.map((app) => ({
        title: app.title,
        description: app.description,
        image: app.screenshot_url,
        category: app.tags[0] || "General",
        stars: app.stars[0]?.count || 0,
        id: app.id,
      }));

      setFeaturedApps(formattedApps);
    } catch (error) {
      console.error("Error fetching featured apps:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center wave-bg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(117,250,141,0.1)_0%,transparent_65%)]" />
        <div className="absolute inset-0 grid-pattern" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Welcome to</span>{" "}
            <span className="text-[#75fa8d]">Builders Central</span>
          </h1>

          <p className="mt-6 text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 font-mono">
            World's largest No-code, Low-code community. Showcase your web
            applications and discover innovative projects from developers around
            the world.
          </p>

          <div className="flex justify-center gap-6">
            <Button
              size="lg"
              className="text-lg px-8 bg-[#75fa8d] hover:bg-[#75fa8d]/90 text-background"
              asChild
            >
              <Link href="/applications">Explore Apps</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-[#75fa8d] text-[#75fa8d] hover:bg-[#75fa8d]/10"
              asChild
            >
              <Link href="/submit">Submit Your App</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#75fa8d] mb-4">
            Follow Our Journey
          </h2>
          <p className="text-xl text-muted-foreground">
            Learn no-code and low-code development through our tutorials and
            byte-sized content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* YouTube Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Youtube className="h-8 w-8 text-[#75fa8d]" />
              <h3 className="text-2xl font-semibold">Detailed Content</h3>
            </div>
            <div className="space-y-6">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src="https://www.youtube.com/embed/ItrLV92rTro"
                  title="YouTube tutorial"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/FPbZYCrql8k"
                    title="YouTube tutorial"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/8jH0mvGyZa4"
                    title="YouTube tutorial"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#75fa8d] text-[#75fa8d] hover:bg-[#75fa8d]/10"
                  asChild
                >
                  <Link
                    href="https://www.youtube.com/@BuildersCentral"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Youtube className="h-5 w-5" />
                    Subscribe for More Detailded Content
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Instagram Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Instagram className="h-8 w-8 text-[#75fa8d]" />
              <h3 className="text-2xl font-semibold">Byte-sized Content</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="https://www.instagram.com/reel/DGf7O0ATV5r/"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden rounded-lg hover:shadow-lg transition-all"
              >
                <div className="aspect-[9/16] relative">
                  <img
                    src="/instagram-preview-1.png"
                    alt="No-Code App Building"
                    className="object-cover w-full h-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="text-white">
                      <p className="font-medium">No-Code App Building</p>
                      <div className="flex items-center mt-2">
                        <Instagram className="h-4 w-4 mr-1" />
                        <span className="text-sm">Watch on Instagram</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="https://www.instagram.com/reel/DGdTOSvTlIT/"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden rounded-lg hover:shadow-lg transition-all"
              >
                <div className="aspect-[9/16] relative">
                  <img
                    src="/instagram-preview-2.png"
                    alt="Low-Code Tips & Tricks"
                    className="object-cover w-full h-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="text-white">
                      <p className="font-medium">Low-Code Tips & Tricks</p>
                      <div className="flex items-center mt-2">
                        <Instagram className="h-4 w-4 mr-1" />
                        <span className="text-sm">Watch on Instagram</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                className="border-[#75fa8d] text-[#75fa8d] hover:bg-[#75fa8d]/10"
                asChild
              >
                <Link
                  href="https://www.instagram.com/builders.central/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Instagram className="h-5 w-5" />
                  Follow for More Byte-sized Content
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Applications */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#75fa8d]">
              Featured Applications
            </h2>
            <p className="text-muted-foreground mt-2">
              Discover trending projects from our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <Card
                    key={i}
                    className="overflow-hidden animate-pulse bg-card/50 backdrop-blur border-[#75fa8d]/10"
                  >
                    <div className="aspect-video bg-muted" />
                    <div className="p-6">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-6 w-48 bg-muted rounded mb-4" />
                      <div className="h-4 w-full bg-muted rounded" />
                    </div>
                  </Card>
                ))
              : featuredApps.map((app, index) => (
                  <Card
                    key={index}
                    className="overflow-hidden hover:shadow-xl hover:shadow-[#75fa8d]/5 transition-all duration-300 border-[#75fa8d]/10 hover:border-[#75fa8d]/20 bg-card/50 backdrop-blur"
                  >
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={app.image}
                        alt={app.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold mb-2 text-foreground">
                          {app.title}
                        </h3>

                        <div className="flex items-center text-[#75fa8d]">
                          <Star className="w-4 h-4 mr-1 fill-[#75fa8d]" />
                          <span>{app.stars}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4 line-clamp-1 mt-2">
                        {app.description}
                      </p>

                      <Button
                        className="w-full bg-[#75fa8d]/10 text-[#75fa8d] hover:bg-[#75fa8d]/20"
                        asChild
                      >
                        <Link href={`/applications/${app.id}`}>
                          View Details <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/applications"
              className="inline-flex items-center text-lg font-semibold text-[#75fa8d] border border-[#75fa8d] px-4 py-2 rounded-md hover:text-white/80 hover:bg-[#75fa8d]/10 transition-colors"
            >
              View All Applications
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#75fa8d] mb-4">
            Why Choose Builders Central?
          </h2>
          <p className="text-xl text-muted-foreground">
            The perfect platform for developers to showcase their work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center p-8 rounded-lg bg-[#75fa8d]/5 border border-[#75fa8d]/10 hover:bg-[#75fa8d]/10 transition-colors">
            <Sparkles className="h-12 w-12 text-[#75fa8d] mb-4" />
            <h3 className="text-xl font-semibold text-[#75fa8d] mb-3">
              Centralized Hub
            </h3>
            <p className="text-muted-foreground text-center">
              Manage and showcase your web applications in one place.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-lg bg-[#75fa8d]/5 border border-[#75fa8d]/10 hover:bg-[#75fa8d]/10 transition-colors">
            <Users className="h-12 w-12 text-[#75fa8d] mb-4" />
            <h3 className="text-xl font-semibold text-[#75fa8d] mb-3">
              Developer Focused
            </h3>
            <p className="text-muted-foreground text-center">
              Built by developers, for developers. Share your work with the
              community.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-lg bg-[#75fa8d]/5 border border-[#75fa8d]/10 hover:bg-[#75fa8d]/10 transition-colors">
            <Rocket className="h-12 w-12 text-[#75fa8d] mb-4" />
            <h3 className="text-xl font-semibold text-[#75fa8d] mb-3">
              Launch & Grow
            </h3>
            <p className="text-muted-foreground text-center">
              Get visibility, feedback, and grow your application with our
              community.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
