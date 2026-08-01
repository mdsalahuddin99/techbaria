"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/shared/components";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "sonner";
import { createSystemUpdate } from "@/server/actions/systemUpdates";
import { Loader2 } from "lucide-react";

export function UpdateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    version: "",
    date: new Date().toISOString().split("T")[0],
    features: "",
    improvements: "",
    fixes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version) {
      toast.error("Version is required");
      return;
    }

    setLoading(true);
    
    // Convert multiline text to array of strings (ignoring empty lines)
    const featuresArray = formData.features.split("\n").map(s => s.trim()).filter(Boolean);
    const improvementsArray = formData.improvements.split("\n").map(s => s.trim()).filter(Boolean);
    const fixesArray = formData.fixes.split("\n").map(s => s.trim()).filter(Boolean);

    const result = await createSystemUpdate({
      version: formData.version,
      date: new Date(formData.date),
      features: featuresArray,
      improvements: improvementsArray,
      fixes: fixesArray,
    });

    setLoading(false);

    if (result.success) {
      toast.success("System update published successfully!");
      router.push("/dashboard/updates");
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <PageHeader
        title="New System Update"
        description="Publish a new changelog entry for your clients."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version (e.g. v1.3.0)</Label>
              <Input
                id="version"
                required
                placeholder="v1.0.0"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">New Features (One per line)</Label>
            <Textarea
              id="features"
              placeholder="Added new dashboard..."
              className="min-h-[100px]"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="improvements">Improvements (One per line)</Label>
            <Textarea
              id="improvements"
              placeholder="Optimized loading speed..."
              className="min-h-[100px]"
              value={formData.improvements}
              onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixes">Bug Fixes (One per line)</Label>
            <Textarea
              id="fixes"
              placeholder="Fixed checkout crash..."
              className="min-h-[100px]"
              value={formData.fixes}
              onChange={(e) => setFormData({ ...formData, fixes: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-3" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Update
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
