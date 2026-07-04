import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { LevelProgress } from "@/lib/auth";

type Props = {
  levelProgress: LevelProgress;
  compact?: boolean;
};

/** Kullanıcının seviye/puan durumunu gösteren kart. Profil sayfalarında kullanılır. */
export function LevelCard({ levelProgress, compact = false }: Props) {
  const { level, points, maxLevel, nextLevelPoints, pointsToNextLevel, progress } = levelProgress;
  const isMax = level >= maxLevel;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Trophy className="h-3 w-3" />
          Seviye {level}
        </span>
        <span className="text-xs text-muted">{points} puan</span>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Seviye {level}</p>
            <p className="text-xs text-muted">{points} puan{isMax ? " · en yüksek seviye" : ""}</p>
          </div>
        </div>
        {!isMax && (
          <p className="text-right text-xs text-muted">
            <span className="font-medium text-text">{pointsToNextLevel}</span> puan
            <br />
            sonraki seviyeye
          </p>
        )}
      </div>
      {!isMax && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {!isMax && nextLevelPoints !== null && (
        <p className="mt-1.5 text-right text-[11px] text-muted">
          {points} / {nextLevelPoints}
        </p>
      )}
    </Card>
  );
}
