import { parseConflicts } from "../parser.js";
import type { ConflictRegion } from "../types.js";

describe("parseConflicts", () => {
  it("extracts a single conflict block with correct fields", () => {
    const content = [
      "line before",
      "<<<<<<< HEAD",
      "const x = 1;",
      "=======",
      "const x = 2;",
      ">>>>>>> feature-branch",
      "line after",
    ].join("\n");

    const result = parseConflicts(content, "src/foo.ts");

    expect(result).toHaveLength(1);
    const region = result[0];
    expect(region.file).toBe("src/foo.ts");
    expect(region.startLine).toBe(2);
    expect(region.endLine).toBe(6);
    expect(region.head).toBe("const x = 1;");
    expect(region.incoming).toBe("const x = 2;");
  });

  it("extracts two conflict blocks from the same file", () => {
    const content = [
      "<<<<<<< HEAD",
      "alpha",
      "=======",
      "beta",
      ">>>>>>> branch-a",
      "middle line",
      "<<<<<<< HEAD",
      "foo",
      "bar",
      "=======",
      "baz",
      ">>>>>>> branch-b",
    ].join("\n");

    const result = parseConflicts(content, "src/multi.ts");

    expect(result).toHaveLength(2);

    expect(result[0].startLine).toBe(1);
    expect(result[0].endLine).toBe(5);
    expect(result[0].head).toBe("alpha");
    expect(result[0].incoming).toBe("beta");

    expect(result[1].startLine).toBe(7);
    expect(result[1].endLine).toBe(12);
    expect(result[1].head).toBe("foo\nbar");
    expect(result[1].incoming).toBe("baz");
  });

  it("returns an empty array when there are no conflict markers", () => {
    const content = [
      "import something from 'somewhere';",
      "const a = 1;",
      "export default a;",
    ].join("\n");

    const result = parseConflicts(content, "src/clean.ts");
    expect(result).toEqual([]);
  });

  it("handles a conflict where head is empty", () => {
    const content = [
      "<<<<<<< HEAD",
      "=======",
      "only incoming",
      ">>>>>>> branch-x",
    ].join("\n");

    const result = parseConflicts(content, "src/empty-head.ts");

    expect(result).toHaveLength(1);
    expect(result[0].head).toBe("");
    expect(result[0].incoming).toBe("only incoming");
    expect(result[0].startLine).toBe(1);
    expect(result[0].endLine).toBe(4);
  });

  it("handles a conflict where incoming is empty", () => {
    const content = [
      "<<<<<<< HEAD",
      "only head",
      "=======",
      ">>>>>>> branch-y",
    ].join("\n");

    const result = parseConflicts(content, "src/empty-incoming.ts");

    expect(result).toHaveLength(1);
    expect(result[0].head).toBe("only head");
    expect(result[0].incoming).toBe("");
    expect(result[0].startLine).toBe(1);
    expect(result[0].endLine).toBe(4);
  });
});
