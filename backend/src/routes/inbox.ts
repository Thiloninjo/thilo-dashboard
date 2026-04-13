import { Router } from "express";
import { processInboxMessage } from "../services/inbox-processor.js";

export const inboxRouter = Router();

// POST /api/inbox — receives voice text, routes to task/calendar/complete
inboxRouter.post("/", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' field" });
  }

  try {
    const result = await processInboxMessage(text.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Processing failed" });
  }
});
