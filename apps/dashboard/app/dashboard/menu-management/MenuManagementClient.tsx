"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/components";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { updateCategory as updateCategoryApi, type CategoryItem } from "@/shared/api-client/categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { cn } from "@/shared/lib/utils";

interface MenuManagementClientProps {
  initialCategories: CategoryItem[];
}

export function MenuManagementClient({ initialCategories }: MenuManagementClientProps) {
  usePageTitle("Menu Management");
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Group by parent
  const mainCategories = categories.filter(c => !c.parentId).sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0));
  
  const updateCategory = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CategoryItem> }) => {
      return updateCategoryApi(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update category");
    }
  });

  const handleToggle = (id: string, showInMenu: boolean) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, showInMenu } : c));
    updateCategory.mutate({ id, patch: { showInMenu } });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string, parentId: string | null) => {
    e.preventDefault();
    const draggedCategory = categories.find(c => c.id === draggedId);
    if (draggedCategory && draggedCategory.parentId === parentId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, parentId: string | null) => {
    e.preventDefault();
    setDragOverId(null);
    
    if (!draggedId || draggedId === targetId) return;

    const draggedCategory = categories.find(c => c.id === draggedId);
    if (!draggedCategory || draggedCategory.parentId !== parentId) return;

    const siblings = categories
      .filter(c => c.parentId === parentId)
      .sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0));

    const draggedIndex = siblings.findIndex(c => c.id === draggedId);
    const targetIndex = siblings.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newSiblings = [...siblings];
    const [removed] = newSiblings.splice(draggedIndex, 1);
    newSiblings.splice(targetIndex, 0, removed);

    // Update state and API
    const updatedCategories = [...categories];
    newSiblings.forEach((cat, i) => {
      const mainIndex = updatedCategories.findIndex(c => c.id === cat.id);
      if (mainIndex !== -1) {
        updatedCategories[mainIndex] = { ...updatedCategories[mainIndex], menuOrder: i };
      }
      if (cat.menuOrder !== i) {
        updateCategory.mutate({ id: cat.id, patch: { menuOrder: i } });
      }
    });
    
    setCategories(updatedCategories);
    setDraggedId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Management"
        description="Organize how categories appear on the e-commerce storefront navigation menu using drag and drop."
      />

      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
            <div className="col-span-8">Category Name</div>
            <div className="col-span-4 text-right">Show in Menu</div>
          </div>
          
          <div className="space-y-2">
            {mainCategories.map((cat) => {
              const subCats = categories.filter(c => c.parentId === cat.id).sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0));
              const isOpen = expanded[cat.id] ?? false;
              
              return (
                <Collapsible 
                  key={cat.id} 
                  open={isOpen} 
                  onOpenChange={(o) => setExpanded(s => ({ ...s, [cat.id]: o }))}
                  className={cn(
                    "rounded-md transition-all duration-200",
                    draggedId === cat.id ? "opacity-50" : "opacity-100",
                    dragOverId === cat.id ? "border-t-2 border-primary pt-1" : ""
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id, null)}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDrop(e, cat.id, null)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center bg-muted/30 p-2 rounded-md border hover:bg-muted/50 cursor-grab active:cursor-grabbing">
                    <div className="col-span-8 font-medium flex items-center gap-2">
                      <div className="text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      
                      <CollapsibleTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" disabled={subCats.length === 0} onClick={(e) => e.stopPropagation()}>
                          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-90" : "", subCats.length === 0 ? "opacity-30" : "")} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <span>{cat.name}</span>
                      {subCats.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          ({subCats.length} sub)
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={cat.showInMenu !== false} onCheckedChange={(v) => handleToggle(cat.id, v)} />
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    {subCats.length > 0 && (
                      <div className="pl-10 pr-2 py-2 space-y-2 mt-1">
                        {subCats.map((sub) => (
                          <div 
                            key={sub.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, sub.id)}
                            onDragOver={(e) => handleDragOver(e, sub.id, cat.id)}
                            onDragLeave={() => setDragOverId(null)}
                            onDrop={(e) => handleDrop(e, sub.id, cat.id)}
                            onDragEnd={() => {
                              setDraggedId(null);
                              setDragOverId(null);
                            }}
                            className={cn(
                              "grid grid-cols-12 gap-4 items-center p-2 rounded-md border border-dashed hover:bg-muted/30 transition-all cursor-grab active:cursor-grabbing",
                              draggedId === sub.id ? "opacity-50" : "opacity-100",
                              dragOverId === sub.id ? "border-t-2 border-primary border-t-solid pt-1" : ""
                            )}
                          >
                            <div className="col-span-8 text-sm flex items-center gap-2">
                              <div className="text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="text-muted-foreground">↳</span> 
                              <span>{sub.name}</span>
                            </div>
                            
                            <div className="col-span-4 flex justify-end">
                              <Switch checked={sub.showInMenu !== false} onCheckedChange={(v) => handleToggle(sub.id, v)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
