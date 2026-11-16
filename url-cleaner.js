// 通用規則僅列出明確的追蹤參數；ref、source、id、keyword 等名稱
// 可能影響頁面功能，必須保留，或交由特定網站規則判斷。
// 名稱比對一律使用小寫。參考 AdGuard URL Tracking filter 與各平台公開文件。
const TRACKING_PARAMETERS = new Set([
  // 廣告點擊 ID
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "ysclid",
  "ttclid", "twclid", "igshid", "li_fat_id", "epik", "rb_clickid", "irclickid", "irgwc",
  "srsltid", "gad_source", "gad_campaignid", "gclsrc", "fbadid", "wickedid",
  // Google Analytics、Facebook、Twitter 分享
  "_ga", "_gl", "fb_source", "fb_ref", "fb_action_ids", "fb_action_types",
  "action_object_map", "action_ref_map", "action_type_map", "__twitter_impression",
  // 電子報與行銷自動化：Mailchimp、Marketo、HubSpot、Eloqua、Vero、Klaviyo 等
  "mc_cid", "mc_eid", "mc_tc", "mkt_tok", "_hsenc", "_hsmi", "__hssc", "__hstc", "__hsfp", "hsctracking",
  "elqtrackid", "elqtrack", "elqaid", "elqat", "elqcampaignid", "vero_conv", "vero_id", "_kx",
  "oly_anon_id", "oly_enc_id", "ml_subscriber", "ml_subscriber_hash", "dm_i",
  "bsft_clkid", "bsft_eid", "bsft_mid", "bsft_uid", "bsft_aaid", "bsft_ek",
  "sms_click", "sms_source", "sms_uph",
  // Matomo／Piwik
  "mtm_campaign", "mtm_source", "mtm_medium", "mtm_content", "mtm_keyword",
  "mtm_kwd", "mtm_cid", "mtm_group", "mtm_placement",
  "pk_campaign", "pk_kwd", "pk_keyword", "pk_source", "pk_medium", "pk_content", "pk_cid", "pk_vid",
  "piwik_campaign", "piwik_kwd", "piwik_keyword",
  // Adobe、AT Internet、Webtrends、Yandex、Yahoo 同意頁
  "s_cid", "adobe_mc_ref", "adobe_mc_sdid", "xtor", "wt_mc", "wt_zmc", "_openstat",
  "at_medium", "at_campaign", "at_campaign_type", "at_creation", "at_emailtype", "at_link", "at_link_id",
  "at_link_origin", "at_link_type", "at_ptr_name", "at_recipient_id", "at_recipient_list", "at_send_date",
  "guccounter", "guce_referrer", "guce_referrer_sig",
  // 聯盟行銷與 App 歸因：CJ、Impact、ShareASale、Branch、Adjust、Tradedoubler
  "cjevent", "cjdata", "sscid", "ir_campaignid", "ir_adid", "ir_partnerid", "rtkcid", "tduid",
  "_branch_match_id", "_branch_referrer", "admitad_uid", "unicorn_click_id", "gps_adid",
  "adj_label", "adj_campaign", "adj_creative", "adj_t", "adjust_tracker", "adjust_tracker_limit",
  "adjust_campaign", "adjust_adgroup", "adjust_creative", "adjust_referrer",
  // 站內活動標記
  "itm_source", "itm_medium", "itm_campaign", "itm_content", "itm_term",
  "int_source", "int_medium", "int_campaign", "int_content", "int_term",
]);
// 名稱以下列前綴開頭時視為追蹤參數（utm_* 與 HubSpot 廣告 hsa_*）。
const TRACKING_PREFIXES = ["utm_", "hsa_"];
// incoming_source 為站內來源標記（例如 dd＝每日新發現），不影響頁面內容。
const SHOPEE_TRACKING_PARAMETERS = new Set(["sp_atk", "xptdk", "publish_id", "uls_trackid", "incoming_source"]);
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
const AMAZON_HOST = /^(?:www\.|smile\.)?amazon\.(?:com|ca|com\.mx|com\.br|co\.uk|de|fr|it|es|nl|se|pl|com\.be|com\.tr|ae|sa|eg|in|sg|co\.jp|com\.au)$/;
const GOOGLE_HOST = /^(?:www\.)?google\.(?:[a-z]{2,3}|com?\.[a-z]{2})$/;
const AMAZON_PRODUCT = /^\/(?:[^/]+\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/[^?#]*)?$/i;

// 單純「指定網域與路徑時移除指定參數」的網站規則。
// hosts 為網域本身或其子網域；RegExp 則需完整比對 hostname。
const SITE_RULES = [
  { id: "threads", hosts: ["threads.com", "threads.net"], path: /^\/@[^/]+\/post\/[^/]+\/?$/, params: ["xmt", "slof", "igsh"] },
  { id: "youtube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    params: ["si", "pp", "feature", "embeds_referring_euri", "embeds_referring_origin", "source_ve_path"] },
  { id: "spotify", hosts: ["open.spotify.com"], params: ["si", "sp_cid", "dlsi", "pi", "referral"] },
  { id: "instagram", hosts: ["instagram.com"],
    params: ["igsh", "ig_rid", "igsi", "ndid", "dlrf", "psln", "cplk", "rpxt", "srtk", "obrf", "xtok", "mdxt", "exln", "vrfl", "stkn", "click_source"] },
  { id: "facebook", hosts: ["facebook.com", "fb.com", "fb.watch"], params: ["mibextid", "rdid", "extid", "__tn__", "sfnsn", "eav", "paipv"], prefixes: ["__cft__"] },
  { id: "x", hosts: ["x.com", "twitter.com"], params: ["s", "ref_src", "ref_url", "refsrc", "cxt"] },
  { id: "x", hosts: ["x.com", "twitter.com"], path: /^\/[^/]+\/status\/\d+/, params: ["t"] },
  { id: "tiktok", hosts: ["tiktok.com"],
    params: ["_r", "_t", "_d", "is_from_webapp", "sender_device", "sender_web_id", "share_app_id", "share_author_id", "share_link_id",
      "share_item_id", "u_code", "tt_from", "web_id", "refer", "referer_url", "referer_video_id", "embed_source", "enter_method",
      "user_id", "sec_user_id", "sec_uid", "share_region", "social_share_type", "trackparams", "ug_btm", "timestamp", "checksum"] },
  { id: "reddit", hosts: ["reddit.com"],
    params: ["share_id", "ref_source", "ref_campaign", "ref", "rdt", "correlation_id", "post_index", "post_fullname", "target_user", "$deep_link", "$3p", "entry_point"] },
  { id: "linkedin", hosts: ["linkedin.com"], params: ["lipi", "trackingid", "refid", "original_referer", "originalreferer"], prefixes: ["trk"] },
  { id: "bilibili", hosts: ["bilibili.com", "b23.tv"],
    params: ["spm_id_from", "from_spmid", "from_spm_id", "spmid", "vd_source", "share_source", "share_medium", "share_plat",
      "share_session_id", "share_tag", "share_from", "unique_k", "trackid", "track_id", "caid", "resource_id", "source_id",
      "request_id", "creative_id", "linked_creative_id", "msource", "csource", "plat_id", "buvid", "up_id", "seid", "bbid", "ts", "timestamp"] },
  { id: "google", hosts: GOOGLE_HOST, path: /^\/search\/?$/,
    params: ["ved", "ei", "gs_lcp", "gs_lcrp", "gs_lp", "gs_l", "gs_ssp", "sca_esv", "sca_upv", "sxsrf", "oq", "aqs", "sourceid",
      "sclient", "uact", "iflsig", "sstk", "fbs", "rlz", "bih", "biw", "dpr", "client", "sa", "source", "ie", "oe"] },
  { id: "amazon", hosts: AMAZON_HOST,
    params: ["ref_", "_encoding", "content-id", "linkcode", "linkid", "tag", "ascsubtag", "associatetag", "creative", "creativeasin",
      "camp", "adgrpid", "hydadcr", "dchild", "plattr", "rdc", "refrid", "visitid", "vtr", "asc_campaign", "asc_refurl", "asc_source"],
    prefixes: ["pd_rd_", "pf_rd_", "hv"] },
  { id: "amazon", hosts: AMAZON_HOST, path: AMAZON_PRODUCT, params: ["ref", "keywords", "qid", "sr", "crid", "sprefix", "dib", "dib_tag", "pbs"] },
  { id: "aliexpress", hosts: ["aliexpress.com", "aliexpress.us"],
    params: ["algo_pvid", "algo_exp_id", "curpagelogid", "pdp_npi", "pdp_ext_f", "pdp_pi", "aff_trace_key", "aff_platform", "aff_fcid",
      "aff_fsk", "aff_short_key", "spm", "scm", "scm_id", "scm-url", "utparam", "utparam-url", "terminal_id", "pvid", "sk", "dp", "gatewayadapt"] },
  { id: "taobao", hosts: ["taobao.com", "tmall.com"],
    params: ["spm", "scm", "pvid", "utparam", "ali_trackid", "ali_refid", "bxsign", "union_lens", "traceid", "xid", "ptl", "app_pvid"] },
  { id: "books", hosts: ["books.com.tw"], path: /^\/products\/[^/]+\/?$/, params: ["loc", "sloc"] },
  { id: "rakuten", hosts: ["rakuten.com.tw"], params: ["l-id", "s-id", "scid"] },
  { id: "yahoo", hosts: ["tw.buy.yahoo.com", "tw.mall.yahoo.com", "tw.bid.yahoo.com"], params: ["co_servername"] },
];

function hostMatches(hostname, hosts) {
  return hosts instanceof RegExp ? hosts.test(hostname)
    : hosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
}

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
  // 文字片段（#:~:text=）只用於捲動與醒目標示，不影響頁面內容；保留其前方的一般錨點。
  let fragment = input.slice(queryEnd);
  let fragmentRemoved = 0;
  const directive = fragment.indexOf(":~:");
  if (directive !== -1) {
    fragment = directive > 1 ? fragment.slice(0, directive) : "";
    fragmentRemoved = 1;
  }
  const standard = !parsed.username && !parsed.password && !parsed.port;
  // PChome 商品分享移除全部查詢參數，保留商品路徑及原有 # 片段。
  // 此規則優先於下方的簽章保護；僅適用於指定網域與商品路徑。
  const pchomeProduct = parsed.hostname === "24h.pchome.com.tw" && standard
    && /^\/prod\/[a-z0-9]+-[a-z0-9]+\/?$/i.test(parsed.pathname);
  if (pchomeProduct && hasQuery) {
    result.cleanedUrl = input.slice(0, queryIndex) + fragment;
    result.removedCount = entries.length + fragmentRemoved;
    return result;
  }
  // 簽章可能驗證整段查詢（含追蹤參數），因此其餘含簽章的網址保持原樣。
  if (entries.some(({ name }) => SIGNATURE_PARAMETERS.has(name))) {
    return { ...result, signed: true };
  }
  // 各站規則僅接受指定網域，並排除帶帳密或非標準連接埠的網址。
  const shopee = ["shopee.tw", "www.shopee.tw"].includes(parsed.hostname) && standard;
  const product = shopee && parsed.pathname.match(/^\/[^/]+-i\.([1-9]\d*)\.([1-9]\d*)\/?$/);
  const category = shopee && parsed.pathname.match(/^\/[^/]+-cat\.([1-9]\d*(?:\.[1-9]\d*){0,2})\/?$/);
  const shopeeProduct = product || (shopee && /^\/product\/[1-9]\d*\/[1-9]\d*\/?$/.test(parsed.pathname));
  const shopName = shopee && parsed.pathname.match(/^\/([a-z0-9_][a-z0-9_.]*)\/?$/i);
  const shop = shopName && !SHOPEE_RESERVED_ROUTES.has(shopName[1].toLowerCase());
  const shopByProduct = shop && entries.some(({ name, value }) => name === "entrypoint" && value === "ShopByPDP");
  // momo 同時支援新版商品路徑、TP 商店商品與帶 i_code 的舊版商品頁。
  const momo = ["momoshop.com.tw", "www.momoshop.com.tw"].includes(parsed.hostname) && standard;
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
  const coupang = ["tw.coupang.com", "www.tw.coupang.com"].includes(parsed.hostname) && standard;
  const coupangProduct = coupang && parsed.pathname.match(/^\/products\/(?:[^/]+-)?([1-9]\d*)\/?$/);
  const coupangSearch = coupangProduct && entries.some(({ name, value }) => name === "sourcetype"
    && ["search", "category"].includes(value.toLowerCase()));
  const amazonProduct = standard && AMAZON_HOST.test(parsed.hostname) && parsed.pathname.match(AMAZON_PRODUCT);
  // 套用於本網址的表格式網站規則。
  const siteRules = standard ? SITE_RULES.filter(rule => hostMatches(parsed.hostname, rule.hosts)
    && (!rule.path || rule.path.test(parsed.pathname))) : [];
  // 逐項判斷並統計移除數量；保留的參數沿用原始編碼與順序。
  const retained = entries.filter(({ name, value }) => {
    const tracking = TRACKING_PARAMETERS.has(name) || TRACKING_PREFIXES.some(prefix => name.startsWith(prefix));
    // 分享蝦皮商品時移除圖片選取及預選規格；規格包裝含未知欄位則保留。
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
    const siteSource = siteRules.some(rule => rule.params.includes(name) || rule.prefixes?.some(prefix => name.startsWith(prefix)));
    const remove = tracking || shopeeSource || selection || shopContext || momoSource || coupangSource || siteSource;
    if (remove) result.removedCount++;
    return !remove;
  });
  const query = retained.map(({ raw }) => raw).join("&");
  let base = input.slice(0, hasQuery ? queryIndex : queryEnd);
  // 蝦皮商品標題可省略，改用完整的賣場／商品 ID；分類、酷澎與 Amazon 商品也縮短路徑。
  // ID 始終保留為字串，避免轉成 Number 後造成大整數精度損失。
  if (product) base = `${parsed.origin}/product/${product[1]}/${product[2]}`;
  else if (category) base = `${parsed.origin}/c-cat.${category[1]}`;
  else if (coupangProduct) base = `${parsed.origin}/products/${coupangProduct[1]}`;
  else if (amazonProduct) base = `${parsed.origin}/dp/${amazonProduct[1]}`;
  result.removedCount += fragmentRemoved;
  // 有移除參數才重組查詢；否則保留原始查詢（包含空的 ?）。
  const querySuffix = result.removedCount - fragmentRemoved
    ? (query ? `?${query}` : "")
    : (hasQuery ? input.slice(queryIndex, queryEnd) : "");
  result.cleanedUrl = base + querySuffix + fragment;
  return result;
}
