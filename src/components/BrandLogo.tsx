import { Store } from "lucide-react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

interface Props {
  logoUrl?: string;
  shopName?: string;
  className?: string;
  iconClassName?: string;
  rounded?: string;
}

/**
 * Renders the shop logo from settings. Falls back to a Store icon on a
 * gradient tile when no logo is configured.
 */
export default function BrandLogo({
  logoUrl,
  shopName,
  className,
  iconClassName,
  rounded = "rounded-lg",
}: Props) {
  if (logoUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-card border grid place-items-center",
          rounded,
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt={`${shopName ?? "Shop"} logo`}
          fill
          className="object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "bg-primary hover:bg-primary/90 grid place-items-center shadow-elegant",
        rounded,
        className,
      )}
    >
      <Store className={cn("text-primary-foreground", iconClassName)} />
    </div>
  );
}
