const fs = require('fs');

const content = fs.readFileSync('temp_prompt.txt', 'utf8');

let cleanPrompt = content.replace(/^  const CORE_INSTRUCTION = `/, '');
cleanPrompt = cleanPrompt.replace(/`;\n?$/, '');

// Clean prompt now has literal backslash-escaped backticks if they were extracted that way.
// Let's unescape them first to get the pure string, or just let JSON.stringify handle it.
// Actually, in `server.ts`, it was a template literal, so it had `\`` for backticks.
// Let's replace `\`\`` with just ```.
cleanPrompt = cleanPrompt.replace(/\\`/g, '`');
// Also unescape \${} if any
cleanPrompt = cleanPrompt.replace(/\\\$/g, '$');

const nexProPrompt = cleanPrompt;
const nexaFlashPrompt = cleanPrompt
  .replace(/# NEX PRO — MASTER AI OPERATING SYSTEM/g, '# NEXA Flash — FAST AI ENGINE')
  .replace(/NEX PRO — Advanced Expert AI/g, 'NEXA Flash — Fast AI Assistant')
  .replace(/NEX คือผู้ช่วย AI ระดับสูง/g, 'NEXA Flash คือผู้ช่วย AI ที่เน้นความรวดเร็วและแม่นยำ');

const tsFileContent = `
export const NEX_PRO_INSTRUCTION = ${JSON.stringify(nexProPrompt)};

export const NEXA_FLASH_INSTRUCTION = ${JSON.stringify(nexaFlashPrompt)};
`;

fs.writeFileSync('systemPrompts.ts', tsFileContent);
console.log('systemPrompts.ts generated using JSON.stringify successfully!');
