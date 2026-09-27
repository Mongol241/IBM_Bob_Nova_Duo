import { jest } from "@jest/globals";
import { EventEmitter } from "events";

// ---------- mock child_process.spawn before importing resolver ----------
const mockSpawn = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  spawn: mockSpawn,
}));

// Dynamically import resolver AFTER the mock is registered
const { callBobShellBatched, callBobShellBatchedByFile } = await import("../resolver.js");
import type { ConflictRegion } from "../types.js";

// ---------- helpers (copied from resolver.test.ts) ----------

class MockStream extends EventEmitter {
  readonly chunks: Buffer[] = [];
  push(data: string): void {
    const buf = Buffer.from(data, "utf8");
    this.chunks.push(buf);
    this.emit("data", buf);
  }
}

interface MockProcess {
  stdout: MockStream;
  stderr: MockStream;
  kill: jest.Mock;
  emit(event: string, ...args: unknown[]): boolean;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

function makeMockProcess(): MockProcess & EventEmitter {
  const proc = new EventEmitter() as MockProcess & EventEmitter;
  proc.stdout = new MockStream();
  proc.stderr = new MockStream();
  proc.kill = jest.fn();
  return proc;
}

// ---------- fixtures ----------

const baseConflict: ConflictRegion = {
  file: "src/app.ts",
  startLine: 10,
  endLine: 20,
  head: 'const x = "head version";',
  incoming: 'const x = "incoming version";',
};

const resolutionA = {
  resolution: 'const x = "resolved-A";',
  confidence: 0.9,
  reasoning: "Chose incoming for clarity.",
};

const resolutionB = {
  resolution: 'const x = "resolved-B";',
  confidence: 0.8,
  reasoning: "Chose head for stability.",
};

// ---------- callBobShellBatched ----------

describe("callBobShellBatched", () => {
  beforeEach(() => {
    mockSpawn.mockReset();
  });

  it("happy path: two conflicts — returns length-2 results with correct data", async () => {
    const conflicts: ConflictRegion[] = [
      { ...baseConflict, startLine: 10, endLine: 20 },
      { ...baseConflict, startLine: 30, endLine: 40 },
    ];

    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShellBatched(conflicts, "src/app.ts");

    // Bob responds with a JSON array of 2 resolutions
    proc.stdout.push(JSON.stringify([resolutionA, resolutionB]));
    proc.emit("close", 0);

    const results = await pending;

    expect(results).toHaveLength(2);

    expect(results[0].conflict).toBe(conflicts[0]);
    expect(results[0].result).toEqual(resolutionA);
    expect(results[0].error).toBeNull();

    expect(results[1].conflict).toBe(conflicts[1]);
    expect(results[1].result).toEqual(resolutionB);
    expect(results[1].error).toBeNull();
  }, 10_000);

  it("length mismatch: bob returns array of 1 for 2 conflicts → both results have result:null and error containing 'mismatch'", async () => {
    const conflicts: ConflictRegion[] = [
      { ...baseConflict, startLine: 10, endLine: 20 },
      { ...baseConflict, startLine: 30, endLine: 40 },
    ];

    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShellBatched(conflicts, "src/app.ts");

    // Bob only returns 1 element for 2 conflicts
    proc.stdout.push(JSON.stringify([resolutionA]));
    proc.emit("close", 0);

    const results = await pending;

    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r.result).toBeNull();
      expect(r.error).toContain("mismatch");
    });
  }, 10_000);

  it("invalid JSON: bob returns non-JSON → both results have result:null and error set", async () => {
    const conflicts: ConflictRegion[] = [
      { ...baseConflict, startLine: 10, endLine: 20 },
      { ...baseConflict, startLine: 30, endLine: 40 },
    ];

    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShellBatched(conflicts, "src/app.ts");

    // Bob returns garbage — not parseable JSON
    proc.stdout.push("Sorry, I cannot help with that right now.");
    proc.emit("close", 0);

    const results = await pending;

    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r.result).toBeNull();
      expect(r.error).toBeTruthy();
      expect(typeof r.error).toBe("string");
    });
  }, 10_000);
});

// ---------- callBobShellBatchedByFile ----------

describe("callBobShellBatchedByFile", () => {
  beforeEach(() => {
    mockSpawn.mockReset();
  });

  it("groups by file: 3 conflicts (2 from a.ts, 1 from b.ts) → spawn called twice, results in input order", async () => {
    const conflictA1: ConflictRegion = { ...baseConflict, file: "a.ts", startLine: 1, endLine: 5 };
    const conflictA2: ConflictRegion = { ...baseConflict, file: "a.ts", startLine: 10, endLine: 15 };
    const conflictB1: ConflictRegion = { ...baseConflict, file: "b.ts", startLine: 3, endLine: 7 };

    const conflicts = [conflictA1, conflictA2, conflictB1];

    // First spawn → handles the a.ts batch (2 conflicts)
    const procA = makeMockProcess();
    // Second spawn → handles the b.ts batch (1 conflict)
    const procB = makeMockProcess();

    let callIdx = 0;
    mockSpawn.mockImplementation(() => (callIdx++ === 0 ? procA : procB));

    const pending = callBobShellBatchedByFile(conflicts, 2);

    // Yield so both workers have time to spawn their processes
    await Promise.resolve();

    // Resolve a.ts batch
    procA.stdout.push(JSON.stringify([resolutionA, resolutionB]));
    procA.emit("close", 0);

    // Resolve b.ts batch
    procB.stdout.push(JSON.stringify([resolutionA]));
    procB.emit("close", 0);

    const results = await pending;

    // spawn called once per file
    expect(mockSpawn).toHaveBeenCalledTimes(2);

    // 3 results returned in input order
    expect(results).toHaveLength(3);

    expect(results[0].conflict).toBe(conflictA1);
    expect(results[0].result).toEqual(resolutionA);
    expect(results[0].error).toBeNull();

    expect(results[1].conflict).toBe(conflictA2);
    expect(results[1].result).toEqual(resolutionB);
    expect(results[1].error).toBeNull();

    expect(results[2].conflict).toBe(conflictB1);
    expect(results[2].result).toEqual(resolutionA);
    expect(results[2].error).toBeNull();
  }, 10_000);

  it("partial failure: a.ts batch fails → its 2 conflicts get result:null; b.ts succeeds → its 1 conflict gets a result", async () => {
    const conflictA1: ConflictRegion = { ...baseConflict, file: "a.ts", startLine: 1, endLine: 5 };
    const conflictA2: ConflictRegion = { ...baseConflict, file: "a.ts", startLine: 10, endLine: 15 };
    const conflictB1: ConflictRegion = { ...baseConflict, file: "b.ts", startLine: 3, endLine: 7 };

    const conflicts = [conflictA1, conflictA2, conflictB1];

    const procA = makeMockProcess();
    const procB = makeMockProcess();

    let callIdx = 0;
    mockSpawn.mockImplementation(() => (callIdx++ === 0 ? procA : procB));

    const pending = callBobShellBatchedByFile(conflicts, 2);

    await Promise.resolve();

    // a.ts batch: non-zero exit (failure)
    procA.stderr.push("internal error processing a.ts");
    procA.emit("close", 1);

    // b.ts batch: success
    procB.stdout.push(JSON.stringify([resolutionB]));
    procB.emit("close", 0);

    const results = await pending;

    expect(results).toHaveLength(3);

    // a.ts conflicts → result:null, error set
    expect(results[0].conflict).toBe(conflictA1);
    expect(results[0].result).toBeNull();
    expect(results[0].error).toBeTruthy();

    expect(results[1].conflict).toBe(conflictA2);
    expect(results[1].result).toBeNull();
    expect(results[1].error).toBeTruthy();

    // b.ts conflict → success
    expect(results[2].conflict).toBe(conflictB1);
    expect(results[2].result).toEqual(resolutionB);
    expect(results[2].error).toBeNull();
  }, 10_000);
});
