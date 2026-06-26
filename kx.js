class KxManhua extends ComicSource {
    name = "凯旋漫画";
    key = "kxmanhua";
    version = "1.0.0";
    minAppVersion = "3.1.0";
    url = "https://kxmanhua.com"; 

    // 设置为 null 禁用不需要的模块，防止 Dart 桥接报错
    account = null;
    category = null;
    categoryComics = null;
    favorites = null;

    init() {
        console.log("KxManhua Source Initialized");
    }

    // 辅助解析函数
    parseComic(element) {
        // 在 init.js 中 attributes 是属性不是函数
        let cover = element.attributes['data-setbg'] || "";
        let onclick = element.attributes['onclick'] || "";
        
        let match = onclick.match(/\/manga\/(\d+)/);
        let id = match ? match[1] : "";
        
        let epEl = element.querySelector('.ep');
        // 在 init.js 中 text 是属性
        let subTitle = epEl ? epEl.text.trim() : "";
        
        let title = "未知标题";
        // 在 init.js 中 HtmlElement 包含 parent 属性
        let parent = element.parent; 
        if (parent) {
            let titleEl = parent.querySelector('h5 a') || parent.querySelector('h5');
            if (titleEl) {
                title = titleEl.text.trim();
            }
        }

        if (!id) return null;

        return {
            id: id,
            title: title,
            subTitle: subTitle,
            cover: cover,
            tags: [],
            description: ""
        };
    }

    explore = [
        {
            title: "首页连载",
            type: "singlePageWithMultiPart",
            load: async () => {
                let res = await Network.get("https://kxmanhua.com/");
                if (res.status !== 200) throw `网络请求失败: ${res.status}`;
                
                let doc = new HtmlDocument(res.body);
                // querySelectorAll 返回 HtmlElement 数组
                let elements = doc.querySelectorAll('.product__item__pic');
                let list = [];
                
                elements.forEach(el => {
                    let c = this.parseComic(el);
                    if (c) list.push(c);
                });
                
                // 释放内存，init.js 的规范建议
                doc.dispose();
                
                return { "最新推荐": list };
            }
        }
    ];

    search = {
        optionList: [],
        load: async (keyword, options, page) => {
            let url = `https://kxmanhua.com/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(url);
            let doc = new HtmlDocument(res.body);
            
            let elements = doc.querySelectorAll('.product__item__pic');
            let list = [];
            elements.forEach(el => {
                let c = this.parseComic(el);
                if (c) list.push(c);
            });

            doc.dispose();
            
            return {
                comics: list,
                maxPage: list.length > 0 ? page + 1 : page 
            };
        }
    };

    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(`https://kxmanhua.com/manga/${id}`);
            let doc = new HtmlDocument(res.body);
            
            let titleEl = doc.querySelector('.anime__details__title h3');
            let title = titleEl ? titleEl.text.trim() : "未知";
            
            let coverEl = doc.querySelector('.anime__details__pic');
            let cover = coverEl ? (coverEl.attributes['data-setbg'] || "") : "";
            
            let descEl = doc.querySelector('.anime__details__text p');
            let description = descEl ? descEl.text.trim() : "";
            
            let chapters = {}; // 考虑到引擎序列化，使用普通 Object 最稳妥
            let chElements = doc.querySelectorAll('.anime__details__episodes a');
            chElements.forEach(el => {
                let href = el.attributes['href'];
                let chTitle = el.text.trim();
                if (href) {
                    let match = href.match(/\/chapter\/(\d+)/) || href.match(/\/manga\/\d+\/(\d+)/);
                    let chId = match ? match[1] : href;
                    chapters[chId] = chTitle;
                }
            });

            doc.dispose();
            
            return {
                title: title,
                cover: cover,
                description: description,
                tags: {},
                chapters: chapters
            };
        },
        
        loadEp: async (comicId, epId) => {
            let res = await Network.get(`https://kxmanhua.com/chapter/${epId}`);
            let doc = new HtmlDocument(res.body);
            
            let imgs = doc.querySelectorAll('.reading-content img, .chapter-content img, #viewer img, .manga-image img');
            let images = [];
            
            imgs.forEach(img => {
                let src = img.attributes['data-src'] || img.attributes['data-original'] || img.attributes['src'];
                if (src) images.push(src.trim());
            });

            doc.dispose();
            
            return { images: images };
        }
    };
}
