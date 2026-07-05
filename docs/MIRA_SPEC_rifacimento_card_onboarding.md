# MIRA — Spec di rifacimento: MIRA Card, onboarding e viste

Documento operativo per Claude Code. Sostituisce il flusso attuale di onboarding e la pagina profilo studente. Leggere per intero prima di scrivere codice.

---

## 1. Obiettivo

Il profilo studente diventa una **MIRA Card**: un documento strutturato a blocchi, con formato ispirato al CV ma con sezioni che il CV non ha (disponibilità, piano di carriera, attitudine, interessi in prosa). La card viene costruita **blocco per blocco durante l'onboarding**, con la chat che redige e lo studente che approva e modifica. La card è identica per studente, associazioni e aziende (simmetria totale); ciò che cambia lato azienda/associazione è solo un layer di valutazione generato per la specifica ricerca o candidatura, mai salvato come giudizio permanente sulla persona.

---

## 2. Principi non negoziabili

Questi principi vincolano ogni scelta implementativa e ogni prompt. Se una feature li viola, la feature è sbagliata.

1. **MIRA redige, lo studente approva.** Nessun contenuto della card è visibile ad associazioni o aziende se non è in stato `approved`. Ogni blocco generato dall'AI nasce in stato `draft`.
2. **Verificato vs dichiarato, niente di più.** Oggi l'unica fonte realmente verificata è il libretto: tutto il resto (CV, risposte in chat, editing manuale) è autodichiarato, e la card non deve fingere altrimenti. Un solo badge, `verificata`, sugli item derivati dal transcript; nessun badge su tutto il resto (autodichiarato è il default, non serve etichettarlo). Se lo studente modifica a mano un item verificato oltre ciò che il transcript copre, il badge cade. Internamente si salva comunque l'origine di ogni item — non mostrata in UI, ma pronta per quando arriveranno fonti verificabili nuove (progetti associazione, simulazioni).
3. **Nessun aggettivo senza evidenza.** I prompt di generazione non possono produrre giudizi di carattere ("intraprendente", "resiliente", "creativo") né inferenze psicologiche. L'AI descrive fatti; i tratti li deduce il lettore. L'unica sezione in cui compaiono tratti personali è "Come si descrive", che è in prima persona e approvata dallo studente.
4. **Nessuna diagnosi AI nascosta.** Vietato mostrare a terzi valutazioni caratteriali che lo studente non vede (es. "è introverso, potrebbe influenzare il lavoro di squadra"). Rilevante anche per GDPR (profilazione, art. 22).
5. **Prosa per gli umani, struttura per le query.** Ogni blocco ha un rendering in prosa (quello che si legge) e dati strutturati sottostanti (quelli usati dal matching). Quando lo studente edita la prosa, i dati strutturati vengono riallineati da una chiamata AI di sincronizzazione.
6. **Raccomandazioni solo azionabili.** Nella pagina "Prossimi passi" ogni raccomandazione deve corrispondere a un'azione concreta (candidatura su MIRA, esame specifico, esperienza specifica). Consigli generici ("partecipa a workshop", "migliora la comunicazione") sono vietati a livello di prompt.
7. **Il server è l'unica fonte di verità.** Ogni turno di chat rilegge lo stato dei blocchi dal server; il pannello card in onboarding è uno specchio di ciò che è realmente salvato, mai uno stato ottimistico calcolato solo lato client. MIRA controlla sempre cosa possiede già prima di fare una domanda — non richiede mai un dato che ha già, non risponde mai con un messaggio fisso/canned indipendente da quanto detto. **Prova secca che tutto funziona: si ricarica la pagina a metà onboarding e lo stato resta esattamente quello reale**, senza tornare a "In attesa" o ripetere domande già risposte.

---

## 3. Modello dati

### 3.1 `card_blocks`

Tabella nuova (o refactor del profilo esistente). Un record per blocco per studente.

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | |
| `student_id` | uuid FK | |
| `block_type` | enum | `header`, `disponibilita`, `esperienze`, `formazione`, `competenze`, `lingue`, `autodescrizione`, `interessi`, `piano_carriera` |
| `prose_content` | jsonb | contenuto leggibile; per blocchi a lista (esperienze, competenze) array di item, ognuno con titolo, descrizione, periodo, fonte |
| `structured_data` | jsonb | facet per il matching (skill normalizzate, date, luoghi, settori, tipo contratto, ecc.) |
| `status` | enum | `empty`, `draft`, `approved` |
| `visibility` | jsonb | override per item sensibili (es. media voti: `{ "associazioni": true, "aziende": false }`) |
| `updated_at`, `approved_at` | timestamp | |

### 3.2 Verifica a livello di item

Dentro `prose_content`, ogni item (singola esperienza, singola competenza, singola lingua) ha `verified: boolean` — true solo per dati derivati dal transcript — più un campo interno `origin: "transcript" | "cv_upload" | "onboarding" | "manual"`, salvato ma mai mostrato in UI. Il flag è per-item, non per-blocco.

### 3.3 Struttura dei blocchi

1. **Header**: corso, livello (triennale/magistrale/ciclo unico), anno, CFU. Media voti con toggle di visibilità separato per associazioni e per aziende (il toggle esiste già: conservarlo, estenderlo alla doppia audience se non lo è).
2. **Disponibilità** (in alto nella card, subito sotto l'header): cosa cerca (stage curriculare / extracurriculare / part-time / progetto / nulla per ora), da quando, dove, eventuali vincoli. È il dato più prezioso per le aziende: mai seppellirlo in fondo.
3. **Esperienze**: formato CV. Ogni esperienza: titolo + ruolo, organizzazione/contesto, periodo, descrizione di 2–3 righe di cosa la persona ha fatto concretamente. Le descrizioni sono redatte da MIRA a partire da CV + risposte in chat, approvate dallo studente. Nessun badge.
4. **Formazione**: esami rilevanti con voto (se visibilità attiva), estratti dal libretto.
5. **Competenze**: niente tag stile LinkedIn ("financial modelling", "business development") — ogni competenza è una **frase concreta di una riga** che dice cosa la persona sa fare davvero, calibrata onestamente tra teorico e applicato, con etichetta `teorica`/`applicata` quando la distinzione è informativa. Es.: "Sa leggere e interpretare un bilancio (teoria, da esami)" invece di "Financial analysis"; "Sviluppa web app con AI coding tools: ha costruito e deployato una piattaforma live" invece di "Programming". Ogni competenza punta a un'evidenza (`→ esame X`, `→ esperienza Y`); senza evidenza collegata non appare in card. Badge `verificata` solo se l'evidenza è un esame dal transcript. In `structured_data` resta comunque la skill normalizzata (il "tag") per il matching: le aziende cercano per termini standard, ma lo studente si legge in frasi vere.
6. **Lingue**: lingua + livello autodichiarato + eventuale certificazione.
7. **Come si descrive**: paragrafo breve **in prima persona**, redatto da MIRA sulla base delle risposte alle domande attitudinali, riscritto/approvato dallo studente. Font distintivo (serif) nel rendering per marcarlo come voce della persona.
8. **Interessi**: prosa breve (2–3 frasi), non tag. Interessi professionali e personali insieme. Sotto, `structured_data` mantiene i facet per il matching.
9. **Piano di carriera**: prosa breve. Tre stati espliciti, tutti validi: `direzione_chiara` (settore/ruolo definito), `ipotesi` (2–3 direzioni in valutazione), `esplorazione` (nessuna direzione ancora, eventuali curiosità). L'incertezza è un dato, non un fallimento: mai forzare lo studente verso un obiettivo finto, e la prosa la riflette onestamente ("Sta ancora esplorando; al momento incuriosito da X e Y"). Include eventuali piani concreti: exchange, magistrale. Alimenta la pagina "Prossimi passi".

---

## 4. Flusso di onboarding (nuovo)

### 4.1 Layout

Split-view: chat a sinistra, card che si costruisce a destra (desktop). Su mobile: chat a schermo pieno, con la card come pannello espandibile che mostra i blocchi man mano che si riempiono. **Ogni risposta dello studente deve produrre un aggiornamento visibile della card entro pochi secondi.** Questo è il requisito UX centrale del rifacimento: lo studente vede sempre dove finiscono le sue risposte.

Ogni blocco appena generato mostra due azioni inline: **Conferma** e **Modifica** (editing diretto del testo nel blocco). Alla conferma, `status` passa a `approved` e la chat prosegue col blocco successivo.

### 4.2 Fase A — Minimo per candidarsi (obbligatoria, target: 8–10 minuti)

**Questa sezione sostituisce integralmente una versione precedente e più generica** (chiedeva corso/anno a voce prima del transcript). Riscritta dopo test in produzione che hanno mostrato l'ordine sbagliato e domande ridondanti con dati già noti. Regola guida: **"le domande servono a colmare i buchi, non a raccogliere da zero: se il dato è nel PDF, MIRA non lo chiede."**

1. **Benvenuto**: MIRA si presenta in 2–3 frasi: cosa succede ora + perché ne vale la pena. Copy di riferimento: "Costruiamo insieme la tua MIRA card: ti serve ora per candidarti alle associazioni, ed è il profilo con cui le aziende potranno trovarti e contattarti direttamente quando sarai compatibile con quello che stanno cercando. Più è fatta bene, più lavora per te." Niente elenco di feature future, nessuna menzione di funzionalità non live.
2. **Livello di studi — unica domanda iniziale**: "Studi triennale, magistrale o ciclo unico?" Niente nome del corso qui.
   - **Triennale o ciclo unico** → passa direttamente al punto 3 (transcript). Ciclo unico è trattato come triennale: non ha una laurea precedente da raccogliere.
   - **Magistrale** → prima raccoglie la formazione precedente come contesto: università, corso, voto di laurea (campo `formazione_precedente` nell'Header, mostrato in card come "formazione precedente"). Poi passa al punto 3.
3. **Transcript**: upload libretto (PDF) → estrazione automatica di università, corso, livello, esami+voti (collassati/espandibili in card, non tutti elencati: "occupano troppo spazio nella card") e media ponderata, marcata **verificata**. Se lo studente non ha il libretto: skip consentito.
4. **Buchi residui (`header_gap`)**: SOLO ORA, dopo il transcript (o dopo lo skip), MIRA chiede ciò che manca — tipicamente solo l'anno corrente. Il bottone Conferma sull'Header appare solo quando il blocco è genuinamente completo (livello, corso, anno, media tutti presenti — media esclusa se il transcript è stato saltato).
5. **CV (opzionale)**: upload → estrazione esperienze e lingue in bozza; il bottone di upload sparisce dopo l'uso (mai doppio upload). Se non ha un CV: MIRA lo dice esplicitamente ("nessun problema, lo costruiamo parlando") e passa alle domande.
6. **Esperienze**: per ogni esperienza dal CV, MIRA chiede "cosa hai fatto *tu* concretamente" **solo se la descrizione del CV non è già sufficientemente concreta**; se lo è, la propone direttamente e chiede solo conferma/aggiunta. Lo studente può modificare tutto direttamente sulla card (editing inline), tranne i dati accademici derivati dal transcript. Sempre, alla fine: "c'è qualcosa che non hai mai messo nel CV? Progetti personali, competizioni, sport a livello agonistico, volontariato, lavori?" — la domanda più importante dell'onboarding. Un solo Conferma per l'intero blocco.
7. **Disponibilità**: cosa cerca, da quando, dove — copy naturale, non un template fisso rigido.
8. **Gate sbloccato**: invariato. Percentuale reale calcolata sui blocchi realmente approvati (mai inventata). MIRA offre "Completa ora" / "Più tardi".

### 4.3 Fase B — Completamento (proseguibile subito o ripresa dopo)

8. **Competenze**: MIRA propone bozze in formato frase-di-una-riga derivate da esami ed esperienze ("Da Financial Accounting ti propongo: *Sa leggere e interpretare un bilancio (teoria)*. Da Flasher Pay: *Ha progettato un business model e validato un prodotto con utenti reali*. Confermi, correggi?"). Dove la portata non è chiara, MIRA fa una domanda di calibrazione prima di redigere ("cosa sai fare concretamente dopo questi esami? l'hai mai applicato fuori dall'aula?"). Conferma/modifica per singola competenza + campo per aggiungerne di proprie; per queste MIRA chiede a quale esperienza o esame collegarle, perché in card ogni competenza deve avere un'evidenza. Formato: 1 riga per competenza — **vietati** sia i paragrafi descrittivi sia i tag nudi stile LinkedIn.
9. **Lingue**: domanda diretta, conferma.
10. **Interessi**: 2 domande aperte (professionali e personali) → prosa breve redatta da MIRA → conferma/modifica.
11. **Attitudine / Come si descrive**: 3–4 domande concrete ("raccontami un progetto di cui vai fiero: che ruolo hai preso?", "quando lavori meglio?", "cosa ti pesa fare?"). MIRA redige il paragrafo **in prima persona** e lo introduce così: "L'ho scritto con parole tue — modificalo pure, e sii sincero: è la parte più personale della card." Conferma/modifica.
12. **Piano di carriera**: "Come ti vedi nei prossimi 1–2 anni? Hai una direzione precisa, qualche ipotesi, o stai ancora esplorando? Exchange, magistrale?" Le tre risposte sono tutte valide: se lo studente non lo sa, MIRA non insiste e registra lo stato `esplorazione` con le eventuali curiosità emerse ("mi incuriosisce la finanza ma non so in che ruolo" basta e avanza). → prosa breve → conferma.
13. **Chiusura**: card completa mostrata per intero, invito a rivederla dalla pagina Profilo.

Se lo studente abbandona in Fase B, al login successivo MIRA riparte dal primo blocco `empty`/`draft` con un solo messaggio di ripresa, senza ripetere quanto già fatto.

---

## 5. Pagina Profilo (nuova)

- La pagina Profilo **è la card**, renderizzata per intero.
- **Editing inline** su ogni blocco: click sul testo → modifica → salvataggio → risincronizzazione `structured_data` via AI → se l'item era `verificata` e la modifica va oltre ciò che il transcript copre, il badge cade.
- Ogni blocco ha un bottone **"Migliora con MIRA"** che apre una mini-chat contestuale ancorata a quel blocco (drawer laterale o popover). La mini-chat conosce solo il contesto del blocco e della card; alla fine propone il testo aggiornato con Conferma/Modifica.
- **Rimuovere la chat permanente** attualmente in fondo alla pagina profilo ("Parla con MIRA"). Nessuna chat generica senza scopo.
- Dettagli accademici e toggle visibilità media: conservare, con doppia audience (associazioni / aziende) se non già presente.

---

## 6. Vista associazione (e futura vista azienda)

Layout a due colonne, già validato a livello di design:

- **Sinistra — la card**: identica a quella che vede lo studente, filtrata per visibilità (es. media nascosta se toggle off). Nessuna sintesi AI in prosa sopra la card: la card è la sintesi.
- **Destra — "Per questa candidatura"** (o "Per questa ricerca" lato azienda): layer generato al volo, **mai salvato come attributo dello studente**. Struttura fissa:
  1. *Perché è rilevante*: max 3 punti, ognuno con riferimento esplicito a un fatto della card (formato "claim → evidenza").
  2. *Cosa non sappiamo*: gap rispetto ai criteri della ricerca/candidatura. Sezione obbligatoria e mai vuota.
  3. *Da chiedere al colloquio*: 1–2 domande concrete derivate dai gap.
- **Rimuovere** dalla vista attuale: badge assoluto "Good fit" (un fit senza query di riferimento non significa nulla), paragrafo di sintesi psicologica, sezione "Attitudine e stile" come giudizio AI (sostituita dal blocco "Come si descrive" dentro la card, che è autodichiarato).
- Caso evidenze insufficienti: se il matching non trova riscontri per i criteri della ricerca, la colonna destra lo dice esplicitamente ("Su questi criteri la card non ha evidenze: X, Y") invece di gonfiare rilevanze deboli. Meglio onesto che pompato: è la credibilità del sistema.

---

## 7. Pagina "Prossimi passi" (ex Percorso)

Sostituisce integralmente l'attuale pagina Percorso. Struttura fissa, derivata dal blocco Piano di carriera:

1. **Il tuo obiettivo**: una riga, citata dal piano di carriera dichiarato.
2. **Cosa hai già** (max 3 item): fatti della card che supportano l'obiettivo, con riferimento all'evidenza.
3. **Cosa ti manca** (max 3 item): gap concreti.
4. **Azioni** (max 4): ognuna deve essere cliccabile o concreta, e derivare **solo da dati che MIRA possiede**: candidatura a un'associazione su MIRA (con bottone), completamento o rafforzamento di un blocco della card, esplorazione di 2–3 schede ruolo dalla libreria (se attiva, vedi 7.1), un tipo di esperienza specifico. **Vietati riferimenti a esami o corsi del catalogo universitario**: MIRA conosce gli esami sostenuti (dal libretto), non quelli disponibili nel piano di studi — quei dati non li abbiamo. Se un'azione non è concreta, non appare.

Vietato in questa pagina: sintesi del profilo, paragrafi motivazionali, consigli generici, riferimenti a resilienza/determinazione/soft skill dedotte. Se per uno studente non esistono azioni concrete, la pagina mostra meno item, anche uno solo. Sezione "Simulazioni in arrivo": rimuovere.

**Studente in esplorazione** (stato `esplorazione` nel piano di carriera): la struttura non cambia. "Il tuo obiettivo" mostra onestamente "In esplorazione — curiosità: X, Y"; le azioni puntano alle candidature associazioni coerenti con le curiosità e, se attiva, alla libreria ruoli.

### 7.1 Libreria ruoli — fase 2, decisione separata (NON costruire ora)

Perimetro definito per quando/se si deciderà di farla. È l'orientamento-lite che serve gli studenti in esplorazione **senza dati universitari**: le schede descrivono i ruoli del mercato entry-level, non i corsi di un ateneo.

- **Contenuto**: 20–30 schede statiche di ruoli entry-level (M&A analyst, consultant, data analyst, PM, ecc.). Ogni scheda: com'è davvero la giornata tipo, competenze richieste, che profilo ci sta bene, percorsi di ingresso tipici, eventuali riferimenti a magistrali *a livello generico e non di ateneo*. Contenuto curato una volta, generato con AI e revisionato a mano; non generato al volo per utente.
- **Fruizione v1**: directory sfogliabile con filtri (macro-area, tipo di lavoro). Niente ricerca conversazionale in v1: si valuta solo se la libreria dimostra uso.
- **Aggancio alla card**: ogni scheda ha un bottone "Mi interessa" che aggiunge il ruolo alle `ipotesi` del blocco piano di carriera (in stato `draft`, da confermare).
- **Aggancio a Prossimi passi**: per studenti in esplorazione, l'azione tipo diventa "esplora queste 2–3 schede coerenti col tuo profilo".
- **Vincolo assoluto**: nessun riferimento a esami/corsi specifici di un'università finché quei dati non esistono (li fornirà l'ateneo, o non ci saranno).

---

## 8. Linee guida per i prompt di generazione

Applicare a tutti i prompt che generano contenuto card o valutazioni:

- Vietati aggettivi di carattere e inferenze psicologiche. Descrivere azioni e fatti.
- Ogni affermazione nelle valutazioni per-query deve citare un fatto della card.
- Sezione gap obbligatoria e mai vuota nelle valutazioni.
- Lunghezze massime: descrizione esperienza 3 righe; competenza 1 riga; autodescrizione 4 frasi; interessi 3 frasi; piano 3 frasi; punto di valutazione 1 frase.
- Tono: nota interna di un recruiter, non lettera di presentazione.
- Test di calibrazione: ogni testo generato deve poter essere letto dallo studente stesso senza imbarazzo per chi l'ha scritto (con la simmetria delle viste, sarà letteralmente così).
- Lingua: italiano; inglese se lo studente scrive in inglese.

---

## 9. Cosa rimuovere / non costruire

- Chat permanente nella pagina Profilo.
- Sintesi AI in prosa in cima al profilo ("Federico è uno studente con una forte passione per…").
- Badge "Good fit" assoluto e valutazioni psicologiche nella vista associazione.
- Pagina Percorso attuale (sostituita da Prossimi passi).
- Tag pill per gli interessi come rendering principale (restano solo come facet in `structured_data`).
- Nessuna nuova feature su: simulazioni, orientamento pesante (scraping syllabus ecc.), modulo associazioni.

---

## 10. Ordine di build consigliato

1. Modello dati `card_blocks` + migrazione dei dati profilo esistenti (esperienze/interessi attuali → blocchi in stato `draft`, mai `approved` automaticamente: gli studenti esistenti confermano al prossimo login con un flusso di ri-approvazione rapido).
2. Rendering card (pagina Profilo) + editing inline + risincronizzazione structured_data.
3. Nuovo onboarding Fase A con split-view chat/card.
4. Onboarding Fase B + ripresa per chi ha abbandonato.
5. Vista associazione nuova (card + layer per-candidatura) e rimozione valutazione vecchia.
6. Pagina Prossimi passi.
7. Mini-chat "Migliora con MIRA" per blocco.
8. *(Decisione separata, non bloccante)* Libreria ruoli v1 come da sezione 7.1 — solo dopo che i punti 1–5 sono live e validati.

Il matching lato aziende continua a leggere da `structured_data` dei soli blocchi `approved`.
