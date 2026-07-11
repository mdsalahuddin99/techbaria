import { Languages } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { LANGS } from "./translations";
import { useLanguageStore } from "./useLanguage";

interface Props {
  /** Compact icon-only trigger (header). Default: button with text. */
  iconOnly?: boolean;
}

/** Header dropdown to switch UI language. */
export function LanguageToggle({ iconOnly = false }: Props) {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? "icon" : "sm"}
          aria-label="Switch language"
          className={iconOnly ? "" : "gap-2"}
        >
          <Languages className="h-4 w-4" />
          {!iconOnly && <span>{current.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Language / ভাষা</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={l.code === lang ? "font-semibold bg-accent" : ""}
          >
            {l.native}
            <span className="ml-auto text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
