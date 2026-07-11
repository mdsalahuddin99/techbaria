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
        <FormItem>
          <FormLabel>Condition</FormLabel>
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
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="sku" render={({ field }) => (
        <FormItem>
          <FormLabel>SKU</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="minStock" render={({ field }) => (
        <FormItem>
          <FormLabel>Min Stock Alert</FormLabel>
          <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="description" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <FormLabel>Description</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs flex items-center gap-1"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-purple-500" />
              )}
              Generate with AI
            </Button>
          </div>
          <FormControl>
            <Textarea
              placeholder="Enter long product description here..."
              className="min-h-[100px]"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="shortDescription" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Short Description</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter a brief preview (max 300 chars)..."
              {...field}
            />
          </FormControl>
          <p className="text-[11px] text-muted-foreground mt-1">
            Used for storefront card preview. Max 300 characters.
          </p>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}
