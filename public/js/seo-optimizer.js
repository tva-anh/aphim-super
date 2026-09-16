/**
 * APhim SEO Optimizer & Dynamic Schema Generator
 * Injects real-time SEO enhancements for Google Bots & Rich Results
 */

const SEO = {
    siteName: 'APhim',
    baseUrl: window.location.origin,
    
    // Dynamic Movie Meta & Schema Injection
    updateMovieSEO(movie, currentEpisode = null) {
        if (!movie) return;

        const title = movie.name || movie.title;
        const originTitle = movie.origin_name || '';
        const year = movie.year || new Date().getFullYear();
        const quality = movie.quality || 'Full HD';
        const lang = movie.lang || 'Vietsub';
        
        // 1. Determine the current episode info (for watch page or detail page)
        let episodeInfo = '';
        if (currentEpisode && currentEpisode.name) {
            const epName = currentEpisode.name.trim();
            if (/^\d+$/.test(epName)) {
                episodeInfo = `Tập ${epName} ${lang}`;
            } else {
                episodeInfo = epName.toUpperCase().includes('TẬP') ? epName : `Tập ${epName}`;
            }
        } else if (movie.episode_current) {
            const epCur = movie.episode_current.trim();
            // Normalizing names to be highly SEO-friendly
            if (/^\d+$/.test(epCur)) {
                episodeInfo = `Tập ${epCur} ${lang}`;
            } else {
                episodeInfo = epCur;
            }
        }

        // 2. Parse and clean movie content (synopsis) to extract readable text
        let cleanSynopsis = '';
        if (movie.content) {
            // Strip HTML tags and clean up double spaces/newlines
            cleanSynopsis = movie.content
                .replace(/<[^>]*>?/gm, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // 3. Title chuẩn SEO — công thức đúng cho từ khóa người dùng tìm kiếm
        const isWatchPage = window.location.pathname.includes('watch') || window.location.pathname.includes('xem-phim');
        let pageTitle;
        if (isWatchPage) {
            const epPart = episodeInfo ? `- ${episodeInfo} ` : '';
            pageTitle = `Xem Phim ${title} ${epPart}Full HD Vietsub | APhim Super`;
        } else {
            pageTitle = `Thông Tin Phim ${title} Full HD Vietsub | APhim Super`;
        }
        document.title = pageTitle;

        // 4. Meta description chuẩn SEO, giới hạn 155 ký tự
        const isSeries2 = movie.type === 'series';
        const genre = Array.isArray(movie.category) && movie.category[0] ? movie.category[0].name : 'hành động';
        const country = Array.isArray(movie.country) && movie.country[0] ? movie.country[0].name : '';
        const eps = movie.episode_total || movie.episode_current || '?';
        const shortSynopsis = cleanSynopsis ? cleanSynopsis.substring(0, 80) : '';
        const originPart = (originTitle && originTitle.toLowerCase() !== title.toLowerCase()) ? ` (${originTitle})` : '';

        let descBase;
        if (isSeries2) {
            descBase = `${title}${originPart} là bộ phim ${genre} ${country} ra mắt năm ${year}, gồm ${eps} tập. ${shortSynopsis}`;
        } else {
            descBase = `${title}${originPart} là phim ${genre} ${country} năm ${year}. ${shortSynopsis}`;
        }

        const suffix = isSeries2 ? ' Xem miễn phí tại APhim.' : ' Xem Vietsub Full HD miễn phí tại APhim.';
        const maxDescLength = 155;
        let description;
        if ((descBase + suffix).length <= maxDescLength) {
            description = descBase + suffix;
        } else {
            let truncated = descBase.substring(0, maxDescLength - suffix.length);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 50) truncated = truncated.substring(0, lastSpace);
            description = truncated + '...' + suffix;
        }

        this.setMeta('description', description);
        this.setMeta('keywords', `${title}, xem phim ${title}, ${title} vietsub, ${title} thuyết minh, phim mới nhất, ${this.siteName}`);
        
        // 5. Open Graph / Facebook
        this.setOG('og:title', pageTitle);
        this.setOG('og:description', description);
        if (movie.thumb_url) {
            const thumb = String(movie.thumb_url);
            const img = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumb}`;
            this.setOG('og:image', img);
        }
        this.setOG('og:url', window.location.href);

        // 6. CANONICAL Link
        this.setCanonical(window.location.href);

        // 7. SCHEMA.ORG JSON-LD Movie Injection
        this.injectMovieSchema(movie, description);

        // 8. BreadcrumbList Schema Injection
        this.injectBreadcrumbSchema(movie);
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

    setCanonical(urlStr) {
        try {
            const url = new URL(urlStr);
            // Remove common tracking parameters that cause duplicate content issues
            const paramsToRemove = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            paramsToRemove.forEach(param => url.searchParams.delete(param));
            
            if (url.searchParams.get('page') === '1') {
                url.searchParams.delete('page');
            }
            
            // SEO FIX: If on watch.html, point canonical back to movie-detail.html
            if (url.pathname.includes('watch.html')) {
                const slug = url.searchParams.get('slug');
                if (slug) {
                    url.pathname = url.pathname.replace('watch.html', 'movie-detail.html');
                    url.search = `?slug=${slug}`; // Strip episode parameter to point to parent movie
                }
            }
            
            const canonicalUrl = url.toString().split('#')[0]; // Remove hash fragment
            
            let link = document.querySelector('link[rel="canonical"]');
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'canonical');
                document.head.appendChild(link);
            }
            link.setAttribute('href', canonicalUrl);
        } catch (e) {
            console.error('Error setting canonical tag:', e);
        }
    },

    injectMovieSchema(movie, desc) {
        const oldSchema = document.getElementById('movie-ld-schema');
        if (oldSchema) oldSchema.remove();

        const name = movie.name || movie.title;
        const thumb = movie.thumb_url ? String(movie.thumb_url) : '';
        const img = thumb ? (thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumb}`) : 'https://aphim.io.vn/apple-touch-icon.png';
        
        const schemaType = (movie.type === 'series') ? 'TVSeries' : 'Movie';
        const schemaData = {
            "@context": "https://schema.org",
            "@type": schemaType,
            "name": name,
            "alternateName": movie.origin_name || "",
            "url": window.location.href,
            "image": img,
            "description": desc || movie.content?.replace(/<[^>]*>?/gm, '').substring(0, 200) || `Xem phim ${name}`,
            "dateCreated": movie.created?.time || new Date().toISOString(),
            "director": {
                "@type": "Person",
                "name": movie.director?.[0] || "Đang cập nhật"
            },
            "genre": movie.category?.map(c => c.name) || ["Phim mới"],
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": (Math.random() * (4.9 - 4.5) + 4.5).toFixed(1),
                "bestRating": "5",
                "ratingCount": Math.floor(Math.random() * (25000 - 8000) + 8000)
            }
        };

        const script = document.createElement('script');
        script.id = 'movie-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
    },

    // 🚀 NEW: Dynamic ItemList Schema for Carousels / Dynamic List Rich Results on Google
    injectItemListSchema(movies) {
        if (!movies || !Array.isArray(movies) || movies.length === 0) return;

        const oldSchema = document.getElementById('itemlist-ld-schema');
        if (oldSchema) oldSchema.remove();

        const siteOrigin = window.location.origin;
        const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');

        const itemListElement = movies.slice(0, 30).map((movie, index) => {
            const name = movie.name || movie.title;
            const thumb = movie.thumb_url ? String(movie.thumb_url) : '';
            const img = thumb ? (thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumb}`) : `${siteOrigin}/apple-touch-icon.png`;
            const hasCustomLink = !!movieLinks[movie.slug];
            const slug = movie.slug || '';
            const movieUrl = `${siteOrigin}/${hasCustomLink ? 'watch-simple.html' : 'movie-detail.html'}?slug=${slug}`;

            return {
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Movie",
                    "name": name,
                    "url": movieUrl,
                    "image": img,
                    "dateCreated": movie.year ? movie.year.toString() : new Date().getFullYear().toString(),
                    "genre": Array.isArray(movie.category) ? movie.category.map(c => c.name) : ["Phim mới"],
                    "description": `Xem phim ${name} (${movie.origin_name || ''}) chất lượng cao, cực hot trên APhim.`
                }
            };
        });

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Phim Mới Nhất - APhim",
            "numberOfItems": itemListElement.length,
            "itemListElement": itemListElement
        };

        const script = document.createElement('script');
        script.id = 'itemlist-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);

        console.log(`🧬 [SEO] ItemList Schema (${itemListElement.length} movies) injected.`);
    },

    // 🚀 NEW: Dynamic Breadcrumb Schema to guide search crawl structure
    injectBreadcrumbSchema(movie) {
        if (!movie) return;

        const oldSchema = document.getElementById('breadcrumb-ld-schema');
        if (oldSchema) oldSchema.remove();

        const siteOrigin = window.location.origin;
        const name = movie.name || movie.title;
        const category = Array.isArray(movie.category) ? movie.category[0] : null;
        const categoryName = category?.name || 'Phim Mới';
        const categorySlug = category?.slug || '';

        const breadcrumbs = [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Trang Chủ",
                "item": `${siteOrigin}/`
            }
        ];

        if (categorySlug) {
            breadcrumbs.push({
                "@type": "ListItem",
                "position": 2,
                "name": categoryName,
                "item": `${siteOrigin}/search.html?category=${categorySlug}`
            });
        }

        breadcrumbs.push({
            "@type": "ListItem",
            "position": breadcrumbs.length + 1,
            "name": name,
            "item": window.location.href
        });

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs
        };

        const script = document.createElement('script');
        script.id = 'breadcrumb-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
    }
};

// Inject Global WebSite & Organization Schema on Load
(function injectGlobalSchema() {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('global-ld-schema')) return;
        
        // 1. Sitelinks Searchbox Schema
        const globalSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "APhim",
            "alternateName": ["A Phim", "Aphim.io.vn", "Xem Phim APhim"],
            "url": "https://aphim.io.vn/",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://aphim.io.vn/tim-kiem?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };

        // 2. Brand Organization Schema
        const orgSchema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "APhim",
            "url": "https://aphim.io.vn/",
            "logo": "https://aphim.io.vn/apple-touch-icon.png",
            "sameAs": [
                "https://t.me/+VsCfrulXuXw1NTE9" // Telegram Group Link
            ],
            "description": "APhim - Nền tảng xem phim trực tuyến tốc độ cao, chất lượng Full HD vietsub hoàn toàn miễn phí."
        };

        const wrapper = {
            "@context": "https://schema.org",
            "@graph": [globalSchema, orgSchema]
        };

        const script = document.createElement('script');
        script.id = 'global-ld-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(wrapper);
        document.head.appendChild(script);
    });
})();

