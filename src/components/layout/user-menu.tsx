"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, SignOut as LogOut, MapTrifold as Map, User } from "@phosphor-icons/react/dist/ssr";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/format";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  href: string;
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const panel = "absolute right-0 top-12 z-50 w-80 origin-top-right rounded-md border border-ink/15 bg-surface p-1.5 text-ink shadow-[var(--shadow-float)] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] starting:scale-95 starting:opacity-0";

export function NotificationsMenu({ items }: { items: AppNotification[] }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="press relative flex h-10 w-10 items-center justify-center rounded-md text-board-text hoverable:hover:bg-white/10" aria-label={`Notifiche (${items.length})`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {items.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-board" />}
      </button>
      {open && (
        <div className={panel} role="menu">
          <p className="col-label px-3 pb-1 pt-2 text-muted">Notifiche</p>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">Tutto tranquillo. Ti avvisiamo qui quando un viaggio si avvicina.</p>
          ) : (
            items.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="block rounded-sm px-3 py-2.5 hoverable:hover:bg-ink/[0.06]" role="menuitem">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted">{n.description}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function UserMenu({ name }: { name: string }) {
  const { open, setOpen, ref } = usePopover();
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const item = "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium hoverable:hover:bg-ink/[0.06]";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="press flex h-9 w-9 items-center justify-center rounded-md bg-board-frame text-sm font-bold text-board-text hoverable:hover:bg-board-dim/40" aria-label="Menu profilo" aria-expanded={open}>
        {initials}
      </button>
      {open && (
        <div className={cn(panel, "w-56")} role="menu">
          <p className="truncate px-3 pb-2 pt-2 text-sm font-semibold">{name}</p>
          <Link href="/viaggi" className={item} onClick={() => setOpen(false)} role="menuitem">
            <Map className="h-4 w-4" /> I miei viaggi
          </Link>
          <Link href="/profilo" className={item} onClick={() => setOpen(false)} role="menuitem">
            <User className="h-4 w-4" /> Profilo e preferenze
          </Link>
          <form action={logoutAction}>
            <button className={cn(item, "text-danger")} role="menuitem">
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
