// ==UserScript==
// @name         Instagram Download Pro (V2.1 - Ultra Extraction)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Motor de extracción mejorado para saltar protecciones de Instagram. Soporte avanzado de Vídeo.
// @author       Antigravity (Coding Assistant)
// @match        https://www.instagram.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      cdninstagram.com
// @connect      fbcdn.net
// @connect      instagram.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Diseño premium minimalista y reactivo
    GM_addStyle(`
        .igt-download-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 10000;
            margin-left: 8px;
        }

        .igt-download-btn:hover {
            transform: scale(1.15);
            background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
            border-color: transparent;
            box-shadow: 0 0 15px rgba(220, 39, 67, 0.6);
        }

        .igt-download-btn svg {
            fill: white;
            width: 20px;
            height: 20px;
        }

        .igt-story-btn { position: absolute; top: 20px; right: 60px; background: rgba(0, 0, 0, 0.3); }
        .igt-reel-btn { margin-bottom: 12px; }
    `);

    const DOWNLOAD_ICON = \`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6H8l4 4 4-4h-3V7z"/></svg>\`;

    /**
     * MOTOR DE EXTRACCIÓN ULTRA (V2.1)
     */
    function findRealMediaUrl(container) {
        // Estrategia 1: Buscar etiquetas de video directas que NO sean blobs
        const videos = container.querySelectorAll('video');
        for (const v of videos) {
            if (v.src && !v.src.startsWith('blob:')) return { url: v.src, type: 'mp4' };
        }

        // Estrategia 2: Escaneo agresivo de scripts JSON (patrones múltiples)
        const scripts = document.querySelectorAll('script');
        const patterns = [
            /"video_url"\s*:\s*"(https?:\/\/[^"]+)"/g,
            /"base_url"\s*:\s*"(https?:\/\/[^"]+)"/g,
            /src\s*:\s*"(https?:\/\/[^"]+mp4[^"]*)"/g
        ];

        for (const script of scripts) {
            const content = script.innerText;
            if (!content.includes('fbcdn.net')) continue;

            for (const pattern of patterns) {
                const matches = [...content.matchAll(pattern)];
                if (matches.length > 0) {
                    // Tomamos la última coincidencia que tenga mp4 en la URL
                    const lastMatch = matches.reverse().find(m => m[1].includes('.mp4') || m[1].includes('video'));
                    if (lastMatch) {
                        const url = lastMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                        return { url, type: 'mp4' };
                    }
                }
            }
        }

        // Estrategia 3: Buscar en preloads de video
        const preloads = document.querySelectorAll('link[as="video"], link[rel="preload"]');
        for (const link of preloads) {
            if (link.href && link.href.includes('fbcdn.net') && (link.href.includes('.mp4') || link.as === 'video')) {
                return { url: link.href, type: 'mp4' };
            }
        }

        // Estrategia 4: Fotos (Simple)
        const images = container.querySelectorAll('img:not([alt*="perfil"])');
        // El carrusel puede tener varias imágenes, intentamos pillar la que está en el viewport
        let bestImg = null;
        if (images.length > 1) {
            const centerX = window.innerWidth / 2;
            let minDiff = Infinity;
            images.forEach(img => {
                const rect = img.getBoundingClientRect();
                const diff = Math.abs(centerX - (rect.left + rect.width / 2));
                if (diff < minDiff) { minDiff = diff; bestImg = img; }
            });
        } else {
            bestImg = images[0];
        }

        if (bestImg && bestImg.src && !bestImg.src.startsWith('blob:')) {
            return { url: bestImg.src, type: 'jpg' };
        }

        return null;
    }

    /**
     * MOTOR DE DESCARGA
     */
    function triggerDownload(url, type, username) {
        if (!url) return;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = \`IG_\${username}_\${timestamp}.\${type}\`;

        console.log('Descargando:', url);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onload: function(res) {
                if (res.status === 200) {
                    const blobUrl = window.URL.createObjectURL(res.response);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                } else {
                    window.open(url, '_blank');
                }
            },
            onerror: () => window.open(url, '_blank')
        });
    }

    /**
     * INYECTORES
     */
    function injectFeed(post) {
        if (post.querySelector('.igt-download-btn')) return;
        const bar = post.querySelector('section');
        if (!bar) return;

        const btn = document.createElement('div');
        btn.className = 'igt-download-btn';
        btn.innerHTML = DOWNLOAD_ICON;
        btn.title = 'Descargar Media';
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const media = findRealMediaUrl(post);
            const user = post.querySelector('header a[role="link"]')?.textContent.trim() || 'insta';
            if (media) {
                triggerDownload(media.url, media.type, user);
            } else {
                // Notificación premium en lugar de alert
                const originalText = btn.innerHTML;
                btn.innerHTML = '❌';
                setTimeout(() => btn.innerHTML = originalText, 2000);
                console.error('No se pudo encontrar la URL de este medio.');
            }
        };

        const saveBtn = bar.querySelector('svg[aria-label="Guardar"]')?.closest('div[role="button"]');
        if (saveBtn) {
            saveBtn.parentElement.style.display = 'flex';
            saveBtn.parentElement.appendChild(btn);
        } else {
            bar.firstChild?.appendChild(btn);
        }
    }

    function injectStories() {
        const storyContainer = document.querySelector('section[role="region"]');
        if (storyContainer && !storyContainer.querySelector('.igt-story-btn')) {
            const btn = document.createElement('div');
            btn.className = 'igt-download-btn igt-story-btn';
            btn.innerHTML = DOWNLOAD_ICON;
            btn.onclick = () => {
                const media = findRealMediaUrl(document.body);
                const user = document.querySelector('header a[role="link"]')?.textContent.trim() || 'story';
                if (media) triggerDownload(media.url, media.type, user);
            };
            storyContainer.appendChild(btn);
        }
    }

    function injectReels() {
        const reelSections = document.querySelectorAll('div[role="presentation"] section');
        reelSections.forEach(section => {
            if (!section.querySelector('.igt-reel-btn')) {
                const btn = document.createElement('div');
                btn.className = 'igt-download-btn igt-reel-btn';
                btn.innerHTML = DOWNLOAD_ICON;
                btn.onclick = () => {
                    const media = findRealMediaUrl(document.body);
                    if (media) triggerDownload(media.url, media.type, 'reel');
                };
                section.appendChild(btn);
            }
        });
    }

    /**
     * ORQUESTADOR
     */
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'ARTICLE') injectFeed(node);
                node.querySelectorAll('article').forEach(injectFeed);
                if (window.location.pathname.includes('/stories/')) injectStories();
                if (window.location.pathname.includes('/reels/') || window.location.pathname.includes('/reel/')) injectReels();
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Carga inicial
    document.querySelectorAll('article').forEach(injectFeed);
    if (window.location.pathname.includes('/stories/')) injectStories();
    if (window.location.pathname.includes('/reels/')) injectReels();

    console.log('%c IG Pro V2.1 Initialized ', 'background: #f09433; color: white; border-radius: 4px; padding: 2px 5px;');
})();