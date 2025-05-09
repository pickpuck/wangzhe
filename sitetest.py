import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re

# 设置起始 URL
start_url = 'https://www.aodakx.com/products.html'  # 替换为你的网站 URL
visited_urls = set()
resource_urls = set()

def is_valid_url(url):
    parsed = urlparse(url)
    return bool(parsed.netloc) and bool(parsed.scheme)

def get_all_links(url):
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        for a_tag in soup.find_all('a', href=True):
            href = a_tag.attrs['href']
            full_url = urljoin(url, href)
            if is_valid_url(full_url) and start_url in full_url:
                yield full_url
    except requests.RequestException as e:
        print(f"Request failed: {e}")

def get_all_resources(url):
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup.find_all(['img', 'video', 'script', 'link', 'source'], src=True):
            src = tag.attrs['src']
            full_url = urljoin(url, src)
            if is_valid_url(full_url):
                resource_urls.add(full_url)
        for tag in soup.find_all(['link', 'a'], href=True):
            href = tag.attrs['href']
            full_url = urljoin(url, href)
            if is_valid_url(full_url):
                resource_urls.add(full_url)
    except requests.RequestException as e:
        print(f"Request failed: {e}")

def crawl(url):
    if url in visited_urls:
        return
    print(f"Crawling: {url}")
    visited_urls.add(url)
    get_all_resources(url)
    for link in get_all_links(url):
        crawl(link)

def check_www(urls):
    for url in urls:
        if 'http' in url and 'www' not in url:
            print(f"Resource not using www: {url}")

# 开始爬取
crawl(start_url)

# 检查资源 URL 是否使用了 www
check_www(resource_urls)