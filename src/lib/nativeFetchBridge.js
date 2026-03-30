import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getApiBaseCandidates, setResolvedApiBase } from './apiBase.js';

const isNative = Capacitor.isNativePlatform();

const toHeadersObject = (headersInit) => {
  if (!headersInit) return {};
  if (headersInit instanceof Headers) {
    return Object.fromEntries(headersInit.entries());
  }
  if (Array.isArray(headersInit)) {
    return Object.fromEntries(headersInit);
  }
  return { ...headersInit };
};

const parseRequestBody = (body, headers) => {
  if (body == null) return undefined;
  if (typeof body !== 'string') return body;
  const contentType = String(headers?.['Content-Type'] || headers?.['content-type'] || '');
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
};

const createHeadersApi = (headersObj) => ({
  get(name) {
    if (!name) return null;
    const key = Object.keys(headersObj).find((k) => k.toLowerCase() === String(name).toLowerCase());
    return key ? headersObj[key] : null;
  }
});

const createFetchLikeResponse = (result, url) => {
  const status = Number(result?.status || 0);
  const headers = result?.headers || {};
  const data = result?.data;
  const textBody = typeof data === 'string' ? data : JSON.stringify(data ?? {});

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: result?.statusText || '',
    url,
    headers: createHeadersApi(headers),
    async json() {
      if (typeof data === 'string') return JSON.parse(data);
      return data;
    },
    async text() {
      return textBody;
    }
  };
};

if (isNative && !window.__nativeFetchBridgeInstalled) {
  const originalFetch = window.fetch.bind(window);
  const normalizeUrl = (url) => String(url || '').replace(/\/+$/, '');

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const shouldBridge = typeof requestUrl === 'string' && /^https?:\/\//i.test(requestUrl);

    if (!shouldBridge) {
      return originalFetch(input, init);
    }

    const method = String(init?.method || 'GET').toUpperCase();
    const headers = toHeadersObject(init?.headers);
    const data = parseRequestBody(init?.body, headers);
    const candidates = getApiBaseCandidates();
    const parsed = (() => {
      try {
        return new URL(requestUrl);
      } catch {
        return null;
      }
    })();
    const requestPath = parsed ? `${parsed.pathname}${parsed.search}` : '';
    const baseFromRequest = parsed ? `${parsed.protocol}//${parsed.host}` : '';
    const baseOrder = [...new Set([baseFromRequest, ...candidates].filter(Boolean).map(normalizeUrl))];
    let lastError = null;

    for (const base of baseOrder) {
      const candidateUrl = requestPath ? `${base}${requestPath}` : requestUrl;
      try {
        const result = await CapacitorHttp.request({
          url: candidateUrl,
          method,
          headers,
          data,
          connectTimeout: 10000,
          readTimeout: 10000
        });
        if (result?.status > 0) {
          setResolvedApiBase(base);
        }
        return createFetchLikeResponse(result, candidateUrl);
      } catch (error) {
        lastError = error;
      }
    }

    throw new TypeError(lastError?.message || 'Failed to fetch');
  };

  window.__nativeFetchBridgeInstalled = true;
}
