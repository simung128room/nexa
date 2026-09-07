import { extractFilenameAndExt } from "../components/CodeBlock";

export interface ParsedArtifactMeta {
  title: string;
  filename: string;
  extension: string;
  category: string;
  subtitle: string;
}

export const extractArtifactMeta = (code: string, language: string): ParsedArtifactMeta => {
  const cleanLang = (language || "").toLowerCase().replace(/^language-/, "").trim();
  const fileInfo = extractFilenameAndExt(code, cleanLang);

  // Check lines for a natural title (like Markdown # title or comments)
  const lines = code.split("\n").slice(0, 5);
  let humanTitle = "";

  for (const raw of lines) {
    const line = raw.trim();
    // Markdown # Title
    const mdMatch = line.match(/^#\s+(.+)$/);
    if (mdMatch) {
      humanTitle = mdMatch[1].replace(/[#*`_]/g, "").trim();
      break;
    }
    // Comment title // Title: ... or # Title: ...
    const commentMatch = line.match(/^(?:\/\/|#)\s*(?:title:|file:)?\s*([a-zA-Z0-9_\-\u0E00-\u0E7F\s]{3,45})$/i);
    if (commentMatch && !commentMatch[1].includes("import ") && !commentMatch[1].includes("from ")) {
      humanTitle = commentMatch[1].trim();
      break;
    }
  }

  // Determine category & display extension
  let category = "Code";
  const extUpper = fileInfo.extension ? fileInfo.extension.toUpperCase() : "TXT";

  if (["md", "markdown", "txt"].includes(cleanLang) || ["md", "markdown"].includes(fileInfo.extension.toLowerCase())) {
    category = "Document";
  } else if (["html", "htm", "svg"].includes(cleanLang) || ["html", "htm", "svg"].includes(fileInfo.extension.toLowerCase())) {
    category = "Web";
  } else if (["json", "yaml", "yml", "xml", "csv", "tsv"].includes(cleanLang)) {
    category = "Data";
  } else if (["sh", "bash", "zsh", "ps1", "bat"].includes(cleanLang)) {
    category = "Script";
  } else if (["jsx", "tsx"].includes(cleanLang)) {
    category = "Component";
  }

  const title = humanTitle || fileInfo.filename.replace(/\.[a-zA-Z0-9]+$/, "") || `${category} file`;
  const subtitle = `${category} · ${extUpper}`;

  return {
    title,
    filename: fileInfo.filename,
    extension: fileInfo.extension,
    category,
    subtitle,
  };
};

/**
 * Extracts all code blocks from a markdown message so we can synchronize
 * the active artifact live while streaming!
 */
export const extractCodeBlocksFromMarkdown = (markdown: string): { language: string; code: string }[] => {
  const blocks: { language: string; code: string }[] = [];
  const regex = /```(\w+)?(?:\s+[^\n]*)?\n([\s\S]*?)(?:```|$)/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    const lang = match[1] || "";
    const code = match[2] || "";
    blocks.push({ language: lang, code });
  }

  return blocks;
};
