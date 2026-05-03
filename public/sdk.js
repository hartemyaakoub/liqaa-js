/*!
 * LIQAA SDK 1.0.0 — drop-in messaging + video for any website.
 * https://liqaa.io/docs/sdk · MIT License
 *
 * Usage:
 *   <script src="https://liqaa.io/sdk.js"
 *           data-key="pk_live_xxx"
 *           data-token="<sdk_token from your server>"></script>
 *
 * The sdk_token is obtained server-side via POST /api/public/v1/sdk-token
 * (your server signs with sk_live_, exchanges for short-lived JWT).
 *
 * After load, window.LIQAA is available:
 *   LIQAA.openConversationWith(userEmail) — open chat with someone
 *   LIQAA.startCall(userEmail)            — start video call
 *   LIQAA.show() / hide() / toggle()      — control bubble
 */
(function () {
    'use strict';
    if (window.LIQAA) return;

    var script = document.currentScript || (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && scripts[i].src.indexOf('/sdk.js') !== -1) return scripts[i];
        }
        return null;
    })();
    if (!script) { console.error('[LIQAA SDK] cannot locate own script tag'); return; }

    var publicKey = script.getAttribute('data-key') || '';
    var sdkToken  = script.getAttribute('data-token') || '';
    var apiBase   = script.getAttribute('data-api') || 'https://liqaa.io/api/public/v1';
    var embedBase = script.getAttribute('data-embed') || 'https://liqaa.io';
    var accent    = script.getAttribute('data-accent') || '#1d4ed8';
    var position  = script.getAttribute('data-position') || 'right';

    if (!publicKey) { console.error('[LIQAA SDK] data-key (pk_live_...) is required'); return; }
    if (!sdkToken) { console.error('[LIQAA SDK] data-token (SDK JWT) is required — exchange via /api/public/v1/sdk-token'); return; }

    // Decode token payload to read plan + hide_branding flags (token format: tkc_<b64payload>.<b64sig>)
    var tokenInfo = { hb: false, plan: 'free' };
    try {
        var b64 = sdkToken.replace(/^tkc_/, '').split('.')[0];
        var json = atob(b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
        var p = JSON.parse(json);
        tokenInfo.hb = !!p.hb;
        tokenInfo.plan = p.plan || 'free';
    } catch (e) { /* malformed token — keep defaults */ }
    var hideBranding = tokenInfo.hb;
    // Allow partner to FORCE-show branding (rare, e.g. attribution requirement) via data-show-branding="true"
    if (script.getAttribute('data-show-branding') === 'true') hideBranding = false;

    var state = {
        isOpen: false,
        view: 'list',         /* 'list' | 'chat' | 'call' */
        active: null,         /* {externalId, otherEmail, otherName} */
        ringing: null,
        audioCtx: null,
        ringInterval: null,
    };
    var dom = { root: null, bubble: null, panel: null, ring: null };

    /* ─────────── Network helpers ─────────── */
    function api(path, opts) {
        opts = opts || {};
        return fetch(apiBase + path, {
            method: opts.method || 'GET',
            headers: Object.assign({ 'Authorization': 'Bearer ' + sdkToken, 'Content-Type': 'application/json' }, opts.headers || {}),
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        }).then(function (r) { return r.json(); });
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ─────────── UI ─────────── */
    function injectStyles() {
        if (document.getElementById('liqaa-sdk-styles')) return;
        var style = document.createElement('style');
        style.id = 'liqaa-sdk-styles';
        style.textContent = ''
            + '#liqaa-sdk-root{position:fixed;bottom:20px;' + (position === 'left' ? 'left' : 'right') + ':20px;z-index:2147483600;font-family:Geist,-apple-system,"Segoe UI",sans-serif;direction:ltr;}'
            + '.liqaa-bubble{width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;background:' + accent + ';color:#fff;box-shadow:0 14px 32px -10px rgba(15,23,42,.4);display:flex;align-items:center;justify-content:center;position:relative;transition:transform .2s cubic-bezier(.34,1.56,.64,1);outline:none;padding:0;}'
            + '.liqaa-bubble:hover{transform:scale(1.06);}'
            + '.liqaa-bubble:active{transform:scale(.96);}'
            + '.liqaa-badge{position:absolute;top:-2px;' + (position === 'left' ? 'right' : 'left') + ':-2px;min-width:22px;height:22px;border-radius:11px;background:#dc2626;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 6px;border:2px solid #fff;animation:liqaa-pulse 2s infinite;}'
            + '.liqaa-panel{position:absolute;bottom:74px;' + (position === 'left' ? 'left' : 'right') + ':0;width:380px;height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:18px;box-shadow:0 20px 60px -16px rgba(15,23,42,.32);border:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;animation:liqaa-pop .25s cubic-bezier(.34,1.56,.64,1);}'
            + '.liqaa-header{padding:14px 16px;background:linear-gradient(135deg,' + accent + ',' + darken(accent, 15) + ');color:#fff;display:flex;align-items:center;gap:10px;}'
            + '.liqaa-title{font-weight:800;font-size:15px;flex:1;min-width:0;}'
            + '.liqaa-iconbtn{background:rgba(255,255,255,.18);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}'
            + '.liqaa-iconbtn:hover{background:rgba(255,255,255,.28);}'
            + '.liqaa-body{flex:1;overflow-y:auto;background:#f8fafc;}'
            + '.liqaa-thread{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px;background:#f8fafc;}'
            + '.liqaa-msg-bubble{max-width:78%;padding:9px 13px;border-radius:18px;font-size:13px;line-height:1.5;word-break:break-word;}'
            + '.liqaa-msg-me{background:' + accent + ';color:#fff;align-self:flex-end;}'
            + '.liqaa-msg-other{background:#fff;color:#0f172a;border:1px solid #e2e8f0;align-self:flex-start;}'
            + '.liqaa-composer{padding:10px 12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;background:#fff;flex-shrink:0;}'
            + '.liqaa-composer input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:22px;font:inherit;font-size:14px;outline:none;background:#f8fafc;}'
            + '.liqaa-composer input:focus{border-color:' + accent + ';background:#fff;}'
            + '.liqaa-send-btn{width:38px;height:38px;border-radius:50%;background:' + accent + ';color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}'
            + '.liqaa-spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:' + accent + ';border-radius:50%;animation:liqaa-spin .8s linear infinite;margin:0 auto;}'
            + '@keyframes liqaa-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.12);}}'
            + '@keyframes liqaa-pop{0%{transform:translateY(8px) scale(.96);opacity:0;}100%{transform:translateY(0) scale(1);opacity:1;}}'
            + '@keyframes liqaa-spin{to{transform:rotate(360deg);}}'
            + '@keyframes liqaa-blink{0%,100%{opacity:1}50%{opacity:.3}}'
            + '@media (max-width:600px){.liqaa-panel{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;border-radius:0!important;}}'
            + '@media (max-width:600px){.liqaa-composer input{font-size:16px!important;}}';
        document.head.appendChild(style);
    }

    function darken(hex, percent) {
        var num = parseInt(hex.replace('#', ''), 16);
        var amt = Math.round(2.55 * percent);
        var R = Math.max(0, (num >> 16) - amt);
        var G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        var B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    function mountRoot() {
        if (dom.root) return;
        injectStyles();
        var root = document.createElement('div');
        root.id = 'liqaa-sdk-root';
        var bubble = document.createElement('button');
        bubble.className = 'liqaa-bubble';
        bubble.type = 'button';
        bubble.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6 2 11c0 2.6 1.3 5 3.5 6.6V22l3.7-2.1c.9.2 1.8.3 2.8.3 5.5 0 10-4 10-9S17.5 2 12 2z"/></svg>';
        bubble.addEventListener('click', toggle);
        root.appendChild(bubble);
        document.body.appendChild(root);
        dom.root = root;
        dom.bubble = bubble;
    }

    function toggle() {
        state.isOpen ? closePanel() : openPanel();
    }
    function openPanel() {
        state.isOpen = true;
        renderListView();
    }
    function closePanel() {
        state.isOpen = false;
        if (dom.panel) { dom.panel.remove(); dom.panel = null; }
        state.view = 'list'; state.active = null;
    }

    function renderListView() {
        if (dom.panel) dom.panel.remove();
        dom.panel = document.createElement('div');
        dom.panel.className = 'liqaa-panel';
        dom.panel.innerHTML = ''
            + '<div class="liqaa-header">'
            +   '<div class="liqaa-title">'
            +     '<div style="font-weight:800;font-size:15px;">Messages</div>'
            +     (hideBranding ? '' : '<div style="font-size:11px;opacity:.85;font-weight:500;">Powered by LIQAA</div>')
            +   '</div>'
            +   '<button type="button" class="liqaa-iconbtn" data-liqaa-close>'
            +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
            +   '</button>'
            + '</div>'
            + '<div class="liqaa-body" id="liqaa-list-body" style="padding:60px 20px;text-align:center;color:#94a3b8;">'
            +   '<div class="liqaa-spinner"></div>'
            +   '<div style="font-size:12px;margin-top:14px;">Loading…</div>'
            + '</div>';
        dom.root.appendChild(dom.panel);
        wireClose();
        // For SDK v1.0 we don't have a generic /conversations list endpoint
        // tied to the SDK token (it lists per platform — partner has to call
        // openConversationWith()). Show a friendly empty state.
        setTimeout(function () {
            var b = document.getElementById('liqaa-list-body');
            if (!b) return;
            b.innerHTML = '<div style="padding:48px 24px;text-align:center;color:#94a3b8;">'
                + '<div style="width:64px;height:64px;border-radius:50%;background:' + accent + '11;color:' + accent + ';display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">'
                +   '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
                + '</div>'
                + '<div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:6px;">Direct messaging</div>'
                + '<div style="font-size:12px;line-height:1.6;">Call LIQAA.openConversationWith(email) to start</div>'
                + '</div>';
        }, 200);
    }

    function wireClose() {
        var x = dom.panel.querySelector('[data-liqaa-close]');
        if (x) x.addEventListener('click', closePanel);
    }

    /* ─────────── Public API ─────────── */
    window.LIQAA = {
        version: '1.0.0',

        toggle: toggle,
        show: openPanel,
        hide: closePanel,

        /**
         * Open conversation with another user (their email).
         * The conversation persists across calls.
         */
        openConversationWith: function (otherEmail, otherName) {
            if (!state.isOpen) openPanel();
            // Use stable conversation id derived from sorted email pair
            var convId = 'sdk-' + sortPair(otherEmail).replace(/[^a-z0-9]/gi, '-');
            api('/conversations', {
                method: 'POST',
                body: {
                    caller_email: '__from_token__',     /* server reads from JWT */
                    caller_name: '__from_token__',
                    callee_email: otherEmail,
                    callee_name: otherName || otherEmail,
                    external_conversation_id: convId,
                    title: 'LIQAA SDK chat',
                },
            }).then(function (res) {
                if (res && res.ok) {
                    state.active = { externalId: convId, otherEmail: otherEmail, otherName: otherName, joinUrl: res.join_url };
                    renderChatView();
                }
            });
        },

        /**
         * Start an instant video call with the given user.
         * Opens the LIQAA call iframe inside the bubble.
         */
        startCall: function (otherEmail, otherName) {
            if (!state.isOpen) openPanel();
            var convId = 'sdk-' + sortPair(otherEmail).replace(/[^a-z0-9]/gi, '-');
            api('/conversations', {
                method: 'POST',
                body: {
                    caller_email: '__from_token__',
                    caller_name: '__from_token__',
                    callee_email: otherEmail,
                    callee_name: otherName || otherEmail,
                    external_conversation_id: convId,
                    title: 'LIQAA SDK call',
                },
            }).then(function (res) {
                if (res && res.ok && res.join_url) {
                    renderEmbeddedCall(res.join_url, otherName || otherEmail);
                }
            });
        },
    };

    function sortPair(other) {
        return [other.toLowerCase(), location.hostname].sort().join('--');
    }

    function renderChatView() {
        // Reuse the same panel; for v1.0 we just show a placeholder + composer
        if (!dom.panel) openPanel();
        if (!state.active) return;
        dom.panel.innerHTML = ''
            + '<div class="liqaa-header">'
            +   '<button type="button" class="liqaa-iconbtn" data-liqaa-back><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>'
            +   '<div class="liqaa-title">'
            +     '<div style="font-weight:800;font-size:14px;">' + esc(state.active.otherName || state.active.otherEmail) + '</div>'
            +     '<div style="font-size:11px;opacity:.85;font-weight:500;">Connected</div>'
            +   '</div>'
            +   '<button type="button" class="liqaa-iconbtn" data-liqaa-call title="Video call">'
            +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'
            +   '</button>'
            +   '<button type="button" class="liqaa-iconbtn" data-liqaa-close><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
            + '</div>'
            + '<div class="liqaa-thread" id="liqaa-thread"><div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px;">Start a video call to talk</div></div>'
            + '<form class="liqaa-composer" data-liqaa-form>'
            +   '<input type="text" placeholder="Type a message…" autocomplete="off"/>'
            +   '<button type="submit" class="liqaa-send-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
            + '</form>';
        var back = dom.panel.querySelector('[data-liqaa-back]');
        if (back) back.addEventListener('click', renderListView);
        var call = dom.panel.querySelector('[data-liqaa-call]');
        if (call) call.addEventListener('click', function () {
            if (state.active && state.active.joinUrl) renderEmbeddedCall(state.active.joinUrl, state.active.otherName);
        });
        wireClose();
    }

    function renderEmbeddedCall(joinUrl, otherName) {
        if (!dom.panel) openPanel();
        var src = joinUrl + (joinUrl.indexOf('?') === -1 ? '?' : '&') + 'embed=1&host=' + encodeURIComponent(location.hostname) + '&accent=' + encodeURIComponent(accent);
        dom.panel.innerHTML = ''
            + '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(15,23,42,.92);color:#fff;flex-shrink:0;">'
            +   '<div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:liqaa-blink 1.5s infinite;"></div>'
            +   '<div style="flex:1;font-size:12px;font-weight:800;">' + esc(otherName || '') + '</div>'
            +   '<button type="button" data-liqaa-end style="background:#dc2626;color:#fff;border:none;padding:6px 14px;border-radius:99px;font-weight:800;font-size:11px;cursor:pointer;">End</button>'
            + '</div>'
            + '<iframe src="' + esc(src) + '" allow="camera; microphone; autoplay; display-capture; clipboard-write; fullscreen" allowfullscreen style="border:none;flex:1;width:100%;background:#0b1437;"></iframe>';
        var end = dom.panel.querySelector('[data-liqaa-end]');
        if (end) end.addEventListener('click', renderChatView);

        // Listen for postMessage from iframe
        window.addEventListener('message', function onMsg(e) {
            if (!e.data || e.data.source !== 'liqaa-embed') return;
            if (e.data.type === 'call_ended' || e.data.type === 'leave') {
                window.removeEventListener('message', onMsg);
                renderChatView();
            }
        });
    }

    /* ─────────── Bootstrap ─────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountRoot);
    } else {
        mountRoot();
    }
})();
