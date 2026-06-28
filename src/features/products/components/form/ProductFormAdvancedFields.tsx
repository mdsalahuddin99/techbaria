import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../../schemas";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { useDistinctValues } from "../../hooks/useDistinctValues";

interface Props {
  form: UseFormReturn<ProductFormValues>;
}

export function ProductFormAdvancedFields({ form }: Props) {
  const { control } = form;
  
  const colorOptions = useDistinctValues("color");
  const storageOptions = useDistinctValues("storage");
  const ramOptions = useDistinctValues("ram");

  return (
    <>
      <FormField control={control} name="color" render={({ field }) => (
        <FormItem>
          <FormLabel>Color</FormLabel>
          <FormControl>
            <AutoSuggest
              value={field.value ?? ""}
              onValueChange={field.onChange}
              options={colorOptions.map((v) => ({ value: v, label: v }))}
              placeholder="e.g. White / Black"
              allowFreeText
              allowClear
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="storage" render={({ field }) => (
        <FormItem>
          <FormLabel>Storage</FormLabel>
          <FormControl>
            <AutoSuggest
              value={field.value ?? ""}
              onValueChange={field.onChange}
              options={storageOptions.map((v) => ({ value: v, label: v }))}
              placeholder="e.g. 256GB / 1TB"
              allowFreeText
              allowClear
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="ram" render={({ field }) => (
        <FormItem>
          <FormLabel>RAM</FormLabel>
          <FormControl>
            <AutoSuggest
              value={field.value ?? ""}
              onValueChange={field.onChange}
              options={ramOptions.map((v) => ({ value: v, label: v }))}
              placeholder="e.g. 8GB / 16GB"
              allowFreeText
              allowClear
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="warrantyMonths" render={({ field }) => (
        <FormItem>
          <FormLabel>Warranty (months)</FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder="e.g. 12, 24"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="warrantyStartDate" render={({ field }) => (
        <FormItem>
          <FormLabel>Warranty Start Date</FormLabel>
          <FormControl>
            <Input
              type="date"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}
