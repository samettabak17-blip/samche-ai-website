import type { Metadata } from "next";
import "./globals.css";
import { SiteLocalizationProvider } from "./components/site-localization";

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SamChe AI Platform",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "SaaS",
  operatingSystem: "Web",
  url: "https://samche.ai/",
  description: "A multi-tenant AI SaaS platform for assistants, Instagram DM AI, knowledge, live conversations, and CRM lead workflows with controlled human intervention.",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://samche.ai"),
  title: { default: "SamChe AI Platform | Multi-Tenant AI SaaS", template: "%s | SamChe AI" },
  description: "SamChe AI is a multi-tenant SaaS platform for AI Assistants, Instagram DM AI, Knowledge Intelligence, Live Inbox, and CRM lead workflows.",
  applicationName: "SamChe AI Platform",
  category: "software",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/samche-ai-platform-favicon-v3.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/samche-ai-platform-favicon-16-v3.png", sizes: "16x16", type: "image/png" },
      { url: "/samche-ai-platform-favicon-32-v3.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/samche-ai-platform-favicon-v3.ico",
    apple: "/samche-ai-platform-apple-touch-v3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased">
        <SiteLocalizationProvider>{children}</SiteLocalizationProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }} />
      </body>
    </html>
  );
}
