import type { Metadata } from "next";
import { DiscoverView } from "./DiscoverView";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find winning ads across Meta and TikTok.",
};

export default function DiscoverPage() {
  return <DiscoverView />;
}
