import React from "react";
import { useParams } from "wouter";
import { useGetClient, getGetClientQueryKey, useGetClientStats, getGetClientStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building, Phone, Mail, MapPin, Globe } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0", 10);

  const { data: client, isLoading: isClientLoading } = useGetClient(clientId, {
    query: {
      enabled: !!clientId,
      queryKey: getGetClientQueryKey(clientId),
    }
  });

  const { data: stats, isLoading: isStatsLoading } = useGetClientStats(clientId, {
    query: {
      enabled: !!clientId,
      queryKey: getGetClientStatsQueryKey(clientId),
    }
  });

  if (isClientLoading || !client) {
    return <div className="p-8"><Skeleton className="h-64 w-full mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground shadow-sm">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.name} className="h-full w-full object-cover rounded-xl" />
            ) : (
              <Building className="h-8 w-8" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">{client.businessName}</h2>
            <p className="text-muted-foreground">{client.name}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {client.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {client.subscriptionPlan} Plan
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
            {client.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{client.address}</span>
              </div>
            )}
            {client.googleReviewLink && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={client.googleReviewLink} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                  Google Maps Link
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading || !stats ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Scans</p>
                  <p className="text-2xl font-bold">{stats.totalScans}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)} <Star className="inline h-4 w-4 text-yellow-500 mb-1" fill="currentColor"/></p>
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

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
          <TabsTrigger value="campaigns">QR Campaigns</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Campaigns list will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Reviews list will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="feedback" className="pt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Private feedback will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
