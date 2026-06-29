import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Persists rendered quote/invoice PDFs to the private `documents` bucket and
 * records each one in the `documents` table (Approach A: tracked archive +
 * signed URLs). Called at send time so the stored copy is a frozen record of
 * exactly what the client received.
 *
 * Archiving is best-effort: a storage/db failure here must never fail the send
 * that already happened, so callers log the returned error and move on.
 */

export const DOCUMENTS_BUCKET = "documents";

export type ArchiveEntityType = "quote" | "invoice";

/**
 * Storage object path. The contractor id is the first segment so the storage
 * RLS policy (`(storage.foldername(name))[1] = auth_contractor_id()`) matches.
 */
export function buildArchivePath(input: {
  contractorId: string;
  entityType: ArchiveEntityType;
  entityId: string;
  now?: Date;
}): string {
  const stamp = (input.now ?? new Date()).toISOString().replace(/[:.]/g, "-");
  return `${input.contractorId}/${input.entityType}/${input.entityId}/${stamp}.pdf`;
}

export type DocumentRow = {
  contractor_id: string;
  entity_type: ArchiveEntityType;
  entity_id: string;
  storage_path: string;
  file_name: string;
  byte_size: number;
  renderer_version: string | null;
};

export function buildDocumentRow(input: {
  contractorId: string;
  entityType: ArchiveEntityType;
  entityId: string;
  storagePath: string;
  fileName: string;
  byteSize: number;
  rendererVersion?: string | null;
}): DocumentRow {
  return {
    contractor_id: input.contractorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    storage_path: input.storagePath,
    file_name: input.fileName,
    byte_size: input.byteSize,
    renderer_version: input.rendererVersion ?? null,
  };
}

export async function archiveDocumentPdf(input: {
  supabase: SupabaseClient;
  contractorId: string;
  entityType: ArchiveEntityType;
  entityId: string;
  pdf: Buffer;
  fileName: string;
  rendererVersion?: string | null;
  now?: Date;
}): Promise<{ error: string | null; storagePath: string | null }> {
  const storagePath = buildArchivePath({
    contractorId: input.contractorId,
    entityType: input.entityType,
    entityId: input.entityId,
    now: input.now,
  });

  const { error: uploadError } = await input.supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.pdf, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return { error: `upload: ${uploadError.message}`, storagePath: null };
  }

  const row = buildDocumentRow({
    contractorId: input.contractorId,
    entityType: input.entityType,
    entityId: input.entityId,
    storagePath,
    fileName: input.fileName,
    byteSize: input.pdf.byteLength,
    rendererVersion: input.rendererVersion,
  });

  const { error: insertError } = await input.supabase.from("documents").insert(row);
  if (insertError) {
    return { error: `record: ${insertError.message}`, storagePath };
  }

  return { error: null, storagePath };
}
