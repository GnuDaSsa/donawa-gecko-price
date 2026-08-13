const PHONE_PATTERN = /(?:01\d|02|0\d{2}|050\d)[-\s.)]?\d{3,4}[-\s.]?\d{4}/;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
const URL_PATTERN = /https?:\/\//i;

const SENSITIVE_LINE_PATTERN =
  /(연락처|전화번호|오픈카톡|카카오톡|카톡|계좌|택배|고속버스|퀵|주소|지역\s*:|직거래|더치트|사이버캅|외부사이트|환불규정|입양처\s*:|판매자\s*:|작성자\s*:)/i;

const TEMPLATE_LINE_PATTERN =
  /^\*|^\d+\.\s*(?:종류|크기|사이테스|백색목록|연락처|폐사|지역|상세설명|실개체 사진)/;

const STANDARD_NOTICE_PATTERN =
  /^(?:가급적 모든 내용을 다 작성|활동이 두절됐던 회원|거래 전 꼭|최성.*계좌 거래 금지)/;

const ANIMAL_KEYWORD_PATTERN =
  /(크레|게코|릴리|아잔틱|아잔|카푸|프라푸|세이블|트익|익할|트라이|노멀|노말|차콜|달마|슈달|할리|크림시클|팬텀|핀스트라이프|엠티백|레드바이|레드|텐저린|쿼드|모자이크|드리피|화이트스팟|패턴리스|헷|SPT|PST)/i;

function normalizeLine(value) {
  return String(value ?? "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSensitiveLine(line) {
  return PHONE_PATTERN.test(line) ||
    EMAIL_PATTERN.test(line) ||
    URL_PATTERN.test(line) ||
    SENSITIVE_LINE_PATTERN.test(line);
}

export function sanitizePasamoParagraphs(paragraphs) {
  return paragraphs
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !isSensitiveLine(line))
    .filter((line) => !STANDARD_NOTICE_PATTERN.test(line))
    .filter((line) => {
      if (!TEMPLATE_LINE_PATTERN.test(line)) return true;
      return /분양가/.test(line) && /:\s*(?!$|각각|개별|기재)/.test(line);
    })
    .slice(0, 400);
}

function asciiHash(value) {
  let hash = 2166136261;
  for (const character of value.normalize("NFKC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function markerFromLine(line) {
  if (/^\d+\.\s*(?:종류|크기|성별|사이테스|백색목록|분양가|연락처|폐사|지역|상세설명|실개체)/.test(line)) {
    return undefined;
  }
  let match = line.match(/^No\.\s*([A-Za-z0-9-]+)/i);
  if (match) {
    return {
      fragment: `no-${match[1].toLowerCase()}`,
      descriptor: line,
    };
  }

  match = line.match(/^([암수])[-_](\d+)\.\s*/);
  if (match) {
    return {
      fragment: `${match[1] === "암" ? "female" : "male"}-${match[2]}`,
      descriptor: `${match[1] === "암" ? "암컷" : "수컷"} ${line.slice(match[0].length)}`,
    };
  }

  match = line.match(/^([가-힣A-Za-z]+)-(\d+)\.\s*/);
  if (match) {
    return {
      fragment: `group-${asciiHash(match[1])}-${match[2]}`,
      descriptor: line.slice(match[0].length),
    };
  }

  match = line.match(/^\(\s*(\d+)\s*\)\s*/);
  if (match) {
    return { fragment: `item-${match[1]}`, descriptor: line.slice(match[0].length) };
  }

  match = line.match(/^(\d+)\s*번(?:\s+|$)/);
  if (match) {
    return { fragment: `item-${match[1]}`, descriptor: line.slice(match[0].length) };
  }

  match = line.match(/^(\d+)\.\s*(?!\d|종류|크기|성별|사이테스|백색목록|분양가|연락처|폐사|지역|상세설명|실개체)/);
  if (match) {
    return { fragment: `item-${match[1]}`, descriptor: line.slice(match[0].length) };
  }

  return undefined;
}

function parsePrice(text, { allowUnitlessLabel = true } = {}) {
  text = text.replace(/마넌/g, "만원");
  const wonMatch = text.match(/(?<!\d)(\d{1,3}(?:[,.]\d{3})+)\s*원/);
  if (wonMatch) {
    return {
      kind: "FIXED",
      price: Number(wonMatch[1].replace(/[,.]/g, "")),
      inferredUnit: false,
    };
  }

  const manMatch = text.match(/(?<![\d.])(\d+(?:\.\d+)?)\s*만(?:원)?/);
  if (manMatch) {
    return {
      kind: "FIXED",
      price: Math.round(Number(manMatch[1]) * 10_000),
      inferredUnit: false,
    };
  }

  if (/(?:분양가[^:：]*[:：]\s*만원|(?:^|\s)만원\s*분양)/.test(text)) {
    return { kind: "FIXED", price: 10_000, inferredUnit: false };
  }

  if (allowUnitlessLabel) {
    const unitless = text.match(/(?:개별)?분양가\s*[:：]?\s*(\d{1,3})(?![\d.])\s*(?:$|-|예약)/);
    if (unitless) {
      return {
        kind: "FIXED",
        price: Number(unitless[1]) * 10_000,
        inferredUnit: true,
      };
    }
  }

  if (/무료\s*분양|무료분양|무분/.test(text)) {
    return { kind: "FREE" };
  }
  if (/가격\s*문의|분양가\s*문의/.test(text)) {
    return { kind: "CONTACT" };
  }

  return undefined;
}

function parseBundlePrice(text) {
  const after = text.match(/일괄(?:\s*분양)?(?:로)?\s*(\d+(?:\.\d+)?)\s*(만(?:원)?|원)?/);
  if (after) {
    const numeric = Number(after[1]);
    const unit = after[2] ?? "만";
    return {
      price: unit.startsWith("만") ? Math.round(numeric * 10_000) : Math.round(numeric),
      inferredUnit: !after[2],
    };
  }

  const before = text.match(/(\d+(?:\.\d+)?)\s*만(?:원)?\s*일괄(?:\s*분양)?/);
  if (before) {
    return { price: Math.round(Number(before[1]) * 10_000), inferredUnit: false };
  }

  return undefined;
}

function parseSex(text) {
  if (/미구분|성별\s*미상/.test(text)) return "UNKNOWN";
  if (/(?:암컷|암성체|암준성체|암아성체|암추|\(암\)|(?:^|\s)암(?:\s|$))/.test(text)) return "FEMALE";
  if (/(?:수컷|숫컷|수성체|숫성체|수준성체|숫준성체|수추|숫추|\(수\)|\(숫\)|(?:^|\s)(?:수|숫)(?:\s|$))/.test(text)) return "MALE";
  return "UNKNOWN";
}

function parseWeight(text) {
  const match = text.match(/(?<!\d)(\d+(?:\.\d+)?)\s*(?:g|그램)(?![가-힣A-Za-z])/i);
  if (!match) return undefined;
  const weight = Number(match[1]);
  return Number.isFinite(weight) && weight > 0 && weight < 200 ? weight : undefined;
}

function classifyMorph(text) {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  const nonLilly = /논릴리|nonlilly/.test(normalized);
  const hetLilly = /헷(?:100)?릴리|100헷릴리/.test(normalized);
  const hetAxanthic = /헷(?:100)?아잔틱|100헷아잔틱/.test(normalized);

  if (/릴잔틱|릴잔|릴리잔틱|lillyaxanthic/.test(normalized)) return "릴잔틱";
  if (/프라푸치노|프라푸|frappuccino/.test(normalized)) return "프라푸치노";
  if (!nonLilly && !hetLilly && /릴리/.test(normalized) && /카푸치노|카푸/.test(normalized)) {
    return "프라푸치노";
  }
  if (!nonLilly && !hetLilly && /릴리화이트|릴리/.test(normalized)) return "릴리화이트";
  if (!hetAxanthic && /아잔틱|아잔|axanthic/.test(normalized)) return "아잔틱";
  if (/카푸치노|카푸|cappuccino/.test(normalized)) return "카푸치노";
  if (/세이블|sable/.test(normalized)) return "세이블";
  if (/슈퍼달마|슈달|달마시안|dalmatian/.test(normalized)) return "달마시안";
  if (/트익할|익스트림할리퀸|익할|트라이|할리퀸|harlequin/.test(normalized)) return "할리퀸";
  if (/핀스트라이프|pinstripe/.test(normalized)) return "핀스트라이프";
  if (/팬텀|phantom/.test(normalized)) return "팬텀";
  if (/소프트스케일|softscale/.test(normalized)) return "소프트스케일";
  if (/플레임|flame/.test(normalized)) return "플레임";
  return undefined;
}

function hasAmbiguousArticleLevelMorphs(text) {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  const groups = [
    /릴리화이트|릴리|릴잔틱|릴잔/,
    /아잔틱|아잔|axanthic/,
    /카푸치노|카푸|cappuccino/,
    /프라푸치노|프라푸|frappuccino/,
    /세이블|sable/,
    /슈퍼달마|슈달|달마시안|dalmatian/,
    /트익할|익할|트라이|할리퀸|harlequin/,
    /핀스트라이프|pinstripe/,
    /팬텀|phantom/,
  ].filter((pattern) => pattern.test(normalized));
  return groups.length >= 2;
}

function classifyTraits(text) {
  const traits = [];
  if (/풀\s*핀|풀핀/i.test(text)) traits.push("풀핀");
  if (/트라이|트익할/i.test(text)) traits.push("트라이컬러");
  if (/익스트림|트익할|익할/i.test(text)) traits.push("익스트림");
  if (/슈퍼\s*달마|슈달/i.test(text)) traits.push("슈퍼달마");
  if (/화이트\s*월/i.test(text)) traits.push("화이트월");
  if (/솔리드\s*백/i.test(text)) traits.push("솔리드백");
  if (/레드/i.test(text)) traits.push("레드");
  if (/쿼드/i.test(text)) traits.push("쿼드스트라이프");
  return [...new Set(traits)];
}

function coreDescriptor(lines, markerDescriptor) {
  const useful = [markerDescriptor, ...lines]
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !/^(?:\d+\.\s*)?(?:분양가|가격|생일|생년월일|부모|부\s|모\s|입양처|비고|점유무)/.test(line))
    .filter((line) => !/^(?:사진|논파업|파업|건강|감사|추천|문의)/.test(line));
  return useful.slice(0, 2).join(" ").slice(0, 160);
}

function candidateTitle(descriptor, fallbackTitle) {
  const cleaned = normalizeLine(descriptor)
    .replace(/(?:개별)?분양가\s*[:：]?\s*\d+(?:[.,]\d+)?\s*(?:만(?:원)?|원)?/g, "")
    .replace(/(?<!\d)\d+(?:[.,]\d+)?\s*만(?:원)?/g, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || fallbackTitle).slice(0, 120);
}

function standaloneOffer(line) {
  if (/^\[.*\]$/.test(line)) return false;
  const price = parsePrice(line, { allowUnitlessLabel: false });
  return Boolean(price && ANIMAL_KEYWORD_PATTERN.test(line) && !/^분양가/.test(line));
}

function statusForBlock(markerDescriptor, lines) {
  const statusWindow = [markerDescriptor, ...lines.slice(0, 8)].filter(Boolean).join(" ");
  if (/분양\s*완료|판매\s*완료|거래\s*완료/.test(statusWindow)) {
    return { status: "SOLD", evidence: "EXPLICIT_ITEM_SOLD" };
  }
  if (/예약\s*(?:중|완료)?/.test(statusWindow)) {
    return { status: "UNKNOWN", evidence: "EXPLICIT_RESERVATION" };
  }
  return { status: "ACTIVE", evidence: "VISIBLE_OFFER_NO_COMPLETION" };
}

function canonicalArticleUrl(url, articleId) {
  const parsed = new URL(url);
  if (parsed.hostname !== "cafe.naver.com") throw new Error("Pasamo URL host must be cafe.naver.com");
  return `https://cafe.naver.com/f-e/cafes/12440585/articles/${articleId}`;
}

function finalizeBlock(block, article, ordinal) {
  const blockText = [block.markerDescriptor, ...block.lines].filter(Boolean).join(" ");
  const price = [block.markerDescriptor, ...block.lines]
    .map((line) => parsePrice(line))
    .find(Boolean) ?? parsePrice(blockText);
  const status = statusForBlock(block.markerDescriptor, block.lines);
  const descriptor = coreDescriptor(block.lines, block.markerDescriptor);
  const morph = classifyMorph(descriptor);
  const fragment = block.fragment || `offer-${asciiHash(descriptor.replace(/\d+(?:[.,]\d+)?\s*(?:만(?:원)?|원)/g, ""))}-${ordinal}`;
  const base = canonicalArticleUrl(article.url, article.articleId);

  if (!price) {
    return {
      bucket: "review",
      reason: "ITEM_PRICE_NOT_EXPLICIT",
      row: {
        platform: "파사모",
        title: candidateTitle(descriptor, article.title),
        url: `${base}#${fragment}`,
        price: "",
        price_type: "UNKNOWN",
        status: status.status,
        morph: morph ?? "",
        traits: classifyTraits(descriptor).join("|"),
        sex: parseSex(descriptor),
        weight_g: parseWeight(descriptor) ?? "",
        image_url: "",
        classification_mode: morph ? "EXPLICIT" : "UNCLASSIFIED",
        status_evidence: status.evidence,
      },
    };
  }

  if (price.kind === "FREE") {
    return { bucket: "excluded", reason: "FREE_OFFER_OUTSIDE_PRICE_COMPARISON" };
  }

  if (price.kind === "CONTACT") {
    return {
      bucket: "review",
      reason: "CONTACT_ONLY",
      row: {
        platform: "파사모",
        title: candidateTitle(descriptor, article.title),
        url: `${base}#${fragment}`,
        price: "",
        price_type: "CONTACT",
        status: status.status,
        morph: morph ?? "",
        traits: classifyTraits(descriptor).join("|"),
        sex: parseSex(descriptor),
        weight_g: parseWeight(descriptor) ?? "",
        image_url: "",
        classification_mode: morph ? "EXPLICIT" : "UNCLASSIFIED",
        status_evidence: status.evidence,
      },
    };
  }

  const row = {
    platform: "파사모",
    title: candidateTitle(descriptor, article.title),
    url: `${base}#${fragment}`,
    price: price.price,
    price_type: "FIXED",
    status: status.status,
    morph: morph ?? "",
    traits: classifyTraits(descriptor).join("|"),
    sex: parseSex(descriptor),
    weight_g: parseWeight(descriptor) ?? "",
    image_url: "",
    classification_mode: morph ? "EXPLICIT" : "UNCLASSIFIED",
    status_evidence: status.evidence,
  };

  if (price.inferredUnit) {
    return { bucket: "review", reason: "PRICE_UNIT_INFERRED", row };
  }
  if (status.status !== "ACTIVE") {
    return { bucket: "review", reason: `NON_ACTIVE_${status.status}`, row };
  }
  return { bucket: "ready", reason: "EXPLICIT_ITEM_FIXED_PRICE", row };
}

export function parsePasamoArticle(article) {
  if (!/^\d+$/.test(String(article.articleId))) throw new Error("articleId must be numeric");
  const lines = sanitizePasamoParagraphs(article.paragraphs ?? []);
  const blocks = [];
  let current;

  const closeCurrent = () => {
    if (current) blocks.push(current);
    current = undefined;
  };

  for (const line of lines) {
    const marker = markerFromLine(line);
    if (marker) {
      closeCurrent();
      current = { fragment: marker.fragment, markerDescriptor: marker.descriptor, lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
      continue;
    }

    if (standaloneOffer(line)) {
      blocks.push({ markerDescriptor: line, lines: [] });
    }
  }
  closeCurrent();

  const ready = [];
  const review = [];
  const excluded = [];
  const usedUrls = new Set();

  blocks.forEach((block, index) => {
    const result = finalizeBlock(block, article, index + 1);
    if (result.bucket === "excluded") {
      excluded.push({ reason: result.reason });
      return;
    }
    if (usedUrls.has(result.row.url)) {
      result.row.url = `${result.row.url}-${index + 1}`;
    }
    usedUrls.add(result.row.url);
    if (result.bucket === "ready") ready.push({ ...result.row, review_reason: result.reason });
    else review.push({ ...result.row, review_reason: result.reason });
  });

  if (blocks.length === 0) {
    const safeText = [article.title, ...lines].join(" ");
    const bundle = parseBundlePrice(safeText);
    const base = canonicalArticleUrl(article.url, article.articleId);
    if (bundle) {
      review.push({
        platform: "파사모",
        title: article.title.slice(0, 120),
        url: `${base}#bundle`,
        price: bundle.price,
        price_type: "BUNDLE",
        status: "ACTIVE",
        morph: "",
        traits: "",
        sex: "UNKNOWN",
        weight_g: "",
        image_url: "",
        classification_mode: "UNCLASSIFIED",
        status_evidence: "VISIBLE_OFFER_NO_COMPLETION",
        review_reason: bundle.inferredUnit ? "BUNDLE_PRICE_UNIT_INFERRED" : "ARTICLE_BUNDLE_ONLY",
      });
    } else if (parsePrice(safeText)) {
      const single = finalizeBlock({
        fragment: "item-1",
        markerDescriptor: article.title,
        lines,
      }, article, 1);
      if (single.bucket === "ready" && hasAmbiguousArticleLevelMorphs(article.title)) {
        review.push({ ...single.row, review_reason: "AMBIGUOUS_ARTICLE_LEVEL_PRICE" });
      } else if (single.bucket === "ready") ready.push({ ...single.row, review_reason: single.reason });
      else if (single.bucket === "review") review.push({ ...single.row, review_reason: single.reason });
      else excluded.push({ reason: single.reason });
    } else {
      review.push({
        platform: "파사모",
        title: article.title.slice(0, 120),
        url: `${base}#article-offer`,
        price: "",
        price_type: "UNKNOWN",
        status: "ACTIVE",
        morph: "",
        traits: "",
        sex: parseSex(safeText),
        weight_g: parseWeight(safeText) ?? "",
        image_url: "",
        classification_mode: "UNCLASSIFIED",
        status_evidence: "VISIBLE_OFFER_NO_COMPLETION",
        review_reason: "NO_EXPLICIT_ITEM_PRICE",
      });
    }
  }

  return {
    articleId: String(article.articleId),
    title: article.title,
    ready,
    review,
    excluded,
    safeLineCount: lines.length,
  };
}

const CSV_HEADERS = [
  "platform",
  "title",
  "url",
  "price",
  "price_type",
  "status",
  "morph",
  "traits",
  "sex",
  "weight_g",
  "image_url",
  "classification_mode",
  "status_evidence",
  "review_reason",
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toPasamoCsv(rows) {
  return [
    CSV_HEADERS.join(","),
    ...rows.map((row) => CSV_HEADERS.map((header) => csvCell(row[header])).join(",")),
  ].join("\n") + "\n";
}
