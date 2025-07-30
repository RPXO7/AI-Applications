import Link from "next/link"

const applications = [
  {
    name: "Chatbot",
    description: "Interactive AI chatbot powered by OpenAI and other LLM providers",
    href: "/chatbot",
    icon: "💬",
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Applications Suite
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A comprehensive collection of AI-powered applications including chatbot, text processing, OCR, classification, and Q&A systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-gray-300"
          >
            <div className="text-4xl mb-4">{app.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {app.name}
            </h3>
            <p className="text-gray-600">{app.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Powered by Leading AI Providers
          </h2>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span className="bg-white px-3 py-1 rounded-full">OpenAI</span>
            <span className="bg-white px-3 py-1 rounded-full">Google Gemini</span>
            <span className="bg-white px-3 py-1 rounded-full">Hugging Face</span>
            <span className="bg-white px-3 py-1 rounded-full">Replicate</span>
            <span className="bg-white px-3 py-1 rounded-full">LangChain.js</span>
            <span className="bg-white px-3 py-1 rounded-full">OpenRouter.ai</span>
          </div>
        </div>
      </div>
    </div>
  )
}
