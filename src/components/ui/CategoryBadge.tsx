export function categoryDisplayLabel(meta: {
  emoji: string;
  label: string;
}): string {
  return `${meta.emoji} ${meta.label}`;
}

export function CategoryDot({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20 ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function CategoryBadge({
  emoji,
  label,
  color,
  className = "",
}: {
  emoji: string;
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <CategoryDot color={color} />
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
