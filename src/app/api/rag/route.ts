import { NextRequest } from "next/server"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OpenAIEmbeddings } from "@langchain/openai"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { formatDocumentsAsString } from "langchain/util/document"
import * as pdfjsLib from 'pdf-parse'
import mammoth from 'mammoth'

// --- In-Memory Vector Store (for privacy) ---
let vectorStore: MemoryVectorStore | null = null
let documentCount = 0

// --- Document Processing Functions ---

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  if (file.type === 'application/pdf') {
    const data = await pdfjsLib.default(buffer)
    return data.text
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } else if (file.type === 'text/plain') {
    return buffer.toString('utf-8')
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.')
  }
}

async function processDocument(text: string, filename: string) {
  // Initialize embeddings (using OpenRouter for cost-effectiveness)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  })

  // Split text into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })

  const docs = await textSplitter.createDocuments([text], [{ source: filename }])

  // Create or update vector store
  if (!vectorStore) {
    vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings)
  } else {
    await vectorStore.addDocuments(docs)
  }

  documentCount += 1
  return docs.length
}

// --- RAG Query Function ---

async function queryDocuments(question: string) {
  if (!vectorStore) {
    throw new Error("No documents have been uploaded yet.")
  }

  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
    throw new Error("OpenRouter API key not configured")
  }

  // Initialize LLM
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    modelName: "meta-llama/llama-3.2-3b-instruct:free",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  })

  // Create retriever
  const retriever = vectorStore.asRetriever({ k: 4 })

  // Create RAG prompt template
  const ragPrompt = ChatPromptTemplate.fromTemplate(`
Answer the question based only on the following context. If you cannot answer the question based on the context, say "I don't have enough information in the provided documents to answer this question."

Context: {context}

Question: {question}

Answer:`)

  // Create RAG chain
  const ragChain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: (input: { question: string }) => input.question,
    },
    ragPrompt,
    llm,
  ])

  const result = await ragChain.invoke({ question })
  return result.content
}

// --- API Route Handlers ---

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'upload') {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return Response.json({ success: false, error: "No file uploaded" }, { status: 400 })
      }

      // Extract text from file
      const text = await extractTextFromFile(file)
      
      // Process document and add to vector store
      const chunkCount = await processDocument(text, file.name)

      return Response.json({
        success: true,
        data: {
          filename: file.name,
          chunkCount,
          totalDocuments: documentCount,
          message: `Successfully processed ${file.name} into ${chunkCount} chunks.`
        }
      })

    } else if (action === 'query') {
      const { question } = await req.json()

      if (!question || typeof question !== "string") {
        return Response.json({ success: false, error: "Question is required" }, { status: 400 })
      }

      // Query the documents
      const answer = await queryDocuments(question)

      return Response.json({
        success: true,
        data: {
          question,
          answer,
          totalDocuments: documentCount
        }
      })

    } else if (action === 'clear') {
      // Clear the vector store
      vectorStore = null
      documentCount = 0

      return Response.json({
        success: true,
        data: { message: "All documents cleared from memory." }
      })

    } else {
      return Response.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

  } catch (error: any) {
    console.error("RAG API error:", error)
    return Response.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return Response.json({
    success: true,
    data: {
      totalDocuments: documentCount,
      hasDocuments: vectorStore !== null,
      status: vectorStore ? "Ready to answer questions" : "No documents uploaded"
    }
  })
}
