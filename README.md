# Vivi Bot ✨ — v1.3

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


## Novo na v1.3 — `/prompt`

O modo **Prompt Profissional** aceita texto e fotos e entrega:

1. informações confirmadas do produto;
2. estratégia de venda;
3. três hooks;
4. roteiro cronometrado;
5. prompt cinematográfico detalhado;
6. bloco de fidelidade do produto;
7. direção da avatar;
8. prompt negativo;
9. narração;
10. legenda + CTA + identificação publicitária;
11. versões para TikTok/TikTok Shop, Shopee Vídeo e Instagram;
12. checklist preventivo de conformidade.

O modo foi instruído a não inventar preço, promoção, especificações, benefícios, estoque ou experiências pessoais.
