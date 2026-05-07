import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetPublicReviewPage, getGetPublicReviewPageQueryKey, useSubmitPublicReview, useRecordQrScan } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PublicReviewFlow() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [step, setStep] = useState<'rating' | 'positive_flow' | 'negative_flow' | 'thank_you'>('rating');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const submitReview = useSubmitPublicReview();
  const recordScan = useRecordQrScan();

  const { data: pageData, isLoading } = useGetPublicReviewPage(qrCode as string, {
    query: {
      enabled: !!qrCode,
      queryKey: getGetPublicReviewPageQueryKey(qrCode as string),
    }
  });

  useEffect(() => {
    if (qrCode) {
      // Record the scan in background
      recordScan.mutate({ data: { deviceType: 'web', userAgent: navigator.userAgent } });
    }
  }, [qrCode]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!pageData || !pageData.isActive) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Campaign not found or inactive.</div>;
  }

  const handleRatingSelect = (selected: number) => {
    setRating(selected);
    if (selected >= 4) {
      setStep('positive_flow');
    } else {
      setStep('negative_flow');
    }
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
    );
    
    // Auto-append to review text
    if (!selectedKeywords.includes(keyword)) {
      setReviewText(prev => prev ? `${prev} ${keyword}` : keyword);
    }
  };

  const handlePositiveSubmit = () => {
    submitReview.mutate({
      data: {
        rating,
        reviewText,
        keywords: selectedKeywords,
      }
    }, {
      onSuccess: (res) => {
        if (res.googleReviewUrl) {
          window.location.href = res.googleReviewUrl;
        } else {
          setStep('thank_you');
        }
      }
    });
  };

  const handleNegativeSubmit = () => {
    submitReview.mutate({
      data: {
        rating,
        feedbackText,
        customerName,
        customerPhone,
      }
    }, {
      onSuccess: () => {
        setStep('thank_you');
      }
    });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center p-4 pt-12 sm:pt-20">
      <motion.div 
        className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="bg-sidebar p-8 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-4 overflow-hidden border-4 border-sidebar-accent">
            {pageData.logoUrl ? (
              <img src={pageData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-10 w-10 text-sidebar" />
            )}
          </div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">{pageData.businessName}</h1>
          <p className="text-sidebar-foreground/70 mt-1 text-sm">{pageData.businessCategory}</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 relative min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {step === 'rating' && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center"
              >
                <h2 className="text-xl font-semibold mb-8 text-center text-foreground">How was your experience?</h2>
                <div className="flex gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRatingSelect(star)}
                    >
                      <Star 
                        className={`h-12 w-12 sm:h-14 sm:w-14 transition-colors ${
                          (hoverRating || rating) >= star 
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" 
                            : "text-muted-foreground/30"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground text-center">Tap a star to rate</p>
              </motion.div>
            )}

            {step === 'positive_flow' && (
              <motion.div
                key="positive"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Thank you! 🎉</h2>
                  <p className="text-sm text-muted-foreground">Please share your experience on Google.</p>
                </div>

                {pageData.recommendedKeywords?.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Tap keywords to build your review:</Label>
                    <div className="flex flex-wrap gap-2">
                      {pageData.recommendedKeywords.map(keyword => (
                        <Badge 
                          key={keyword}
                          variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                          className="cursor-pointer py-1.5 px-3 text-sm"
                          onClick={() => toggleKeyword(keyword)}
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea 
                    placeholder="Write your review here... (Optional)"
                    className="min-h-[100px] resize-none"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full text-lg h-14 bg-[#4285F4] hover:bg-[#3367D6] text-white"
                  onClick={handlePositiveSubmit}
                  disabled={submitReview.isPending}
                >
                  {submitReview.isPending ? "Processing..." : "Post to Google"}
                </Button>
              </motion.div>
            )}

            {step === 'negative_flow' && (
              <motion.div
                key="negative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-2">We're sorry to hear that.</h2>
                  <p className="text-sm text-muted-foreground">Please tell us how we can improve. Your feedback goes directly to management.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>What went wrong?</Label>
                    <Textarea 
                      placeholder="Please share details so we can fix it..."
                      className="min-h-[100px] resize-none"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name (Optional)</Label>
                      <Input 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone (Optional)</Label>
                      <Input 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full text-lg h-12 mt-4"
                  onClick={handleNegativeSubmit}
                  disabled={submitReview.isPending || !feedbackText}
                >
                  {submitReview.isPending ? "Sending..." : "Send Feedback"}
                </Button>
              </motion.div>
            )}

            {step === 'thank_you' && (
              <motion.div
                key="thank_you"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle2 className="h-24 w-24 text-green-500 mb-6" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                <p className="text-muted-foreground">We appreciate you taking the time to share your feedback.</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-sm text-muted-foreground opacity-50">
        Powered by ReviewFlow Pro
      </div>
    </div>
  );
}
