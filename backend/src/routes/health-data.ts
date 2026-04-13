import { Router } from "express";

export const healthDataRouter = Router();

// In-memory store for today's health data
let healthData: {
  steps: number;
  lastUpdated: string;
  date: string;
} = {
  steps: 0,
  lastUpdated: new Date().toISOString(),
  date: new Date().toISOString().slice(0, 10),
};

// Reset at midnight
function checkDateReset() {
  const today = new Date().toISOString().slice(0, 10);
  if (healthData.date !== today) {
    healthData = { steps: 0, lastUpdated: new Date().toISOString(), date: today };
  }
}

// GET — dashboard reads current steps
healthDataRouter.get("/", (_req, res) => {
  checkDateReset();
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
      const today = new Date().toISOString().slice(0, 10);
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
    console.log(`[Health] Steps updated: ${steps}`);
  }

  res.json({ success: true, steps: healthData.steps });
});
