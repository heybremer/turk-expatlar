import { Briefcase, Building2, FileText, MapPin, User } from "lucide-react";
import { JobPosting } from "@/lib/api";
import {
  getCategoryLabel,
  JOB_TYPES,
  LISTING_TYPE_LABELS,
  WORK_MODES,
} from "@/lib/job-categories";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const jobTypeLabels = Object.fromEntries(JOB_TYPES.map((t) => [t.value, t.label]));
const workModeLabels = Object.fromEntries(WORK_MODES.map((w) => [w.value, w.label]));

export function JobCard({ job }: { job: JobPosting }) {
  const isSeeker = job.listingType === "SEEKER";

  return (
    <Card href={`/isler/${job.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isSeeker ? "accent" : "muted"}>
          {LISTING_TYPE_LABELS[job.listingType ?? "EMPLOYER"]}
        </Badge>
        <Badge variant="default">{jobTypeLabels[job.jobType]}</Badge>
        <Badge variant="muted">{workModeLabels[job.workMode]}</Badge>
        {!isSeeker && job.turkishFriendly && (
          <Badge variant="accent">Türkçe işveren</Badge>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 font-semibold text-text">{job.title}</h3>
      {isSeeker ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <User className="h-3.5 w-3.5" />
          İş arayan
        </p>
      ) : (
        job.company && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Building2 className="h-3.5 w-3.5" />
            {job.company}
          </p>
        )
      )}
      {(job.briefInfo || (isSeeker && job.description)) && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {job.briefInfo ?? job.description}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">{getCategoryLabel(job.category)}</p>
      {job.city && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5" />
          {job.city.name}
        </p>
      )}
      {job.salaryRange && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-text">
          <Briefcase className="h-3.5 w-3.5" />
          {job.salaryRange}
        </p>
      )}
      {isSeeker && job.cvUrl && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
          <FileText className="h-3.5 w-3.5" />
          CV mevcut
        </p>
      )}
    </Card>
  );
}
