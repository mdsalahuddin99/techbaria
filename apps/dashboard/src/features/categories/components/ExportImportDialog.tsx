"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import Papa from "papaparse";
import { bulkImportCategoriesAction, bulkImportCatalogAction } from "@/server/actions/bulkActions";

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  type: string; // "categories" | "brands" | "products" | "models" | "series"
  onImported: () => void;
}

export function ExportImportDialog({ open, onOpenChange, type, onImported }: ExportImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const getTitle = () => {
    switch (type) {
      case "categories": return "Import Categories";
      case "brands": return "Import Brands";
      case "products": return "Import Product Names";
      case "models": return "Import Models";
      case "series": return "Import Series";
      default: return "Import";
    }
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    if (type === "categories") {
      headers = ["Name", "Parent Category Name", "Is Published"];
    } else {
      headers = ["Name", "Is Published"];
    }
    
    const csv = Papa.unparse({ fields: headers, data: [] });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${type}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      // Generate preview
      Papa.parse(selected, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 5)); // preview first 5 rows
        },
      });
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file) return toast.error("Please select a file first");
    
    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          if (data.length === 0) {
            toast.error("File is empty");
            setLoading(false);
            return;
          }
          
          if (data.length > 5) {
            toast.error("আপনি একবারে সর্বোচ্চ ৫টি আইটেম আপলোড করতে পারবেন। (Maximum 5 items allowed at a time)");
            setLoading(false);
            return;
          }

          let res;
          if (type === "categories") {
            const payload = data.map(row => ({
              name: row.Name || row.name,
              parentName: row["Parent Category Name"] || row.parentCategoryName || "",
              isPublished: row["Is Published"]?.toLowerCase() !== "no" && row["Is Published"]?.toLowerCase() !== "false",
            })).filter(row => row.name);
            
            res = await bulkImportCategoriesAction(payload);
          } else {
            const payload = data.map(row => row.Name || row.name).filter(Boolean);
            res = await bulkImportCatalogAction(type, payload);
          }

          if (res?.success) {
            toast.success(`Successfully imported ${res.count} items!`);
            onImported();
            onOpenChange(false);
            setFile(null);
            setPreview(null);
          } else {
            toast.error(res?.error || "Failed to import");
          }
        } catch (err: any) {
          toast.error(err.message || "An error occurred");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        toast.error("Failed to parse CSV file: " + err.message);
        setLoading(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import data. You can download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {type === "categories" ? (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md text-sm border border-blue-100 dark:border-blue-900 text-foreground/80 text-left">
              <strong className="block mb-1 text-blue-600 dark:text-blue-400">কীভাবে পূরণ করবেন?</strong>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li><b>Name:</b> ক্যাটাগরির নাম (যেমন: Electronics)</li>
                <li><b>Parent Category Name:</b> এটি যদি অন্য কোনো ক্যাটাগরির অধীনে থাকে, তবে তার নাম। প্রধান ক্যাটাগরি হলে ফাঁকা রাখুন।</li>
                <li><b>Is Published:</b> সাথে সাথে পাবলিশ করতে চাইলে Yes, হাইড রাখতে চাইলে No লিখুন।</li>
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md text-sm border border-blue-100 dark:border-blue-900 text-foreground/80 text-left">
              <strong className="block mb-1 text-blue-600 dark:text-blue-400">কীভাবে পূরণ করবেন?</strong>
              <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                <li><b>Name:</b> {
                  type === 'brands' ? 'ব্র্যান্ডের নাম (যেমন: Apple, Samsung)' :
                  type === 'products' ? 'প্রোডাক্টের নাম (যেমন: Smartphone, Laptop)' :
                  type === 'models' ? 'মডেলের নাম (যেমন: iPhone 14 Pro)' :
                  type === 'series' ? 'সিরিজের নাম (যেমন: Galaxy S Series)' : 'নাম লিখুন'
                }</li>
                <li><b>Is Published:</b> সাথে সাথে পাবলিশ করতে চাইলে Yes, হাইড রাখতে চাইলে No লিখুন।</li>
              </ul>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ দ্রষ্টব্য: ইম্পোর্ট করার পর অনুগ্রহ করে এডিট (✏️) বাটনে ক্লিক করে সংশ্লিষ্ট ব্র্যান্ড, মডেল বা সিরিজের মূল রিলেশনটি লিংক করে দিন।</p>
            </div>
          )}
          <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
            <span className="text-sm font-medium">Need the format? (Max 5 rows)</span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Select CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileChange} />
          </div>

          {preview && preview.length > 0 && (
            <div className="bg-secondary/20 p-3 rounded-md overflow-x-auto">
              <Label className="mb-2 block">Data Preview (First {preview.length} rows)</Label>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    {Object.keys(preview[0]).map(key => (
                      <th key={key} className="py-1 pr-2 whitespace-nowrap">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-secondary/20 last:border-0">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="py-1 pr-2 truncate max-w-[150px]">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton onClick={handleImport} loading={loading} disabled={!file}>
            Import Data
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
