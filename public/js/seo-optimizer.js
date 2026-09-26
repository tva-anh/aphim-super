/**
 * APhim Super SEO Optimizer & Dynamic Schema Generator
 * Tối ưu hóa SEO Real-time cho Google Bots, Rich Snippets & Search Console
 * Tự động cập nhật Title, Meta Tags, Canonical và Schema JSON-LD khi người dùng chuyển trang / chuyển tập
 */

const SEO = {
    siteName: 'APhim Super',
    domain: 'https://aphim.store',
    
    // Dynamic Movie Meta & Schema Injection
    updateMovieSEO(movie, currentEpisode = null) {
        if (!movie) return;

        const title = movie.name || movie.title || '';
        const originTitle = movie.origin_name || '';
        const year = movie.year || new Date().getFullYear();
        const quality = movie.quality || 'Full HD';
        const lang = movie.lang || 'Vietsub';
        const slug = movie.slug || '';
        
        // 1. Phân tích tập phim hiện tại
        let episodeInfo = '';
        if (currentEpisode && currentEpisode.name) {
            const epName = String(currentEpisode.name).trim();
            if (/^\d+$/.test(epName)) {
                episodeInfo = `Tập ${epName}`;
            } else {
                episodeInfo = epName.toLowerCase().includes('tập') ? epName : `Tập ${epName}`;
            }
        } else if (movie.episode_current) {
            const epCur = String(movie.episode_current).trim();
            if (/^\d+$/.test(epCur)) {
                episodeInfo = `Tập ${epCur}`;
            } else {
                episodeInfo = epCur;
            }
        }

        // 2. Làm sạch nội dung mô tả
        let cleanSynopsis = '';
        if (movie.content) {
            cleanSynopsis = movie.content
                .replace(/<[^>]*>?/gm, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const isWatchPage = window.location.pathname.includes('/watch') || window.location.pathname.includes('/xem-phim');
        
        // 3. Tiêu đề chuẩn SEO theo từ khóa tìm kiếm phổ biến nhất tại VN
        let pageTitle;
        if (isWatchPage) {
            const epPart = episodeInfo ? `${episodeInfo} ` : '';
            pageTitle = `Xem Phim ${title} ${epPart}(${originTitle || year}) [${quality} ${lang}] - APhim Super`;
        } else {
            pageTitle = `Phim ${title} (${originTitle || year}) [${quality} ${lang}] - APhim Super`;
        }
        document.title = pageTitle;

        // 4. Meta Description chuẩn 155-160 ký tự
        const genreList = Array.isArray(movie.category) 
            ? movie.category.map(c => typeof c === 'object' ? c.name : c).join(', ') 
            : 'Hành Động, Tình Cảm';
        const countryList = Array.isArray(movie.country)
            ? movie.country.map(c => typeof c === 'object' ? c.name : c).join(', ')
            : 'Châu Á';
        const actorList = Array.isArray(movie.actor)
            ? movie.actor.slice(0, 4).join(', ')
            : '';

        let metaDesc = '';
        if (isWatchPage) {
            metaDesc = `Xem phim ${title} ${episodeInfo ? episodeInfo + ' ' : ''}full HD ${lang} mượt mà không quảng cáo. Thể loại: ${genreList}. Quốc gia: ${countryList}. Xem phim tại APhim Super.`;
        } else {
            const actorSnippet = actorList ? ` Diễn viên: ${actorList}.` : '';
            const descSnippet = cleanSynopsis ? ` ${cleanSynopsis.slice(0, 100)}...` : '';
            metaDesc = `Xem phim ${title} (${originTitle}) ${year} chất lượng ${quality} ${lang}.${actorSnippet}${descSnippet} Xem online miễn phí tại APhim Super.`;
        }

        this.setMeta('description', metaDesc);
        this.setMeta('keywords', `${title}, xem phim ${title}, ${title} full hd, ${title} vietsub, ${title} thuyet minh, ${originTitle}, phim ${year}, ${genreList}, aphim, aphim store`);
        
        // 5. Open Graph & Twitter Cards
        // Trang xem phim (Watch page) ưu tiên thumb_url 16:9 ngang cho Google Rich Snippet & Share
        const thumbUrl = isWatchPage
            ? (movie.thumb_url || movie.poster_url || `${this.domain}/android-chrome-512x512.png`)
            : (movie.poster_url || movie.thumb_url || `${this.domain}/android-chrome-512x512.png`);
        const absoluteThumb = thumbUrl.startsWith('http') ? thumbUrl : `https://phimimg.com/${thumbUrl.replace(/^\//, '')}`;
        const canonicalUrl = isWatchPage 
            ? `${this.domain}/xem-phim/${slug}`
            : `${this.domain}/phim/${slug}`;

        this.setOG('og:title', pageTitle);
        this.setOG('og:description', metaDesc);
        this.setOG('og:image', absoluteThumb);
        this.setOG('og:url', canonicalUrl);
        this.setOG('og:type', isWatchPage ? 'video.movie' : 'video.other');
        this.setOG('og:site_name', this.siteName);

        this.setTwitter('twitter:title', pageTitle);
        this.setTwitter('twitter:description', metaDesc);
        this.setTwitter('twitter:image', absoluteThumb);

        // 6. Set Canonical Tag chuẩn (Loại bỏ query tracking thừa)
        this.setCanonical(canonicalUrl);

        // 7. Inject Schema.org JSON-LD
        this.injectMovieSchema(movie, metaDesc, absoluteThumb, canonicalUrl, isWatchPage, episodeInfo);
        this.injectBreadcrumbSchema(movie, isWatchPage);
    },

    setMeta(name, content) {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    },

    setOG(property, content) {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('property', property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    },

    setTwitter(name, content) {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    },

    setCanonical(urlStr) {
        try {
            let link = document.querySelector('link[rel="canonical"]');
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'canonical');
                document.head.appendChild(link);
            }
            link.setAttribute('href', urlStr);
        } catch (e) {
            console.error('[SEO] Error setting canonical:', e);
        }
    },

    injectMovieSchema(movie, desc, imgUrl, pageUrl, isWatchPage, episodeInfo) {
        const oldSchema = document.getElementById('aphim-movie-ld-schema');
        if (oldSchema) oldSchema.remove();

        const name = movie.name || movie.title || '';
        const isSeries = movie.type === 'series';
        const schemaType = isSeries ? 'TVSeries' : 'Movie';

        const categories = Array.isArray(movie.category) 
            ? movie.category.map(c => typeof c === 'object' ? c.name : c) 
            : ['Phim mới'];
        const actors = Array.isArray(movie.actor) 
            ? movie.actor.map(a => ({ "@type": "Person", "name": typeof a === 'object' ? a.name : a })) 
            : [];
        const directors = Array.isArray(movie.director) 
            ? movie.director.map(d => ({ "@type": "Person", "name": typeof d === 'object' ? d.name : d })) 
            : [];

        const graph = [];

        // 1. Movie / TVSeries Schema
        const movieSchema = {
            "@context": "https://schema.org",
            "@type": schemaType,
            "name": name,
            "alternateName": movie.origin_name || "",
            "url": pageUrl,
            "image": imgUrl,
            "description": desc,
            "dateCreated": String(movie.year || new Date().getFullYear()),
            "genre": categories,
            "actor": actors.slice(0, 8),
            "director": directors.slice(0, 3),
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "9.6",
                "bestRating": "10",
                "ratingCount": "2480"
            }
        };
        graph.push(movieSchema);

        // 2. VideoObject Schema (Nếu đang ở trang xem phim - bí quyết video search top 1)
        if (isWatchPage) {
            const landscapeThumb = movie.thumb_url 
                ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : `https://phimimg.com/${movie.thumb_url.replace(/^\//, '')}`)
                : imgUrl;
            const posterThumb = movie.poster_url
                ? (movie.poster_url.startsWith('http') ? movie.poster_url : `https://phimimg.com/${movie.poster_url.replace(/^\//, '')}`)
                : '';
            const thumbList = [landscapeThumb, posterThumb].filter(Boolean);

            const videoSchema = {
                "@context": "https://schema.org",
                "@type": "VideoObject",
                "name": `Xem phim ${name} ${episodeInfo ? '- ' + episodeInfo : ''} Full HD Vietsub`,
                "description": desc,
                "thumbnailUrl": thumbList.length ? thumbList : [imgUrl],
                "uploadDate": movie.created?.time ? new Date(movie.created.time).toISOString() : new Date().toISOString(),
                "contentUrl": pageUrl,
                "embedUrl": pageUrl,
                "potentialAction": {
                    "@type": "SeekToAction",
                    "target": `${pageUrl}?t={seek_to_second_number}`,
                    "startOffset-input": "required name=seek_to_second_number"
                }
            };
            graph.push(videoSchema);
        }

        const script = document.createElement('script');
        script.id = 'aphim-movie-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(graph.length === 1 ? graph[0] : { "@context": "https://schema.org", "@graph": graph });
        document.head.appendChild(script);
    },

    injectBreadcrumbSchema(movie, isWatchPage) {
        if (!movie) return;

        const oldSchema = document.getElementById('aphim-breadcrumb-ld-schema');
        if (oldSchema) oldSchema.remove();

        const name = movie.name || movie.title || '';
        const slug = movie.slug || '';
        const category = Array.isArray(movie.category) && movie.category[0] 
            ? (typeof movie.category[0] === 'object' ? movie.category[0].name : movie.category[0]) 
            : 'Phim Mới';

        const breadcrumbs = [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Trang Chủ",
                "item": `${this.domain}/`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": category,
                "item": `${this.domain}/categories`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": name,
                "item": `${this.domain}/phim/${slug}`
            }
        ];

        if (isWatchPage) {
            breadcrumbs.push({
                "@type": "ListItem",
                "position": 4,
                "name": "Xem Phim",
                "item": `${this.domain}/xem-phim/${slug}`
            });
        }

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs
        };

        const script = document.createElement('script');
        script.id = 'aphim-breadcrumb-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
    },

    // Injects ItemList Schema for home movie carousels
    injectItemListSchema(movies) {
        if (!movies || !Array.isArray(movies) || movies.length === 0) return;

        const oldSchema = document.getElementById('aphim-itemlist-ld-schema');
        if (oldSchema) oldSchema.remove();

        const itemListElement = movies.slice(0, 24).map((movie, index) => {
            const name = movie.name || movie.title;
            const thumb = movie.thumb_url || movie.poster_url || '';
            const img = thumb ? (thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.replace(/^\//, '')}`) : `${this.domain}/android-chrome-512x512.png`;
            const slug = movie.slug || '';
            const movieUrl = `${this.domain}/phim/${slug}`;

            return {
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Movie",
                    "name": name,
                    "url": movieUrl,
                    "image": img,
                    "dateCreated": String(movie.year || new Date().getFullYear()),
                    "description": `Xem phim ${name} chất lượng cao Full HD Vietsub tại APhim Super.`
                }
            };
        });

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Kho Phim Mới Cập Nhật - APhim Super",
            "numberOfItems": itemListElement.length,
            "itemListElement": itemListElement
        };

        const script = document.createElement('script');
        script.id = 'aphim-itemlist-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
    }
};

// Khởi chạy schema WebSite & Organization khi DOM sẵn sàng
(function initAPhimSEO() {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('aphim-global-org-schema')) return;

        const globalSchema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "name": "APhim Super",
                    "alternateName": ["APhim", "APhim Store", "Aphim.io.vn", "Xem Phim APhim"],
                    "url": "https://aphim.store/",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://aphim.store/search?keyword={search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                },
                {
                    "@type": "Organization",
                    "name": "APhim Super",
                    "url": "https://aphim.store/",
                    "logo": "https://aphim.store/android-chrome-512x512.png",
                    "description": "APhim Super - Nền tảng xem phim trực tuyến tốc độ cao, Full HD Vietsub Thuyết minh mượt mà miễn phí hàng đầu Việt Nam."
                }
            ]
        };

        const script = document.createElement('script');
        script.id = 'aphim-global-org-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(globalSchema);
        document.head.appendChild(script);
    });
})();
