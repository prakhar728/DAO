import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Governance App',
  description: 'Created with Governance',
  generator: 'Governance.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
