import Link from "next/link"

const navLinks = [
  { href: "/chatbot", label: "Chatbot" },
  { href: "/summarization", label: "Summarization" },
  { href: "/ocr", label: "Image to Text (OCR)" },
  { href: "/classification", label: "Text Classification" },
  { href: "/qna", label: "Q&A" },
]

export default function Navigation() {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-gray-800">
            AI Suite
          </Link>
          <div className="hidden md:flex space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-gray-800 transition-colors"
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

