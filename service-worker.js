/* eslint-disable no-restricted-globals */

const cacheName = 'hmtWatch'
const initFilesToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/site.webmanifest',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/script.js',
]

const isLocal = () => false // ['localhost', '127.0.0.1'].includes(self.location.hostname)

const offlineResponse = () =>
  new Response(
    '<html><head><title>Offline</title></head><body><h1>Unable to Connect. You may be Offline!</h1></body></html>',
    {
      headers: { 'Content-Type': 'text/html' },
    }
  )

function swFetch(request, { timeout, cacheBox }) {
  let isOver = false
  // Premptive cache Fetch
  const fetchRequest = fetch(request)
  const cacheFetch = caches.match(request)
  const cacheBoxGet = caches.open(cacheBox)
  const cacheBoxPut = (response) =>
    cacheBoxGet.then((cB) => cB.put(request, response))
  return new Promise((resolve, reject) => {
    // Ticker
    const tickerCb = () => {
      cacheFetch.then((response) => {
        if (!isOver && response) {
          isOver = true
          resolve(response)
        }
      })
    }
    const ticker = setTimeout(tickerCb, timeout)
    //
    const fetchSuccess = (response) => {
      cacheBoxPut(response.clone())
      if (isOver) {
        return
      }
      isOver = true
      resolve(response)
    }
    //
    const fetchFailure = (err) => {
      cacheFetch.then((response) => {
        if (isOver) {
          return
        }
        isOver = true
        if (response) {
          resolve(response)
        } else {
          reject(err)
        }
      })
    }
    //
    fetchRequest
      .then(fetchSuccess)
      .catch(fetchFailure)
      .finally(() => {
        clearTimeout(ticker)
      })
  })
}

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(initFilesToCache))
  )
})

self.addEventListener('activate', (e) => {
  const isLocalValue = isLocal()
  const keyMap = (key) =>
    isLocalValue || !key.startsWith(cacheName) ? caches.delete(key) : null
  e.waitUntil(
    caches
      .keys()
      .then((keyList) => keyList.map(keyMap))
      .then((keyPromises) => Promise.all(keyPromises))
  )
  e.waitUntil(
    self.registration.showNotification('HMT Watch', {
      body: 'WOW!',
    })
  )
  return self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const {
    request,
    request: { url: requestUrl, method: requestMethod },
  } = e
  const {
    protocol: requestProtocol,
    origin: requestOrigin,
    pathname: requestPathname,
  } = new URL(requestUrl)

  if (
    isLocal() ||
    !['http:', 'https:'].includes(requestProtocol) ||
    requestMethod !== 'GET' ||
    requestOrigin !== self.location.origin
  ) {
    return
  }

  let cacheBox = cacheName
  const isCacheUrl = initFilesToCache.some((fileToCache) => {
    return requestPathname === fileToCache
  })

  if (!isCacheUrl) {
    return
  }

  e.respondWith(
    swFetch(request, { timeout: 3000, cacheBox }).catch(offlineResponse)
  )
})
