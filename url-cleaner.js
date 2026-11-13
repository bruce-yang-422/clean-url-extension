// 通用規則僅列出明確的追蹤參數；ref、source、id、keyword 等名稱
// 可能影響頁面功能，必須保留，或交由特定網站規則判斷。
const TRACKING_PARAMETERS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid",
  "ttclid", "twclid", "igshid", "mc_cid", "mc_eid", "_ga", "_gl",
  "srsltid", "gad_source", "gad_campaignid",
  "gclsrc", "fb_source", "fb_ref", "fb_action_ids", "fb_action_types",
  "mc_tc", "__twitter_impression", "mkt_tok",
  "mtm_campaign", "mtm_source", "mtm_medium", "mtm_content", "mtm_keyword",
  "mtm_kwd", "mtm_cid", "mtm_group", "mtm_placement",
  "pk_campaign", "pk_kwd",
]);
const SHOPEE_TRACKING_PARAMETERS = new Set(["sp_atk", "xptdk", "publish_id", "uls_trackid"]);
const SIGNATURE_PARAMETERS = new Set([
  "x-amz-signature", "x-goog-signature", "signature", "sig",
]);
// 酷澎專用的來源追蹤參數，不套用到其他網站。
const COUPANG_TRACKING_PARAMETERS = new Set([
  "wpcid", "wref", "wtime", "af_c_id", "mcid", "src", "campaignid", "pid",
  "spec", "addtag", "network", "af_click_lookback", "lptag",
  "af_reengagement_window", "af_sub5", "ctag", "af_channel",
  "is_retargeting", "af_force_transparent",
  "searchid", "searchrank", "rank", "itemscount", "traceid",
]);
// 蝦皮系統路徑不可誤判為賣場名稱。
const SHOPEE_RESERVED_ROUTES = new Set([
  "search", "product", "shop", "cart", "checkout", "user", "buyer", "seller",
  "login", "signup", "flash_sale", "mall", "collections", "collection",
  "official_shops", "top_products", "daily_discover", "feed", "live", "video",
  "campaign", "events", "blog", "help", "universal-link",
]);

// 僅接受已知的商品規格欄位；含未知欄位或無效值時，保留整個參數。
function isDisplayModelSelection(value) {
  try {
    const data = JSON.parse(value);
    if (!data || Array.isArray(data)
        || !Object.keys(data).every(key => ["display_model_id", "model_selection_logic"].includes(key))
        || !Object.hasOwn(data, "display_model_id")) return false;
    if (Object.hasOwn(data, "model_selection_logic")
        && (!Number.isSafeInteger(data.model_selection_logic) || data.model_selection_logic < 0)) return false;
    const id = data.display_model_id;
    return typeof id === "string" ? /^\d+$/.test(id)
      : Number.isSafeInteger(id) && id >= 0;
  } catch {
    return false;
  }
}

/** 純本機網址清理，不發送網路請求；依網站規則移除參數並縮短已識別的路徑。 */
export function cleanUrl(input) {
  if (typeof input !== "string" || !input || input !== input.trim()) {
    throw new TypeError("無法解析網址");
  }
  const parsed = new URL(input);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("此頁面無法讀取網址");
  }

  const result = { originalUrl: input, cleanedUrl: input, removedCount: 0, signed: false };
  // 以 URLSearchParams 解碼參數供規則比對，同時保存原始字串。
  // 直接重新序列化 searchParams 會改變 %20、+、~ 等編碼。
  // 查詢範圍止於 #，避免將片段中的 ? 誤認為查詢起點。
  const hashIndex = input.indexOf("#");
  const queryEnd = hashIndex === -1 ? input.length : hashIndex;
  const queryIndex = input.indexOf("?");
  const hasQuery = queryIndex !== -1 && queryIndex < queryEnd;
  const parts = hasQuery ? input.slice(queryIndex + 1, queryEnd).split("&") : [];
  const entries = parts.map(raw => {
    const [name = "", value = ""] = [...new URLSearchParams(raw).entries()][0] ?? [];
    return { raw, name: name.toLowerCase(), value };
  });
  // PChome 商品分享移除全部查詢參數，保留商品路徑及原有 # 片段。
  // 此規則優先於下方的簽章保護；僅適用於指定網域與商品路徑。
  const pchomeProduct = parsed.hostname === "24h.pchome.com.tw"
    && !parsed.username && !parsed.password && !parsed.port
    && /^\/prod\/[a-z0-9]+-[a-z0-9]+\/?$/i.test(parsed.pathname);
  if (pchomeProduct && hasQuery) {
    result.cleanedUrl = input.slice(0, queryIndex) + input.slice(queryEnd);
    result.removedCount = entries.length;
    return result;
  }
  // 簽章可能驗證整段查詢（含追蹤參數），因此其餘含簽章的網址保持原樣。
  if (entries.some(({ name }) => SIGNATURE_PARAMETERS.has(name))) {
    return { ...result, signed: true };
  }
  // 各站規則僅接受指定網域，並排除帶帳密或非標準連接埠的網址。
  const shopee = ["shopee.tw", "www.shopee.tw"].includes(parsed.hostname)
    && !parsed.username && !parsed.password && !parsed.port;
  const product = shopee && parsed.pathname.match(/^\/[^/]+-i\.([1-9]\d*)\.([1-9]\d*)\/?$/);
  const category = shopee && parsed.pathname.match(/^\/[^/]+-cat\.([1-9]\d*(?:\.[1-9]\d*){0,2})\/?$/);
  const shopeeProduct = product || (shopee && /^\/product\/[1-9]\d*\/[1-9]\d*\/?$/.test(parsed.pathname));
  const shopName = shopee && parsed.pathname.match(/^\/([a-z0-9_][a-z0-9_.]*)\/?$/i);
  const shop = shopName && !SHOPEE_RESERVED_ROUTES.has(shopName[1].toLowerCase());
  const shopByProduct = shop && entries.some(({ name, value }) => name === "entrypoint" && value === "ShopByPDP");
  // momo 同時支援新版商品路徑、TP 商店商品與帶 i_code 的舊版商品頁。
  const momo = ["momoshop.com.tw", "www.momoshop.com.tw"].includes(parsed.hostname)
    && !parsed.username && !parsed.password && !parsed.port;
  const momoProduct = momo && (/^\/product\/[1-9]\d*\/?$/.test(parsed.pathname)
    || /^\/TP\/TP\d+\/goodsDetail\/TP\d+\/?$/.test(parsed.pathname)
    || (parsed.pathname === "/goods/GoodsDetail.jsp" && /^\d+$/.test(parsed.searchParams.get("i_code") ?? "")));
  const momoCampaign = momo && parsed.pathname === "/edm/cmmedm.jsp"
    && /^[a-z0-9_-]+$/i.test(parsed.searchParams.get("lpn") ?? "");
  const momoFromSearch = momoProduct && entries.some(({ name, value }) => name === "area" && value.toLowerCase() === "search");
  const momoArea = momoProduct && entries.some(({ name, value }) => name === "area"
    && ["search", "category", "home", "index"].includes(value.toLowerCase()));
  const momoEntry = value => /^(?:category|\d+|\d+-bt_[a-z0-9_]+(?:-bt_[a-z0-9_]+)*)$/i.test(value);
  const momoNavigation = momoArea || (momoProduct && entries.some(({ name, value }) => name === "mdiv" && momoEntry(value)));
  const coupang = ["tw.coupang.com", "www.tw.coupang.com"].includes(parsed.hostname)
    && !parsed.username && !parsed.password && !parsed.port;
  const coupangProduct = coupang && parsed.pathname.match(/^\/products\/(?:[^/]+-)?([1-9]\d*)\/?$/);
  const coupangSearch = coupangProduct && entries.some(({ name, value }) => name === "sourcetype"
    && ["search", "category"].includes(value.toLowerCase()));
  // 逐項判斷並統計移除數量；保留的參數沿用原始編碼與順序。
  const retained = entries.filter(({ name, value }) => {
    const tracking = name.startsWith("utm_") || TRACKING_PARAMETERS.has(name);
    // 分享蝦皮商品時移除預選規格；若包裝內含未知欄位，則完整保留。
    const selection = shopeeProduct && ((name === "extraparams" && isDisplayModelSelection(value))
      || name === "image_ids");
    // 從商品頁進入賣場時，移除入口及商品脈絡，分享單純的賣場網址。
    const shopContext = shopByProduct && ((name === "entrypoint" && value === "ShopByPDP")
      || (["categoryid", "itemid"].includes(name) && /^\d+$/.test(value)));
    // momo 僅移除已知格式的來源資訊，避免誤刪 content 等通用名稱的功能值。
    const momoSearchSource = (momoArea && name === "area" && ["search", "category", "home", "index"].includes(value.toLowerCase()))
      || (momoNavigation && ((name === "oid" && /^\d+_\d+$/.test(value)) || (name === "cid" && value === "index")))
      || (momoFromSearch && name === "kw");
    const momoSource = momoSearchSource || (momoCampaign && name === "mdiv") || (momoProduct && ((name === "osm" && /^Ad\d+$/i.test(value))
      || (name === "content" && /^personallist\d+$/i.test(value))
      || (name === "mdiv" && momoEntry(value)) || (["cc1", "ectagnos"].includes(name) && value === "")));
    // 酷澎分享主商品，移除數字格式的規格／賣家 ID；未知值及無關參數仍保留。
    const coupangSource = coupangProduct && (COUPANG_TRACKING_PARAMETERS.has(name)
      || (["itemid", "vendoritemid"].includes(name) && /^\d+$/.test(value))
      || (name === "pagetype" && value === "PRODUCT")
      || (name === "pagevalue" && value === coupangProduct[1])
      || (coupangSearch && ["sourcetype", "q", "categoryid"].includes(name))
      || (name === "redirect" && value === "landing"));
    const shopeeSource = shopee && SHOPEE_TRACKING_PARAMETERS.has(name);
    const remove = tracking || shopeeSource || selection || shopContext || momoSource || coupangSource;
    if (remove) result.removedCount++;
    return !remove;
  });
  const query = retained.map(({ raw }) => raw).join("&");
  let base = input.slice(0, hasQuery ? queryIndex : queryEnd);
  // 蝦皮商品標題可省略，改用完整的賣場／商品 ID；分類與酷澎商品也縮短路徑。
  // ID 始終保留為字串，避免轉成 Number 後造成大整數精度損失。
  if (product) base = `${parsed.origin}/product/${product[1]}/${product[2]}`;
  else if (category) base = `${parsed.origin}/c-cat.${category[1]}`;
  else if (coupangProduct) base = `${parsed.origin}/products/${coupangProduct[1]}`;
  // 有移除參數才重組查詢；否則保留原始查詢（包含空的 ?）。
  const querySuffix = result.removedCount
    ? (query ? `?${query}` : "")
    : (hasQuery ? input.slice(queryIndex, queryEnd) : "");
  result.cleanedUrl = base + querySuffix + input.slice(queryEnd);
  return result;
}
