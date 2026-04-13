import { Router } from "express";
import { getWorkspaces, getSOPsForWorkspace, getSOPDetail } from "../services/vault-sops.js";

export const sopsRouter = Router();

sopsRouter.get("/", async (_req, res) => {
  try {
    const workspaces = await getWorkspaces();
    res.json({ data: workspaces, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read workspaces" });
  }
});

sopsRouter.get("/:workspace", async (req, res) => {
  try {
    const sops = await getSOPsForWorkspace(req.params.workspace);
    res.json({ data: sops, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read SOPs" });
  }
});

sopsRouter.get("/:workspace/:sop", async (req, res) => {
  try {
    const detail = await getSOPDetail(req.params.workspace, req.params.sop);
    res.json({ data: detail, lastUpdated: new Date().toISOString(), isStale: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to read SOP detail" });
  }
});
