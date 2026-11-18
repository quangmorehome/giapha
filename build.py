#!/usr/bin/env python3
"""Ghép các tệp trong src/ thành dist/index.html (một tệp, ảnh nhúng dạng data URI)."""
import base64, os, sys, json
R = os.path.dirname(os.path.abspath(__file__)); VERSION = "1.47.0"
ORDER = ["lunar","kinship","privacy","checks","gedcom","data","io","xlsx","store","cloud","i18n","vanban","lichsu","icons","ui_core","ui_people","ui_diagram","ui_more","ui_stats","ui_admin","ui_map","ui_polish","ui_scene","ui_v17","ui_smart","ui_cloud","ui_kho","ui_thiep","ui_nhac","ui_home2","ui_vinh","ui_side","ui_trang","ui_cay","ui_baivi","ui_splash","ui_lichthiep"]
ORDER.insert(ORDER.index("data")+1, "publish")
def rd(p): return open(os.path.join(R,p),encoding="utf8").read()
def b64(p): return "data:image/%s;base64," % ("webp" if p.endswith(".webp") else "png") + base64.b64encode(open(os.path.join(R,p),"rb").read()).decode()
js = "\n".join("/* ---- %s.js ---- */\n%s" % (n, rd("src/%s.js"%n)) for n in ORDER)
img = "window.GP=window.GP||{};GP.VERSION=%s;GP.IMG=%s;" % (json.dumps(VERSION), json.dumps({"nho": b64("img/logo-nho.webp"), "tam": b64("img/logo-tam.webp"), "vuong": b64("img/logo-vuong.webp"), "bo": b64("img/bo-nhan-dien.webp")}))
boot = "\n;(function(){var go=function(){GP.ui.start();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();})();"
# ---- Bản công khai: thư mục dist/public/ (kéo thả lên Netlify / GitHub Pages / Cloudflare Pages) ----
import subprocess, shutil

def wrap(h):
    """Bản đưa lên GitHub phải là trang HTML đầy đủ (doctype + viewport); khung trình xem của Claude thì tự thêm."""
    i = h.index("<script>")  # mọi thẻ <title>/<meta>/<link>/<style> phía trước phải nằm trong <head> (iPhone bỏ qua icon nếu nằm trong <body>)
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style>' + h[:i] + '</head><body>' + h[i:] + '</body></html>'
pub = os.path.join(R, "dist", "public"); shutil.rmtree(pub, ignore_errors=True); os.makedirs(os.path.join(pub, "img"))
src_json = os.path.join(R, "data", "published-source.json")  # bản sao lưu đầy đủ của Quản trị (nếu có)
args = ["node", os.path.join(R, "tools", "make_public.js")] + ([src_json] if os.path.exists(src_json) else [""]) + [os.path.join(pub, "data.json")]
subprocess.check_call(args)
pdata = open(os.path.join(pub, "data.json"), encoding="utf8").read()
head = ('<meta name="description" content="Gia phả số Họ Tống: tra cứu thông tin dòng họ, lịch giỗ, bản đồ từ đường và mộ tổ.">'
        '<meta name="theme-color" content="#7a1f1f"><meta property="og:type" content="website"><meta property="og:title" content="Gia phả Họ Tống">'
        '<meta property="og:description" content="Tra cứu gia phả, lịch giỗ, bản đồ từ đường và mộ tổ của dòng họ.">'
        '<meta property="og:image" content="img/og.jpg"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="favicon.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png"><meta name="apple-mobile-web-app-title" content="Gia phả Họ Tống">'
        '<meta name="robots" content="noindex">')
pimg = img + "GP.PUBLIC=true;GP.PUBDATA=" + pdata.replace("</", "<\\/") + ";"
tp = rd("template.html").replace("<!--HEAD-->", head).replace("/*CSS*/", rd("src/style.css")).replace("/*IMG*/", pimg).replace("/*JS*/", js.replace("</script>","<\\/script>") + boot)
tp = wrap(tp)
open(os.path.join(pub, "index.html"), "w", encoding="utf8").write(tp)
for f in ("icon-192.png", "icon-512.png", "og.jpg", "favicon.png"): shutil.copy(os.path.join(R, "img", f), os.path.join(pub, "img", f))
for f in ("apple-touch-icon.png", "icon-192.png", "icon-512.png", "favicon.png"): shutil.copy(os.path.join(R, "img", f), os.path.join(pub, f))
open(os.path.join(pub, ".nojekyll"), "w").close()
open(os.path.join(pub, "manifest.webmanifest"), "w", encoding="utf8").write(json.dumps({"name": "Gia phả Họ Tống", "short_name": "Gia phả", "start_url": "./", "display": "standalone", "background_color": "#fbf6ea", "theme_color": "#7a1f1f", "lang": "vi", "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}]}, ensure_ascii=False))
open(os.path.join(pub, "_headers"), "w").write("/data.json\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n")
print("dist/public/ :", sorted(os.listdir(pub)))
import gzip
tpl_html = tp.replace(pdata.replace("</", "<\\/"), "@@DATA@@", 1); assert "@@DATA@@" in tpl_html
img = img + "GP.SHARE_TPL=" + json.dumps(base64.b64encode(gzip.compress(tpl_html.encode("utf8"), 9)).decode()) + ";"
tpl_page = rd("template.html").replace("<!--HEAD-->", "").replace("/*CSS*/", rd("src/style.css")).replace("/*JS*/", js.replace("</script>","<\\/script>") + boot)
t = tpl_page.replace("/*IMG*/", img)  # khung kiểm thử: không có cấu hình đám mây
cloud_cfg = ""
if os.path.exists(os.path.join(R,"cloud.config.json")):
    cc = json.loads(rd("cloud.config.json")); cloud_cfg = "GP.CLOUD_CFG=" + json.dumps({"url": cc["url"], "key": cc["key"]}) + ";"
os.makedirs(os.path.join(R,"dist"),exist_ok=True)
import base64
ATI = "data:image/png;base64," + base64.b64encode(open(os.path.join(R,"img","apple-touch-icon.png"),"rb").read()).decode()
pwa_head = ('<meta name="theme-color" content="#7a1f1f"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="favicon.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">'
            '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Gia phả Họ Tống">')
open(os.path.join(R,"dist/index.html"),"w",encoding="utf8").write(wrap(tpl_page.replace("/*IMG*/", img + cloud_cfg).replace("<style>", pwa_head + "<style>", 1)))
os.makedirs(os.path.join(R,"dist","app","img"),exist_ok=True)
for f in ("apple-touch-icon.png","icon-192.png","icon-512.png","favicon.png"): shutil.copy(os.path.join(R,"img",f), os.path.join(R,"dist","app",f))
open(os.path.join(R,"dist","app","manifest.webmanifest"),"w",encoding="utf8").write(json.dumps({"name":"Gia phả Họ Tống","short_name":"Gia phả","start_url":"./","scope":"./","display":"standalone","background_color":"#fbf6ea","theme_color":"#7a1f1f","lang":"vi","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"}]}, ensure_ascii=False))
open(os.path.join(R,"dist","app","sw.js"),"w",encoding="utf8").write("""/* Gia phả số: cache khung ứng dụng; dữ liệu (Supabase) không bao giờ được lưu ở đây */
const V = "gp-%s";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(["./", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png"])).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("./"))));
});
""" % VERSION)
print("dist/index.html", round(len(t)/1024), "KB")
# Bản mô phỏng khung của trình xem (nội dung nằm trong <body>) — dùng cho kiểm thử, để bắt lỗi kiểu "CSS bị xoá"
open(os.path.join(R,"dist/_khung_thu.html"),"w",encoding="utf8").write('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px sans-serif;background:#fff;color:#000}</style></head><body>'+t+'</body></html>')



