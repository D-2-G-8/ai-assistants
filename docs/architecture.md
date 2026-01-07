# AI Workflow Platform Architecture

This document describes the supported architecture for the AI-workflow platform
built on Next.js App Router, TypeScript, and Tiptap.

## Goals and principles

- Document is the central entity (Tiptap JSON, metadata, docType).
- Run is the unit of work and is always recorded with document and profile
  versions.
- Scenario source of truth is action (no intent axis).
- Assistant is defined by AssistantProfile + registry; UI/API are profile-driven.
- LLM output is strict JSON validated with zod; no free-form text responses.
- Standard output shape is findings[] + artifacts[].
- Storage is abstracted; current implementation uses localStorage.

## Domain model (minimal)

Document
- id, title
- docType: business | technical | testcase | autotest | code
- content: Tiptap JSON
- meta: object
- versionId: string (changes on content save)
- status, timestamps, qa, ignoredFindingIds

AssistantProfile
- id, name
- docTypes supported
- actions supported (lint | draft | extract | generate | refactor | explain)
- promptTemplateId + promptTemplateVersion
- llm settings (provider, model, temperature)
- inputSchema + outputSchema (zod)
- uiSchema (schema-driven panel)
- versionId
- optional normalizeOutput (legacy format -> findings/artifacts)

Run
- id
- documentId
- inputDocumentVersionId
- assistantProfileId
- assistantProfileVersionId
- action
- status (queued/running/succeeded/failed)
- promptSnapshot, rawResponse
- result: { findings[], artifacts[] }
- metrics, timestamps

Finding
- severity: info | warn | error
- kind: issue | question | recommendation
- message, suggestion, category
- anchor: quote/startHint/endHint/path (optional)
- source: ai | user

Artifact
- doc_patch (JSON Patch for Tiptap JSON)
- blocks (structured blocks for insertion)
- policy: apply (manual/auto), requiresHumanReview, patchType

## Layered architecture

app/
- App Router pages and route handlers.

platform/
- assistant-runtime (registry, profiles, prompt templates, pipeline)
- artifacts (types, schema, normalize, apply)
- editor (tiptap, converters)
- storage (document/run store + localStorage implementation)

features/
- feature-oriented UI (document editor shell, findings list)

shared/
- shared utilities (ids) and future UI primitives

lib/
- text-prep pipeline, OpenRouter gateway, lint prompt builder

## Runtime pipeline

prepare -> buildPrompt -> callLLM -> parseJSON -> validate(zod)
-> normalize -> persist -> return

- prepare: snapshot document + inputs + profile
- buildPrompt: profile template + sanitized text
- callLLM: OpenRouter gateway
- parse/validate: strict JSON required
- normalize: convert legacy formats to standard results
- persist: store Run (localStorage now)

## API

POST /api/assistant/run
- body: { documentId, action, assistantProfileId?, inputs?, document }
- resolves profile by (docType, action) if not provided
- returns run + result + promptSnapshot

POST /api/lint
- backward compatible proxy
- uses lint profile
- response remains issues/questions for existing UI contracts

## UI composition

DocumentEditorShell
- Tiptap editor
- RunAssistantPanel (profile-driven inputs)
- RunHistoryPanel
- FindingsList
- SanitizePreview (dev)

## Supported flows

- business, technical: editor + lint (current).
- testcase: placeholder; generated from business/technical and published to TestOps.
- autotest: placeholder; generated from testcases and published as MR in autotest repo.
- code: placeholder; generated from business/technical and published as MR in service repo.

## Extensibility

Add a new AssistantProfile by:
1) creating a prompt template
2) defining zod output schema
3) setting uiSchema for inputs
4) registering profile for docType + action

Add new artifact types by:
- extending platform/artifacts/types.ts and schema.ts
- adding apply logic in platform/artifacts/apply.ts
- updating UI render/apply controls

## Backward compatibility

- /api/lint remains as a proxy for lint runs.
- Legacy lint output (issues/questions) is normalized into findings/artifacts.
