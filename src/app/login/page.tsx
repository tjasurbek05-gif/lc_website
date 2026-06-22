import { getTranslations } from "next-intl/server";
import { GraduationCap, ClipboardList, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const tl = await getTranslations("landing");

  const points = [
    { icon: GraduationCap, text: tl("feature1Body") },
    { icon: ClipboardList, text: tl("feature2Body") },
    { icon: LayoutDashboard, text: tl("feature3Body") },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
        <Logo variant="light" />
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            {tl("heroTitle")}
          </h1>
          <ul className="mt-8 space-y-4">
            {points.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-5" />
                  </span>
                  <span className="pt-1.5 text-sm text-white/90">{p.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">{tl("footer")}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h2>
            <p className="mt-1 text-muted-foreground">{t("loginSubtitle")}</p>
            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
