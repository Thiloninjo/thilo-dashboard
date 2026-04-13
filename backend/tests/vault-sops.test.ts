import { describe, it, expect } from "vitest";
import { parseSOPDetail } from "../src/services/vault-sops.js";

const SAMPLE_SOP = `# Tennis Filming SOP

## Quick-Check: Tennis Filming
- [ ] Blende vor erstem Clip checken
- [ ] Zweite Speicherkarte einlegen
- [x] Weissabgleich pruefen

## Vollstaendige SOP
Detaillierter Ablauf fuer Tennis-Drehs...

## Lessons Learned
- (12.04.26) Blende immer vor dem ersten Clip checken
- (10.04.26) Backup-Karte spart Zeit bei langen Sessions

## Ausarbeitungs-Queue
- [ ] Zwei Kameras gleichzeitig testen
- [x] Aufschlag-Anweisungen ausarbeiten
`;

describe("parseSOPDetail", () => {
  it("parses quick-check items", () => {
    const result = parseSOPDetail(SAMPLE_SOP);
    expect(result.quickCheck).toHaveLength(3);
    expect(result.quickCheck[0]).toEqual({ text: "Blende vor erstem Clip checken", checked: false });
    expect(result.quickCheck[2].checked).toBe(true);
  });

  it("parses lessons learned with dates", () => {
    const result = parseSOPDetail(SAMPLE_SOP);
    expect(result.lessonsLearned).toHaveLength(2);
    expect(result.lessonsLearned[0]).toEqual({
      date: "12.04.26",
      text: "Blende immer vor dem ersten Clip checken",
    });
  });

  it("parses queue items", () => {
    const result = parseSOPDetail(SAMPLE_SOP);
    expect(result.queue).toHaveLength(2);
    expect(result.queue[1].checked).toBe(true);
  });

  it("extracts SOP name", () => {
    const result = parseSOPDetail(SAMPLE_SOP);
    expect(result.name).toBe("Tennis Filming SOP");
  });
});
