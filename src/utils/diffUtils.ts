import { DiffLine } from "../types";

export function computeLineDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  const diffResult: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;
  const MAX_LOOKAHEAD = 60;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length && oldLines[oldIdx] === newLines[newIdx]) {
      diffResult.push({
        type: "normal",
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
        content: oldLines[oldIdx],
      });
      oldIdx++;
      newIdx++;
    } else {
      // Look ahead for matching line within bounded window for high performance
      let matchInNew = -1;
      let matchInOld = -1;

      if (oldIdx < oldLines.length) {
        const limit = Math.min(newLines.length, newIdx + MAX_LOOKAHEAD);
        for (let j = newIdx; j < limit; j++) {
          if (newLines[j] === oldLines[oldIdx]) {
            matchInNew = j;
            break;
          }
        }
      }

      if (newIdx < newLines.length) {
        const limit = Math.min(oldLines.length, oldIdx + MAX_LOOKAHEAD);
        for (let j = oldIdx; j < limit; j++) {
          if (oldLines[j] === newLines[newIdx]) {
            matchInOld = j;
            break;
          }
        }
      }

      if (matchInNew !== -1 && (matchInOld === -1 || matchInNew - newIdx <= matchInOld - oldIdx)) {
        // New lines were added before matching line
        while (newIdx < matchInNew) {
          diffResult.push({
            type: "add",
            newLineNumber: newIdx + 1,
            content: newLines[newIdx],
          });
          newIdx++;
        }
      } else if (matchInOld !== -1) {
        // Old lines were deleted before matching line
        while (oldIdx < matchInOld) {
          diffResult.push({
            type: "delete",
            oldLineNumber: oldIdx + 1,
            content: oldLines[oldIdx],
          });
          oldIdx++;
        }
      } else {
        // Lines changed
        if (oldIdx < oldLines.length) {
          diffResult.push({
            type: "delete",
            oldLineNumber: oldIdx + 1,
            content: oldLines[oldIdx],
          });
          oldIdx++;
        }
        if (newIdx < newLines.length) {
          diffResult.push({
            type: "add",
            newLineNumber: newIdx + 1,
            content: newLines[newIdx],
          });
          newIdx++;
        }
      }
    }
  }

  return diffResult;
}
