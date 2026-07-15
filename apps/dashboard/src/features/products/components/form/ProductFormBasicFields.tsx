import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../../schemas";
import { Button } from "@/shared/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateProductDescriptionAction } from "@/server/actions/ai";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";

interface Props {
  form: UseFormReturn<ProductFormValues>;
}

export function ProductFormBasicFields({ form }: Props) {
  const { control } = form;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = async () => {
    const name = form.getValues("name");
    if (!name || name.trim() === "") {
      toast.error("Please enter a product name first");
      return;
    }
    
    setIsGenerating(true);
    try {
      const description = await generateProductDescriptionAction(name);
      form.setValue("description", description, { shouldValidate: true, shouldDirty: true });
      toast.success("Description generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <FormField control={control} name="condition" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Condition</FormLabel>
            <div className="flex-1 min-w-0">
              <Select value={field.value || "New"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />

      <FormField control={control} name="sku" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">SKU</FormLabel>
            <div className="flex-1 min-w-0">
              <FormControl><Input {...field} /></FormControl>
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />

      <FormField control={control} name="minStock" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Min Stock Alert</FormLabel>
            <div className="flex-1 min-w-0">
              <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />

      <FormField control={control} name="description" render={({ field }) => (
        <FormItem className="sm:col-span-2 space-y-1">
          <div className="flex flex-row items-start gap-2">
            <div className="w-[110px] shrink-0 text-right flex flex-col items-end gap-2 pt-2">
              <FormLabel>Description</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] flex items-center gap-1"
                onClick={handleGenerateAI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-purple-500" />
                )}
                AI
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <FormControl>
                <Textarea
                  placeholder="Enter long product description here..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />

    </>
  );
}
