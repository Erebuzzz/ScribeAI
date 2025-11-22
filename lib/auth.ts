import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

const adapter = prismaAdapter(prisma, {
  provider: "postgresql",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: appUrl,
  trustedOrigins: [appUrl, "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
  database: adapter,
  session: {
    modelName: "AuthSession",
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireUser() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  if (!session?.user) {
    redirect("/signin");
  }

  return session.user;
}
