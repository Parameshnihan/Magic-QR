import React, { useState } from "react";
import {
  useListQrCampaigns,
  useCreateQrCampaign,
  useListClients,
  getListQrCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, Download, ExternalLink, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface QrViewState {
  name: string;
  qrCode: string;
  clientName: string;
}

function getQrUrl(qrCode: string) {
  return `${window.location.origin}/review/${qrCode}`;
}

function getQrImageUrl(reviewUrl: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(reviewUrl)}&size=${size}x${size}&margin=10&color=120700`;
}

export default function GenerateMagicQR() {
  const { data, isLoading } = useListQrCampaigns();
  const { data: clientsData } = useListClients({ limit: 100 } as never);
  const createCampaign = useCreateQrCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [qrView, setQrView] = useState<QrViewState | null>(null);
  const [search, setSearch] = useState("");

  // Create form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clientsData?.data.find((c) => String(c.id) === clientId);
    if (client) {
      setCampaignName(`${client.businessName} — Magic QR`);
      if (client.googleReviewLink) setDestinationUrl(client.googleReviewLink);
    }
  };

  const handleCreate = () => {
    if (!selectedClientId || !campaignName || !destinationUrl) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createCampaign.mutate(
      {
        data: {
          clientId: parseInt(selectedClientId),
          name: campaignName,
          destinationUrl,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQrCampaignsQueryKey() });
          toast({ title: "Magic QR generated successfully" });
          setCreateOpen(false);
          setSelectedClientId("");
          setCampaignName("");
          setDestinationUrl("");
        },
        onError: () => {
          toast({ title: "Failed to generate QR", variant: "destructive" });
        },
      }
    );
  };

  const filtered = data?.data.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Generate Magic QR</h2>
          <p className="text-muted-foreground">
            Create and manage QR codes for each client. QR codes are permanent — toggling a client off pauses the flow without changing the code.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New QR
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:w-80 md:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by client or campaign..."
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
              <TableHead>Campaign</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead className="text-right">QR Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[150, 120, 80, 40, 40, 60, 100].map((w, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5" style={{ width: w }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No QR campaigns found. Click "Generate New QR" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.clientName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={campaign.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.totalScans}</TableCell>
                  <TableCell>{campaign.totalReviews}</TableCell>
                  <TableCell>
                    {typeof campaign.conversionRate === "number"
                      ? `${(campaign.conversionRate * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrView({
                          name: campaign.name,
                          qrCode: campaign.qrCode,
                          clientName: campaign.clientName,
                        })
                      }
                    >
                      <QrCode className="mr-1.5 h-3.5 w-3.5" />
                      View QR
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate New QR Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClientId("");
            setCampaignName("");
            setDestinationUrl("");
          }
          setCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Generate New Magic QR</DialogTitle>
            <DialogDescription>
              Select a client to generate a permanent QR code for their review funnel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsData?.data.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign Label</Label>
              <Input
                placeholder="e.g. Front Desk QR, Table Card..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Google Review Link</Label>
              <Input
                placeholder="https://g.page/r/.../review"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from the client's profile. 4–5 star raters are redirected here.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createCampaign.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createCampaign.isPending}>
              {createCampaign.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code View Dialog */}
      {qrView && (
        <Dialog open={!!qrView} onOpenChange={() => setQrView(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Magic QR — {qrView.name}</DialogTitle>
              <DialogDescription>{qrView.clientName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-2xl border-2 border-dashed border-border p-4 bg-white">
                <img
                  src={getQrImageUrl(getQrUrl(qrView.qrCode), 256)}
                  alt="QR Code"
                  className="h-64 w-64"
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all text-center">
                {getQrUrl(qrView.qrCode)}
              </p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={getQrUrl(qrView.qrCode)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Test Flow
                  </a>
                </Button>
                <Button className="flex-1" asChild>
                  <a
                    href={getQrImageUrl(getQrUrl(qrView.qrCode), 512)}
                    download={`qr-${qrView.name.replace(/\s+/g, "-").toLowerCase()}.png`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
