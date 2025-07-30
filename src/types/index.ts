// Common types for AI applications

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface SummarizationResult {
  originalText: string;
  summary: string;
  wordCount: number;
  compressionRatio: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language?: string;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
  categories: Array<{
    name: string;
    score: number;
  }>;
}

export interface QnAResult {
  question: string;
  answer: string;
  confidence: number;
  context?: string;
}

export interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl?: string;
}
