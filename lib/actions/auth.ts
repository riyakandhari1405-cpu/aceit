"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revalidateApp } from "@/lib/revalidate";
import { SESSION_COOKIE, signSession } from "@/lib/session-token";
import { cookies } from "next/headers";

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email.").max(120),
  password: z.string().min(8, "Use at least 8 characters.").max(100),
});

async function setSession(user: { id: string; role: "STUDENT" | "ADMIN"; name: string }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function login(_prev: { error: string } | null, formData: FormData) {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password do not match." };
  }
  await setSession(user);
  redirect("/dashboard");
}

export async function register(_prev: { error: string } | null, formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Add your name.").max(80),
      email: z.string().trim().email("Enter a valid email.").max(120),
      password: z.string().min(8, "Use at least 8 characters.").max(100),
      confirm: z.string(),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (parsed.data.password !== parsed.data.confirm) return { error: "The passwords do not match." };
  const prisma = await db();
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: "STUDENT",
        profile: { create: {} },
        education: { create: {} },
      },
    });
    await setSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with that email already exists." };
    }
    throw error;
  }
  redirect("/profile");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidateApp();
  redirect("/login");
}
