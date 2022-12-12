import { getOpenAIAuth, ChatGPTAPI } from 'chatgpt';
import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';

const appToken = process.env.SLACK_APP_TOKEN;
const socketModeClient = new SocketModeClient({ appToken });
const webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

(async () => {
  // Connect to Slack
  await socketModeClient.start();
})();

async function sendMessage(text) {
  console.log('opening puppeteer....')
  const openAIAuth = await getOpenAIAuth({
    email: process.env.EMAIL,
    password: process.env.PASSWORD
  });

  console.log('openAIAuth...', openAIAuth)

  const api = new ChatGPTAPI({ ...openAIAuth })

  console.log('ensuring auth...')
  await api.ensureAuth();
  console.log('sending message...')
  const response = await api.sendMessage(text);
  console.log('Response', response)
  return response;
}

const isValid = (event) => {
  const { text, channel_type } = event;
  if (channel_type !== 'im') return false;
  if (!text || text.trim().length === 0) return false;
  // To avoid an infinite loop when the bot reponds
  if (event.bot_profile?.id) return false;
  return true;
}

socketModeClient.on('message', async ({ event, _, ack }) => {
  try {
    await ack();
    const { text } = event;
    if (!isValid(event)) return;
    console.log('prompt..', text);

    const response = await sendMessage(text);

    await webClient.chat.postMessage({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: response,
          },
        },
      ],
      channel: event.channel,
    });
  } catch (error) {
    console.log('An error occurred', error);
  }
});
