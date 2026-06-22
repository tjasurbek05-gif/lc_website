import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    {
      icon: GraduationCap,
      title: t("feature1Title"),
      body: t("feature1Body"),
    },
    { icon: ClipboardList, title: t("feature2Title"), body: t("feature2Body") },
    { icon: LayoutDashboard, title: t("feature3Title"), body: t("feature3Body") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "default" }), "shadow-sm")}
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-32 -top-24 -z-10 size-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5 text-primary" />
              {t("footer")}
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "shadow-md shadow-primary/20",
                )}
              >
                {t("getStarted")}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Decorative dashboard preview */}
          <HeroPreview />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-8 py-14 text-center text-white">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/80">{t("ctaBody")}</p>
          <div className="relative mt-8">
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 font-medium text-indigo-700 shadow-sm transition-colors hover:bg-white/90"
            >
              {t("getStarted")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} LearnCenter. {t("footer")}</p>
        </div>
      </footer>
    </div>
  );
}

function HeroPreview() {
  const bars = [55, 70, 62, 80, 88, 94];
  const stats = [
    { icon: Users, label: "Students", value: "128" },
    { icon: BookOpen, label: "Subjects", value: "12" },
    { icon: TrendingUp, label: "Avg", value: "86%" },
  ];
  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-xl border border-border bg-background p-3">
                <Icon className="size-4 text-primary" />
                <p className="mt-2 text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="flex h-32 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
