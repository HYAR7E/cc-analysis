import { CategoryManager } from "@/components/CategoryManager";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Manage spending categories and the patterns that auto-classify
          merchants on import. Patterns match anywhere in the merchant string,
          case-insensitive — not regex.
        </p>
      </div>
      <CategoryManager />
    </div>
  );
}
