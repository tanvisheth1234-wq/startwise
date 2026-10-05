import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-white/70 p-6 text-center", className)}>
      {icon && <div className="text-coral">{icon}</div>}
      <p className="font-semibold text-forest">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
