"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Customer } from "@/shared/lib/types";
import { customerSchema, CustomerFormValues } from "./schemas";
import { useCreateCustomer, useUpdateCustomer } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Customer | null;
}

const defaults: CustomerFormValues = {
  name: "", phone: "", email: "", group: "Regular", referencePerson: "", address: "", notes: "",
};

export function CustomerFormDialog({ open, onOpenChange, editing }: Props) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const form = useForm<CustomerFormValues, unknown, CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        phone: editing.phone || "—",
        email: editing.email ?? "",
        group: editing.group,
        referencePerson: editing.referencePerson ?? "",
        address: editing.address ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      form.reset(defaults);
    }
  }, [open, editing, form]);

  const onSubmit = async (values: CustomerFormValues) => {
    const payload = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      group: values.group,
      referencePerson: values.referencePerson || undefined,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{editing ? "Edit" : "Add"} Customer</DialogTitle>
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

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Address</FormLabel>
                  <div className="flex-1 min-w-0">
                    <FormControl><Input {...field} /></FormControl>
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
            
            <FormField control={form.control} name="group" render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <FormLabel className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Group</FormLabel>
                  <div className="flex-1 min-w-0">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Wholesale">Wholesale</SelectItem>
                        <SelectItem value="Technician">Technician</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Additional customer notes..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
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
                {editing ? "Save Changes" : "Add Customer"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
