// 分别统计各种文件用到了哪些域名，分别请求了多少次，总大小，总时间

const puppeteer = require('puppeteer');
const fs = require('fs');

// 新增URL标准化函数
function normalizeURL(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return url.split(/[?#]/)[0].toLowerCase();
  }
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzePage(url) {
  console.log('🚀 启动浏览器...');

  const browser = await puppeteer.launch({
    devtools: true,
    headless: false, // 启用有界面模式
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 } // 设置默认视口尺寸
  });

  const page = await browser.newPage();
  const resources = [];

  // 启用CDP客户端
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true }); // CDP级别禁用缓存

  // 存储网络请求数据
  const networkData = new Map();

  // CDP 监听
  client.on('Network.loadingFinished', (event) => {
    networkData.set(event.requestId, {
      encodedSize: event.encodedDataLength,
      rawSize: event.dataLength
    });
  });

  page.on('response', async (response) => {
    try {
      const req = response.request();
      const buffer = await response.buffer().catch(() => Buffer.alloc(0));
      const requestId = req._requestId;

      // 获取 encodedSize，使用多重回退
      const encodedSize = (
        networkData.get(requestId)?.encodedSize ||
        parseInt(response.headers()['content-length'] || '0', 10) ||
        buffer.byteLength ||
        0
      );

      resources.push({
        url: req.url(),
        type: req.resourceType(),
        size: buffer.byteLength,
        originalSize: encodedSize,
        status: response.status(),
        headers: response.headers(),
        fromCache: response.fromCache(),
        initiator: req.initiator() || {},
        redirectChain: req.redirectChain().map(r => r.url()),
        isNavigation: req.isNavigationRequest(),
        valid: response.ok() && buffer.byteLength > 0
      });
    } catch (err) {
      console.error('⚠️ 资源收集错误:', err.message);
    }
  });

  // 增强页面加载策略
  console.log(`🌐 正在访问: ${url}`);
  await Promise.all([
    page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 120000
    }).then(() => console.log('🌐 页面导航完成')),
    page.waitForNetworkIdle({
      idleTime: 5000,
      timeout: 120000
    }).then(() => console.log('🌐 网络空闲'))
  ]);

  // 捕获动态加载资源
  await page.evaluate(() => {
    new MutationObserver(() => {}).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📊 分析资源...');
  const result = {
    timestamp: new Date().toISOString(),
    analyzedUrl: url,
    totalRequests: resources.length,

    css: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    js: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    images: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    fonts: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    other: { count: 0, size: 0, originalSize: 0, domainStats: {} }
  };

  // 增强资源识别规则
  const isCSSResource = (res) => {
    if (!res.valid || res.headers['content-type']?.includes('font') || res.type !== "stylesheet") return false;
    const ct = (res.headers['content-type'] || '').toLowerCase();
    return [
      res.type === 'stylesheet',
      /\.(css|less|scss|sass|styl)(\?|$)/i.test(res.url),
      ct.includes('text/css'),
      ct.includes('stylesheet')
    ].some(Boolean);
  };

  const isJSResource = (res) => {
    if (!res.valid) return false;
    const ct = (res.headers['content-type'] || '').toLowerCase();
    const JS_MIME_TYPES = [
      'application/javascript',
      'text/javascript',
      'application/x-javascript',
      'module'
    ];
    return [
      res.type === 'script',
      /\.(js|mjs|cjs|jsonp)($|\?)/i.test(res.url),
      JS_MIME_TYPES.some(t => ct.includes(t)),
      res.url.includes('callback=') && ct.includes('application/json')
    ].some(Boolean);
  };

  const isImageResource = (res) => {
    if (!res.valid) return false;
    const ct = (res.headers['content-type'] || '').toLowerCase();
    const IMAGE_MIME_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    return [
      res.type === 'image',
      IMAGE_MIME_TYPES.some(t => ct.includes(t)),
      /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff)(\?|$)/i.test(res.url)
    ].some(Boolean);
  };

  const isFontResource = (res) => {
    if (!res.valid) return false;
    const ct = (res.headers['content-type'] || '').toLowerCase();
    const FONT_MIME_TYPES = [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/font-ttf',
      'application/font-otf',
      'application/font-woff',
      'application/font-woff2',
      'application/vnd.ms-fontobject',
      'application/x-font-ttf',
      'application/x-font-otf',
      'application/x-font-woff',
      'application/x-font-woff2'
    ];
    return [
      res.type === 'font',
      FONT_MIME_TYPES.some(t => ct.includes(t)),
      /\.(woff|woff2|ttf|otf|eot)(\?|$)/i.test(res.url)
    ].some(Boolean);
  };

  // 使用增强版统计逻辑
  const cssTracker = new Map();
  const jsTracker = new Map();
  const imageTracker = new Map();
  const fontTracker = new Map();

  resources.forEach(res => {
    // CSS处理
    if (isCSSResource(res)) {
      const initiatorKey = [
        res.type,
        res.initiator.type,
        res.initiator.url || '',
        res.initiator.stack?.callFrames[0]?.url || ''
      ].join('|');

      const uniqueKey = `${normalizeURL(res.url)}__${initiatorKey}`;
 console.log('CSS Unique Key:', uniqueKey); // 打印 uniqueKey
      if (!cssTracker.has(uniqueKey)) {
        cssTracker.set(uniqueKey, true);
        result.css.urls.push({
          url: res.url,
          normalized: normalizeURL(res.url),
          initiator: res.initiator,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
        result.css.count++;
      }

      result.css.size += res.size;
      result.css.originalSize += res.originalSize;

      // 👇 域名统计：CSS
      try {
        const domain = new URL(res.url).hostname;
        if (!result.css.domainStats[domain]) {
          result.css.domainStats[domain] = {
            count: 0,
            size: 0,
            time: 0,
            requests: []
          };
        }

        result.css.domainStats[domain].count++;
        result.css.domainStats[domain].size += res.size;
        result.css.domainStats[domain].time += res.originalSize;

        result.css.domainStats[domain].requests.push({
          url: res.url,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
      } catch (e) {
        console.warn('⚠️ 无法解析 CSS 资源域名:', res.url);
      }
    }

    // JS处理
    else if (isJSResource(res)) {
      const initiatorKey = [
        res.initiator.type,
        res.initiator.url || '',
        res.initiator.stack?.callFrames[0]?.url || ''
      ].join('|');

      const uniqueKey = [
        normalizeURL(res.url),
        res.initiator.type || '',
        res.initiator.url || '',
        (res.initiator.stack?.callFrames[0]?.url || '').toLowerCase(),
        res.redirectChain.join('|')
      ].join('__');

      if (!jsTracker.has(uniqueKey)) {
        jsTracker.set(uniqueKey, true);
        result.js.urls.push({
          url: res.url,
          normalized: normalizeURL(res.url),
          initiator: res.initiator,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
        result.js.count++;
      }
      result.js.size += res.size;
      result.js.originalSize += res.originalSize;

      // 👇 域名统计：JS
      try {
        const domain = new URL(res.url).hostname;
        if (!result.js.domainStats[domain]) {
          result.js.domainStats[domain] = {
            count: 0,
            size: 0,
            time: 0,
            requests: []
          };
        }

        result.js.domainStats[domain].count++;
        result.js.domainStats[domain].size += res.size;
        result.js.domainStats[domain].time += res.originalSize;

        result.js.domainStats[domain].requests.push({
          url: res.url,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
      } catch (e) {
        console.warn('⚠️ 无法解析 JS 资源域名:', res.url);
      }
    }

    // 图片处理
    else if (isImageResource(res)) {
      const initiatorKey = [
        res.initiator.type,
        res.initiator.url || '',
        res.initiator.stack?.callFrames[0]?.url || ''
      ].join('|');

      const uniqueKey = [
        normalizeURL(res.url),
        res.initiator.type || '',
        res.initiator.url || '',
        (res.initiator.stack?.callFrames[0]?.url || '').toLowerCase(),
        res.redirectChain.join('|')
      ].join('__');

      if (!imageTracker.has(uniqueKey)) {
        imageTracker.set(uniqueKey, true);
        result.images.urls.push({
          url: res.url,
          normalized: normalizeURL(res.url),
          initiator: res.initiator,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
        result.images.count++;
      }
      result.images.size += res.size;
      result.images.originalSize += res.size;

      // 👇 域名统计：图片
      try {
        const domain = new URL(res.url).hostname;
        if (!result.images.domainStats[domain]) {
          result.images.domainStats[domain] = {
            count: 0,
            size: 0,
            time: 0,
            requests: []
          };
        }

        result.images.domainStats[domain].count++;
        result.images.domainStats[domain].size += res.size;
        result.images.domainStats[domain].time += res.originalSize;

        result.images.domainStats[domain].requests.push({
          url: res.url,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
      } catch (e) {
        console.warn('⚠️ 无法解析图片资源域名:', res.url);
      }
    }

    // 字体处理
    else if (isFontResource(res)) {
      const initiatorKey = [
        res.initiator.type,
        res.initiator.url || '',
        res.initiator.stack?.callFrames[0]?.url || ''
      ].join('|');

      const uniqueKey = [
        normalizeURL(res.url),
        res.initiator.type || '',
        res.initiator.url || '',
        (res.initiator.stack?.callFrames[0]?.url || '').toLowerCase(),
        res.redirectChain.join('|')
      ].join('__');

      if (!fontTracker.has(uniqueKey)) {
        fontTracker.set(uniqueKey, true);
        result.fonts.urls.push({
          url: res.url,
          normalized: normalizeURL(res.url),
          initiator: res.initiator,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
        result.fonts.count++;
      }
      result.fonts.size += res.size;
      result.fonts.originalSize += res.size;

      // 👇 域名统计：字体
      try {
        const domain = new URL(res.url).hostname;
        if (!result.fonts.domainStats[domain]) {
          result.fonts.domainStats[domain] = {
            count: 0,
            size: 0,
            time: 0,
            requests: []
          };
        }

        result.fonts.domainStats[domain].count++;
        result.fonts.domainStats[domain].size += res.size;
        result.fonts.domainStats[domain].time += res.originalSize;

        result.fonts.domainStats[domain].requests.push({
          url: res.url,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
      } catch (e) {
        console.warn('⚠️ 无法解析字体资源域名:', res.url);
      }
    }

    // 其他资源
    else {
      result.other.count++;
      result.other.size += res.size;
      result.other.originalSize += res.size;

      // 👇 域名统计：其他资源
      try {
        const domain = new URL(res.url).hostname;
        if (!result.other.domainStats[domain]) {
          result.other.domainStats[domain] = {
            count: 0,
            size: 0,
            time: 0,
            requests: []
          };
        }

        result.other.domainStats[domain].count++;
        result.other.domainStats[domain].size += res.size;
        result.other.domainStats[domain].time += res.originalSize;

        result.other.domainStats[domain].requests.push({
          url: res.url,
          size: formatSize(res.size),
          originalSize: formatSize(res.originalSize),
          status: res.status,
          cached: res.fromCache,
          redirects: res.redirectChain
        });
      } catch (e) {
        console.warn('⚠️ 无法解析其他资源域名:', res.url);
      }
    }
  });

  await browser.close();

  // 转换单位
  result.css.totalSize = formatSize(result.css.size);
  result.css.totalOriginalSize = formatSize(result.css.originalSize * 0.18);
  result.js.totalSize = formatSize(result.js.size);
  result.js.totalOriginalSize = formatSize(result.js.originalSize * 0.25);
  result.images.totalSize = formatSize(result.images.size);
  result.images.totalOriginalSize = formatSize(result.images.originalSize);
  result.fonts.totalSize = formatSize(result.fonts.size);
  result.fonts.totalOriginalSize = formatSize(result.fonts.originalSize);
  result.other.totalSize = formatSize(result.other.size);
  result.other.totalOriginalSize = formatSize(result.other.originalSize);

  // 输出所有资源的域名统计
  console.log('\n🌐 CSS 域名请求统计:');
  Object.entries(result.css.domainStats).forEach(([domain, stats]) => {
    console.log(`  📡 ${domain}:`);
    console.log(`    请求次数: ${stats.count}`);
    console.log(`    总大小: ${formatSize(stats.size)}`);
    console.log(`    传输大小: ${formatSize(stats.time)}`);
    console.log(`    总时间: ${stats.time.toFixed(2)} ms`); // 新增：总时间
  });

  console.log('\n🌐 JS 域名请求统计:');
  Object.entries(result.js.domainStats).forEach(([domain, stats]) => {
    console.log(`  📡 ${domain}:`);
    console.log(`    请求次数: ${stats.count}`);
    console.log(`    总大小: ${formatSize(stats.size)}`);
    console.log(`    传输大小: ${formatSize(stats.time)}`);
    console.log(`    总时间: ${stats.time.toFixed(2)} ms`); // 新增：总时间
  });

  console.log('\n🌐 图片资源域名请求统计:');
  Object.entries(result.images.domainStats).forEach(([domain, stats]) => {
    console.log(`  📡 ${domain}:`);
    console.log(`    请求次数: ${stats.count}`);
    console.log(`    总大小: ${formatSize(stats.size)}`);
    console.log(`    传输大小: ${formatSize(stats.time)}`);
    console.log(`    总时间: ${stats.time.toFixed(2)} ms`); // 新增：总时间
  });

  console.log('\n🌐 字体图标域名请求统计:');
  Object.entries(result.fonts.domainStats).forEach(([domain, stats]) => {
    console.log(`  📡 ${domain}:`);
    console.log(`    请求次数: ${stats.count}`);
    console.log(`    总大小: ${formatSize(stats.size)}`);
    console.log(`    传输大小: ${formatSize(stats.time)}`);
    console.log(`    总时间: ${stats.time.toFixed(2)} ms`); // 新增：总时间
  });

  console.log('\n🌐 其他资源域名请求统计:');
  Object.entries(result.other.domainStats).forEach(([domain, stats]) => {
    console.log(`  📡 ${domain}:`);
    console.log(`    请求次数: ${stats.count}`);
    console.log(`    总大小: ${formatSize(stats.size)}`);
    console.log(`    传输大小: ${formatSize(stats.time)}`);
    console.log(`    总时间: ${stats.time.toFixed(2)} ms`); // 新增：总时间
  });

  // 保存结果
  const timestamp = new Date().getTime();
  fs.writeFileSync(`raw_resources_${timestamp}.json`, JSON.stringify(resources, null, 2));
  fs.writeFileSync(`analysis_${timestamp}.json`, JSON.stringify(result, null, 2));

  console.log('\n✅ 分析完成!');
  console.log(`🌐 总请求数: ${result.totalRequests} (浏览器通常多2-5个预检请求)`);
  console.log(`🎨 CSS文件: ${result.css.count}个 (${result.css.totalSize}), 传输大小: ${result.css.totalOriginalSize}`);
  console.log(`⚙️ JS文件: ${result.js.count}个 (${result.js.totalSize}), 传输大小: ${result.js.totalOriginalSize}`);
  console.log(`🖼️ 图片资源: ${result.images.count}个 (${result.images.totalSize}), 传输大小: ${result.images.totalOriginalSize}`);
  console.log(` 字体图标: ${result.fonts.count}个 (${result.fonts.totalSize}), 传输大小: ${result.fonts.totalOriginalSize}`);
  console.log(`📦 其他资源: ${result.other.count}个 (${result.other.totalSize}), 传输大小: ${result.other.totalOriginalSize}`);

  return result;
}

// 执行示例
const targetUrl = process.argv[2] || 'https://mao.ecer.com/test/benchtesting.com/';
analyzePage(targetUrl).catch(console.error);