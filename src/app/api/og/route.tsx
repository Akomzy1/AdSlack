import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

const TYPE_LABELS: Record<string, string> = {
  blog: "Article",
  compare: "Comparison",
  tool: "Free Tool",
  guide: "Guide",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title =
    searchParams.get("title")?.slice(0, 100) ?? "AI-Powered Ad Intelligence";
  const description =
    searchParams.get("description")?.slice(0, 130) ??
    "Discover winning ads before your competitors";
  const type = searchParams.get("type") ?? "default";
  const typeLabel = TYPE_LABELS[type];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#07080d",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(ellipse at 15% 50%, rgba(249,115,22,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(59,130,246,0.04) 0%, transparent 50%)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #f97316 0%, #fb923c 60%, transparent 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          {/* Top section */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Type badge */}
            {typeLabel && (
              <div
                style={{
                  display: "flex",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    background: "rgba(249,115,22,0.12)",
                    border: "1px solid rgba(249,115,22,0.25)",
                    color: "#fb923c",
                    padding: "7px 18px",
                    borderRadius: "100px",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {typeLabel}
                </div>
              </div>
            )}

            {/* Title */}
            <div
              style={{
                fontSize: title.length > 55 ? "42px" : "54px",
                fontWeight: 800,
                color: "#f9fafb",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: "22px",
                color: "#6b7280",
                lineHeight: 1.5,
                marginTop: "20px",
                fontWeight: 400,
              }}
            >
              {description.length > 110
                ? description.slice(0, 110) + "…"
                : description}
            </div>
          </div>

          {/* Bottom branding bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "28px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Logo + name */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  background: "#f97316",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "white",
                }}
              >
                A
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#f9fafb",
                    lineHeight: 1,
                  }}
                >
                  AdSlack
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginTop: "3px",
                  }}
                >
                  AI-Powered Ad Intelligence
                </div>
              </div>
            </div>

            {/* Key stats */}
            <div style={{ display: "flex", gap: "36px" }}>
              {[
                { value: "2M+", label: "Ads tracked" },
                { value: "4.9★", label: "Rating" },
                { value: "30 min", label: "Refresh rate" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#f97316",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
