import { assembleTicket, assembleTickets } from "../assembler.js";
import type { ConflictRegion, BobResolution } from "../types.js";

const baseConflict: ConflictRegion = {
  file: "src/foo.ts",
  startLine: 10,
  endLine: 20,
  head: "const x = 1;",
  incoming: "const x = 2;",
};

const baseResolution: BobResolution = {
  resolution: "const x = 2;",
  confidence: 0.9,
  reasoning: "Incoming change is more recent.",
};

describe("assembleTicket", () => {
  it("returns auto-resolved when confidence is above threshold", () => {
    const ticket = assembleTicket(baseConflict, baseResolution, null, 0, 0.8);
    expect(ticket.status).toBe("auto-resolved");
    expect(ticket.confidence).toBe(0.9);
    expect(ticket.id).toBe("conflict-01");
  });

  it("returns needs-review when confidence is below threshold", () => {
    const ticket = assembleTicket(baseConflict, { ...baseResolution, confidence: 0.5 }, null, 1, 0.8);
    expect(ticket.status).toBe("needs-review");
    expect(ticket.confidence).toBe(0.5);
  });

  it("returns needs-review with zeroed confidence when resolution is null", () => {
    const ticket = assembleTicket(baseConflict, null, "Bob timed out", 2, 0.8);
    expect(ticket.status).toBe("needs-review");
    expect(ticket.confidence).toBe(0);
    expect(ticket.resolution).toBe("");
    expect(ticket.reasoning).toBe("Bob timed out");
  });

  it("falls back to 'unknown error' when resolution is null and error is null", () => {
    const ticket = assembleTicket(baseConflict, null, null, 0, 0.8);
    expect(ticket.reasoning).toBe("unknown error");
  });

  it("clamps confidence above 1 down to 1", () => {
    const ticket = assembleTicket(baseConflict, { ...baseResolution, confidence: 1.5 }, null, 0, 0.8);
    expect(ticket.confidence).toBe(1);
    expect(ticket.status).toBe("auto-resolved");
  });

  it("clamps confidence below 0 up to 0", () => {
    const ticket = assembleTicket(baseConflict, { ...baseResolution, confidence: -0.3 }, null, 0, 0.8);
    expect(ticket.confidence).toBe(0);
    expect(ticket.status).toBe("needs-review");
  });

  it("generates id conflict-01 for index 0", () => {
    const ticket = assembleTicket(baseConflict, baseResolution, null, 0, 0.8);
    expect(ticket.id).toBe("conflict-01");
  });

  it("generates id conflict-10 for index 9", () => {
    const ticket = assembleTicket(baseConflict, baseResolution, null, 9, 0.8);
    expect(ticket.id).toBe("conflict-10");
  });
});

describe("assembleTickets", () => {
  it("processes a mixed array and returns correct ids and statuses", () => {
    const results = [
      { conflict: baseConflict, result: { ...baseResolution, confidence: 0.95 }, error: null },
      { conflict: { ...baseConflict, file: "src/bar.ts" }, result: { ...baseResolution, confidence: 0.4 }, error: null },
      { conflict: { ...baseConflict, file: "src/baz.ts" }, result: null, error: "timeout" },
    ];

    const tickets = assembleTickets(results, 0.8);

    expect(tickets).toHaveLength(3);

    expect(tickets[0].id).toBe("conflict-01");
    expect(tickets[0].status).toBe("auto-resolved");
    expect(tickets[0].file).toBe("src/foo.ts");

    expect(tickets[1].id).toBe("conflict-02");
    expect(tickets[1].status).toBe("needs-review");
    expect(tickets[1].file).toBe("src/bar.ts");

    expect(tickets[2].id).toBe("conflict-03");
    expect(tickets[2].status).toBe("needs-review");
    expect(tickets[2].confidence).toBe(0);
    expect(tickets[2].reasoning).toBe("timeout");
    expect(tickets[2].file).toBe("src/baz.ts");
  });
});
