# app.py
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
import time
import re
import logging

# 配置日志记录到文件
logging.basicConfig(
    filename='app.log',  # 日志文件名
    level=logging.INFO,  # 日志级别
    format='%(asctime)s - %(levelname)s - %(message)s',  # 日志格式
    datefmt='%Y-%m-%d %H:%M:%S'  # 日期格式
)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

def is_valid_url(url):
    parsed = urlparse(url)
    return bool(parsed.netloc) and bool(parsed.scheme)

def check_link(full_url, current_url, socket):
    try:
        # 改用GET方法并设置stream=True以避免下载大文件
        link_response = requests.get(full_url, allow_redirects=True, timeout=10, stream=True)
        status_code = link_response.status_code

        # 记录所有状态码，不只是非200的
        logging.info(f"URL: {full_url}, Status Code: {status_code}, Referer: {current_url}")

        if status_code != 200:
            socket.emit('non_200_link', {'page_url': current_url, 'link': full_url, 'status_code': status_code})

    except requests.Timeout:
        logging.error(f"Timeout checking {full_url}")
        socket.emit('non_200_link', {'page_url': current_url, 'link': full_url, 'status_code': "Timeout"})
    except requests.RequestException as e:
        logging.error(f"Failed to check {full_url}: {str(e)}")
        socket.emit('non_200_link', {'page_url': current_url, 'link': full_url, 'status_code': f"Error: {str(e)}"})
    except Exception as e:
        logging.error(f"Unexpected error checking {full_url}: {str(e)}")
        socket.emit('non_200_link', {'page_url': current_url, 'link': full_url, 'status_code': f"Unexpected Error: {str(e)}"})

def get_all_links(url, domain, socket):
    visited = set()
    to_visit = [url]
    non_200_links = {}

    while to_visit:
        current_url = to_visit.pop(0)
        if current_url in visited:
            continue

        try:
            response = requests.get(current_url, timeout=10)
            response.raise_for_status()
            page_source = response.text
        except requests.RequestException as e:
            print(f"Failed to retrieve {current_url}: {e}")
            continue

        visited.add(current_url)
        soup = BeautifulSoup(page_source, 'html.parser')

        links_to_check = []
        for tag in soup.find_all(href=True):
            href = tag['href']
            full_url = urljoin(current_url, href)
            if is_valid_url(full_url) and domain in full_url:
                if full_url not in visited:
                    to_visit.append(full_url)
                    links_to_check.append((full_url, current_url))
                logging.info(f"Detected URL from href: {full_url}")

        # 处理 onclick 属性
        for tag in soup.find_all(onclick=True):
            onclick = tag.get('onclick')
            if onclick:
                # 使用正则表达式提取 href 值
                match = re.search(r"window\.location\.href\s*=\s*['\"]([^'\"]+)", onclick)
                if match:
                    href = match.group(1)
                    full_url = urljoin(current_url, href)
                    if is_valid_url(full_url) and domain in full_url:
                        if full_url not in visited:
                            to_visit.append(full_url)
                            links_to_check.append((full_url, current_url))
                        logging.info(f"Detected URL from onclick: {full_url}")
                else:
                    # 处理直接从 href 属性中提取的情况
                    href = tag.get('href')
                    if href:
                        full_url = urljoin(current_url, href)
                        if is_valid_url(full_url) and domain in full_url:
                            if full_url not in visited:
                                to_visit.append(full_url)
                                links_to_check.append((full_url, current_url))
                            logging.info(f"Detected URL from href: {full_url}")
            else:
                logging.info(f"No onclick attribute found for tag: {tag}")

        with ThreadPoolExecutor(max_workers=10) as executor:
            executor.map(lambda args: check_link(*args, socket), links_to_check)

    # 发送完成消息
    socket.emit('check_complete', {'message': "检查完成。"})

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('start_check')
def handle_start_check(data):
    start_url = data['start_url']
    domain = urlparse(start_url).netloc
    
    # 记录开始时间
    start_time = time.time()
    
    get_all_links(start_url, domain, socket)
    
    # 记录结束时间
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # 发送提示信息
    socket.emit('check_complete', {'message': f"检查完成，测试时长: {elapsed_time:.2f} 秒"})

if __name__ == "__main__":
    socketio.run(app, debug=True)