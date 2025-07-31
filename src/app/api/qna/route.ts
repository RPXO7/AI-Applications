import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { QnAResult } from "@/types"

// --- LangChain Configuration ---
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  modelName: "openai/gpt-3.5-turbo", // Using a more reliable model for Q&A
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
      "X-Title": "AI Applications Demo",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    }
  },
  temperature: 0.2, // Lower temperature for more factual answers
  maxRetries: 3
})

// --- Q&A Prompt Template ---
const qaPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a highly knowledgeable Q&A assistant. Your goal is to provide accurate, concise, and well-structured answers to the user's questions. If you don't know the answer, say so. 

Here are your instructions:
1.  **Analyze the question**: Understand the user's intent and what they are asking.
2.  **Provide a direct answer**: Start with a direct answer to the question.
3.  **Elaborate with details**: Provide additional context, examples, or explanations to support your answer.
4.  **Structure your response**: Use lists, bullet points, and bolding to make the information easy to digest.
5.  **Be concise**: Do not provide irrelevant information.
6.  **Maintain a professional tone**: Be helpful, polite, and respectful.`,
  ],
  ["human", "Question: {question}\n\nContext (if any):\n{context}"],
])

const qaChain = qaPrompt.pipe(llm)

// --- Main API Route ---
export async function POST(req: NextRequest) {
  try {
    const { question, context = "" } = await req.json()

    if (!question || typeof question !== "string") {
      return Response.json({ success: false, error: "Question is required" }, { status: 400 })
    }

    // Validate API key
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey || openRouterKey === "your_openrouter_api_key_here") {
      console.error("OpenRouter API key not configured properly")
      return Response.json(
        { 
          success: false, 
          error: "OpenRouter API key not configured. Please add OPENROUTER_API_KEY to .env.local"
        }, 
        { status: 400 }
      )
    }
    
    console.log("Using OpenRouter API for Q&A...")

    const result = await qaChain.invoke({ question, context })

    const qnaResult: QnAResult = {
      question,
      answer: result.content as string,
      context,
      confidence: 95, // Placeholder confidence
    }

    return Response.json({ success: true, data: qnaResult })

  } catch (error: unknown) {
    console.error("Q&A API error:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return Response.json(
      { 
        success: false, 
        error: `Server error: ${errorMessage}`,
        details: error instanceof Error && error.cause ? error.cause : undefined
      },
      { status: 500 }
    )
  }
}