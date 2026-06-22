import React, { useState } from "react";
import {
  useListQrCampaigns,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, Download, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [qrView, setQrView] = useState<QrViewState | null>(null);
  const [search, setSearch] = useState("");

  const filtered = data?.data.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold tracking-tight">Generate Magic QR</h2>
        <p className="text-muted-foreground">View and download QR codes for each client. QR codes are permanent — toggling a client off pauses the flow without changing the code.</p>
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
                    <TableCell key={j}><Skeleton className={`h-5 w-[${w}px]`} /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No QR campaigns found.
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
                        setQrView({ name: campaign.name, qrCode: campaign.qrCode, clientName: campaign.clientName })
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
