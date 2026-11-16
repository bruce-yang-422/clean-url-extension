// 擴充功能介面文字（7 種語言）。依瀏覽器介面語言選擇，缺少的字串退回繁體中文。
const STRINGS = {
  "zh-TW": {
    brandBadge: "乾淨連結", originalLabel: "目前網址", reading: "正在讀取目前分頁…", checking: "正在檢查網址…",
    cleanLabel: "乾淨連結", cleanEditable: "可直接編輯後再複製",
    copyClean: "複製乾淨連結", copied: "已複製乾淨連結", copyRetry: "重新複製乾淨連結",
    copyFailed: "複製失敗，請重試，或選取上方連結手動複製。",
    alreadyClean: "網址已經很乾淨", signed: "簽章連結保留原樣，避免連結失效",
    unsupportedTitle: "無法取得可清理的網頁網址", unsupportedStatus: "此頁面無法讀取網址",
    unsupportedButton: "此頁面不支援", unsupportedHint: "請切換至一般 HTTP 或 HTTPS 網頁後再開啟。",
    privacyNote: "僅在本機處理・不會上傳網址", privacySummary: "隱私說明",
    privacyDetail: "只在你開啟彈窗或使用右鍵選單時讀取網址，不儲存瀏覽紀錄、不傳送網址。按下複製時，將結果寫入系統剪貼簿。",
    privacyLink: "完整隱私權政策",
    menuPage: "複製此頁的乾淨連結", menuLink: "複製連結的乾淨網址",
  },
  "zh-CN": {
    brandBadge: "干净链接", originalLabel: "当前网址", reading: "正在读取当前标签页…", checking: "正在检查网址…",
    cleanLabel: "干净链接", cleanEditable: "可直接编辑后再复制",
    copyClean: "复制干净链接", copied: "已复制干净链接", copyRetry: "重新复制干净链接",
    copyFailed: "复制失败，请重试，或选取上方链接手动复制。",
    alreadyClean: "网址已经很干净", signed: "签名链接保持原样，避免链接失效",
    unsupportedTitle: "无法获取可清理的网页网址", unsupportedStatus: "此页面无法读取网址",
    unsupportedButton: "此页面不支持", unsupportedHint: "请切换到普通 HTTP 或 HTTPS 网页后再打开。",
    privacyNote: "仅在本地处理・不会上传网址", privacySummary: "隐私说明",
    privacyDetail: "仅在你打开弹窗或使用右键菜单时读取网址，不保存浏览记录、不发送网址。点击复制时，将结果写入系统剪贴板。",
    privacyLink: "完整隐私政策",
    menuPage: "复制此页的干净链接", menuLink: "复制链接的干净网址",
  },
  en: {
    brandBadge: "Clean link", originalLabel: "Current URL", reading: "Reading the current tab…", checking: "Checking URL…",
    cleanLabel: "Clean link", cleanEditable: "You can edit it before copying",
    copyClean: "Copy clean link", copied: "Clean link copied", copyRetry: "Copy clean link again",
    copyFailed: "Copy failed. Try again, or select the link above and copy it manually.",
    alreadyClean: "This URL is already clean", signed: "Signed link kept as is to avoid breaking it",
    unsupportedTitle: "No cleanable web page URL", unsupportedStatus: "This page's URL can't be read",
    unsupportedButton: "Page not supported", unsupportedHint: "Switch to a normal HTTP or HTTPS page and try again.",
    privacyNote: "Processed locally · URLs never uploaded", privacySummary: "Privacy",
    privacyDetail: "URLs are read only when you open the popup or use the context menu. No history is stored and no URL is sent anywhere. Copying writes the result to your clipboard.",
    privacyLink: "Full privacy policy",
    menuPage: "Copy clean link of this page", menuLink: "Copy clean link address",
  },
  ja: {
    brandBadge: "クリーンリンク", originalLabel: "現在の URL", reading: "現在のタブを読み込み中…", checking: "URL を確認中…",
    cleanLabel: "クリーンなリンク", cleanEditable: "コピー前に編集できます",
    copyClean: "クリーンなリンクをコピー", copied: "コピーしました", copyRetry: "もう一度コピー",
    copyFailed: "コピーできませんでした。再試行するか、上のリンクを選択して手動でコピーしてください。",
    alreadyClean: "この URL はすでにクリーンです", signed: "署名付きリンクは壊れないよう、そのまま保持します",
    unsupportedTitle: "クリーンにできる URL がありません", unsupportedStatus: "このページの URL は読み取れません",
    unsupportedButton: "未対応のページ", unsupportedHint: "通常の HTTP / HTTPS ページで開いてください。",
    privacyNote: "ローカルで処理・URL は送信しません", privacySummary: "プライバシー",
    privacyDetail: "ポップアップまたは右クリックメニューを使ったときだけ URL を読み取ります。履歴は保存せず、URL も送信しません。コピー時に結果をクリップボードへ書き込みます。",
    privacyLink: "プライバシーポリシー",
    menuPage: "このページのクリーンなリンクをコピー", menuLink: "リンクのクリーンな URL をコピー",
  },
  ko: {
    brandBadge: "깔끔한 링크", originalLabel: "현재 URL", reading: "현재 탭을 읽는 중…", checking: "URL 확인 중…",
    cleanLabel: "깔끔한 링크", cleanEditable: "복사하기 전에 편집할 수 있습니다",
    copyClean: "깔끔한 링크 복사", copied: "복사했습니다", copyRetry: "다시 복사",
    copyFailed: "복사하지 못했습니다. 다시 시도하거나 위 링크를 선택해 직접 복사하세요.",
    alreadyClean: "이미 깔끔한 URL입니다", signed: "서명된 링크는 깨지지 않도록 그대로 둡니다",
    unsupportedTitle: "정리할 수 있는 웹 페이지 URL이 없습니다", unsupportedStatus: "이 페이지의 URL을 읽을 수 없습니다",
    unsupportedButton: "지원하지 않는 페이지", unsupportedHint: "일반 HTTP 또는 HTTPS 페이지에서 다시 여세요.",
    privacyNote: "로컬에서 처리 · URL을 업로드하지 않음", privacySummary: "개인정보",
    privacyDetail: "팝업이나 오른쪽 클릭 메뉴를 사용할 때만 URL을 읽습니다. 방문 기록을 저장하거나 URL을 전송하지 않습니다. 복사하면 결과를 클립보드에 씁니다.",
    privacyLink: "개인정보처리방침",
    menuPage: "이 페이지의 깔끔한 링크 복사", menuLink: "링크의 깔끔한 주소 복사",
  },
  es: {
    brandBadge: "Enlace limpio", originalLabel: "URL actual", reading: "Leyendo la pestaña actual…", checking: "Comprobando la URL…",
    cleanLabel: "Enlace limpio", cleanEditable: "Puedes editarlo antes de copiar",
    copyClean: "Copiar enlace limpio", copied: "Enlace limpio copiado", copyRetry: "Volver a copiar",
    copyFailed: "No se pudo copiar. Inténtalo de nuevo o selecciona el enlace y cópialo manualmente.",
    alreadyClean: "Esta URL ya está limpia", signed: "El enlace firmado se mantiene intacto para no romperlo",
    unsupportedTitle: "No hay una URL web que limpiar", unsupportedStatus: "No se puede leer la URL de esta página",
    unsupportedButton: "Página no compatible", unsupportedHint: "Abre una página HTTP o HTTPS normal e inténtalo de nuevo.",
    privacyNote: "Procesado en local · Las URL nunca se suben", privacySummary: "Privacidad",
    privacyDetail: "Las URL solo se leen al abrir la ventana emergente o usar el menú contextual. No se guarda historial ni se envía ninguna URL. Al copiar, el resultado se escribe en el portapapeles.",
    privacyLink: "Política de privacidad",
    menuPage: "Copiar enlace limpio de esta página", menuLink: "Copiar dirección limpia del enlace",
  },
  fr: {
    brandBadge: "Lien propre", originalLabel: "URL actuelle", reading: "Lecture de l’onglet actuel…", checking: "Vérification de l’URL…",
    cleanLabel: "Lien propre", cleanEditable: "Vous pouvez le modifier avant de copier",
    copyClean: "Copier le lien propre", copied: "Lien propre copié", copyRetry: "Copier à nouveau",
    copyFailed: "Échec de la copie. Réessayez ou sélectionnez le lien ci-dessus pour le copier manuellement.",
    alreadyClean: "Cette URL est déjà propre", signed: "Lien signé conservé tel quel pour ne pas le casser",
    unsupportedTitle: "Aucune URL web à nettoyer", unsupportedStatus: "Impossible de lire l’URL de cette page",
    unsupportedButton: "Page non prise en charge", unsupportedHint: "Ouvrez une page HTTP ou HTTPS normale et réessayez.",
    privacyNote: "Traitement local · Aucune URL envoyée", privacySummary: "Confidentialité",
    privacyDetail: "Les URL ne sont lues que lorsque vous ouvrez la fenêtre ou utilisez le menu contextuel. Aucun historique n’est conservé et aucune URL n’est envoyée. La copie écrit le résultat dans le presse-papiers.",
    privacyLink: "Politique de confidentialité",
    menuPage: "Copier le lien propre de cette page", menuLink: "Copier l’adresse propre du lien",
  },
};
export const LANGUAGES = Object.keys(STRINGS);

/** 將瀏覽器語言對應到支援的介面語言；其他語言使用英文。 */
export function pickLanguage(tag = "") {
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) return /hant|tw|hk|mo/.test(lower) ? "zh-TW" : "zh-CN";
  const base = lower.split(/[-_]/)[0];
  return STRINGS[base] ? base : "en";
}

const language = pickLanguage(globalThis.chrome?.i18n?.getUILanguage?.() ?? globalThis.navigator?.language ?? "zh-TW");

/** 取得翻譯文字，缺少時退回繁體中文。 */
export function t(key, lang = language) {
  return STRINGS[lang]?.[key] ?? STRINGS["zh-TW"][key] ?? key;
}

/** 依 data-i18n、data-i18n-placeholder 屬性填入頁面文字。 */
export function localize(root = document) {
  root.documentElement.lang = language;
  for (const element of root.querySelectorAll("[data-i18n]")) element.textContent = t(element.dataset.i18n);
  for (const element of root.querySelectorAll("[data-i18n-placeholder]")) element.placeholder = t(element.dataset.i18nPlaceholder);
}
