import type { Metadata } from "next";
import { DashboardPage } from "@/modules/dashboard/components/HostPages";

export const metadata: Metadata = { title: "My invitations" };

export default function Page() {
  return <DashboardPage />;
}
