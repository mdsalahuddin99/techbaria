import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["F2"], label: "Focus barcode scanner" },
  { keys: ["/"], label: "Focus product search" },
  { keys: ["Ctrl", "K"], label: "Focus product search (alt)" },
  { keys: ["F9"], label: "Open checkout" },
  { keys: ["Ctrl", "Enter"], label: "Open checkout (alt)" },
  { keys: ["Ctrl", "H"], label: "Hold current sale" },
  { keys: ["Ctrl", "R"], label: "Resume last held sale" },
  { keys: ["Esc"], label: "Clear cart" },
  { keys: ["?"], label: "Show this help" },
];

export default function KeyboardShortcutsHelp({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-0.5 rounded border bg-muted text-xs font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground border-t pt-3">
          Shortcuts work on the POS screen. Pressing ? opens this dialog from anywhere.
        </p>
      </DialogContent>
    </Dialog>
  );
}
