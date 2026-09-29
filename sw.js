/* חי שיווק – service worker
   data.json ו-version.json תמיד מהרשת (אף פעם לא מהמטמון),
   index.html מהרשת עם גיבוי מהמטמון, תמונות מהמטמון כדי שייטענו מהר. */
const SHELL = "chai-shell-v1";
const MEDIA = "chai-media-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL).then(c => c.addAll(["./", "./index.html", "./manifest.json"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => { if(e.data === "skip-waiting") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  /* נתונים חיים – אף פעם לא מהמטמון */
  if(/\/(data|version)\.json$/.test(url.pathname) || url.hostname.includes("api.github.com")) return;

  /* תמונות ואייקונים – מהמטמון קודם */
  if(/\.(jpg|jpeg|png|webp|svg|ico)$/i.test(url.pathname)){
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if(res && res.ok){ const c = res.clone(); caches.open(MEDIA).then(x => x.put(req, c)); }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  /* הדף עצמו – רשת קודם, מטמון כגיבוי כשאין אינטרנט */
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){ const c = res.clone(); caches.open(SHELL).then(x => x.put(req, c)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
