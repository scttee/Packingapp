import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../auth";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireUser(req);
  const items = await prisma.gearItem.findMany({
    where: { userId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  res.json(
    items.map((g) => ({
      id: g.id,
      name: g.name,
      brand: g.brand,
      category: g.category,
      weight: g.weightG,
      description: g.description,
      lastUsed: g.lastUsedDate?.toISOString().slice(0, 10) ?? null,
      sourceUrl: g.sourceUrl,
    }))
  );
});

const gearSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  category: z.enum(["Sleep", "Cook", "Wear", "Ride", "Safety", "Documents"]),
  weight: z.number().int().min(0),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
});

router.post("/", async (req, res) => {
  const userId = requireUser(req);
  const parsed = gearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const g = await prisma.gearItem.create({
    data: {
      userId,
      name: parsed.data.name,
      brand: parsed.data.brand,
      category: parsed.data.category,
      weightG: parsed.data.weight,
      description: parsed.data.description,
      sourceUrl: parsed.data.sourceUrl,
    },
  });
  res.status(201).json({ id: g.id });
});

router.patch("/:id", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.gearItem.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const data: any = {};
  if ("name" in req.body) data.name = String(req.body.name);
  if ("brand" in req.body) data.brand = String(req.body.brand);
  if ("category" in req.body) data.category = String(req.body.category);
  if ("weight" in req.body) data.weightG = Number(req.body.weight);
  if ("description" in req.body) data.description = String(req.body.description);
  if ("sourceUrl" in req.body) data.sourceUrl = String(req.body.sourceUrl);
  await prisma.gearItem.update({ where: { id: owned.id }, data });
  res.status(204).end();
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.gearItem.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  await prisma.gearItem.delete({ where: { id: owned.id } });
  res.status(204).end();
});

// ── Claude AI gear lookup ────────────────────────────────────────────
router.post("/lookup", async (req, res) => {
  const text = String(req.body?.input || "").trim();
  if (!text) return res.status(400).json({ error: "input required" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI lookup not configured. Set ANTHROPIC_API_KEY on Railway to enable.",
    });
  }

  const prompt = `You are a gear database for bikepacking and hiking equipment. Given this product URL or product name/description, return ONLY valid JSON — no markdown, no commentary — with these exact fields:
{"name":"full product name","brand":"brand name","weight_g":integer,"category":"Sleep|Cook|Wear|Ride|Safety|Documents","description":"one sentence, max 12 words"}
If weight is unknown, estimate based on product type and typical market offerings. Be specific and accurate.
Product: ${text}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({ error: `Anthropic API error ${r.status}`, detail: body.slice(0, 500) });
    }
    const data: any = await r.json();
    const raw: string = data?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: "lookup failed", detail: e?.message });
  }
});

// ── Templates ────────────────────────────────────────────────────────
router.get("/templates", async (req, res) => {
  const userId = requireUser(req);
  const templates = await prisma.gearTemplate.findMany({
    where: { OR: [{ userId }, { userId: null }] },
  });
  res.json(templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    itemIds: JSON.parse(t.itemIds) as string[],
  })));
});

export default router;
