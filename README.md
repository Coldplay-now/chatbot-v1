# DeepSeek Chatbot

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19+-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-API-00A67E?style=flat)](https://platform.deepseek.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)
[![Marked.js](https://img.shields.io/badge/Marked.js-13+-000000?style=flat&logo=markdown&logoColor=white)](https://marked.js.org/)
[![Mermaid](https://img.shields.io/badge/Mermaid-10+-FF3670?style=flat&logo=mermaid&logoColor=white)](https://mermaid.js.org/)

基于 DeepSeek API 的 ChatGPT 风格聊天机器人网页示例，支持 Markdown 渲染、Mermaid 图表与目录导航。

## 功能特性

- **ChatGPT 风格界面**：现代化 UI 设计，支持多轮对话上下文
- **Markdown 渲染**：自动解析并渲染助手回复中的 Markdown 格式（标题、列表、代码块等）
- **Mermaid 图表**：支持在对话中渲染流程图、时序图等 Mermaid 图表
- **智能目录**：自动提取 H2/H3 标题生成浮动目录，点击可快速定位
- **可配置系统提示词**：通过 `config/systemprompt.md` 自定义 AI 助手角色

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制示例配置文件并填入真实的 DeepSeek API Key：

```bash
cp config/config.example.json config/config.json
```

编辑 `config/config.json`：

```json
{
  "deepseekApiKey": "sk-your-actual-api-key-here"
}
```

### 3. 启动服务

```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动，使用浏览器访问即可开始对话。

## 项目结构

```
prd/
├── config/
│   ├── config.example.json    # API Key 配置模板
│   ├── config.json             # 实际配置（不纳入版本控制）
│   └── systemprompt.md         # 系统提示词
├── server/
│   └── index.js                # Express 后端服务
├── public/
│   ├── index.html              # 前端页面
│   ├── styles.css              # 样式表
│   └── main.js                 # 前端交互逻辑
├── package.json
└── README.md
```

## 环境变量

也可通过环境变量配置 API Key（优先级高于配置文件）：

```bash
export DEEPSEEK_API_KEY="sk-your-actual-api-key-here"
npm run dev
```

## 自定义配置

### 修改系统提示词

编辑 `config/systemprompt.md`，重启服务即可生效。

### 调整 Mermaid 主题

在 `public/main.js` 中修改 `mermaid.initialize` 参数：

```javascript
window.mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark' // 可选：default, dark, forest, neutral
});
```

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 JavaScript + Marked.js + Mermaid.js
- **AI 接口**：DeepSeek Chat API

## 许可

MIT
