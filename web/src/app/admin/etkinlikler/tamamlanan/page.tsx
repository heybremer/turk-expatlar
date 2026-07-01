import { AdminEventsList } from "@/components/admin/AdminEventsList";

export default function AdminCompletedEventsPage() {
  return <AdminEventsList title="Tamamlanan Etkinlikler" filter="completed" />;
}
