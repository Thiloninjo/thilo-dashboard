import { Router } from "express";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const healthDataRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PERSIST_PATH = join(__dirname, "../../data/health-data.json");

function localToday(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local timezone
}

// In-memory store for today's health data
let healthData: {
  steps: number;
  lastUpdated: string;
  date: string;
} = loadPersistedData();

function loadPersistedData() {
  try {
    const raw = readFileSync(PERSIST_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data.date === localToday() && data.steps > 0) {
      console.log(`[Health] Restored ${data.steps} steps from disk`);
      return data;
    }
  } catch {}
  return { steps: 0, lastUpdated: new Date().toISOString(), date: localToday() };
}

function persistData() {
  try {
    writeFileSync(PERSIST_PATH, JSON.stringify(healthData, null, 2));
  } catch {}
}

// Reset at midnight
function checkDateReset() {
  const today = localToday();
  if (healthData.date !== today) {
    healthData = { steps: 0, lastUpdated: new Date().toISOString(), date: today };
    persistData();
  }
}

// GET — dashboard reads current steps (try server first if local has no data)
healthDataRouter.get("/", async (_req, res) => {
  checkDateReset();

  // If local has no steps, try fetching from server (only use if data is from today)
  if (healthData.steps === 0) {
    try {
      const serverRes = await fetch("https://46-225-160-248.nip.io/api/health-data", {
        headers: { Authorization: "Bearer thilo-dashboard-2026-secret" },
      });
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        const today = localToday();
        if (serverData.data?.steps > 0 && serverData.data?.date === today) {
          healthData.steps = serverData.data.steps;
          healthData.lastUpdated = serverData.data.lastUpdated;
          persistData();
        }
      }
    } catch {}
  }

  res.json({ data: healthData, lastUpdated: healthData.lastUpdated, isStale: false });
});

// POST — Auto Export app sends step data here
healthDataRouter.post("/", (req, res) => {
  checkDateReset();

  const body = req.body;
  if (body.data?.metrics) {
    console.log("[Health] Metrics:", body.data.metrics.map((m: any) => `${m.name} (${m.units}, ${m.data?.length} entries)`).join(", "));
  } else {
    console.log("[Health] Received:", JSON.stringify(body).slice(0, 300));
  }

  // Auto Export sends: { data: { metrics: [{ name: "step_count", data: [{ qty: 123 }, ...] }] } }
  let steps = 0;

  if (typeof body.steps === "number") {
    steps = body.steps;
  } else if (body.data?.metrics && Array.isArray(body.data.metrics)) {
    // Auto Export Health Data app format
    const stepMetric = body.data.metrics.find((m: any) =>
      m.name?.toLowerCase().includes("step")
    );
    if (stepMetric && Array.isArray(stepMetric.data)) {
      // Sum all step entries for today
      const today = localToday();
      steps = Math.round(
        stepMetric.data
          .filter((d: any) => d.date?.startsWith(today) || d.start?.startsWith(today))
          .reduce((sum: number, d: any) => sum + (Number(d.qty) || 0), 0)
      );
      // If no today entries, sum all
      if (steps === 0) {
        steps = Math.round(stepMetric.data.reduce((sum: number, d: any) => sum + (Number(d.qty) || 0), 0));
      }
    }
  } else if (body.data?.qty !== undefined) {
    steps = Math.round(Number(body.data.qty));
  } else if (Array.isArray(body)) {
    const stepMetric = body.find((m: any) =>
      m.name?.toLowerCase().includes("step")
    );
    if (stepMetric) {
      steps = Math.round(Number(stepMetric.qty || stepMetric.value || 0));
    }
  }

  if (steps > 0) {
    healthData.steps = steps;
    healthData.lastUpdated = new Date().toISOString();
    persistData();
    console.log(`[Health] Steps updated: ${steps}`);
  }

  res.json({ success: true, steps: healthData.steps });
});
