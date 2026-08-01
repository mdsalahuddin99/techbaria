"use client";

import { useState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/components";
import { useT } from "@/features/i18n";
import { changelog } from "@/data/changelog";
import { Sparkles, Wrench, Zap, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export function UpdatesClient() {
  const t = useT();
  usePageTitle(t("updates.title"));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <PageHeader
        title={t("updates.title")}
        description={t("updates.description")}
      />

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/70 before:to-transparent">
        {changelog.map((update, index) => (
          <UpdateItem key={update.version} update={update} index={index} />
        ))}
      </div>
    </div>
  );
}

function UpdateItem({ update, index }: { update: typeof changelog[0]; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Timeline dot */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 mx-auto">
        {index === 0 ? <Sparkles className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
      </div>

      {/* Content Card */}
      <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-primary">{update.version}</h3>
          <span className="text-sm text-muted-foreground font-medium bg-secondary px-2.5 py-1 rounded-full">
            {new Date(update.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? "mt-4 opacity-100 max-h-[1000px]" : "max-h-0 opacity-0"
          }`}
        >
          {/* Features */}
          {update.features && update.features.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                New Features
              </h4>
              <ul className="space-y-2">
                {update.features.map((feature, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {update.improvements && update.improvements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Improvements
              </h4>
              <ul className="space-y-2">
                {update.improvements.map((improvement, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fixes */}
          {update.fixes && update.fixes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                Bug Fixes
              </h4>
              <ul className="space-y-2">
                {update.fixes.map((fix, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              Hide details <ChevronUp className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              View full update <ChevronDown className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
