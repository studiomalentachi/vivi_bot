import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DATA_DIR = process.env.DATA_DIR || "/app/data";
const AVATARS_DIR = path.join(DATA_DIR, "avatars");
const STATE_FILE = path.join(DATA_DIR, "avatar-state.json");

if (!TOKEN) {
  console.error("ERRO: TELEGRAM_BOT_TOKEN não foi configurada.");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

const mainKeyboard = {
  keyboard: [
    [{ text: "🎬 Criar vídeo" }, { text: "🛍️ Produto" }],
    [{ text: "✍️ Roteiro" }, { text: "🖼️ Imagem" }],
    [{ text: "👩 Minha avatar" }, { text: "🔥 Melhorar para vender" }],
    [{ text: "🛡️ Verificar políticas" }, { text: "💡 Ideias" }]
  ],
  resize_keyboard: true
};

const startText = `✨ Oi! Eu sou a Vivi.\n\nSua assistente de criação de conteúdo, marketing e IA. 💡\n\nPosso transformar produtos e ideias em conteúdos estratégicos para chamar atenção, gerar desejo e vender.\n\n🎬 Roteiros e cenas para vídeos\n🖼️ Imagens com IA\n👩 Conteúdos com sua avatar\n🧠 Marketing, copy e persuasão\n🔥 Hooks e estratégias de venda\n📝 Legendas, CTAs e hashtags\n📱 TikTok Shop, Shopee Vídeos, Instagram, TikTok e YouTube Shorts\n🛡️ Análise de possíveis riscos antes da publicação\n\n✨ Por onde vamos começar?`;

const avatarIntro = `👩 Minha Avatar\n\nEnvie de 3 a 10 fotos de referência da sua avatar.\n\nTente incluir:\n• rosto de frente\n• rosto em ângulo\n• corpo inteiro\n• diferentes expressões\n\nVou salvar essas referências para reutilizá-las nas próximas criações. ✨\n\nQuando terminar, envie /finalizaravatar.`;

async function ensureStorage() {
  await fs.mkdir(AVATARS_DIR, { recursive: true });
  try { await fs.access(STATE_FILE); }
  catch { await fs.writeFile(STATE_FILE, JSON.stringify({ users: {} }, null, 2), "utf8"); }
}

async function readState() {
  await ensureStorage();
  try {
    const data = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    if (!data.users) data.users = {};
    return data;
  } catch {
    return { users: {} };
  }
}

async function writeState(state) {
  await ensureStorage();
  const temp = `${STATE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temp, STATE_FILE);
}

function getUser(state, chatId) {
  const key = String(chatId);
  if (!state.users[key]) state.users[key] = { collectingAvatar: false, avatarFinalized: false, photos: [] };
  return state.users[key];
}

async function telegram(method, body = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram API: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
}

async function startAvatarCollection(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);
  user.collectingAvatar = true;
  user.avatarFinalized = false;
  await writeState(state);
  let text = avatarIntro;
  if (user.photos.length) text += `\n\n📸 Você já tem ${user.photos.length} referência(s) salva(s).`;
  await sendMessage(chatId, text, { reply_markup: mainKeyboard });
}

async function downloadTelegramPhoto(fileId, fileUniqueId, chatId) {
  const fileInfo = await telegram("getFile", { file_id: fileId });
  const response = await fetch(`${FILE_API}/${fileInfo.file_path}`);
  if (!response.ok) throw new Error(`Falha ao baixar foto: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = path.extname(fileInfo.file_path) || ".jpg";
  const safe = String(fileUniqueId).replace(/[^a-zA-Z0-9_-]/g, "");
  const userDir = path.join(AVATARS_DIR, String(chatId));
  await fs.mkdir(userDir, { recursive: true });
  const localPath = path.join(userDir, `${safe}${ext}`);
  await fs.writeFile(localPath, bytes);
  return { fileId, fileUniqueId, localPath, savedAt: new Date().toISOString() };
}

async function handleAvatarPhoto(message) {
  const chatId = message.chat.id;
  const state = await readState();
  const user = getUser(state, chatId);

  if (!user.collectingAvatar) {
    await sendMessage(chatId, "📸 Para salvar esta foto como referência, toque em 👩 Minha avatar ou envie /avatar primeiro.");
    return;
  }
  if (user.photos.length >= 10) {
    await sendMessage(chatId, "✨ Você já chegou ao limite de 10 referências. Envie /finalizaravatar.");
    return;
  }

  const best = message.photo[message.photo.length - 1];
  if (user.photos.some(p => p.fileUniqueId === best.file_unique_id)) {
    await sendMessage(chatId, "Essa foto já foi salva como referência. 💗");
    return;
  }

  const saved = await downloadTelegramPhoto(best.file_id, best.file_unique_id, chatId);
  user.photos.push(saved);
  await writeState(state);

  const count = user.photos.length;
  await sendMessage(chatId, `✅ Referência ${count} salva.\n${count < 10 ? "Pode enviar a próxima." : "Você chegou a 10 referências. Envie /finalizaravatar."}`);
}

async function finalizeAvatar(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);
  const count = user.photos.length;

  if (count < 3) {
    user.collectingAvatar = true;
    await writeState(state);
    await sendMessage(chatId, `📸 Você tem ${count} referência(s) salva(s). Envie pelo menos 3 fotos antes de finalizar.`);
    return;
  }

  user.collectingAvatar = false;
  user.avatarFinalized = true;
  await writeState(state);
  await sendMessage(chatId, `✨ Avatar cadastrada!\n\n📸 ${count} referências salvas com sucesso.\n\nDepois vamos conectar essas imagens à geração de cenas com IA. 💗`, { reply_markup: mainKeyboard });
}

async function showAvatarStatus(chatId) {
  const state = await readState();
  const user = getUser(state, chatId);
  const count = user.photos.length;
  if (!count) {
    await sendMessage(chatId, "👩 Você ainda não cadastrou referências. Envie /avatar para começar.");
    return;
  }
  await sendMessage(chatId, `👩 Minha Avatar\n\n📸 Referências salvas: ${count}/10\n${user.avatarFinalized ? "✅ Cadastro finalizado" : "🟡 Cadastro em andamento"}\n\nUse /avatar para adicionar fotos ou /limparavatar para apagar tudo.`);
}

async function clearAvatar(chatId) {
  const state = await readState();
  const key = String(chatId);
  await fs.rm(path.join(AVATARS_DIR, key), { recursive: true, force: true });
  state.users[key] = { collectingAvatar: false, avatarFinalized: false, photos: [] };
  await writeState(state);
  await sendMessage(chatId, "🗑️ As referências da sua avatar foram apagadas. Envie /avatar quando quiser cadastrar novamente.");
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (message.photo?.length) return handleAvatarPhoto(message);
  if (text === "/start") return sendMessage(chatId, startText, { reply_markup: mainKeyboard });
  if (text === "/avatar" || text === "👩 Minha avatar") return startAvatarCollection(chatId);
  if (text === "/finalizaravatar") return finalizeAvatar(chatId);
  if (text === "/veravatar") return showAvatarStatus(chatId);
  if (text === "/limparavatar") return clearAvatar(chatId);
  if (text === "/ajuda" || text === "/help") return sendMessage(chatId, "✨ Use o menu abaixo. Para cadastrar sua avatar, toque em 👩 Minha avatar.", { reply_markup: mainKeyboard });

  const placeholders = {
    "🎬 Criar vídeo": "🎬 Em breve vou montar seu vídeo completo por cenas.",
    "🛍️ Produto": "🛍️ Em breve você poderá me enviar fotos e informações do produto.",
    "✍️ Roteiro": "✍️ Em breve vou criar roteiros estratégicos e persuasivos.",
    "🖼️ Imagem": "🖼️ Em breve vou preparar imagens e prompts para IA.",
    "🔥 Melhorar para vender": "🔥 Em breve vou analisar e melhorar conteúdos para aumentar o potencial de venda.",
    "🛡️ Verificar políticas": "🛡️ Em breve vou revisar o conteúdo de acordo com a plataforma escolhida.",
    "💡 Ideias": "💡 Em breve vou gerar ideias de conteúdo de acordo com seus produtos e objetivo."
  };

  if (placeholders[text]) return sendMessage(chatId, placeholders[text], { reply_markup: mainKeyboard });
  return sendMessage(chatId, "✨ Ainda estou sendo construída. Use /start para abrir o menu ou /avatar para cadastrar sua avatar.", { reply_markup: mainKeyboard });
}

let offset = 0;
async function poll() {
  await ensureStorage();
  console.log(`Vivi iniciada ✨ Dados em: ${DATA_DIR}`);
  while (true) {
    try {
      const updates = await telegram("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          try { await handleMessage(update.message); }
          catch (err) {
            console.error("Erro ao processar mensagem:", err);
            try { await sendMessage(update.message.chat.id, "Ops! Tive um erro ao processar isso. Tente novamente."); } catch {}
          }
        }
      }
    } catch (error) {
      console.error("Erro no polling:", error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Vivi está online ✨");
}).listen(PORT, "0.0.0.0", () => console.log(`Servidor ativo na porta ${PORT}`));

poll();
