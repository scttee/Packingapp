import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "./db";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const COOKIE = "traverse_session";
const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i === -1) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  if (mac.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return value;
}

export function setSession(res: Response, userId: string) {
  res.cookie(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TWO_WEEKS,
    path: "/",
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function getUserId(req: Request): string | null {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return null;
  return verify(raw);
}

// In MVP we auto-create + sign in the demo user if there's no session.
// This is the seam to swap in Clerk / Auth.js later.
const DEMO_EMAIL = "alex@traverse.app";

export async function ensureDemoUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: "Alex Hartley" },
    });
  }
  return user;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let userId = getUserId(req);
  if (!userId) {
    const demo = await ensureDemoUser();
    userId = demo.id;
    setSession(res, userId);
  } else {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (!exists) {
      const demo = await ensureDemoUser();
      userId = demo.id;
      setSession(res, userId);
    }
  }
  (req as any).userId = userId;
  next();
}

export function requireUser(req: Request): string {
  const id = (req as any).userId;
  if (!id) throw new Error("not authenticated");
  return id;
}
