---
name: verbatim-memory
description: Use when the user requests implementing or integrating a verbatim memory system, local-first context storage, or MCP-based persistent context management to preserve complete conversation transcripts without summarization.
---

# Verbatim Memory System

Verbatim Memory is a context management and storage paradigm that preserves complete, unsummarized conversation transcripts locally, ensuring zero data loss and high-fidelity information retrieval (scoring 96.6% on LongMemEval).

## Core Principles

1. **Verbatim Memory (No Summarization)**:
   - Save entire chat transcripts instead of lossy summaries.
   - Retain exact phrasing, code snippets, and structural details.
   - Maximize retrieval accuracy for long-term project context.

2. **Local-First Privacy**:
   - Store all conversation data, embeddings, and indices locally on the user's machine.
   - Ensure the user maintains full sovereignty and control over their private data.

3. **Model Context Protocol (MCP) Integration**:
   - Expose the memory store via an MCP server.
   - Allow models (e.g., Claude, Gemini, Antigravity) to query, search, and append to the verbatim memory dynamically using standardized MCP tool calls.

4. **Performance Benchmark**:
   - Built to target and maintain a 96.6% accuracy rate on the LongMemEval benchmark.

## Implementation Guide

When implementing or extending verbatim memory systems:
- **Storage Layer**: Use lightweight, local databases (e.g., SQLite, DuckDB, or simple JSONL files) to store the verbatim transcripts.
- **Search & Retrieval**: Implement local vector search (e.g., using `sentence-transformers` or `sqlite-vss`) combined with BM25 / keyword search for exact term matching.
- **MCP Server Interface**: Expose tools like `search_verbatim_memory`, `append_to_memory`, and `retrieve_session_transcript` via the MCP server protocol.
- **Context Injection**: Dynamically inject retrieved verbatim segments into the model's context window based on relevance, preserving context budget.
