import { Calendar, CheckCircle2, Package, Plane, User2 } from "lucide-react";
import { CourierRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { PostalCountry } from "@/lib/postal-country";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const directionLabels: Record<CourierRequest["direction"], string> = {
  DE_TO_TR: "DE → TR",
  TR_TO_DE: "TR → DE",
};

const paymentLabels: Record<CourierRequest["paymentType"], string> = {
  FREE: "Ücretsiz",
  PAID: "Ücretli",
  NEGOTIABLE: "Pazarlığa açık",
};

const statusLabels: Partial<Record<CourierRequest["status"], string>> = {
  MATCHED: "Eşleşti",
  COMPLETED: "Tamamlandı",
};

export function CourierCard({ request }: { request: CourierRequest }) {
  const traveler = request.confirmed?.traveler;
  const ownerName = request.owner?.profile?.displayName;
  const isMatched = request.status === "MATCHED" || request.status === "COMPLETED";

  return (
    <Card href={`/seyahat/${request.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{directionLabels[request.direction]}</Badge>
        {isMatched ? (
          <Badge variant={request.status === "COMPLETED" ? "muted" : "success"}>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {statusLabels[request.status]}
          </Badge>
        ) : (
          <Badge
            variant={
              request.paymentType === "FREE"
                ? "success"
                : request.paymentType === "PAID"
                  ? "default"
                  : "muted"
            }
          >
            {paymentLabels[request.paymentType]}
          </Badge>
        )}
      </div>

      <h3 className="mt-3 flex items-center gap-2 font-semibold text-text">
        <Package className="h-4 w-4 text-muted" />
        {request.itemName}
      </h3>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
        <Plane className="h-3.5 w-3.5" />
        {request.fromArea} → {request.toArea}
      </p>

      {isMatched && traveler && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-primary">
          <User2 className="h-3.5 w-3.5 shrink-0" />
          <UserDisplayName
            name={traveler.profile?.displayName ?? "Taşıyıcı"}
            userId={traveler.id}
            postalCountry={traveler.profile?.postalCountry as PostalCountry | undefined}
            linkToProfile={false}
            nameClassName="text-primary"
          />
          {ownerName && <span>· {ownerName} için taşıyor</span>}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {request.weightKg && <span>{request.weightKg} kg</span>}
        {request.estimatedValueEur && (
          <span>~{request.estimatedValueEur} €</span>
        )}
        {(request.confirmed?.travelDate ?? request.preferredDate) && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(request.confirmed?.travelDate ?? request.preferredDate!)}
          </span>
        )}
      </div>

      {!isMatched &&
        typeof request.acceptanceCount === "number" &&
        request.acceptanceCount > 0 && (
          <p className="mt-2 text-xs text-primary">
            {request.acceptanceCount} taşıyıcı teklif verdi
          </p>
        )}
    </Card>
  );
}
