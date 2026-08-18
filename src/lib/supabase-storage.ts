import { createClient } from "@supabase/supabase-js";

export const PROJECT_FILES_BUCKET = "bridgepay-project-files";
export const KYC_DOCUMENTS_BUCKET = "bridgepay-kyc-documents";
export const MAX_PROJECT_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_KYC_FILE_SIZE = 10 * 1024 * 1024;

export const allowedProjectFileExtensions = [
  ".zip",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".fig",
  ".doc",
  ".docx",
];

export const allowedProjectFileMimeTypes = [
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

export const allowedKycFileExtensions = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

export const allowedKycFileMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage env vars are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function ensureProjectFilesBucket() {
  const supabase = getSupabaseAdmin();
  const { error: getError } = await supabase.storage.getBucket(
    PROJECT_FILES_BUCKET,
  );

  if (!getError) {
    return supabase;
  }

  const { error: createError } = await supabase.storage.createBucket(
    PROJECT_FILES_BUCKET,
    {
      public: false,
      fileSizeLimit: MAX_PROJECT_FILE_SIZE,
      allowedMimeTypes: allowedProjectFileMimeTypes,
    },
  );

  if (createError && !createError.message.toLowerCase().includes("exists")) {
    throw new Error(`Failed to create Supabase bucket: ${createError.message}`);
  }

  return supabase;
}

export async function ensureKycDocumentsBucket() {
  const supabase = getSupabaseAdmin();
  const { error: getError } = await supabase.storage.getBucket(
    KYC_DOCUMENTS_BUCKET,
  );

  if (!getError) {
    return supabase;
  }

  const { error: createError } = await supabase.storage.createBucket(
    KYC_DOCUMENTS_BUCKET,
    {
      public: false,
      fileSizeLimit: MAX_KYC_FILE_SIZE,
      allowedMimeTypes: allowedKycFileMimeTypes,
    },
  );

  if (createError && !createError.message.toLowerCase().includes("exists")) {
    throw new Error(`Failed to create Supabase bucket: ${createError.message}`);
  }

  return supabase;
}

export function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function isAllowedProjectFile(file: File) {
  const extension = getFileExtension(file.name);

  return (
    allowedProjectFileExtensions.includes(extension) &&
    (allowedProjectFileMimeTypes.includes(file.type) || file.type === "")
  );
}

export function isAllowedKycFile(file: File) {
  const extension = getFileExtension(file.name);

  return (
    allowedKycFileExtensions.includes(extension) &&
    allowedKycFileMimeTypes.includes(file.type)
  );
}
