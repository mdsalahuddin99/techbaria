"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useHeroSlides } from "@/features/storefront/hooks/useHeroSlides";
import type { HeroSlideType } from "@/shared/validators/storefront";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import ImageUpload from "@/components/ImageUpload";
import { useForm as useReactHookForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { heroSlideSchema } from "@/shared/validators/storefront";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { z } from "zod";

const formSchema = heroSlideSchema.omit({ id: true, createdAt: true, updatedAt: true });
type FormValues = z.infer<typeof formSchema>;

export function StorefrontSettingsClient() {
  usePageTitle("Storefront Settings");
  const { heroSlides, isLoading, createSlide, updateSlide, deleteSlide, isDeleting } = useHeroSlides();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlideType | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSlide, setDeletingSlide] = useState<HeroSlideType | null>(null);

  const form = useReactHookForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: "",
      highlight: "",
      sub: "",
      cta1: "Shop Now",
      cta1Link: "/shop",
      cta2: "",
      cta2Link: "",
      imgUrl: "",
      gradient: "",
      position: 0,
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingSlide(null);
    form.reset({
      headline: "",
      highlight: "",
      sub: "",
      cta1: "Shop Now",
      cta1Link: "/shop",
      cta2: "",
      cta2Link: "",
      imgUrl: "",
      gradient: "",
      position: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (slide: HeroSlideType) => {
    setEditingSlide(slide);
    form.reset({
      headline: slide.headline,
      highlight: slide.highlight || "",
      sub: slide.sub || "",
      cta1: slide.cta1,
      cta1Link: slide.cta1Link,
      cta2: slide.cta2 || "",
      cta2Link: slide.cta2Link || "",
      imgUrl: slide.imgUrl,
      gradient: slide.gradient || "",
      position: slide.position,
      isActive: slide.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editingSlide) {
      updateSlide(
        { id: editingSlide.id, data: values },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
          },
        }
      );
    } else {
      createSlide(values, {
        onSuccess: () => {
          setIsDialogOpen(false);
        },
      });
    }
  };

  const confirmDelete = () => {
    if (!deletingSlide) return;
    deleteSlide(deletingSlide.id, {
      onSuccess: () => setIsDeleteDialogOpen(false),
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading storefront settings...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hero Slides</h1>
          <p className="text-muted-foreground text-sm">
            Manage the dynamic banners displayed on your storefront homepage.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Headline</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heroSlides.map((slide) => (
                <TableRow key={slide.id}>
                  <TableCell>
                    {slide.imgUrl ? (
                      <div className="w-24 h-12 relative rounded overflow-hidden">
                        <img src={slide.imgUrl} alt={slide.headline} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-24 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {slide.headline}
                    {slide.highlight && <span className="text-primary ml-1">{slide.highlight}</span>}
                  </TableCell>
                  <TableCell>{slide.position}</TableCell>
                  <TableCell>
                    {slide.isActive ? (
                      <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium">Active</span>
                    ) : (
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(slide)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeletingSlide(slide);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {heroSlides.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No hero slides found. Click "Add Slide" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Hero Slide" : "Add Hero Slide"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label>Image</Label>
                <div className="w-full">
                  <Controller
                    control={form.control}
                    name="imgUrl"
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value}
                        onChange={(val) => field.onChange(val || "")}
                      />
                    )}
                  />
                  {form.formState.errors.imgUrl && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.imgUrl.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">Headline *</Label>
                <Input id="headline" {...form.register("headline")} />
                {form.formState.errors.headline && (
                  <p className="text-xs text-destructive">{form.formState.errors.headline.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="highlight">Highlight Word (Optional)</Label>
                <Input id="highlight" {...form.register("highlight")} />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="sub">Sub Headline (Optional)</Label>
                <Input id="sub" {...form.register("sub")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta1">Primary Button Text *</Label>
                <Input id="cta1" {...form.register("cta1")} />
                {form.formState.errors.cta1 && (
                  <p className="text-xs text-destructive">{form.formState.errors.cta1.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta1Link">Primary Button Link *</Label>
                <Input id="cta1Link" {...form.register("cta1Link")} />
                {form.formState.errors.cta1Link && (
                  <p className="text-xs text-destructive">{form.formState.errors.cta1Link.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta2">Secondary Button Text (Optional)</Label>
                <Input id="cta2" {...form.register("cta2")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta2Link">Secondary Button Link (Optional)</Label>
                <Input id="cta2Link" {...form.register("cta2Link")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position / Order</Label>
                <Input
                  id="position"
                  type="number"
                  {...form.register("position", { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Controller
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="isActive"
                    />
                  )}
                />
                <Label htmlFor="isActive">Active (Display on Storefront)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hero Slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this banner. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
