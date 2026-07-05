import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-black/60 dark:text-white/60 mb-2">
      {children}
    </h2>
  );
}
