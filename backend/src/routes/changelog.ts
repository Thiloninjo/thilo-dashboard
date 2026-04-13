import { Router } from "express";
import { getChangeLog } from "../services/vault-changelog.js";

export const changelogRouter = Router();

changelogRouter.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const entries = await getChangeLog(limit);
    res.json({ data: entries, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read changelog" });
  }
});
