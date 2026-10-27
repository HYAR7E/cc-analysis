import { UploadDropzone } from "@/components/UploadDropzone";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload statement</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Drop a credit card statement PDF below. Transactions will be parsed,
          categorized, and added to your dashboard.
        </p>
      </div>
      <UploadDropzone />
      <div className="text-xs text-black/50 dark:text-white/50 border-t border-black/10 dark:border-white/10 pt-4">
        Supports BCP credit card statements (Spanish). Re-uploads are deduped
        by file hash (SHA-256) and by statement period. PEN and USD transactions are split automatically
        based on the country code on each row.
      </div>
    </div>
  );
}
