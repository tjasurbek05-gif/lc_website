"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "@/app/actions/auth";

const DEMO_ACCOUNTS = [
  { roleKey: "ADMIN", email: "admin@demo.com" },
  { roleKey: "TEACHER", email: "teacher@demo.com" },
  { roleKey: "STUDENT", email: "student@demo.com" },
];

export function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{tc("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{tc("password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {state?.error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t(state.error)}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      <div className="mt-8">
        <div className="relative flex items-center">
          <span className="h-px flex-1 bg-border" />
          <span className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("demoTitle")}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
              className="rounded-lg border border-border bg-card px-2 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-muted"
            >
              {tr(d.roleKey)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("demoHint")}</p>
      </div>
    </div>
  );
}
