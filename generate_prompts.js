const fs = require('fs');

const content = fs.readFileSync('temp_prompt.txt', 'utf8');

// The content starts with: `  const CORE_INSTRUCTION = \`# NEX PRO — MASTER AI OPERATING SYSTEM`
// Let's strip the `  const CORE_INSTRUCTION = \`` from the beginning and the `\`;` from the end.
let cleanPrompt = content.replace(/^  const CORE_INSTRUCTION = `/, '');
cleanPrompt = cleanPrompt.replace(/`;\n?$/, '');

const nexProPrompt = cleanPrompt;
const nexaFlashPrompt = cleanPrompt
  .replace(/# NEX PRO — MASTER AI OPERATING SYSTEM/g, '# NEXA Flash — FAST AI ENGINE')
  .replace(/NEX PRO — Advanced Expert AI/g, 'NEXA Flash — Fast AI Assistant')
  .replace(/NEX คือผู้ช่วย AI ระดับสูง/g, 'NEXA Flash คือผู้ช่วย AI ที่เน้นความรวดเร็วและแม่นยำ');

const tsFileContent = `
export const NEX_PRO_INSTRUCTION = \`${nexProPrompt}\`;

export const NEXA_FLASH_INSTRUCTION = \`${nexaFlashPrompt}\`;
`;

fs.writeFileSync('systemPrompts.ts', tsFileContent);
console.log('systemPrompts.ts created successfully!');
