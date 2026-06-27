import { useState, useEffect } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Users, Plus, Shield, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  VIEWER: "Storefront (Viewer)",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  MANAGER: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  CASHIER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  VIEWER: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function StaffTab() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CASHIER" | "ADMIN">("CASHIER");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit role dialog
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [editingRole, setEditingRole] = useState<"CASHIER" | "ADMIN">("CASHIER");
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data.items ?? []);
    } catch {
      toast.error("Could not load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: trimEmail(email), password, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to create user");
      }
      toast.success(`"${name}" created as ${ROLE_LABELS[role]}`);
      setCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("CASHIER");
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${confirmDel}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("User deleted");
      setConfirmDel(null);
      fetchUsers();
    } catch {
      toast.error("Could not delete user");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditRole = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/users?id=${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editingRole }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Role updated to ${ROLE_LABELS[editingRole]}`);
      setEditTarget(null);
      fetchUsers();
    } catch {
      toast.error("Could not update role");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Staff &amp; Team Members</h3>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No staff members yet. Click "Add Staff" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[u.role] ?? ""}>
                        <Shield className="h-3 w-3 mr-1" />
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "default" : "secondary"} className={u.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"}>
                        {u.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {u.role !== "ADMIN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => { setEditTarget(u); setEditingRole(u.role as any); }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Create User Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new user who can access the dashboard. They will receive the permissions of the selected role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Md. Rahim" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="rahim@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="h-10 px-3 rounded-md border bg-background text-sm w-full"
              >
                <option value="CASHIER">Cashier — POS &amp; Sales</option>
                <option value="ADMIN">Manager — Full access except billing</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                <strong>Cashier:</strong> Can create POS sales, view inventory.
                <br />
                <strong>Manager:</strong> Can manage products, purchases, reports.
              </p>
            </div>
            <LoadingButton type="submit" loading={saving} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Create Staff
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update permissions for {editTarget?.name ?? editTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value as any)}
                className="h-10 px-3 rounded-md border bg-background text-sm w-full"
              >
                <option value="CASHIER">Cashier</option>
                <option value="ADMIN">Manager</option>
              </select>
            </div>
            <LoadingButton onClick={handleEditRole} loading={editSaving} className="w-full">
              Update Role
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => { if (!o) setConfirmDel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. They will lose access to the dashboard immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function trimEmail(email: string) {
  return email.trim().toLowerCase();
}
