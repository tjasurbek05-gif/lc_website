"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { locales, localeFlags, localeNames, type Locale } from "@/i18n/config";
import { setLocale } from "@/app/actions/locale";

export function LanguageSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("language");
  const [pending, startTransition] = useTransition();

  function change(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <Dropdown
      trigger={
        <span className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm transition-colors hover:bg-muted">
          <Globe className="size-4 text-muted-foreground" />
          <span className="hidden sm:inline">{localeFlags[current]}</span>
        </span>
      }
    >
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {t("label")}
      </p>
      {locales.map((loc) => (
        <DropdownItem
          key={loc}
          active={loc === current}
          disabled={pending}
          onClick={() => change(loc)}
        >
          <span aria-hidden>{localeFlags[loc]}</span>
          <span className="flex-1">{localeNames[loc]}</span>
          {loc === current ? <Check className="size-4 text-primary" /> : null}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
