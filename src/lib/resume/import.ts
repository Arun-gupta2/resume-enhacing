import "server-only";

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { resumeDataSchema, type ResumeData } from "@/lib/resume/schema";
import { parseResumeText } from "@/lib/resume/parse-text";
import {
  MAX_RESUME_FILE_BYTES,
  MAX_RESUME_TEXT_CHARACTERS,
  ResumeImportError,
  requireExtractableText,
  validateResumeUpload,
  type ValidatedResumeFile,
} from "@/lib/resume/file-validation";
import type { ResumeFileKind } from "@/lib/resume/file-validation";

export { ResumeImportError } from "@/lib/resume/file-validation";

export type ParsedResumeImport = {
  fileName: string;
  mediaType: string;
  data: ResumeData;
  warnings: string[];
  pageCount: number | null;
};

type WorkerOutput = {
  text?: string;
  pageCount?: number | null;
  warnings?: number;
  error?: "invalid_file" | "document_too_complex" | "parser_failed";
};

const extractionWorkerSource = `
const { parentPort, workerData } = require("node:worker_threads");

(async () => {
  if (workerData.kind === "pdf") {
    const pdfjs = await import(workerData.pdfjsUrl);
    const task = pdfjs.getDocument({
      data: new Uint8Array(workerData.bytes),
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      stopAtErrors: true,
    });
    const document = await task.promise;
    const cleanupPdf = async () => {
      try {
        if (typeof document.cleanup === "function") await document.cleanup();
        if (typeof task.destroy === "function") await task.destroy();
        else if (typeof document.destroy === "function") await document.destroy();
      } catch {
        // ignore cleanup errors
      }
    };

    if (document.numPages > 100) {
      await cleanupPdf();
      parentPort.postMessage({ error: "document_too_complex" });
      return;
    }

    const pages = [];
    let size = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (typeof item.str !== "string") continue;
        pageText += item.str + (item.hasEOL ? "\\n" : " ");
      }
      size += pageText.length;
      if (size > workerData.maxCharacters) {
        await cleanupPdf();
        parentPort.postMessage({ error: "document_too_complex" });
        return;
      }
      pages.push(pageText);
      page.cleanup();
    }
    await cleanupPdf();
    parentPort.postMessage({ text: pages.join("\\n\\n"), pageCount: document.numPages, warnings: 0 });
    return;
  }

  const mammoth = require(workerData.mammothPath);
  const result = await mammoth.extractRawText({ buffer: Buffer.from(workerData.bytes) });
  if (result.value.length > workerData.maxCharacters) {
    parentPort.postMessage({ error: "document_too_complex" });
    return;
  }
  parentPort.postMessage({ text: result.value, pageCount: null, warnings: result.messages.length });
})().catch((err) => {
  console.error("Resume extraction worker error:", err);
  parentPort.postMessage({ error: "parser_failed" });
});
`;

function resolveDiskModulePath(subpath: string): string {
  const directPath = path.join(process.cwd(), "node_modules", subpath);
  if (fs.existsSync(directPath)) {
    return directPath;
  }
  try {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    const resolved = req.resolve(subpath);
    const cleaned = resolved.replace(/[/\\]\(rsc\)[/\\]/g, path.sep);
    if (fs.existsSync(cleaned)) return cleaned;
    return resolved;
  } catch {
    return directPath;
  }
}

async function extractWithWorker(file: ValidatedResumeFile): Promise<WorkerOutput> {
  const pdfjsDiskPath = resolveDiskModulePath("pdfjs-dist/legacy/build/pdf.mjs");
  const mammothDiskPath = resolveDiskModulePath("mammoth/lib/index.js");

  const workerData = {
    kind: file.kind,
    bytes: file.bytes,
    maxCharacters: MAX_RESUME_TEXT_CHARACTERS,
    mammothPath: mammothDiskPath,
    pdfjsUrl: pathToFileURL(pdfjsDiskPath).href,
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(extractionWorkerSource, {
      eval: true,
      workerData,
      resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
      void worker.terminate();
    };
    const timeout = setTimeout(() => {
      finish(() => reject(new ResumeImportError("parser_timeout", "This file took too long to read. Try a simpler or smaller document.")));
    }, 15_000);

    worker.once("message", (result: WorkerOutput) => finish(() => resolve(result)));
    worker.once("error", () => finish(() => reject(new ResumeImportError("parser_failed", "This document could not be read. Try exporting it again as PDF or DOCX."))));
    worker.once("exit", (code) => {
      if (code !== 0 && !settled) {
        finish(() => reject(new ResumeImportError("parser_failed", "This document could not be read. Try exporting it again as PDF or DOCX.")));
      }
    });
  });
}

export async function parseResumeUpload(input: {
  name: string;
  type: string;
  declaredSize: number;
  bytes: Uint8Array;
}): Promise<ParsedResumeImport> {
  const file = validateResumeUpload(input);
  const extracted = await extractWithWorker(file);
  if (extracted.error === "document_too_complex") {
    throw new ResumeImportError("document_too_complex", "This document contains too many pages or too much text to import safely.");
  }
  if (extracted.error || typeof extracted.text !== "string") {
    throw new ResumeImportError("parser_failed", "This document could not be read. Try exporting it again as PDF or DOCX.");
  }

  const text = requireExtractableText(extracted.text, file.kind);

  const parsed = parseResumeText(text);
  const schemaResult = resumeDataSchema.safeParse(parsed.data);
  if (!schemaResult.success) {
    throw new ResumeImportError("parser_failed", "The extracted resume could not be safely structured. You can still start with a blank resume.");
  }

  const warnings = [...parsed.warnings];
  if ((extracted.warnings ?? 0) > 0) warnings.push("Some DOCX formatting was omitted during text extraction.");
  return {
    fileName: file.safeName,
    mediaType: file.mediaType,
    data: schemaResult.data,
    warnings: warnings.slice(0, 8),
    pageCount: extracted.pageCount ?? null,
  };
}