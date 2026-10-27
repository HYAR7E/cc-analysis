import Link from "next/link";
import {
  getStatementSummaries,
  type StatementSummary,
} from "@/lib/statements";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type SortDir = "asc" | "desc";

const SORT_KEYS = {
  file: (s: StatementSummary) => s.fileName.toLowerCase(),
  period: (s: StatementSummary) => s.periodStart,
  uploaded: (s: StatementSummary) => s.uploadedAt,
  records: (s: StatementSummary) => s.transactionCount,
  pen: (s: StatementSummary) => s.pen.total,
  usd: (s: StatementSummary) => s.usd.total,
  dates: (s: StatementSummary) => s.firstTransactionDate,
} as const;

type SortKey = keyof typeof SORT_KEYS;

const DEFAULT_SORT: SortKey = "uploaded";

function isSortKey(value: string | undefined): value is SortKey {
  return value !== undefined && value in SORT_KEYS;
}

/** Text columns start ascending; dates and amounts start descending. */
function defaultDir(key: SortKey): SortDir {
  return key === "file" ? "asc" : "desc";
}

function sortStatements(
  statements: StatementSummary[],
  key: SortKey,
  dir: SortDir,
): StatementSummary[] {
  const getValue = SORT_KEYS[key];
  const sign = dir === "asc" ? 1 : -1;
  return [...statements].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    // Missing values always go last, regardless of direction.
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return 0;
  });
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  align?: "left" | "right";
}) {
  const active = column === sort;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir(column);
  const arrow = active ? (dir === "asc" ? "▲" : "▼") : "";
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={`/files?sort=${column}&dir=${nextDir}`}
        className={`hover:underline ${active ? "text-black dark:text-white" : ""}`}
      >
        {label}
        {arrow && <span className="ml-1 text-[10px]">{arrow}</span>}
      </Link>
    </th>
  );
}

function formatRange(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const sort = isSortKey(params.sort) ? params.sort : DEFAULT_SORT;
  const dir: SortDir =
    params.dir === "asc" || params.dir === "desc" ? params.dir : defaultDir(sort);
  const statements = sortStatements(await getStatementSummaries(), sort, dir);
  const totalRecords = statements.reduce(
    (sum, s) => sum + s.transactionCount,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Files</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Uploaded statements and the records each one generated.{" "}
          {statements.length} file(s), {totalRecords} record(s).
        </p>
      </div>

      {statements.length === 0 ? (
        <div className="text-sm text-black/60 dark:text-white/60">
          No statements uploaded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
              <tr>
                <SortHeader label="File" column="file" sort={sort} dir={dir} />
                <SortHeader label="Period" column="period" sort={sort} dir={dir} />
                <SortHeader label="Uploaded" column="uploaded" sort={sort} dir={dir} />
                <SortHeader label="Records" column="records" sort={sort} dir={dir} align="right" />
                <SortHeader label="PEN" column="pen" sort={sort} dir={dir} align="right" />
                <SortHeader label="USD" column="usd" sort={sort} dir={dir} align="right" />
                <SortHeader label="Transaction dates" column="dates" sort={sort} dir={dir} />
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr
                  key={s.id}
                  className="border-b last:border-b-0 border-black/5 dark:border-white/5 align-top"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.fileName}</div>
                    <div className="text-xs font-mono text-black/50 dark:text-white/50">
                      {s.fileHashShort}
                    </div>
                    {s.overlapsWith.length > 0 && (
                      <div className="mt-1 inline-block rounded border border-amber-600/30 bg-amber-600/10 px-1.5 py-0.5 text-xs">
                        Period overlaps{" "}
                        {s.overlapsWith.map((o) => o.fileName).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatRange(s.periodStart, s.periodEnd)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTime(s.uploadedAt)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.transactionCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    <div>{formatCurrency(s.pen.total, "PEN")}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                      {s.pen.count} rec.
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    <div>{formatCurrency(s.usd.total, "USD")}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                      {s.usd.count} rec.
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatRange(s.firstTransactionDate, s.lastTransactionDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
