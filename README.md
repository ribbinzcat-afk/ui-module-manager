# ☁️ UI Module Manager for SillyTavern

A powerful, elegant, and highly customizable extension for SillyTavern that allows you to inject, manage, and toggle custom JavaScript UI modules seamlessly. Say goodbye to messy, hard-coded UI scripts and hello to a clean, pastel-themed control panel!

## ✨ Features

- **Modular Control:** Add, edit, delete, and toggle individual UI scripts without restarting your server.
- **Twin UI System:** Manage your modules quietly from the right-side Extension Drawer, or summon the Grand Pop-up Modal via the Magic Wand quick button.
- **Smart Scope System:** Set modules to run globally or restrict them to specific characters.
- **Theme Presets:** Save your favorite combinations of UI modules and switch between them with a single click.
- **Floating Code Editor:** Expand your workspace with a comfortable, floating code editor.
- **Aesthetic Design:** A beautifully crafted, responsive pastel interface that looks great on both desktop and mobile.

## 📦 Installation

You can install this extension directly through SillyTavern:

1. Open SillyTavern and click the **Extensions** icon (jigsaw puzzle piece) in the top bar.
2. Click on **Install Extension**.
3. Paste the URL of this GitHub repository:
   `https://github.com/ribbinzcat-afk/ui-module-manager`
4. Click **Install** and wait for the process to finish.
5. Refresh your SillyTavern page.

*(Note: Don't forget to replace the URL above with your actual GitHub link!)*

## 🚀 How to Use

1. Look for the **Magic Wand** icon next to your chat input box, or find the **UI Module Manager** in the right-side extensions panel.
2. Click **Add Module** to create a new UI script.
3. Choose the **Scope** (Global or Specific Character).
4. Paste your JavaScript code.
5. Toggle the checkbox to enable or disable the module instantly.

## 📝 Writing UI Scripts

This extension executes your code using `new Function('ctx', code)`. You have access to the `ctx` object, which contains:
- `ctx.message`: The current message data.
- `ctx.chatId`: The current chat ID.
- `ctx.characters`: Data of all characters in the chat.

**Example Code (Simple Box):**
```javascript
const messages = document.querySelectorAll('.mes_text');
messages.forEach(msg => {
    if (msg.innerHTML.includes('[UI_BOX]')) {
        msg.innerHTML = msg.innerHTML.replace(
            '[UI_BOX]',
            '<div style="background:#bde0fe; padding:10px; border-radius:8px;">Hello UI!</div>'
        );
    }
});
```

## 🎨 Credits
Developed with love and a lot of pastel colors.
**Apricity & Tiramisu (Gemini 3.1)**
**Special Thanks: Universal Extension Creator Prompt by Chai**
