import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "./db";

export function revalidateApp() {
  revalidatePath("/", "layout");
}

export async function touchUser(userId: string) {
  const prisma = await db();
  await prisma.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
}
