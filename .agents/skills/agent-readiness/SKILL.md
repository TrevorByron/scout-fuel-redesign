---
name: agent-readiness
description: Reviews features, APIs, and pages for agent-readiness using the six-pillar framework. Use when reviewing UX for agents, checking agent compatibility, auditing machine contracts, verifying HITL patterns, or ensuring headless-first design.
---

# Agent Readiness

Review any feature, endpoint, or page for agent-readiness. For the full guide with rationale and examples, read [agent-readiness.md](../../../product-architecture/agent-readiness.md).

## Review Checklist

Work through each section. Flag anything that fails as a blocker or warning.

### 1. Entities and State Machines

- Domain objects have rigid schemas (not freeform UI state)
- Every entity has a versioned lifecycle with explicit states (e.g., `Draft` -> `Pending_Review` -> `Executed`)
- Business invariants are enforced at the API/database layer, not by UI validation alone

### 2. Machine Contracts

- Every mutating endpoint accepts an `idempotency_key`
- Multi-step workflows support atomic rollback or compensating transactions on partial failure
- Side effects of each action are documented and predictable (an agent can know what *else* will happen)

### 3. Confidence and Authority (HITL)

- A policy layer defines guardrails at the API level (thresholds, approval gates)
- Actions above the agent's authority require a `human_gate_id`
- Agent actions store a confidence score and evidence
- Permissions are granular and resource-scoped (`can_agent_perform(action, resource_id)`), not role-binary

### 4. Explainability

- Provenance logs capture *why* a change was made, not just *that* it changed
- Logs include the acting agent, reasoning, and confidence
- Event history is a product feature readable by both humans and agents

### 5. Error Taxonomy

- Errors return specific codes (`INSUFFICIENT_PERMISSIONS`, `MISSING_EVIDENCE_DOCUMENT`, `THRESHOLD_EXCEEDED`), not generic `400 Bad Request`
- Error responses include correction hints (what is needed to fix the request)

### 6. Surface Area Sync

- Every task has a deep-linkable URI an agent can hand to a human (e.g., `app.com/verify/txn_123`)
- Anything a human can do in the UI is also available via API (headless-first)
- UI visually attributes automated actions ("Automated by [Agent Name]")

## 4-Layer Audit

Run this as a final gate before shipping any new capability:

```
- [ ] Truth:     Is the data structured and historically indexed?
- [ ] Policy:    Are permissions and guardrails enforced at the API level?
- [ ] Execution: Can this be triggered via a single, idempotent API call?
- [ ] Interface:  Does the UI reflect the state of the first three layers?
                  Does the human "Approve" button call the exact same endpoint an agent would?
```

**Litmus test:** If you deleted the entire frontend, could an LLM still operate the feature through the API alone? The UI should only provide humans a high-bandwidth view of the Truth and Policy layers.

## Reference

- [agent-readiness.md](../../../product-architecture/agent-readiness.md) -- full guide with rationale and examples
