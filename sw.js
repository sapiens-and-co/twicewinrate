/* ポーカー トゥワイス勝率 - オフライン用。build.py が自動生成する。直接編集しないこと */
const VERSION = "f3352ffc53";
const CORE    = "twice-core-" + VERSION;
const FONTS   = "twice-fonts-v1";
const ASSETS  = ["./", "./index.html", "./manifest.json",
                 "./favicon-64.png", "./apple-touch-icon.png",
                 "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CORE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* ページ本体は「まずネット、駄目ならキャッシュ」。オンラインなら常に最新が出る */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CORE).then(c => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  /* Google Fonts は CORS で取り直してから保存する（no-cors のままだと保存できない） */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(url.href, { mode: "cors" }).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(FONTS).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req)))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* 自分のところのアイコンなどは「まずキャッシュ」 */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CORE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
