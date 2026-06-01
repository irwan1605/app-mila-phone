import React, { useMemo } from "react";
import { buildInventoryReportSuperAdmin }
from "./utils/buildInventoryReportSuperAdmin";

export default function CardPersediaanBarang({
  detailStock = {},
}) {

  const tokoList = useMemo(() => {

    const rows =
      buildInventoryReportSuperAdmin({
        detailStock,
      }).filter((toko) => {

        const total =
          Object.values(
            toko?.kategori || {}
          ).reduce(
            (sum, qty) =>
              sum + Number(qty || 0),
            0
          );

        return total > 0;
      });

    console.log(
      "🔥 INVENTORY REAL FINAL",
      rows
    );

    return rows;

  }, [detailStock]);

  return tokoList;
}