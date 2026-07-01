import { Calendar, MapPin, Users } from "lucide-react";
import { Event } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function EventCard({ event }: { event: Event }) {
  return (
    <Card href={`/etkinlikler/${event.id}`}>
      <div className="flex items-start justify-between gap-2">
        <Badge variant={event.priceType === "FREE" ? "success" : "accent"}>
          {event.priceType === "FREE" ? "Ücretsiz" : "Ücretli"}
        </Badge>
        {event.category && <Badge variant="muted">{event.category}</Badge>}
      </div>
      <h3 className="mt-3 font-semibold text-text line-clamp-2">{event.title}</h3>
      <div className="mt-3 space-y-1.5 text-sm text-muted">
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {event.city.name} · {event.location}
        </p>
        <p className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(event.startsAt)}
        </p>
        <p className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {event._count?.attendees ?? 0} kişi katılıyor
        </p>
      </div>
    </Card>
  );
}
