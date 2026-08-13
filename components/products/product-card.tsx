"use client";

import { ResultCardShell } from "@/components/search/result-card-shell";
import {
  toProductItemData,
  type ProductCardInput,
  type ResultSellerInput,
} from "@/components/search/card-data";

export type ProductCardSeller = ResultSellerInput;

export function ProductCard({
  product,
  seller,
  showSeller = true,
  index = 0,
}: {
  product: ProductCardInput;
  seller?: ProductCardSeller;
  showSeller?: boolean;
  index?: number;
}) {
  return (
    <ResultCardShell
      index={index}
      data={toProductItemData(product, seller, showSeller)}
    />
  );
}