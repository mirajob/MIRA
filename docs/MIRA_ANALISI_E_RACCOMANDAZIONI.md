# MIRA — Analisi, Funzionalità Aggiuntive e Stack Tecnologico

**Data:** 2026-06-18  
**Versione:** 1.0  
**Scopo:** Analisi della coerenza del progetto, aggiunte funzionali raccomandate e raccomandazione dello stack tecnologico per lo sviluppo.

---

## 1. Sintesi della Valutazione

I due documenti di specifica (Master e First Build) sono ben strutturati e coerenti tra loro. La visione è chiara e differenziante. Il primo build è correttamente delimitato senza bloccare la crescita futura. Le aggiunte che seguono colmano i gap identificati nell'analisi, senza modificare la struttura esistente.

---

## 2. Funzionalità Aggiunte Raccomandate

### 2.1 Onboarding Conversazionale — Struttura Minima Definita

**Problema:** i documenti menzionano l'onboarding conversazionale ma non definiscono quante domande, di che tipo, né quali campi producono nel profilo studente.

**Aggiunta raccomandata:**

L'onboarding conversazionale del primo build si articola in due fasi:

**Fase A — Dati strutturati (raccolta diretta):**
- Nome completo
- Corso di laurea (triennale / magistrale / ciclo unico)
- Anno di corso
- Anno di immatricolazione
- Lingue parlate (livello)

**Fase B — Domande conversazionali (7 domande, testo libero):**

1. Hai mai fatto parte di una associazione universitaria o extracurriculare? Se sì, in che ruolo?
2. Hai avuto esperienze lavorative, stage o attività freelance? Anche brevi o informali.
3. C'è un settore o un ambito professionale che ti attira particolarmente in questo momento? Perché?
4. Cosa ti ha spinto a usare MIRA e a candidarti a questa associazione?
5. Come descrivi il tuo modo di lavorare in gruppo? Preferisci coordinarti, eseguire, proporre?
6. Quanto tempo a settimana puoi dedicare ad attività extracurriculari in questo periodo?
7. C'è qualcosa di te che ritieni rilevante e che non troveremo nel tuo libretto universitario?

**Campi prodotti nel profilo studente (jsonb `onboarding_answers`):**
```json
{
  "association_experience": "...",
  "work_experience": "...",
  "sector_interest": "...",
  "motivation": "...",
  "working_style": "...",
  "time_availability": "...",
  "additional_self_description": "..."
}
```

**Nota implementativa:** le domande della Fase B non devono essere presentate come un form tradizionale. L'interfaccia deve mostrare una domanda alla volta con un'area di testo, progressione visiva (es. 3 di 7) e la possibilità di tornare indietro. Su mobile, la UX deve sentirsi come una conversazione.

---

### 2.2 Transcript — Output Minimo Definito

**Problema:** il parser del libretto è menzionato senza definire cosa deve produrre come output minimo accettabile.

**Aggiunta raccomandata:**

Il parser del libretto Bocconi deve produrre il seguente output JSON strutturato. Se un campo non è estraibile, deve essere marcato come `null` con `extraction_confidence: "low"`, non omesso.

```json
{
  "degree_program": "string | null",
  "degree_level": "triennale | magistrale | ciclo_unico | null",
  "academic_year_extracted": "string | null",
  "weighted_average": "number | null",
  "total_credits_earned": "number | null",
  "total_credits_expected": "number | null",
  "completion_percentage": "number | null",
  "exams": [
    {
      "name": "string",
      "credits": "number | null",
      "grade": "number | string | null",
      "date": "string | null",
      "status": "passed | pending | null"
    }
  ],
  "academic_summary": "string",
  "extraction_confidence": "high | medium | low",
  "extraction_notes": "string | null"
}
```

**Regole del parser:**
- Se il PDF è in formato testo nativo (non scansionato), usare estrazione diretta e AI per strutturare.
- Se il PDF è scansionato, applicare OCR prima della strutturazione AI.
- Se la confidence è `low`, mostrare al MIRA admin un flag "Da rivedere" nella lista studenti.
- Lo studente non vede la confidence — vede solo "Libretto caricato" o "Libretto da riprocessare".
- L'`academic_summary` è una frase generata da AI (max 80 parole) che riassume il profilo accademico per uso interno ai board delle associazioni.

---

### 2.3 Valutazione AI — Logica dell'Input Esplicitata

**Problema:** lo schema JSON di output della valutazione AI è ben definito, ma non è mai specificato come l'associazione può orientare la valutazione per quel ciclo specifico.

**Aggiunta raccomandata:**

Il presidente, durante la creazione del ciclo di candidatura, può compilare un campo opzionale:

**"Criteri di valutazione per questo ciclo"** — testo libero (max 500 parole):
> Es. "Cerchiamo studenti di secondo o terzo anno con interesse per la finanza. Preferiamo profili con esperienze di leadership anche informali. Non è richiesta esperienza precedente in finanza, ma viene apprezzata la curiosità dimostrata. Il ruolo richiede disponibilità minima di 6 ore settimanali."

Questo testo viene incluso nell'input della valutazione AI come campo `evaluation_criteria_text` e influenza direttamente il giudizio di fit.

**Aggiunta allo schema di input AI (`evaluateApplication`):**

```json
{
  "association_name": "string",
  "association_description": "string",
  "cycle_title": "string",
  "cycle_description": "string",
  "evaluation_criteria_text": "string | null",
  "available_roles": ["string"],
  "questions_with_answers": [
    {
      "question": "string",
      "answer": "string",
      "ai_evaluated": true
    }
  ],
  "student_profile": {
    "degree_program": "string",
    "degree_level": "string",
    "current_year": "string",
    "onboarding_answers": {},
    "transcript_summary": "string"
  }
}
```

Questa aggiunta è a costo zero di implementazione e migliora significativamente la qualità e l'utilità della valutazione AI.

---

### 2.4 Flusso Richiesta di Accesso per Associazioni Non Invitate

**Problema:** senza un canale di ingresso per associazioni non ancora invitate, ogni nuova onboarding richiede un'azione manuale del MIRA admin su iniziativa dello stesso admin.

**Aggiunta raccomandata:**

Aggiungere al sito pubblico una pagina:

```
/per-le-associazioni
```

con un form di richiesta accesso contenente:
- Nome associazione
- Nome del presidente
- Email del presidente (@studbocconi.it)
- Sito web dell'associazione (opzionale)
- Breve descrizione (max 200 caratteri)
- Tasto "Invia richiesta"

**Flusso:**
1. Richiesta salvata in tabella `association_access_requests` (status: `pending`).
2. MIRA admin riceve notifica email.
3. MIRA admin può approvare (genera invitation) o rifiutare (con nota opzionale).
4. Il richiedente riceve email di conferma o di rifiuto cortese.

**Tabella aggiuntiva `association_access_requests`:**
```
id uuid primary key
requester_name text
requester_email text
association_name text
association_website text
description text
status text  -- pending | approved | rejected
reviewed_by_user_id uuid references profiles(id)
review_note text
created_at timestamp
reviewed_at timestamp
```

Questo non rompe il modello di controllo centralizzato del primo build. Il MIRA admin mantiene pieno controllo. Si aggiunge solo un canale di ingresso strutturato.

---

### 2.5 Gestione Candidature Incomplete

**Problema:** nessun documento definisce cosa succede a uno studente che inizia il processo ma non lo completa (es. si registra, non carica il libretto, non finisce l'onboarding).

**Aggiunta raccomandata:**

**Stato della candidatura:** aggiungere lo stato `draft` prima di `submitted`.

Stati aggiornati:
```
draft          → candidatura iniziata ma non completata
submitted      → candidatura inviata
in_review      → in valutazione
interview      → convocato a colloquio
accepted       → accettato
rejected       → non selezionato
waitlisted     → lista d'attesa
withdrawn      → ritirato dallo studente
```

**Regole per le candidature in draft:**
- Vengono salvate automaticamente a ogni step completato (autosave).
- Non sono visibili ai board delle associazioni.
- Lo studente vede "Candidatura in bozza" nella sua area applicazioni.
- Dopo 7 giorni di inattività su una draft, viene inviato un promemoria email allo studente (se il ciclo è ancora aperto).
- Alla chiusura del ciclo, tutte le draft vengono archiviate automaticamente con status `expired_draft` (non `rejected`) — lo studente riceve una notifica neutra.

**Nota:** MIRA admin può vedere le statistiche di draft non completate per capire dove si bloccano gli studenti (analytics su onboarding drop-off).

---

### 2.6 Comportamento alla Chiusura del Ciclo di Candidatura

**Problema:** i documenti non definiscono cosa succede automaticamente quando un ciclo si chiude (manualmente o per scadenza).

**Aggiunta raccomandata:**

Alla chiusura di un ciclo (manuale o automatica per `closes_at`):

1. Il ciclo passa a status `closed`.
2. Il pulsante "Candidati" scompare dalla pagina pubblica dell'associazione.
3. Le candidature in status `draft` vengono archiviate con stato `expired_draft`.
4. Gli studenti con candidature `submitted` o in stato avanzato ricevono una notifica: "Il periodo di candidatura è terminato. La tua candidatura è ora in fase di valutazione."
5. Il presidente riceve una notifica: "Il ciclo [nome ciclo] si è chiuso. Hai N candidature da valutare."
6. La lista candidati del workspace associazione si congela: nessuna nuova candidatura può essere aggiunta.
7. I cicli chiusi rimangono accessibili in sola lettura nel workspace del presidente.

**Riapertura:** solo il presidente può riaprire un ciclo chiuso (se entro la data `closes_at` non è ancora passata), con log dell'azione nell'audit trail.

---

### 2.7 Comunicazione Post-Decisione

**Problema:** i documenti definiscono il cambio di status ma non cosa vede lo studente né se l'associazione può personalizzare il messaggio.

**Aggiunta raccomandata:**

Quando il presidente (o un board member autorizzato) cambia lo status di un candidato in `accepted`, `rejected` o `waitlisted`, il sistema mostra un dialogo di conferma con:

- Campo testuale opzionale: "Aggiungi un messaggio al candidato" (max 300 caratteri, default vuoto)
- Checkbox: "Invia email di notifica adesso" (default: sì)

**Comportamento:**
- Se il messaggio è vuoto, lo studente riceve una notifica standard di sistema: es. "La tua candidatura a [Nome Associazione] è stata esaminata. Siamo spiacenti di informarti che non sei stato selezionato per questa tornata."
- Se il messaggio è presente, viene incluso nella notifica email come testo aggiuntivo: "Un messaggio dall'associazione: [testo]."
- I messaggi personalizzati vengono loggati nell'audit trail come parte del cambio status.

**Importante:** il messaggio personalizzato è facoltativo e mai visibile ad altri candidati. Protegge la privacy e riduce il rischio di confronti tra candidati.

---

### 2.8 Sprint Mobile — Redistribuzione nei Sprint Esistenti

**Problema:** concentrare tutti i requisiti mobile in un unico Sprint 9 finale è un rischio di compressione. Se il mobile è first-class, deve essere validato progressivamente.

**Aggiunta raccomandata:**

Riscrivere il piano di sprint con una colonna "Mobile companion" per ogni sprint:

| Sprint | Focus principale | Requisito mobile minimo nello stesso sprint |
|--------|-----------------|---------------------------------------------|
| Sprint 0 | Setup monorepo | Shell Expo funzionante, compilazione iOS/Android verificata |
| Sprint 1 | Auth e profili | Login / Signup mobile con verifica email funzionante |
| Sprint 2 | Invitation e workspace | Accettazione invitation da mobile funzionante |
| Sprint 3 | Cicli e domande | Pagina pubblica associazione e CTA "Candidati" su mobile |
| Sprint 4 | Onboarding e transcript | Onboarding conversazionale e upload libretto da mobile |
| Sprint 5 | Submission | Candidatura completa inviabile da mobile |
| Sprint 6 | AI Evaluation | Candidate detail con AI summary su mobile (sola lettura) |
| Sprint 7 | Board e permessi | Role switcher completo su mobile, accesso board |
| Sprint 8 | Interview e notifiche | Push notifications su mobile, accettazione intervista |
| Sprint 9 | Mobile polish | QA mobile completo, edge cases, UX review |
| Sprint 10 | Knowledge base | N/A (admin è web-first) |
| Sprint 11 | QA e launch | Test E2E cross-platform, TestFlight / Play Store beta |

Lo Sprint 9 diventa uno sprint di qualità e rifinitura mobile, non di implementazione.

---

### 2.9 Notifiche — Livello di Priorità per il Primo Build

**Problema:** nessun documento distingue le notifiche obbligatorie al lancio da quelle opzionali, creando ambiguità nell'implementazione.

**Classificazione raccomandata:**

**Obbligatorie al lancio (Sprint 8):**
- Email di verifica account
- Email invitation presidente
- Email invitation board member
- Email conferma candidatura inviata
- Email cambio status candidatura (accepted / rejected / waitlisted)
- Email convocazione colloquio
- Notifica in-app per tutti gli eventi sopra

**Opzionali primo build (da pianificare, non bloccare il lancio):**
- Push notification mobile (aggiungere quando mobile è stabile)
- Email promemoria scadenza ciclo (facile, ma non critico per il lancio)
- Email promemoria candidatura in draft (utile, aggiungibile dopo il lancio)

**Futuri:**
- Integrazione calendario (Google Calendar / Outlook) per gli slot colloquio
- Notifiche aggregate settimanali per i board member
- Digest attività per il presidente

---

## 3. Stack Tecnologico Raccomandato

### 3.1 Principio Guida

Lo stack deve rispettare tre vincoli principali che emergono dalla specifica:

1. **Condivisione massima del codice** tra web e mobile (un backend, una logica di business, un sistema di tipi).
2. **Velocità di sviluppo in modalità AI-assisted** con Claude Code o strumenti equivalenti — il monorepo deve essere navigabile e comprensibile per un agente AI.
3. **Scalabilità senza over-engineering iniziale** — Supabase è già la scelta giusta come backend as-a-service; non aggiungere complessità che non serve prima di Phase 3 (aziende).

---

### 3.2 Stack Completo Raccomandato

#### Monorepo

**Turborepo** — gestione monorepo, caching dei build, dipendenze tra packages.

```
mira/
  apps/
    web/          → Next.js
    mobile/       → Expo (React Native)
  packages/
    ui/           → componenti condivisi (web e mobile separati dove necessario)
    types/        → TypeScript types condivisi
    supabase/     → client Supabase, helper di autenticazione, tipi generati
    ai/           → astrazione AI service
    domain/       → business logic condivisa (validazioni, formatters, costanti)
    config/       → ESLint, TypeScript base, Tailwind preset
```

---

#### Web App

| Layer | Tecnologia | Motivo |
|-------|-----------|--------|
| Framework | **Next.js 15** (App Router) | Server components, Server Actions, routing nativo, ottimo con Supabase |
| Linguaggio | **TypeScript** | Obbligatorio per un prodotto a lungo termine |
| Stile | **Tailwind CSS v4** | Coerente con il design system, ottimo con shadcn |
| Componenti | **shadcn/ui** | Componenti headless personalizzabili, accessibili, non opinionati sul look |
| Form | **React Hook Form + Zod** | Validazione tipi-safe, gestione errori, compatibile con Server Actions |
| State | **React Query (TanStack Query)** | Caching, refetch, ottimismo, ideale con Supabase |
| Tabelle | **TanStack Table** | Per candidate list e admin console, potente e personalizzabile |

---

#### Mobile App

| Layer | Tecnologia | Motivo |
|-------|-----------|--------|
| Framework | **Expo SDK 52+** | Managed workflow, OTA updates, EAS Build, push nativo |
| Base | **React Native** | Condivisione logica con web, TypeScript nativo |
| Navigazione | **Expo Router** | File-based routing, coerente con Next.js, tipato |
| Stile | **NativeWind v4** | Tailwind CSS per React Native, coerente con il web |
| Componenti | **React Native Paper o Tamagui** | Tamagui se si vuole condivisione componenti web/mobile; Paper se si vuole semplicità |
| Form | **React Hook Form + Zod** (stesso del web) | Validazione condivisa tra web e mobile |
| Push | **Expo Notifications** | Integrazione nativa iOS/Android, gestibile da Supabase Edge Functions |

**Nota su Tamagui vs Paper:** se la UI web e mobile non condividono componenti visivi (percorso più semplice), usare React Native Paper sul mobile. Se si vuole un sistema di design unificato con componenti che girano su entrambe le piattaforme, Tamagui è più potente ma più complesso da configurare. Per il primo build, **Paper è la scelta più pragmatica**.

---

#### Backend e Database

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Database | **Supabase Postgres** | PostgreSQL hosted, RLS nativa, pgvector per embeddings |
| Auth | **Supabase Auth** | Email/OTP nativo, validazione dominio, sessioni JWT, integrazione RLS |
| Storage | **Supabase Storage** | Buckets, signed URLs, integrazione nativa con RLS |
| Realtime | **Supabase Realtime** | Per notifiche in-app live e aggiornamenti status candidatura |
| Funzioni server | **Supabase Edge Functions** (Deno) | Per logic server-side che non va in Next.js: processing transcript, trigger AI, invio email |
| Vector search | **pgvector** (via Supabase) | Per knowledge base RAG — già integrato in Supabase, nessuna infrastruttura aggiuntiva |

**Migrations:** gestite con **Supabase CLI** (`supabase db push`, `supabase migration new`). Tutte le migrazioni versionate in Git.

---

#### Layer AI

| Funzione | Tecnologia | Motivo |
|---------|-----------|--------|
| Provider primario | **Anthropic Claude (claude-sonnet-4-6)** | Migliore per testo lungo, valutazione, estrazione strutturata |
| Provider fallback | **OpenAI GPT-4o** | Come fallback o per specifici task di estrazione PDF |
| Astrazione | **AI SDK (Vercel)** | Unifica provider, streaming, structured outputs, facilmente estendibile |
| Transcript parsing | **AI SDK + prompt strutturato** | PDF → testo via pdfjs-dist, poi AI per strutturazione JSON |
| Embeddings | **text-embedding-3-small (OpenAI)** | Piccolo, veloce, ottimo per knowledge base retrieval |
| Orchestrazione | **Supabase Edge Functions** | Ogni chiamata AI è una Edge Function isolata, loggata, testabile |

**Pattern astrazione AI (`packages/ai`):**
```typescript
// Ogni funzione AI è esportata come funzione tipata
export async function evaluateApplication(input: EvaluateApplicationInput): Promise<EvaluationOutput>
export async function parseTranscript(pdfText: string): Promise<TranscriptData>
export async function generateAssociationPageDraft(input: PageDraftInput): Promise<string>
export async function summarizeStudentProfile(input: StudentProfileInput): Promise<string>
```

Questo garantisce che un futuro switch di provider (es. da Anthropic a Gemini) richieda modifiche solo all'interno del package `ai`, senza toccare il resto del codice.

---

#### Email e Notifiche

| Canale | Tecnologia | Motivo |
|--------|-----------|--------|
| Email transazionale | **Resend** | Developer-friendly, template React via react-email, gratuito fino a 3.000 email/mese |
| Template email | **react-email** | Email costruite come componenti React, preview in browser, testabili |
| In-app notifications | **Supabase Realtime + tabella `notifications`** | Subscribe al canale Realtime sul frontend per aggiornamenti istantanei |
| Push mobile | **Expo Push Notifications** | Gestito da Expo, nessun server APNs/FCM da configurare manualmente |

---

#### Infrastruttura e Deploy

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Source control | **GitHub** | Standard, integrazione Vercel e Supabase nativa |
| Web hosting | **Vercel** | Preview deploy automatici per PR, edge network, integrazione Next.js perfetta |
| Mobile builds | **Expo EAS Build** | Cloud builds per iOS e Android, OTA updates, distribuzione TestFlight/Play Store |
| CI/CD | **GitHub Actions** | Lint, typecheck, test, migration check prima di ogni merge |
| Secrets | **Vercel env + Supabase Vault** | Nessun secret in chiaro nel codice |

---

#### Analytics, Monitoring ed Error Tracking

| Strumento | Uso |
|----------|-----|
| **PostHog** (self-hosted o cloud) | Product analytics: onboarding funnel, application completion, AI evaluation usage |
| **Sentry** | Error tracking web e mobile, session replay, performance monitoring |
| **Supabase audit_logs** (tabella interna) | Log sensibili: role changes, status changes, AI evaluation regen, raw transcript access |
| **Supabase ai_logs** (tabella interna) | Input/output AI, provider, model, latency — per debug e quality review |

---

### 3.3 Dipendenze Principali da NON Aggiungere (primo build)

Queste tecnologie possono sembrare utili ma aggiungono complessità senza valore nel primo build:

- **Redis** — non necessario: Supabase Realtime e React Query coprono i casi d'uso di cache per il primo build.
- **Kafka o message queue esterna** — over-engineering per il volume atteso.
- **GraphQL** — REST via Supabase è sufficiente; GraphQL aggiunge complessità senza benefici reali a questo stadio.
- **Separate Express/FastAPI backend** — Supabase Edge Functions + Next.js Server Actions coprono tutta la logica server necessaria senza un server separato da gestire.
- **Kubernetes** — Vercel + Supabase gestisce tutto. K8s è per quando si scala a livello enterprise.
- **Prisma ORM** — Supabase genera i tipi TypeScript direttamente dal database; Prisma duplicherebbe il layer di types e complicherebbe le migrazioni.

---

### 3.4 Diagramma dello Stack

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│                                                     │
│   ┌──────────────────┐    ┌──────────────────┐      │
│   │   Web App        │    │   Mobile App     │      │
│   │   Next.js 15     │    │   Expo / RN      │      │
│   │   App Router     │    │   Expo Router    │      │
│   │   Tailwind CSS   │    │   NativeWind     │      │
│   │   shadcn/ui      │    │   RN Paper       │      │
│   └────────┬─────────┘    └────────┬─────────┘      │
└────────────┼──────────────────────┼─────────────────┘
             │                      │
             ▼                      ▼
┌─────────────────────────────────────────────────────┐
│              SHARED PACKAGES (Turborepo)             │
│   types/  supabase/  ai/  domain/  config/          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 SUPABASE                            │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│   │ Auth     │  │ Postgres │  │ Storage      │     │
│   │ JWT/RLS  │  │ pgvector │  │ Signed URLs  │     │
│   └──────────┘  └──────────┘  └──────────────┘     │
│                                                     │
│   ┌──────────┐  ┌──────────────────────────────┐   │
│   │ Realtime │  │ Edge Functions               │   │
│   │ Live     │  │ AI calls, email triggers,    │   │
│   │ updates  │  │ transcript processing        │   │
│   └──────────┘  └──────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴───────────┐
          ▼                        ▼
┌──────────────────┐   ┌──────────────────────────┐
│   AI PROVIDERS   │   │   EXTERNAL SERVICES      │
│                  │   │                          │
│   Anthropic API  │   │   Resend (email)         │
│   OpenAI API     │   │   Expo Push (mobile)     │
│   (via AI SDK)   │   │   PostHog (analytics)    │
│                  │   │   Sentry (errors)        │
└──────────────────┘   └──────────────────────────┘
```

---

## 4. Piano degli Sprint Aggiornato

Versione aggiornata con requisito mobile per sprint e aggiunte funzionali integrate.

### Sprint 0 — Foundation
- Monorepo Turborepo
- App Next.js + shell Expo compilabile
- Packages condivisi (types, supabase, ai stub)
- Supabase project + env vars
- GitHub repo + GitHub Actions base
- Vercel deploy web + EAS profile mobile

### Sprint 1 — Auth, Profili, Ruoli
- Supabase Auth con validazione dominio @studbocconi.it
- Tabelle: `profiles`, `student_profiles`, `university_domains`
- Global roles (`student`, `mira_admin`)
- Role switcher foundation (web + mobile)
- Admin seed mechanism
- **Mobile:** Login / Signup / VerifyEmail funzionanti

### Sprint 2 — Admin e Workspace Associazioni
- Admin console base (`/admin`)
- Tabelle: `invitations`, `association_access_requests`
- Invitation sistema: crea, invia, accetta, revoca
- Pagina `/per-le-associazioni` con form richiesta accesso
- Workspace associazione base, president role
- Bozza pagina associazione
- **Mobile:** accettazione invitation da mobile

### Sprint 3 — Cicli e Domande
- Tabelle: `application_cycles`, `application_questions`
- Cycle builder: crea, modifica, apri/chiudi, archivia
- Question builder: tipi multipli, obbligatorio/opzionale, ordine
- Pagina pubblica associazione `/associations/[slug]`
- CTA "Candidati" con stato ciclo
- **Mobile:** pagina pubblica associazione e CTA su mobile

### Sprint 4 — Onboarding e Transcript
- Tabelle: `student_transcripts`
- Onboarding conversazionale (7 domande + dati strutturati)
- Upload transcript PDF
- Parser transcript con output JSON definito (sezione 2.2)
- Gestione parsing fallito
- **Mobile:** onboarding e upload transcript da mobile

### Sprint 5 — Candidatura
- Tabelle: `applications`, `application_answers`
- Status `draft` per candidature incomplete
- Autosave risposte durante la compilazione
- Submission review screen
- Stato candidatura studente
- Notifica email conferma submission
- **Mobile:** candidatura completa inviabile da mobile

### Sprint 6 — AI Evaluation e Candidate Review
- Tabelle: `candidate_ai_evaluations`, `candidate_internal_notes`, `application_status_events`
- AI evaluation con criteri personalizzati (sezione 2.3)
- Candidate list con filtri e sort
- Candidate detail view
- Internal notes
- Status workflow con dialogo post-decisione (sezione 2.7)
- Comunicazione post-decisione personalizzabile
- **Mobile:** candidate detail e AI summary (sola lettura)

### Sprint 7 — Board e Permessi
- Inviti board member con ruoli e permessi personalizzabili
- Server-side permission enforcement
- Role switcher completo
- Gestione rimozione board member
- **Mobile:** role switcher completo, accesso board mode

### Sprint 8 — Interview, Notifiche e Ciclo Lifecycle
- Tabelle: `interview_invites`, `notifications`
- Interview invite con proposta orari
- Comportamento chiusura ciclo automatica (sezione 2.6)
- Promemoria candidature in draft (sezione 2.5)
- Email obbligatorie: tutti gli eventi della sezione 2.9
- In-app notifications via Supabase Realtime
- **Mobile:** push notifications, accettazione intervista

### Sprint 9 — Mobile Polish
- QA completo su iOS e Android
- Edge cases e stati di errore mobile
- UX review onboarding mobile
- Ottimizzazione performance mobile
- TestFlight / Play Store beta build

### Sprint 10 — Admin Knowledge Base
- Upload documenti (PDF, DOCX, TXT, URL, testo)
- Text extraction + chunking + embeddings (pgvector)
- Processing status pipeline
- Admin document list con stato processing
- Retrieval base per AI evaluation

### Sprint 11 — QA, Sicurezza, Launch
- RLS review completo
- Test E2E flussi principali
- Error states e edge cases web
- Production deploy
- Prima onboarding associazione reale

---

## 5. Note Finali

Il progetto è solido e può procedere allo sviluppo. Le aggiunte di questo documento non richiedono modifiche architetturali, ma colmano gap funzionali che avrebbero creato ambiguità durante l'implementazione.

Le tre aggiunte con il maggior impatto immediato sulla qualità del prodotto sono:

1. La struttura definita dell'onboarding conversazionale (sezione 2.1) — senza di essa, il profilo studente è vuoto e la valutazione AI perde il suo input più ricco.
2. I criteri di valutazione personalizzabili per ciclo (sezione 2.3) — senza di essi, la valutazione AI non è orientata e rischia di sembrare generica.
3. La redistribuzione dei requisiti mobile negli sprint (sezione 2.8) — senza di essa, il mobile viene scoperto tardi e il rischio di delay al lancio è alto.

---

*Documento generato il 2026-06-18 come integrazione alla specifica MIRA v1.0*
