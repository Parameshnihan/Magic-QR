import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, QrCode, Star, MessageSquareWarning, Building2, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({
    query: {
      queryKey: getGetDashboardStatsQueryKey()
    }
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Total QR Scans",
      value: stats.totalQrScans.toLocaleString(),
      change: `+${stats.scansGrowth}%`,
      icon: QrCode,
    },
    {
      title: "Total Reviews",
      value: stats.totalReviews.toLocaleString(),
      change: `+${stats.reviewsGrowth}%`,
      icon: Star,
    },
    {
      title: "Positive / Negative",
      value: `${stats.positiveReviews} / ${stats.negativeReviews}`,
      change: `${stats.conversionRate.toFixed(1)}% conversion`,
      icon: MessageSquareWarning,
    },
    {
      title: "Active Clients",
      value: stats.activeClients.toLocaleString(),
      change: `+${stats.revenueGrowth}% revenue`,
      icon: Building2,
    },
  ];

  // Dummy chart data since API doesn't return full timeseries in this endpoint
  const chartData = [
    { name: "Jan", scans: 4000, reviews: 2400 },
    { name: "Feb", scans: 3000, reviews: 1398 },
    { name: "Mar", scans: 2000, reviews: 9800 },
    { name: "Apr", scans: 2780, reviews: 3908 },
    { name: "May", scans: 1890, reviews: 4800 },
    { name: "Jun", scans: 2390, reviews: 3800 },
    { name: "Jul", scans: 3490, reviews: 4300 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-serif font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Here's what's happening with your reputation funnels today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-primary mt-1 flex items-center">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {kpi.change} from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Scan to Review Conversion</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="scans" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScans)" />
                  <Area type="monotone" dataKey="reviews" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorReviews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                { name: "Downtown Branch", scans: 1245, reviews: 342, progress: 85 },
                { name: "Airport Hotel", scans: 982, reviews: 215, progress: 65 },
                { name: "Seaside Resort", scans: 843, reviews: 184, progress: 55 },
                { name: "City Center Cafe", scans: 654, reviews: 92, progress: 40 },
              ].map((campaign) => (
                <div key={campaign.name} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.scans} scans · {campaign.reviews} reviews
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {Math.round((campaign.reviews / campaign.scans) * 100)}% cvr
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
