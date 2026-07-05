import { Suspense } from "react";
import { YearlyReport } from "@/components/YearlyReport";

export default function YearlyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-black/50 dark:text-white/50">
          Loading report...
        </div>
      }
    >
      <YearlyReport />
    </Suspense>
  );
}
