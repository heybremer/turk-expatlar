import { AdminEventsList } from "@/components/admin/AdminEventsList";

export default function AdminPendingEventsPage() {
  return <AdminEventsList title="Onay Bekleyen Etkinlikler" filter="pending" showApprove />;
}
