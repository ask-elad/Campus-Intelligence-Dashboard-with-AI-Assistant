import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load data
const libraryData = require("../data/library.json");

const PORT = process.env.PORT || 5001;

// --- In-memory simulated borrowings (per student) ---
const simulatedBorrowings: Record<string, Array<{
  bookId: string;
  title: string;
  authors: string[];
  dueDate: string;
  callNumber: string;
}>> = {
  "STU-2021-CSE-001": [
    {
      bookId: "book_001",
      title: "Introduction to Algorithms",
      authors: ["Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"],
      dueDate: "2026-07-02",
      callNumber: "005.11 COR"
    }
  ],
  "STU-2022-ME-042": [
    {
      bookId: "book_002",
      title: "Concepts of Physics",
      authors: ["H. C. Verma"],
      dueDate: "2026-06-28",
      callNumber: "530.1 VER"
    },
    {
      bookId: "book_005",
      title: "Let Us C",
      authors: ["Yashavant Kanetkar"],
      dueDate: "2026-07-05",
      callNumber: "005.13 KAN"
    }
  ]
};

// --- Library hours (MGCL standard) ---
const libraryHours = {
  weekdays: "8:00 AM – 12:00 AM (Monday to Saturday)",
  sunday: "10:00 AM – 6:00 PM",
  examPeriod: "Open 24 hours during exam weeks",
  holidayPolicy: "Closed on gazetted national holidays."
};

// --- Fuzzy search helper ---
function searchBooks(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return libraryData.localBooks;

  return libraryData.localBooks.filter((book: any) => {
    const titleMatch = book.title.toLowerCase().includes(q);
    const authorsMatch = book.authors.some((a: string) => a.toLowerCase().includes(q));
    const callMatch = book.callNumber?.toLowerCase().includes(q);
    return titleMatch || authorsMatch || callMatch;
  });
}

// --- MCP Server setup ---
const mcpServer = new McpServer({
  name: "library-mcp-server",
  version: "1.0.0"
});

mcpServer.tool(
  "search_books",
  "Search the MGCL library catalog by book title, author name, or call number. Returns matching books with availability info.",
  { query: z.string().describe("Search query: title, author name, or call number") },
  async ({ query }) => {
    const results = searchBooks(query);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          query,
          totalResults: results.length,
          books: results.map((b: any) => ({
            id: b.id,
            title: b.title,
            authors: b.authors.join(", "),
            isbn: b.isbn,
            callNumber: b.callNumber,
            location: b.location,
            status: b.status,
            availableCopies: b.availableCopies,
            totalCopies: b.totalCopies,
            ...(b.dueDate ? { dueDate: b.dueDate } : {})
          }))
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_book_by_id",
  "Get detailed information about a specific library book by its ID.",
  { book_id: z.string().describe("The book ID (e.g., book_001)") },
  async ({ book_id }) => {
    const book = libraryData.localBooks.find((b: any) => b.id === book_id);
    if (!book) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: `No book found with ID '${book_id}'.` })
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: book.id,
          title: book.title,
          authors: book.authors.join(", "),
          isbn: book.isbn,
          callNumber: book.callNumber,
          location: book.location,
          status: book.status,
          availableCopies: book.availableCopies,
          totalCopies: book.totalCopies,
          ...(book.dueDate ? { expectedReturnDate: book.dueDate } : {})
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_library_hours",
  "Get the opening and closing hours of the Mahatma Gandhi Central Library (MGCL), including exam period and holiday policies.",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(libraryHours)
      }]
    };
  }
);

mcpServer.tool(
  "get_library_info",
  "Get general information about the Mahatma Gandhi Central Library (MGCL) — total books, floors, features, and rules.",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: libraryData.libraryName,
          totalBooks: libraryData.totalBooks,
          floors: libraryData.floors,
          features: libraryData.features,
          rules: libraryData.rules
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_borrowed_books",
  "Get the list of books currently borrowed by a specific student. Returns due dates and book details.",
  { student_id: z.string().describe("The student ID (e.g., STU-2021-CSE-001)") },
  async ({ student_id }) => {
    const borrowed = simulatedBorrowings[student_id] || [];
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          studentId: student_id,
          totalBorrowed: borrowed.length,
          books: borrowed,
          maxBorrowDays: 15,
          lateFeePerDay: "Rs. 2"
        })
      }]
    };
  }
);

// --- Express server for SSE transport ---
const app = express();
app.use(cors());
app.use(express.json());

const transports: Record<string, SSEServerTransport> = {};

app.get("/sse", async (req, res) => {
  console.log("[Library MCP] New SSE connection");
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    console.log(`[Library MCP] SSE connection closed: ${transport.sessionId}`);
    delete transports[transport.sessionId];
  });

  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (err: any) {
    console.error("[Library MCP] POST /messages failed:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "library-mcp-server", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Library MCP Server running on http://localhost:${PORT}`);
  console.log(`  SSE endpoint: http://localhost:${PORT}/sse`);
});