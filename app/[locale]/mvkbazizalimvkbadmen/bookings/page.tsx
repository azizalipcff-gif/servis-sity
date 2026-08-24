import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAllBookings } from "@/lib/queries";
import { BookingsTable } from "@/components/admin/bookings-table";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminBookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const bookings = await getAllBookings();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("bookings")}</h2>
      <BookingsTable bookings={bookings} />
    </div>
  );
}
