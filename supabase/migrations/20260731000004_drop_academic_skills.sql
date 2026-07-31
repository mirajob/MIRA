-- Migration: via le competenze accademiche dalle MIRA Card.
--
-- Decisione founder 2026-07-31. Erano generate da un modello che raggruppava gli esami a sua
-- discrezione: etichette diverse per ogni studente, formulazioni incoerenti, e nessun legame
-- visibile con gli esami che le avevano prodotte. Al loro posto la parte teorica la certifica
-- l'elenco esami del libretto, che è verificato e uguale per tutti; il blocco Competenze
-- resta alle sole hard skill (cosa lo studente sa usare).
--
-- Si cancellano davvero (non si nascondono): il founder le considera fatte male, e tenerle nel
-- jsonb significherebbe rimetterle in circolo alla prima lettura distratta.

-- 1. Rimuove gli item academic e normalizza i superstiti a categoria 'hard'.
--    Copre sia il formato nuovo (categoria: 'academic') sia quello pre-redesign
--    (tipo: 'teorica'), e toglie la chiave `tipo` ormai morta.
update card_blocks
set prose_content = jsonb_set(
      prose_content,
      '{items}',
      coalesce(
        (
          -- I superstiti sono per definizione hard: si normalizzano tutti, e si toglie la
          -- chiave `tipo` del vecchio formato.
          select jsonb_agg((item || '{"categoria":"hard"}'::jsonb) - 'tipo' order by ord)
          from jsonb_array_elements(prose_content -> 'items') with ordinality as t(item, ord)
          where coalesce(
                  item ->> 'categoria',
                  case when item ->> 'tipo' = 'teorica' then 'academic' else 'hard' end
                ) <> 'academic'
        ),
        '[]'::jsonb
      )
    )
where block_type = 'competenze'
  and jsonb_typeof(prose_content -> 'items') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(prose_content -> 'items') as item
    where coalesce(
            item ->> 'categoria',
            case when item ->> 'tipo' = 'teorica' then 'academic' else 'hard' end
          ) = 'academic'
  );

-- 2. Chi resta con zero competenze aveva SOLO academic: il blocco torna in bozza, così la card
--    lo segnala come da completare e il percorso guidato lo riporta al passo Competenze per
--    scrivere le hard skill. Un blocco vuoto ma "confermato" resterebbe invisibile per sempre.
update card_blocks
set status = 'draft',
    approved_at = null
where block_type = 'competenze'
  and status = 'approved'
  and jsonb_typeof(prose_content -> 'items') = 'array'
  and jsonb_array_length(prose_content -> 'items') = 0;
