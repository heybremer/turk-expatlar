"use client";

import { useState } from "react";
import { BarChart3, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percent: number;
  userVoted: boolean;
}

interface Poll {
  id: string;
  question: string;
  totalVotes: number;
  endsAt?: string | null;
  userVotedOptionId?: string | null;
  options: PollOption[];
}

interface ForumPollProps {
  topicId: string;
  initialPoll: Poll | null;
}

export function ForumPoll({ topicId, initialPoll }: ForumPollProps) {
  const { token } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(initialPoll);
  const [voting, setVoting] = useState(false);

  if (!poll) return null;

  const isEnded = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
  const hasVoted = !!poll.userVotedOptionId;

  async function vote(optionId: string) {
    if (!token || voting || isEnded || hasVoted) return;
    setVoting(true);
    try {
      const res = await fetch(`${API_URL}/api/forum/polls/${optionId}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json() as Poll;
        setPoll(updated);
      }
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <BarChart3 className="h-4 w-4 text-primary" />
        {poll.question}
      </div>

      <ul className="mt-3 space-y-2">
        {poll.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => vote(option.id)}
              disabled={hasVoted || isEnded || voting}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border text-left transition-all",
                hasVoted || isEnded
                  ? "cursor-default border-border"
                  : "cursor-pointer border-border hover:border-primary",
                option.userVoted && "border-primary",
              )}
            >
              {/* Progress bar */}
              {(hasVoted || isEnded) && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-700",
                    option.userVoted ? "bg-primary/20" : "bg-border/50",
                  )}
                  style={{ width: `${option.percent}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  {option.userVoted && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  {option.text}
                </span>
                {(hasVoted || isEnded) && (
                  <span className="text-xs font-medium text-muted">
                    {option.percent}%
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span>{poll.totalVotes} oy</span>
        {poll.endsAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isEnded
              ? "Sona erdi"
              : `${new Date(poll.endsAt).toLocaleDateString("tr-TR")} tarihine kadar`}
          </span>
        )}
        {!hasVoted && !isEnded && token && (
          <span className="text-primary">Oy ver →</span>
        )}
      </div>
    </div>
  );
}
