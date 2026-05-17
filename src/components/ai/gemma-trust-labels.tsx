import { Badge } from "@/components/ui/badge";

type Props = {
  advisory?: boolean;
  requiresApproval?: boolean;
  blocked?: boolean;
  stale?: boolean;
  offline?: boolean;
};

export function GemmaTrustLabels({
  advisory = true,
  requiresApproval,
  blocked,
  stale,
  offline
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {advisory ? <Badge className="border-primary/40 bg-primary/10 text-primary">Advisory</Badge> : null}
      {requiresApproval ? <Badge className="border-secondary/40 bg-secondary/10 text-yellow-200">Requires approval</Badge> : null}
      {blocked ? <Badge className="border-danger/40 bg-danger/10 text-red-200">Blocked</Badge> : null}
      {stale ? <Badge className="border-secondary/40 bg-secondary/10 text-yellow-200">Stale data warning</Badge> : null}
      {offline ? <Badge>Offline mode</Badge> : null}
    </div>
  );
}
