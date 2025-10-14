// ==UserScript==
// @name         SpeedMaster — Universal Media Playback Controller
// @namespace    https://openuserjs.org/users/barretlee
// @version      2.5
// @description  视频/音频控制面板：支持倍速调节、广告快进、关闭清理、域名排除、ARIA 无障碍。支持可拖拽、最小化交互、移动端触控与自适应窗口。
// @author       Barret Lee
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 16];
  let observer = null, intervalId = null, currentMedia = null, skipping = false;
  let controllerPos = { left: null, top: null }; // ✅ 保存当前控制面板位置，便于窗口调整

  const getExcludedDomains = () => GM_getValue('excludedDomains', []);
  const saveExcludedDomains = (list) => GM_setValue('excludedDomains', list);

  GM_registerMenuCommand('⚙️ 配置排除域名', () => {
    const currentList = getExcludedDomains();
    const input = prompt('请输入不显示控制器的域名（用逗号分隔，例如：youtube.com,bilibili.com）', currentList.join(','));
    if (input !== null) {
      const newList = input.split(',').map(d => d.trim()).filter(Boolean);
      saveExcludedDomains(newList);
      alert('✅ 域名排除列表已更新：\n' + newList.join(', '));
    }
  });

  const isExcludedDomain = () => getExcludedDomains().some(domain => location.hostname.endsWith(domain));
  if (isExcludedDomain()) return console.log('[SpeedMaster] 当前域名在排除列表中，跳过加载。');

  const htmlPolicy = window.trustedTypes?.createPolicy('speed-controller-policy', { createHTML: s => s });

  const resetControls = (media) => {
    if (!media) return;
    media.playbackRate = 1;
    skipping = false;
    const btnSkip = document.querySelector('#skip-ads');
    if (btnSkip) btnSkip.textContent = '跳过广告 🚀';
    const display = document.querySelector('#speed-display');
    if (display) display.textContent = `${media.playbackRate.toFixed(2)}x`;
    const select = document.querySelector('#speed-select');
    if (select) select.value = 1;
  };

  const clampPosition = (left, top, el) => {
    const maxLeft = window.innerWidth - el.offsetWidth - 10;
    const maxTop = window.innerHeight - el.offsetHeight - 10;
    return {
      left: Math.min(Math.max(10, left), maxLeft),
      top: Math.min(Math.max(10, top), maxTop)
    };
  };

  const createController = (media) => {
    if (document.querySelector('#speed-controller')) return;

    const controller = document.createElement('div');
    controller.id = 'speed-controller';
    controller.style.left = controllerPos.left ? `${controllerPos.left}px` : 'auto';
    controller.style.top = controllerPos.top ? `${controllerPos.top}px` : 'auto';

    const html = `
      <style>
        #speed-controller {
          position: fixed;
          right: 24px;
          bottom: 24px;
          background: rgba(25, 25, 25, 0.78);
          color: #fff;
          padding: 6px 18px 14px;
          border-radius: 16px;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          transition: all 0.25s ease;
          min-width: 200px;
          cursor: default;
        }
        #speed-controller.dragging { opacity: 0.9; cursor: grabbing; }
        #speed-controller:hover { background: rgba(35,35,35,0.9); transform: translateY(-2px); }
        #speed-controller:focus { outline: 2px solid #00b4ff; }
        #drag-handle { position: absolute; top: 4px; left: 10px; font-size: 16px; color: #ccc; cursor: grab; user-select: none; }
        #speed-controller button, #speed-controller select {
          background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px; padding: 6px 10px; margin: 3px; cursor: pointer;
        }
        #speed-controller button:hover, #speed-controller select:hover { background: rgba(255,255,255,0.18); transform: translateY(-1px); }
        #close-wrapper { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: row; gap: 6px; }
        #close-btn, #minimize-btn {
          width: 22px; height: 22px; border-radius: 50%; font-size: 14px; color: #ccc;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; padding: 0;
        }
        #close-btn:hover, #minimize-btn:hover { background: rgba(255,255,255,0.2); color: #fff; transform: scale(1.08); }
        #exclude-tip { display: none; position: absolute; top: -28px; right: -4px; background: rgba(40,40,40,0.92);
          border: 1px solid rgba(255,255,255,0.15); color: #eee; font-size: 12px; padding: 6px 10px;
          border-radius: 8px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(6px);
        }
        #close-wrapper:hover #exclude-tip { display: block; }
        #exclude-tip label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
        #exclude-checkbox { accent-color: #00b4ff; transform: scale(1.1); }
        #control-row { display: flex; align-items: center; margin-top: 18px; margin-bottom: 8px; }
        #speed-display { margin: 0 8px; font-weight: bold; font-size: 15px; }
        #minimized-bar {
          position: fixed; right: -4px; bottom: 24px; width: 18px; height: 48px;
          background: rgba(30, 30, 30, 0.8); border-radius: 12px 0 0 12px; display: none;
          align-items: center; justify-content: center; color: #fff; cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35); transition: transform 0.25s ease;
          z-index: 999999; font-size: 12px; text-align: center; padding-left: 6px;
        }
        #minimized-bar:hover { transform: translateX(-4px); }
      </style>

      <div id="drag-handle" title="拖动面板位置">☰</div>
      <div id="close-wrapper">
        <button id="minimize-btn" title="最小化面板">–</button>
        <button id="close-btn" tabindex="0" aria-label="关闭控制面板">×</button>
        <div id="exclude-tip"><label for="exclude-checkbox" title="关闭后将不再在此域名显示">
          <input type="checkbox" id="exclude-checkbox" aria-label="不再在此域名下显示控制面板">本域名下不再显示</label></div>
      </div>

      <div id="control-row">
        <span>速度：</span>
        <button id="speed-down" tabindex="0" aria-label="减慢播放速度">－</button>
        <span id="speed-display" role="status" aria-live="polite">${media.playbackRate.toFixed(2)}x</span>
        <button id="speed-up" tabindex="0" aria-label="加快播放速度">＋</button>
      </div>

      <div>
        <select id="speed-select" tabindex="0" aria-label="选择播放速度"></select>
        <button id="speed-reset" tabindex="0" aria-label="重置播放速度为一倍">重置</button>
        <button id="skip-ads" tabindex="0" aria-label="跳过广告或恢复正常播放">跳过广告 🚀</button>
      </div>
    `;
    controller.innerHTML = htmlPolicy ? htmlPolicy.createHTML(html) : html;
    document.body.appendChild(controller);

    const minimizedBar = document.createElement('div');
    minimizedBar.id = 'minimized-bar';
    minimizedBar.textContent = '▶';
    document.body.appendChild(minimizedBar);

    // === 拖拽逻辑（鼠标 + 触摸 + 边界检测）===
    const dragHandle = controller.querySelector('#drag-handle');
    let isDragging = false, offsetX = 0, offsetY = 0;

    const startDrag = (x, y) => {
      isDragging = true;
      controller.classList.add('dragging');
      offsetX = x - controller.getBoundingClientRect().left;
      offsetY = y - controller.getBoundingClientRect().top;
    };

    const doDrag = (x, y) => {
      if (!isDragging) return;
      const { left, top } = clampPosition(x - offsetX, y - offsetY, controller);
      controller.style.left = `${left}px`;
      controller.style.top = `${top}px`;
      controller.style.right = 'auto';
      controller.style.bottom = 'auto';
      controllerPos = { left, top }; // ✅ 实时保存
    };

    const endDrag = () => {
      isDragging = false;
      controller.classList.remove('dragging');
    };

    dragHandle.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    document.addEventListener('mousemove', (e) => doDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    dragHandle.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      doDrag(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchend', endDrag);

    // ✅ 窗口尺寸变化时自动校正位置
    window.addEventListener('resize', () => {
      if (controllerPos.left !== null && controllerPos.top !== null) {
        const { left, top } = clampPosition(controllerPos.left, controllerPos.top, controller);
        controller.style.left = `${left}px`;
        controller.style.top = `${top}px`;
        controllerPos = { left, top };
      }
    });

    // === 最小化逻辑 ===
    const minimizeBtn = controller.querySelector('#minimize-btn');
    minimizeBtn.onclick = () => { controller.style.display = 'none'; minimizedBar.style.display = 'flex'; };
    minimizedBar.onclick = () => { controller.style.display = 'block'; minimizedBar.style.display = 'none'; };

    // === 功能绑定 ===
    const speedSelect = controller.querySelector('#speed-select');
    const btnDown = controller.querySelector('#speed-down');
    const btnUp = controller.querySelector('#speed-up');
    const btnReset = controller.querySelector('#speed-reset');
    const btnSkip = controller.querySelector('#skip-ads');
    const btnClose = controller.querySelector('#close-btn');
    const display = controller.querySelector('#speed-display');
    const excludeCheckbox = controller.querySelector('#exclude-checkbox');

    SPEED_OPTIONS.forEach(speed => {
      const opt = document.createElement('option');
      opt.value = speed;
      opt.textContent = `${speed}x`;
      if (speed === 1) opt.selected = true;
      speedSelect.appendChild(opt);
    });

    const updateDisplay = () => {
      display.textContent = `${media.playbackRate.toFixed(2)}x`;
      speedSelect.value = SPEED_OPTIONS.includes(media.playbackRate) ? media.playbackRate : 1;
    };

    btnDown.onclick = () => { media.playbackRate = Math.max(0.5, media.playbackRate - 0.25); updateDisplay(); };
    btnUp.onclick = () => { media.playbackRate = Math.min(5, media.playbackRate + 0.25); updateDisplay(); };
    btnReset.onclick = () => { resetControls(media); };
    speedSelect.onchange = () => { media.playbackRate = parseFloat(speedSelect.value); updateDisplay(); };

    btnSkip.onclick = () => {
      media.playbackRate = skipping ? 1 : 16;
      skipping = !skipping;
      btnSkip.textContent = skipping ? '恢复正常' : '跳过广告 🚀';
      updateDisplay();
    };

    btnClose.onclick = () => {
      observer?.disconnect();
      clearInterval(intervalId);
      controller.remove();
      minimizedBar.remove();
      console.log('[SpeedMaster] 控制面板已关闭。');

      if (excludeCheckbox.checked) {
        const currentList = getExcludedDomains();
        const hostname = location.hostname.split('.').slice(-2).join('.');
        if (!currentList.includes(hostname)) {
          currentList.push(hostname);
          saveExcludedDomains(currentList);
          alert(`✅ 已将 ${hostname} 加入排除列表，下次将不再显示。`);
        }
      }
    };
  };

  const detectAndCreate = () => {
    const media = document.querySelector('video, audio');
    if (media && media !== currentMedia) {
      currentMedia = media;
      resetControls(media);
      createController(media);
    }
  };

  document.addEventListener('DOMContentLoaded', detectAndCreate);
  observer = new MutationObserver(detectAndCreate);
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  intervalId = setInterval(detectAndCreate, 2000);
})();