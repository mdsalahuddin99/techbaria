"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ExportImportDialog } from "@/features/categories/components/ExportImportDialog";
import { useQueryClient } from "@tanstack/react-query";

// Import extracted tab components
import { CategoriesTab } from "@/features/categories/components/tabs/CategoriesTab";

export function CategoriesClient({
  initialCategories = [],

  filterOnlineOnly = false
}: any) {
  const queryClient = useQueryClient();

  // State for Import Dialog (Shared across tabs)
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<"categories">("categories");

  const handleOpenImport = (type: any) => {
    setImportType(type);
    setImportOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesTab initialCategories={initialCategories} filterOnlineOnly={filterOnlineOnly} onOpenImport={handleOpenImport} />
        </TabsContent>
      </Tabs>

      {/* Global Import Dialog */}
      <ExportImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type={importType}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
      />
    </div>
  );
}
