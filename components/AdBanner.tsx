"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  adSlot: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
}

export default function AdBanner({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  style = { display: "block" },
}: AdBannerProps) {
  const initialized = useRef(false);
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "7624075828918805";

  useEffect(() => {
    // Only initialize once per mount in strict mode
    if (initialized.current) return;
    initialized.current = true;

    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense initialization error:", e);
    }
  }, []);

  return (
    <div className="w-full min-h-[100px] flex items-center justify-center bg-neutral-950/40 border border-white/5 rounded-lg overflow-hidden my-4 p-2">
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={`ca-pub-${publisherId}`}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
}
