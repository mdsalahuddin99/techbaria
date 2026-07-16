"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";
import { createCategory, updateCategory as updateCategoryApi, listCategories } from "@/shared/api-client/categories";
import type { CategoryItem } from "@/shared/api-client/categories";
import { useQuery } from "@tanstack/react-query";
import ImageUpload from "@/components/ImageUpload";

const ROOT_VALUE = "__root__";

export type CategoryDialogMode = "main" | "sub" | "edit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CategoryDialogMode;
  parentName?: string;
  editingCategory?: CategoryItem | null;
  onCreated?: (name: string) => void;
}

export function CategoryFormDialog({
  open, onOpenChange, mode, parentName, editingCategory, onCreated,
}: Props) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<CategoryItem[]>,
    enabled: open,
  });

  const isParent = (c: CategoryItem) => !c.parentId || c.parentId === c.id;
  const parents = useMemo(() => categories.filter(isParent), [categories]);

  // ── Form state ──────────────────────────────────────────────────────
  const [parentId, setParentId] = useState<string | null>(null);
  const [mainName, setMainName] = useState("");
  const [subName, setSubName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Reset on open
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && editingCategory) {
      if (editingCategory.parentId) {
        setParentId(editingCategory.parentId);
        setMainName("");
        setSubName(editingCategory.name);
        setImageUrl((editingCategory as any).imageUrl ?? "");
      } else {
        setParentId(null);
        setMainName(editingCategory.name);
        setSubName("");
        setImageUrl((editingCategory as any).imageUrl ?? "");
      }
      return;
    }

    if (mode === "sub" && parentName) {
      const match = parents.find((p) => p.name === parentName);
      setParentId(match?.id ?? null);
      setMainName(match ? "" : parentName);
      setSubName("");
      return;
    }

    setParentId(null);
    setMainName("");
    setSubName("");
    setImageUrl("");
  }, [open, mode, parentName, editingCategory, parents]);

  const createMut = useMutation({
    mutationFn: (data: any) => createCategory(data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategoryApi(id, data),
  });

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = async () => {
    if (mode === "edit" && editingCategory) {
      const newName = (editingCategory.parentId ? subName : mainName).trim();
      if (!newName) return toast.error("Name is required");
      await updateMut.mutateAsync({ id: editingCategory.id, data: { name: newName, imageUrl } });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Updated");
      onCreated?.(newName);
      onOpenChange(false);
      return;
    }

    if (mode === "sub") {
      const trimmed = subName.trim();
      if (!trimmed) return toast.error("Sub-category name is required");
      const duplicate = categories.some((c: any) => c.parentId === parentId && c.name === trimmed);
      if (duplicate) return toast.error("Sub-category already exists");
      await createMut.mutateAsync({ name: trimmed, parentId, imageUrl });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Sub-category "${trimmed}" created`);
      onCreated?.(trimmed);
      onOpenChange(false);
      return;
    }

    // Main mode
    const trimmedMain = mainName.trim();
    if (!trimmedMain) return toast.error("Category name is required");
    const created = await createMut.mutateAsync({ name: trimmedMain, imageUrl });
    if (subName.trim()) {
      await createMut.mutateAsync({ name: subName.trim(), parentId: created.id });
    }
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    toast.success(`Category "${trimmedMain}" created${subName.trim() ? ` with sub "${subName.trim()}"` : ""}`);
    onCreated?.(trimmedMain);
    onOpenChange(false);
  };

  const isEditMode = mode === "edit";
  const isSubMode = mode === "sub";

  const dialogTitle = isEditMode
    ? `Edit ${editingCategory?.parentId ? "Sub-category" : "Category"}`
    : isSubMode
    ? "Add Sub-category"
    : "Add Category";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Fill in the category name and parent (if sub-category).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isEditMode ? (
            <>
              {editingCategory?.parentId && (
                <div className="flex flex-row items-center gap-3">
                  <Label className="w-[140px] shrink-0 text-right">Parent Category</Label>
                  <div className="flex-1 min-w-0">
                    <Input value={parents.find((p) => p.id === editingCategory.parentId)?.name ?? ""} disabled />
                  </div>
                </div>
              )}
              <div className="flex flex-row items-center gap-3">
                <Label className="w-[140px] shrink-0 text-right">{editingCategory?.parentId ? "Sub Category Name" : "Category Name"}<span className="text-destructive"> *</span></Label>
                <div className="flex-1 min-w-0">
                  <Input value={editingCategory?.parentId ? subName : mainName}
                    onChange={(e) => editingCategory?.parentId ? setSubName(e.target.value) : setMainName(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-row items-start gap-3">
                <Label className="w-[140px] shrink-0 text-right mt-2">Image (Optional)</Label>
                <div className="flex-1 min-w-0">
                  <ImageUpload
                    value={imageUrl || undefined}
                    onChange={(url) => setImageUrl(url ?? "")}
                    allowDataUrlFallback
                  />
                </div>
              </div>
            </>
          ) : isSubMode ? (
            <>
              <div className="flex flex-row items-center gap-3">
                <Label className="w-[140px] shrink-0 text-right">Parent Category</Label>
                <div className="flex-1 min-w-0">
                  <Input value={parentName ?? parents.find((p) => p.id === parentId)?.name ?? ""} disabled />
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <Label className="w-[140px] shrink-0 text-right">Sub Category Name <span className="text-destructive">*</span></Label>
                <div className="flex-1 min-w-0">
                  <Input value={subName} onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Smart TV / 4K LED" autoFocus />
                </div>
              </div>
              <div className="flex flex-row items-start gap-3">
                <Label className="w-[140px] shrink-0 text-right mt-2">Image (Optional)</Label>
                <div className="flex-1 min-w-0">
                  <ImageUpload
                    value={imageUrl || undefined}
                    onChange={(url) => setImageUrl(url ?? "")}
                    allowDataUrlFallback
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-row items-start gap-3">
                <Label className="w-[140px] shrink-0 text-right mt-2">Category</Label>
                <div className="flex-1 min-w-0">
                  <Select value={parentId ?? ROOT_VALUE} onValueChange={(v) => {
                    if (v === ROOT_VALUE) { setParentId(null); setMainName(""); }
                    else { setParentId(v); setMainName(parents.find((p) => p.id === v)?.name ?? ""); }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select or create new" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT_VALUE}>+ Create new category</SelectItem>
                      {parents.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {!parentId && (
                    <Input className="mt-2" placeholder="New category name" value={mainName}
                      onChange={(e) => setMainName(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <Label className="w-[140px] shrink-0 text-right">Sub Category Name</Label>
                <div className="flex-1 min-w-0">
                  <Input value={subName} onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Smart TV" />
                </div>
              </div>
              <div className="flex flex-row items-start gap-3">
                <Label className="w-[140px] shrink-0 text-right mt-2">Image (Optional)</Label>
                <div className="flex-1 min-w-0">
                  <ImageUpload
                    value={imageUrl || undefined}
                    onChange={(url) => setImageUrl(url ?? "")}
                    allowDataUrlFallback
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} loading={saving}>Save</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
