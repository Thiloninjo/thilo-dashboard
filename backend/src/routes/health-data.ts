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
  console.log("[Health] Received:", JSON.stringify(body).slice(0, 500));

  // Auto Export sends data in various formats — handle flexibly
  let steps = 0;

  if (typeof body.steps === "number") {
    steps = body.steps;
  } else if (body.data?.qty !== undefined) {
    // Auto Export REST API format: { data: { qty: 1234 } }
    steps = Math.round(Number(body.data.qty));
  } else if (body.metrics?.steps !== undefined) {
    steps = Math.round(Number(body.metrics.steps));
  } else if (Array.isArray(body)) {
    // Auto Export can send array of metrics
    const stepMetric = body.find((m: any) =>
      m.name?.toLowerCase().includes("step") || m.type?.toLowerCase().includes("step")
    );
    if (stepMetric) {
      steps = Math.round(Number(stepMetric.qty || stepMetric.value || stepMetric.data?.qty || 0));
    }
  }

  if (steps > 0) {
    healthData.steps = steps;
    healthData.lastUpdated = new Date().toISOString();
    console.log(`[Health] Steps updated: ${steps}`);
  }

  res.json({ success: true, steps: healthData.steps });
});
