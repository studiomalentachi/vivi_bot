import http from "node:http";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error("ERRO: a variável TELEGRAM_BOT_TOKEN não foi configurada.");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

const mainKeyboard = {
  keyboard: [
    [{ text: "🎬 Criar vídeo" }, { text: "🛍️ Produto" }],
    [{ text: "✍️ Roteiro" }, { text: "🖼️ Imagem" }],
    [{ text: "👩 Minha avatar" }, { text: "🔥 Melhorar para vender" }],
    [{ text: "🛡️ Verificar políticas" }, { text: "💡 Ideias" }]
  ],
  resize_keyboard: true
};

const startText = `✨ Oi! Eu sou a Vivi.

Sua assistente de criação de conteúdo, marketing e IA. 💡

Posso transformar produtos e ideias em conteúdos estratégicos para chamar atenção, gerar desejo e vender.

🎬 Roteiros e cenas para vídeos
🖼️ Imagens com IA
👩 Conteúdos com sua avatar
🧠 Marketing, copy e persuasão
🔥 Hooks e estratégias de venda
📝 Legendas, CTAs e hashtags
📱 TikTok Shop, Shopee Vídeos, Instagram, TikTok e YouTube Shorts
🛡️ Análise de possíveis riscos antes da publicação

✨ Por onde vamos começar?`;

async function telegram(method, body = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API: ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (text === "/start") {
    await sendMessage(chatId, startText, { reply_markup: mainKeyboard });
    return;
  }

  if (text === "/ajuda" || text === "/help") {
    await sendMessage(
      chatId,
      "✨ Use o menu abaixo para escolher o que deseja criar. Nesta primeira versão, estamos testando a estrutura da Vivi.",
      { reply_markup: mainKeyboard }
    );
    return;
  }

  const placeholders = {
    "🎬 Criar vídeo": "🎬 Em breve vou montar seu vídeo completo por cenas.",
    "🛍️ Produto": "🛍️ Em breve você poderá me enviar fotos e informações do produto.",
    "✍️ Roteiro": "✍️ Em breve vou criar roteiros estratégicos e persuasivos.",
    "🖼️ Imagem": "🖼️ Em breve vou preparar imagens e prompts para IA.",
    "👩 Minha avatar": "👩 Em breve vamos cadastrar e salvar as referências da sua avatar.",
    "🔥 Melhorar para vender": "🔥 Em breve vou analisar e melhorar conteúdos para aumentar o potencial de venda.",
    "🛡️ Verificar políticas": "🛡️ Em breve vou revisar o conteúdo de acordo com a plataforma escolhida.",
    "💡 Ideias": "💡 Em breve vou gerar ideias de conteúdo de acordo com seus produtos e objetivo."
  };

  if (placeholders[text]) {
    await sendMessage(chatId, placeholders[text], { reply_markup: mainKeyboard });
    return;
  }

  await sendMessage(
    chatId,
    "✨ Ainda estou na minha primeira versão. Use /start para abrir o menu.",
    { reply_markup: mainKeyboard }
  );
}

let offset = 0;

async function poll() {
  console.log("Vivi iniciada ✨");

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
          await handleMessage(update.message);
        }
      }
    } catch (error) {
      console.error(error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// Servidor simples para o Railway manter a aplicação saudável.
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Vivi está online ✨");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor ativo na porta ${PORT}`);
});

poll();
