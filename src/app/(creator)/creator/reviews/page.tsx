"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { name: string | null; image: string | null };
  brief: { briefType: string; productName: string } | null;
}

interface Summary {
  avgRating: number;
  reviewCount: number;
  completedBriefs: number;
  distribution: Record<string, number>;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const fontSize = size === "lg" ? "text-2xl" : "text-sm";
  return (
    <div className={`flex items-center gap-0.5 ${fontSize}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= Math.round(rating) ? "#f59e0b" : "#374151" }}>★</span>
      ))}
    </div>
  );
}

const BRIEF_TYPE_LABELS: Record<string, string> = {
  UGC_SCRIPT: "UGC Script",
  STORYBOARD: "Storyboard",
  CREATIVE_BRIEF: "Creative Brief",
  CUSTOM: "Custom",
};

export default function CreatorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creator/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setReviews(data.reviews ?? []);
          setSummary(data.summary);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>What brands are saying about your work</p>
      </div>

      {/* Summary card */}
      {summary && (
        <div
          className="mb-8 rounded-2xl border p-6"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          <div className="flex items-start gap-8 flex-wrap">
            {/* Big rating */}
            <div className="text-center">
              <p className="text-5xl font-bold text-white">
                {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—"}
              </p>
              <Stars rating={summary.avgRating} size="lg" />
              <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>
                {summary.reviewCount} review{summary.reviewCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 min-w-[180px] space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[star] ?? 0;
                const pct = summary.reviewCount > 0 ? (count / summary.reviewCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs w-6 text-right" style={{ color: "#9ca3af" }}>{star}★</span>
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: "#1a1d2e" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: "#f59e0b" }}
                      />
                    </div>
                    <span className="text-xs w-4" style={{ color: "#6b7280" }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Completed briefs */}
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{summary.completedBriefs}</p>
              <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Completed Briefs</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="rounded-2xl border py-16 text-center" style={{ borderColor: "#1a1d2e" }}>
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm font-medium text-white">No reviews yet</p>
          <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Complete briefs to start receiving reviews from brands</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border p-5"
              style={{
                background: "linear-gradient(145deg, #0f1019, #12141f)",
                borderColor: "#1a1d2e",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {review.reviewer.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.reviewer.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "#1a1d2e" }}>
                      {review.reviewer.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{review.reviewer.name ?? "Anonymous"}</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Stars rating={review.rating} />
                  {review.brief && (
                    <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "#06b6d422", color: "#06b6d4" }}>
                      {BRIEF_TYPE_LABELS[review.brief.briefType] ?? review.brief.briefType}
                    </span>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                  &ldquo;{review.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
