import requests
from bs4 import BeautifulSoup
import sys
import urllib.parse

def check_links(url, visited=None, max_pages=10):
    if visited is None:
        visited = set()

    try:
        # 确保URL以http://或https://开头
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url

        # 如果已访问过该页面，则跳过
        if url in visited or len(visited) >= max_pages:
            return [], []
        visited.add(url)

        # 获取页面内容
        response = requests.get(url)
        if response.status_code != 200:
            print(f"无法访问页面: {url}, 状态码: {response.status_code}")
            return [], []

        # 解析HTML内容
        soup = BeautifulSoup(response.text, 'html.parser')
        links = soup.find_all('a', href=True)

        # 检查每个链接的状态码
        non_200_links = []
        not_found_links = []  # 新增：用于存储404链接
        for link in links:
            link_url = link['href']
            
            # 处理相对URL
            if not link_url.startswith(('http://', 'https://')):
                link_url = urllib.parse.urljoin(url, link_url)
            
            try:
                link_response = requests.head(link_url, allow_redirects=True)
                if link_response.status_code != 200:
                    non_200_links.append((link_url, link_response.status_code))
                    if link_response.status_code == 404:  # 新增：单独记录404链接
                        not_found_links.append(link_url)
            except requests.exceptions.RequestException as e:
                non_200_links.append((link_url, str(e)))

        # 递归检查子页面
        sub_pages = [link_url for link_url, status in non_200_links if status == 200 and link_url not in visited]
        all_non_200_links = non_200_links
        all_not_found_links = not_found_links
        for sub_page in sub_pages:
            if len(visited) < max_pages:
                sub_non_200, sub_not_found = check_links(sub_page, visited, max_pages)
                all_non_200_links.extend(sub_non_200)
                all_not_found_links.extend(sub_not_found)

        # 输出结果
        if non_200_links:
            print(f"\n在页面 {url} 中发现以下非200链接:")
            for link, status in non_200_links:
                print(f"链接: {link}, 状态码: {status}")
            
            # 新增：单独输出404链接
            if not_found_links:
                print("\n以下链接返回404状态码:")
                for link in not_found_links:
                    print(f"链接: {link}")
        else:
            print(f"页面 {url} 中所有链接的状态码均为200")

        return all_non_200_links, all_not_found_links

    except requests.exceptions.RequestException as e:
        print(f"请求错误: {e}")
        return [], []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("请提供网站首页URL作为参数")
        sys.exit(1)

    url = sys.argv[1]
    check_links(url)