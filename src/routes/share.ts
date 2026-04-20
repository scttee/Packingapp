import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../db";
import { shapeTrip } from "../serializers";

const router = Router();

const subscribers = new Map<string, Set<Response>>();

export function broadcastLocation(token: string, payload: any) {
  const set = subscribers.get(token);
  if (!set) return;
  const data = `event: location\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(data); } catch {}
  }
}

router.get("/:token", async (req, res) => {
  const trip = await prisma.trip.findFirst({
    where: { trackingToken: req.params.token, trackingEnabled: true },
    include: {
      segments: true,
      accommodations: true,
      waypoints: true,
      cafes: true,
      meals: true,
      participants: true,
      gearList: { include: { gearItem: true } },
      emergencyContacts: true,
    },
  });
  if (!trip) return res.status(404).json({ error: "share link not active" });
  const latest = await prisma.liveLocation.findMany({
    where: { tripId: trip.id },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });
  const shaped = shapeTrip(trip);
  res.json({
    trip: {
      id: shaped.id,
      name: shaped.name,
      country: shaped.country,
      dates: shaped.dates,
      participants: shaped.participants,
      emergencyContacts: shaped.emergencyContacts,
      waypoints: shaped.waypoints,
    },
    locations: latest.map((l) => ({
      lat: l.lat,
      lng: l.lng,
      accuracy: l.accuracy,
      recordedAt: l.recordedAt.toISOString(),
    })),
  });
});

router.get("/:token/stream", async (req, res) => {
  const trip = await prisma.trip.findFirst({
    where: { trackingToken: req.params.token, trackingEnabled: true },
    select: { id: true },
  });
  if (!trip) return res.status(404).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: ready\ndata: {}\n\n`);

  const token = req.params.token;
  let set = subscribers.get(token);
  if (!set) { set = new Set(); subscribers.set(token, set); }
  set.add(res);

  const ping = setInterval(() => {
    try { res.write(`event: ping\ndata: {}\n\n`); } catch {}
  }, 30000);

  req.on("close", () => {
    clearInterval(ping);
    set?.delete(res);
    if (set && set.size === 0) subscribers.delete(token);
  });
});

export default router;
