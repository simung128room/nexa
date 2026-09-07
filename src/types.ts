export type Role = "user" | "assistant" | "system";

export interface CodeSnippet {
  language: string;
  code: string;
  filename?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  content?: string;
  dataUrl?: string;
  isImage?: boolean;
  isText?: boolean;
  isPdf?: boolean;
  isAudio?: boolean;
  isVideo?: boolean;
  isLoading?: boolean;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  model?: string;
  isStreaming?: boolean;
  attachments?: FileAttachment[];
  codeSnippets?: CodeSnippet[];
  searchSources?: SearchSource[];
  executionTimeMs?: number;
  tokensEstimate?: number;
  error?: string;
}

export interface ArtifactItem {
  id: string;
  messageId: string;
  blockIndex?: number;
  title: string;
  filename: string;
  language: string;
  extension: string;
  category: string;
  subtitle: string;
  content: string;
  lineCount: number;
  isStreaming?: boolean;
}

export interface DiffLine {
  type: "add" | "delete" | "normal";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs?: string;
  returnValue?: string;
  language?: string;
}

export type ZenThemeId = 
  | "geometric-balance" // Geometric Balance (Default) - Crisp Slate & High-Contrast Minimal
  | "zen-dark"          // Charcoal Ink & Slate
  | "zen-washi"         // Japanese Sand Paper & Warm Ink
  | "zen-monokai"       // Monokai Pro Minimal
  | "zen-bamboo"        // Deep Forest Bamboo Green
  | "zen-matrix";       // Minimalist Obsidian Neon

export interface ZenThemeConfig {
  id: ZenThemeId;
  name: string;
  nameTh: string;
  desc: string;
  bg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  codeBg: string;
  inputBg: string;
  headerBg: string;
  isDark: boolean;
}

export interface PromptPreset {
  id: string;
  title: string;
  titleTh: string;
  iconName: string;
  prompt: string;
  category: "general" | "code" | "debug" | "refactor" | "explain" | "architecture" | "zen" | "generate";
  shortcut?: string;
}

export interface JomModel {
  id: string;
  name: string;
  pillLabel: string;
  engine: string;
  title: string;
  subtitle: string;
  badge?: string;
  tagline: string;
  speed: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model?: string;
  customSystemPrompt?: string;
  temperature: number;
  pinned?: boolean;
  isPinned?: boolean;
  scratchpadCode?: string;
  scratchpadLang?: string;
}
