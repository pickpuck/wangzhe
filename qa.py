import requests
from bs4 import BeautifulSoup
import re
 
from urllib.parse import urljoin  # 添加此行以支持 URL 拼接

def fetch_css_from_url(url):
    # 获取网页内容
    response = requests.get(url)
    response.raise_for_status()  # 确保请求成功
    html_content = response.text
    
    # 解析HTML内容
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 提取内联CSS
    inline_css = soup.find_all(style=True)
    inline_css_styles = [style['style'] for style in inline_css]
    
    # 提取外部CSS文件（<link rel="stylesheet" href="...">）
    external_css_links = soup.find_all('link', rel='stylesheet')
    external_css = []
    for link in external_css_links:
        css_url = link['href']
        # 将相对路径转换为绝对路径
        absolute_css_url = urljoin(url, css_url)
        css_response = requests.get(absolute_css_url)
        css_response.raise_for_status()  # 确保请求成功
        external_css.append(css_response.text)
    
    return inline_css_styles, external_css
 
def count_css_styles(css_list):
    # 统计每个选择器的样式数量（简化版本）
    selector_counts = {}
    for css in css_list:
        # 使用正则表达式找到选择器部分（简化处理）
        matches = re.findall(r'([^{]+)\{', css)
        for match in matches:
            selector = match.strip()  # 清理选择器字符串（可选）
            if selector in selector_counts:
                selector_counts[selector] += 1
            else:
                selector_counts[selector] = 1
    return selector_counts
 
def main():
    url = 'https://mao.ecer.com/test/b-blower.com/'  # 替换为你要分析的URL
    inline_css, external_css = fetch_css_from_url(url)
    all_css = inline_css + external_css  # 合并内联和外部CSS列表
    css_stats = count_css_styles(all_css)
    print("CSS Selector Counts:")
    for selector, count in css_stats.items():
        print(f"{selector}: {count}")
 
if __name__ == "__main__":
    main()