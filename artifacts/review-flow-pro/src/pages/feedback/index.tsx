import React, { useState } from "react";
import { useListFeedback, useUpdateFeedback, getListFeedbackQueryKey, UpdateFeedbackBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MessageSquare, Phone, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface FeedbackItem {
  id: number;
  clientId: number;
  clientName: string;
  rating: number;
  feedbackText: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  complaintCategory: string | null;
  priority: string;
  status: string;
  createdAt: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
  if (status === "resolved" || status === "closed") return "secondary";
  if (status === "in_progress") return "default";
  return "outline";
};

export default function Feedback() {
  const { data, isLoading } = useListFeedback();
  const updateFeedback = useUpdateFeedback();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [newStatus, setNewStatus] = useState<UpdateFeedbackBodyStatus>(UpdateFeedbackBodyStatus.new);
  const [search, setSearch] = useState("");

  const openReview = (item: FeedbackItem) => {
    setSelected(item);
    setNewStatus(item.status as UpdateFeedbackBodyStatus);
  };

  const handleUpdateStatus = () => {
    if (!selected) return;
    updateFeedback.mutate(
      { id: selected.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
          toast({ title: "Feedback status updated" });
          setSelected(null);
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        },
      }
    );
  };

  const filtered = data?.data.filter(
    (item) =>
      !search ||
      item.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      item.feedbackText?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold tracking-tight">Feedback Inbox</h2>
        <p className="text-muted-foreground">Manage private negative feedback before it becomes a public review.</p>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:w-80 md:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search feedback..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rating</TableHead>
              <TableHead>Client &amp; Customer</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No feedback found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center text-orange-500">
                      <span className="font-bold mr-1 text-foreground">{item.rating}</span>
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.clientName}</p>
                    {item.customerName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.customerName}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="text-sm font-medium truncate">{item.complaintCategory || "General"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.feedbackText}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(item.status)}
                      className="capitalize"
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openReview(item as FeedbackItem)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Feedback Detail
            </DialogTitle>
            <DialogDescription>
              {selected?.clientName} — {new Date(selected?.createdAt ?? "").toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center text-orange-500">
                  {Array.from({ length: selected.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                  {Array.from({ length: 5 - selected.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-muted-foreground" />
                  ))}
                </div>
                <Badge variant="outline" className={`capitalize ${getPriorityColor(selected.priority)}`}>
                  {selected.priority}
                </Badge>
                {selected.complaintCategory && (
                  <Badge variant="secondary" className="capitalize">{selected.complaintCategory}</Badge>
                )}
              </div>

              {selected.feedbackText && (
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
                  "{selected.feedbackText}"
                </div>
              )}

              {(selected.customerName || selected.customerPhone || selected.customerEmail) && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Contact</p>
                  {selected.customerName && (
                    <p className="text-sm font-medium">{selected.customerName}</p>
                  )}
                  {selected.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.customerPhone}
                    </div>
                  )}
                  {selected.customerEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {selected.customerEmail}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as UpdateFeedbackBodyStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UpdateFeedbackBodyStatus.new}>New</SelectItem>
                    <SelectItem value={UpdateFeedbackBodyStatus.in_progress}>In Progress</SelectItem>
                    <SelectItem value={UpdateFeedbackBodyStatus.resolved}>Resolved</SelectItem>
                    <SelectItem value={UpdateFeedbackBodyStatus.closed}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateFeedback.isPending || newStatus === selected?.status}
            >
              {updateFeedback.isPending ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
