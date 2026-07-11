import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { FileText, Receipt as ReceiptIcon, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onPickThermal: () => void;
  onPickInvoice: () => void;
}

export default function ReceiptChooser({ open, onClose, onPickThermal, onPickInvoice }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Print Receipt</DialogTitle>
          <DialogDescription>Choose a format to print or share.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={onPickThermal}
            className="group rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 p-5 text-left transition-colors"
          >
            <ReceiptIcon className="h-8 w-8 mb-3 text-primary" />
            <div className="font-semibold">Thermal Receipt</div>
            <p className="text-xs text-muted-foreground mt-1">80mm POS printer · compact</p>
          </button>
          <button
            onClick={onPickInvoice}
            className="group rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 p-5 text-left transition-colors"
          >
            <FileText className="h-8 w-8 mb-3 text-primary" />
            <div className="font-semibold">Full Invoice</div>
            <p className="text-xs text-muted-foreground mt-1">A4 invoice with logo & details</p>
          </button>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
