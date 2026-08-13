"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Package,
  Plus,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function AddContentButton({ hasBusiness }: { hasBusiness: boolean }) {
  const t = useTranslations("workspace");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Plus className="size-4" />
        {t("add.trigger")}
      </Button>

      <AnimatePresence>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("add.title")}
            className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4"
          >
            <motion.button
              type="button"
              aria-label={t("add.close")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 cursor-default bg-black/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-2xl rounded-3xl border bg-card p-6 shadow-2xl sm:p-8"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("add.close")}
                className="absolute end-4 top-4 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>

              <div className="mb-6 pe-10">
                <h2 className="text-editorial text-2xl">{t("add.title")}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("add.subtitle")}
                </p>
                <span
                  aria-hidden
                  className="mt-3 block h-px w-12 bg-gold"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <AddOption
                  href="/dashboard"
                  icon={Building2}
                  title={t("add.businessTitle")}
                  description={t("add.businessDesc")}
                  cta={
                    hasBusiness ? t("add.businessCtaManage") : t("add.businessCta")
                  }
                />
                <AddOption
                  href={hasBusiness ? "/dashboard?tab=services" : "/dashboard"}
                  icon={Wrench}
                  title={t("add.serviceTitle")}
                  description={t("add.serviceDesc")}
                  cta={t("add.serviceCta")}
                  locked={!hasBusiness}
                  lockHint={t("add.needBusiness")}
                />
                <AddOption
                  href={hasBusiness ? "/dashboard?tab=products" : "/dashboard"}
                  icon={Package}
                  title={t("add.productTitle")}
                  description={t("add.productDesc")}
                  cta={t("add.productCta")}
                  locked={!hasBusiness}
                  lockHint={t("add.needBusiness")}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function AddOption({
  href,
  icon: Icon,
  title,
  description,
  cta,
  locked,
  lockHint,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  locked?: boolean;
  lockHint?: string;
}) {
  return (
    <Link
      href={href}
      className={cnCard(locked)}
      aria-label={title}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <span className={cnTitle(locked)}>{title}</span>
      <span className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </span>
      {locked ? (
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-medium text-muted-foreground/80">
          {lockHint}
        </span>
      ) : (
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-primary">
          {cta}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      )}
    </Link>
  );
}

function cnCard(locked?: boolean) {
  return [
    "group relative flex flex-col gap-2 rounded-2xl border p-5 text-start transition-all duration-200",
    locked
      ? "border-dashed border-border bg-muted/40"
      : "border-border bg-card shadow-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift",
  ].join(" ");
}

function cnTitle(locked?: boolean) {
  return [
    "text-base font-semibold tracking-tight",
    locked ? "text-muted-foreground" : "text-foreground",
  ].join(" ");
}