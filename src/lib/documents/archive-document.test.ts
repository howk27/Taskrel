import { describe, expect, it } from "vitest";
import { buildArchivePath, buildDocumentRow } from "./archive-document";

const contractorId = "11111111-1111-1111-1111-111111111111";
const entityId = "22222222-2222-2222-2222-222222222222";
const at = new Date("2026-06-28T15:30:45.123Z");

describe("buildArchivePath", () => {
  it("puts the contractor id first so storage RLS (foldername[1]) matches", () => {
    const path = buildArchivePath({ contractorId, entityType: "invoice", entityId, now: at });
    expect(path.split("/")[0]).toBe(contractorId);
  });

  it("namespaces by entity type and id and ends in .pdf", () => {
    const path = buildArchivePath({ contractorId, entityType: "quote", entityId, now: at });
    expect(path).toContain("/quote/");
    expect(path).toContain(`/${entityId}/`);
    expect(path.endsWith(".pdf")).toBe(true);
  });

  it("produces a filesystem-safe timestamp segment (no colons or dots)", () => {
    const path = buildArchivePath({ contractorId, entityType: "invoice", entityId, now: at });
    const stamp = path.split("/").pop()!.replace(/\.pdf$/, "");
    expect(stamp).not.toMatch(/[:.]/);
  });
});

describe("buildDocumentRow", () => {
  it("maps fields to the documents table shape", () => {
    const row = buildDocumentRow({
      contractorId,
      entityType: "invoice",
      entityId,
      storagePath: `${contractorId}/invoice/${entityId}/x.pdf`,
      fileName: "invoice-INV-1042.pdf",
      byteSize: 2048,
      rendererVersion: "v1",
    });
    expect(row).toEqual({
      contractor_id: contractorId,
      entity_type: "invoice",
      entity_id: entityId,
      storage_path: `${contractorId}/invoice/${entityId}/x.pdf`,
      file_name: "invoice-INV-1042.pdf",
      byte_size: 2048,
      renderer_version: "v1",
    });
  });

  it("defaults renderer_version to null when absent (invoices have none)", () => {
    const row = buildDocumentRow({
      contractorId,
      entityType: "invoice",
      entityId,
      storagePath: "p",
      fileName: "f.pdf",
      byteSize: 10,
    });
    expect(row.renderer_version).toBeNull();
  });
});
