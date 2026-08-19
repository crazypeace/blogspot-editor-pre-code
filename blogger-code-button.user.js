// ==UserScript==
// @name         Blogger Editor Code Buttons
// @namespace    https://github.com/
// @version      1.2.0
// @description  在 Blogger 富文本编辑器工具栏增加 <code> 行内代码按钮和 <pre> 代码块按钮，支持快捷键
// @author       Assistant
// @match        https://www.blogger.com/blog/post/*
// @icon         https://www.blogger.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CODE_BUTTON_ID = 'custom-blogger-code-btn';
  const PRE_BUTTON_ID = 'custom-blogger-pre-btn';

  /**
   * 获取正文编辑区所在的 iframe 元素
   */
  function getEditorIframe() {
    return document.querySelector('iframe.editable');
  }

  // ─────────────────────────────────────────────
  //  行内代码 <code> 格式化
  // ─────────────────────────────────────────────

  /**
   * 切换 <code>...</code> 格式：
   * - 若选区已在 <code> 内，则执行解包（Unwrap）
   * - 否则将选中文本用 <code>...</code> 包裹
   */
  function toggleCodeFormatting() {
    const iframe = getEditorIframe();
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    const sel = iframeWin.getSelection();

    if (!sel || sel.rangeCount === 0) return;

    // 检查光标当前是否处于 <code> 节点内
    let node = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    const codeParent = node ? node.closest('code') : null;

    if (codeParent && iframeDoc.body.contains(codeParent)) {
      // 1. 已是代码格式 -> 解包 (Unwrap)
      const parent = codeParent.parentNode;
      while (codeParent.firstChild) {
        parent.insertBefore(codeParent.firstChild, codeParent);
      }
      parent.removeChild(codeParent);
    } else {
      // 2. 普通文本 -> 包裹 <code>
      const range = sel.getRangeAt(0);
      const container = iframeDoc.createElement('div');
      container.appendChild(range.cloneContents());
      const selectedHtml = container.innerHTML || sel.toString();

      if (!selectedHtml) return;

      // 优先采用 execCommand('insertHTML')，可原生接入浏览器的 Ctrl+Z 撤销历史
      const ok = iframeDoc.execCommand('insertHTML', false, `<code>${selectedHtml}</code>`);
      if (!ok) {
        // 降级使用 DOM Range API 节点替换
        const codeElem = iframeDoc.createElement('code');
        codeElem.appendChild(range.extractContents());
        range.insertNode(codeElem);
      }
    }

    // 触发 input/change 事件以通知 Blogger 编辑器自动保存草稿
    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
    iframeDoc.body.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─────────────────────────────────────────────
  //  块级代码 <pre> 格式化
  // ─────────────────────────────────────────────

  /**
   * 切换 <pre>...</pre> 块级代码格式：
   * - 利用与标题下拉菜单完全相同的原理: iframeDoc.execCommand("formatBlock", false, tag)
   * - 若光标所在块已是 <pre>，则切换回 <p>（段落）
   * - 否则将当前块转换为 <pre>
   * - 行内元素（<code>、<b>、<i> 等）在转换过程中完整保留
   * - 完美支持浏览器原生 Ctrl+Z / Ctrl+Y 撤销重做
   */
  function togglePreFormatting() {
    const iframe = getEditorIframe();
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    const sel = iframeWin.getSelection();

    if (!sel || sel.rangeCount === 0) return;

    // 检查光标当前是否处于 <pre> 节点内
    let node = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    const preParent = node ? node.closest('pre') : null;

    if (preParent && iframeDoc.body.contains(preParent)) {
      // 已是 <pre> -> 切换回 <p>（段落）
      iframeDoc.execCommand('formatBlock', false, 'P');
    } else {
      // 普通块级元素 -> 转换为 <pre>
      iframeDoc.execCommand('formatBlock', false, 'PRE');
    }

    // 触发 input/change 事件以通知 Blogger 编辑器自动保存草稿
    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
    iframeDoc.body.dispatchEvent(new Event('change', { bubbles: true }));

    // 更新按钮的激活状态
    updatePreButtonState();
  }

  /**
   * 更新 <pre> 按钮的视觉激活状态
   */
  function updatePreButtonState() {
    const btn = document.getElementById(PRE_BUTTON_ID);
    if (!btn) return;

    const iframe = getEditorIframe();
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    const sel = iframeWin.getSelection();

    let isInPre = false;
    if (sel && sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
      isInPre = node ? !!node.closest('pre') : false;
    }

    const innerBtn = btn.querySelector('[role="button"]');
    if (innerBtn) {
      if (isInPre) {
        innerBtn.style.backgroundColor = 'rgba(26, 115, 232, 0.12)';
        innerBtn.style.color = '#1a73e8';
      } else {
        innerBtn.style.backgroundColor = '';
        innerBtn.style.color = '';
      }
    }
  }

  // ─────────────────────────────────────────────
  //  按钮定位与注入
  // ─────────────────────────────────────────────

  /**
   * 查找格式化按钮组左侧的分隔线元素 (Anchor)
   */
  function findAnchorElement() {
    // 方案 1: 精准查找包含粗体(+bold)按钮组的分隔线
    const boldWrapper = document.querySelector('div[data-command="+bold"]');
    if (boldWrapper && boldWrapper.parentElement) {
      const parent = boldWrapper.parentElement;
      const separator = parent.querySelector('div.B2l7lc.ESCjze, div[role="separator"]');
      if (separator) return separator;
      if (boldWrapper.previousElementSibling) return boldWrapper.previousElementSibling;
    }

    // 方案 2: 用户指定的全路径选择器
    const explicitAnchor = document.querySelector('#yDmH0d > c-wiz:nth-child(15) > div > c-wiz > div > div.MJkged > div > div > div.y3IDJd.Fx3kmc.fmzcZd > span > div > div.P8hSs.pEg5pc.CDANdb.ZsY9oc > div.Qy5T6b.O3LMFb.QduVPe > div.Wdqgzf > div.QM4iYb > div.B2l7lc.ESCjze');
    if (explicitAnchor) return explicitAnchor;

    // 方案 3: 回退到粗体或斜体按钮前
    return boldWrapper || document.querySelector('div[data-command="+italic"]');
  }

  /**
   * 创建工具栏按钮的通用工厂函数
   */
  function createToolbarButton(id, dataCommand, label, iconText, iconStyle, clickHandler) {
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.setAttribute('data-command', dataCommand);
    wrapper.style.display = 'inline-block';

    wrapper.innerHTML = `
      <div role="button"
           class="U26fgb mUbCce fKz7Od bsjNHb M9Bg4d"
           aria-label="${label}"
           aria-disabled="false"
           tabindex="0"
           data-tooltip="${label}"
           title="${label}"
           style="cursor: pointer;">
        <div class="VTBa7b MbhUzd" jsname="ksKsZd"></div>
        <span jsslot="" class="xjKiLb">
          <span class="Ce1Y1c" style="${iconStyle}">
            ${iconText}
          </span>
        </span>
      </div>
    `;

    // 核心：在 mousedown 时阻止默认行为，防止点击工具栏导致 iframe 丢失选区焦点
    wrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // 点击事件触发格式化
    wrapper.addEventListener('click', (e) => {
      e.preventDefault();
      clickHandler();
    });

    return wrapper;
  }

  /**
   * 注入行内代码 <code> 按钮
   */
  function injectCodeButton() {
    if (document.getElementById(CODE_BUTTON_ID)) return;

    const anchor = findAnchorElement();
    if (!anchor) return;

    const btn = createToolbarButton(
      CODE_BUTTON_ID,
      'custom-code',
      '行内代码 (Code)',
      '&lt;/&gt;',
      'top: -9.5px; font-weight: bold; font-family: monospace; font-size: 13px; line-height: 24px;',
      toggleCodeFormatting
    );

    anchor.insertAdjacentElement('afterend', btn);
  }

  /**
   * 注入代码块 <pre> 按钮（紧跟在 <code> 按钮之后）
   */
  function injectPreButton() {
    if (document.getElementById(PRE_BUTTON_ID)) return;

    // 定位到 <code> 按钮之后
    const codeBtn = document.getElementById(CODE_BUTTON_ID);
    if (!codeBtn) return;

    const btn = createToolbarButton(
      PRE_BUTTON_ID,
      'custom-pre',
      '代码块 (Pre)',
      '{ }',
      'top: -9.5px; font-weight: bold; font-family: monospace; font-size: 13px; line-height: 24px;',
      togglePreFormatting
    );

    codeBtn.insertAdjacentElement('afterend', btn);
  }

  // ─────────────────────────────────────────────
  //  快捷键绑定
  // ─────────────────────────────────────────────

  /**
   * 在正文 iframe 中绑定快捷键监听
   * - Ctrl + `         : 行内代码 <code>
   * - Ctrl + Shift + C : 行内代码 <code>
   * - Ctrl + Shift + P : 代码块 <pre>
   */
  function bindShortcut() {
    const iframe = getEditorIframe();
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    if (doc.__codeShortcutBound) return;
    doc.__codeShortcutBound = true;

    doc.addEventListener('keydown', (e) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl + ` (反引号) 或 Ctrl + Shift + C -> 行内代码
      if (ctrlOrMeta && (e.key === '`' || (e.shiftKey && (e.key === 'C' || e.key === 'c')))) {
        e.preventDefault();
        toggleCodeFormatting();
        return;
      }

      // Ctrl + Shift + P -> 代码块 <pre>
      if (ctrlOrMeta && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        togglePreFormatting();
        return;
      }
    });

    // 监听光标移动以更新 <pre> 按钮状态
    doc.addEventListener('selectionchange', () => {
      updatePreButtonState();
    });
  }

  // ─────────────────────────────────────────────
  //  初始化与 SPA 监听
  // ─────────────────────────────────────────────

  // 持续监听 DOM 变化以适配 SPA 路由切换与工具栏重渲染
  const observer = new MutationObserver(() => {
    injectCodeButton();
    injectPreButton();
    bindShortcut();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 初始化执行一次
  injectCodeButton();
  injectPreButton();
  bindShortcut();
})();
