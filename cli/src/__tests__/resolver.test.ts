import { jest } from "@jest/globals";
import { EventEmitter } from "events";

// ---------- mock child_process.spawn before importing resolver ----------
const mockSpawn = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  spawn: mockSpawn,
}));

// Dynamically import resolver AFTER the mock is registered
const { callBobShell, callBobShellWithConcurrency } = await import("../resolver.js");
import type { ConflictRegion } from "../types.js";

// ---------- helpers ----------

/** Minimal writable-stream stub that captures pushed chunks */
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

const sampleConflict: ConflictRegion = {
  file: "src/app.ts",
  startLine: 10,
  endLine: 20,
  head: 'const x = "head version";',
  incoming: 'const x = "incoming version";',
};

const validResolution = {
  resolution: 'const x = "resolved";',
  confidence: 0.95,
  reasoning: "Chose incoming for clarity.",
};

// ---------- prompt content tests ----------

describe("prompt construction", () => {
  it("contains the file path", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    // Start the call but don't await — we only need to inspect the prompt arg
    const pending = callBobShell(sampleConflict);

    // Immediately resolve so the promise doesn't hang
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);

    await pending;

    expect(mockSpawn).toHaveBeenCalledWith(
      "bob",
      ["-p", expect.stringContaining('file "src/app.ts"')],
      expect.anything()
    );
  });

  it("contains the line range", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);
    await pending;

    const promptArg = (mockSpawn.mock.calls[0] as [string, string[]])[1][1];
    expect(promptArg).toContain("10");
    expect(promptArg).toContain("20");
  });

  it("contains the HEAD side verbatim", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);
    await pending;

    const promptArg = (mockSpawn.mock.calls[0] as [string, string[]])[1][1];
    expect(promptArg).toContain(sampleConflict.head);
  });

  it("contains the INCOMING side verbatim", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);
    await pending;

    const promptArg = (mockSpawn.mock.calls[0] as [string, string[]])[1][1];
    expect(promptArg).toContain(sampleConflict.incoming);
  });

  it("contains the JSON instruction", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);
    await pending;

    const promptArg = (mockSpawn.mock.calls[0] as [string, string[]])[1][1];
    expect(promptArg).toContain('"resolution"');
    expect(promptArg).toContain('"confidence"');
    expect(promptArg).toContain('"reasoning"');
    expect(promptArg).toContain("no markdown fences");
  });
});

// ---------- JSON extraction / noise stripping ----------

describe("JSON extraction from noisy output", () => {
  it("parses JSON when stdout contains leading and trailing noise", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const noisy =
      `some preamble text\n` +
      JSON.stringify(validResolution) +
      `\nsome trailing text`;

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(noisy);
    proc.emit("close", 0);

    const result = await pending;
    expect(result.resolution).toBe(validResolution.resolution);
    expect(result.confidence).toBe(validResolution.confidence);
    expect(result.reasoning).toBe(validResolution.reasoning);
  });

  it("parses clean JSON stdout without noise", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);

    const result = await pending;
    expect(result).toEqual(validResolution);
  });
});

// ---------- successful call ----------

describe("callBobShell — success", () => {
  it("resolves with parsed BobResolution on exit code 0", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stdout.push(JSON.stringify(validResolution));
    proc.emit("close", 0);

    await expect(pending).resolves.toEqual(validResolution);
  });
});

// ---------- non-zero exit ----------

describe("callBobShell — non-zero exit", () => {
  it("rejects with stderr content when bob exits non-zero", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.stderr.push("fatal: something went wrong");
    proc.emit("close", 1);

    await expect(pending).rejects.toThrow("fatal: something went wrong");
  });

  it("rejects with a fallback message when stderr is empty and exit is non-zero", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);

    const pending = callBobShell(sampleConflict);
    proc.emit("close", 2);

    await expect(pending).rejects.toThrow("bob exited with code 2");
  });
});

// ---------- concurrency helper ----------

describe("callBobShellWithConcurrency", () => {
  it("returns results in input order", async () => {
    const conflicts: ConflictRegion[] = [
      { ...sampleConflict, file: "a.ts" },
      { ...sampleConflict, file: "b.ts" },
      { ...sampleConflict, file: "c.ts" },
    ];

    // Each spawn call returns a fresh mock process
    const procs = conflicts.map(() => makeMockProcess());
    let callIdx = 0;
    mockSpawn.mockImplementation(() => procs[callIdx++]);

    const pendingAll = callBobShellWithConcurrency(conflicts, 2);

    // Resolve all procs
    for (const proc of procs) {
      proc.stdout.push(JSON.stringify(validResolution));
      proc.emit("close", 0);
    }

    const results = await pendingAll;

    expect(results).toHaveLength(3);
    expect(results[0].conflict.file).toBe("a.ts");
    expect(results[1].conflict.file).toBe("b.ts");
    expect(results[2].conflict.file).toBe("c.ts");
    results.forEach((r) => {
      expect(r.result).toEqual(validResolution);
      expect(r.error).toBeNull();
    });
  });

  it("captures individual failures without aborting others", async () => {
    const conflicts: ConflictRegion[] = [
      { ...sampleConflict, file: "good.ts" },
      { ...sampleConflict, file: "bad.ts" },
    ];

    const procs = conflicts.map(() => makeMockProcess());
    let callIdx = 0;
    mockSpawn.mockImplementation(() => procs[callIdx++]);

    const pendingAll = callBobShellWithConcurrency(conflicts, 2);

    // good: success
    procs[0].stdout.push(JSON.stringify(validResolution));
    procs[0].emit("close", 0);

    // bad: non-zero exit
    procs[1].stderr.push("permission denied");
    procs[1].emit("close", 1);

    const results = await pendingAll;

    expect(results[0].result).toEqual(validResolution);
    expect(results[0].error).toBeNull();

    expect(results[1].result).toBeNull();
    expect(results[1].error).toBe("permission denied");
  });
});
