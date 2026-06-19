-- Migration 006: Knowledge base
-- knowledge_documents, knowledge_chunks

create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null,
  category text,
  visibility_scope visibility_scope not null,
  uploaded_file_id uuid references uploaded_files(id),
  uploaded_by_user_id uuid references profiles(id),
  processing_status knowledge_processing_status default 'uploaded',
  linked_association_id uuid references association_profiles(id),
  linked_university text,
  linked_application_cycle_id uuid references application_cycles(id),
  metadata jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger knowledge_documents_updated_at
  before update on knowledge_documents
  for each row execute function update_updated_at_column();

-- Text chunks with embeddings for RAG
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  knowledge_document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(knowledge_document_id, chunk_index)
);

create index knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Enable RLS
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
