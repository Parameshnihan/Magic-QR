import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetSettings, useUpdateSettings, useSendTestEmail, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, CheckCircle, ExternalLink, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const settingsSchema = z.object({
  platformName: z.string().min(1),
  primaryColor: z.string(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  whatsappApiKey: z.string().optional(),
  stripePublicKey: z.string().optional(),
  razorpayKeyId: z.string().optional(),
  googleApiEnabled: z.boolean(),
});

export default function Settings() {
  const { data, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const sendTestEmail = useSendTestEmail();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; previewUrl?: string | null } | null>(null);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      platformName: "",
      primaryColor: "",
      smtpHost: "",
      smtpPort: undefined,
      smtpUser: "",
      smtpPass: "",
      whatsappApiKey: "",
      stripePublicKey: "",
      razorpayKeyId: "",
      googleApiEnabled: false,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        platformName: data.platformName,
        primaryColor: data.primaryColor,
        smtpHost: data.smtpHost || "",
        smtpPort: data.smtpPort || undefined,
        smtpUser: data.smtpUser || "",
        smtpPass: data.smtpPass || "",
        whatsappApiKey: data.whatsappApiKey || "",
        stripePublicKey: data.stripePublicKey || "",
        razorpayKeyId: data.razorpayKeyId || "",
        googleApiEnabled: data.googleApiEnabled,
      });
    }
  }, [data, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to save settings", variant: "destructive" });
        }
      }
    );
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast({ title: "Enter a recipient email address", variant: "destructive" });
      return;
    }
    setTestResult(null);
    sendTestEmail.mutate(
      { data: { toEmail: testEmail } },
      {
        onSuccess: (result) => {
          setTestResult(result);
        },
        onError: () => {
          setTestResult({ success: false, message: "Failed to send test email. Check your SMTP configuration." });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-96 w-full max-w-4xl mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-serif font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage global platform configurations and API integrations.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="email">Email / SMTP</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="branding" className="pt-4">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Branding Settings</CardTitle>
                  <CardDescription>Customize the look and feel of the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="platformName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color (Hex)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="#8B4A1F" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="pt-4 space-y-4">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>SMTP Configuration</CardTitle>
                  <CardDescription>
                    Configure outgoing email for negative feedback alerts. Feedback from 1-3 star QR scans is sent to the registered client email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="smtp.gmail.com" />
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
                            <Input type="number" {...field} value={field.value || ''} placeholder="587" />
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
                            <Input {...field} placeholder="alerts@yourdomain.com" />
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
                                {...field}
                                type={showPass ? "text" : "password"}
                                placeholder="App password or SMTP password"
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Send Test Email</CardTitle>
                  <CardDescription>
                    Verify your SMTP settings are working by sending a test email. Save your settings first before testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendTestEmail}
                      disabled={sendTestEmail.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendTestEmail.isPending ? "Sending..." : "Send Test Email"}
                    </Button>
                  </div>

                  {testResult && (
                    <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      {testResult.success
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <AlertCircle className="h-4 w-4 text-red-600" />
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

                  {!data?.smtpHost && (
                    <p className="text-sm text-muted-foreground">
                      No SMTP server configured — test emails are captured by Ethereal (a test inbox service). Configure host, username, and password above to send real emails.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="pt-4">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>API Integrations</CardTitle>
                  <CardDescription>Connect external services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="googleApiEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Google Review API</FormLabel>
                          <FormDescription>
                            Enable automatic review verification.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsappApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Cloud API Key</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="stripePublicKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stripe Public Key</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="razorpayKeyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razorpay Key ID</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
