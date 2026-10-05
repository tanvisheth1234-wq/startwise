// app/plan/[planId]/orders/page.tsx — Order book
import { getTranslations } from "next-intl/server";
import { loadOrders } from "@/features/orders/actions";
import { OrderBookView } from "@/features/orders/components/OrderBookView";
import { todayInIndia } from "@/features/validate/lib/testPlan";
import { requirePlan } from "@/lib/auth";
import { itemWord } from "@/features/money/server/store";

export default async function OrdersPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await requirePlan(planId);
  const t = await getTranslations("orders");
  const [book, item] = await Promise.all([loadOrders(planId), itemWord(planId, plan.profile?.businessType ?? "other", plan.language)]);
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-forest">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <OrderBookView planId={planId} initial={book} today={todayInIndia()} item={item} />
    </div>
  );
}
