import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4 animate-float">{icon}</div>
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