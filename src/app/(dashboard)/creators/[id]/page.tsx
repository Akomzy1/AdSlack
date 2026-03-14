import type { Metadata } from "next";
import { CreatorProfile } from "./CreatorProfile";

export const metadata: Metadata = {
  title: "Creator Profile",
};

export default function CreatorProfilePage({ params }: { params: { id: string } }) {
  return <CreatorProfile creatorId={params.id} />;
}
