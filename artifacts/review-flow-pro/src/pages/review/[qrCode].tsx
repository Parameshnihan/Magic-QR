import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useGetPublicReviewPage, getGetPublicReviewPageQueryKey, useSubmitPublicReview, useRecordQrScan } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Building2, CheckCircle2, Copy, Check, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Step = "rating" | "loading_ai" | "positive_flow" | "negative_flow" | "copied" | "thank_you";

interface AiResult {
  keywords: string[];
  reviewTemplate: string;
}

export default function PublicReviewFlow() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [step, setStep] = useState<Step>("rating");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const submitReview = useSubmitPublicReview();
  const recordScan = useRecordQrScan();

  const { data: pageData, isLoading } = useGetPublicReviewPage(qrCode as string, {
    query: {
      enabled: !!qrCode,
      queryKey: getGetPublicReviewPageQueryKey(qrCode as string),
    },
  });

  useEffect(() => {
    if (qrCode) {
      recordScan.mutate({ qrCode, data: { deviceType: "web", userAgent: navigator.userAgent } });
    }
  }, [qrCode]);

  const fetchAiKeywords = useCallback(async (selectedRating: number) => {
    if (!pageData) return;
    setStep("loading_ai");
    try {
      const res = await fetch("/api/public/review/ai-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: pageData.businessName,
          businessCategory: pageData.businessCategory ?? "",
          rating: selectedRating,
        }),
      });
      const data: AiResult = await res.json();
      setAiResult(data);
      setReviewText(data.reviewTemplate ?? "");
    } catch {
      // Fallback if AI fails
      setAiResult({
        keywords: pageData.recommendedKeywords?.length ? pageData.recommendedKeywords : ["great service", "friendly staff", "highly recommend", "excellent quality", "professional team", "outstanding experience", "will return", "top rated"],
        reviewTemplate: `${pageData.businessName} provided an exceptional experience from start to finish. The team was professional and attentive. Highly recommend!`,
      });
      setReviewText(`${pageData.businessName} provided an exceptional experience from start to finish. The team was professional and attentive. Highly recommend!`);
    }
    setStep("positive_flow");
  }, [pageData]);

  const handleRatingSelect = (selected: number) => {
    setRating(selected);
    if (selected >= 4) {
      fetchAiKeywords(selected);
    } else {
      setStep("negative_flow");
    }
  };

  const toggleKeyword = (keyword: string) => {
    const isSelected = selectedKeywords.includes(keyword);
    const next = isSelected
      ? selectedKeywords.filter((k) => k !== keyword)
      : [...selectedKeywords, keyword];
    setSelectedKeywords(next);
  };

  const handleCopyAndGo = async () => {
    const text = reviewText.trim();
    if (!text) return;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setStep("copied");

    // Fire the submit in the background (we already have the googleReviewUrl from pageData)
    submitReview.mutate({ qrCode: qrCode as string, data: { rating, reviewText: text, keywords: selectedKeywords } });

    // Redirect immediately — must happen synchronously in a user-gesture handler
    const googleUrl = pageData?.googleReviewLink;
    if (googleUrl) {
      setTimeout(() => {
        window.open(googleUrl, "_blank", "noopener,noreferrer");
      }, 1200); // brief pause so user sees the "copied" confirmation
    } else {
      setTimeout(() => setStep("thank_you"), 2500);
    }
  };

  const handleNegativeSubmit = () => {
    submitReview.mutate(
      {
        qrCode: qrCode as string,
        data: {
          rating,
          feedbackText,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
        },
      },
      {
        onSuccess: () => setStep("thank_you"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3EFEC] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B4A1F]" />
      </div>
    );
  }

  if (!pageData || !pageData.isActive) {
    return (
      <div className="min-h-screen bg-[#F3EFEC] flex items-center justify-center p-4">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-[#7A6F68] mx-auto mb-4" />
          <p className="text-[#7A6F68]">This review page is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#F3EFEC] flex flex-col items-center p-4 pt-10 sm:pt-16">
      <motion.div
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-[#E5DFDA]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* ── Header ── */}
        <div className="bg-[#120700] px-8 pt-8 pb-7 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-4 overflow-hidden border-4 border-white/20">
            {pageData.logoUrl ? (
              <img src={pageData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-10 w-10 text-[#120700]" />
            )}
          </div>
          <h1 className="text-2xl font-serif font-bold text-white leading-tight">{pageData.businessName}</h1>
          {pageData.businessCategory && (
            <p className="text-white/50 mt-1 text-sm">{pageData.businessCategory}</p>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-6 sm:p-8 relative min-h-[320px]">
          <AnimatePresence mode="wait">

            {/* Step: Rating */}
            {step === "rating" && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="flex flex-col items-center"
              >
                <h2 className="text-xl font-semibold mb-2 text-center text-[#120700]">How was your experience?</h2>
                <p className="text-sm text-[#7A6F68] mb-8 text-center">Your honest rating helps us serve you better.</p>
                <div className="flex gap-1.5 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRatingSelect(star)}
                    >
                      <Star
                        className={`h-13 w-13 sm:h-14 sm:w-14 transition-all duration-100 ${
                          (hoverRating || rating) >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-[#E5DFDA] fill-[#E5DFDA]"
                        }`}
                        style={{ width: 52, height: 52 }}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#7A6F68]/60 text-center">Tap a star to continue</p>
              </motion.div>
            )}

            {/* Step: AI Loading */}
            {step === "loading_ai" && (
              <motion.div
                key="loading_ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-5"
              >
                <div className="relative">
                  <Sparkles className="h-10 w-10 text-[#8B4A1F]" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[#8B4A1F]/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[#120700]">Generating recommendations...</p>
                  <p className="text-sm text-[#7A6F68] mt-1">AI is crafting keywords for your review</p>
                </div>
              </motion.div>
            )}

            {/* Step: Positive Flow */}
            {step === "positive_flow" && aiResult && (
              <motion.div
                key="positive"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="flex justify-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} style={{ width: 18, height: 18 }}
                        className={rating >= s ? "fill-yellow-400 text-yellow-400" : "text-[#E5DFDA] fill-[#E5DFDA]"} />
                    ))}
                  </div>
                  <h2 className="text-lg font-semibold text-[#120700]">Choose keywords that match your experience</h2>
                  <p className="text-xs text-[#7A6F68] mt-1">Select what resonated with you — your review text updates automatically.</p>
                </div>

                {/* AI keyword chips */}
                <div className="flex flex-wrap gap-2">
                  {aiResult.keywords.map((keyword) => {
                    const active = selectedKeywords.includes(keyword);
                    return (
                      <button
                        key={keyword}
                        onClick={() => {
                          toggleKeyword(keyword);
                          // Auto-inject keyword into review text
                          if (!active) {
                            setReviewText((prev) => {
                              const base = prev.trim();
                              return base ? `${base} ${keyword}.` : `${keyword}.`;
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 font-medium ${
                          active
                            ? "bg-[#8B4A1F] text-white border-[#8B4A1F] shadow-sm"
                            : "bg-white text-[#120700] border-[#E5DFDA] hover:border-[#8B4A1F]/50"
                        }`}
                      >
                        {keyword}
                      </button>
                    );
                  })}
                </div>

                {/* Review text editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[#7A6F68]">Your review (edit freely)</Label>
                    <span className="text-xs text-[#7A6F68]/60">{reviewText.length} chars</span>
                  </div>
                  <Textarea
                    placeholder="Your review will appear here..."
                    className="min-h-[110px] resize-none text-sm border-[#E5DFDA] focus:border-[#8B4A1F] focus:ring-[#8B4A1F]/20"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <p className="text-xs text-[#7A6F68]/70 leading-relaxed">
                    Copy this text, then paste it when Google opens.
                  </p>
                </div>

                <Button
                  className="w-full h-13 text-base font-semibold bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl flex items-center justify-center gap-2"
                  style={{ height: 52 }}
                  onClick={handleCopyAndGo}
                  disabled={!reviewText.trim() || submitReview.isPending}
                >
                  <Copy className="h-4 w-4" />
                  Copy Review &amp; Open Google
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step: Copied — brief confirmation before redirect */}
            {step === "copied" && (
              <motion.div
                key="copied"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 gap-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, delay: 0.1 }}
                >
                  <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                </motion.div>
                <div>
                  <p className="font-semibold text-[#120700] text-lg">Review copied to clipboard!</p>
                  <p className="text-sm text-[#7A6F68] mt-1">Opening Google Reviews — paste your text there.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#7A6F68]/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Redirecting...
                </div>
              </motion.div>
            )}

            {/* Step: Negative Flow */}
            {step === "negative_flow" && (
              <motion.div
                key="negative"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="flex justify-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} style={{ width: 18, height: 18 }}
                        className={rating >= s ? "fill-yellow-400 text-yellow-400" : "text-[#E5DFDA] fill-[#E5DFDA]"} />
                    ))}
                  </div>
                  <h2 className="text-lg font-semibold text-[#120700]">We're sorry to hear that.</h2>
                  <p className="text-sm text-[#7A6F68] mt-1">Your feedback goes directly to the management team — not public.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">What went wrong? <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="Please share what could be improved..."
                    className="min-h-[100px] resize-none border-[#E5DFDA]"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7A6F68]">Your name (optional)</Label>
                    <Input
                      placeholder="Jane Smith"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="border-[#E5DFDA]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7A6F68]">Phone (optional)</Label>
                    <Input
                      placeholder="+1 555 000 0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="border-[#E5DFDA]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#7A6F68]">Email (optional — for follow-up)</Label>
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="border-[#E5DFDA]"
                  />
                </div>

                <Button
                  className="w-full h-12 bg-[#8B4A1F] hover:bg-[#7a3e18] text-white rounded-xl font-semibold"
                  onClick={handleNegativeSubmit}
                  disabled={submitReview.isPending || !feedbackText.trim()}
                >
                  {submitReview.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>
                  ) : (
                    "Send Feedback to Management"
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step: Thank You */}
            {step === "thank_you" && (
              <motion.div
                key="thank_you"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-10 gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
                >
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#120700]">Thank you!</h2>
                  <p className="text-[#7A6F68] mt-2 text-sm leading-relaxed">
                    {rating >= 4
                      ? "Your review means a lot. We hope to see you again soon."
                      : "Your feedback has been shared with the management team. We are committed to making this right."}
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-6 text-center text-xs text-[#7A6F68]/40">
        Powered by Advento Magic QR
      </div>
    </div>
  );
}
