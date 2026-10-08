import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const DATA_DIR = process.env.DATA_DIR || "/app/data";
const AVATARS_DIR = path.join(DATA_DIR, "avatars");
const STATE_FILE = path.join(DATA_DIR, "state.json");

if (!TOKEN) {
  console.error("ERRO: TELEGRAM_BOT_TOKEN não configurado.");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("ERRO: GEMINI_API_KEY não configurado.");
  process.exit(1);
}

const TG_API = `https://api.telegram.org/bot${TOKEN}`;
const TG_FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const mainKeyboard = {
  keyboard: [
    [{ text: "🎬 Criar vídeo" }, { text: "🛍️ Produto" }],
    [{ text: "✍️ Roteiro" }, { text: "🖼️ Imagem" }],
    [{ text: "🎥 Prompt profissional" }],
    [{ text: "👩 Minha avatar" }, { text: "🔥 Melhorar para vender" }],
    [{ text: "🛡️ Verificar políticas" }, { text: "💡 Ideias" }]
  ],
  resize_keyboard: true
};

const startText = `✨ Oi! Eu sou a Vivi.

Sua assistente de criação de conteúdo, marketing e IA. 💡

Posso transformar produtos e ideias em conteúdos estratégicos para chamar atenção, gerar desejo e vender.

🎬 Roteiros e cenas para vídeos
🖼️ Prompts e planejamento visual
👩 Conteúdos com sua avatar
🧠 Marketing, copy e persuasão
🔥 Hooks e estratégias de venda
📝 Legendas, CTAs e hashtags
📱 TikTok Shop, Shopee Vídeos, Instagram, TikTok e YouTube Shorts
🛡️ Análise preventiva de riscos antes da publicação

✨ Por onde vamos começar?`;

const SYSTEM_PROMPT = `
Você é Vivi, uma estrategista de conteúdo, copywriter, roteirista de vídeos curtos e diretora criativa especializada em social commerce e marketing de afiliados.

OBJETIVO
Transformar produtos e ideias em conteúdo que prenda atenção, desperte desejo e aumente a chance de conversão sem mentir, manipular de forma enganosa ou inventar informações.

PLATAFORMAS
TikTok, TikTok Shop, Shopee Vídeos, Instagram/Reels e YouTube Shorts.

ESTILO
- Responda sempre em português do Brasil, salvo pedido contrário.
- Seja prática, criativa e específica.
- Evite frases genéricas de publicidade.
- Priorize conteúdo natural, visual, elegante, desejável e com cara de criador real.
- Pense mobile-first e em retenção nos primeiros 1–3 segundos.
- Quando fizer sentido, ofereça 3 hooks e destaque qual você escolheria.
- Para vídeos, prefira cenas claras, ações visuais e texto na tela curto.
- Quando o usuário disser que usará YouTube Create, divida os prompts em clipes de até 10 segundos e preserve continuidade visual entre eles.

MARKETING E PERSUASÃO
Escolha a estrutura mais adequada ao produto, sem usar uma fórmula por obrigação. Você pode usar:
AIDA, PAS, BAB, 4Ps, problema-solução, demonstração, curiosidade, open loop, pattern interrupt, storytelling, UGC, POV, review natural, antes/depois quando legítimo, objeção-resposta, benefício-demonstração-CTA, lifestyle e contraste visual.
Explique a estratégia apenas quando isso ajudar.

REGRAS DE CREDIBILIDADE
Nunca invente:
- preço, desconto, cupom, frete grátis ou duração de promoção;
- estoque, "últimas unidades" ou escassez;
- quantidade de vendas, avaliações, notas ou depoimentos;
- resultados garantidos;
- características técnicas que não foram fornecidas ou claramente visíveis;
- aprovação de uma plataforma ou alegação de que um conteúdo é "100% seguro".
Quando faltar um dado necessário, marque como "[CONFIRMAR]" ou pergunte.

POLÍTICAS E COMPLIANCE
Ajude a reduzir risco de remoção, limitação ou penalidade.
- Identifique alegações exageradas, enganosas, médicas, financeiras ou não comprovadas.
- Sinalize possíveis problemas com direitos autorais, música, marcas, antes/depois, conteúdo sintético, promoções, preço e disclosure de publicidade/afiliado.
- Diferencie "estratégia persuasiva" de falsa urgência e falsa prova social.
- Se pedirem análise de política, dê um nível de risco (baixo/médio/alto), destaque trechos problemáticos e reescreva opções mais seguras.
- Não diga que conhece a regra mais recente em tempo real. Se uma decisão depender de uma política atual específica, diga que a regra oficial deve ser verificada; uma integração de políticas atualizadas será adicionada depois.

ROTEIROS DE VENDA
Quando receber um produto, raciocine sobre:
1. público provável;
2. dor/desejo;
3. benefício mais demonstrável;
4. diferencial;
5. objeções;
6. melhor ângulo de venda;
7. hook;
8. sequência visual;
9. CTA compatível com a informação disponível.

FORMATO PADRÃO PARA "CRIAR VÍDEO"
Entregue:
🎯 Estratégia
👤 Público
💥 Hooks
🎬 Roteiro por cenas
⏱️ Duração de cada cena
🎙️ Narração
📝 Texto na tela
🤖 Prompt visual/vídeo
🛍️ CTA
📱 Adaptação por plataforma quando solicitada
🛡️ Alertas de compliance, somente se houver

IMAGENS
Você ainda não gera a imagem diretamente. Crie prompts detalhados para um gerador visual, mantendo consistência de personagem, produto, roupa, cenário, câmera, luz e proporções. Se a pessoa disser "minha avatar", assuma que existem referências cadastradas, mas não invente características que não foram fornecidas ao modelo.

CONVERSA
Entenda mensagens curtas pelo contexto. Não faça interrogatório: se der para criar uma boa primeira versão com o que existe, crie e marque o que precisa ser confirmado.
`.trim();

async function ensureStorage() {
  await fs.mkdir(AVATARS_DIR, { recursive: true });
  try {
    await fs.access(STATE_FILE);
  } catch {
    await fs.writeFile(STATE_FILE, JSON.stringify({ users: {} }, null, 2), "utf8");
  }
}

async function readState() {
  await ensureStorage();
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    if (!parsed.users) parsed.users = {};
    return parsed;
  } catch {
    return { users: {} };
  }
}

async function writeState(state) {
  await ensureStorage();
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, STATE_FILE);
}

function getUser(state, chatId) {
  const key = String(chatId);
  if (!state.users[key]) {
    state.users[key] = {
      collectingAvatar: false,
      avatarFinalized: false,
      photos: [],
      mode: null,
      history: []
    };
  }
  const u = state.users[key];
  if (!Array.isArray(u.photos)) u.photos = [];
  if (!Array.isArray(u.history)) u.history = [];
  if (!("collectingAvatar" in u)) u.collectingAvatar = false;
  if (!("avatarFinalized" in u)) u.avatarFinalized = false;
  if (!("mode" in u)) u.mode = null;
  return u;
}

async function telegram(method, body = {}) {
  const r = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`Telegram API: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
}

function splitText(text, max = 3900) {
  const pieces = [];
  let rest = String(text || "");
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

async function sendLongMessage(chatId, text, extraLast = {}) {
  const parts = splitText(text);
  for (let i = 0; i < parts.length; i++) {
    await sendMessage(chatId, parts[i], i === parts.length - 1 ? extraLast : {});
  }
}

async function getTelegramFileBytes(fileId) {
  const info = await telegram("getFile", { file_id: fileId });
  if (!info.file_path) throw new Error("file_path ausente.");
  const r = await fetch(`${TG_FILE_API}/${info.file_path}`);
  if (!r.ok) throw new Error(`Falha no download da imagem: ${r.status}`);
  const buffer = Buffer.from(await r.arrayBuffer());
  const ext = path.extname(info.file_path).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" : "image/jpeg";
  return { buffer, mime, filePath: info.file_path };
}

async function callGemini({ prompt, history = [], image = null }) {
  const contents = [];

  // Mantém apenas um histórico curto para economizar tokens.
  for (const item of history.slice(-8)) {
    contents.push({
      role: item.role,
      parts: [{ text: item.text }]
    });
  }

  const parts = [{ text: prompt }];
  if (image) {
    parts.push({
      inline_data: {
        mime_type: image.mime,
        data: image.buffer.toString("base64")
      }
    });
  }

  contents.push({ role: "user", parts });

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents,
      generationConfig: {
        maxOutputTokens: 3500
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini error:", JSON.stringify(data));
    throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
  }

  const text = (data.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("A IA não retornou texto.");
  }
  return text;
}

function promptForMode(mode, userText = "") {
  const instructions = {
    video: `Crie um vídeo curto de alta retenção e com intenção de venda. Se houver informação suficiente, entregue o pacote completo no formato padrão de criar vídeo. Divida cenas pensando em clipes de até 10 segundos. Pedido do usuário: ${userText}`,
    produto: `Analise o produto enviado. Identifique o que é visível e NÃO invente características. Crie uma estratégia comercial inicial, 3 hooks, benefícios demonstráveis, possíveis objeções e uma proposta de vídeo curto. Se faltarem preço, plataforma ou características, use [CONFIRMAR]. Informações do usuário: ${userText}`,
    roteiro: `Crie um roteiro persuasivo para vídeo curto com foco em retenção e conversão, sem falsas promessas. Pedido: ${userText}`,
    imagem: `Crie um prompt visual extremamente detalhado para gerar a imagem solicitada. Se mencionar "minha avatar", preserve a identidade da avatar cadastrada e descreva apenas o que o usuário informou ou o que estiver visível em uma imagem enviada. Pedido: ${userText}`,
    prompt: `Você está no modo PROMPT PROFISSIONAL DE VÍDEO PARA PRODUTO.

Sua prioridade é fidelidade ao anúncio, retenção, clareza visual, persuasão ética e segurança de plataforma.

REGRAS OBRIGATÓRIAS:
- Não invente preço, desconto, material, dimensão, benefício, função, resultado, experiência pessoal, avaliação, estoque, promoção ou especificação.
- Diferencie claramente: (a) informação confirmada pelo usuário; (b) informação apenas visível na imagem; (c) informação ausente.
- Se faltar uma informação essencial para produzir o vídeo sem inventar, faça no máximo 3 perguntas objetivas ANTES de gerar o pacote final.
- Se for possível criar sem a informação faltante, use [CONFIRMAR] no lugar do dado.
- O produto deve permanecer visualmente idêntico à referência: formato, proporções, cores, logo, textura, detalhes, embalagem e quantidade.
- Não acrescente acessórios, botões, estampas, textos, peças ou funções que não aparecem na referência.
- Quando houver avatar, preserve a identidade visual da avatar cadastrada e não invente características não fornecidas.
- Formato preferencial 9:16.
- Pense em clipes de até 10 segundos. Para vídeos maiores, divida em sequência de clipes independentes, mas visualmente contínuos.
- Evite texto ilegível dentro da geração visual; prefira indicar textos para sobreposição na edição.
- Narração curta, natural e humana. Não finja que a criadora comprou, testou ou usou o produto se isso não foi informado.
- CTA natural. Em preço variável no TikTok Shop, prefira linguagem como "Confira o valor atualizado na sacolinha".
- Compliance é preventivo, não é garantia de aprovação. Se uma regra depender da versão atual da plataforma, sinalize "VERIFICAR REGRA OFICIAL ATUAL".

ENTREGUE EXATAMENTE NESTA ESTRUTURA:

1. ✅ INFORMAÇÕES CONFIRMADAS DO PRODUTO
Separe "Confirmado pelo usuário", "Visível na imagem" e "Ainda preciso confirmar", quando aplicável.

2. 🎯 ESTRATÉGIA DE VENDA
Público provável, dor/desejo legítimo, ângulo de venda, estrutura escolhida e por quê.

3. 💥 3 GANCHOS
Três opções originais para os primeiros 1–3 segundos. Marque "⭐ Recomendado" no melhor.

4. 🎬 ROTEIRO CRONOMETRADO
Divida em cenas e segundos. Para cada cena: duração, ação visual, narração e texto curto na tela.

5. 🎥 PROMPT CINEMATOGRÁFICO PRINCIPAL
Prompt extremamente detalhado: 9:16, cenário, composição, aparência/lente da câmera, distância, enquadramento, profundidade de campo, iluminação, temperatura visual, movimento de câmera, movimento do produto, movimento corporal, mãos, expressão, ritmo, continuidade, realismo, textura, física e entrada/saída da cena.

6. 🔒 BLOCO DE FIDELIDADE DO PRODUTO
Instruções explícitas para copiar fielmente a referência e lista do que não pode mudar.

7. 👩 DIREÇÃO DA AVATAR
Pose, gestos, mãos, direção do olhar, expressão, interação com produto, naturalidade e continuidade. Se não houver avatar: "Não aplicável".

8. 🚫 PROMPT NEGATIVO
Evite deformação do produto, mudança de cor/logo, mãos extras, dedos errados, objetos duplicados, embalagem alterada, texto inventado, anatomia ruim, flicker, warping, morphing, câmera instável, proporções erradas e objetos surgindo/desaparecendo. Adapte ao produto.

9. 🎙️ NARRAÇÃO FINAL
Versão curta e natural compatível com o tempo total. Sem alegações não confirmadas.

10. 📝 LEGENDA + CTA + IDENTIFICAÇÃO PUBLICITÁRIA
Legenda transparente, comercial e natural. Quando aplicável, indique conteúdo com link/afiliado. Não invente promoções.

11. 📱 VERSÕES POR PLATAFORMA
TikTok/TikTok Shop: ajuste hook, ritmo e CTA.
Shopee Vídeo: ajuste demonstração e CTA para o produto vinculado.
Instagram Reels: ajuste estética, retenção e legenda.
Se o usuário pedir carrossel, inclua versão de carrossel para Instagram/TikTok.

12. 🛡️ CHECKLIST DE CONFORMIDADE
Cheque: fidelidade produto-anúncio; preço/promoção; alegações; disclosure comercial; IA/conteúdo sintético quando aplicável; direitos autorais; marcas/terceiros; conteúdo duplicado; CTA; risco de engano.
Marque cada item como ✅ OK, ⚠️ CONFIRMAR ou ❌ CORRIGIR.
Finalize com "Risco preventivo: baixo/médio/alto" e lembre que não é garantia de aprovação.

PEDIDO/INFORMAÇÕES DO USUÁRIO:
${userText}`,
    vender: `Atue como especialista em CRO, copy e social commerce. Melhore o conteúdo fornecido para aumentar retenção, desejo e conversão, sem inventar prova social, desconto, urgência ou benefícios. Mostre primeiro a versão melhorada e depois, brevemente, o que mudou. Conteúdo: ${userText}`,
    politicas: `Faça uma revisão preventiva de compliance do conteúdo para a plataforma indicada. Classifique risco baixo/médio/alto, aponte exatamente os trechos problemáticos, explique o motivo em linguagem simples e dê uma versão mais segura. Não prometa aprovação e avise quando uma regra atual oficial precisar ser conferida. Conteúdo/plataforma: ${userText}`,
    ideias: `Gere ideias de conteúdo fortes e variadas, pensando em retenção, desejo, utilidade e venda. Evite ideias repetitivas. Pedido: ${userText}`
  };
  return instructions[mode] || userText;
}

async function askAI(chatId, userText, { image = null } = {}) {
  const state = await readState();
  const user = getUser(state, chatId);
  const mode = user.mode || "chat";

  const prompt = mode === "chat"
    ? userText
    : promptForMode(mode, userText);

  await telegram("sendChatAction", { chat_id: chatId, action: "typing" });

  const answer = await callGemini({
    prompt,
    history: user.history,
    image
  });

  user.history.push({ role: "user", text: prompt });
  user.history.push({ role: "model", text: answer });
  user.history = user.history.slice(-10);
  await writeState(state);

  await sendLongMessage(chatId, answer, { reply_markup: mainKeyboard });
}

async function setMode(chatId, mode, message) {
  const state = await readState();
  const user = getUser(state, chatId);
  user.mode = mode;
  await writeState(state);
  await sendMessage(chatId, message);
}

async function startAvatarCollection(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);
  user.collectingAvatar = true;
  user.avatarFinalized = false;
  user.mode = null;
  await writeState(state);

  await sendMessage(chatId,
`👩 Minha Avatar

Envie de 3 a 10 fotos de referência da sua avatar.

Tente incluir:
• rosto de frente
• rosto em ângulo
• corpo inteiro
• diferentes expressões

Quando terminar, envie /finalizaravatar.

📸 Referências já salvas: ${user.photos.length}/10`);
}

async function saveAvatarPhoto(message) {
  const chatId = message.chat.id;
  const state = await readState();
  const user = getUser(state, chatId);

  if (user.photos.length >= 10) {
    await sendMessage(chatId, "Você já chegou a 10 referências. Envie /finalizaravatar. ✨");
    return;
  }

  const best = message.photo.at(-1);
  if (user.photos.some(p => p.fileUniqueId === best.file_unique_id)) {
    await sendMessage(chatId, "Essa foto já está salva. 💗");
    return;
  }

  const image = await getTelegramFileBytes(best.file_id);
  const userDir = path.join(AVATARS_DIR, String(chatId));
  await fs.mkdir(userDir, { recursive: true });

  const ext = path.extname(image.filePath) || ".jpg";
  const filename = `${best.file_unique_id.replace(/[^a-zA-Z0-9_-]/g, "")}${ext}`;
  const localPath = path.join(userDir, filename);
  await fs.writeFile(localPath, image.buffer);

  user.photos.push({
    fileId: best.file_id,
    fileUniqueId: best.file_unique_id,
    localPath,
    savedAt: new Date().toISOString()
  });
  await writeState(state);

  await sendMessage(
    chatId,
    `✅ Referência ${user.photos.length} salva.\n${user.photos.length < 10 ? "Pode enviar a próxima." : "Envie /finalizaravatar."}`
  );
}

async function finalizeAvatar(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);

  if (user.photos.length < 3) {
    await sendMessage(chatId, `Envie pelo menos 3 fotos. Você tem ${user.photos.length}.`);
    return;
  }

  user.collectingAvatar = false;
  user.avatarFinalized = true;
  await writeState(state);
  await sendMessage(chatId,
    `✨ Avatar cadastrada!\n\n📸 ${user.photos.length} referências salvas.\n\nAgora elas ficam guardadas no Volume da Vivi. 💗`,
    { reply_markup: mainKeyboard }
  );
}

async function showAvatarStatus(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);
  await sendMessage(chatId,
    user.photos.length
      ? `👩 Minha Avatar\n\n📸 ${user.photos.length}/10 referências\n${user.avatarFinalized ? "✅ Cadastro finalizado" : "🟡 Cadastro em andamento"}`
      : "Você ainda não cadastrou sua avatar. Envie /avatar."
  );
}

async function clearAvatar(chatId) {
  const state = await readState();
  const key = String(chatId);
  await fs.rm(path.join(AVATARS_DIR, key), { recursive: true, force: true });
  state.users[key] = {
    collectingAvatar: false,
    avatarFinalized: false,
    photos: [],
    mode: null,
    history: []
  };
  await writeState(state);
  await sendMessage(chatId, "🗑️ Avatar apagada. Envie /avatar para cadastrar novamente.");
}

async function handlePhoto(message) {
  const chatId = message.chat.id;
  const state = await readState();
  const user = getUser(state, chatId);

  if (user.collectingAvatar) {
    await saveAvatarPhoto(message);
    return;
  }

  if (["produto", "video", "imagem", "prompt", "vender", "politicas"].includes(user.mode)) {
    const best = message.photo.at(-1);
    const image = await getTelegramFileBytes(best.file_id);
    const caption = (message.caption || "").trim();
    const fallback = {
      produto: "Analise este produto pela imagem e monte a melhor estratégia inicial.",
      video: "Use esta imagem como referência para criar o vídeo.",
      imagem: "Use esta imagem como referência e crie o prompt visual solicitado.",
      prompt: "Analise esta imagem do produto e gere o pacote completo do modo Prompt Profissional, sem inventar informações.",
      vender: "Analise este conteúdo/produto visualmente e melhore a estratégia para vender.",
      politicas: "Analise esta imagem como parte do conteúdo e faça uma revisão preventiva."
    }[user.mode];

    try {
      await askAI(chatId, caption || fallback, { image });
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, `Ops! Não consegui analisar a imagem agora.\n\n${err.message}`);
    }
    return;
  }

  await sendMessage(chatId,
    "📸 Recebi a imagem. Escolha primeiro o que quer fazer com ela: 🛍️ Produto, 🎬 Criar vídeo, 🎥 Prompt profissional, 🖼️ Imagem, 🔥 Melhorar para vender ou 🛡️ Verificar políticas."
  );
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (message.photo?.length) {
    await handlePhoto(message);
    return;
  }

  if (text === "/start") {
    const state = await readState();
    const user = getUser(state, chatId);
    user.mode = null;
    await writeState(state);
    await sendMessage(chatId, startText, { reply_markup: mainKeyboard });
    return;
  }

  if (text === "/avatar" || text === "👩 Minha avatar") {
    await startAvatarCollection(chatId);
    return;
  }
  if (text === "/finalizaravatar") return finalizeAvatar(chatId);
  if (text === "/veravatar") return showAvatarStatus(chatId);
  if (text === "/limparavatar") return clearAvatar(chatId);

  if (text === "🎬 Criar vídeo" || text === "/video") {
    return setMode(chatId, "video",
      "🎬 Me mande o produto, a ideia ou uma foto.\n\nEu vou pensar no hook, estratégia de venda, roteiro, narração e cenas de até 10 segundos.");
  }

  if (text === "🛍️ Produto") {
    return setMode(chatId, "produto",
      "🛍️ Envie uma foto do produto e, se souber, escreva junto preço, principais características e onde pretende postar.\n\nSe não souber tudo, pode mandar só a foto.");
  }

  if (text === "✍️ Roteiro" || text === "/roteiro") {
    return setMode(chatId, "roteiro",
      "✍️ Me diga o produto ou assunto do vídeo. Eu preparo um roteiro pensado para retenção e venda.");
  }

  if (text === "🖼️ Imagem" || text === "/imagem") {
    return setMode(chatId, "imagem",
      "🖼️ Descreva a imagem que quer criar ou envie uma referência.\n\nPor enquanto vou preparar o prompt visual completo; a geração direta de imagens entra na próxima integração.");
  }

  if (text === "🎥 Prompt profissional" || text === "/prompt") {
    return setMode(chatId, "prompt",
      "🎥 Modo Prompt Profissional ativado.\n\nEnvie a foto do produto e, se tiver, as informações confirmadas do anúncio.\n\nVou preparar análise do produto, 3 hooks, roteiro cronometrado, prompt cinematográfico detalhado, fidelidade do produto, direção da avatar, prompt negativo, narração, legenda/CTA, versões por plataforma e checklist de conformidade.\n\n⚠️ Se faltar um dado essencial, vou perguntar antes em vez de inventar.");
  }

  if (text === "🔥 Melhorar para vender" || text === "/vender") {
    return setMode(chatId, "vender",
      "🔥 Envie seu roteiro, legenda, ideia ou imagem. Vou melhorar hook, retenção, desejo, persuasão e CTA sem inventar informações.");
  }

  if (text === "🛡️ Verificar políticas" || text === "/politicas") {
    return setMode(chatId, "politicas",
      "🛡️ Envie o roteiro, legenda ou conteúdo e diga onde pretende postar: TikTok Shop, TikTok, Shopee, Instagram ou YouTube.\n\nVou fazer uma triagem preventiva de risco.");
  }

  if (text === "💡 Ideias" || text === "/ideias") {
    return setMode(chatId, "ideias",
      "💡 Me diga o produto, nicho ou objetivo. Vou criar ideias variadas de conteúdo com potencial de retenção e venda.");
  }

  if (text === "/limparconversa") {
    const state = await readState();
    const user = getUser(state, chatId);
    user.history = [];
    user.mode = null;
    await writeState(state);
    await sendMessage(chatId, "✨ Contexto da conversa limpo. Use /start para escolher uma função.");
    return;
  }

  if (text === "/ajuda" || text === "/help") {
    await sendMessage(chatId,
      "✨ Escolha uma função no menu ou simplesmente converse comigo.\n\nUse /limparconversa quando quiser começar um assunto do zero.",
      { reply_markup: mainKeyboard }
    );
    return;
  }

  if (text) {
    try {
      await askAI(chatId, text);
    } catch (err) {
      console.error(err);
      await sendMessage(chatId,
        `Ops! Minha IA não respondeu agora.\n\n${err.message}\n\nSe continuar acontecendo, confira a GEMINI_API_KEY e o deploy no Railway.`
      );
    }
  }
}

let offset = 0;

async function poll() {
  await ensureStorage();
  console.log(`Vivi v1.2 online ✨ | Gemini: ${GEMINI_MODEL}`);

  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          try {
            await handleMessage(update.message);
          } catch (err) {
            console.error("Erro ao processar:", err);
            try {
              await sendMessage(update.message.chat.id,
                "Ops! Tive um erro ao processar isso. Tente novamente em alguns segundos.");
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Polling:", err);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end(`Vivi v1.2 online ✨ | ${GEMINI_MODEL}`);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP ativo na porta ${PORT}`);
});

poll();
