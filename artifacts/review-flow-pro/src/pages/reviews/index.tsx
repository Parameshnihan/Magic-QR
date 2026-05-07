import React from "react";
import { useListReviews } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Star, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Reviews() {
  const { data, isLoading } = useListReviews();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold tracking-tight">Reviews</h2>
        <p className="text-muted-foreground">Track positive reviews generated across all campaigns.</p>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:w-80 md:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search reviews..." className="pl-8" />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rating</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center text-yellow-500">
                      <span className="font-bold mr-1 text-foreground">{review.rating}</span>
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{review.clientName}</TableCell>
                  <TableCell>
                    <div className="max-w-[400px] truncate text-sm">
                      {review.reviewText || <span className="italic text-muted-foreground">No text provided</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {review.redirectedToGoogle ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Redirected to Google
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Left flow</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
