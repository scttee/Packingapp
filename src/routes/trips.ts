import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { shapeTrip, shapeTripSummary } from "../serializers";

const router = Router();

const tripInclude = {
  segments: true,
  accommodations: true,
  waypoints: true,
  cafes: true,
  meals: true,
  participants: true,
  gearList: { include: { gearItem: true } },
  emergencyContacts: true,
} as const;

router.get("/", async (req, res) => {
  const userId = requireUser(req);
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
    include: { participants: true, segments: true },
  });
  res.json(trips.map(shapeTripSummary));
});

const createTripSchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  type: z.enum(["bike", "hike", "mixed"]).default("bike"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "upcoming", "active", "completed"]).optional(),
  summary: z.string().optional(),
  participants: z.array(z.object({
    name: z.string(),
    email: z.string().optional(),
    initials: z.string().optional(),
  })).optional(),
  templateId: z.string().optional(),
});

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

router.post("/", async (req, res) => {
  const userId = requireUser(req);
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const startDate = data.startDate ? new Date(data.startDate) : null;
  const endDate = data.endDate ? new Date(data.endDate) : null;
  const status = data.status ?? (startDate && startDate.getTime() > Date.now() ? "upcoming" : "draft");

  const trip = await prisma.trip.create({
    data: {
      userId,
      name: data.name,
      country: data.country,
      type: data.type,
      status,
      startDate,
      endDate,
      summary: data.summary,
      participants: {
        create: [
          { name: "Alex Hartley", initials: "AH", confirmed: true },
          ...(data.participants ?? []).map((p) => ({
            name: p.name,
            email: p.email,
            initials: p.initials || initialsOf(p.name),
            confirmed: false,
          })),
        ],
      },
    },
    include: tripInclude,
  });

  // Apply gear template if provided
  if (data.templateId && data.templateId !== "blank") {
    const tpl = await prisma.gearTemplate.findFirst({
      where: { OR: [{ userId }, { userId: null }], name: data.templateId },
    });
    if (tpl) {
      const ids: string[] = JSON.parse(tpl.itemIds);
      const items = await prisma.gearItem.findMany({ where: { id: { in: ids }, userId } });
      await prisma.tripGear.createMany({
        data: items.map((g) => ({ tripId: trip.id, gearItemId: g.id, packed: false })),
      });
    }
  }

  const fresh = await prisma.trip.findUnique({ where: { id: trip.id }, include: tripInclude });
  res.status(201).json(shapeTrip(fresh!));
});

router.get("/:id", async (req, res) => {
  const userId = requireUser(req);
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId },
    include: tripInclude,
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  res.json(shapeTrip(trip));
});

const patchSchema = createTripSchema.partial();
router.patch("/:id", async (req, res) => {
  const userId = requireUser(req);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const data = parsed.data;
  await prisma.trip.update({
    where: { id: owned.id },
    data: {
      name: data.name,
      country: data.country,
      type: data.type,
      status: data.status,
      summary: data.summary,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  const fresh = await prisma.trip.findUnique({ where: { id: owned.id }, include: tripInclude });
  res.json(shapeTrip(fresh!));
});

router.delete("/:id", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  await prisma.trip.delete({ where: { id: owned.id } });
  res.status(204).end();
});

// ── Trip gear: toggle packed ─────────────────────────────────────────
router.patch("/:id/gear/:gearId", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const tg = await prisma.tripGear.findFirst({ where: { id: req.params.gearId, tripId: owned.id } });
  if (!tg) return res.status(404).json({ error: "gear not in trip" });
  const packed = typeof req.body?.packed === "boolean" ? req.body.packed : !tg.packed;
  const updated = await prisma.tripGear.update({ where: { id: tg.id }, data: { packed } });
  res.json({ id: updated.id, packed: updated.packed });
});

router.post("/:id/gear", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const gearItemId = String(req.body?.gearItemId || "");
  const item = await prisma.gearItem.findFirst({ where: { id: gearItemId, userId } });
  if (!item) return res.status(400).json({ error: "gear not in your library" });
  const created = await prisma.tripGear.upsert({
    where: { tripId_gearItemId: { tripId: owned.id, gearItemId } },
    update: {},
    create: { tripId: owned.id, gearItemId, packed: false },
  });
  res.status(201).json({ id: created.id });
});

router.delete("/:id/gear/:gearId", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  await prisma.tripGear.deleteMany({ where: { id: req.params.gearId, tripId: owned.id } });
  res.status(204).end();
});

// ── Segments ─────────────────────────────────────────────────────────
router.patch("/:id/segments/:segId", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const data: any = {};
  if ("name" in req.body) data.name = String(req.body.name);
  if ("distance" in req.body) data.distanceKm = Number(req.body.distance);
  if ("elevation" in req.body) data.elevationM = Number(req.body.elevation);
  if ("surface" in req.body) data.surface = String(req.body.surface);
  if ("notes" in req.body) data.notes = String(req.body.notes);
  if ("actualKm" in req.body) data.actualKm = req.body.actualKm == null ? null : Number(req.body.actualKm);
  await prisma.tripSegment.update({ where: { id: req.params.segId }, data });
  res.status(204).end();
});

// ── Tracking ─────────────────────────────────────────────────────────
router.post("/:id/tracking/enable", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true, trackingToken: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  const token = owned.trackingToken || crypto.randomBytes(8).toString("hex");
  const updated = await prisma.trip.update({
    where: { id: owned.id },
    data: { trackingEnabled: true, trackingToken: token },
  });
  res.json({ token: updated.trackingToken, link: `/share/${updated.trackingToken}` });
});

router.post("/:id/tracking/disable", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!owned) return res.status(404).json({ error: "not found" });
  await prisma.trip.update({ where: { id: owned.id }, data: { trackingEnabled: false } });
  res.json({ ok: true });
});

router.post("/:id/location", async (req, res) => {
  const userId = requireUser(req);
  const owned = await prisma.trip.findFirst({ where: { id: req.params.id, userId, trackingEnabled: true }, select: { id: true, trackingToken: true } });
  if (!owned) return res.status(404).json({ error: "tracking not enabled" });
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: "lat/lng required" });
  const accuracy = req.body?.accuracy != null ? Number(req.body.accuracy) : null;
  const loc = await prisma.liveLocation.create({
    data: { tripId: owned.id, userId, lat, lng, accuracy },
  });
  // Notify SSE subscribers
  if (owned.trackingToken) {
    const { broadcastLocation } = await import("./share");
    broadcastLocation(owned.trackingToken, { lat, lng, accuracy, recordedAt: loc.recordedAt.toISOString() });
  }
  res.status(201).json({ ok: true });
});

export default router;
