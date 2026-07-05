import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-black/50 dark:text-white/50 py-12 text-center">
          Loading dashboard...
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
