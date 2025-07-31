import Link from "next/link"

const navLinks = [
  { href: "/chatbot", label: "Basic Chatbot" },
  { href: "/chatbot-enhanced", label: "LangChain Chatbot" },
  { href: "/summarization", label: "Summarization" },
  { href: "/ocr", label: "OCR" },
  { href: "/classification", label: "Classification" },
  { href: "/rag", label: "RAG (Private)" },
  { href: "/qna", label: "Q&A" },
]

export default function Navigation() {
  return (
    <nav style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }} className="shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="text-2xl font-bold transition-colors hover:opacity-80"
            style={{ color: 'var(--primary)' }}
          >
            AI Applications
          </Link>
          <div className="hidden md:flex space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 nav-link"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

