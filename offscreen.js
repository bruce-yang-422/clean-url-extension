// 僅接收背景程式的複製要求，寫入後立即清空暫存欄位。
const field = document.getElementById("clipboard");
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.target !== "offscreen" || message.type !== "copy" || sender.id !== chrome.runtime.id) return;
  field.value = message.text;
  field.select();
  const ok = document.execCommand("copy");
  field.value = "";
  respond({ ok });
});
