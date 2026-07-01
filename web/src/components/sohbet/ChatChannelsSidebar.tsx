"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Globe, Hash, Lock, MapPin, MessageCircle, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RoomItem, toSlug } from "./chat-utils";

function ChannelItem({ room, active }: { room: RoomItem; active: boolean }) {
  const Icon = room.type === "global" ? Globe : room.type === "state" ? MapPin : Hash;
  return (
    <Link
      href={room.href}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        active ? "bg-primary/15 font-semibold text-primary" : "text-muted hover:bg-background hover:text-text"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{room.label}</span>
    </Link>
  );
}

type Props = {
  currentHref?: string;
  dmActive?: boolean;
  open?: boolean;
  onToggle?: () => void;
};

export function ChatChannelsSidebar({ currentHref = "", dmActive = false, open = true, onToggle }: Props) {
  const { token } = useAuth();
  const [allRooms, setAllRooms] = useState<{
    states: { id: string; name: string }[];
    cities: { id: string; name: string; stateId: string }[];
  }>({ states: [], cities: [] });
  const [statesExpanded, setStatesExpanded] = useState(false);
  const [citiesExpanded, setCitiesExpanded] = useState(false);

  useEffect(() => {
    if (token) {
      api.get<{ states: { id: string; name: string }[]; cities: { id: string; name: string; stateId: string }[] }>(
        "/chat/rooms/accessible",
        token,
      )
        .then(setAllRooms)
        .catch(() => setAllRooms({ states: [], cities: [] }));
    } else {
      setAllRooms({ states: [], cities: [] });
    }
  }, [token]);

  const stateRooms: RoomItem[] = allRooms.states.map((s) => ({
    href: `/sohbet/eyalet/${toSlug(s.name)}`,
    label: s.name,
    type: "state",
  }));
  const cityRooms: RoomItem[] = allRooms.cities.map((c) => ({
    href: `/sohbet/sehir/${toSlug(c.name)}`,
    label: c.name,
    type: "city",
  }));

  const VISIBLE_STATES = 5;
  const VISIBLE_CITIES = 8;

  return (
    <aside
      className={`flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 ${
        open ? "w-52" : "w-10"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text"
      >
        {open ? (
          <>
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="flex-1 pl-1.5">Kanallar</span>
            <X className="h-3.5 w-3.5" />
          </>
        ) : (
          <MessageCircle className="mx-auto h-3.5 w-3.5" />
        )}
      </button>

      {open && (
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted/60">Genel</p>
          <ChannelItem
            room={{ href: "/sohbet/genel/genel", label: "Genel Sohbet", type: "global" }}
            active={currentHref === "/sohbet/genel/genel"}
          />

          {stateRooms.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setStatesExpanded((v) => !v)}
                className="flex w-full items-center gap-1 px-2 pb-0.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted/60 hover:text-muted"
              >
                {statesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Eyaletler
              </button>
              {(statesExpanded ? stateRooms : stateRooms.slice(0, VISIBLE_STATES)).map((r) => (
                <ChannelItem key={r.href} room={r} active={currentHref === r.href} />
              ))}
              {!statesExpanded && stateRooms.length > VISIBLE_STATES && (
                <button
                  type="button"
                  onClick={() => setStatesExpanded(true)}
                  className="w-full px-2 py-1 text-left text-xs text-muted hover:text-primary"
                >
                  +{stateRooms.length - VISIBLE_STATES} daha…
                </button>
              )}
            </>
          )}

          {cityRooms.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCitiesExpanded((v) => !v)}
                className="flex w-full items-center gap-1 px-2 pb-0.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted/60 hover:text-muted"
              >
                {citiesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Şehirler
              </button>
              {(citiesExpanded ? cityRooms : cityRooms.slice(0, VISIBLE_CITIES)).map((r) => (
                <ChannelItem key={r.href} room={r} active={currentHref === r.href} />
              ))}
              {!citiesExpanded && cityRooms.length > VISIBLE_CITIES && (
                <button
                  type="button"
                  onClick={() => setCitiesExpanded(true)}
                  className="w-full px-2 py-1 text-left text-xs text-muted hover:text-primary"
                >
                  +{cityRooms.length - VISIBLE_CITIES} daha…
                </button>
              )}
            </>
          )}

          {token && stateRooms.length === 0 && cityRooms.length === 0 && (
            <p className="px-2 pt-3 text-[11px] leading-relaxed text-muted">
              Bölge kanalları için{" "}
              <Link href="/profil/duzenle" className="text-primary hover:underline">
                konumunuzu ekleyin
              </Link>
              .
            </p>
          )}

          <div className="mt-2 border-t border-border pt-2">
            <Link
              href="/sohbet/mesajlarim"
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                dmActive
                  ? "bg-primary/15 font-semibold text-primary"
                  : "text-muted hover:bg-background hover:text-text"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="truncate">Özel Mesajlar</span>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
