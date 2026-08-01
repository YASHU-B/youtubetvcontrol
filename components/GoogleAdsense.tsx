import Script from "next/script";

interface GoogleAdsenseProps {
  pId?: string;
}

export default function GoogleAdsense({ pId }: GoogleAdsenseProps) {
  const publisherId = pId || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "7624075828918805";
  
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${publisherId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
