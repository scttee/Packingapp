import type { Prisma } from "@prisma/client";

type FullTrip = Prisma.TripGetPayload<{
  include: {
    segments: true;
    accommodations: true;
    waypoints: true;
    cafes: true;
    meals: true;
    participants: true;
    gearList: { include: { gearItem: true } };
    emergencyContacts: true;
  };
}>;

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / 86400000));
}

export function shapeTrip(trip: FullTrip) {
  const today = new Date();
  const daysUntil = trip.startDate ? daysBetween(trip.startDate, today) : null;

  return {
    id: trip.id,
    name: trip.name,
    country: trip.country,
    status: trip.status,
    type: trip.type,
    dates: {
      start: trip.startDate?.toISOString().slice(0, 10) ?? null,
      end: trip.endDate?.toISOString().slice(0, 10) ?? null,
    },
    daysUntil,
    distance: trip.distanceKm ?? 0,
    elevation: trip.elevationM ?? 0,
    summary: trip.summary,
    komootUrl: trip.komootUrl,
    stravaUrl: trip.stravaUrl,
    gpxFileUrl: trip.gpxFileUrl,
    trackingEnabled: trip.trackingEnabled,
    trackingToken: trip.trackingToken,
    trackingLink: trip.trackingToken ? `/share/${trip.trackingToken}` : null,
    participants: trip.participants
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, name: p.name, initials: p.initials, confirmed: p.confirmed })),
    segments: trip.segments
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((s) => ({
        id: s.id,
        day: s.dayNumber,
        name: s.name,
        distance: s.distanceKm,
        elevation: s.elevationM,
        surface: s.surface,
        notes: s.notes,
        actualKm: s.actualKm,
      })),
    accommodation: trip.accommodations
      .sort((a, b) => a.nightNumber - b.nightNumber)
      .map((a) => ({
        id: a.id,
        night: a.nightNumber,
        name: a.name,
        type: a.type,
        notes: a.notes,
      })),
    waypoints: trip.waypoints
      .sort((a, b) => a.kmFromStart - b.kmFromStart)
      .map((w) => ({ id: w.id, km: w.kmFromStart, name: w.name, type: w.type, notes: w.notes })),
    cafes: trip.cafes.map((c) => ({
      id: c.id,
      name: c.name,
      distance: c.distanceFromRoute,
      notes: c.notes,
    })),
    meals: trip.meals
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((m) => ({
        id: m.id,
        day: m.dayNumber,
        breakfast: { name: m.breakfastName, weight: m.breakfastWeightG ?? 0, notes: m.breakfastNotes },
        lunch: { name: m.lunchName, weight: m.lunchWeightG ?? 0, notes: m.lunchNotes },
        dinner: { name: m.dinnerName, weight: m.dinnerWeightG ?? 0, notes: m.dinnerNotes },
        snacks: m.snacks,
        foodWeight: m.totalFoodWeightG ?? 0,
      })),
    emergencyContacts: trip.emergencyContacts.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
    })),
    gear: trip.gearList.map((g) => ({
      id: g.id,
      gearItemId: g.gearItemId,
      packed: g.packed,
      weight: g.overrideWeightG ?? g.gearItem.weightG,
      name: g.gearItem.name,
      brand: g.gearItem.brand,
      category: g.gearItem.category,
    })),
  };
}

type SummaryTrip = Prisma.TripGetPayload<{
  include: { participants: true; segments: true };
}>;

export function shapeTripSummary(trip: SummaryTrip) {
  const today = new Date();
  const daysUntil = trip.startDate ? daysBetween(trip.startDate, today) : null;
  return {
    id: trip.id,
    name: trip.name,
    country: trip.country,
    status: trip.status,
    type: trip.type,
    dates: {
      start: trip.startDate?.toISOString().slice(0, 10) ?? null,
      end: trip.endDate?.toISOString().slice(0, 10) ?? null,
    },
    daysUntil,
    distance: trip.distanceKm ?? 0,
    elevation: trip.elevationM ?? 0,
    summary: trip.summary,
    participants: trip.participants.map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      confirmed: p.confirmed,
    })),
    segments: trip.segments.map((s) => ({ id: s.id, day: s.dayNumber })),
  };
}
