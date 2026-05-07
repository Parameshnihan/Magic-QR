import React, { useState } from "react";
import {
  useListQrCampaigns,
  useCreateQrCampaign,
  getListQrCampaignsQueryKey,
  useListClients,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, QrCode, Download, X, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const campaignSchema = z.object({
  name: z.string().min(2, "Campaign name is required"),
  clientId: z.number({ required_error: "Client is required" }),
  destinationUrl: z.string().url("Must be a valid URL"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

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

export default function QrCampaigns() {
  const { data, isLoading } = useListQrCampaigns();
  const { data: clientsData } = useListClients({ limit: 100 } as never);
  const createCampaign = useCreateQrCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [qrView, setQrView] = useState<QrViewState | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", destinationUrl: "", clientId: undefined },
  });

  const onSubmit = (values: CampaignFormValues) => {
    createCampaign.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQrCampaignsQueryKey() });
          toast({ title: "QR campaign created" });
          form.reset();
          setCreateOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to create campaign", variant: "destructive" });
        },
      }
    );
  };

  const handleClientChange = (clientId: string) => {
    const client = clientsData?.data.find((c) => c.id === parseInt(clientId));
    form.setValue("clientId", parseInt(clientId));
    if (client?.googleReviewLink && !form.getValues("destinationUrl")) {
      form.setValue("destinationUrl", client.googleReviewLink);
    }
  };

  const filtered = data?.data.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">QR Campaigns</h2>
          <p className="text-muted-foreground">Manage and track QR code placements.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:w-80 md:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search campaigns..."
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
              <TableHead>Campaign Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead className="text-right">QR Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="capitalize">
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.totalScans}</TableCell>
                  <TableCell>{campaign.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setQrView({ name: campaign.name, qrCode: campaign.qrCode, clientName: campaign.clientName })
                        }
                      >
                        <QrCode className="mr-1.5 h-3.5 w-3.5" />
                        Generate QR
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create QR Campaign</DialogTitle>
            <DialogDescription>
              Set up a new QR campaign for a client. Scans will route customers through the review funnel.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={handleClientChange}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientsData?.data.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Front Desk QR, Table Card..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Review Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://g.page/r/.../review" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      4-5 star raters will be redirected here. Auto-filled from client's profile.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => { setCreateOpen(false); form.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    "Create Campaign"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* QR Code View Dialog */}
      {qrView && (
        <Dialog open={!!qrView} onOpenChange={() => setQrView(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>QR Code — {qrView.name}</DialogTitle>
              <DialogDescription>{qrView.clientName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-2xl border-2 border-dashed border-border p-4 bg-white">
                <img
                  src={getQrImageUrl(getQrUrl(qrView.qrCode), 256)}
                  alt="QR Code"
                  className="h-64 w-64"
                  onError={(e) => {
                    (e.target as HTMLImageElement).alt = "QR code unavailable — check internet connection";
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-mono break-all">{getQrUrl(qrView.qrCode)}</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a href={getQrUrl(qrView.qrCode)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Test Flow
                  </a>
                </Button>
                <Button
                  className="flex-1"
                  asChild
                >
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
