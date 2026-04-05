import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Adsentify Privacy Policy — how we collect, use, and protect your data.",
};

const LAST_UPDATED = "March 14, 2026";
const CONTACT_EMAIL = "privacy@adsentify.com";
const APP_NAME = "Adsentify";
const APP_URL = "https://adsentify.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground">
            {APP_NAME}
          </Link>
          <Link href="/terms" className="text-sm text-muted hover:text-foreground transition-colors">
            Terms of Service →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground-2">
          <Section title="1. Introduction">
            <p>
              {APP_NAME} (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the website{" "}
              <a href={APP_URL} className="text-accent hover:underline">{APP_URL}</a>{" "}
              and the Adsentify SaaS platform (the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our Service.
            </p>
            <p>
              By using {APP_NAME}, you agree to the collection and use of information in accordance with this policy.
              If you do not agree, please discontinue use of the Service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <SubSection title="2.1 Information you provide">
              <ul>
                <li><strong>Account data:</strong> name, email address, and profile picture (via Google OAuth or email sign-in).</li>
                <li><strong>Billing data:</strong> payment information is processed and stored by Stripe. We store only Stripe customer IDs and subscription status — never raw card numbers.</li>
                <li><strong>User content:</strong> preferences, saved ads, folders, and alert configurations you create within the Service.</li>
              </ul>
            </SubSection>
            <SubSection title="2.2 Information collected automatically">
              <ul>
                <li><strong>Usage data:</strong> pages visited, features used, search queries, and session duration.</li>
                <li><strong>Device data:</strong> browser type, operating system, IP address, and referring URL.</li>
                <li><strong>Cookies:</strong> session cookies (for authentication) and analytics cookies (PostHog). See Section 7 for cookie details.</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use collected information to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Process transactions and send billing-related communications.</li>
              <li>Send transactional emails (sign-in links, alert notifications, brief delivery).</li>
              <li>Monitor and analyse usage to improve user experience.</li>
              <li>Detect and prevent fraud, abuse, or violations of our Terms.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p>We do not sell your personal data to third parties.</p>
          </Section>

          <Section title="4. Data Sharing">
            <p>We share your information only with the following categories of third parties:</p>
            <ul>
              <li><strong>Stripe</strong> — payment processing.</li>
              <li><strong>Resend</strong> — transactional email delivery.</li>
              <li><strong>Anthropic</strong> — AI generation features (ad content you submit for analysis is sent to the Anthropic API).</li>
              <li><strong>PostHog</strong> — product analytics (anonymised usage events).</li>
              <li><strong>Sentry</strong> — error tracking (stack traces and anonymised session data).</li>
              <li><strong>Vercel / Neon</strong> — hosting and database infrastructure.</li>
            </ul>
            <p>
              All sub-processors are bound by data processing agreements and applicable data protection laws.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you delete your account, we will
              delete or anonymise your personal data within 30 days, except where we are required to retain it for
              legal or compliance purposes (e.g., billing records for 7 years).
            </p>
          </Section>

          <Section title="6. Your Rights (GDPR / CCPA)">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate personal data.</li>
              <li><strong>Delete</strong> your personal data (&ldquo;right to be forgotten&rdquo;).</li>
              <li><strong>Port</strong> your data in a machine-readable format.</li>
              <li><strong>Object</strong> to or restrict certain processing.</li>
              <li><strong>Withdraw consent</strong> at any time for consent-based processing.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>.
              We will respond within 30 days.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>We use the following types of cookies:</p>
            <ul>
              <li>
                <strong>Strictly necessary:</strong> Session cookies required for authentication
                ({APP_NAME} uses NextAuth JWTs stored in httpOnly cookies). These cannot be disabled
                without breaking the Service.
              </li>
              <li>
                <strong>Analytics:</strong> PostHog cookies that help us understand feature usage and
                improve the product. These are only set after you accept analytics cookies in the cookie
                consent banner.
              </li>
            </ul>
            <p>You can manage cookie preferences at any time via the consent banner or your browser settings.</p>
          </Section>

          <Section title="8. Data Security">
            <p>
              We implement industry-standard security measures including TLS encryption in transit, encrypted
              database connections, and strict access controls. However, no method of transmission over the
              Internet is 100% secure and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="9. International Data Transfers">
            <p>
              {APP_NAME} is hosted on infrastructure in the United States. If you access the Service from
              outside the US, your data may be transferred to and processed in the US. We ensure adequate
              protections are in place via Standard Contractual Clauses where required.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              {APP_NAME} is not directed at children under 16. We do not knowingly collect personal data
              from children. If you believe a child has provided us with personal data, contact us and we
              will promptly delete it.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              email or by posting a notice in the Service. Continued use of the Service after changes
              constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For privacy-related questions or to exercise your rights, contact us at:{" "}
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

// ─── Layout helpers ───────────────────────────────────────────────────────────

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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-medium text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-foreground-2">{children}</div>
    </div>
  );
}
