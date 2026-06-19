import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Building2 } from "lucide-react";
import { useActiveBranchId, useBranchActions, useBranches } from "@/features/branches/hooks";

export default function BranchSwitcher() {
  const branches = useBranches();
  const activeId = useActiveBranchId();
  const { setActiveBranch } = useBranchActions();

  const visible = branches.filter((b) => b.isActive);
  if (visible.length <= 1) return null;

  return (
    <Select value={activeId ?? undefined} onValueChange={setActiveBranch}>
      <SelectTrigger className="h-9 w-auto min-w-[140px] gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Branch" />
      </SelectTrigger>
      <SelectContent>
        {visible.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            <span className="font-medium">{b.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{b.code}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
