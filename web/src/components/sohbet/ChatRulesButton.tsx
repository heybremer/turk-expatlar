"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatRulesModal } from "./ChatRulesModal";

type Props = {
  variant?: "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
};

export function ChatRulesButton({ variant = "outline", size = "sm", className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <ScrollText className="mr-1.5 h-4 w-4" />
        Sohbet Kuralları
      </Button>
      <ChatRulesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
