import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/HostPages";

export const metadata: Metadata = { title: "My invitations" };

export default function Page() {
  return <DashboardPage />;
}
