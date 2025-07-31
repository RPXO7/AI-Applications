import Link from "next/link"

const applications = [
  {
    name: "Basic Chatbot",
    description: "Simple AI chatbot with multiple provider fallbacks",
    href: "/chatbot",
    icon: "💬",
  },
  {
    name: "LangChain Chatbot",
    description: "Advanced chatbot with professional personas and memory",
    href: "/chatbot-enhanced",
    icon: "🧠",
  },
  {
    name: "Text Summarization",
    description: "Summarize long texts using advanced AI models",
    href: "/summarization",
    icon: "📝",
  },
  {
    name: "Image to Text (OCR)",
    description: "Extract text from images using OCR technology",
    href: "/ocr",
    icon: "🖼️",
  },
  {
    name: "Text Classification",
    description: "Classify and categorize text using machine learning",
    href: "/classification",
    icon: "🏷️",
  },
  {
    name: "Private Document Q&A (RAG)",
    description: "Upload documents and ask questions while keeping your data private",
    href: "/rag",
    icon: "🔒",
  },
  {
    name: "Question & Answer",
    description: "Get answers to your questions using AI-powered Q&A systems",
    href: "/qna",
    icon: "❓",
  },
]

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4" style={{ color: 'var(--foreground)' }}>
          AI Applications
        </h1>
        <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          A comprehensive collection of AI-powered applications including chatbot, text processing, OCR, classification, and Q&A systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {applications.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="block p-6 rounded-xl transition-all duration-300 card-shadow-lg transform hover:-translate-y-1"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="text-5xl mb-4" style={{ color: 'var(--primary)' }}>{app.icon}</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--card-foreground)' }}>
              {app.name}
            </h3>
            <p style={{ color: 'var(--muted-foreground)' }}>{app.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="p-8 rounded-xl gradient-bg text-white">
          <h2 className="text-3xl font-bold mb-4">
            Powered by Leading AI Providers
          </h2>
          <div className="flex flex-wrap justify-center gap-4 text-lg font-semibold">
            <span>OpenAI</span>
            <span>Google Gemini</span>
            <span>Hugging Face</span>
            <span>Replicate</span>
            <span>LangChain.js</span>
            <span>OpenRouter.ai</span>
          </div>
        </div>
      </div>
    </div>
  )
}
