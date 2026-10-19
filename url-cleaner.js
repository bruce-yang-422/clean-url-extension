// Keep this list narrow: ambiguous names such as ref, source, id and keyword
// can control page behavior and must remain intact.
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
// Site-specific attribution names must not be removed from unrelated sites.
const COUPANG_TRACKING_PARAMETERS = new Set([
  "wpcid", "wref", "wtime", "af_c_id", "mcid", "src", "campaignid", "pid",
  "spec", "addtag", "network", "af_click_lookback", "lptag",
  "af_reengagement_window", "af_sub5", "ctag", "af_channel",
  "is_retargeting", "af_force_transparent",
  "searchid", "searchrank", "rank", "itemscount", "traceid",
]);
const SHOPEE_RESERVED_ROUTES = new Set([
  "search", "product", "shop", "cart", "checkout", "user", "buyer", "seller",
  "login", "signup", "flash_sale", "mall", "collections", "collection",
  "official_shops", "top_products", "daily_discover", "feed", "live", "video",
  "campaign", "events", "blog", "help", "universal-link",
]);

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

/** Pure, local-only cleaner. Only recognized Shopee product/category paths are shortened. */
export function cleanUrl(input) {
  if (typeof input !== "string" || !input || input !== input.trim()) {
    throw new TypeError("無法解析網址");
  }
  const parsed = new URL(input);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("此頁面無法讀取網址");
  }

  const result = { originalUrl: input, cleanedUrl: input, removedCount: 0, signed: false };
  // Use URLSearchParams to decode names, but retain original query bytes.
  // Serializing searchParams would change %20, +, ~, and other encodings.
  const hashIndex = input.indexOf("#");
  const queryEnd = hashIndex === -1 ? input.length : hashIndex;
  const queryIndex = input.indexOf("?");
  const hasQuery = queryIndex !== -1 && queryIndex < queryEnd;
  const parts = hasQuery ? input.slice(queryIndex + 1, queryEnd).split("&") : [];
  const entries = parts.map(raw => {
    const [name = "", value = ""] = [...new URLSearchParams(raw).entries()][0] ?? [];
    return { raw, name: name.toLowerCase(), value };
  });
  // Signed URLs may authenticate the entire query, including tracking fields.
  if (entries.some(({ name }) => SIGNATURE_PARAMETERS.has(name))) {
    return { ...result, signed: true };
  }
  const shopee = ["shopee.tw", "www.shopee.tw"].includes(parsed.hostname)
    && !parsed.username && !parsed.password && !parsed.port;
  const product = shopee && parsed.pathname.match(/^\/[^/]+-i\.([1-9]\d*)\.([1-9]\d*)\/?$/);
  const category = shopee && parsed.pathname.match(/^\/[^/]+-cat\.([1-9]\d*(?:\.[1-9]\d*){0,2})\/?$/);
  const shopeeProduct = product || (shopee && /^\/product\/[1-9]\d*\/[1-9]\d*\/?$/.test(parsed.pathname));
  const shopName = shopee && parsed.pathname.match(/^\/([a-z0-9_][a-z0-9_.]*)\/?$/i);
  const shop = shopName && !SHOPEE_RESERVED_ROUTES.has(shopName[1].toLowerCase());
  const shopByProduct = shop && entries.some(({ name, value }) => name === "entrypoint" && value === "ShopByPDP");
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
  const retained = entries.filter(({ name, value }) => {
    const tracking = name.startsWith("utm_") || TRACKING_PARAMETERS.has(name);
    // A plain product share intentionally omits the preselected display model.
    // Never drop the wrapper if it contains any additional, unknown fields.
    const selection = shopeeProduct && name === "extraparams" && isDisplayModelSelection(value);
    // Remove product-to-shop navigation context for a plain storefront share.
    const shopContext = shopByProduct && ((name === "entrypoint" && value === "ShopByPDP")
      || (["categoryid", "itemid"].includes(name) && /^\d+$/.test(value)));
    // Match only the demonstrated momo source formats, not arbitrary values
    // of generic names such as content or category filters.
    const momoSearchSource = (momoArea && name === "area" && ["search", "category", "home", "index"].includes(value.toLowerCase()))
      || (momoNavigation && ((name === "oid" && /^\d+_\d+$/.test(value)) || (name === "cid" && value === "index")))
      || (momoFromSearch && name === "kw");
    const momoSource = momoSearchSource || (momoCampaign && name === "mdiv") || (momoProduct && ((name === "osm" && /^Ad\d+$/i.test(value))
      || (name === "content" && /^personallist\d+$/i.test(value))
      || (name === "mdiv" && momoEntry(value)) || (["cc1", "ectagnos"].includes(name) && value === "")));
    // Share the parent product as explicitly requested, omitting numeric
    // variant/seller IDs. Unknown values and unrelated parameters remain.
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
  // The title slug is optional in Shopee's product route. Match only the
  // Taiwan storefront and complete numeric shop/item IDs; never decode paths
  // or coerce IDs to Number (large IDs must retain every digit).
  if (product) base = `${parsed.origin}/product/${product[1]}/${product[2]}`;
  else if (category) base = `${parsed.origin}/c-cat.${category[1]}`;
  else if (coupangProduct) base = `${parsed.origin}/products/${coupangProduct[1]}`;
  const querySuffix = result.removedCount
    ? (query ? `?${query}` : "")
    : (hasQuery ? input.slice(queryIndex, queryEnd) : "");
  result.cleanedUrl = base + querySuffix + input.slice(queryEnd);
  return result;
}
