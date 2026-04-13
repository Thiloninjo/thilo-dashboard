import { describe, it, expect } from "vitest";
import { parseCommitLine } from "../src/services/vault-changelog.js";

describe("parseCommitLine", () => {
  it("parses standard SOP commit", () => {
    const result = parseCommitLine(
      "abc123|SOP Tennis Filming: Blende-Check ergaenzt (Quelle: Handy-Notiz 12.04.26)|2026-04-12 14:30:00 +0200"
    );
    expect(result).toEqual({
      hash: "abc123",
      sopName: "Tennis Filming",
      description: "Blende-Check ergaenzt",
      source: "Handy-Notiz 12.04.26",
      date: "2026-04-12",
    });
  });

  it("parses multi-SOP commit", () => {
    const result = parseCommitLine(
      "def456|SOP Vlog Filming + Tennis Filming: Zweite Speicherkarte als Backup (Quelle: Handy-Notiz 12.04.26)|2026-04-12 15:00:00 +0200"
    );
    expect(result).toBeDefined();
    expect(result!.sopName).toBe("Vlog Filming + Tennis Filming");
  });

  it("returns null for non-SOP commit", () => {
    const result = parseCommitLine(
      "ghi789|CLAUDE.md: Git-Workflow dokumentiert|2026-04-12 16:00:00 +0200"
    );
    expect(result).toBeNull();
  });
});
