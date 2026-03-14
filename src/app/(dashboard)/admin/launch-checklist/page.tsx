import { getServerSession } from "next-auth";
import { redirect }         from "next/navigation";
import { authOptions }      from "@/lib/auth";
import { UserRole }         from "@prisma/client";
import type { Metadata }    from "next";
import { LaunchChecklist }  from "./LaunchChecklist";

export const metadata: Metadata = {
  title: "Launch Checklist",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function isAdmin(email: string | null | undefined, role: string): boolean {
  if (!email) return false;
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(email.toLowerCase()) || role === UserRole.AGENCY;
}

export default async function LaunchChecklistPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user.email, session.user.role ?? "")) redirect("/discover");

  return <LaunchChecklist />;
}
