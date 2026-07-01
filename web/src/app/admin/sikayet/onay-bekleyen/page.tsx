import { AdminReportsList } from "@/components/admin/AdminReportsList";

export default function AdminPendingReportsPage() {
  return (
    <AdminReportsList
      title="Onay Bekleyen Şikayetler"
      statusFilter="PENDING"
      showResolve
    />
  );
}
