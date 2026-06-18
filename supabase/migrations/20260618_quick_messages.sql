-- Mensagens rápidas por instância (respostas prontas no chat)
CREATE TABLE IF NOT EXISTS public.quick_messages (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  instancia  text        NOT NULL,
  titulo     text        NOT NULL,
  mensagem   text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "quick_messages_company_rw" ON public.quick_messages
    USING  (instancia = (SELECT instance FROM public.companies WHERE id = (auth.jwt()->>'company_id')::uuid LIMIT 1))
    WITH CHECK (instancia = (SELECT instance FROM public.companies WHERE id = (auth.jwt()->>'company_id')::uuid LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS quick_messages_instancia_idx ON public.quick_messages (instancia);
