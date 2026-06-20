# MIRA Knowledge Base and RAG Specification

**Version:** 1.0  
**Date:** 2026-06-15  
**Status:** Document ingestion, retrieval and AI knowledge architecture specification  
**Primary services:** Supabase Storage, Supabase Postgres, Supabase pgvector, AI provider abstraction  

---

## 0. Purpose

This document defines the MIRA Knowledge Base and Retrieval-Augmented Generation system.

The knowledge base allows MIRA admin, and later associations, companies and universities, to upload documents that AI modules can use safely and contextually.

The founder must be able to upload documents directly inside MIRA, without manually using Supabase.

---

## 1. Product Role

The knowledge base supports:

- association page generation;
- candidate evaluation;
- transcript interpretation;
- student profile summaries;
- association project analysis;
- company matching;
- simulations;
- surgical orientation;
- admin QA and support.

MIRA must not rely on a single giant prompt. It should retrieve relevant knowledge for each AI task.

---

## 2. Core Principles

### 2.1 Scoped Knowledge

Not every document is available to every AI module or user.

Each document must have a scope.

Examples:

```text
global_mira
association_specific
application_cycle_specific
university_specific
company_specific
simulation_specific
admin_only
ai_internal_only
```

### 2.2 Metadata Matters

Every document must include metadata so retrieval can be filtered.

Without metadata, the AI may retrieve irrelevant or unauthorized content.

### 2.3 Human Control

Admin-uploaded or AI-extracted knowledge can be draft, processed, approved, archived or rejected.

Important mappings should be human-reviewable.

### 2.4 Privacy-Aware Retrieval

AI modules must retrieve only documents the current task is allowed to use.

For example:

- association A cannot use association B private documents;
- companies cannot retrieve student private onboarding documents;
- student orientation can use academic data but not other students' private data;
- admin-only documents are not available to normal users.

---

## 3. Supported Document Types

Initial supported inputs:

```text
PDF
DOCX
TXT
Markdown
CSV
website URL
pasted text
```

Future supported inputs:

```text
XLSX
PPTX
HTML crawl
Notion export
Google Drive import
association report packages
company assessment files
```

---

## 4. Knowledge Document Categories

```text
product_internal
association_public_info
association_private_info
association_project_report
application_evaluation_criteria
university_course_catalog
course_syllabus
degree_program_brochure
career_path_knowledge
micro_sector_taxonomy
skill_taxonomy
simulation_material
company_public_profile
company_recruiting_profile
admin_policy
legal_privacy
support_note
```

---

## 5. Admin Upload Flow

### 5.1 Route

```text
/admin/knowledge-base
```

### 5.2 Flow

1. MIRA admin opens knowledge base page.
2. Admin selects upload type:
   - file;
   - URL;
   - pasted text.
3. Admin adds metadata:
   - title;
   - category;
   - scope;
   - linked entity optional;
   - visibility;
   - notes.
4. File is stored in Supabase Storage if applicable.
5. `knowledge_documents` record is created.
6. Processing job starts.
7. Text is extracted.
8. Text is chunked.
9. Embeddings are generated.
10. Chunks are stored with metadata.
11. Document status becomes `processed` or `failed`.
12. Admin can inspect, approve, archive or reprocess.

---

## 6. Association Upload Flow Future

Associations may upload:

- public reports;
- internal project files;
- recruiting criteria;
- team descriptions;
- event information.

Rules:

- association uploads are scoped to that association by default;
- public reports can become public after association confirmation;
- project contributor extraction requires human confirmation;
- association cannot upload documents to global scope.

---

## 7. Company Upload Flow Future

Companies may upload:

- company profile material;
- job descriptions;
- recruiting criteria;
- assessment tasks;
- company simulation materials.

Rules:

- company uploads are scoped to company by default;
- company-created simulations require MIRA moderation before student use;
- company documents cannot influence unrelated company searches.

---

## 8. Storage Architecture

### 8.1 Buckets

```text
knowledge-base
association-projects
company-documents future
simulation-materials future
academic-documents
```

### 8.2 File Path Pattern

```text
knowledge-base/{scope}/{document_id}/{original_filename}
```

Examples:

```text
knowledge-base/global_mira/doc_123/mira_product_spec.pdf
knowledge-base/association_specific/assoc_456/report.pdf
knowledge-base/university_specific/bocconi/syllabus_corporate_valuation.pdf
```

### 8.3 Storage Rules

- raw files are private by default;
- public documents require explicit public status;
- signed URLs should be time-limited;
- service role operations only server-side;
- file access must match document scope.

---

## 9. Processing Pipeline

### 9.1 Statuses

```text
draft
uploaded
processing
text_extracted
chunked
embedded
processed
approved
failed
archived
```

### 9.2 Steps

```text
Upload
Metadata validation
Text extraction
Text cleaning
Chunking
Embedding generation
Chunk storage
Quality check
Approval optional
Available for retrieval
```

### 9.3 Text Extraction

Extraction should preserve:

- headings;
- tables when possible;
- page numbers;
- source file reference;
- section hierarchy;
- URLs;
- metadata.

For complex documents, extraction quality should be inspectable.

### 9.4 Chunking

Chunking rules:

- preserve semantic sections;
- avoid splitting tables badly;
- include document title and section metadata;
- keep chunk size compatible with embedding model;
- store overlap where useful.

Suggested fields:

```text
chunk_index
content
content_hash
section_title
page_start
page_end
token_count
metadata
embedding
```

---

## 10. Embeddings

Use Supabase pgvector or Supabase Vector.

Embedding records should include:

```text
knowledge_document_id
chunk_id
embedding_model
embedding_vector
created_at
```

Do not hardcode embedding provider.

Use AI provider abstraction for embeddings too if possible.

---

## 11. Retrieval Logic

### 11.1 Retrieval Inputs

```text
query
ai_module_type
user_id
user_role
scope_filters
linked_entity_ids
document_categories
max_results
similarity_threshold
```

### 11.2 Retrieval Filters

Before vector similarity, apply authorization filters:

- visibility scope;
- document category;
- linked association/company/university;
- user permission;
- approval status;
- archived status.

### 11.3 Retrieval Output

```json
{
  "chunks": [
    {
      "chunk_id": "...",
      "document_id": "...",
      "title": "...",
      "content": "...",
      "metadata": {},
      "similarity": 0.82
    }
  ],
  "retrieval_scope": "association_specific",
  "warnings": []
}
```

---

## 12. AI Module Usage

### 12.1 Candidate Evaluation

Can retrieve:

- association profile;
- application cycle criteria;
- association-specific documents;
- global MIRA evaluation guidelines;
- student application data provided directly.

Cannot retrieve:

- other associations' private data;
- student private data unrelated to application;
- company documents.

### 12.2 Association Page Generation

Can retrieve:

- association website extraction;
- public association documents;
- admin-provided notes.

Output must remain draft until president/admin approval.

### 12.3 Project Analysis

Can retrieve:

- uploaded project file;
- association context;
- skill taxonomy;
- project evaluation guidelines.

### 12.4 Company Matching

Can retrieve:

- company search criteria;
- company profile;
- visible student evidence;
- skill taxonomy;
- career taxonomy.

Cannot retrieve:

- private student onboarding answers;
- raw transcript unless shared;
- identity before consent.

### 12.5 Orientation

Can retrieve:

- academic documents;
- course syllabi;
- career path taxonomy;
- skill taxonomy;
- simulation catalog.

### 12.6 Simulations

Can retrieve:

- simulation brief;
- rubric;
- allowed support material;
- skill taxonomy.

Must not retrieve hidden answer keys for student-facing AI tutor.

---

## 13. Database Entities

```text
knowledge_documents
knowledge_chunks
knowledge_embeddings optional separate
knowledge_document_versions
knowledge_processing_jobs
knowledge_retrieval_logs
knowledge_access_policies
knowledge_source_urls
knowledge_document_links
```

### 13.1 `knowledge_documents`

Fields:

```text
id
title
source_type
category
visibility_scope
linked_entity_type
linked_entity_id
uploaded_file_id
source_url
uploaded_by_user_id
processing_status
approval_status
metadata
created_at
updated_at
archived_at
```

### 13.2 `knowledge_chunks`

Fields:

```text
id
knowledge_document_id
chunk_index
content
content_hash
section_title
page_start
page_end
token_count
metadata
embedding
created_at
```

### 13.3 `knowledge_retrieval_logs`

Fields:

```text
id
ai_module_type
user_id
query_hash
scope_filters
retrieved_chunk_ids
created_at
```

Avoid storing full sensitive prompts if not necessary.

---

## 14. Access Scopes

### 14.1 Global MIRA

Available to internal AI modules where appropriate.

Examples:

- product guidelines;
- evaluation rubric templates;
- skill taxonomy.

### 14.2 Association-Specific

Available only to:

- association admins/members with permission;
- AI modules working on that association;
- MIRA admin.

### 14.3 Application-Cycle-Specific

Available only for one application cycle.

Examples:

- scoring criteria;
- role descriptions;
- hidden board notes if allowed for AI.

### 14.4 University-Specific

Used for orientation and transcript interpretation.

### 14.5 Company-Specific

Used for company profile, matching and recruiting workflows.

### 14.6 Admin-Only

Never shown to normal users.

---

## 15. Reprocessing and Versioning

### 15.1 Reprocessing

Admin can reprocess a document when:

- extraction failed;
- chunking rules changed;
- embedding model changed;
- metadata changed;
- source file updated.

### 15.2 Versioning

Do not silently overwrite important documents.

Create versions for:

- syllabus changes;
- association recruiting criteria changes;
- simulation rubric changes;
- company role description changes;
- product policy changes.

### 15.3 Version Fields

```text
document_id
version_number
previous_version_id
change_reason
created_by_user_id
created_at
```

---

## 16. Admin UI Requirements

Admin knowledge base page should include:

- upload button;
- URL import;
- pasted text entry;
- document list;
- filters by category/scope/status;
- processing status;
- error details;
- reprocess action;
- archive action;
- metadata editor;
- chunk preview;
- retrieval test tool future.

### 16.1 Retrieval Test Tool Future

Admin can test:

```text
Given this query and module, which chunks would MIRA retrieve?
```

This helps debug AI behavior.

---

## 17. Safety Rules

- RAG must never override permissions.
- Retrieval must filter unauthorized documents before vector search results are used.
- Do not send raw private files to AI unless necessary and allowed.
- Do not retrieve hidden answer keys into student-facing simulation tutor.
- Do not expose admin-only policies to students, companies or associations.
- Store retrieval logs for debugging, but avoid storing sensitive prompt text unnecessarily.

---

## 18. Quality Controls

Knowledge documents should have quality indicators:

```text
extraction_quality
metadata_completeness
human_approved
last_reviewed_at
source_reliability
academic_year
```

AI responses should include uncertainty when retrieved knowledge is weak or outdated.

---

## 19. Rollout Sequence

1. Admin upload UI.
2. File storage and metadata table.
3. Basic text extraction.
4. Chunking.
5. Embeddings.
6. Retrieval helper with scope filtering.
7. Candidate evaluation retrieval.
8. Association page generation retrieval.
9. Project analysis retrieval.
10. Orientation academic knowledge retrieval.
11. Simulation retrieval.
12. Company matching retrieval.

---

## 20. Acceptance Criteria for First Knowledge Base Release

Ready when:

- MIRA admin can upload a PDF from app;
- file is stored in Supabase Storage;
- document metadata is stored;
- processing status is visible;
- text can be extracted or failure is shown;
- chunks are created;
- embeddings can be generated when API is configured;
- retrieval respects scope;
- unauthorized users cannot access documents;
- admin can reprocess failed document.

