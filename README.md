# Blogger Editor Code Buttons (油猴脚本)

在 Google Blogger（Blogspot）富文本编辑器工具栏中增加 **行内代码** 和 **代码块** 两个格式化按钮。

创作过程充分使用了 Antigravity 对接 Gemini 3.7 Flash Medium Fast 及 Claude Opus 4.6 (Thinking)

---

## 🚀 功能特性

### 1. 行内代码按钮 `</>`
* 选中文本后点击，用 `<code>...</code>` 包裹选中内容。
* 再次点击可解除包裹（Toggle Unwrap）。
* 快捷键：**`Ctrl + \``**（反引号）或 **`Ctrl + Shift + C`**

### 2. 代码块按钮 `{ }`
* 将光标所在的整行/整段块级容器转换为 `<pre>...</pre>`。
* 再次点击可切换回 `<p>`（段落）。
* 利用与标题下拉菜单完全相同的原生 `formatBlock` 原理，行内元素（`<code>`、`<b>`、`<i>` 等）完整保留。
* 快捷键：**`Ctrl + Shift + P`**

### 3. 通用特性
* 完美支持浏览器原生 `Ctrl + Z`（撤销）与 `Ctrl + Y`（重做）。
* 触发 Blogger 内置的 `input` / `change` 事件，确保修改能被实时自动保存到草稿。
* 按钮带有激活状态高亮（光标在 `<pre>` 内时 `{ }` 按钮高亮）。

---

## 📍 工具栏布局效果

```text
[段落/标题 下拉框]  |  [</> 代码]  [{ } 代码块]  [B 粗体]  [I 斜体]  [U 下划线]  [S 删除线] ...
```

---

## 📥 安装使用说明

### 方式一：安装到油猴插件（Tampermonkey / Violentmonkey）
1. 在浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展插件。
2. 点击油猴图标 -> **添加新脚本**。
3. 打开本项目中的 [`blogger-code-button.user.js`](file:///c:/_work/blogspot_editor/blogger-code-button.user.js)，将全部代码复制粘贴到油猴编辑器中并保存（`Ctrl + S`）。
4. 打开或刷新任意 Blogger 文章编辑页面（`https://www.blogger.com/blog/post/*`），即可看到新按钮！

### 方式二：浏览器控制台临时运行
打开 Blogger 编辑器页面，按 `F12` 打开开发者工具，在 Console 中粘贴脚本代码并回车即可在当前页面即时生效。

---

## ⌨️ 快捷键汇总

| 功能 | 快捷键 |
|------|--------|
| 行内代码 `<code>` | `Ctrl + \`` 或 `Ctrl + Shift + C` |
| 代码块 `<pre>` | `Ctrl + Shift + P` |
