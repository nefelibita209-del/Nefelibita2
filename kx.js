class KxManhua extends ComicSource {
    name = "凯旋漫画";
    key = "kxmanhua";
    version = "1.0.0";
    minAppVersion = "3.1.0";
    url = ""; // 这里后续填入该js文件托管后的直链URL

    init() {
        console.log("KxManhua Source Initialized");
    }

    // 辅助函数：解析你提供的那个HTML元素片段
    parseComic(element) {
        // 兼容传入的是父节点或者直接是 pic 节点
        let pic = element.attributes && element.attributes['data-setbg'] ? element : element.querySelector('.product__item__pic');
        if (!pic) return null;

        // 获取封面
        let cover = pic.attributes['data-setbg'];
        
        // 获取ID (解析 onclick="location.href='/manga/7007';")
        let onclick = pic.attributes['onclick'];
        let id = "";
        if (onclick) {
            let match = onclick.match(/\/manga\/(\d+)/);
            if (match) id = match[1];
        }

        // 获取状态 (例如: 连载)
        let epEl = pic.querySelector('.ep');
        let subTitle = epEl ? epEl.text.trim() : "";

        // 尝试获取标题 (通常在 pic 的相邻或父级包含 title 标签)
        let parent = element;
        let titleEl = parent.querySelector('h5 a') || parent.querySelector('h5') || parent.querySelector('.title');
        let title = titleEl ? titleEl.text.trim() : "未知标题";

        return {
            id: id,
            title: title,
            subTitle: subTitle,
            cover: cover,
            tags: [],
            description: ""
        };
    }

    // 探索页面 (首页)
    explore = [
        {
            title: "首页推荐",
            type: "singlePageWithMultiPart",
            load: async () => {
                let res = await Network.get("https://kxmanhua.com/");
                if (res.status !== 200) throw `网络请求失败: ${res.status}`;
                
                let doc = new HtmlDocument(res.body);
                let comics = {};
                
                // 获取所有漫画区块
                let items = doc.querySelectorAll('.product__item__pic');
                let list = [];
                items.forEach(item => {
                    let c = this.parseComic(item);
                    if (c && c.id) list.push(c);
                });
                
                // 简单起见，全部放入首页发现
                comics["最新连载"] = list;
                return comics;
            }
        }
    ]

    // 搜索功能
    search = {
        load: async (keyword, options, page) => {
            // 假设搜索路径为 /search?keyword=xx&page=1
            let url = `https://kxmanhua.com/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(url);
            let doc = new HtmlDocument(res.body);
            
            let items = doc.querySelectorAll('.product__item__pic');
            let list = [];
            items.forEach(item => {
                let c = this.parseComic(item);
                if (c && c.id) list.push(c);
            });

            return {
                comics: list,
                // 如果当前页有数据，允许加载下一页
                maxPage: list.length > 0 ? page + 1 : page 
            };
        },
        optionList: []
    }

    // 漫画详情与章节
    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(`https://kxmanhua.com/manga/${id}`);
            let doc = new HtmlDocument(res.body);
            
            // 解析标题 (常规结构假设)
            let titleEl = doc.querySelector('.anime__details__title h3');
            let title = titleEl ? titleEl.text.trim() : "未知标题";
            
            // 解析封面
            let coverEl = doc.querySelector('.anime__details__pic');
            let cover = coverEl ? coverEl.attributes['data-setbg'] : "";
            
            // 解析简介
            let descEl = doc.querySelector('.anime__details__text p');
            let description = descEl ? descEl.text.trim() : "";
            
            // 解析章节列表
            let chapters = new Map();
            // 假设章节链接类似于 <a href="/chapter/1234">第1话</a>
            let chElements = doc.querySelectorAll('.anime__details__episodes a');
            chElements.forEach(el => {
                let href = el.attributes['href'];
                let chTitle = el.text.trim();
                if (href) {
                    // 提取章节ID (例如 /chapter/5001 -> 5001)
                    let match = href.match(/\/chapter\/(\d+)/) || href.match(/\/manga\/\d+\/(\d+)/);
                    let chId = match ? match[1] : href;
                    chapters.set(chId, chTitle);
                }
            });

            return {
                title: title,
                cover: cover,
                description: description,
                tags: {},
                chapters: chapters
            };
        },
        
        loadEp: async (comicId, epId) => {
            // 请求具体的阅读页面
            let res = await Network.get(`https://kxmanhua.com/chapter/${epId}`);
            let doc = new HtmlDocument(res.body);
            
            // 寻找阅读页里的图片标签 (一般在特定 class 内，这里囊括了常见的 class)
            let imgs = doc.querySelectorAll('.reading-content img, .chapter-content img, #viewer img, .manga-image img');
            let images = [];
            
            imgs.forEach(img => {
                // 有些网站做了懒加载，真实链接可能在 data-src 中
                let src = img.attributes['data-src'] || img.attributes['data-original'] || img.attributes['src'];
                if (src) {
                    images.push(src.trim());
                }
            });

            return {
                images: images
            };
        }
    }
}