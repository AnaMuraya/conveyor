# 0002. NestJS + TypeScript with a modular architecture

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Relay's goal is to grow from a clean REST API into a resilient, event-driven,
multi-service system. Week 1 is about moving from "I can write JS" to
"well-architected, typed, tested backends." The stack is fixed by the plan:
NestJS, TypeScript, and (later) Postgres, Redis, BullMQ, and Ollama.

## Decision

Build on **NestJS with TypeScript**, organising code into feature **modules**
(`TasksModule`, `LlmModule`, …) wired together through Nest's **dependency
injection**. Each module owns its controller(s) and provider(s); cross-module
collaboration happens through exported providers and DI tokens, not direct
imports of concrete classes.

## Consequences

- DI and module boundaries are an architecture lesson in themselves and set up
  the later API/worker split (week 7) cleanly — services already talk through
  seams, not concrete types.
- TypeScript gives compile-time contracts (DTOs, entities, the `LlmProvider`
  interface) before runtime validation arrives in week 3.
- Some boilerplate (modules, decorators) is the cost of the structure.

## Alternatives considered

- **Express/Fastify by hand:** less ceremony, but we'd reinvent DI, module
  boundaries, testing harness, and config — the exact structure this project
  exists to practice.
