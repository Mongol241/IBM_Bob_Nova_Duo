import { jest } from "@jest/globals";

// ── mock fs/promises before importing the module under test ──────────────────
const mockReadFile = jest.fn<
  (path: string, encoding: string) => Promise<string>
>();
const mockWriteFile = jest.fn<
  (path: string, data: string, encoding: string) => Promise<void>
>();

jest.mock("fs/promises", () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

import { runApply } from "../commands/apply.js";
import type { Ticket } from "../types.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "conflict-01",
    file: "src/billing.ts",
    startLine: 10,
    endLine: 14,
    head: "return applyDiscount(total);",
    incoming: "return total;",
    confidence: 0.95,
    resolution: "return applyDiscount(total); // validated",
    reasoning: "HEAD correctly validates before discounting",
    status: "auto-resolved",
    ...overrides,
  };
}

/**
 * Build a fake source file where line `startLine` (1-based) begins the
 * conflict block.  Lines are numbered for easy assertion.
 */
function buildSource(ticket: Ticket): string {
  const before = Array.from(
    { length: ticket.startLine - 1 },
    (_, i) => `line ${i + 1}`
  );
  const conflict = [
    "<<<<<<< HEAD",
    ticket.head,
    "=======",
    ticket.incoming,
    `>>>>>>> incoming`,
  ];
  const after = ["line after-1", "line after-2"];
  return [...before, ...conflict, ...after].join("\n");
}

// ── reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteFile.mockResolvedValue(undefined);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("runApply", () => {
  describe("successful apply", () => {
    it("replaces the conflict block with the resolution and writes the file", async () => {
      const ticket = makeTicket();
      const ticketsJson = JSON.stringify([ticket]);
      const sourceContent = buildSource(ticket);

      mockReadFile
        .mockResolvedValueOnce(ticketsJson) // tickets file
        .mockResolvedValueOnce(sourceContent); // source file

      await runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" });

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [, writtenContent] = mockWriteFile.mock.calls[0] as [
        string,
        string,
        string
      ];

      // Resolution line should be present
      expect(writtenContent).toContain(ticket.resolution);
      // Conflict markers should be gone
      expect(writtenContent).not.toContain("<<<<<<<");
      expect(writtenContent).not.toContain(">>>>>>>");
      expect(writtenContent).not.toContain("=======");
      // Lines before the conflict should be preserved
      expect(writtenContent).toContain("line 1");
      // Lines after the conflict should be preserved
      expect(writtenContent).toContain("line after-1");
    });

    it("preserves \\r\\n line endings when source uses CRLF", async () => {
      const ticket = makeTicket({ startLine: 3 });
      const sourceLines = [
        "line 1",
        "line 2",
        "<<<<<<< HEAD",
        ticket.head,
        "=======",
        ticket.incoming,
        ">>>>>>> incoming",
        "line after",
      ];
      const crlfSource = sourceLines.join("\r\n");

      mockReadFile
        .mockResolvedValueOnce(JSON.stringify([ticket]))
        .mockResolvedValueOnce(crlfSource);

      await runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" });

      const [, written] = mockWriteFile.mock.calls[0] as [string, string, string];
      // Should use \r\n joins
      expect(written).toContain("\r\n");
      expect(written).not.toContain("<<<<<<<");
    });
  });

  describe("ticket not found", () => {
    it("throws when the conflict id is not in the tickets array", async () => {
      const ticket = makeTicket({ id: "conflict-99" });
      mockReadFile.mockResolvedValueOnce(JSON.stringify([ticket]));

      await expect(
        runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" })
      ).rejects.toThrow('ticket "conflict-01" not found');
    });
  });

  describe("invalid tickets file", () => {
    it("throws when the tickets file does not contain a JSON array", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ id: "oops" }));

      await expect(
        runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" })
      ).rejects.toThrow("tickets file does not contain a JSON array");
    });
  });

  describe("conflict marker drift", () => {
    it("throws when <<<<<<< is not found within ±5 lines of startLine", async () => {
      const ticket = makeTicket({ startLine: 1 });
      // Source with no conflict markers at all
      const noConflictSource = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");

      mockReadFile
        .mockResolvedValueOnce(JSON.stringify([ticket]))
        .mockResolvedValueOnce(noConflictSource);

      await expect(
        runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" })
      ).rejects.toThrow(/Drift exceeded|drift exceeded|not found within/i);
    });

    it("throws when <<<<<<< is exactly 6 lines away (just outside ±5 window)", async () => {
      const ticket = makeTicket({ startLine: 1 });
      // Place the marker 7 lines down (index 6), outside the ±5 window from index 0
      const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`);
      lines[6] = "<<<<<<< HEAD";
      lines[7] = ticket.head;
      lines[8] = "=======";
      lines[9] = ticket.incoming;
      lines[10] = ">>>>>>> incoming";

      mockReadFile
        .mockResolvedValueOnce(JSON.stringify([ticket]))
        .mockResolvedValueOnce(lines.join("\n"));

      await expect(
        runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" })
      ).rejects.toThrow(/not found within/i);
    });

    it("succeeds when <<<<<<< is exactly 5 lines away (within the ±5 window)", async () => {
      const ticket = makeTicket({ startLine: 1 });
      // Place the marker 5 lines down (index 5), at the edge of the window from index 0
      const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`);
      lines[5] = "<<<<<<< HEAD";
      lines[6] = ticket.head;
      lines[7] = "=======";
      lines[8] = ticket.incoming;
      lines[9] = ">>>>>>> incoming";

      mockReadFile
        .mockResolvedValueOnce(JSON.stringify([ticket]))
        .mockResolvedValueOnce(lines.join("\n"));

      await expect(
        runApply({ ticketsFile: "tickets.json", conflictId: "conflict-01" })
      ).resolves.toBeUndefined();
    });
  });
});
