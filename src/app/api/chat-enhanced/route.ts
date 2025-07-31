import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { ConversationSummaryBufferMemory } from "langchain/memory"
import { ConversationChain } from "langchain/chains"
import { ChatMessage } from "@/types"
import { GoogleGenerativeAI } from "@google/generative-ai"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY
console.log("OPENROUTER_API_KEY", OPENROUTER_API_KEY)
console.log("OPENAI_API_KEY", OPENAI_API_KEY)
console.log("GOOGLE_GEMINI_API_KEY", GOOGLE_GEMINI_API_KEY)

// --- LangChain Configuration ---
const model = new ChatOpenAI({
  openAIApiKey: OPENROUTER_API_KEY,
  modelName: "openai/gpt-3.5-turbo", // Using a more reliable model
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
      "X-Title": "AI Applications Demo",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    }
  },
  streaming: true,
  temperature: 0.7,
  maxRetries: 3,
})

// --- Professional Prompt Templates ---
const AI_PERSONAS = {
  developer: {
    name: "Developer Assistant",
    displayName: "👨‍💻 Developer Assistant",
    systemPrompt: `You are an expert software developer with 10+ years of experience across multiple programming languages and frameworks.

Your expertise includes:
- Full-stack development (Frontend: React, Vue, Angular | Backend: Node.js, Python, Java)
- Database design and optimization
- System architecture and design patterns
- DevOps and deployment strategies
- Code review and best practices

Always provide:
1. Clear, actionable solutions
2. Code examples with comments
3. Best practices and potential pitfalls
4. Performance considerations
5. Testing recommendations

Communicate in a professional yet friendly manner. Ask clarifying questions when needed.`
  },
  
  creative: {
    name: "Creative Assistant",
    displayName: "🎨 Creative Assistant", 
    systemPrompt: `You are a creative professional with expertise in writing, design, and content creation.

Your specialties include:
- Creative writing (stories, scripts, poetry)
- Content marketing and copywriting  
- Brand strategy and messaging
- Design thinking and user experience
- Social media content creation

Always provide:
1. Original, engaging content
2. Multiple creative options when possible
3. Reasoning behind creative decisions
4. Actionable next steps
5. Industry best practices

Be inspiring, innovative, and help users think outside the box.`
  },

  analyst: {
    name: "Business Analyst",
    displayName: "📊 Business Analyst",
    systemPrompt: `You are a senior business analyst with expertise in data analysis, strategy, and business intelligence.

Your core competencies:
- Data analysis and interpretation
- Business process optimization
- Strategic planning and market analysis
- Financial modeling and projections
- Risk assessment and mitigation

Always provide:
1. Data-driven insights
2. Clear recommendations with rationale
3. Risk-benefit analysis
4. Implementation roadmaps
5. Key performance indicators (KPIs)

Communicate with precision, clarity, and business acumen.`
  },

  general: {
    name: "AI Assistant",
    displayName: "🤖 AI Assistant",
    systemPrompt: `You are a knowledgeable and helpful AI assistant designed to provide accurate, well-structured responses across various topics.

Your approach:
- Provide comprehensive yet concise answers
- Structure information clearly with headers, lists, and examples
- Admit when you don't know something
- Ask clarifying questions when needed
- Maintain a friendly and professional tone

Always strive to be helpful, accurate, and educational in your responses.`
  }
}

// --- Dynamic Prompt Template ---
const createPromptTemplate = (persona: keyof typeof AI_PERSONAS) => {
  return ChatPromptTemplate.fromMessages([
    ["system", AI_PERSONAS[persona].systemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{input}"]
  ])
}

// --- Memory Management with LangChain ---
const conversationMemories = new Map()

async function getOrCreateMemory(sessionId: string) {
  if (!conversationMemories.has(sessionId)) {
    console.log("Creating new memory for session:", sessionId)
    // Using ConversationSummaryBufferMemory for better conversation context
    const memory = new ConversationSummaryBufferMemory({
      llm: model,
      maxTokenLimit: 2000, // Limit memory to prevent token overflow
      returnMessages: true,
      memoryKey: "history",
      humanPrefix: "User",
      aiPrefix: "Assistant",
      inputKey: "input",
      outputKey: "response"
    })
    conversationMemories.set(sessionId, memory)
    
    // Initialize memory with a system message
    await memory.saveContext(
      { input: "System: Conversation started" },
      { response: "Assistant: Hello! I'm ready to help you today." }
    )
  } else {
    console.log("Using existing memory for session:", sessionId)
    const memory = conversationMemories.get(sessionId)
    // Log current memory state for debugging
    const history = await memory.loadMemoryVariables({})
    console.log("Current memory state:", history)
  }
  return conversationMemories.get(sessionId)
}

// --- Gemini Fallback with ReadableStream ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

async function tryGeminiFallback(messages: ChatMessage[], persona: string): Promise<ReadableStream> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured")
    }

    const gemini = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const personaPrompt = AI_PERSONAS[persona as keyof typeof AI_PERSONAS]?.systemPrompt || AI_PERSONAS.general.systemPrompt
    const lastMessage = messages[messages.length - 1]
    
    const prompt = `${personaPrompt}\n\nUser: ${lastMessage.content}\n\nAssistant:`
    
    const result = await gemini.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Create a simple ReadableStream that sends the entire response at once
    return new ReadableStream({
      start(controller) {
        try {
          // Send the entire response as a single chunk to avoid encoding issues
          const encoder = new TextEncoder()
          const encoded = encoder.encode(text)
          controller.enqueue(encoded)
          controller.close()
        } catch (error) {
          console.error("Stream creation error:", error)
          // Send a fallback message if encoding fails
          const fallbackMessage = "I'm here to help! Please try your question again."
          const encoder = new TextEncoder()
          const encoded = encoder.encode(fallbackMessage)
          controller.enqueue(encoded)
          controller.close()
        }
      }
    })
  } catch (error) {
    console.error("Gemini fallback failed:", error)
    throw new Error("All AI services are currently unavailable")
  }
}

// --- Enhanced Chat Handler with LangChain Features ---
export async function POST(req: NextRequest) {
  try {
    const { messages, persona = 'general', sessionId = 'default' } = await req.json()

    // Check if we have any available API keys
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const openAIKey = process.env.OPENAI_API_KEY
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY
    
    if ((!openRouterKey || openRouterKey === "your_openrouter_api_key_here") && 
        (!openAIKey || openAIKey === "your_openai_api_key_here") &&
        (!geminiKey || geminiKey === "your_gemini_api_key_here")) {
      return new Response("No API keys configured. Please add OPENROUTER_API_KEY, OPENAI_API_KEY, or GOOGLE_GEMINI_API_KEY to .env.local", { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Try LangChain first, fallback to Gemini if it fails
    try {
      console.log("🔄 Using LangChain with conversation memory and persona:", persona)
      
      // Get the current message
      const currentMessage = messages[messages.length - 1]
      
      // Get conversation memory (LangChain feature)
      const memory = await getOrCreateMemory(sessionId)
      
      // Create conversation chain with selected persona (LangChain feature)
      const prompt = createPromptTemplate(persona)
      console.log("Using persona prompt:", AI_PERSONAS[persona as keyof typeof AI_PERSONAS].name)
      
      // Save the current message to memory before processing
      await memory.saveContext(
        { input: currentMessage.content },
        { response: "Processing..." }
      )
      
      const chain = new ConversationChain({
        llm: model,
        prompt,
        memory, // This is the key LangChain feature - conversation memory
        verbose: true, // Enable verbose mode to see what's happening
        outputKey: "response" // Match the memory configuration
      })
      
      // Get streaming response from LangChain
      const stream = await chain.stream({
        input: currentMessage.content
      })

      // Create readable stream for the response
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                if (chunk.response) {
                  controller.enqueue(new TextEncoder().encode(chunk.response))
                }
              }
              controller.close()
            } catch (error) {
              console.error("Streaming error:", error)
              controller.error(error)
            }
          },
        }),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-AI-Persona": AI_PERSONAS[persona as keyof typeof AI_PERSONAS].name,
            "X-LangChain-Features": "Conversation Memory, Dynamic Prompts, Streaming"
          },
        }
      )
    } catch (error) {
      console.log("⚠️ LangChain failed, trying Gemini fallback...", error)
      
      try {
        // Fallback to Gemini with ReadableStream
        const geminiStream = await tryGeminiFallback(messages, persona)
        
        return new Response(geminiStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-AI-Persona": AI_PERSONAS[persona as keyof typeof AI_PERSONAS].name,
            "X-Fallback": "Gemini"
          },
        })
      } catch (geminiError) {
        console.error("Gemini fallback also failed:", geminiError)
        
        // Final fallback - return a simple error message
        return new Response(
          "I'm having trouble connecting to the AI services right now. Please try again in a moment.",
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              "X-AI-Persona": AI_PERSONAS[persona as keyof typeof AI_PERSONAS].name,
              "X-Fallback": "Error"
            },
          }
        )
      }
    }

  } catch (error: unknown) {
    console.error("Enhanced chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(`Error: ${errorMessage}`, { status: 500 })
  }
}
