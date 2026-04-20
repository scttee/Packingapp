import { Router } from "express";
import multer from "multer";
import { parseStringPromise } from "xml2js";
import { prisma } from "../db";
import { requireUser } from "../auth";

const router = Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Downsample a dense track to ~N points to keep payloads small.
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

router.post("/", upload.single("file"), async (req, res) => {
  const userId = requireUser(req);
  if (!req.file) return res.status(400).json({ error: "file required" });
  const tripId = String(req.body?.tripId || "");
  const segmentId = String(req.body?.segmentId || "");
  const owned = tripId
    ? await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } })
    : null;

  let parsed: any;
  try {
    parsed = await parseStringPromise(req.file.buffer.toString("utf8"), { explicitArray: false });
  } catch {
    return res.status(400).json({ error: "invalid GPX" });
  }
  const trk = parsed?.gpx?.trk;
  const segs: any[] = Array.isArray(trk?.trkseg) ? trk.trkseg : trk?.trkseg ? [trk.trkseg] : [];
  const pts: { lat: number; lng: number; ele?: number }[] = [];
  for (const seg of segs) {
    const list = Array.isArray(seg?.trkpt) ? seg.trkpt : seg?.trkpt ? [seg.trkpt] : [];
    for (const p of list) {
      pts.push({
        lat: Number(p?.$?.lat),
        lng: Number(p?.$?.lon),
        ele: p?.ele != null ? Number(p.ele) : undefined,
      });
    }
  }
  if (!pts.length) return res.status(400).json({ error: "no track points found" });

  let distanceKm = 0;
  let elevationGainM = 0;
  for (let i = 1; i < pts.length; i++) {
    distanceKm += haversine(pts[i - 1], pts[i]);
    if (pts[i].ele != null && pts[i - 1].ele != null) {
      const d = (pts[i].ele as number) - (pts[i - 1].ele as number);
      if (d > 0) elevationGainM += d;
    }
  }

  const thinned = downsample(pts, 600);
  const coordinates = thinned.map((p) => [p.lng, p.lat]);
  const geoJson = JSON.stringify({ type: "LineString", coordinates });

  const summary = {
    name: trk?.name || req.file.originalname?.replace(/\.gpx$/i, ""),
    pointCount: pts.length,
    distanceKm: Math.round(distanceKm * 10) / 10,
    elevationGainM: Math.round(elevationGainM),
    bounds: {
      north: Math.max(...pts.map((p) => p.lat)),
      south: Math.min(...pts.map((p) => p.lat)),
      east: Math.max(...pts.map((p) => p.lng)),
      west: Math.min(...pts.map((p) => p.lng)),
    },
    start: pts[0],
    end: pts[pts.length - 1],
    segmentId: null as string | null,
  };

  if (owned && segmentId) {
    const seg = await prisma.tripSegment.findFirst({ where: { id: segmentId, tripId: owned.id } });
    if (!seg) return res.status(404).json({ error: "segment not found" });
    await prisma.tripSegment.update({
      where: { id: seg.id },
      data: {
        distanceKm: summary.distanceKm,
        elevationM: summary.elevationGainM,
        trackGeoJson: geoJson,
      },
    });
    summary.segmentId = seg.id;
  } else if (owned) {
    await prisma.trip.update({
      where: { id: owned.id },
      data: {
        distanceKm: summary.distanceKm,
        elevationM: summary.elevationGainM,
        gpxFileUrl: `gpx:${req.file.originalname}`,
        trackGeoJson: geoJson,
      },
    });
  }

  res.json(summary);
});

export default router;
