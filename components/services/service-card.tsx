"use client";

import { ResultCardShell } from "@/components/search/result-card-shell";
import {
  toServiceItemData,
  type ServiceCardInput,
  type ResultSellerInput,
} from "@/components/search/card-data";

export type ServiceCardSeller = ResultSellerInput;

export function ServiceCard({
  service,
  seller,
}: {
  service: ServiceCardInput;
  seller?: ServiceCardSeller;
}) {
  return <ResultCardShell data={toServiceItemData(service, seller)} />;
}