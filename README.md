# Vivi Bot ✨ — v1.2

Agora a Vivi tem um cérebro de IA usando Gemini.

## Railway Variables

Obrigatórias:

- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`

Opcionais:

- `GEMINI_MODEL=gemini-3.5-flash-lite`
- `DATA_DIR=/app/data`

## Volume

Mantenha o Volume montado em:

`/app/data`

## O que esta versão faz

- conversa com Gemini;
- analisa fotos de produtos com IA;
- cria estratégia de venda;
- cria roteiros e cenas de até 10 segundos;
- cria prompts visuais;
- melhora conteúdos para conversão;
- faz triagem preventiva de compliance;
- mantém contexto curto da conversa;
- preserva o cadastro persistente da avatar.

## Importante

A opção "Verificar políticas" é uma triagem preventiva. Ela ainda não consulta, em tempo real, as páginas oficiais de TikTok Shop, Shopee, Meta e YouTube. Essa integração será adicionada em outra etapa.

A geração direta de imagens também será adicionada posteriormente.
