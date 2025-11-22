import { redirect } from "next/navigation";
import { BetterAuth } from "better-auth";
import { PrismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const auth = new BetterAuth({
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  adapters: [PrismaAdapter(prisma)],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireUser() {
  const session = await auth.api.getSession();
  if (!session?.user) {
    redirect("/signin");
  }

  return session.user;
}
