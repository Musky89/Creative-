"use client";

import { usePathname } from "next/navigation";
import { ClientTabs } from "./client-tabs";

export function ClientTabsAuto({ clientId }: { clientId: string }) {
  const path = usePathname();
  let current: "overview" | "brand" | "blueprint" | "briefs" = "overview";
  if (path.includes("/brand-bible")) current = "brand";
  else if (path.includes("/service-blueprint")) current = "blueprint";
  else if (path.includes("/briefs")) current = "briefs";

  return <ClientTabs clientId={clientId} current={current} />;
}
