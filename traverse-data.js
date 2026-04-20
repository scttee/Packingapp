// Traverse — Demo Data

const DEMO_DATA = {
  user: { name: "Alex Hartley", initials: "AH" },

  trips: [
    {
      id: 1,
      name: "Kangaroo Valley, 3 Days",
      country: "Wodi Wodi Country",
      status: "upcoming",
      type: "bike",
      dates: { start: "2026-05-16", end: "2026-05-18" },
      daysUntil: 26,
      distance: 47,
      elevation: 1080,
      participants: [
        { name: "Alex Hartley", initials: "AH", confirmed: true },
        { name: "Sarah Chen", initials: "SC", confirmed: true },
        { name: "Marcus Webb", initials: "MW", confirmed: true },
      ],
      summary: "Three days through the Shoalhaven River corridor, linking Kangaroo Valley village to Fitzroy Falls via the old Nowra Road fire trail. Good gravel throughout with one hike-a-bike section on day two. Camping at Bendeela Camping Area and Yarrunga Valley.",
      weather: { day1: { icon: "sun", temp: 14, wind: 12, rain: 0 }, day2: { icon: "cloud", temp: 11, wind: 18, rain: 40 }, day3: { icon: "sun", temp: 15, wind: 8, rain: 0 } },
      segments: [
        { day: 1, name: "Kangaroo Valley to Bendeela", distance: 18, elevation: 420, surface: "Gravel / dirt", notes: "Depart from Kangaroo Valley village. Climb via Barrengarry Creek Rd." },
        { day: 2, name: "Bendeela to Yarrunga Valley", distance: 16, elevation: 480, surface: "Fire trail / hike-a-bike (2km)", notes: "The crux day. Steep fire trail to the ridge; one unrideable rocky section near the top." },
        { day: 3, name: "Yarrunga Valley to Fitzroy Falls", distance: 13, elevation: 180, surface: "Gravel / sealed", notes: "Mostly downhill on good surface. Exit via Nowra Rd to Fitzroy Falls car park." },
      ],
      accommodation: [
        { night: 1, name: "Bendeela Camping Area", type: "Campground", notes: "Pit toilets, no showers. River access. Bookings required.", distance: 18 },
        { night: 2, name: "Yarrunga Valley Fireground", type: "Dispersed camping", notes: "No facilities. Carry all water from Kangaroo River crossing.", distance: 34 },
      ],
      waypoints: [
        { name: "Kangaroo Valley Village", km: 0, type: "start", notes: "Parking at showground" },
        { name: "Barrengarry Creek Rd turnoff", km: 4.2, type: "junction", notes: "Easy to miss, look for orange triangle marker" },
        { name: "Bendeela Camping Area", km: 18, type: "camp", notes: "Night 1" },
        { name: "Kangaroo River crossing", km: 24, type: "water", notes: "Last water before the climb" },
        { name: "Nowra Rd junction", km: 36, type: "junction", notes: "Sealed from here" },
        { name: "Fitzroy Falls car park", km: 47, type: "end", notes: "Return shuttle" },
      ],
      meals: [
        {
          day: 1,
          breakfast: { name: "Oats, honey, mixed nuts", weight: 120, notes: "Pre-packed in ziplock. No cook — cold soak overnight." },
          lunch: { name: "Rye crackers, hard salami, aged cheddar", weight: 220, notes: "No cook." },
          dinner: { name: "Backcountry Cuisine: Beef Teriyaki", weight: 135, notes: "Add 500ml boiling water, 10 min rehydration." },
          snacks: "Medjool dates, biltong, Clif Bar x2",
          foodWeight: 695,
        },
        {
          day: 2,
          breakfast: { name: "Instant miso, 2 × hard-boiled eggs", weight: 90, notes: "Eggs boiled on day 1 at campsite." },
          lunch: { name: "Wraps with peanut butter and banana chips", weight: 180, notes: "No cook." },
          dinner: { name: "Radix Ultra: Plant-Based Curry", weight: 160, notes: "Add 400ml boiling water. High calorie — good for the big day." },
          snacks: "Walnuts, dark chocolate, rice crackers",
          foodWeight: 660,
        },
        {
          day: 3,
          breakfast: { name: "Granola bars + instant coffee", weight: 80, notes: "Light — short day, cafe at finish." },
          lunch: { name: "Trail mix, jerky, remaining crackers", weight: 150, notes: "Clear out remaining food." },
          dinner: { name: "Fitzroy Falls Visitor Centre or pub in Berry", weight: 0, notes: "Eat out. Earned." },
          snacks: "Whatever is left",
          foodWeight: 230,
        },
      ],
      cafes: [
        { name: "Kangaroo Valley Pub", distance: "0km from start", notes: "Pre-ride dinner, good food" },
        { name: "Berry Sourdough Cafe", distance: "6km off-route (day 1)", notes: "Worth the detour for the coffee" },
        { name: "Fitzroy Falls Visitor Centre Kiosk", distance: "At finish", notes: "Limited hours, call ahead" },
      ],
      trackingEnabled: false,
      trackingLink: "https://traverse.app/share/kv26-ah",
      gearTemplateId: "bikepacking-3day",
    },
    {
      id: 2,
      name: "Blue Mountains Circuit",
      country: "Gundungurra Country",
      status: "completed",
      type: "mixed",
      dates: { start: "2026-03-01", end: "2026-03-03" },
      distance: 62,
      elevation: 1840,
      participants: [
        { name: "Alex Hartley", initials: "AH", confirmed: true },
        { name: "Sarah Chen", initials: "SC", confirmed: true },
      ],
      summary: "Loop from Katoomba through the Megalong Valley, returning via Narrow Neck plateau.",
    },
    {
      id: 3,
      name: "Barrington Tops Traverse",
      country: "Worimi Country",
      status: "draft",
      type: "hike",
      dates: { start: "2026-07-10", end: "2026-07-14" },
      distance: 85,
      elevation: 2600,
      participants: [
        { name: "Alex Hartley", initials: "AH", confirmed: true },
      ],
      summary: null,
    },
  ],

  gearLibrary: [
    { id: 1, name: "Fjällräven Abisko Lite 2", category: "Sleep", weight: 1340, brand: "Fjällräven", lastUsed: "2026-03-01", icon: "tent" },
    { id: 2, name: "Sea to Summit Spark SP1", category: "Sleep", weight: 590, brand: "Sea to Summit", lastUsed: "2026-03-01", icon: "moon" },
    { id: 3, name: "Sea to Summit Ultralight Mat", category: "Sleep", weight: 270, brand: "Sea to Summit", lastUsed: "2026-03-01", icon: "square" },
    { id: 4, name: "MSR PocketRocket Deluxe", category: "Cook", weight: 83, brand: "MSR", lastUsed: "2026-03-01", icon: "flame" },
    { id: 5, name: "Snow Peak Titanium 700", category: "Cook", weight: 103, brand: "Snow Peak", lastUsed: "2026-03-01", icon: "coffee" },
    { id: 6, name: "Apidura Racing Top Tube Pack", category: "Ride", weight: 62, brand: "Apidura", lastUsed: "2026-03-01", icon: "bag" },
    { id: 7, name: "Apidura Expedition Fork Packs", category: "Ride", weight: 130, brand: "Apidura", lastUsed: "2026-03-01", icon: "bag" },
    { id: 8, name: "Ortlieb Seat-Pack 11L", category: "Ride", weight: 420, brand: "Ortlieb", lastUsed: "2026-03-01", icon: "bag" },
    { id: 9, name: "Fjällräven Abisko Wool Fleece", category: "Wear", weight: 360, brand: "Fjällräven", lastUsed: "2025-12-10", icon: "shirt" },
    { id: 10, name: "Rapha Pro Team Insulated Gilet", category: "Wear", weight: 185, brand: "Rapha", lastUsed: "2026-03-01", icon: "shirt" },
    { id: 11, name: "Adventure Medical Kits UltraLight", category: "Safety", weight: 102, brand: "Adventure Medical", lastUsed: "2026-03-01", icon: "heart" },
    { id: 12, name: "PLB — GME ResQLink 400", category: "Safety", weight: 187, brand: "GME", lastUsed: "2025-11-15", icon: "radio" },
    { id: 13, name: "Parks NSW Permit — Bendeela", category: "Documents", weight: 0, brand: "", lastUsed: null, icon: "file" },
    { id: 14, name: "Topographic Map 1:25,000", category: "Documents", weight: 45, brand: "Spatial Services NSW", lastUsed: null, icon: "map" },
  ],

  gearTemplate: {
    "bikepacking-3day": {
      Sleep: [1, 2, 3],
      Cook: [4, 5],
      Ride: [6, 7, 8],
      Wear: [9, 10],
      Safety: [11, 12],
      Documents: [13, 14],
    }
  }
};
