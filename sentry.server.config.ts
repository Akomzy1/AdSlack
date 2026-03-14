import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Server: higher sample rate for errors, low for traces
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Log to console in development
    debug: process.env.NODE_ENV === "development",

    // Scrub sensitive data before sending to Sentry
    beforeSend(event) {
      // Remove Authorization headers from request breadcrumbs
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}
