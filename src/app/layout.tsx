import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap"
})

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap"
})

export const metadata: Metadata = {
  title: "AI Applications",
  description: "A comprehensive suite of AI-powered applications including chatbot, text summarization, OCR, classification, and Q&A",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mono.variable} antialiased min-h-screen`}
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}