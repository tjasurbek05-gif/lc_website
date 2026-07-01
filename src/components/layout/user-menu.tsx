"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/app/actions/auth";

export function UserMenu({
  name,
  phone,
  roleLabel,
}: {
  name: string;
  phone: string;
  roleLabel: string;
}) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();

  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-muted sm:pr-2">
          <Avatar name={name} className="size-8" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">{name}</span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {roleLabel}
            </span>
          </span>
        </span>
      }
    >
      <div className="px-3 py-2">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{phone}</p>
      </div>
      <div className="my-1 h-px bg-border" />
      <DropdownItem
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await logout();
          })
        }
        className="text-destructive hover:bg-destructive/10 [&_svg]:text-destructive"
      >
        <LogOut />
        {t("signOut")}
      </DropdownItem>
    </Dropdown>
  );
}
