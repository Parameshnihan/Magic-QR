import React, { useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetClient, getGetClientQueryKey,
  useGetClientStats, getGetClientStatsQueryKey,
  useListQrCampaigns, getListQrCampaignsQueryKey,
  useListReviews, getListReviewsQueryKey,
  useListFeedback, getListFeedbackQueryKey,
  useUpdateClient,
  useGetSettings,
  useSendTestEmail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Phone, Mail, MapPin, Globe, Star, QrCode, ExternalLink, Plus, Eye, EyeOff, Copy, Send, Upload, X, ImageIcon, Edit2, Save, Loader2, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpload } from "@workspace/object-storage-web";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-bold">{rating}</span>
      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading: isClientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });
  const { data: stats, isLoading: isStatsLoading } = useGetClientStats(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientStatsQueryKey(clientId) },
  });
  const { data: campaigns } = useListQrCampaigns({ clientId }, { query: { enabled: !!clientId, queryKey: getListQrCampaignsQueryKey({ clientId }) } });
  const { data: reviews } = useListReviews({ clientId }, { query: { enabled: !!clientId, queryKey: getListReviewsQueryKey({ clientId }) } });
  const { data: feedback } = useListFeedback({ clientId }, { query: { enabled: !!clientId, queryKey: getListFeedbackQueryKey({ clientId }) } });
  const { data: globalSettings } = useGetSettings();
  const updateClient = useUpdateClient();
  const sendTestEmail = useSendTestEmail();

  // ── Edit Details state ────────────────────────────────────────────────────
  const [editLoaded, setEditLoaded] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGoogleReviewLink, setEditGoogleReviewLink] = useState("");
  const [editBusinessCategory, setEditBusinessCategory] = useState("");
  const [editSubscriptionPlan, setEditSubscriptionPlan] = useState("basic");
  const [editStatus, setEditStatus] = useState("active");
  const [editNotes, setEditNotes] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      const serveUrl = `/api/storage${response.objectPath}`;
      setEditLogoUrl(serveUrl);
      setEditLogoPreview(serveUrl);
    },
    onError: () => toast({ title: "Logo upload failed", variant: "destructive" }),
  });

  React.useEffect(() => {
    if (client && !editLoaded) {
      setEditName(client.name ?? "");
      setEditBusinessName(client.businessName ?? "");
      setEditEmail(client.email ?? "");
      setEditPhone(client.phone ?? "");
      setEditAddress(client.address ?? "");
      setEditGoogleReviewLink(client.googleReviewLink ?? "");
      setEditBusinessCategory(client.businessCategory ?? "");
      setEditSubscriptionPlan(client.subscriptionPlan ?? "basic");
      setEditStatus(client.status ?? "active");
      setEditNotes(client.notes ?? "");
      setEditLogoUrl(client.logoUrl ?? "");
      setEditLogoPreview(client.logoUrl ?? null);
      setEditKeywords(Array.isArray(client.recommendedKeywords) ? client.recommendedKeywords.join(", ") : "");
      setEditWhatsapp(client.whatsappNumber ?? "");
      setEditLoaded(true);
    }
  }, [client, editLoaded]);

  const handleLogoFile = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setEditLogoPreview(objectUrl);
    await uploadFile(file);
  }, [uploadFile]);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleLogoFile(file);
  }, [handleLogoFile]);

  const saveDetails = () => {
    const keywordsArr = editKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    updateClient.mutate(
      {
        id: clientId,
        data: {
          name: editName,
          businessName: editBusinessName,
          email: editEmail,
          phone: editPhone,
          address: editAddress || null,
          googleReviewLink: editGoogleReviewLink || null,
          businessCategory: editBusinessCategory,
          subscriptionPlan: editSubscriptionPlan,
          status: editStatus,
          notes: editNotes || null,
          logoUrl: editLogoUrl || null,
          recommendedKeywords: keywordsArr,
          whatsappNumber: editWhatsapp || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          toast({ title: "Client details saved" });
        },
        onError: () => toast({ title: "Failed to save client details", variant: "destructive" }),
      }
    );
  };

  // ── SMTP state ────────────────────────────────────────────────────────────
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; previewUrl?: string | null } | null>(null);

  React.useEffect(() => {
    if (client && !smtpLoaded) {
      setSmtpHost(client.smtpHost ?? "");
      setSmtpPort(client.smtpPort ? String(client.smtpPort) : "");
      setSmtpUser(client.smtpUser ?? "");
      setSmtpPass(client.smtpPass ?? "");
      setSmtpLoaded(true);
    }
  }, [client, smtpLoaded]);

  const applyGlobalSmtp = () => {
    if (!globalSettings?.smtpHost) {
      toast({ title: "No global SMTP configured in Settings", variant: "destructive" });
      return;
    }
    setSmtpHost(globalSettings.smtpHost ?? "");
    setSmtpPort(globalSettings.smtpPort ? String(globalSettings.smtpPort) : "");
    setSmtpUser(globalSettings.smtpUser ?? "");
    setSmtpPass(globalSettings.smtpPass ?? "");
    toast({ title: "Global SMTP settings applied" });
  };

  const saveSmtp = () => {
    updateClient.mutate(
      {
        id: clientId,
        data: {
          smtpHost: smtpHost || null,
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          toast({ title: "SMTP settings saved" });
        },
        onError: () => toast({ title: "Failed to save SMTP settings", variant: "destructive" }),
      }
    );
  };

  const handleTestEmail = () => {
    if (!testEmailAddr) {
      toast({ title: "Enter a recipient email address", variant: "destructive" });
      return;
    }
    setTestResult(null);
    sendTestEmail.mutate(
      { data: { toEmail: testEmailAddr } },
      {
        onSuccess: (r) => setTestResult(r),
        onError: () => setTestResult({ success: false, message: "Failed to send test email." }),
      }
    );
  };

  if (isClientLoading || !client) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasClientSmtp = !!(client.smtpHost && client.smtpUser);
  const displayLogo = editLogoPreview || client.logoUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.businessName} className="h-full w-full object-cover" />
            ) : (
              <Building className="h-8 w-8 text-secondary-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">{client.businessName}</h2>
            <p className="text-muted-foreground">{client.name} · {client.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
                {client.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {client.subscriptionPlan} Plan
              </Badge>
              {client.businessCategory && (
                <Badge variant="outline">{client.businessCategory}</Badge>
              )}
              {hasClientSmtp && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Custom SMTP
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {client.googleReviewLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={client.googleReviewLink} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Google Review
              </a>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href="/qr-campaigns">
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              Manage QR
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Info */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{client.phone}</span>
            </div>
            {client.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{client.address}</span>
              </div>
            )}
            {client.googleReviewLink && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={client.googleReviewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  Google Review Link
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading || !stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Scans</p>
                  <p className="text-2xl font-bold">{stats.totalScans.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{stats.totalReviews.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="edit">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit Details
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            QR Campaigns
            {campaigns?.data.length ? (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
                {campaigns.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews
            {reviews?.data.length ? (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
                {reviews.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            Feedback
            {feedback?.data.length ? (
              <span className="ml-1.5 rounded-full bg-destructive/10 text-destructive text-xs px-1.5 py-0.5">
                {feedback.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="smtp">
            Email / SMTP
            {hasClientSmtp && (
              <span className="ml-1.5 rounded-full bg-green-100 text-green-700 text-xs px-1.5 py-0.5">
                Set
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Edit Details ── */}
        <TabsContent value="edit" className="pt-4 space-y-4">
          {/* Logo Upload */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Business Logo</CardTitle>
              <CardDescription>Upload or replace the client's logo. Drag and drop or click to browse.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div
                  className="h-24 w-24 rounded-xl border-2 border-dashed border-[#E5DFDA] flex items-center justify-center overflow-hidden bg-secondary cursor-pointer hover:border-primary/50 transition-colors shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleLogoDrop}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {displayLogo ? (
                    <img src={displayLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFile(file);
                  }}
                />
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Logo</>
                    )}
                  </Button>
                  {editLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setEditLogoUrl(""); setEditLogoPreview(null); }}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 5 MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Details */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="contact@business.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label>Business Category</Label>
                  <Input value={editBusinessCategory} onChange={(e) => setEditBusinessCategory(e.target.value)} placeholder="Restaurant, Salon, etc." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="123 Main St, City, State" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Google Review Link</Label>
                  <Input
                    value={editGoogleReviewLink}
                    onChange={(e) => setEditGoogleReviewLink(e.target.value)}
                    placeholder="https://g.page/r/..."
                  />
                  <p className="text-xs text-muted-foreground">Customers are redirected here after leaving a 4-5 star review.</p>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select value={editSubscriptionPlan} onValueChange={setEditSubscriptionPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic — $99/mo</SelectItem>
                      <SelectItem value="professional">Professional — $299/mo</SelectItem>
                      <SelectItem value="enterprise">Enterprise — $599/mo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Recommended Keywords</Label>
                  <Input
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                    placeholder="great service, friendly staff, highly recommend"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated. Shown to customers during the review flow as keyword suggestions.</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Internal notes about this client..."
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveDetails} disabled={updateClient.isPending || isUploading}>
                  {updateClient.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── QR Campaigns ── */}
        <TabsContent value="campaigns" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {!campaigns?.data.length ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <QrCode className="h-10 w-10 opacity-30" />
                  <p>No QR campaigns yet.</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/qr-campaigns">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Create Campaign
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scans</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>QR Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.data.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.totalScans}</TableCell>
                        <TableCell>{c.conversionRate.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href="/qr-campaigns">
                              <QrCode className="mr-1.5 h-3.5 w-3.5" />
                              View QR
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reviews ── */}
        <TabsContent value="reviews" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {!reviews?.data.length ? (
                <div className="py-12 text-center text-muted-foreground">No reviews yet for this client.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><StarRating rating={r.rating} /></TableCell>
                        <TableCell>
                          <p className="max-w-sm truncate text-sm">{r.reviewText || <em className="text-muted-foreground">No text</em>}</p>
                        </TableCell>
                        <TableCell>
                          {r.redirectedToGoogle ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              On Google
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Left flow</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Feedback ── */}
        <TabsContent value="feedback" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {!feedback?.data.length ? (
                <div className="py-12 text-center text-muted-foreground">No private feedback for this client.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.data.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div className="flex items-center text-orange-500">
                            <span className="font-bold mr-1 text-foreground">{f.rating}</span>
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{f.complaintCategory || "General"}</TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate text-sm text-muted-foreground">{f.feedbackText}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize text-xs ${
                              f.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
                              f.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
                              "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }`}
                          >
                            {f.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.status === "resolved" ? "secondary" : "default"} className="capitalize text-xs">
                            {f.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email / SMTP ── */}
        <TabsContent value="smtp" className="pt-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Client SMTP Configuration</CardTitle>
                  <CardDescription className="mt-1">
                    Set a dedicated SMTP server for this client. Feedback emails use client SMTP first, then platform SMTP, then Ethereal.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={applyGlobalSmtp}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Use Global SMTP
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input type="number" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username / Email</Label>
                  <Input placeholder="alerts@clientdomain.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="App password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSmtp} disabled={updateClient.isPending}>
                  {updateClient.isPending ? "Saving..." : "Save SMTP Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Send Test Email</CardTitle>
              <CardDescription>Verify the SMTP configuration is working. Save settings first before testing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmailAddr}
                  onChange={(e) => setTestEmailAddr(e.target.value)}
                  className="max-w-sm"
                />
                <Button variant="outline" onClick={handleTestEmail} disabled={sendTestEmail.isPending}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {sendTestEmail.isPending ? "Sending..." : "Send Test"}
                </Button>
              </div>
              {testResult && (
                <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {testResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Mail className="h-4 w-4 text-red-600" />}
                  <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                    {testResult.message}
                    {testResult.previewUrl && (
                      <a href={testResult.previewUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-medium">
                        View email <ExternalLink className="inline h-3 w-3" />
                      </a>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
