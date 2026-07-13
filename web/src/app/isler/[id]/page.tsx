"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { api, JobPosting } from "@/lib/api";
import {
  getCategoryLabel,
  JOB_TYPES,
  LISTING_TYPE_LABELS,
  WORK_MODES,
} from "@/lib/job-categories";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReportButton } from "@/components/ui/ReportDialog";

const jobTypeLabels = Object.fromEntries(JOB_TYPES.map((t) => [t.value, t.label]));
const workModeLabels = Object.fromEntries(WORK_MODES.map((w) => [w.value, w.label]));

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    api
      .get<JobPosting>(`/jobs/${params.id}`)
      .then(setJob)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "İlan yüklenemedi"),
      );
  }, [params?.id]);

  if (!job) {
    return (
      <div className="w-full min-w-0 py-4 text-center text-muted">
        {error || "Yükleniyor..."}
      </div>
    );
  }

  const isSeeker = job.listingType === "SEEKER";

  return (
    <div className="w-full min-w-0">
      <Link href="/isler" className="text-sm text-muted hover:text-primary">
        ← İş ilanlarına dön
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={isSeeker ? "accent" : "muted"}>
          {LISTING_TYPE_LABELS[job.listingType ?? "EMPLOYER"]}
        </Badge>
        <Badge variant="default">{jobTypeLabels[job.jobType]}</Badge>
        <Badge variant="muted">{workModeLabels[job.workMode]}</Badge>
        {!isSeeker && job.turkishFriendly && (
          <Badge variant="accent">Türkçe işveren</Badge>
        )}
        <Badge variant="muted">{getCategoryLabel(job.category)}</Badge>
      </div>

      <h1 className="mt-3 break-words text-2xl font-bold">{job.title}</h1>

      <div className="mt-2 grid gap-1 text-sm text-muted">
        {isSeeker ? (
          <p className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            İş arayan
            {job.owner?.profile?.displayName ? ` — ${job.owner.profile.displayName}` : ""}
          </p>
        ) : (
          job.company && (
            <p className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {job.company}
            </p>
          )
        )}
        {job.city && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {job.city.name}
            {job.state ? `, ${job.state.name}` : ""}
          </p>
        )}
        {job.salaryRange && (
          <p className="flex items-center gap-1.5 font-medium text-text">
            <Briefcase className="h-4 w-4" />
            {isSeeker ? `Maaş beklentisi: ${job.salaryRange}` : job.salaryRange}
          </p>
        )}
        {job.germanLevel && <p>Almanca: {job.germanLevel}</p>}
        <p>Yayın tarihi: {formatDate(job.createdAt)}</p>
      </div>

      {isSeeker && job.briefInfo && (
        <Card className="mt-6">
          <h3 className="mb-2 font-semibold">Kısa bilgi</h3>
          <p className="whitespace-pre-wrap text-text">{job.briefInfo}</p>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="mb-2 font-semibold">
          {isSeeker ? "Detay" : "Açıklama"}
        </h3>
        <p className="whitespace-pre-wrap text-text">{job.description}</p>
      </Card>

      {isSeeker && job.cvUrl && (
        <Card className="mt-6">
          <h3 className="font-semibold">CV</h3>
          <a
            href={job.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex"
          >
            <Button variant="outline">
              <FileText className="mr-1 h-4 w-4" />
              {job.cvFileName ?? "CV dosyasını indir"}
            </Button>
          </a>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="font-semibold">{isSeeker ? "İletişim" : "Başvuru"}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {job.contactMethod === "EMAIL" && job.contactValue && (
            <a href={`mailto:${job.contactValue}`}>
              <Button>
                <Mail className="mr-1 h-4 w-4" />
                E-posta gönder
              </Button>
            </a>
          )}
          {job.contactMethod === "EXTERNAL_URL" && job.contactValue && (
            <a href={job.contactValue} target="_blank" rel="noreferrer">
              <Button>
                <ExternalLink className="mr-1 h-4 w-4" />
                Başvuru sayfasını aç
              </Button>
            </a>
          )}
          {job.contactMethod === "PLATFORM" && (
            <p className="text-sm text-muted">
              Platform üzerinden iletişim yakında aktif olacak. Şimdilik ilan
              sahibinin profilinden ulaşabilirsiniz.
            </p>
          )}
          <div className="ml-auto">
            <ReportButton targetType="JOB_POSTING" targetId={job.id} />
          </div>
        </div>
      </Card>

      <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-muted">
        Mülakat öncesi ücret talep eden, IBAN/şifre isteyen veya “ön ödeme” isteyen
        ilanları kesinlikle şikayet edin. Platform ödeme aracılığı yapmaz.
      </div>
    </div>
  );
}
