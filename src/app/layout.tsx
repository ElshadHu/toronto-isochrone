import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TRPCReactProvider } from '@/trpc/client'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Toronto Isochrone — Transit Reachability Map',
  description:
    'Interactive map showing transit reachability from every TTC subway station in 15, 30, or 60 minutes.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}
