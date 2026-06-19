import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Branch } from "@/features/branches/types";
import {
  useActiveBranchId,
  useBranchActions,
  useBranches,
} from "@/features/branches/hooks";
import BranchFormDialog from "@/features/branches/BranchFormDialog";

export default function BranchesTab() {
  const branches = useBranches();
  const activeId = useActiveBranchId();
  const { deleteBranch, setActiveBranch } = useBranchActions();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Branch | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirmDel) return;
    deleteBranch(confirmDel);
    toast.success("Branch deleted");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium leading-tight">Branches / Outlets</p>
            <p className="text-xs text-muted-foreground">
              Manage multiple shop locations. The active branch controls POS, sales, and stock views.
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEdit(null); setOpen(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" /> New Branch
        </Button>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.name}</span>
                    {b.isHeadOffice && (
                      <Badge variant="secondary" className="text-[10px]">HQ</Badge>
                    )}
                    {b.id === activeId && (
                      <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/15">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Active
                      </Badge>
                    )}
                  </div>
                  {b.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">{b.address}</p>
                  )}
                </TableCell>
                <TableCell><code className="text-xs">{b.code}</code></TableCell>
                <TableCell className="text-sm">{b.phone || "—"}</TableCell>
                <TableCell>
                  {b.isActive ? (
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {b.id !== activeId && b.isActive && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setActiveBranch(b.id); toast.success(`Switched to ${b.name}`); }}
                      >
                        Switch
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { setEdit(b); setOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      disabled={b.isHeadOffice}
                      onClick={() => setConfirmDel(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <BranchFormDialog open={open} onOpenChange={setOpen} branch={edit} />

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this branch?</AlertDialogTitle>
            <AlertDialogDescription>
              The branch will be removed. Existing sales and stock records will keep their
              original branch reference. Head Office cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
