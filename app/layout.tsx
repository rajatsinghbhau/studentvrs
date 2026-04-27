import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Studentverse AI — Neo-Quantum JEE/NEET Platform',
  description: 'Elite AI-powered JEE & NEET preparation platform with personalized coaching, gamification, and advanced analytics.',
  keywords: 'JEE, NEET, study, AI coach, test preparation, mock tests',
  authors: [{ name: 'Studentverse' }],
  openGraph: {
    title: 'Studentverse AI',
    description: 'Your quantum leap to IIT',
    type: 'website'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d1515'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
