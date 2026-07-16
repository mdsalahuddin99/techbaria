import * as React from "react";

import { cn } from "@/shared/lib/utils";

import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-sm border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "border-slate-200/60",
        "gradient-blue": "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-transparent shadow-lg hover:shadow-xl",
        "gradient-indigo": "bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-transparent shadow-lg hover:shadow-xl",
        "gradient-amber": "bg-gradient-to-br from-amber-400 to-orange-500 text-white border-transparent shadow-lg hover:shadow-xl",
        "gradient-emerald": "bg-gradient-to-br from-emerald-400 to-teal-500 text-white border-transparent shadow-lg hover:shadow-xl",
        "gradient-violet": "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-transparent shadow-lg hover:shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, className }))}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1 p-3 sm:p-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg sm:text-xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-3 sm:p-4 pt-0 sm:pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-3 sm:p-4 pt-0 sm:pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
