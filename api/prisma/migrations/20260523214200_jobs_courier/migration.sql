-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'MINIJOB', 'AUSBILDUNG', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PUBLISHED', 'CLOSED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PLATFORM', 'EMAIL', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "CourierDirection" AS ENUM ('DE_TO_TR', 'TR_TO_DE');

-- CreateEnum
CREATE TYPE "CourierPaymentType" AS ENUM ('FREE', 'PAID', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('OPEN', 'MATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CourierAcceptanceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "state_id" TEXT,
    "city_id" TEXT,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "work_mode" "WorkMode" NOT NULL DEFAULT 'ONSITE',
    "salary_range" TEXT,
    "turkish_friendly" BOOLEAN NOT NULL DEFAULT false,
    "german_level" TEXT,
    "contact_method" "ContactMethod" NOT NULL DEFAULT 'PLATFORM',
    "contact_value" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_requests" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "direction" "CourierDirection" NOT NULL,
    "from_area" TEXT NOT NULL,
    "to_area" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_category" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "estimated_value_eur" DOUBLE PRECISION,
    "payment_type" "CourierPaymentType" NOT NULL DEFAULT 'NEGOTIABLE',
    "payment_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "preferred_date" TIMESTAMP(3),
    "status" "CourierStatus" NOT NULL DEFAULT 'OPEN',
    "confirmed_acceptance_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_acceptances" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "traveler_id" TEXT NOT NULL,
    "message" TEXT,
    "travel_date" TIMESTAMP(3),
    "status" "CourierAcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_postings_status_idx" ON "job_postings"("status");

-- CreateIndex
CREATE INDEX "job_postings_city_id_idx" ON "job_postings"("city_id");

-- CreateIndex
CREATE INDEX "job_postings_job_type_idx" ON "job_postings"("job_type");

-- CreateIndex
CREATE UNIQUE INDEX "courier_requests_confirmed_acceptance_id_key" ON "courier_requests"("confirmed_acceptance_id");

-- CreateIndex
CREATE INDEX "courier_requests_status_direction_idx" ON "courier_requests"("status", "direction");

-- CreateIndex
CREATE INDEX "courier_acceptances_traveler_id_idx" ON "courier_acceptances"("traveler_id");

-- CreateIndex
CREATE UNIQUE INDEX "courier_acceptances_request_id_traveler_id_key" ON "courier_acceptances"("request_id", "traveler_id");

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "federal_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_requests" ADD CONSTRAINT "courier_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_requests" ADD CONSTRAINT "courier_requests_confirmed_acceptance_id_fkey" FOREIGN KEY ("confirmed_acceptance_id") REFERENCES "courier_acceptances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_acceptances" ADD CONSTRAINT "courier_acceptances_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "courier_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_acceptances" ADD CONSTRAINT "courier_acceptances_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
