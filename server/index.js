const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  }

  const examplePath = path.join(__dirname, '..', 'config', 'config.example.json');
  if (fs.existsSync(examplePath)) {
    const raw = fs.readFileSync(examplePath, 'utf-8');
    return JSON.parse(raw);
  }

  return {};
}

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '..', 'config', 'systemprompt.md');
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8').trim();
  }
  return '你是一个专业、友好的AI助手，请用简体中文回答。';
}

const config = loadConfig();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || config.deepseekApiKey;
const SYSTEM_PROMPT = loadSystemPrompt();

if (!DEEPSEEK_API_KEY || /替换/.test(DEEPSEEK_API_KEY)) {
  console.warn('[warn] DeepSeek API Key 未正确配置，请在 config/config.json 或环境变量中设置 deepseekApiKey。');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/system-prompt', (req, res) => {
  res.json({ systemPrompt: SYSTEM_PROMPT });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], temperature = 0.7, top_p = 0.9 } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 参数不能为空数组' });
    }

    if (!DEEPSEEK_API_KEY || /替换/.test(DEEPSEEK_API_KEY)) {
      return res.status(500).json({ error: 'DeepSeek API Key 未配置' });
    }

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages,
        stream: false,
        temperature,
        top_p
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 60_000
      }
    );

    const choice = response?.data?.choices?.[0];
    const reply = choice?.message?.content || '';

    return res.json({
      reply,
      usage: response?.data?.usage,
      providerResponse: response.data
    });
  } catch (error) {
    console.error('调用 DeepSeek API 失败:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: '调用 DeepSeek API 失败',
      detail: error.response?.data || error.message
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
});
