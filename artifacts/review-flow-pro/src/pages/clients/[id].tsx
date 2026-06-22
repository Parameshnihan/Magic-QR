import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetClient, getGetClientQueryKey,
  useGetClientStats, getGetClientStatsQueryKey,
  useListQrCampaigns, getListQrCampaignsQueryKey,
  useListReviews, getListReviewsQueryKey,
  useListFeedback, getListFeedbackQueryKey,
  useUpdateClient,
  useGetSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Phone, Mail, MapPin, Globe, Star, QrCode, ExternalLink, Plus, Eye, EyeOff, Copy, CheckCircle, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSendTestEmail } from "@workspace/api-client-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; previewUrl?: string | null } | null>(null);

  // Load SMTP values from client once
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
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
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

        <TabsContent value="smtp" className="pt-4 space-y-4">
          {/* SMTP Config Card */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Client SMTP Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set a custom SMTP server for this client. Feedback emails will be sent from this server instead of the platform SMTP.
                  </p>
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
                  <Input
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username / Email</Label>
                  <Input
                    placeholder="alerts@clientdomain.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
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

          {/* Test Email Card */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Send Test Email</CardTitle>
              <p className="text-sm text-muted-foreground">
                Verify the SMTP configuration by sending a test email. Save settings first before testing.
              </p>
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
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={sendTestEmail.isPending}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {sendTestEmail.isPending ? "Sending..." : "Send Test Email"}
                </Button>
              </div>

              {testResult && (
                <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {testResult.success
                    ? <CheckCircle className="h-4 w-4 text-green-600" />
                    : <Mail className="h-4 w-4 text-red-600" />
                  }
                  <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                    <span>{testResult.message}</span>
                    {testResult.previewUrl && (
                      <a
                        href={testResult.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 underline font-medium"
                      >
                        View email <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!hasClientSmtp && !smtpHost && (
                <p className="text-sm text-muted-foreground">
                  No client SMTP configured — test will use the platform SMTP or Ethereal fallback.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
