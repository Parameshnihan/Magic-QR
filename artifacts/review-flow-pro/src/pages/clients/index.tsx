import React, { useState } from "react";
import { useListClients, useUpdateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { data, isLoading } = useListClients();
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const handleToggle = (clientId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setTogglingId(clientId);
    updateClient.mutate(
      { id: clientId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({
            title: newStatus === "active" ? "QR flow resumed" : "QR flow paused",
            description:
              newStatus === "active"
                ? "The QR code is now active. Customers can scan and submit reviews."
                : "The QR code is paused. Scans will show a temporary unavailability message.",
          });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        },
        onSettled: () => setTogglingId(null),
      }
    );
  };

  const filtered = data?.data.filter(
    (c) =>
      !search ||
      c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">Manage your agency's clients and their review funnels.</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:w-80 md:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
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
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>QR Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => {
                const isActive = client.status === "active";
                const isToggling = togglingId === client.id;
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {client.logoUrl ? (
                          <img
                            src={client.logoUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <Building className="h-5 w-5 text-secondary-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{client.businessName}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {client.subscriptionPlan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{client.totalReviews}</span>
                        <span className="text-xs text-muted-foreground">total</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isActive}
                          disabled={isToggling}
                          onCheckedChange={() => handleToggle(client.id, client.status)}
                          aria-label={isActive ? "Pause QR flow" : "Resume QR flow"}
                        />
                        <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                          {isToggling ? "..." : isActive ? "On" : "Off"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
