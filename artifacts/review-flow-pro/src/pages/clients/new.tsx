import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle, Globe, Building, MapPin, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const clientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  businessName: z.string().min(2, "Business name is required"),
  googleBusinessName: z.string().optional(),
  businessCategory: z.string().min(2, "Category is required"),
  phone: z.string().min(5, "Phone is required"),
  whatsappNumber: z.string().optional(),
  email: z.string().email("Invalid email"),
  address: z.string().optional(),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  googleReviewLink: z.string().url("Must be a valid Google review URL").optional().or(z.literal("")),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]),
  notes: z.string().optional(),
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
  const queryClient = useQueryClient();
  const [googlePreview, setGooglePreview] = useState<GooglePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    },
  });

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
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <img
                          src={field.value}
                          alt="Logo preview"
                          className="h-12 w-12 rounded-lg object-contain border mt-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
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

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/clients">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
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
