"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { formatDate } from "@/lib/format";

type UploadStatus =
  | { state: "idle" }
  | { state: "uploading"; fileName: string }
  | {
      state: "done";
      fileName: string;
      result:
        | { status: "ok"; statementId: string; transactionsInserted: number }
        | {
            status: "duplicate";
            statementId: string;
            reason: "hash" | "period";
            existingFileName: string;
            periodStart?: string;
            periodEnd?: string;
          };
    }
  | { state: "error"; fileName: string; message: string };

export function UploadDropzone() {
  const [status, setStatus] = useState<UploadStatus>({ state: "idle" });
  const [password, setPassword] = useState("");
  const passwordRef = useRef("");
  passwordRef.current = password;

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;

    setStatus({ state: "uploading", fileName: file.name });
    const form = new FormData();
    form.append("file", file);
    const pw = passwordRef.current.trim();
    if (pw) form.append("password", pw);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setStatus({ state: "done", fileName: file.name, result: json });
    } catch (e) {
      setStatus({
        state: "error",
        fileName: file.name,
        message: e instanceof Error ? e.message : "Upload failed",
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: status.state === "uploading",
  });

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs text-black/60 dark:text-white/60">
          PDF password (optional)
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave empty if not protected"
          disabled={status.state === "uploading"}
          className="mt-1 w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
      </label>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
          isDragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40"
        } ${status.state === "uploading" ? "opacity-60 cursor-wait" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm">
          {isDragActive
            ? "Drop the PDF here..."
            : "Drag and drop a credit card statement PDF, or click to select"}
        </p>
        <p className="text-xs text-black/50 dark:text-white/50 mt-2">
          Max 10 MB. Only .pdf
        </p>
      </div>

      {status.state === "uploading" && (
        <div className="text-sm">Uploading {status.fileName}...</div>
      )}

      {status.state === "done" && status.result.status === "ok" && (
        <div className="rounded border border-green-600/30 bg-green-600/10 text-sm p-3">
          Ingested <strong>{status.fileName}</strong>. Saved{" "}
          {status.result.transactionsInserted} transaction(s).
          <div className="text-xs text-black/60 dark:text-white/60 mt-1">
            Statement ID: {status.result.statementId}
          </div>
        </div>
      )}

      {status.state === "done" && status.result.status === "duplicate" && (
        <div className="rounded border border-amber-600/30 bg-amber-600/10 text-sm p-3">
          {status.result.reason === "period" &&
          status.result.periodStart &&
          status.result.periodEnd ? (
            <>
              Statement for period{" "}
              {formatDate(status.result.periodStart)} –{" "}
              {formatDate(status.result.periodEnd)} already uploaded (
              <strong>{status.result.existingFileName}</strong>). Skipped.
            </>
          ) : (
            <>
              <strong>{status.fileName}</strong> already ingested (
              {status.result.existingFileName}). Skipped.
            </>
          )}
          <div className="text-xs text-black/60 dark:text-white/60 mt-1">
            Statement ID: {status.result.statementId}
          </div>
        </div>
      )}

      {status.state === "error" && (
        <div className="rounded border border-red-600/30 bg-red-600/10 text-sm p-3">
          Failed to upload {status.fileName}: {status.message}
        </div>
      )}
    </div>
  );
}
