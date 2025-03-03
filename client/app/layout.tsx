import type { Metadata } from "next";
import "./globals.css";
import ContextProvider from "@/context";
import { headers } from "next/headers";
import Header from "@/components/header/header";

export const metadata: Metadata = {
  title: "Governance App",
  description: "Created with Governance",
  generator: "Governance.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const headersObj = headers();
  const cookies = headersObj.get('cookie')


  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>
          <Header />
          {children}
          </ContextProvider>
      </body>
    </html>
  );
}
