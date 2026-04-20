import { Router } from "express";

const router = Router();

const cache = new Map<string, { at: number; data: any }>();
const TTL = 1000 * 60 * 30;

router.get("/", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const start = String(req.query.start || "");
  const days = Math.min(Math.max(Number(req.query.days || 3), 1), 7);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat/lng required" });
  }

  const startDate = start ? new Date(start) : new Date();
  const end = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + days - 1);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const key = `${lat.toFixed(2)}|${lng.toFixed(2)}|${startStr}|${endStr}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return res.json(hit.data);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", startStr);
  url.searchParams.set("end_date", endStr);

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({ error: "weather upstream error", detail: body.slice(0, 200) });
    }
    const data: any = await r.json();
    const out = (data.daily?.time || []).map((date: string, i: number) => {
      const code = data.daily.weathercode[i];
      const rain = data.daily.precipitation_probability_max?.[i] ?? 0;
      let icon: "sun" | "cloud" | "rain" = "sun";
      if (code >= 51 || rain >= 50) icon = "rain";
      else if (code >= 1) icon = "cloud";
      return {
        date,
        icon,
        temp: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        wind: Math.round(data.daily.wind_speed_10m_max[i]),
        rain,
      };
    });
    cache.set(key, { at: Date.now(), data: out });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: "weather fetch failed", detail: e?.message });
  }
});

export default router;
