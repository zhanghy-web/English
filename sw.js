/* 高中英语学习工具 - 离线缓存 Service Worker
   策略：network-first —— 联网时优先拿最新文件（更新 index.html 即生效），断网时回退缓存 */
var CACHE = 'eng-tool-v3';
var FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (resp) {
      // 成功拿到网络响应就顺手刷新缓存（同源才存，避免缓存跨域内容）
      if (resp && resp.ok && new URL(e.request.url).origin === location.origin) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return resp;
    }).catch(function () {
      // 断网：先找精确匹配，找不到就回退首页（离线也能打开）
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
