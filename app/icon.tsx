import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            height: 52,
            width: 52,
            borderRadius: 14,
            background: "#0f8a83",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
