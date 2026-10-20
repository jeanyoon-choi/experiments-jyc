import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCC",
  description: "A localhost-first multi-device web artwork experiment!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Marks the exp-jyc alias before paint so static navigation pages
            show its label; see foundations/navigation HomeBrand. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(location.hostname==="exp-jyc.vercel.app")document.documentElement.dataset.sccHost="exp-jyc"`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
