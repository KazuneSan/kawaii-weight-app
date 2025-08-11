// かわいい減量ダッシュボード - Service Worker
const CACHE_NAME = 'kawaii-weight-app-v1.0.0';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './manifest.json',
    './motivation.json',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png'
];

// Service Worker のインストール
self.addEventListener('install', (event) => {
    console.log('Service Worker: インストール中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: ファイルをキャッシュ中...');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: キャッシュエラー', error);
            })
    );
    
    // 新しいService Workerを即座にアクティブ化
    self.skipWaiting();
});

// Service Worker のアクティベーション
self.addEventListener('activate', (event) => {
    console.log('Service Worker: アクティベーション中...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 古いキャッシュを削除
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 古いキャッシュを削除:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // 新しいService Workerがすべてのページを制御
    self.clients.claim();
});

// ネットワークリクエストのインターセプト
self.addEventListener('fetch', (event) => {
    // GETリクエストのみ処理
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Chrome拡張機能のリクエストは無視
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    // データベースリクエストは無視
    if (event.request.url.includes('indexeddb')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュにある場合はそれを返す
                if (response) {
                    return response;
                }
                
                // キャッシュになければネットワークからフェッチ
                return fetch(event.request).then((response) => {
                    // レスポンスが無効な場合はそのまま返す
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // レスポンスをクローン（ストリームは一度しか消費できないため）
                    const responseToCache = response.clone();
                    
                    // 新しいリソースをキャッシュに追加
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch((error) => {
                console.error('Service Worker: フェッチエラー', error);
                
                // オフライン時のフォールバック
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                
                // その他のリソースの場合は基本的なオフラインページ
                return new Response('オフラインです。インターネット接続を確認してください。', {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            })
    );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
    console.log('Service Worker: バックグラウンド同期:', event.tag);
    
    if (event.tag === 'weight-sync') {
        event.waitUntil(syncWeightData());
    }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
    console.log('Service Worker: プッシュ通知受信');
    
    const options = {
        body: event.data ? event.data.text() : '体重記録を忘れずに！',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'record',
                title: '記録する',
                icon: './icons/icon-72.png'
            },
            {
                action: 'close',
                title: '閉じる'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('かわいい減量ダッシュボード', options)
    );
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: 通知クリック:', event.action);
    
    event.notification.close();
    
    if (event.action === 'record') {
        // アプリを開いて記録画面へ
        event.waitUntil(
            clients.openWindow('./#record')
        );
    } else if (event.action === 'close') {
        // 何もしない
    } else {
        // デフォルトアクション：アプリを開く
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// バックグラウンド同期用の関数
async function syncWeightData() {
    try {
        console.log('Service Worker: データ同期開始');
        // ここで将来的にサーバーとの同期処理を実装
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: データ同期エラー', error);
        return Promise.reject(error);
    }
}

// アプリの更新チェック
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 定期的なバックアップ（将来の拡張用）
self.addEventListener('backgroundfetch', (event) => {
    console.log('Service Worker: バックグラウンドフェッチ:', event.tag);
});

// オフライン状態の検出
self.addEventListener('online', () => {
    console.log('Service Worker: オンラインになりました');
});

self.addEventListener('offline', () => {
    console.log('Service Worker: オフラインになりました');
});