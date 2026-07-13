"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { FolderTree, Pencil, Trash2, Search, Download, Upload, Plus, ChevronRight, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { EmptyState } from "@/shared/components";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { CategoryFormDialog } from "@/features/categories/components/CategoryFormDialog";

interface CategoriesTabProps {
  initialCategories: any[];
  filterOnlineOnly?: boolean;
  onOpenImport: (type: string) => void;
}

export function CategoriesTab({ initialCategories, filterOnlineOnly = false, onOpenImport }: CategoriesTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialCategories,
  });

  const filteredCategories = categories.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parents = filteredCategories.filter((c: any) => !c.parentId);
  const childrenOf = (parentId: string) => filteredCategories.filter((c: any) => c.parentId === parentId);

  // States for Dialogs
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mutations
  const toggleCategoryPublishMut = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Updated visibility");
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteId(null);
      toast.success("Category deleted");
    },
    onError: () => toast.error("Could not delete"),
  });

  const openNew = (parentId: string | null = null) => {
    setEditing(null);
    setDialogParentId(parentId);
    setOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setDialogParentId(null);
    setOpen(true);
  };

  const handleExport = () => {
    const exportData = categories.map((item: any) => ({
      ID: item.id,
      Name: item.name,
      "Parent ID": item.parentId || "",
      "Is Published": item.isPublished ? "Yes" : "No"
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `categories_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Categories</p>
            <p className="text-2xl font-bold">{parents.length}</p>
          </div>
        </div>
        
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!filterOnlineOnly && (
            <>
              <Button variant="outline" size="icon" title="Export Categories" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Import Categories" onClick={() => onOpenImport("categories")}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => openNew(null)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="divide-y">
          {parents.map((c) => {
            const kids = childrenOf(c.id);
            const isOpen = expanded[c.id] ?? false;
            return (
              <Collapsible
                key={c.id}
                open={isOpen}
                onOpenChange={(o) => setExpanded((s) => ({ ...s, [c.id]: o }))}
              >
                <div className="flex items-center gap-1.5 p-2 sm:p-3 hover:bg-secondary/40">
                  <CollapsibleTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" disabled={kids.length === 0}>
                      <ChevronRight className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${isOpen ? "rotate-90" : ""} ${kids.length === 0 ? "opacity-30" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {kids.length} sub · {c.productCount} products
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden md:inline-flex shrink-0 text-xs">{c.productCount} products</Badge>
                  {!filterOnlineOnly && (
                    <>
                      <div className="flex items-center gap-2 px-1 sm:px-2">
                        <Switch
                          checked={c.isPublished}
                          onCheckedChange={(val) => toggleCategoryPublishMut.mutate({ id: c.id, isPublished: val })}
                          className="scale-75 sm:scale-100"
                        />
                        <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" className="h-7 sm:h-9 px-2 sm:px-3 text-[10px] sm:text-sm" onClick={() => openNew(c.id)}>
                          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" /><span className="hidden sm:inline">Sub</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-9 sm:w-9" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-9 sm:w-9 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <CollapsibleContent>
                  {kids.length > 0 && (
                    <div className="bg-muted/30">
                      {kids.map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5 pl-6 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border-t">
                          <CornerDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                          <p className="flex-1 min-w-0 truncate text-xs sm:text-sm">{s.name}</p>
                          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 py-0">{s.productCount}</Badge>
                          {!filterOnlineOnly && (
                            <>
                              <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-l ml-1 sm:ml-2">
                                <Switch
                                  checked={s.isPublished}
                                  onCheckedChange={(val) => toggleCategoryPublishMut.mutate({ id: s.id, isPublished: val })}
                                  className="scale-75 sm:scale-100"
                                />
                                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Web</span>
                              </div>
                              <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" onClick={() => openEdit(s)}>
                                <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 text-destructive" onClick={() => setDeleteId(s.id)}>
                                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {parents.length === 0 && (
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Add your first category to start organizing products."
            />
          )}
        </div>
      </Card>

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={editing ? "edit" : dialogParentId ? "sub" : "main"}
        editingCategory={editing}
        parentName={dialogParentId ? parents.find((p) => p.id === dialogParentId)?.name : editing?.parentId ? parents.find((p) => p.id === editing.parentId)?.name : undefined}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          if (dialogParentId) {
            setExpanded((s) => ({ ...s, [dialogParentId]: true }));
          }
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>All sub-categories under it will also be removed. Products keep their existing label.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
