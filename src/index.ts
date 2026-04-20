import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { authMiddleware } from "./auth";
import tripsRoute from "./routes/trips";
import gearRoute from "./routes/gear";
import weatherRoute from "./routes/weather";
import gpxRoute from "./routes/gpx";
import shareRoute from "./routes/share";

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = path.resolve(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Public routes (no auth required)
app.use("/api/share", shareRoute);

// Authenticated API
app.use("/api", authMiddleware);
app.use("/api/trips", tripsRoute);
app.use("/api/gear", gearRoute);
app.use("/api/weather", weatherRoute);
app.use("/api/import/gpx", gpxRoute);
app.get("/api/me", (req, res) => res.json({ id: (req as any).userId }));

// Static frontend
app.use(express.static(publicDir, { extensions: ["html"] }));

app.get("/share/:token", (_req, res) => {
  res.sendFile(path.join(publicDir, "share.html"), (err) => {
    if (err) res.status(404).send("Not found");
  });
});

// SPA-ish fallback: any non-API route returns the app shell
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const file = path.join(publicDir, "Traverse.html");
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send("Not found");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Traverse listening on :${port}`);
});
