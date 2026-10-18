// app.py의 검색을 브라우저에서 똑같이 흉내 낸다 (2글자 자르기 + BM25 + 최대 2건 · 2위는 1위의 60% 이상).
// 자료는 최종 저장소(CarlosQuperman/persona-ai)의 data.json을 그대로 불러온다.
window.TuringSearch = (function () {
  const DATA_URLS = [
    "https://raw.githubusercontent.com/CarlosQuperman/persona-ai/main/persona-core/data.json",
    "https://cdn.jsdelivr.net/gh/CarlosQuperman/persona-ai@main/persona-core/data.json",
  ];
  const TOP_K = 2, SECOND_DOC_RATIO = 0.6;
  const K1 = 1.5, B = 0.75, EPSILON = 0.25; // rank_bm25 BM25Okapi 기본값

  // app.py의 tokenize와 같다: 소문자 → 한글·영문·숫자 덩어리 → 2글자씩 (1글자는 그대로)
  function tokenize(text) {
    const words = String(text).toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
    const tokens = [];
    for (const w of words) {
      if (w.length === 1) tokens.push(w);
      else for (let i = 0; i < w.length - 1; i++) tokens.push(w.slice(i, i + 2));
    }
    return tokens;
  }

  let index = null;
  function build(docs) {
    const corpus = docs.map((d) => tokenize(`${d.id}. ${d.content}\n\n### 검색어\n\n${d.keywords.join(", ")}`));
    const N = corpus.length;
    const avgdl = corpus.reduce((s, c) => s + c.length, 0) / N;
    const tfs = corpus.map((c) => { const m = new Map(); c.forEach((t) => m.set(t, (m.get(t) || 0) + 1)); return m; });
    const df = new Map();
    tfs.forEach((m) => m.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
    const idf = new Map();
    let sum = 0;
    const negatives = [];
    df.forEach((n, t) => {
      const v = Math.log(N - n + 0.5) - Math.log(n + 0.5);
      idf.set(t, v);
      sum += v;
      if (v < 0) negatives.push(t);
    });
    const eps = EPSILON * (sum / idf.size);
    negatives.forEach((t) => idf.set(t, eps));
    index = { docs, corpus, tfs, idf, avgdl };
  }

  function scores(queryTokens) {
    const { corpus, tfs, idf, avgdl } = index;
    return corpus.map((c, i) => {
      let s = 0;
      for (const q of queryTokens) {
        const f = tfs[i].get(q) || 0;
        s += (idf.get(q) || 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * c.length) / avgdl)));
      }
      return s;
    });
  }

  function search(question, previous) {
    const query = `${question} ${question} ${previous || ""}`;
    const queryTokens = tokenize(query);
    const sc = scores(queryTokens);
    const ranked = sc.map((score, i) => ({ ...index.docs[i], score })).sort((a, b) => b.score - a.score).slice(0, TOP_K);
    const topScore = ranked.length ? ranked[0].score : 0;
    const chosen = [], rest = [];
    ranked.forEach((d) => (d.score > 0 && d.score >= topScore * SECOND_DOC_RATIO ? chosen : rest).push(d));
    return { queryTokens: [...new Set(tokenize(question))], chosen, dropped: rest.find((d) => d.score > 0) || null };
  }

  async function load() {
    let lastErr;
    for (const url of DATA_URLS) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const docs = data.documents || [];
        build(docs);
        return { docs, source: "최종 자료집 CarlosQuperman/persona-ai · persona-core/data.json" };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("불러오기 실패");
  }

  return { tokenize, search, load };
})();
