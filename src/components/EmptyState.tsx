import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: string | LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const Icon = typeof icon === "string" ? null : icon;
  return (
    <div className="text-center py-16">
      {Icon ? (
        <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-primary/70" />
        </div>
      ) : (
        <div className="text-5xl mb-4">{icon as string}</div>
      )}
      <p className="font-bold text-foreground text-lg">{title}</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4 rounded-xl" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
