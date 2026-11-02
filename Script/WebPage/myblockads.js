// 2026-10-21 20:00
// 网页元素 #===id, .===class, .div > p:has(> a[target="_blank"])

const url = $request.url;
const isHtml = /^\s*<!DOCTYPE html>/i.test($response.body);

if (isHtml) {
  let body = $response.body;

  if (/^https:\/\/(?:18hlw\.com|8olbt\.imsatcmn\.cc)\//.test(url)) {
    // 黑料网：addbox底部常驻按钮 application-popup广告弹窗 footer页脚信息 gotoclick信息流广告 infomation首页底部推广 list-sec底部推广栏目 relation大家都在搜
    const cssBlock = `
      <style>
        #copy-img,
        #copy-success,
        #notice_container,
        .addbox,
        .application-popup,
        .article-tags,
        .client-only-placeholder > p:has(> img[alt="710X240"]),
        .client-only-placeholder > p:has(> img[alt="710X240"]) + p,
        .client-only-placeholder > p:has(> img[alt="812X400"]),
        .editormd-preview blockquote,
        .editormd-preview p a,
        .footer,
        .gotoclick,
        .infomation,
        .list-sec,
        .relation { 
          display: none !important; 
        } 
      </style>
    </head>`;
    body = body.replace(/<\/head>/, cssBlock);
  } else if (/^https:\/\/javdb\.com\//.test(url)) {
    // JavDB：去除顶部域名, 底部下载提醒, 播放页广告
    const cssBlock = `
      <style>
        .app-desktop-banner, 
        .moj-content,
        .sda-content,
        .sub-header { 
          display: none !important; 
        } 
      </style>
    </head>`;
    body = body.replace(/<\/head>/, cssBlock);
  } else if (/^https:\/\/www\.(?:hgeme|xn--wcv59z)\.com\//.test(url)) {
    // 观影：移除机场推荐横幅广告
    let injectCode = `
      <style>
        #bads {
          display: none !important;
          opacity: 0 !important;
        }
      </style>
      <script>
        localStorage.setItem("bads", Date.now());
      </script>
      </head>
    `;
    body = body.replace(/<\/head>/i, injectCode);
  } else if (/^https:\/\/javranking\.cc\/(?:zh-hans|en)\//.test(url)) {
    // 什么值得冲 JavRanking
    body = body
      // Spot A：<aside class="spot-a-wrapper" data-spot-a>…</aside>（内无嵌套 aside，非贪婪到第一个 </aside> 即整块）
      .replace(/<aside\b[^>]*\bdata-spot-a\b[^>]*>[\s\S]*?<\/aside>/g, "")
      // Spot B：<li class="sponsor-grid-slot"><article data-spot-b>…</article><script>…</script></li>（内无嵌套 li）
      .replace(
        /<li\b[^>]*\bclass="[^"]*\bsponsor-grid-slot\b[^"]*"[^>]*>[\s\S]*?<\/li>/g,
        ""
      )
      // 兜底：不在 grid 里的独立 Spot B 大卡
      .replace(/<article\b[^>]*\bdata-spot-b\b[^>]*>[\s\S]*?<\/article>/g, "")
      // 兜底：游离的赞助弹窗（正常都在上面两块内部、已随块删掉）
      .replace(
        /<dialog\b[^>]*\bclass="[^"]*\b(?:spot-dialog|sponsor-dialog)\b[^"]*"[^>]*>[\s\S]*?<\/dialog>/g,
        ""
      )
      // Spot C：<aside class="page-shell spot-c-slot" data-spot-c>…</aside>（内无嵌套 aside，非贪婪到第一个 </aside> 即整块）
      // 按槽位属性删：槽位是通用的，轮换成其他赞助商也一样移除，不只限 AI风月
      .replace(/<aside\b[^>]*\bdata-spot-c\b[^>]*>[\s\S]*?<\/aside>/g, "")
      // 兜底：带 spot-c-slot 类的 aside（属性顺序/写法变化时）
      .replace(
        /<aside\b[^>]*\bclass="[^"]*\bspot-c-slot\b[^"]*"[^>]*>[\s\S]*?<\/aside>/g,
        ""
      )
      // 通栏删掉后清掉 <main> 上的预留高度类，不然顶部多出 --spot-bar-height(2.25rem) 空白
      // 外部 CSS：main.has-spot-top,main.has-sponsor-banner{padding-top:calc(var(--header-height) + var(--spot-bar-height))}
      // 只改 <main> 标签本身的属性，不碰正文/CSS 里的同名字样
      .replace(/<main\b[^>]*>/g, (tag) =>
        tag
          .replace(/\s*\bhas-spot-top\b/g, "")
          .replace(/\s*\bhas-sponsor-banner\b/g, "")
      );
  } else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/search-[^/]+\.html/.test(url)) {
    // 移花宫：底部透明广告

    // 1. 破坏隐形点击层脚本特征：
    // 将生成的隐形方块图层从顶层 (z-index:10) 丢到底层，并彻底禁用其鼠标/触摸事件
    body = body.replace(/z-index:10;/g, "z-index:-9999;pointer-events:none;");
    body = body.replace(/opacity:0.01;/g, "opacity:0;pointer-events:none;");

    // 2. 精准清空广告脚本逻辑：
    // 只清空带 `data-zsky-ad-code` 标记的脚本内容，但保留 <script> 标签本身以防检测
    body = body.replace(/(<script[^>]*data-zsky-ad-code[^>]*>)([\s\S]*?)(<\/script>)/gi, "$1/* ad blocked */$3");

    // 3. 注入安全 CSS 补丁：
    // 在表层视觉上隐藏广告容器，但强行保留 1px 的高度，用来骗过“反广告屏蔽”的高度检测
    const safeCss = `
      <style>
        /* 处理原生广告容器 */
        .zsky-custom-ad-code {
          opacity: 0 !important;
          height: 1px !important;
          min-height: 1px !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
        /* 双保险：屏蔽任何漏网的动态生成劫持块 */
        div[style*="position:fixed"][style*="opacity"],
        [class^="idpmi"] {
          display: none !important;
          pointer-events: none !important;
          z-index: -9999 !important;
        }
      </style>
    </head>`;

    // 将 CSS 注入到网页 <head> 的末尾
    body = body.replace(/<\/head>/i, safeCss);

    /* 
    // 1. 移除生成固定定位透明广告区域的脚本（特征：包含 oeexaywx_b 与 position:fixed）
    body = body.replace(/<script>if\(\!\/\^Mac\|Win\/\.test\(navigator\.platform\)\)\{[\s\S]*?<\/script>/g, "");
    // 2. 移除混淆的大型广告脚本（特征：以 !function(){function a(a){var b={ 开头）
    body = body.replace(/<script>!function\(\)\{function a\(a\)\{var b=\{[\s\S]*?<\/script>/g, "");
    // 3. 可选：移除任何包含可疑广告域或关键字的脚本（进一步净化）
    body = body.replace(/<script[\s\S]*?(otwaahn\.com|3791kc|oeexaywx_b)[\s\S]*?<\/script>/gi, "");
    */
  } else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/hash\/(?:[a-fA-F0-9]{40}|[A-Z2-7]{32})\.html/.test(url)) {
    // 移花宫：搜索结果页面

    // 1. 磁力链接直接显示：从 #magnetLink 的 data-hash 拼出磁力链，替换占位文字
    //    （完整模式 textarea 里是「点击按钮后显示并复制磁力链接」；精简模式该块会被第 4 步整块删掉，此步无副作用）
    const ta = body.match(/(<textarea\b[^>]*\bid="magnetLink"[^>]*>)([\s\S]*?)(<\/textarea>)/i);
    if (ta) {
      const hm = ta[1].match(/\bdata-hash="([^"]+)"/i);
      if (hm) body = body.replace(ta[0], ta[1] + `magnet:?xt=urn:btih:${hm[1]}` + ta[3]);
    }

    body = body
      // 2. 移花宫引路人：<section class="zsky-publish-links-mini ..." aria-label="移花宫引路人">…</section>（内无嵌套 section）
      .replace(/<section\b[^>]*\baria-label="移花宫引路人"[^>]*>[\s\S]*?<\/section>/g, "")
      // 3. 推荐应用：<section class="zsky-app-ads-mini ..." aria-label="推荐应用">…</section>（内无嵌套 section）
      .replace(/<section\b[^>]*\baria-label="推荐应用"[^>]*>[\s\S]*?<\/section>/g, "")
      // 4. 使用磁力链接（仅精简模式）：<div class="tbox"><div class="ssbox"><div class="title"><h3>使用磁力链接</h3>…（连续 4 个 </div> 收尾：down_btn/content/ssbox/tbox）
      .replace(
        /<div class="tbox">\s*<div class="ssbox">\s*<div class="title">\s*<h3>使用磁力链接<\/h3>\s*<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g,
        ""
      )
      // 5. 底部广告：<div class="zsky-terminal-code-ad-root">…</div>，用自带的 start/end 注释锚定整块
      .replace(
        /<div class="zsky-terminal-code-ad-root"[^>]*><!--zsky-terminal-code-ad:start-->[\s\S]*?<!--zsky-terminal-code-ad:end--><\/div>/g,
        ""
      );
    /* 
    // 要定位的文本
    const targetText = "下载BT种子文件";
    const pos = body.indexOf(targetText);
    if (pos !== -1) {
      // 向前找到包含该文本的 <div class="tbox"> 开始标签
      const tboxStart = body.lastIndexOf('<div class="tbox">', pos);
      if (tboxStart !== -1) {
        // 截取该 tbox 之前的所有内容
        let newBody = body.substring(0, tboxStart);
        // 原始页面以 <div class="wrapper"> 开头，需要补上闭合标签
        newBody += "</div></body></html>";
        // 将修改后的内容赋给 body 变量
        body = newBody;
      }
    }
    */
  }

  $done({ body });
} else {
  $done({});
}
