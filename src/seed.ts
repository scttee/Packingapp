import { prisma } from "./db";

async function main() {
  console.log("Seeding Traverse demo data…");

  const user = await prisma.user.upsert({
    where: { email: "alex@traverse.app" },
    update: {},
    create: { email: "alex@traverse.app", name: "Alex Hartley" },
  });

  // Skip if a trip already exists (idempotent)
  const existingTrip = await prisma.trip.findFirst({
    where: { userId: user.id, name: "Kangaroo Valley, 3 Days" },
  });
  if (existingTrip) {
    console.log("Demo data already present.");
    return;
  }

  const gearSpecs = [
    { name: "Fjällräven Abisko Lite 2", brand: "Fjällräven", category: "Sleep", weightG: 1340 },
    { name: "Sea to Summit Spark SP1", brand: "Sea to Summit", category: "Sleep", weightG: 590 },
    { name: "Sea to Summit Ultralight Mat", brand: "Sea to Summit", category: "Sleep", weightG: 270 },
    { name: "MSR PocketRocket Deluxe", brand: "MSR", category: "Cook", weightG: 83 },
    { name: "Snow Peak Titanium 700", brand: "Snow Peak", category: "Cook", weightG: 103 },
    { name: "Apidura Racing Top Tube Pack", brand: "Apidura", category: "Ride", weightG: 62 },
    { name: "Apidura Expedition Fork Packs", brand: "Apidura", category: "Ride", weightG: 130 },
    { name: "Ortlieb Seat-Pack 11L", brand: "Ortlieb", category: "Ride", weightG: 420 },
    { name: "Fjällräven Abisko Wool Fleece", brand: "Fjällräven", category: "Wear", weightG: 360 },
    { name: "Rapha Pro Team Insulated Gilet", brand: "Rapha", category: "Wear", weightG: 185 },
    { name: "Adventure Medical Kits UltraLight", brand: "Adventure Medical", category: "Safety", weightG: 102 },
    { name: "PLB — GME ResQLink 400", brand: "GME", category: "Safety", weightG: 187 },
    { name: "Parks NSW Permit — Bendeela", brand: "", category: "Documents", weightG: 0 },
    { name: "Topographic Map 1:25,000", brand: "Spatial Services NSW", category: "Documents", weightG: 45 },
  ];

  const gear = [];
  for (const g of gearSpecs) {
    gear.push(
      await prisma.gearItem.create({
        data: {
          userId: user.id,
          name: g.name,
          brand: g.brand || null,
          category: g.category,
          weightG: g.weightG,
          lastUsedDate: new Date("2026-03-01"),
        },
      })
    );
  }

  // Templates (system-level, userId=null so all users can use them)
  await prisma.gearTemplate.create({
    data: {
      name: "bikepacking-3day",
      description: "Bikepacking — 3 day",
      itemIds: JSON.stringify(gear.map((g) => g.id)),
    },
  });

  await prisma.gearTemplate.create({
    data: {
      name: "ultralight-hike",
      description: "Ultralight hiking",
      itemIds: JSON.stringify(gear.filter((g) => ["Sleep", "Cook", "Wear", "Safety"].includes(g.category)).map((g) => g.id)),
    },
  });

  // ── Kangaroo Valley trip (the hero) ───────────────────────────────
  const kv = await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Kangaroo Valley, 3 Days",
      country: "Wodi Wodi Country",
      status: "upcoming",
      type: "bike",
      startDate: new Date("2026-05-16"),
      endDate: new Date("2026-05-18"),
      distanceKm: 47,
      elevationM: 1080,
      summary:
        "Three days through the Shoalhaven River corridor, linking Kangaroo Valley village to Fitzroy Falls via the old Nowra Road fire trail. Good gravel throughout with one hike-a-bike section on day two. Camping at Bendeela Camping Area and Yarrunga Valley.",
      participants: {
        create: [
          { name: "Alex Hartley", initials: "AH", confirmed: true },
          { name: "Sarah Chen", initials: "SC", confirmed: true },
          { name: "Marcus Webb", initials: "MW", confirmed: true },
        ],
      },
      segments: {
        create: [
          { dayNumber: 1, name: "Kangaroo Valley to Bendeela", distanceKm: 18, elevationM: 420, surface: "Gravel / dirt", notes: "Depart from Kangaroo Valley village. Climb via Barrengarry Creek Rd." },
          { dayNumber: 2, name: "Bendeela to Yarrunga Valley", distanceKm: 16, elevationM: 480, surface: "Fire trail / hike-a-bike (2km)", notes: "The crux day. Steep fire trail to the ridge; one unrideable rocky section near the top." },
          { dayNumber: 3, name: "Yarrunga Valley to Fitzroy Falls", distanceKm: 13, elevationM: 180, surface: "Gravel / sealed", notes: "Mostly downhill on good surface. Exit via Nowra Rd to Fitzroy Falls car park." },
        ],
      },
      accommodations: {
        create: [
          { nightNumber: 1, name: "Bendeela Camping Area", type: "Campground", notes: "Pit toilets, no showers. River access. Bookings required.", lat: -34.7256, lng: 150.5012 },
          { nightNumber: 2, name: "Yarrunga Valley Fireground", type: "Dispersed camping", notes: "No facilities. Carry all water from Kangaroo River crossing.", lat: -34.6712, lng: 150.4501 },
        ],
      },
      waypoints: {
        create: [
          { kmFromStart: 0, name: "Kangaroo Valley Village", type: "start", notes: "Parking at showground", lat: -34.7361, lng: 150.5359 },
          { kmFromStart: 4.2, name: "Barrengarry Creek Rd turnoff", type: "junction", notes: "Easy to miss, look for orange triangle marker" },
          { kmFromStart: 18, name: "Bendeela Camping Area", type: "camp", notes: "Night 1", lat: -34.7256, lng: 150.5012 },
          { kmFromStart: 24, name: "Kangaroo River crossing", type: "water", notes: "Last water before the climb" },
          { kmFromStart: 36, name: "Nowra Rd junction", type: "junction", notes: "Sealed from here" },
          { kmFromStart: 47, name: "Fitzroy Falls car park", type: "end", notes: "Return shuttle", lat: -34.6491, lng: 150.4863 },
        ],
      },
      cafes: {
        create: [
          { name: "Kangaroo Valley Pub", distanceFromRoute: "0km from start", notes: "Pre-ride dinner, good food" },
          { name: "Berry Sourdough Cafe", distanceFromRoute: "6km off-route (day 1)", notes: "Worth the detour for the coffee" },
          { name: "Fitzroy Falls Visitor Centre Kiosk", distanceFromRoute: "At finish", notes: "Limited hours, call ahead" },
        ],
      },
      meals: {
        create: [
          { dayNumber: 1, breakfastName: "Oats, honey, mixed nuts", breakfastWeightG: 120, breakfastNotes: "Pre-packed in ziplock. No cook — cold soak overnight.", lunchName: "Rye crackers, hard salami, aged cheddar", lunchWeightG: 220, lunchNotes: "No cook.", dinnerName: "Backcountry Cuisine: Beef Teriyaki", dinnerWeightG: 135, dinnerNotes: "Add 500ml boiling water, 10 min rehydration.", snacks: "Medjool dates, biltong, Clif Bar x2", totalFoodWeightG: 695 },
          { dayNumber: 2, breakfastName: "Instant miso, 2 × hard-boiled eggs", breakfastWeightG: 90, breakfastNotes: "Eggs boiled on day 1 at campsite.", lunchName: "Wraps with peanut butter and banana chips", lunchWeightG: 180, lunchNotes: "No cook.", dinnerName: "Radix Ultra: Plant-Based Curry", dinnerWeightG: 160, dinnerNotes: "Add 400ml boiling water. High calorie — good for the big day.", snacks: "Walnuts, dark chocolate, rice crackers", totalFoodWeightG: 660 },
          { dayNumber: 3, breakfastName: "Granola bars + instant coffee", breakfastWeightG: 80, breakfastNotes: "Light — short day, cafe at finish.", lunchName: "Trail mix, jerky, remaining crackers", lunchWeightG: 150, lunchNotes: "Clear out remaining food.", dinnerName: "Fitzroy Falls Visitor Centre or pub in Berry", dinnerWeightG: 0, dinnerNotes: "Eat out. Earned.", snacks: "Whatever is left", totalFoodWeightG: 230 },
        ],
      },
      emergencyContacts: {
        create: [
          { name: "NSW SES", number: "132 500" },
          { name: "Police Assistance", number: "131 444" },
          { name: "Sarah Chen (in-party)", number: "+61 412 xxx xxx" },
        ],
      },
    },
  });

  // Attach all gear to the trip
  await prisma.tripGear.createMany({
    data: gear.map((g) => ({ tripId: kv.id, gearItemId: g.id, packed: false })),
  });

  // Past trip
  await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Blue Mountains Circuit",
      country: "Gundungurra Country",
      status: "completed",
      type: "mixed",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-03"),
      distanceKm: 62,
      elevationM: 1840,
      summary: "Loop from Katoomba through the Megalong Valley, returning via Narrow Neck plateau.",
      participants: {
        create: [
          { name: "Alex Hartley", initials: "AH", confirmed: true },
          { name: "Sarah Chen", initials: "SC", confirmed: true },
        ],
      },
    },
  });

  // Draft trip
  await prisma.trip.create({
    data: {
      userId: user.id,
      name: "Barrington Tops Traverse",
      country: "Worimi Country",
      status: "draft",
      type: "hike",
      startDate: new Date("2026-07-10"),
      endDate: new Date("2026-07-14"),
      distanceKm: 85,
      elevationM: 2600,
      participants: {
        create: [{ name: "Alex Hartley", initials: "AH", confirmed: true }],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
