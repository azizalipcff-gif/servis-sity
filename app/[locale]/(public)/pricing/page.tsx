import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/lib/translations";
import { absoluteUrl, localizedLanguages } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  includedTitle: string;
  included: string[];
  handoverTitle: string;
  handover: string[];
  notIncludedTitle: string;
  notIncluded: string[];
  termsTitle: string;
  terms: string[];
  ctaTitle: string;
  ctaText: string;
  demoLabel: string;
  demoUrl: string;
};

const COPY: Record<Locale, Copy> = {
  ar: {
    eyebrow: "البيع التجاري للمشروع",
    title: "Servis Sity — مشروع Marketplace جاهز للتسليم",
    subtitle:
      "نسخة كاملة قابلة للتطوير لمنصة تجمع الأنشطة التجارية والخدمات والمنتجات المحلية. هذه الصفحة مخصصة للشخص الذي يريد شراء المشروع، وليست صفحة اشتراكات SaaS.",
    includedTitle: "ماذا يحصل عليه المشتري؟",
    included: [
      "كود المشروع الكامل Frontend وBackend مع TypeScript وNext.js.",
      "قاعدة البيانات وSupabase: الجداول، migrations، Auth، Storage وRLS حسب إعدادات المشروع.",
      "منظومة الأنشطة التجارية والخدمات والمنتجات والبحث والتصنيفات والمدن.",
      "تسجيل الدخول، الملفات الشخصية، المراسلة، التقييمات ولوحات التحكم.",
      "لوحة الإدارة والمراجعة والموافقة على المحتوى.",
      "دعم اللغات العربية والفرنسية والإنجليزية مع دعم RTL للعربية.",
      "ملفات الإعداد والتوثيق وبيانات Demo/Seed الموجودة في المشروع.",
      "إعدادات Vercel والبنية اللازمة لإكمال النشر بحسابات المشتري.",
    ],
    handoverTitle: "التسليم بعد الشراء",
    handover: [
      "تسليم الكود والمشروع كما هو في النسخة المتفق عليها وقت البيع.",
      "شرح طريقة تشغيل المشروع وربط Supabase وVercel والخدمات المطلوبة.",
      "المشتري يستخدم حساباته الخاصة للخدمات الخارجية مثل Supabase وVercel وأي مزود دفع أو API.",
      "أي نقل للملكية أو حق إعادة البيع أو الحصرية يحدد بوضوح في اتفاق البيع.",
    ],
    notIncludedTitle: "ما لا يجب اعتباره مشمولاً تلقائياً",
    notIncluded: [
      "حسابات المالك الشخصية أو مفاتيح API أو كلمات المرور.",
      "اشتراكات وخدمات الطرف الثالث أو تكاليف الاستضافة والدفع بعد التسليم.",
      "أي تطوير جديد غير موجود في النسخة المتفق عليها، إلا إذا تم الاتفاق عليه بشكل منفصل.",
    ],
    termsTitle: "شروط تجارية مهمة",
    terms: [
      "نطاق التسليم، الحصرية، الملكية، حق إعادة البيع، والدعم بعد البيع يجب أن تكون مكتوبة في اتفاق واضح.",
      "أي Assets أو خدمات خارجية لها شروط ترخيص خاصة بها تبقى خاضعة لتلك الشروط.",
      "النسخة التجريبية المنشورة يمكن استعمالها لعرض المنتج، بينما النقل الفعلي للمشروع يتم وفق اتفاق البيع.",
    ],
    ctaTitle: "للمشتري الجاد",
    ctaText: "يمكن استعمال النسخة المنشورة لمعاينة المنتج قبل الاتفاق على عملية الشراء والتسليم.",
    demoLabel: "معاينة النسخة المنشورة",
    demoUrl: "https://servis-sity-iwtr.vercel.app/en",
  },
  fr: {
    eyebrow: "Vente commerciale du projet",
    title: "Servis Sity — Marketplace prêt à être livré",
    subtitle:
      "Une base complète et évolutive pour une marketplace locale réunissant entreprises, services et produits. Cette page est destinée à l'acheteur du projet, pas à un abonnement SaaS.",
    includedTitle: "Ce que l'acheteur reçoit",
    included: [
      "Le code source complet Frontend et Backend avec TypeScript et Next.js.",
      "La base Supabase : tables, migrations, Auth, Storage et règles RLS utilisées par le projet.",
      "Les modules entreprises, services, produits, recherche, catégories et villes.",
      "Authentification, profils, messagerie, avis et tableaux de bord.",
      "Dashboard administrateur avec modération et validation du contenu.",
      "Arabe, français et anglais, avec support RTL pour l'arabe.",
      "Documentation, configuration et données Demo/Seed présentes dans le projet.",
      "Configuration Vercel et structure nécessaire pour un déploiement avec les comptes de l'acheteur.",
    ],
    handoverTitle: "Livraison après achat",
    handover: [
      "Livraison du code et du projet correspondant à la version convenue au moment de la vente.",
      "Explication du démarrage du projet et de la connexion à Supabase, Vercel et aux services nécessaires.",
      "L'acheteur utilise ses propres comptes pour les services externes, notamment Supabase, Vercel et les éventuels prestataires de paiement/API.",
      "Toute cession de propriété, exclusivité ou droit de revente est définie explicitement dans l'accord de vente.",
    ],
    notIncludedTitle: "Ce qui n'est pas inclus automatiquement",
    notIncluded: [
      "Les comptes personnels du propriétaire, clés API ou mots de passe.",
      "Les abonnements et frais des services tiers, de l'hébergement ou du paiement après la livraison.",
      "Les développements supplémentaires qui ne font pas partie de la version convenue, sauf accord séparé.",
    ],
    termsTitle: "Conditions commerciales importantes",
    terms: [
      "Le périmètre livré, la propriété, l'exclusivité, le droit de revente et le support après-vente doivent être précisés dans un accord écrit.",
      "Les assets ou services tiers restent soumis à leurs propres conditions de licence.",
      "La version publiée sert de démonstration avant l'accord ; le transfert réel du projet suit les conditions de vente convenues.",
    ],
    ctaTitle: "Pour un acheteur sérieux",
    ctaText: "La version publiée peut être utilisée pour vérifier le produit avant de convenir de l'achat et de la livraison.",
    demoLabel: "Voir la version publiée",
    demoUrl: "https://servis-sity-iwtr.vercel.app/en",
  },
  en: {
    eyebrow: "Commercial project sale",
    title: "Servis Sity — Production-ready local marketplace project",
    subtitle:
      "A complete, extensible foundation for a local marketplace connecting businesses, services and products. This page is for the project buyer, not SaaS subscriptions.",
    includedTitle: "What the buyer receives",
    included: [
      "The complete Frontend and Backend source code using TypeScript and Next.js.",
      "The Supabase database layer: tables, migrations, Auth, Storage and project RLS policies.",
      "Business, service, product, search, category and city marketplace modules.",
      "Authentication, profiles, messaging, reviews and dashboards.",
      "Admin dashboard with content moderation and approval workflows.",
      "Arabic, French and English, including RTL support for Arabic.",
      "Project documentation, configuration and the existing Demo/Seed data files.",
      "Vercel configuration and the structure needed for deployment using the buyer's own accounts.",
    ],
    handoverTitle: "Handover after purchase",
    handover: [
      "Delivery of the project source and agreed version at the time of sale.",
      "Guidance for running the project and connecting Supabase, Vercel and required services.",
      "The buyer uses their own accounts for external services such as Supabase, Vercel and any payment/API providers.",
      "Any ownership transfer, exclusivity or resale rights are defined explicitly in the sales agreement.",
    ],
    notIncludedTitle: "Not automatically included",
    notIncluded: [
      "Personal owner accounts, API keys or passwords.",
      "Third-party subscriptions, hosting costs or payment-service fees after handover.",
      "New development work outside the agreed version, unless separately agreed.",
    ],
    termsTitle: "Important commercial terms",
    terms: [
      "The delivery scope, ownership, exclusivity, resale rights and post-sale support should be stated in a written agreement.",
      "Third-party assets or services remain subject to their own licensing terms.",
      "The published version is available for product review; the actual project transfer follows the agreed sale terms.",
    ],
    ctaTitle: "For a serious buyer",
    ctaText: "Use the published version to review the product before agreeing on the purchase and handover.",
    demoLabel: "View the published version",
    demoUrl: "https://servis-sity-iwtr.vercel.app/en",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = (locale in COPY ? locale : "en") as Locale;
  const copy = COPY[safeLocale];

  return {
    title: copy.title,
    description: copy.subtitle,
    alternates: {
      canonical: absoluteUrl(`/${safeLocale}/pricing`),
      languages: localizedLanguages(`/pricing`),
    },
    openGraph: {
      title: copy.title,
      description: copy.subtitle,
      url: absoluteUrl(`/${safeLocale}/pricing`),
      siteName: "Servis Sity",
      images: [{ url: absoluteUrl("/branding/service-city-logo.png") }],
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const safeLocale = (locale in COPY ? locale : "en") as Locale;
  const copy = COPY[safeLocale];
  setRequestLocale(safeLocale);

  return (
    <main className="container-site py-14">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
          {copy.subtitle}
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{copy.includedTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {copy.included.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 shrink-0 text-primary" aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{copy.handoverTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {copy.handover.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 shrink-0 text-primary" aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{copy.notIncludedTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {copy.notIncluded.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 shrink-0" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{copy.termsTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {copy.terms.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 shrink-0 text-primary" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mx-auto mt-8 max-w-6xl rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold">{copy.ctaTitle}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {copy.ctaText}
        </p>
        <a
          href={copy.demoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {copy.demoLabel}
        </a>
      </section>
    </main>
  );
}
