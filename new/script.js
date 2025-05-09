const puppeteer = require('puppeteer');

async function analyzePage(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const resources = [];
  page.on('response', response => {
    const req = response.request();
    resources.push({
      url: req.url(),
      type: req.resourceType(),
      size: response.headers()['content-length'] || 0
    });
  });

  await page.goto(url, { waitUntil: 'networkidle2' });
  await browser.close();

  const result = {
    totalURLs: resources.length,
    css: { count: 0, size: 0, urls: [] },
    js: { count: 0, size: 0, urls: [] }
  };

  resources.forEach(res => {
    if(res.type === 'stylesheet' || res.url.includes('.css')) {
      result.css.count++;
      result.css.size += parseInt(res.size);
      result.css.urls.push(res.url);
    } else if(res.type === 'script' || res.url.includes('.js')) {
      result.js.count++;
      result.js.size += parseInt(res.size);
      result.js.urls.push(res.url);
    }
  });

  // 转换为KB
  result.css.size = (result.css.size / 1024).toFixed(2) + ' KB';
  result.js.size = (result.js.size / 1024).toFixed(2) + ' KB';

  console.log('📊 资源统计结果:');
  console.log(`🌐 总URL请求数量: ${result.totalURLs}`);
  console.log(`🎨 CSS文件: ${result.css.count}个 (${result.css.size})`);
  console.log(`⚙️ JS文件: ${result.js.count}个 (${result.js.size}`);
  
  return result;
}

// 使用示例
analyzePage('https://example.com');