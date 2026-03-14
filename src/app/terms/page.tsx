import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "AdSlack Terms of Service — the rules and conditions for using our platform.",
};

const LAST_UPDATED  = "March 14, 2026";
const CONTACT_EMAIL = "legal@adslack.com";
const APP_NAME      = "AdSlack";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground">
            {APP_NAME}
          </Link>
          <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using {APP_NAME} (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of
              Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service.
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              {APP_NAME} is an AI-powered ad intelligence platform that allows users to discover, analyse,
              and remix advertising creative. Features include ad search and discovery, AI-generated ad anatomy
              breakdowns, creative remixing tools, velocity scoring, and creator brief management.
              Access to specific features is determined by your subscription tier.
            </p>
          </Section>

          <Section title="3. Accounts and Subscriptions">
            <ul>
              <li>You must provide accurate account information and keep it up to date.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>
                Subscriptions (PRO, SCALE, AGENCY) are billed monthly in advance via Stripe.
                Downgrades take effect at the end of the current billing period; upgrades take effect immediately.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in
                fraudulent activity.
              </li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Scrape, copy, or systematically extract data from the Service without written permission.</li>
              <li>
                Use the Service to create, distribute, or promote deceptive, misleading, or illegal advertising.
              </li>
              <li>Attempt to reverse-engineer, decompile, or discover the source code of the Service.</li>
              <li>
                Use automated tools (bots, spiders, scrapers) to access the Service beyond normal usage.
              </li>
              <li>Share your account credentials or allow others to use your account.</li>
              <li>
                Violate any applicable law, regulation, or the rights of any third party.
              </li>
            </ul>
          </Section>

          <Section title="5. AI-Generated Content">
            <p>
              {APP_NAME} uses large language models (Anthropic Claude) to generate ad anatomy breakdowns,
              creative briefs, hook alternatives, and scripts. You acknowledge that:
            </p>
            <ul>
              <li>AI-generated content may contain errors or inaccuracies.</li>
              <li>
                You are responsible for reviewing, editing, and verifying any AI-generated output before use.
              </li>
              <li>
                {APP_NAME} makes no warranties regarding the accuracy, originality, or fitness for purpose of
                AI-generated content.
              </li>
              <li>
                Content you submit for AI analysis (ad copy, scripts, briefs) is sent to Anthropic&apos;s API
                and subject to their usage policies.
              </li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The {APP_NAME} platform, including its software, design, and original content, is owned by us and
              protected by intellectual property laws. Nothing in these Terms grants you any right in our IP
              other than the limited licence to use the Service.
            </p>
            <p>
              Ad creative displayed in the library is owned by the respective advertisers. {APP_NAME} aggregates
              publicly available advertising data for research and intelligence purposes.
            </p>
            <p>
              AI-generated outputs created using your inputs are yours to use, subject to the limitations in
              Section 5.
            </p>
          </Section>

          <Section title="7. Credits and Usage Limits">
            <p>
              Each subscription tier includes a monthly credit allotment for AI-powered features.
              Credits reset at the start of each billing cycle and do not roll over.
              Unused credits are forfeited upon plan downgrade or cancellation.
            </p>
          </Section>

          <Section title="8. Payments and Refunds">
            <p>
              All fees are charged in USD. Prices may change with 30 days&apos; notice. Subscription fees are
              non-refundable except where required by law. If you cancel, you retain access until the end of
              the paid period.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              OR THAT DEFECTS WILL BE CORRECTED.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {APP_NAME.toUpperCase()} SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS
              OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY. OUR AGGREGATE LIABILITY FOR ANY CLAIM
              ARISING FROM USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS
              PRECEDING THE CLAIM.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              You may cancel your account at any time via the Billing page. We may suspend or terminate your
              access immediately if you violate these Terms, without liability or prior notice.
              On termination, your right to use the Service ceases immediately.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without regard to
              conflict of law principles. Disputes shall be resolved by binding arbitration in accordance with
              the rules of the American Arbitration Association, except that either party may seek injunctive
              relief in court.
            </p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>
              We may update these Terms at any time. We will notify you of material changes via email or
              an in-app notice at least 14 days before they take effect. Continued use of the Service
              after the effective date constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions about these Terms?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        <p>
          © {new Date().getFullYear()} {APP_NAME} ·{" "}
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground-2">{children}</div>
    </section>
  );
}
