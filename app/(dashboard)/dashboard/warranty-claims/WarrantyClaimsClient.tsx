"use client";

import { useState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { formatDateTime, formatCurrency } from "@/shared/lib/format";
import { Plus, Search, ShieldAlert, Edit2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/shared/components";
import type { WarrantyClaim } from "@/shared/api-client/warrantyClaims";
import { warrantyClaimsService } from "@/shared/api-client/warrantyClaims";
import { useWarrantyClaims, useCreateWarrantyClaim, useUpdateWarrantyClaim } from "@/features/warranty/hooks";

export function WarrantyClaimsClient({
  initialClaims,
  products,
  customers,
  suppliers
}: {
  initialClaims: WarrantyClaim[];
  products: any[];
  customers: any[];
  suppliers: any[];
}) {
  usePageTitle("Warranty Claims (RMA)");
  
  const { data: claims = initialClaims } = useWarrantyClaims();
  const [search, setSearch] = useState("");
  
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpdate, setOpenUpdate] = useState<WarrantyClaim | null>(null);

  const filteredClaims = claims.filter(c => 
    c.claimNo.toLowerCase().includes(search.toLowerCase()) || 
    c.product?.name.toLowerCase().includes(search.toLowerCase()) ||
    c.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Warranty Claims (RMA)"
        description="Manage customer warranty returns and defective stock tracking with suppliers."
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search claim no, product, serial..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Claim
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium font-mono">{claim.claimNo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(claim.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{claim.type.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{claim.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{claim.serialNumber || "No serial"}</div>
                  </TableCell>
                  <TableCell>{claim.customer?.name || "—"}</TableCell>
                  <TableCell>{claim.supplier?.name || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setOpenUpdate(claim)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredClaims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState 
                      icon={ShieldAlert}
                      title="No warranty claims" 
                      description="You don't have any warranty claims right now."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      <CreateClaimModal 
        open={openCreate} 
        onClose={() => setOpenCreate(false)}
        products={products}
        customers={customers}
        suppliers={suppliers}
      />

      {openUpdate && (
        <UpdateClaimModal
          claim={openUpdate}
          onClose={() => setOpenUpdate(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    RECEIVED_FROM_CUSTOMER: "bg-blue-100 text-blue-800",
    SENT_TO_SUPPLIER: "bg-amber-100 text-amber-800",
    RECEIVED_FROM_SUPPLIER: "bg-indigo-100 text-indigo-800",
    RESOLVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function CreateClaimModal({ open, onClose, products, customers, suppliers }: any) {
  const { mutateAsync: createClaim } = useCreateWarrantyClaim();
  const [loading, setLoading] = useState(false);
  
  const [type, setType] = useState<any>("CUSTOMER_CLAIM");
  
  // Scanner state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [fetchedSale, setFetchedSale] = useState<any>(null);
  const [manualMode, setManualMode] = useState(false);

  // Form state
  const [saleId, setSaleId] = useState("");
  const [productId, setProductId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMsg("");
    setFetchedSale(null);
    try {
      const result = await warrantyClaimsService.lookupSale(searchQuery);
      if (!result) {
        setErrorMsg("কোনো ইনভয়েস বা সিরিয়াল নাম্বার পাওয়া যায়নি।");
      } else {
        setFetchedSale(result.sale);
        if (result.type === "SERIAL" && result.preSelectedProductId) {
           handleSelectItem(result.sale.id, result.preSelectedProductId, result.preSelectedSerial, result.sale.customer?.id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "সার্চ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectItem = (sId: string, pId: string, sNumber?: string, cId?: string) => {
    setSaleId(sId);
    setProductId(pId);
    setSerialNumber(sNumber || "");
    if (cId) setCustomerId(cId);
  };

  const handleSubmit = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      await createClaim({
        type,
        productId,
        saleId: saleId || undefined,
        serialNumber: serialNumber || undefined,
        customerId: customerId && customerId !== "none" ? customerId : undefined,
        supplierId: supplierId && supplierId !== "none" ? supplierId : undefined,
        issueDescription: issueDescription || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => {
      if (!o) {
        onClose();
        // Reset state
        setFetchedSale(null);
        setSearchQuery("");
        setManualMode(false);
        setSaleId("");
        setProductId("");
        setSerialNumber("");
        setCustomerId("");
        setSupplierId("");
        setIssueDescription("");
        setErrorMsg("");
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Warranty Claim</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Claim Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER_CLAIM">Customer Claim</SelectItem>
                <SelectItem value="DEFECTIVE_STOCK">Defective Stock (Our Stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "CUSTOMER_CLAIM" && !manualMode && (
             <div className="space-y-3 p-4 border rounded-md bg-slate-50/50">
               <Label>Scan Invoice Barcode or Serial Number</Label>
               <form onSubmit={handleSearch} className="flex gap-2">
                 <Input 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="e.g. INV-1234 or SN-001..." 
                   autoFocus
                 />
                 <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                   {isSearching ? "Searching..." : <Search className="w-4 h-4 mr-2"/>}
                   Search
                 </Button>
               </form>
               {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
               
               {fetchedSale && (
                 <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-semibold text-slate-900">Invoice: {fetchedSale.invoiceNo}</h4>
                         <p className="text-sm text-slate-500">Date: {formatDateTime(fetchedSale.date)}</p>
                       </div>
                       {fetchedSale.customer && (
                         <div className="text-right">
                           <p className="text-sm font-medium text-slate-900">{fetchedSale.customer.name}</p>
                           <p className="text-xs text-slate-500">{fetchedSale.customer.phone}</p>
                         </div>
                       )}
                    </div>
                    <div className="border rounded-md divide-y overflow-hidden bg-white">
                      {fetchedSale.items.map((item: any) => {
                        const isSelected = productId === item.productId && saleId === fetchedSale.id;
                        return (
                          <div key={item.id} className={`p-3 flex items-center justify-between transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                            <div>
                              <p className="font-medium text-sm text-slate-900">{item.productName}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">Qty: {item.qty}</Badge>
                                {item.warrantyMonths ? (
                                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                                    {item.warrantyMonths} months warranty
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-slate-500">No warranty</Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => handleSelectItem(fetchedSale.id, item.productId, undefined, fetchedSale.customer?.id)}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                 </div>
               )}

               <div className="flex justify-end pt-2">
                 <Button variant="link" size="sm" onClick={() => setManualMode(true)} className="text-slate-500">
                   Enter manually instead
                 </Button>
               </div>
             </div>
          )}
          
          {(type === "DEFECTIVE_STOCK" || manualMode) && (
            <div className="space-y-4">
              {type === "CUSTOMER_CLAIM" && (
                <div className="flex justify-end">
                  <Button variant="link" size="sm" onClick={() => setManualMode(false)} className="text-primary p-0 h-auto">
                    ← Back to Scanner
                  </Button>
                </div>
              )}
              <div className="space-y-1">
                <Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === "CUSTOMER_CLAIM" && (
                <div className="space-y-1">
                  <Label>Customer (optional)</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Walk-in</SelectItem>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Serial / IMEI (optional)</Label>
            <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="e.g. SN-00123" />
          </div>

          <div className="space-y-1">
            <Label>Supplier (optional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Issue Description</Label>
            <Textarea value={issueDescription} onChange={e => setIssueDescription(e.target.value)} placeholder="Describe the defect..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!productId || loading}>Create Claim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateClaimModal({ claim, onClose }: { claim: WarrantyClaim; onClose: () => void }) {
  const { mutateAsync: updateClaim } = useUpdateWarrantyClaim();
  const [loading, setLoading] = useState(false);
  
  const [status, setStatus] = useState<any>(claim.status);
  const [supplierNotes, setSupplierNotes] = useState(claim.supplierNotes || "");
  const [resolutionNote, setResolutionNote] = useState(claim.resolutionNote || "");
  const [customerCost, setCustomerCost] = useState(claim.customerCost || 0);
  const [supplierCost, setSupplierCost] = useState(claim.supplierCost || 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateClaim({
        id: claim.id,
        data: {
          status,
          supplierNotes: supplierNotes || undefined,
          resolutionNote: resolutionNote || undefined,
          customerCost: Number(customerCost) || 0,
          supplierCost: Number(supplierCost) || 0,
        }
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Claim {claim.claimNo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEIVED_FROM_CUSTOMER">Received from Customer</SelectItem>
                <SelectItem value="SENT_TO_SUPPLIER">Sent to Supplier</SelectItem>
                <SelectItem value="RECEIVED_FROM_SUPPLIER">Received from Supplier</SelectItem>
                <SelectItem value="RESOLVED">Resolved (Given to Customer)</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Cost to Customer (৳)</Label>
              <Input type="number" min="0" value={customerCost} onChange={e => setCustomerCost(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Cost to Supplier (৳)</Label>
              <Input type="number" min="0" value={supplierCost} onChange={e => setSupplierCost(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Supplier Notes</Label>
            <Textarea value={supplierNotes} onChange={e => setSupplierNotes(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Resolution / Internal Notes</Label>
            <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>Update Claim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
