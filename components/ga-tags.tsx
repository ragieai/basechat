"use client";

import Script from "next/script";

export const GaTags = ({ gaKey }: { gaKey?: string }) => {
  if (!gaKey) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaKey}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${gaKey}');
        `}
      </Script>
    </>
  );
};
