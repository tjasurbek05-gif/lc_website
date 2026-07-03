"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "@/app/actions/auth";

// One-tap demo logins are a development-only convenience. Gating on NODE_ENV
// (which the bundler statically folds) guarantees these buttons — and the real
// phone numbers/password below — are dead-code-eliminated from production
// builds, so they are never shipped to visitors of a live deployment.
const SHOW_DEMO = process.env.NODE_ENV !== "production";

const DEMO_ACCOUNTS = SHOW_DEMO
  ? [
      { roleKey: "ADMIN", phone: "+998901112201" },
      { roleKey: "TEACHER", phone: "+998901112202" },
      { roleKey: "STUDENT", phone: "+998901112203" },
    ]
  : [];

export function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{tc("phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            required
            placeholder={tc("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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

      {SHOW_DEMO ? (
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
                key={d.phone}
                type="button"
                onClick={() => {
                  setPhone(d.phone);
                  setPassword("password123");
                }}
                className="rounded-lg border border-border bg-card px-2 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-muted"
              >
                {tr(d.roleKey)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("demoHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
