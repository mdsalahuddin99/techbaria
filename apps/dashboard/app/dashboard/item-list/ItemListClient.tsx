"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ItemFormDialog } from "@/features/item-list/components/ItemFormDialog";
import { CatalogTab } from "@/features/item-list/components/CatalogTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ItemListClient({ initialCategories, initialItemLists }: any) {
  const [formOpen, setFormOpen] = useState(false);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setFormOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catalog Management</h1>
          <p className="text-sm text-gray-500">Manage brands, models, and series</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Linkup
        </Button>
      </div>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="bg-white border border-gray-100 p-1 mb-4 h-auto flex-wrap justify-start">
          <TabsTrigger value="brands" className="px-4 py-2">Brands</TabsTrigger>
          <TabsTrigger value="products" className="px-4 py-2">Product Names</TabsTrigger>
          <TabsTrigger value="models" className="px-4 py-2">Models</TabsTrigger>
          <TabsTrigger value="series" className="px-4 py-2">Series</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="m-0">
          <CatalogTab entity="brands" title="Brands" />
        </TabsContent>

        <TabsContent value="products" className="m-0">
          <CatalogTab entity="products" title="Product Names" />
        </TabsContent>

        <TabsContent value="models" className="m-0">
          <CatalogTab entity="models" title="Models" />
        </TabsContent>

        <TabsContent value="series" className="m-0">
          <CatalogTab entity="series" title="Series" />
        </TabsContent>
      </Tabs>

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={null}
        categories={initialCategories}
      />
    </div>
  );
}
