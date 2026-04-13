import { describe, it, expect } from "vitest";
import { parseWeeklyGoals } from "../src/services/vault-weekly-goals.js";

const SAMPLE = `# Weekly Goals — KW 15 (07.04. - 13.04.2026)

## Team Weekly Goals
- [ ] 3 Tennis-Videos geschnitten
- [x] DaVinci Resolve Tutorial

## Personal Weekly Goals
- [ ] Eigenen Dreh initiieren
- [ ] AI-Edge Report lesen
- [x] Portfolio-Ideen sammeln
`;

describe("parseWeeklyGoals", () => {
  it("parses team goals", () => {
    const result = parseWeeklyGoals(SAMPLE, 15, 2026);
    expect(result.team).toHaveLength(2);
    expect(result.team[0]).toEqual({ text: "3 Tennis-Videos geschnitten", completed: false });
    expect(result.team[1]).toEqual({ text: "DaVinci Resolve Tutorial", completed: true });
  });

  it("parses personal goals", () => {
    const result = parseWeeklyGoals(SAMPLE, 15, 2026);
    expect(result.personal).toHaveLength(3);
    expect(result.personal[2].completed).toBe(true);
  });

  it("extracts week metadata", () => {
    const result = parseWeeklyGoals(SAMPLE, 15, 2026);
    expect(result.weekNumber).toBe(15);
    expect(result.year).toBe(2026);
    expect(result.dateRange).toBe("07.04. - 13.04.2026");
  });
});
