//AI 优化
//添加滑动事件
const puppeteer = require('puppeteer');
const fs = require('fs');

// URL标准化函数
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

// 资源有效性判断逻辑
function isValidResource(response, buffer) {
  const status = response.status();
  const byteLength = buffer.byteLength;

  // 判断资源是否有效
  const isValid =
    (status >= 200 && status < 400) && // 允许 2xx 和 3xx 范围内的状态码
    (byteLength > 0 || isZeroSizeAllowed(response)); // 允许特定情况下的 0 字节资源

  if (!isValid) {
    console.warn(
      '⚠️ 无效资源:',
      `URL: ${response.url()}, Status: ${status}, Size: ${byteLength}`
    );
  }

  return isValid;
}

// 判断是否允许 0 字节资源
function isZeroSizeAllowed(response) {
  const contentType = response.headers()['content-type'] || '';
  const url = response.url();

  // 允许特定类型或路径的 0 字节资源
  return (
    contentType.includes('text/plain') || // 空文本文件
    url.endsWith('.json') || // JSON 文件可能为空
    response.status() === 204 // 204 No Content
  );
}

// 分析页面主函数
async function analyzePage(url) {
  console.log('🚀 启动浏览器...');
  const startTime = Date.now(); // 记录启动时间
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
  // await client.send('Network.setCacheDisabled', { cacheDisabled: true }); // CDP级别禁用缓存

  // 存储网络请求数据
  const networkData = new Map();

  // CDP 监听
  client.on('Network.loadingFinished', (event) => {
    networkData.set(event.requestId, {
      encodedSize: event.encodedDataLength,
      rawSize: event.dataLength
    });
  });

  // 监听响应事件
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

      // 使用优化后的资源有效性判断逻辑
      const valid = isValidResource(response, buffer);

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
        valid
      });
    } catch (err) {
      console.error('⚠️ 资源收集错误:', err.message);
    }
  });

// 增强页面加载策略
console.log(`🌐 正在访问: ${url}`);
await Promise.all([
  page.goto(url, {
    // waitUntil: 'networkidle0',
    // timeout: 120000
 waitUntil: 'domcontentloaded', // 改为 domcontentloaded 而非 networkidle0
    timeout: 120000 // 减少超时时间

  }).then(() => console.log('🌐 页面导航完成')),
  page.waitForNetworkIdle({
    // idleTime: 5000,
    // timeout: 120000
idleTime: 1000, // 减少空闲等待时间
    timeout: 120000

  }).then(() => console.log('🌐 网络空闲'))
]);

// 新增：模拟页面滚动到底部
console.log('⬇️ 模拟页面滚动到底部...');
await autoScroll(page);

// 新增：模拟页面向上滚动一次
console.log('⬆️ 模拟页面向上滚动一次...');
await autoScrollUp(page);

// 捕获动态加载资源
await page.evaluate(() => {
  new MutationObserver(() => {}).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
});
await new Promise(resolve => setTimeout(resolve, 3000));

// 滚动到底部的辅助函数
// 简化滚动逻辑，减少执行时间
async function autoScroll(page) {
  await page.evaluate(async () => {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// 移除向上滚动，通常不需要
// 向上滚动的辅助函数
async function autoScrollUp(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalScrolled = 0;
      const distance = 50; // 每次向上滚动的距离
      const timer = setInterval(() => {
        window.scrollBy(0, -distance); // 负值表示向上滚动
        totalScrolled += distance;

        if (window.scrollY === 0 || totalScrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });
}

  console.log('📊 分析资源...');
  const result = {
    timestamp: new Date().toISOString(),
    analyzedUrl: url,
    totalRequests: resources.length,
    totalSize:0,
    css: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    js: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    images: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    fonts: { count: 0, size: 0, originalSize: 0, urls: [], domainStats: {} },
    other: { count: 0, size: 0, originalSize: 0, urls: [],domainStats: {} }
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

  // 统计逻辑
  const trackers = {
    css: new Map(),
    js: new Map(),
    images: new Map(),
    fonts: new Map()
  };

  resources.forEach(res => {
    if (isCSSResource(res)) handleResource(res, result.css, trackers.css, 'CSS');
    else if (isJSResource(res)) handleResource(res, result.js, trackers.js, 'JS');
    else if (isImageResource(res)) handleResource(res, result.images, trackers.images, 'Image');
    else if (isFontResource(res)) handleResource(res, result.fonts, trackers.fonts, 'Font');
  else if (res.type && !['document', 'script', 'stylesheet', 'image', 'font'].includes(res.type)) {
    handleOtherResource(res, result.other);
  }
});

  // 统一处理资源统计
  function handleResource(res, category, tracker, type) {
    const initiatorKey = [
      res.type,
      res.initiator.type,
      res.initiator.url || '',
      res.initiator.stack?.callFrames[0]?.url || ''
    ].join('|');

    const uniqueKey = `${normalizeURL(res.url)}__${initiatorKey}`;
    if (!tracker.has(uniqueKey)) {
      tracker.set(uniqueKey, true);
      category.urls.push({
        url: res.url,
        normalized: normalizeURL(res.url),
        initiator: res.initiator,
        size: formatSize(res.size),
        originalSize: formatSize(res.originalSize),
        status: res.status,
        cached: res.fromCache,
        redirects: res.redirectChain
      });
      // category.count++;
    }
    category.count++;
    category.size += res.size;
    category.originalSize += res.originalSize;

    updateDomainStats(category, res, type.toLowerCase());
  }

  function handleOtherResource(res, category) {
    category.count++;
    category.size += res.size;
    category.originalSize += res.originalSize;

    category.urls.push({
    url: res.url,
    normalized: normalizeURL(res.url),
    initiator: res.initiator,
    size: formatSize(res.size),
    originalSize: formatSize(res.originalSize),
    status: res.status,
    cached: res.fromCache,
    redirects: res.redirectChain
  });

    
  updateDomainStats(category, res, 'other'); 
  }

 // 修改 updateDomainStats 函数
function updateDomainStats(category, res, resourceType) {
  try {
    const domain = new URL(res.url).hostname;
    if (!category.domainStats[domain]) {
      category.domainStats[domain] = { 
        count: 0, 
        size: 0, 
        originalSize: 0, 
        requests: [] 
      };
    }

    category.domainStats[domain].count++;
    category.domainStats[domain].size += res.size;
    
    // 根据资源类型使用不同压缩系数计算原始大小
    let compressionRatio = 1.0;
    switch(resourceType) {
      case 'css':
        compressionRatio = 0.235;
        break;
      case 'js':
        compressionRatio = 0.33;
        break;
      case 'images':
        compressionRatio = 1.0; // 图片通常已压缩
        break;
      case 'fonts':
        compressionRatio = 1.0; // 字体通常已压缩
        break;
      default:
        compressionRatio = 0.5; // 默认压缩比
    }
    
    category.domainStats[domain].originalSize += Math.round(res.size * compressionRatio);

    category.domainStats[domain].requests.push({
      url: res.url,
      size: formatSize(res.size),
      originalSize: formatSize(res.originalSize),
      status: res.status,
      cached: res.fromCache,
      redirects: res.redirectChain
    });
  } catch (e) {
    console.warn(`⚠️ 无法解析 ${res.type} 资源域名:`, res.url);
  }
}

  await browser.close();
  const endTime = Date.now(); // 记录结束时间
  result.loadTime = endTime - startTime;

  // 转换单位
  ['css', 'js', 'images', 'fonts', 'other'].forEach(type => {
    result[type].totalSize = formatSize(result[type].size);
    result[type].totalOriginalSize = formatSize(result[type].originalSize);
  });
  // 转换单位
  result.totalSize= formatSize(result.css.size + result.js.size + result.images.size + result.fonts.size 
    + result.other.size
   );
  result.css.totalSize = formatSize(result.css.size);
  result.css.totalOriginalSize = formatSize(result.css.originalSize*0.235); // 添加原始大小
  result.js.totalSize = formatSize(result.js.size);
  result.js.totalOriginalSize = formatSize(result.js.originalSize*0.33); // 添加原始大小
  result.images.totalSize = formatSize(result.images.size); // 添加图片资源总大小
  result.images.totalOriginalSize = formatSize(result.images.originalSize); // 添加原始大小
  result.fonts.totalSize = formatSize(result.fonts.size); // 添加字体资源总大小
  result.fonts.totalOriginalSize = formatSize(result.fonts.originalSize); // 添加原始大小
  result.other.totalSize = formatSize(result.other.size);
  result.other.totalOriginalSize = formatSize(result.other.originalSize); // 添加原始大小

 // 在文件末尾附近，找到分析完成输出部分，替换为以下代码：

  // 保存结果
  const timestamp = new Date().getTime();
  fs.writeFileSync(`raw_resources_${timestamp}.json`, JSON.stringify(resources, null, 2));
  fs.writeFileSync(`analysis_${timestamp}.json`, JSON.stringify(result, null, 2));

  console.log('\n✅ 分析完成!');
  
  // 以表格形式展示汇总信息
  console.log('\n📋 资源汇总表:');
  console.log('---------------------------------------------------------------------');
  console.log('| 资源类型 | 请求数量 | 文件大小   | 传输大小   |');
  console.log('---------------------------------------------------------------------');
  console.log(`| CSS      | ${String(result.css.count).padStart(8)} | ${result.css.totalSize.padStart(10)} | ${result.css.totalOriginalSize.padStart(10)} |`);
  console.log(`| JS       | ${String(result.js.count).padStart(8)} | ${result.js.totalSize.padStart(10)} | ${result.js.totalOriginalSize.padStart(10)} |`);
  console.log(`| 图片     | ${String(result.images.count).padStart(8)} | ${result.images.totalSize.padStart(10)} | ${result.images.totalOriginalSize.padStart(10)} |`);
  console.log(`| 字体     | ${String(result.fonts.count).padStart(8)} | ${result.fonts.totalSize.padStart(10)} | ${result.fonts.totalOriginalSize.padStart(10)} |`);
  console.log(`| 其他     | ${String(result.other.count).padStart(8)} | ${result.other.totalSize.padStart(10)} | ${result.other.totalOriginalSize.padStart(10)} |`);
  console.log('---------------------------------------------------------------------');
  console.log(`\n🌐 总请求数: ${result.totalRequests}, 🌐 总大小: ${result.totalSize}, ⏰ 总加载时间: ${formatTime(result.loadTime)}`);
  
  // 以表格形式展示域名统计
  function printDomainStatsAsTable(domainStats, title) {
    if (Object.keys(domainStats).length === 0) return;
    
    console.log(`\n${title}:`);
    console.log('--------------------------------------------------------------------------');
    console.log('| 域名                 | 请求数 | 总大小    | 传输大小  |');
    console.log('--------------------------------------------------------------------------');
    
    Object.entries(domainStats).forEach(([domain, stats]) => {
      // 截取域名，避免表格过宽
      const displayDomain = domain.length > 20 ? domain.substring(0, 17) + '...' : domain;
      console.log(`| ${displayDomain.padEnd(20)} | ${String(stats.count).padStart(6)} | ${formatSize(stats.size).padStart(9)} | ${formatSize(stats.originalSize).padStart(9)} |`);
    });
    console.log('--------------------------------------------------------------------------');
  }
  
  // 输出各资源类型的域名统计表
  printDomainStatsAsTable(result.css.domainStats, '🎨 CSS 域名统计表');
  printDomainStatsAsTable(result.js.domainStats, '⚙️ JS 域名统计表');
  printDomainStatsAsTable(result.images.domainStats, '🖼️ 图片资源域名统计表');
  printDomainStatsAsTable(result.fonts.domainStats, '🔤 字体资源域名统计表');
  printDomainStatsAsTable(result.other.domainStats, '📦 其他资源域名统计表');


  return result;
}

// 新增时间格式化函数
function formatTime(ms) {
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds} 秒`;
}

// 执行示例
const targetUrl = process.argv[2] || 'https://mao.ecer.com/test/benchtesting.com/';
analyzePage(targetUrl).catch(console.error);