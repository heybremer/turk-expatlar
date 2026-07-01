export const JOB_CATEGORIES = [
  { value: "yazilim", label: "Yazılım & IT" },
  { value: "muhendislik", label: "Mühendislik" },
  { value: "gastronomi", label: "Gastronomi & Turizm" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "lojistik", label: "Lojistik & Depo" },
  { value: "satis", label: "Satış & Pazarlama" },
  { value: "ofis", label: "Ofis & İdari" },
  { value: "ticaret", label: "Ticaret & Perakende" },
  { value: "diger", label: "Diğer" },
] as const;

export type JobCategoryValue = (typeof JOB_CATEGORIES)[number]["value"];

export const JOB_CATEGORY_LABELS: Record<JobCategoryValue, string> = Object.fromEntries(
  JOB_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<JobCategoryValue, string>;

export const JOB_TYPES = [
  { value: "FULL_TIME", label: "Tam zamanlı" },
  { value: "PART_TIME", label: "Yarı zamanlı" },
  { value: "MINIJOB", label: "Minijob" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "INTERNSHIP", label: "Staj" },
  { value: "FREELANCE", label: "Freelance" },
] as const;

export const WORK_MODES = [
  { value: "ONSITE", label: "İşyerinde" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hibrit" },
] as const;

export const LISTING_TYPES = [
  { value: "EMPLOYER", label: "İşveren ilanı" },
  { value: "SEEKER", label: "İş arayan ilanı" },
] as const;

export type JobListingType = (typeof LISTING_TYPES)[number]["value"];

export const LISTING_TYPE_LABELS: Record<JobListingType, string> = {
  EMPLOYER: "İşveren ilanı",
  SEEKER: "İş arayan ilanı",
};

export function getCategoryLabel(value: string) {
  return JOB_CATEGORY_LABELS[value as JobCategoryValue] ?? value;
}
