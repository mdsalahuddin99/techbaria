"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ExportImportDialog } from "@/features/categories/components/ExportImportDialog";
import { useQueryClient } from "@tanstack/react-query";

// Import extracted tab components
import { CategoriesTab } from "@/features/categories/components/tabs/CategoriesTab";
import { BrandsTab } from "@/features/categories/components/tabs/BrandsTab";
import { ProductsTab } from "@/features/categories/components/tabs/ProductsTab";
import { ModelsTab } from "@/features/categories/components/tabs/ModelsTab";
import { SeriesTab } from "@/features/categories/components/tabs/SeriesTab";
import { ColorsTab } from "@/features/categories/components/tabs/ColorsTab";
import { StorageTab } from "@/features/categories/components/tabs/StorageTab";
import { RamTab } from "@/features/categories/components/tabs/RamTab";

export function CategoriesClient({
  initialCategories = [],
  initialBrands = [],
  initialProducts = [],
  initialModels = [],
  initialSeries = [],
  initialColors = [],
  initialStorage = [],
  initialRam = [],
  filterOnlineOnly = false
}: any) {
  const queryClient = useQueryClient();

  // State for Import Dialog (Shared across tabs)
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<"categories" | "brands" | "products" | "models" | "series" | "colors" | "storage" | "ram">("categories");

  const handleOpenImport = (type: any) => {
    setImportType(type);
    setImportOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="products">Product Names</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="ram">RAM</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesTab initialCategories={initialCategories} filterOnlineOnly={filterOnlineOnly} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="brands">
          <BrandsTab initialBrands={initialBrands} filterOnlineOnly={filterOnlineOnly} categories={initialCategories} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab initialProducts={initialProducts} filterOnlineOnly={filterOnlineOnly} brands={initialBrands} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="models">
          <ModelsTab initialModels={initialModels} filterOnlineOnly={filterOnlineOnly} products={initialProducts} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="series">
          <SeriesTab initialSeries={initialSeries} filterOnlineOnly={filterOnlineOnly} models={initialModels} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="colors">
          <ColorsTab initialColors={initialColors} filterOnlineOnly={filterOnlineOnly} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="storage">
          <StorageTab initialStorage={initialStorage} filterOnlineOnly={filterOnlineOnly} onOpenImport={handleOpenImport} />
        </TabsContent>

        <TabsContent value="ram">
          <RamTab initialRam={initialRam} filterOnlineOnly={filterOnlineOnly} onOpenImport={handleOpenImport} />
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
