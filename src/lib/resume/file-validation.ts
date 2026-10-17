export const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_RESUME_TEXT_CHARACTERS = 200_000;
export const RESUME_PDF_MIME = "application/pdf";
export const RESUME_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ResumeFileKind = "pdf" | "docx";
export type ResumeImportErrorCode =
  | "unsupported_type"
  | "file_too_large"
  | "invalid_file"
  | "empty_document"
  | "ocr_required"
  | "document_too_complex"
  | "parser_timeout"
  | "parser_failed";

export class ResumeImportError extends Error {
  constructor(public readonly code: ResumeImportErrorCode, message: string) {
    super(message);
    this.name = "ResumeImportError";
  }
}

export type ValidatedResumeFile = {
  kind: ResumeFileKind;
  mediaType: typeof RESUME_PDF_MIME | typeof RESUME_DOCX_MIME;
  safeName: string;
  bytes: Uint8Array;
};

export function validateResumeUpload(input: {
  name: string;
  type: string;
  declaredSize: number;
  bytes: Uint8Array;
}): ValidatedResumeFile {
  const extension = input.name.toLowerCase().match(/\.(pdf|docx)$/)?.[1];
  if (!extension) throw new ResumeImportError("unsupported_type", "Choose a PDF or DOCX resume.");
  if (input.declaredSize <= 0 || input.bytes.byteLength === 0) {
    throw new ResumeImportError("invalid_file", "The selected file is empty.");
  }
  if (input.declaredSize > MAX_RESUME_FILE_BYTES || input.bytes.byteLength > MAX_RESUME_FILE_BYTES) {
    throw new ResumeImportError("file_too_large", "Resume files must be 10 MB or smaller.");
  }
  if (input.declaredSize !== input.bytes.byteLength) {
    throw new ResumeImportError("invalid_file", "The uploaded file could not be read completely.");
  }

  const isPdf = extension === "pdf";
  const expectedType = isPdf ? RESUME_PDF_MIME : RESUME_DOCX_MIME;
  if (input.type && input.type !== expectedType && input.type !== "application/octet-stream") {
    throw new ResumeImportError("unsupported_type", "The file extension and declared file type do not match.");
  }

  const prefix = new TextDecoder("ascii").decode(input.bytes.slice(0, Math.min(1024, input.bytes.length)));
  const hasValidSignature = isPdf
    ? prefix.includes("%PDF-")
    : input.bytes[0] === 0x50 && input.bytes[1] === 0x4b && input.bytes[2] === 0x03 && input.bytes[3] === 0x04;
  if (!hasValidSignature) {
    throw new ResumeImportError("invalid_file", "The file contents do not match a valid PDF or DOCX document.");
  }

  const safeName = input.name
    .split(/[\\/]/)
    .at(-1)!
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180) || `resume.${extension}`;

  return { kind: isPdf ? "pdf" : "docx", mediaType: expectedType, safeName, bytes: input.bytes };
}

export function requireExtractableText(value: string, kind: ResumeFileKind): string {
  const text = value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
  if (!text) {
    if (kind === "pdf") {
      throw new ResumeImportError("ocr_required", "No selectable text was found. This PDF may be scanned; OCR is required before it can be imported.");
    }
    throw new ResumeImportError("empty_document", "No readable text was found in this DOCX file.");
  }
  if (kind === "pdf" && text.replace(/\s/g, "").length < 20) {
    throw new ResumeImportError("ocr_required", "This PDF has too little selectable text to import. If it is a scan, OCR is required.");
  }
  return text;
}