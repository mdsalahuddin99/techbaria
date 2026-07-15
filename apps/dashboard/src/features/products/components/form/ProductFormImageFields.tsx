import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../../schemas";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/shared/ui/form";
import { cn } from "@/shared/lib/utils";
import ImageUpload from "@/components/ImageUpload";

const EMOJIS = ["📦", "📱", "💻", "🖥️", "🎧", "⌚", "🔌", "📷", "🛰️", "🧰"];

interface Props {
  form: UseFormReturn<ProductFormValues>;
}

export function ProductFormImageFields({ form }: Props) {
  const { control } = form;

  return (
    <>
      <FormField control={control} name="imageUrl" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Feature Image</FormLabel>
          <div className="flex gap-4 items-center">
            <FormControl>
              <ImageUpload
                value={field.value || undefined}
                onChange={(url) => field.onChange(url ?? "")}
                fallbackEmoji="📷"
                size="sm"
                allowDataUrlFallback
              />
            </FormControl>
            <FormField control={control} name="emoji" render={({ field: emojiField }) => (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Icon (fallback)</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => emojiField.onChange(e)}
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-md border text-lg flex items-center justify-center transition-colors",
                        emojiField.value === e
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:bg-muted"
                      )}
                      title={e}
                    >{e}</button>
                  ))}
                </div>
              </div>
            )} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Upload to Cloudinary — if no image, the selected emoji will show as fallback.
          </p>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="galleryImages" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Gallery Images (Optional, for E-commerce)</FormLabel>
          <FormControl>
            <div className="flex flex-wrap gap-4">
              {field.value?.map((url, index) => (
                <ImageUpload
                  key={index}
                  value={url}
                  onChange={(newUrl) => {
                    if (!newUrl) {
                      field.onChange(field.value?.filter((_, i) => i !== index));
                    } else {
                      const newArr = [...(field.value || [])];
                      newArr[index] = newUrl;
                      field.onChange(newArr);
                    }
                  }}
                  fallbackEmoji="🖼️"
                  size="sm"
                  allowDataUrlFallback
                />
              ))}
              {(field.value?.length || 0) < 5 && (
                <ImageUpload
                  value={undefined}
                  onChange={(newUrl) => {
                    if (newUrl) {
                      field.onChange([...(field.value || []), newUrl]);
                    }
                  }}
                  fallbackEmoji="➕"
                  size="sm"
                  allowDataUrlFallback
                />
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}
