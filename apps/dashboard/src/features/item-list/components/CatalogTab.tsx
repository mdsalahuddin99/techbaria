"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, SearchIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";

type EntityType = "brands" | "products" | "models" | "series";

interface CatalogTabProps {
  entity: EntityType;
  title: string;
  leftAddon?: React.ReactNode;
}

export function CatalogTab({ entity, title, leftAddon }: CatalogTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["catalog", entity, searchQuery],
    queryFn: async () => {
      const url = new URL(window.location.origin + "/api/catalog");
      url.searchParams.set("entity", entity);
      if (searchQuery) url.searchParams.set("search", searchQuery);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const saveMut = useMutation({
    mutationFn: async (data: { id?: string; name: string }) => {
      const url = "/api/catalog";
      const method = data.id ? "PUT" : "POST";
      const body = { entity, ...data };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", entity] });
      setFormOpen(false);
      toast.success(`${title} saved successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const url = new URL(window.location.origin + "/api/catalog");
      url.searchParams.set("entity", entity);
      url.searchParams.set("id", id);
      const res = await fetch(url.toString(), { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", entity] });
      setDeleteId(null);
      toast.success(`${title} deleted successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setNameInput(item.name);
    } else {
      setEditingItem(null);
      setNameInput("");
    }
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return toast.error("Name is required");
    saveMut.mutate({ id: editingItem?.id, name: nameInput.trim() });
  };

  const isFilterEmpty = !searchQuery.trim();
  const displayedItems = isFilterEmpty ? items.slice(0, 5) : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {leftAddon}
          
          <div className="flex items-center gap-2 border-l pl-4 sm:pl-6 border-gray-200">
            <div>
              <h2 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total {title}</h2>
              <p className="text-xl font-bold text-gray-900 leading-none mt-1">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-[240px]">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${title}...`}
              className="pl-8 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isFilterEmpty && (
            <div className="flex-1 sm:flex-none min-w-[240px] flex items-center bg-blue-50/80 border border-blue-100 rounded-md px-3 h-10 text-xs text-blue-700 font-medium">
              <span className="truncate" title="সর্বশেষ ৫টি ডেটা দেখানো হচ্ছে। নির্দিষ্ট ডেটা খুঁজে পেতে সার্চ করুন।">
                সর্বশেষ ৫টি ডেটা দেখানো হচ্ছে। নির্দিষ্ট ডেটা খুঁজে পেতে সার্চ করুন।
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && displayedItems.map((item: any) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenForm(item)}
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-gray-500">
                    No {title.toLowerCase()} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={`Enter ${title.toLowerCase()} name...`}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {title.toLowerCase()}. If it is linked to any products or item lists, they may be affected or the deletion might fail due to database constraints.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
