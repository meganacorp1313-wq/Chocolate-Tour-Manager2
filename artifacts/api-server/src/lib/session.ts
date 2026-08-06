import crypto from "node:crypto";
import type { Request, Response } from "express";

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET must be set");
}
const SECRET: string = secret;

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function sign(payload: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

interface SessionPayload {
  role: "admin" | "company";
  companyId?: number;
  exp: number;
}

export function setSession(
  res: Response,
  cookieName: string,
  data: Omit<SessionPayload, "exp">,
): void {
  const payload: SessionPayload = { ...data, exp: Date.now() + MAX_AGE_MS };
  res.cookie(cookieName, sign(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSession(res: Response, cookieName: string): void {
  res.clearCookie(cookieName, { path: "/" });
}

export function readSession(req: Request, cookieName: string): SessionPayload | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[cookieName];
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as SessionPayload;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const COMPANY_COOKIE = "company_session";
export const ADMIN_COOKIE = "admin_session";
