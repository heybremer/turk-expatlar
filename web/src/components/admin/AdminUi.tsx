"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminPagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted">Sayfa {page} / {totalPages} ({total} kayıt)</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Önceki
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Sonraki <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose ?? (() => undefined)}
      maxWidthClass="max-w-lg"
      showCloseButton={!!onClose}
    >
      {children}
      {onClose && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
        </div>
      )}
    </Modal>
  );
}
