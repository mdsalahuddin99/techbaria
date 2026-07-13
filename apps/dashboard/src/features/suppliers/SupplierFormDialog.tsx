import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Supplier } from "@/shared/lib/types";
import { supplierSchema, SupplierFormValues } from "./schemas";
import { useCreateSupplier, useUpdateSupplier } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Supplier | null;
}

const defaults: SupplierFormValues = {
  name: "", contactPerson: "", phone: "", email: "", address: "", notes: "",
};

export function SupplierFormDialog({ open, onOpenChange, editing }: Props) {
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  const form = useForm<SupplierFormValues, unknown, SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        contactPerson: editing.contactPerson ?? "",
        phone: editing.phone,
        email: editing.email ?? "",
        address: editing.address ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      form.reset(defaults);
    }
  }, [open, editing, form]);

  const onSubmit = async (values: SupplierFormValues) => {
    const payload = {
      name: values.name,
      contactPerson: values.contactPerson || undefined,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{editing ? "Edit" : "Add"} Supplier</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-2 sm:px-8">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Name <span className="text-destructive">*</span></FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input {...field} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="contactPerson" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Contact Person</FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Phone <span className="text-destructive">*</span></FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input type="tel" {...field} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Email</FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Address</FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 pt-2 font-medium">Notes</FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                  </div>
                </div>
                <FormMessage className="sm:ml-[132px]" />
              </FormItem>
            )} />
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <LoadingButton type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" loading={submitting}>
                {editing ? "Save Changes" : "Add Supplier"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
