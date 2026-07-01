"use client";

import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OdemeBasarili() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold">Üyeliğiniz aktif!</h1>
        <p className="mt-2 text-muted">
          Ödemeniz alındı. 1 yıllık üyeliğiniz hesabınıza tanımlandı.
        </p>
        <div className="mt-4 flex justify-center gap-1 text-sm text-muted">
          <Sparkles className="h-4 w-4 text-primary" />
          Tüm premium özellikler artık kullanıma açık.
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/akis">
            <Button>Akışa git</Button>
          </Link>
          <Link href="/profil">
            <Button variant="outline">Profilim</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
