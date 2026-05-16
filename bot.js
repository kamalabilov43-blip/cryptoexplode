require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');

const BOT_TOKEN    = process.env.BOT_TOKEN    || '';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://cryptoexplode.vercel.app';
const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;
const PORT         = process.env.PORT || 3000;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const app = express();
app.use(express.json());

const users = {};
function getUser(id) {
  if (!users[id]) users[id] = { balance: 0, streak: 0, refs: [], referredBy: null };
  return users[id];
}

async function tgCall(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function sendMessage(chatId, text, extra = {}) {
  return tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

function openAppButton() {
  return { inline_keyboard: [[{ text: '🚀 Open CryptoExplode', web_app: { url: MINI_APP_URL } }]] };
}

function mainMenuKeyboard() {
  return { inline_keyboard: [
    [{ text: '🎮 Play Games', web_app: { url: MINI_APP_URL } }, { text: '📚 Learn', web_app: { url: MINI_APP_URL } }],
    [{ text: '🏆 Leaderboard', web_app: { url: MINI_APP_URL } }, { text: '💰 Earn', web_app: { url: MINI_APP_URL } }],
    [{ text: '👥 Invite Friends', callback_data: 'get_reflink' }],
  ]};
}

app.post(WEBHOOK_PATH, async (req, res) => {
  res.sendStatus(200);
  const update = req.body;
  try {
    if (update.callback_query) {
      const cq = update.callback_query;
      await tgCall('answerCallbackQuery', { callback_query_id: cq.id });
      if (cq.data === 'get_reflink') {
        const link = `https://t.me/CryptoExplode_bot?start=ref_${cq.from.id}`;
        await sendMessage(cq.message.chat.id, `👥 <b>Твоя реферальная ссылка:</b>\n\n<code>${link}</code>\n\nПриглашай друзей и зарабатывай 10% от их наград!`);
      }
      return;
    }
    const msg = update.message;
    if (!msg || !msg.text) return;
    const text = msg.text.trim();
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'Трейдер';
    const user = getUser(msg.from.id);

    if (text.startsWith('/start')) {
      const param = text.split(' ')[1] || '';
      if (param.startsWith('ref_') && param.slice(4) !== String(msg.from.id)) {
        user.referredBy = param.slice(4);
      }
      await sendMessage(chatId,
        `👋 Привет, ${name}!\n\n🎮 <b>CryptoExplode</b> — играй и зарабатывай крипту!\n\n• 🎯 Угадывай цены и выигрывай BTC\n• 📚 Учись и получай награды\n• 🏆 Соревнуйся в турнирах\n• 👥 Приглашай друзей и зари 10%\n\nБаланс: <b>${user.balance.toFixed(4)} BTC</b>`,
        { reply_markup: mainMenuKeyboard() }
      );
    } else if (text === '/games' || text === '/игры') {
      await sendMessage(chatId, '🎮 <b>Игры</b>\n\n₿ Crypto Price Oracle — +0.001 BTC\n🧠 Quiz Blitz — +0.005 ETH\n🚀 Moonshot Portfolio — +0.05 BNB', { reply_markup: openAppButton() });
    } else if (text === '/learn' || text === '/обучение') {
      await sendMessage(chatId, '📚 <b>Обучение</b>\n\nПройди уроки и зарабатывай крипту!\n\n• Что такое Bitcoin?\n• Ethereum и смарт-контракты\n• Кошельки и ключи', { reply_markup: openAppButton() });
    } else if (text === '/appss_verify') {
  await sendMessage(chatId, 'appss_833ec9');
  return;
    } else if (text === '/balance' || text === '/баланс') {
      await sendMessage(chatId, `💰 <b>Баланс</b>\n\nBTC: <b>${user.balance.toFixed(6)}</b>\nРефералы: 👥 <b>${user.refs.length}</b>`, { reply_markup: openAppButton() });
    } else {
      await sendMessage(chatId, 'Используй кнопки ниже 👇', { reply_markup: openAppButton() });
    }
  } catch (err) {
    console.error(err);
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
  console.log(`Bot running on port ${PORT}`);
  if (process.env.WEBHOOK_BASE_URL) {
    await tgCall('setWebhook', { url: process.env.WEBHOOK_BASE_URL + WEBHOOK_PATH });
    await tgCall('setMyCommands', { commands: [
      { command: 'start', description: '🚀 Начать' },
      { command: 'games', description: '🎮 Игры' },
      { command: 'learn', description: '📚 Обучение' },
      { command: 'balance', description: '💰 Баланс' },
    ]});
  }
});
