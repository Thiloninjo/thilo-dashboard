import { describe, it, expect } from "vitest";
import { parseTasks, toggleTask } from "../src/services/vault-tasks.js";

const SAMPLE = `#claude-generated

# Aufgaben

---

- [ ] Hetzner Server ueberpruefen 📅 2026-03-01
- [x] Best Practices Filmdokument lesen 📅 2026-03-03 ✅ 2026-03-19
- [ ] Note-based Image Generator testen
- [ ] OKRs in Asana eintragen 📅 2026-02-28
`;

describe("parseTasks", () => {
  it("parses open tasks with due date", () => {
    const tasks = parseTasks(SAMPLE);
    const hetzner = tasks.find((t) => t.description.includes("Hetzner"));
    expect(hetzner).toBeDefined();
    expect(hetzner!.completed).toBe(false);
    expect(hetzner!.dueDate).toBe("2026-03-01");
    expect(hetzner!.source).toBe("vault");
  });

  it("parses completed tasks with completion date", () => {
    const tasks = parseTasks(SAMPLE);
    const bp = tasks.find((t) => t.description.includes("Best Practices"));
    expect(bp).toBeDefined();
    expect(bp!.completed).toBe(true);
    expect(bp!.completedDate).toBe("2026-03-19");
  });

  it("parses tasks without due date", () => {
    const tasks = parseTasks(SAMPLE);
    const note = tasks.find((t) => t.description.includes("Note-based"));
    expect(note).toBeDefined();
    expect(note!.dueDate).toBeUndefined();
  });

  it("assigns line number as id", () => {
    const tasks = parseTasks(SAMPLE);
    tasks.forEach((t) => expect(t.id).toBeGreaterThan(0));
  });

  it("returns all 4 tasks", () => {
    const tasks = parseTasks(SAMPLE);
    expect(tasks).toHaveLength(4);
  });
});

describe("toggleTask", () => {
  it("checks an open task", () => {
    const lines = SAMPLE.split("\n");
    // Find the line number (1-indexed) of "Hetzner" task
    const hetznerIdx = lines.findIndex(l => l.includes("Hetzner")) + 1;
    const result = toggleTask(SAMPLE, hetznerIdx);
    expect(result).toContain("- [x] Hetzner Server ueberpruefen");
    expect(result).toContain("✅ ");
  });

  it("unchecks a completed task", () => {
    const lines = SAMPLE.split("\n");
    const bpIdx = lines.findIndex(l => l.includes("Best Practices")) + 1;
    const result = toggleTask(SAMPLE, bpIdx);
    expect(result).toContain("- [ ] Best Practices Filmdokument lesen");
    expect(result).not.toContain("✅ 2026-03-19");
  });
});
