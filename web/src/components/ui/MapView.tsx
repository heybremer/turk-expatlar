"use client";

import { useEffect, useRef } from "react";

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  link?: string;
  color?: "primary" | "accent" | "success";
}

interface MapViewProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}

const COLOR_HEX = {
  primary: "#0f766e",
  accent: "#e11d48",
  success: "#16a34a",
};

export function MapView({
  markers,
  center,
  zoom = 10,
  height = "400px",
  className = "",
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Leaflet'i dinamik olarak yükle
    const load = async () => {
      // @ts-expect-error — leaflet global
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);

          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // @ts-expect-error — leaflet global
      const L = window.L;
      if (!mapRef.current) return;

      const defaultCenter = center ?? [
        markers.reduce((s, m) => s + m.lat, 0) / markers.length,
        markers.reduce((s, m) => s + m.lng, 0) / markers.length,
      ];

      const map = L.map(mapRef.current).setView(defaultCenter, zoom);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      markers.forEach((m) => {
        const color = COLOR_HEX[m.color ?? "primary"];
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const popup = `
          <div style="min-width:150px;font-family:system-ui,sans-serif">
            <p style="font-weight:600;margin:0 0 4px">${m.title}</p>
            ${m.subtitle ? `<p style="font-size:12px;color:#666;margin:0 0 6px">${m.subtitle}</p>` : ""}
            ${m.link ? `<a href="${m.link}" style="font-size:12px;color:${color}">Detayları gör →</a>` : ""}
          </div>
        `;

        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup);
      });
    };

    void load();

    return () => {
      if (mapInstanceRef.current) {
        // @ts-expect-error — leaflet instance
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, center, zoom]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className={`w-full rounded-xl border border-border ${className}`}
    />
  );
}
