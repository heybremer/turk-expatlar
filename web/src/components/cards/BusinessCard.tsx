import { MapPin, Phone, Star } from "lucide-react";
import { Business } from "@/lib/api";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function BusinessCard({ business }: { business: Business }) {
  return (
    <Card href={`/rehber/${business.id}`}>
      <div className="flex flex-wrap gap-2">
        <Badge variant="muted">{business.category.name}</Badge>
        {business.speaksTurkish && <Badge variant="default">Türkçe</Badge>}
        {business.isVerified && <Badge variant="success">Doğrulanmış</Badge>}
      </div>
      <h3 className="mt-2 font-semibold text-text">{business.name}</h3>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
        <MapPin className="h-3.5 w-3.5" />
        {business.city.name}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-medium text-warning">
          <Star className="h-4 w-4 fill-warning text-warning" />
          {business.averageRating.toFixed(1)} · {business.reviewCount} yorum
        </p>
        {business.phone && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Phone className="h-3.5 w-3.5" />
            Ara
          </span>
        )}
      </div>
    </Card>
  );
}
