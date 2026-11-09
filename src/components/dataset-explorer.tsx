"use client";

import { ChartColumn, Table2 } from "lucide-react";
import { ChartBuilder, type ChartColumnInfo } from "@/components/chart-builder";
import { DatasetTable } from "@/components/dataset-table";
import { Panel } from "@/components/ui";

type Cell = string | number | null;

/** Az adatkészlet sorait egyszer küldi a kliensnek; az ábrakészítő és az előnézet is ezt használja. */
export function DatasetExplorer({ headers, columns, rows }: { headers: string[]; columns: ChartColumnInfo[]; rows: Cell[][] }) {
  return (
    <>
      <Panel title="Ábrakészítő" icon={ChartColumn}>
        <ChartBuilder columns={columns} rows={rows} />
      </Panel>
      <Panel title="Adatok" icon={Table2}>
        <DatasetTable headers={headers} rows={rows} />
      </Panel>
    </>
  );
}
