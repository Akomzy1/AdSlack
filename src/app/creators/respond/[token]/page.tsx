/**
 * Public creator response page.
 * No authentication required — accessed via the token in the email link.
 * Route: /creators/respond/[token]
 */

import type { Metadata } from "next";
import { CreatorRespondView } from "./CreatorRespondView";

export const metadata: Metadata = {
  title: "Respond to Brief — Adsentify",
};

export default function CreatorRespondPage({ params }: { params: { token: string } }) {
  return <CreatorRespondView token={params.token} />;
}
