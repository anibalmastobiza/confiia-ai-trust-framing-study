import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "jspsych/css/jspsych.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : undefined;

  return {
    title: "CONFIIA / Study 01 — Trust in Medical AI",
    description:
      "A two-minute jsPsych study of how one sentence shapes trust in an AI-assisted diagnostic system.",
    metadataBase: origin ? new URL(origin) : undefined,
    openGraph: {
      title: "Would you trust this AI-assisted diagnostic system?",
      description:
        "Read one sentence and share your impression in a two-minute CONFIIA study.",
      type: "website",
      images: origin ? [`${origin}/og.png`] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "CONFIIA / Study 01",
      description: "A two-minute study of trust in medical AI.",
      images: origin ? [`${origin}/og.png`] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
