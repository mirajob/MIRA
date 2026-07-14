# MIRA — Stato del prodotto costruito

**Data:** 14 luglio 2026
**Scopo:** fotografia completa e onesta di ciò che è stato costruito fino ad oggi, per lavorare esternamente su come migliorare o ristrutturare il prodotto — in particolare il flusso di onboarding e le domande che pone.
**Come leggerlo:** la Parte 1 è per chiunque (nessun linguaggio tecnico): descrive il prodotto dall'inizio alla fine, comprese *tutte le domande reali* che MIRA fa allo studente, riportate parola per parola. La Parte 2 è tecnica (stack, database, architettura). La Parte 3 elenca i punti aperti e le criticità note, utili per la revisione.

---

# PARTE 1 — IL PRODOTTO (leggibile da chiunque)

## 1.1 Cos'è MIRA

MIRA è una piattaforma web per il talento universitario, costruita intorno all'intelligenza artificiale. L'idea di fondo: lo studente non compila form e non scrive CV — **parla con MIRA in chat**, e MIRA costruisce per lui un profilo professionale basato su evidenze reali (voti, esperienze, competenze verificabili), chiamato **MIRA Card**. Quella card è poi il modo in cui associazioni universitarie e aziende lo trovano e lo valutano.

Il primo modulo in produzione è quello delle **associazioni studentesche Bocconi**: gli studenti si candidano alle associazioni tramite MIRA, e le associazioni gestiscono le selezioni (candidature, valutazioni AI, colloqui) dentro MIRA invece che con form, fogli Excel ed email. In parallelo è stato costruito — oltre lo scope inizialmente previsto — un primo **modulo aziende**: le aziende cercano studenti compatibili tramite una chat AI che legge le MIRA Card in forma anonima.

## 1.2 Chi usa MIRA (4 tipi di utenti)

1. **Studente** — crea il profilo (MIRA Card) tramite chat, si candida alle associazioni, traccia lo stato delle candidature, può essere trovato dalle aziende.
2. **Associazione** (presidente + board) — ha una pagina pubblica, apre cicli di candidatura con domande personalizzate, rivede i candidati con l'aiuto dell'AI, gestisce stati e colloqui. Il presidente viene invitato ufficialmente dall'admin MIRA (niente associazioni fake). I membri del board sono a loro volta studenti, con permessi granulari.
3. **Azienda** — accede a un workspace dove cerca candidati descrivendo in chat cosa cerca; vede profili **anonimi** (codici candidato, mai nomi) e può richiedere il contatto.
4. **Admin MIRA** — console nascosta: invita presidenti, gestisce associazioni, aziende, utenti, knowledge base.

Una persona è sempre un account solo: uno studente può essere anche presidente di un'associazione e cambiare "modalità" dall'interfaccia.

**Regola di accesso importante:** la registrazione è aperta a più università (domini email universitari verificati), ma la parte associazioni — sfoglia e candidati — è riservata agli studenti con università "Università Bocconi". Il vincolo è applicato anche lato server, non solo nascosto nell'interfaccia.

## 1.3 La MIRA Card — il cuore del prodotto

> **⚠️ SUPERATO (2026-07-14):** le sezioni 1.3 e 1.4 descrivono lo stato costruito *prima* del rework. La nuova specifica approvata (6 blocchi, "Disponibilità e piano", "Profilo personale", niente quiz soft skill, conferma blocchi anche via chat) è in `docs/MIRA_CARD_REWORK_SPEC.md` — quella è la fonte di verità per l'implementazione.

La MIRA Card è un "CV virtuale": una pagina in formato A4 fisso, uguale per chiunque la guardi (studente, associazione, azienda). È **sempre scritta in inglese** (il formato che aziende e associazioni si aspettano), anche se lo studente chatta in italiano: è MIRA a tradurre e dare forma.

È composta da **8 blocchi visibili**, ognuno dei quali passa per tre stati: *vuoto → bozza (proposta da MIRA) → approvato (confermato dallo studente)*. Niente entra nella card senza che lo studente lo confermi.

| Blocco | Contenuto |
|---|---|
| **Header** | Università, corso, livello (triennale/magistrale/ciclo unico), anno, anno di immatricolazione, anno di laurea previsto, media (dal libretto). Se magistrale: anche la triennale precedente. La visibilità della media è controllabile dallo studente. |
| **Esperienze** | Esperienze lavorative/extracurricolari, descritte in stile CV ("Built a…", "Led a team of…"), estratte dal CV caricato e/o raccontate in chat. |
| **Disponibilità** | Cosa cerca (stage, part-time, progetto… o "non in cerca"), in che ambito, da quando, dove. |
| **Competenze** | Tre categorie: *academic* (proposte automaticamente dai voti del libretto, raggruppati per area tematica), *hard* (strumenti/tecnologie citati dallo studente, con livello stimato), *soft* (dal quiz a scelta forzata — v. sotto). Ogni competenza ha un'evidenza (esame o esperienza reale): senza evidenza non entra in card. |
| **Lingue** | Lingue e livello, integrate anche dal CV. |
| **Interessi** | Prosa breve in prima persona su interessi professionali e personali reali. |
| **Autodescrizione** | 2-4 frasi in prima persona su chi è, con parole dello studente (mai aggettivi inventati dall'AI). |
| **Piano di carriera** | Dove sta andando, con uno stato interno onesto: direzione chiara / ipotesi / esplorazione. "Non ho ancora deciso" è una risposta valida. |

Il libretto e il CV si possono caricare (e ricaricare) anche in seguito dalla pagina Profilo.

## 1.4 Il percorso dello studente, dall'inizio alla fine

### Registrazione
Lo studente si registra con l'email universitaria, verifica l'email, e viene portato all'onboarding. L'onboarding è **obbligatorio** (almeno la Fase A) prima di potersi candidare a un'associazione.

### L'onboarding: una chat con un pannello live
Lo schermo è diviso in due: a sinistra la **chat con MIRA**, a destra il **pannello della card** che si riempie in tempo reale man mano che lo studente risponde. Quando un blocco è pronto, lo studente lo conferma **dal pannello** (bottone sul blocco), non in chat. La chat è in italiano o inglese (segue la lingua dell'interfaccia); la card è sempre in inglese.

L'onboarding è diviso in due fasi: **Fase A** (obbligatoria, sblocca la candidatura) e **Fase B** (facoltativa, completa la card).

---

### FASE A — obbligatoria (sblocca la candidatura alle associazioni)

**Passo 1 — Benvenuto.** MIRA si presenta:

> *"Ciao {nome}! Io sono MIRA. Costruiamo insieme la tua MIRA card: ti serve ora per candidarti alle associazioni, ed è il profilo con cui le aziende potranno trovarti e contattarti direttamente quando sarai compatibile con quello che stanno cercando. Più è fatta bene, più lavora per te. La tua MIRA card sarà scritta in inglese, il formato che aziende e associazioni si aspettano — ma con me puoi continuare a scrivere in italiano, ci penso io."*

**Passo 2 — Livello di studi.** Se il livello è già noto dalla registrazione: *"Dalla registrazione risulta che stai facendo {livello}. Confermi?"* Altrimenti: *"Partiamo dalle basi: studi triennale, magistrale o ciclo unico?"*

**Passo 3 — (solo magistrale) Triennale precedente.** *"Perfetto. Prima di procedere, dove hai fatto la triennale, in che corso e con che voto di laurea?"* (MIRA estrae anche il tema della tesi se citato.)

**Passo 4 — Libretto.** *"Carica il libretto in PDF: leggo corso, esami, voti e media direttamente da lì. Se non ce l'hai sotto mano, puoi saltare."*
- Se caricato, MIRA lo legge e risponde: *"Fatto: {N} esami, {N} CFU, media {X}/30. …"* più l'eventuale elenco dei dati ancora mancanti.
- Se saltato: *"Va bene — dimmi almeno il nome del corso e l'anno che frequenti: potrai caricare il libretto quando vuoi dal tuo Profilo, aggiornando media ed esami."*

**Passo 5 — Dati mancanti dell'Header.** MIRA chiede in modo mirato solo ciò che manca (*"Mi dici {campi mancanti}?"*) finché l'Header non è completo: università, corso, livello, anno di corso, anno di immatricolazione, anno di laurea previsto, media (se libretto caricato). Poi: *"Perfetto, la card è pronta — conferma il blocco Header qui a destra per continuare."*

**Passo 6 — CV.** Dopo la conferma dell'Header: *"Hai un CV? Caricalo e parto da lì per farti domande mirate sulle tue esperienze. Se non ce l'hai, nessun problema: lo costruiamo parlando."*

**Passo 7 — Esperienze.** Il comportamento dipende dal CV:
- Per ogni esperienza trovata nel CV, MIRA chiede: *"Su {titolo} @ {organizzazione} — cosa hai fatto tu, concretamente?"* Se il CV descrive già bene l'esperienza, propone invece: *"Il CV descrive già bene questa esperienza: {titolo} @ {org}. Va bene così com'è, o vuoi aggiungere o correggere qualcosa?"*
- In coda (o come unica domanda se non c'è CV) arriva la **domanda sull'esperienza nascosta**: *"C'è qualcosa che non hai mai messo nel CV? Progetti personali, competizioni, sport a livello agonistico, volontariato, lavori — qualsiasi cosa pensi possa rappresentarti."*
- Lo studente può interrompere in anticipo ("basta con le esperienze", "andiamo avanti") e MIRA chiude la fase.
- MIRA scrive le esperienze in card in stile CV inglese e chiede conferma del blocco.

**Passo 8 — Disponibilità.** *"Ultima cosa per sbloccare la candidatura: hai una disponibilità lavorativa da indicare, così le aziende possono trovarti quando sei compatibile? Dimmi cosa cerchi — uno stage in un ambito specifico, un part-time, un progetto — e da quando: va bene sia una data aperta ('da settembre in avanti') sia un periodo preciso ('da giugno ad agosto'). Dimmi pure se hai una preferenza di sede. Se invece non sei in cerca al momento o sei già impegnato altrove, dimmelo pure: va bene anche così."*

**Passo 9 — Il "gate".** Alla conferma della Disponibilità, l'onboarding obbligatorio è completo:

> *"Candidatura sbloccata. La tua card è al {X}%: puoi già candidarti alle associazioni su MIRA. Oppure completiamo le ultime sezioni — competenze, interessi, come ti descrivi, piano di carriera — in circa 5 minuti: le associazioni vedono un profilo molto più forte."*

Da qui lo studente può uscire e candidarsi, oppure proseguire con la Fase B.

---

### FASE B — facoltativa (completa la card)

**Passo 1 — Competenze accademiche (nessuna domanda).** MIRA analizza in autonomia gli esami e i voti del libretto, li raggruppa per area tematica e propone una competenza per ogni area dove lo studente è andato bene. In chat dice solo: *"Completiamo insieme le ultime sezioni: qualche minuto e la tua card è finita. Dai tuoi voti ho già proposto alcune competenze accademiche nel blocco Competenze qui a destra — dacci un'occhiata."*

**Passo 2 — Hard skill (domanda aperta).** *"Ora dimmi: quali strumenti, software o metodologie hai usato nelle esperienze di cui mi hai parlato?"* MIRA estrae le competenze citate e stima il livello (beginner / intermediate / advanced) dal modo in cui lo studente ne parla.

**Passo 3 — Quiz soft skill (5 domande a scelta forzata, contenuto fisso, non AI).** Introdotto con: *"Adesso qualche situazione veloce, scegli quella che ti somiglia di più. Non ci sono risposte giuste — servono a dire alle aziende come lavori, non a giudicarti."*

1. *"Progetto di gruppo all'università, domani c'è la presentazione. Cosa succede di solito?"*
   A: *"Presento io: parlare davanti alla gente non mi pesa, anzi mi piace."* / B: *"Io preparo le slide e i contenuti, ma a presentare preferisco che vada qualcun altro."*
2. *"Al tuo team serve un'informazione da un'azienda o da un professore che nessuno di voi conosce. Come vi organizzate?"*
   A: *"Scrivo o chiamo io: il primo contatto con persone che non conosco mi viene facile."* / B: *"Preferisco che il primo aggancio lo faccia qualcun altro: io do il meglio quando lavoro sul materiale, non al telefono con uno sconosciuto."*
3. *"Hai due settimane di tempo per una consegna importante. Come le affronti?"*
   A: *"Faccio un piano il primo giorno — scaletta e tappe intermedie — e poi lo rispetto."* / B: *"Comincio subito e aggiusto strada facendo: il grosso lo chiudo sotto scadenza, e mi viene bene così."*
4. *"È la sera prima della consegna e cambiano i requisiti del progetto. Qual è la tua reazione onesta?"*
   A: *"Mi secca, però rifaccio il piano in fretta e si riparte in modo ordinato."* / B: *"Mi accende: riorganizzare tutto al volo è il momento in cui rendo di più."*
5. *"Devi portare avanti uno studio o un progetto. Com'è la tua giornata ideale?"*
   A: *"Lavoro fianco a fianco con gli altri: confrontarmi di continuo mi dà energia."* / B: *"Lavoro da solo e concentrato, e poi mi allineo con il team nei momenti chiave."*

Ogni scelta viene tradotta in una frase fissa in inglese salvata in card (es. A alla domanda 1 → *"Comfortable presenting in front of an audience — usually the one who presents in group work"*). Le scelte compaiono nel pannello man mano, non tutte alla fine. Dopo il quiz lo studente può ancora scrivere in chat per aggiungere competenze: MIRA le accetta solo se collegabili a un esame o un'esperienza reale.

**Passo 4 — Lingue.** *"Che lingue conosci, e a che livello? (Se il tuo corso è in inglese, indicalo pure insieme alle altre.)"* Le lingue già presenti nel CV vengono aggiunte automaticamente se non ripetute.

**Passo 5 — Interessi (domanda lunga, un solo turno).**

> *"Ora una parte che sul CV di solito manca, e che invece le aziende leggono con attenzione: cosa ti interessa davvero. Non la lista di parole tipo 'finanza e viaggiare' — quella la scrivono tutti. Ti aiuto con tre domande:*
> *— Cosa segui per conto tuo, fuori dai programmi d'esame? Newsletter, podcast, canali, temi su cui finisci sempre a leggere. E c'è un argomento su cui, quando salta fuori, parli più del dovuto?*
> *— Fuori dallo studio: cosa fai con costanza? Sport, musica, progetti, qualsiasi cosa — vale anche la roba insolita, anzi è quella che si ricordano. E da quanto tempo?*
> *— Bonus: c'è una cosa in cui sei stranamente bravo e che non c'entra niente con l'università?*
> *Scrivi liberamente, anche alla rinfusa — ci penso io a dargli forma, poi tu approvi. Conta una cosa sola: cose che fai davvero, non cose che suonano bene."*

**Passo 6 — Autodescrizione (domanda lunga, massimo due turni).**

> *"Ora la parte che rende la tua card diversa da tutte le altre: due righe su chi sei, scritte da te. Niente tono da colloquio — quello lo sanno scrivere tutti e infatti si somigliano tutti. Se non sai da dove partire:*
> *— Cosa direbbero i tuoi amici di te, se glielo chiedessi davvero? (di solito è più preciso di quello che diremmo noi)*
> *— Cosa non sopporti, nel lavoro o nello studio? Anche questo dice chi sei.*
> *— C'è una cosa a cui non rinunci? Lo sport, la famiglia, un progetto tuo — le priorità contano.*
> *— Com'è fatta una giornata in cui torni a casa soddisfatto?*
> *Scrivi come parli, anche disordinato — a dargli forma ci penso io, poi tu approvi. E sii sincero: questa parte funziona solo se è vera. La leggerà chi vuole capire se sei la persona giusta, non chi vuole il candidato perfetto."*

Se la risposta è troppo "magra", MIRA fa **una sola** domanda di rilancio, specifica e ancorata a ciò che lo studente ha scritto, poi sintetizza comunque.

**Passo 7 — Piano di carriera (domanda lunga, un turno).**

> *"Ultima sezione, e per le aziende è una delle più utili: dove stai andando. Non serve avere le idee chiare — serve dire onestamente a che punto sei. Ti aiuto:*
> *— Nei prossimi anni, hai una direzione precisa (un settore, un ruolo), qualche ipotesi che stai valutando, o stai ancora esplorando? Tutte e tre le risposte vanno bene, davvero.*
> *— C'è già qualcosa in calendario o in testa? Exchange, magistrale (dove, se lo sai), un certificato, un progetto tuo.* [ai magistrali la parola "magistrale" viene omessa]
> *— E la prossima esperienza di lavoro: cosa vorresti che ti lasciasse? Anche solo 'capire se il consulting fa per me' è una risposta utile.*
> *Scrivi come ti viene — do io la forma, tu approvi. Un consiglio: non scrivere l'obiettivo che suona ambizioso se non è il tuo. 'Sto esplorando, mi incuriosiscono X e Y' a un'azienda dice molto più di un finto 'voglio fare investment banking'."*

**Passo 8 — Chiusura.** *"La tua card è completa! La trovi nel tuo Profilo, modificabile quando vuoi. In bocca al lupo per le tue candidature."*

---

### Comportamenti trasversali della chat

- **Risposte fuori tema:** se lo studente fa una domanda, esprime un dubbio, critica o scrive qualcosa di non pertinente, MIRA non ripete la domanda a pappagallo: risponde a ciò che ha scritto (max 3 frasi) e poi ripropone la domanda riformulata. Prima di chiudere un blocco, MIRA giudica sempre se la risposta è "nel merito" — senza questo controllo la card si riempiva di dati vuoti o a caso.
- **Skip:** libretto e CV sono saltabili; si possono caricare in seguito dal Profilo.
- **Ripresa:** se lo studente esce e rientra, MIRA riprende dal punto giusto con un solo messaggio di bentornato (mai il replay dell'intera conversazione). La fase corrente viene sempre ricalcolata dallo stato reale dei blocchi, non da un contatore.
- **Lingua:** la chat segue la lingua dell'interfaccia (IT o EN); il contenuto della card è sempre in inglese; MIRA non cita mai in chat il testo inglese della card per non mescolare le lingue.

### Dopo l'onboarding: candidature e profilo
- **Profilo:** lo studente vede e modifica la propria card (stessi componenti dell'onboarding); può ricaricare libretto e CV.
- **Associazioni:** elenco delle associazioni (solo Bocconi), pagina vetrina di ciascuna, candidatura ai cicli aperti con le domande personalizzate dell'associazione, riepilogo e invio.
- **Tracking:** pagina "Le mie candidature" con stato (inviata, in revisione, colloquio, accettata, rifiutata, lista d'attesa, ritirata) e inviti a colloquio.

## 1.5 Il percorso dell'associazione

1. **Invito ufficiale:** l'admin MIRA invita il presidente via email (token monouso, scadenza, revocabile). Il presidente si registra/accede e ottiene il workspace dell'associazione.
2. **Pagina pubblica:** logo, descrizioni, categoria, settori, timeline di recruiting, link. Visibile agli studenti loggati su `/student/associazioni/[slug]` e pubblicamente.
3. **Cicli di candidatura:** creazione, apertura, chiusura; domande personalizzate di vari tipi (testo breve/lungo, scelta multipla, checkbox, dropdown, scala, preferenza ruolo, disponibilità, upload file).
4. **Revisione candidati:** lista con filtri, dettaglio candidato (card, risposte, profilo accademico), note interne private, cambio stato con audit, inviti a colloquio.
5. **Valutazione AI:** per ogni candidato MIRA genera una valutazione strutturata e **bilingue (IT/EN)** — categoria di fit (strong/good/uncertain/weak), sintesi, punti di forza, lacune, evidenze con fonte e confidenza, domande suggerite per il colloquio. L'AI **non decide mai**: accettazione e rifiuto sono sempre azioni umane.
6. **Board:** il presidente invita membri del board (che restano studenti), assegna ruoli e permessi granulari (vedere candidati, vedere valutazioni AI, cambiare stati, ecc.), applicati lato server. Ogni punto di ingresso della dashboard associazione è protetto dal controllo di accesso al workspace.

## 1.6 Il percorso dell'azienda (costruito oltre lo scope iniziale)

- **Accesso:** pagina pubblica `/aziende` con richiesta di accesso; l'admin approva (stato "pending" in attesa). L'azienda ottiene un workspace.
- **Ricerca AI:** l'azienda descrive in chat cosa cerca ("uno stagista per il team M&A da settembre, forte su Excel…"). MIRA legge le MIRA Card degli studenti onboardati e restituisce fino a 6 profili **anonimi** (codici candidato, mai nomi), valutati su due dimensioni separate: *competenze* e *disponibilità*. I gap vengono dichiarati onestamente ("forte in finanza, ma la card non riporta Excel"), mai inventati. Le ricerche sono salvate come conversazioni riprendibili.
- **Dettaglio candidato:** l'azienda apre la card anonima tramite il codice.
- **Contatti:** flusso di richiesta contatto/consenso (il nome si vede solo dopo che lo studente acconsente) e pagina contatti.

## 1.7 L'admin MIRA

Console riservata (`/admin`): inviti presidenti, gestione associazioni (verifiche, stati), gestione aziende e richieste di accesso, utenti (inclusa cancellazione), team, knowledge base (upload documenti per il RAG futuro).

## 1.8 Regole di fondo del prodotto

- **L'AI assiste, l'uomo decide:** mai decisioni automatiche di ammissione/assunzione.
- **Evidenze, non autodichiarazioni:** ogni competenza in card è ancorata a un esame o un'esperienza reale; l'AI non inventa mai fatti e separa evidenza da inferenza.
- **Conferma umana su tutto:** ogni blocco della card è approvato dallo studente prima di diventare visibile.
- **Anonimato verso le aziende:** codici candidato, consenso esplicito per il contatto.
- **Bilingue IT/EN** su tutta l'interfaccia e la chat; card sempre in inglese.
- **Permessi lato server** (mai solo nascosti nell'interfaccia), audit sulle azioni sensibili.

## 1.9 Cosa NON esiste ancora

- App mobile reale (esiste solo lo scheletro tecnico, due schermate vuote).
- Simulazioni, orientamento "chirurgico", pagamenti, dashboard università, multi-università completa (i domini di più atenei sono già accettati in registrazione, ma il prodotto associazioni è solo Bocconi).
- Notifiche push; il refresh dei dati avviene alla navigazione (Realtime evitato deliberatamente per costi).
- Question-answering sulla knowledge base (esiste solo l'upload).

---

# PARTE 2 — PARTE TECNICA

## 2.1 Stack

| Livello | Tecnologia |
|---|---|
| Web | Next.js 15 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui), next-intl per i18n |
| Mobile | Expo / React Native (Expo Router) — **solo shell**: `app/_layout.tsx` + `app/index.tsx` |
| Backend | Supabase: Postgres, Auth, Storage, RLS; pgvector previsto per il RAG |
| AI | Vercel AI SDK con astrazione provider (OpenAI / Anthropic) in `packages/ai` |
| Email | Resend + react-email |
| Hosting | Vercel; dominio `mirajob.cloud` (Aruba.it) |
| Monorepo | Turborepo + pnpm workspaces |

```
mira/
  apps/web          → Next.js 15 (tutta la produzione è qui)
  apps/mobile       → shell Expo, non sviluppata
  packages/types    → tipi condivisi (CardBlock*, ProseContent…)
  packages/supabase → client factory + tipi generati
  packages/ai       → provider abstraction + moduli AI
  packages/domain   → business logic, permessi, validazione
  supabase/         → migrations (ultime: card_blocks, companies, candidate codes, access requests, university domains)
  docs/             → specifiche 00–14
```

## 2.2 Mappa reale delle route web

**Pubbliche:** `/`, `/login`, `/signup`, `/verify-email`, `/associations` (+ `/[slug]`, `/[slug]/apply`, `/in-attesa`, `/candidati`), `/aziende` (+ `/pending`), `/invite/[token]`, `/join/[code]`.

**Studente:** `/student` (dashboard), `/student/onboarding`, `/student/profile`, `/student/applications` (+ `/[id]`), `/student/associazioni` (+ `/[slug]` vetrina), `/student/aziende`.

**Associazione:** `/association/[slug]` (+ `/board`, `/cycles`, `/cycles/new`, `/cycles/[cycleId]`, `/candidates`, `/candidates/[applicationId]`, `/public-page`).

**Azienda:** `/company/[slug]` (+ `/search`, `/candidates/[code]`, `/contacts`, `/profile`).

**Admin:** `/admin` (+ `/associations`, `/companies`, `/users`, `/team`, `/knowledge-base`).

Layout responsive: sidebar nascosta sotto `lg`, bottom tabs + drawer per lo studente su mobile web.

## 2.3 Database (tabelle chiave)

Nucleo identità: `profiles` (multi-ruolo, `global_roles[]`), `student_profiles` (dati accademici legacy + `onboarding_answers` jsonb con le conversazioni, flag `onboarding_completed`, `transcript_uploaded`, `cv_uploaded`, `cv_summary`).

**`card_blocks`** (migrazione 2026-07-04, il cuore della card): una riga per blocco per studente — `block_type` (header, formazione, esperienze, disponibilita, competenze, lingue, interessi, autodescrizione, piano_carriera), `prose_content` jsonb, `status` (empty/draft/approved), `visibility`, `approved_at`. Nota: "formazione" è una riga DB ma non un blocco confermabile a sé (vive dentro Header); la percentuale di completamento si calcola su 8 blocchi.

Associazioni: `association_profiles`, `association_memberships` (ruolo + permessi jsonb), `invitations` (generica, token monouso), `application_cycles`, `application_questions`, `applications`, `application_answers`, `application_status_events` (audit), `candidate_internal_notes`, `interview_invites`.

AI e supporto: `candidate_ai_evaluations` (con `evaluation_json = {it, en}` bilingue generato alla submission; righe legacy piatte in italiano), `student_transcripts`, `uploaded_files`, `knowledge_documents`/`knowledge_chunks`, `notifications`, `audit_logs`, `ai_logs`.

Aziende (migrazioni 2026-07): `companies`, `company_searches` (chat di ricerca salvate), codici candidato anonimi, richieste di contatto/consenso, `company_access_requests`, `university_domains` (multi-dominio in signup).

## 2.4 Il motore dell'onboarding (architettura)

Tutto in **`apps/web/src/lib/actions/chat-onboarding.ts`** (~1.380 righe di server actions) + UI in `student/onboarding/onboarding-chat.tsx` e `components/onboarding/onboarding-card-panel.tsx`.

**Macchina a stati senza contatore:** la fase corrente (`welcome → livello → previous_degree → transcript → header_gap → cv → esperienze → disponibilita → gate → competenze → lingue → interessi → autodescrizione → piano_carriera → chiusura`) è **derivata a ogni load dallo stato dei blocchi** (`loadOnboardingState`): es. se `disponibilita` non è approvata siamo in Fase A; dentro la Fase B si va al primo blocco non approvato. Questo rende la ripresa cross-sessione robusta.

**Due conversazioni separate** salvate in `student_profiles.onboarding_answers` (jsonb): `conversation` (Fase A) e `fase_b_conversation`. Gli skip sono marcatori in conversazione (`[Libretto saltato]`, `[CV saltato]`).

**Pattern per ogni turno:** la risposta libera dello studente passa per una `chatCompletion` in `jsonMode` con un prompt di estrazione specifico per fase (temperature 0.1–0.4, 250–800 token). I prompt chiedono sempre: (1) giudizio "risposta nel merito sì/no", (2) estrazione strutturata, (3) contenuto card in inglese, stile CV. Se la risposta non è nel merito → `handleUnclearAnswer` (seconda chiamata AI che reagisce al messaggio e ripropone la domanda). In alcuni turni (esperienze) un'unica chiamata combina giudizio stop/continue + reazione, per non raddoppiare le chiamate.

**Approvazione dei blocchi:** avviene sempre dal pannello card (riuso dei componenti editabili del Profilo). Le funzioni `after*Approved` in chat-onboarding decidono solo la domanda successiva, mai approvano.

**Testi delle domande:** tutti in `apps/web/messages/{it,en}.json` sotto `OnboardingEngine` (nessuna domanda hardcoded nel codice). Il quiz soft skill è contenuto fisso in `apps/web/src/lib/soft-skill-questions.ts` (le 5 coppie di frasi inglesi salvate in card) + etichette localizzate nei messages.

**Scritture legacy:** a ogni salvataggio in `card_blocks` viene ancora scritto anche il vecchio schema piatto di `student_profiles` (`degree_level`, `experiences`, `interests`, `goals`, `availability`, `profile_summary`) — marcate `LEGACY-WRITE(card-rework): rimuovere in Step 5/6`.

**Helper di test:** `forceCompleteOnboarding()` riempie i blocchi vuoti con placeholder `[test]` e approva tutto — è un'azione di sviluppo, da tenere fuori dai percorsi di produzione.

## 2.5 Livello AI

`packages/ai`: `provider.ts` (astrazione `chatCompletion` su OpenAI/Anthropic), moduli: `transcript-parser`, `cv-parser`, `association-page-generator`, `candidate-matcher`, `card-block-sync`; schemi: `application-evaluation`, `transcript-parser`, `onboarding-summarizer`.

**Nota architetturale:** i prompt dell'onboarding e della ricerca aziende vivono **inline nelle server actions** (`chat-onboarding.ts`, `company-search.ts`), non in `packages/ai` — in tensione con la regola "AI service modules instead of prompt logic in UI/actions". Funziona, ma è uno dei punti da valutare in una ristrutturazione.

Valutazione candidati: generata alla submission in doppia lingua `{it, en}`; rigenerazione sostituisce le righe.

## 2.6 Sicurezza e permessi

- RLS su tutte le tabelle sensibili; molte server actions usano il **service client** dopo aver verificato il contesto utente (`getUserContext`, `getCompanyContext`, `hasWorkspaceAccess`).
- Gating Bocconi per le associazioni applicato in 3 punti server-side oltre che in UI.
- Permessi board granulari (jsonb) verificati lato server; audit su stati candidatura, inviti, accessi sensibili.
- Aziende: mai nomi reali senza consenso; l'AI di ricerca riceve solo contenuti card + codici.
- File privati (libretti, CV) su bucket Supabase con accesso firmato.

## 2.7 i18n, email, deploy

- **i18n:** next-intl, IT/EN completo su tutta l'app inclusa la chat di onboarding (progetto chiuso il 10/07/2026); contenuto card escluso by design (sempre EN).
- **Email:** Resend + react-email (inviti, verifiche, notifiche).
- **Deploy:** Vercel, dominio `mirajob.cloud`; preview deployments su branch.
- **Realtime:** evitato per costi; pattern refresh-on-navigation.

## 2.8 Debito tecnico noto

1. **Doppia scrittura legacy** `card_blocks` + campi piatti `student_profiles` (da rimuovere, marcata nel codice).
2. **Prompt inline nelle actions** invece che in `packages/ai`.
3. `chat-onboarding.ts` è un file unico da ~1.380 righe con `any` diffusi (eslint disabilitato in testa).
4. **Valutazioni AI legacy** monolingua accanto alle bilingue.
5. **Mobile app** ferma allo scaffold.
6. I file `"use server"` possono esportare solo funzioni async — vincolo già causa di bug a runtime non catturati dalla build (regola di lavoro annotata).

---

# PARTE 3 — PUNTI APERTI PER LA REVISIONE (con focus onboarding)

Osservazioni oneste su ciò che oggi potrebbe essere ripensato. Non sono decisioni: sono i punti dove il design attuale fa più attrito.

**1. Lunghezza dei messaggi di Fase B.** Le domande su Interessi, Autodescrizione e Piano di carriera sono "muri di testo" (100–150 parole ciascuna, con 3–4 sotto-domande incorporate). Ricche di intenzione, ma in una chat un messaggio così lungo spesso non viene letto per intero e produce risposte parziali. Da valutare: spezzarle in più bolle, o in micro-turni progressivi.

**2. Numero di turni e di conferme.** Il flusso completo richiede allo studente: ~8–10 risposte in chat (Fase A) + 8 conferme manuali di blocchi sul pannello + 1 risposta hard skill + 5 scelte quiz + 4 risposte lunghe (Fase B). Il doppio canale "rispondi in chat ma conferma sul pannello" è coerente ma va spiegato; è il punto dove un utente può perdersi ("perché non va avanti?" → deve confermare a destra).

**3. Posizione del gate.** Il gate dopo Disponibilità è sensato (minimo indispensabile per candidarsi), ma significa che le sezioni più distintive della card (competenze, interessi, autodescrizione) sono proprio quelle facoltative: se il drop-off al gate è alto, la maggior parte delle card sarà "anagrafica + esperienze" e poco altro. Da monitorare con i dati reali.

**4. Costo/latenza AI per turno.** Quasi ogni messaggio dello studente genera 1–2 chiamate LLM (estrazione + eventuale gestione risposta non chiara). Su risposte ambigue il giro raddoppia. Funziona, ma la latenza percepita in chat e il costo per onboarding crescono col numero di turni — un motivo in più per ridurre i turni, non solo per UX.

**5. Estrazione a campi rigidi.** Ogni fase estrae solo i suoi campi: se lo studente anticipa informazioni di una fase futura ("sono al secondo anno di magistrale e cerco uno stage da giugno"), la parte "stage da giugno" viene persa e richiesta più avanti. Un'estrazione più opportunistica ridurrebbe la sensazione di "domande già risposte".

**6. Mix di lingue.** La regola "chat in italiano, card in inglese" è gestita con cura (la chat non cita mai il testo inglese), ma resta un potenziale punto di confusione per lo studente che vede il pannello riempirsi in una lingua diversa da quella in cui sta scrivendo. Il messaggio di benvenuto lo spiega; da verificare se basta.

**7. Quiz soft skill: 5 assi fissi.** Copre presentare/contattare/pianificare/adattarsi/collaborare. Scelta forzata A/B robusta e onesta, ma con 5 item il profilo soft è per forza grossolano, e le frasi salvate in card sono identiche per tutti gli studenti che scelgono la stessa opzione (nessuna personalizzazione).

**8. Fase B "invariata nel contenuto delle domande (rimandato al prossimo giro)"** — nota presente nel codice: la revisione delle domande di Fase B era già considerata un lavoro da fare.

**9. Aziende vs. spec.** Il modulo aziende costruito (ricerca chat AI su card anonime) è più avanti dello scope documentato ("Associations First Build") e non è ancora coperto dai docs 00–14 con la stessa profondità: se diventa centrale, va specificato formalmente (matching, consenso, pricing, abuse prevention sono nel doc 09 ma il costruito diverge).

**10. Documentazione vs. costruito.** Alcune parti dei docs (es. onboarding come "domande conversazionali" generiche, sezione 10.4 del doc 02) descrivono un flusso precedente alla riprogettazione a card/blocchi: chi legge solo i docs non vede il prodotto reale. Questo documento serve anche a colmare quel divario alla data odierna.
