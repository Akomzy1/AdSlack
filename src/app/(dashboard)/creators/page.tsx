import type { Metadata } from "next";
import { CreatorsView } from "./CreatorsView";

export const metadata: Metadata = {
  title: "Creator Marketplace",
  description: "Find UGC creators to produce your next campaign.",
};

export default function CreatorsPage() {
  return <CreatorsView />;
}
