import { readFile } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { CONFIG } from "../config.js";

const exec = promisify(execFile);

const AUDIO_DIR = join(CONFIG.vaultPath, "4 - Projekte", "Dashboard", "dreh-briefings"); // Dashboard stays in old path (own git repo)

// ── TTS Provider Interface ──

interface TTSProvider {
  generate(text: string, outputPath: string): Promise<void>;
}

// ── Edge TTS (free, unlimited) ──

const edgeTTS: TTSProvider = {
  async generate(text: string, outputPath: string) {
    await exec("edge-tts", [
      "--voice", "de-DE-SeraphinaMultilingualNeural",
      "--rate", "+5%",
      "--text", text,
      "--write-media", outputPath,
    ], { timeout: 30_000 });
  },
};

// ── ElevenLabs (swap in later) ──
// const elevenLabsTTS: TTSProvider = { ... };

// ── Active provider ──
const ttsProvider: TTSProvider = edgeTTS;

// ── Briefing Text Generator ──

export async function generateBriefingText(): Promise<string> {
  // Read the Filming SOP
  const sopPath = join(CONFIG.vaultPath, "1 - Workspaces", "Tennis-Ring-Lual", "01_SOPs", "Tennis Filming SOP.md");
  const sopContent = await readFile(sopPath, "utf-8");

  // Extract Quick-Check: Morgens items
  const morgenMatch = sopContent.match(/## Quick-Check: Morgens \(Drehtag\)([\s\S]*?)(?=\n##|$)/);
  const morgenItems = morgenMatch
    ? morgenMatch[1].match(/- \[ \] .+/g)?.map(l => l.replace("- [ ] ", "")) || []
    : [];

  // Extract Quick-Check: Vorabend items
  const vorabendMatch = sopContent.match(/## Quick-Check: Vorabend([\s\S]*?)(?=\n##|$)/);
  const vorabendItems = vorabendMatch
    ? vorabendMatch[1].match(/- \[ \] .+/g)?.map(l => l.replace("- [ ] ", "")) || []
    : [];

  // Extract Lessons Learned (most recent first)
  const lessonsMatch = sopContent.match(/## Lessons Learned([\s\S]*?)(?=\n##|$)/);
  const lessons: { date: string; text: string }[] = [];
  if (lessonsMatch) {
    const lines = lessonsMatch[1].split("\n");
    for (const line of lines) {
      const m = line.match(/^- \((.+?)\) (.+)/);
      if (m) lessons.push({ date: m[1], text: m[2] });
    }
  }
  // Take the 5 most recent
  const recentLessons = lessons.slice(-5);

  // Build the briefing text
  const today = new Date();
  const dateStr = today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const parts: string[] = [];

  // Intro
  parts.push(`Drehtag-Briefing für ${dateStr}.`);
  parts.push("");

  // Lessons Learned — the core of the briefing
  if (recentLessons.length > 0) {
    parts.push("Achte vor allem auf folgendes. Das hast du bei den letzten Drehs gelernt:");
    parts.push("");
    recentLessons.forEach(l => parts.push(`${l.text}.`));
    parts.push("");
  }

  // Outro
  parts.push("Das wars. Fokus rein, Dreh rocken.");

  return parts.join("\n");
}

// ── Generate Audio File ──

export async function generateBriefingAudio(): Promise<string> {
  const { mkdir } = await import("fs/promises");
  await mkdir(AUDIO_DIR, { recursive: true });

  const text = await generateBriefingText();
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const outputPath = join(AUDIO_DIR, `briefing-${dateStr}.mp3`);

  // Check if already generated today
  try {
    await readFile(outputPath);
    return outputPath; // Already exists
  } catch {
    // Generate new
  }

  await ttsProvider.generate(text, outputPath);

  // Upload to Hetzner server for mobile access
  try {
    const fileName = `briefing-${dateStr}.mp3`;
    await exec("scp", [outputPath, `root@46.225.160.248:/opt/dashboard/backend/public/briefings/${fileName}`], { timeout: 15_000 });
    console.log(`[Briefing] Uploaded ${fileName} to server`);
  } catch (err) {
    console.error("[Briefing] Upload failed:", err);
  }

  return outputPath;
}
