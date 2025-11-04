const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const statusText = document.getElementById('status-text');
const sendButton = document.getElementById('send-button');

const conversation = [];

fetch('/api/system-prompt')
  .then((res) => res.json())
  .then((data) => {
    if (data.systemPrompt) {
      conversation.push({ role: 'system', content: data.systemPrompt });
    }
  })
  .catch((err) => {
    console.warn('加载系统提示词失败:', err);
    conversation.push({ role: 'system', content: '你是一个专业、友好的AI助手，请用简体中文回答。' });
  });

let mermaidInitialized = false;

function renderMermaid(container) {
  if (!window.mermaid) return;

  if (!mermaidInitialized) {
    window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
    mermaidInitialized = true;
  }

  const codeBlocks = container.querySelectorAll('pre code.language-mermaid');
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.closest('pre');
    if (!pre) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid';
    wrapper.textContent = codeBlock.textContent;
    pre.replaceWith(wrapper);
  });

  const diagrams = container.querySelectorAll('.mermaid');
  if (diagrams.length > 0) {
    try {
      window.mermaid.init(undefined, diagrams);
    } catch (err) {
      console.error('Mermaid 渲染失败:', err);
    }
  }
}

function renderMath(container) {
  if (!window.renderMathInElement) return;

  try {
    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false,
      trust: true
    });
  } catch (err) {
    console.error('数学公式渲染失败:', err);
  }
}

function slugify(text) {
  let slug = text
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .toLowerCase();
  
  // 确保 ID 不以数字开头
  if (slug && /^\d/.test(slug)) {
    slug = 'heading-' + slug;
  }
  
  if (slug) return slug;
  return `section-${Math.random().toString(36).slice(2, 8)}`;
}

function buildToc(markdownElement) {
  const headings = markdownElement.querySelectorAll('h2, h3');
  if (!headings.length) return null;

  const nav = document.createElement('nav');
  nav.className = 'message__toc';

  const title = document.createElement('div');
  title.className = 'toc__title';
  title.textContent = '目录';
  nav.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'toc__list';
  nav.appendChild(list);

  headings.forEach((heading) => {
    const level = heading.tagName.toLowerCase();
    let id = heading.id;
    if (!id) {
      id = slugify(heading.textContent);
      let suffix = 1;
      while (markdownElement.querySelector(`#${id}`)) {
        id = `${id}-${suffix++}`;
      }
      heading.id = id;
    }

    const item = document.createElement('li');
    item.className = `toc__item toc__item--${level}`;

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'toc__link';
    link.textContent = heading.textContent;
    link.addEventListener('click', () => {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      list.querySelectorAll('.toc__link--active').forEach((el) => el.classList.remove('toc__link--active'));
      link.classList.add('toc__link--active');
    });

    item.appendChild(link);
    list.appendChild(item);
  });

  const firstLink = list.querySelector('.toc__link');
  if (firstLink) {
    firstLink.classList.add('toc__link--active');
  }

  return nav;
}

function setBubbleContent(bubble, role, content) {
  bubble.innerHTML = '';
  bubble.classList.toggle('message__bubble--with-toc', false);

  if (role === 'assistant' && window.marked) {
    const layout = document.createElement('div');
    layout.className = 'message__layout';

    const markdown = document.createElement('div');
    markdown.className = 'message__markdown';
    
    // 保护数学公式不被 Markdown 解析
    const mathPlaceholders = [];
    let processedContent = content || '';
    
    // 先保护块级公式 $$...$$
    processedContent = processedContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      const placeholder = `___MATH_BLOCK_${mathPlaceholders.length}___`;
      mathPlaceholders.push({ type: 'block', formula: formula.trim() });
      return placeholder;
    });
    
    // 再保护行内公式 $...$
    processedContent = processedContent.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      const placeholder = `___MATH_INLINE_${mathPlaceholders.length}___`;
      mathPlaceholders.push({ type: 'inline', formula: formula.trim() });
      return placeholder;
    });
    
    // Markdown 渲染
    markdown.innerHTML = window.marked.parse(processedContent);
    
    // 恢复数学公式
    let html = markdown.innerHTML;
    mathPlaceholders.forEach((item, index) => {
      const placeholder = item.type === 'block' 
        ? `___MATH_BLOCK_${index}___` 
        : `___MATH_INLINE_${index}___`;
      const replacement = item.type === 'block'
        ? `$$${item.formula}$$`
        : `$${item.formula}$`;
      // 使用全局替换，确保所有占位符都被替换
      html = html.replaceAll(placeholder, replacement);
    });
    markdown.innerHTML = html;

    const toc = buildToc(markdown);
    if (toc) {
      bubble.classList.add('message__bubble--with-toc');
      layout.appendChild(toc);
    }

    layout.appendChild(markdown);
    bubble.appendChild(layout);
    renderMermaid(markdown);
    renderMath(markdown);
  } else {
    bubble.textContent = content;
  }
}

function createMessageElement(role, content, pending = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message message--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message__avatar';
  avatar.textContent = role === 'user' ? '你' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  if (pending) {
    const loader = document.createElement('div');
    loader.className = 'loading-dots';
    loader.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(loader);
  } else {
    setBubbleContent(bubble, role, content);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);

  return { wrapper, bubble };
}

function appendMessage(role, content, pending = false) {
  // 隐藏欢迎页
  const welcome = document.getElementById('welcome');
  if (welcome) {
    welcome.style.display = 'none';
  }
  
  const { wrapper, bubble } = createMessageElement(role, content, pending);
  messagesContainer.appendChild(wrapper);
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
  return bubble;
}

function setStatus(message) {
  statusText.textContent = message || '';
}

function toggleForm(disabled) {
  input.disabled = disabled;
  sendButton.disabled = disabled;
}

function autoResizeTextarea(element) {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

input.addEventListener('input', () => autoResizeTextarea(input));
autoResizeTextarea(input);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// 示例卡片点击事件
document.addEventListener('click', (event) => {
  const card = event.target.closest('.example-card');
  if (card) {
    const prompt = card.dataset.prompt;
    if (prompt) {
      input.value = prompt;
      autoResizeTextarea(input);
      form.requestSubmit();
    }
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content) return;

  setBubbleContent(appendMessage('user', content), 'user', content);
  conversation.push({ role: 'user', content });
  input.value = '';
  autoResizeTextarea(input);

  toggleForm(true);
  setStatus('正在向 DeepSeek 请求回复...');
  const assistantBubble = appendMessage('assistant', '', true);

  let fullReply = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: conversation, stream: true })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || '服务器返回错误');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // 保持加载动画，不在流式过程中显示内容
    // assistantBubble.innerHTML 保持为加载动画状态

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(message);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullReply += delta;
            // 流式过程中不显示内容，避免看到未渲染的原始文本
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 流式传输完成后，渲染完整内容
    if (fullReply.trim()) {
      conversation.push({ role: 'assistant', content: fullReply });
      // 等待一小段时间确保流式传输完全结束
      setTimeout(() => {
        setBubbleContent(assistantBubble, 'assistant', fullReply);
      }, 100);
    } else {
      assistantBubble.textContent = '（未收到有效回复）';
    }
    setStatus('');
  } catch (error) {
    console.error(error);
    setBubbleContent(assistantBubble, 'assistant', '抱歉，调用 DeepSeek 接口失败，请稍后再试。');
    setStatus(error.message || '请求失败');
  } finally {
    toggleForm(false);
    input.focus();
  }
});
