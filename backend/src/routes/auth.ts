import { Router } from "express";
import { getAuthUrl, handleAuthCallback } from "../services/google-calendar.js";

export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  res.redirect(getAuthUrl());
});

authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");

  try {
    await handleAuthCallback(code);
    res.send("<h1>Google Calendar connected!</h1><p>Du kannst dieses Fenster schliessen.</p>");
  } catch (err) {
    res.status(500).send("Auth failed");
  }
});
