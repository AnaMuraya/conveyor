# 0002. NestJS + TypeScript with a modular architecture

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

The project grows from a clean REST API into a resilient, event-driven,
multi-service system, so the foundation needs clear structure, dependency
management, and testability from the start. The stack is NestJS and TypeScript
now, with Postgres, Redis, BullMQ, and Ollama added later.

## Decision

Build on **NestJS with TypeScript**, organising code into feature **modules**
(`TasksModule`, `LlmModule`, …) wired together through Nest's **dependency
injection**. Each module owns its controller(s) and provider(s); cross-module
collaboration happens through exported providers and DI tokens, not direct
imports of concrete classes.

## Consequences

- DI and module boundaries set up the later API/worker split cleanly — services
  already talk through seams, not concrete types.
- TypeScript gives compile-time contracts (DTOs, entities, the `LlmProvider`
  interface) before runtime validation is added later.
- Some boilerplate (modules, decorators) is the cost of the structure.

## Alternatives considered

- **Express/Fastify by hand:** less ceremony, but we'd reinvent DI, module
  boundaries, testing harness, and config — the exact structure this project
  exists to practice.
