import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../../schemas";
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
          <FormLabel>Description</FormLabel>
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
