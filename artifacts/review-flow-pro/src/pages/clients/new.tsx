import React, { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useCreateClient, useGetSettings, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle, Globe, Building, AlertCircle, Upload, X, ImageIcon, Mail, Eye, EyeOff, Copy } from "lucide-react";
import { Link } from "wouter";
import { useUpload } from "@workspace/object-storage-web";

const clientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  businessName: z.string().min(2, "Business name is required"),
  googleBusinessName: z.string().optional(),
  businessCategory: z.string().min(2, "Category is required"),
  phone: z.string().min(5, "Phone is required"),
  whatsappNumber: z.string().optional(),
  email: z.string().email("Invalid email"),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  googleReviewLink: z.string().url("Must be a valid Google review URL").optional().or(z.literal("")),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]),
  notes: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
});

type FormValues = z.infer<typeof clientSchema>;

interface GooglePreview {
  businessName: string;
  description: string;
  image: string | null;
  resolvedUrl: string;
}

export default function NewClient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createClient = useCreateClient();
  const { data: globalSettings } = useGetSettings();
  const queryClient = useQueryClient();
  const [googlePreview, setGooglePreview] = useState<GooglePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      const serveUrl = `/api/storage${response.objectPath}`;
      form.setValue("logoUrl", serveUrl);
      setLogoPreview(serveUrl);
      toast({ title: "Logo uploaded successfully" });
    },
    onError: (err) => {
      toast({ title: "Logo upload failed", description: err.message, variant: "destructive" });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      businessName: "",
      googleBusinessName: "",
      businessCategory: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      address: "",
      logoUrl: "",
      googleReviewLink: "",
      subscriptionPlan: "basic",
      notes: "",
      smtpHost: "",
      smtpPort: undefined,
      smtpUser: "",
      smtpPass: "",
    },
  });

  const applyGlobalSmtp = useCallback(() => {
    if (!globalSettings?.smtpHost) {
      toast({ title: "No global SMTP configured in Settings", variant: "destructive" });
      return;
    }
    form.setValue("smtpHost", globalSettings.smtpHost ?? "");
    form.setValue("smtpPort", globalSettings.smtpPort ?? undefined);
    form.setValue("smtpUser", globalSettings.smtpUser ?? "");
    form.setValue("smtpPass", globalSettings.smtpPass ?? "");
    toast({ title: "Global SMTP settings applied" });
  }, [globalSettings, form, toast]);

  const handleLogoFile = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    await uploadFile(file);
  }, [uploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleLogoFile(file);
  }, [handleLogoFile]);

  const clearLogo = useCallback(() => {
    setLogoPreview(null);
    form.setValue("logoUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [form]);

  const verifyGoogleLink = useCallback(async () => {
    const url = form.getValues("googleReviewLink");
    if (!url) {
      setPreviewError("Please enter a Google review link first.");
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setGooglePreview(null);
    try {
      const res = await fetch(`/api/clients/google-preview?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || "Failed to fetch business info.");
      } else {
        setGooglePreview(data);
        if (data.businessName && !form.getValues("businessName")) {
          form.setValue("businessName", data.businessName);
        }
      }
    } catch {
      setPreviewError("Network error — could not verify the link.");
    } finally {
      setPreviewLoading(false);
    }
  }, [form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      logoUrl: data.logoUrl || undefined,
      googleReviewLink: data.googleReviewLink || undefined,
      googleBusinessName: data.googleBusinessName || undefined,
      whatsappNumber: data.whatsappNumber || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
      smtpHost: data.smtpHost || undefined,
      smtpPort: data.smtpPort || undefined,
      smtpUser: data.smtpUser || undefined,
      smtpPass: data.smtpPass || undefined,
    };
    createClient.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "Client created successfully" });
          setLocation("/clients");
        },
        onError: () => {
          toast({ title: "Failed to create client", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">New Client</h2>
          <p className="text-muted-foreground">Onboard a new client to Advento Magic QR.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Google Review Link Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Google Review Link
              </CardTitle>
              <CardDescription>
                Paste the client's Google Maps review link. We'll verify and pull the business profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="googleReviewLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Review Link <span className="text-muted-foreground font-normal">(e.g. https://maps.app.goo.gl/...)</span></FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="https://g.page/r/.../review" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifyGoogleLink}
                        disabled={previewLoading}
                        className="shrink-0"
                      >
                        {previewLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                        ) : (
                          "Verify Business"
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {previewError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {googlePreview && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    Business profile verified
                  </div>
                  <div className="flex items-start gap-4">
                    {googlePreview.image && (
                      <img
                        src={googlePreview.image}
                        alt="Business"
                        className="h-16 w-16 rounded-lg object-cover border border-green-200 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{googlePreview.businessName}</p>
                      {googlePreview.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{googlePreview.description}</p>
                      )}
                      <p className="text-xs text-green-600 mt-1 truncate max-w-sm">{googlePreview.resolvedUrl}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confirm this is the correct business before proceeding. QR scans from this client will redirect 4-5 star raters to this Google review page.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Client Details
              </CardTitle>
              <CardDescription>Enter the primary details for the new client.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Restaurant, Hotel, Spa..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subscriptionPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic — $99/mo</SelectItem>
                          <SelectItem value="professional">Professional — $299/mo</SelectItem>
                          <SelectItem value="enterprise">Enterprise — $599/mo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo Upload */}
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Business Logo <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="relative"
                      >
                        {logoPreview ? (
                          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-14 w-14 rounded-lg object-contain border border-border bg-white shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="flex-1 min-w-0">
                              {isUploading ? (
                                <div className="space-y-1.5">
                                  <p className="text-sm text-muted-foreground">Uploading...</p>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all duration-300 rounded-full"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-green-700 font-medium flex items-center gap-1.5">
                                  <CheckCircle className="h-4 w-4" />
                                  Logo uploaded
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={clearLogo}
                              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center hover:bg-muted/40 hover:border-primary/40 transition-colors cursor-pointer"
                          >
                            <div className="rounded-full bg-primary/10 p-2.5">
                              <ImageIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Upload logo</p>
                              <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, SVG, WebP — drag & drop or click</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                              <Upload className="h-3.5 w-3.5" />
                              Choose file
                            </div>
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, City, Country" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Internal Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any internal notes about this client..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SMTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email / SMTP Settings
                <span className="text-sm font-normal text-muted-foreground">(optional)</span>
              </CardTitle>
              <CardDescription>
                Configure this client's own SMTP server for feedback email alerts. Leave blank to use the platform's global SMTP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={applyGlobalSmtp}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Use Global SMTP
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="587" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username / Email</FormLabel>
                      <FormControl>
                        <Input placeholder="alerts@clientdomain.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpPass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showSmtpPass ? "text" : "password"}
                            placeholder="App password"
                            {...field}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPass(!showSmtpPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/clients">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createClient.isPending || isUploading}>
              {createClient.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                "Create Client"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
