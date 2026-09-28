import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "aceit_session";

export type SessionPayload = {
  uid: string;
  role: "STUDENT" | "ADMIN";
  name: string;
};

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "aceit-dev-secret-change-me-please-32");
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    if (typeof payload.uid !== "string" || typeof payload.name !== "string") return null;
    if (role !== "STUDENT" && role !== "ADMIN") return null;
    return { uid: payload.uid, role, name: payload.name };
  } catch {
    return null;
  }
}
