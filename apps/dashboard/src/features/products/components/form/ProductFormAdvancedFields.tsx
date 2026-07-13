import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../../schemas";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { useQuery } from "@tanstack/react-query";

interface Props {
  form: UseFormReturn<ProductFormValues>;
}

export function ProductFormAdvancedFields({ form }: Props) {
  const { control } = form;
  
  const { data: colorData = [] } = useQuery({
    queryKey: ["catalog", "colors"],
    queryFn: async () => {
      const res = await fetch("/api/catalog?entity=colors");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: storageData = [] } = useQuery({
    queryKey: ["catalog", "storage"],
    queryFn: async () => {
      const res = await fetch("/api/catalog?entity=storage");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: ramData = [] } = useQuery({
    queryKey: ["catalog", "ram"],
    queryFn: async () => {
      const res = await fetch("/api/catalog?entity=ram");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const colorOptions = colorData.map((x: any) => x.name);
  const storageOptions = storageData.map((x: any) => x.name);
  const ramOptions = ramData.map((x: any) => x.name);

  return (
    <>
      <FormField control={control} name="color" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Color</FormLabel>
            <div className="flex-1 min-w-0">
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
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />
      <FormField control={control} name="storage" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Storage</FormLabel>
            <div className="flex-1 min-w-0">
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
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />
      <FormField control={control} name="ram" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">RAM</FormLabel>
            <div className="flex-1 min-w-0">
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
            </div>
          </div>
          <FormMessage className="ml-[110px] pl-2" />
        </FormItem>
      )} />


    </>
  );
}
