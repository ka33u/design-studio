(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const tools = [
    { id: 'casting', title: '铸件重量计算', detail: '机壳 · 材料与质量', search: '铸件重量计算 casting 铸铁 铸钢 质量 密度 体积 结构' },
    { id: 'inertia', title: '转子转动惯量计算', detail: '转子 · 旋转与惯性', search: '转子转动惯量计算 inertia 惯性 圆柱 实心 空心 结构' },
    { id: 'efficiency', title: '能效查询', detail: 'GB/T 30253—2024 · 一级能效参考', search: '能效查询 efficiency GB/T30253 GB30253 30253 标准 变频控制 同步电机 永磁 效率 转速 功率 一级 插值' },
    { id: 'wire', title: '线规分重', detail: '绕组 · 双线规重量分配', search: '线规分重 wire 铜线 漆包线 直径 根数 总重量 分配 两种规格 电气' },
    { id: 'resistance', title: '电阻换算', detail: '导体 · 温度与电阻', search: '电阻换算 resistance 温度 铜 铝 绕组 温升 欧姆 电气' },
  ];
  const validId = id => tools.some(tool => tool.id === id);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Device preferences are optional. */ } };
  const savedFavorites = read('hd-toolbox-favorites', []);
  const savedRecent = read('hd-toolbox-recent', []);
  const favorites = new Set(Array.isArray(savedFavorites) ? savedFavorites.filter(validId) : []);
  let recent = Array.isArray(savedRecent) ? savedRecent.filter(validId).slice(0, 5) : [];
  let scope = 'all';
  let activeTool = null;
  let focusedTool = null;
  let paused = read('hd-toolbox-motion', true) === false;
  let exploded = false;
  let toastTimer;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  paused = paused || reduced.matches;
  const finder = $('#tool-finder');
  const future = $('#future-dialog');
  const nodes = $$('.tool-node');
  const connections = nodes.map(node => ({ node, group: $('[data-connection="' + node.dataset.tool + '"]'), rect: null }));
  let frame = 0;
  let lastLineTime = 0;
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('#search-shortcut').textContent = 'Ctrl K';

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2200);
  }

  function focusTool(id) {
    focusedTool = id;
    window.toolboxFlow?.setFocus(id);
    nodes.forEach(node => node.classList.toggle('active', node.dataset.tool === id));
    connections.forEach(connection => connection.group.classList.toggle('active', connection.node.dataset.tool === id));
    if (id) document.body.dataset.focusedTool = id;
    else delete document.body.dataset.focusedTool;
    drawConnections();
  }

  function openTool(id) {
    if (!validId(id)) return;
    if (!window.ToolboxCalculator) { toast('工具暂时无法加载，请刷新后重试。'); return; }
    if (finder.open) finder.close();
    activeTool = id;
    focusTool(id);
    if (!window.ToolboxCalculator.open(id)) { activeTool = null; focusTool(null); }
  }
  nodes.forEach(node => {
    const id = node.dataset.tool;
    node.addEventListener('pointerenter', () => { if (!activeTool) focusTool(id); });
    node.addEventListener('pointerleave', () => { if (!activeTool && document.activeElement !== node) focusTool(null); });
    node.addEventListener('focus', () => { if (!activeTool) focusTool(id); });
    node.addEventListener('blur', () => { if (!activeTool) focusTool(null); });
    node.addEventListener('click', () => openTool(id));
  });
  window.addEventListener('toolbox:used', event => {
    const id = event.detail?.id;
    if (!validId(id)) return;
    recent = [id, ...recent.filter(item => item !== id)].slice(0, 5);
    save('hd-toolbox-recent', recent);
    activeTool = id;
    focusTool(id);
  });
  window.addEventListener('toolbox:closed', () => { activeTool = null; focusTool(null); });

  function filteredTools() {
    const query = $('#tool-search').value.trim().toLowerCase();
    let list = tools.filter(tool => (!query || tool.search.toLowerCase().includes(query)) && (scope === 'all' || scope === 'favorites' && favorites.has(tool.id) || scope === 'recent' && recent.includes(tool.id)));
    if (scope === 'recent') list = list.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
    return list;
  }
  function renderFinder() {
    const results = $('#finder-results');
    const list = filteredTools();
    results.replaceChildren();
    list.forEach(tool => {
      const row = document.createElement('div'); row.className = 'finder-row';
      const choice = document.createElement('button'); choice.className = 'finder-choice'; choice.dataset.choose = tool.id;
      const index = document.createElement('b'); index.textContent = String(tools.indexOf(tool) + 1).padStart(2, '0');
      const label = document.createElement('span'); label.append(document.createTextNode(tool.title));
      const detail = document.createElement('small'); detail.textContent = tool.detail; label.append(detail);
      choice.append(index, label);
      choice.insertAdjacentHTML('beforeend', '<svg aria-hidden="true"><use href="#i-arrow"/></svg>');
      choice.addEventListener('click', () => openTool(tool.id));
      const star = document.createElement('button'); star.className = 'finder-star';
      star.setAttribute('aria-pressed', String(favorites.has(tool.id)));
      star.setAttribute('aria-label', (favorites.has(tool.id) ? '取消收藏' : '收藏') + tool.title);
      star.innerHTML = '<svg aria-hidden="true"><use href="#i-star"/></svg>';
      star.addEventListener('click', () => {
        const wasFavorite = favorites.has(tool.id);
        if (wasFavorite) favorites.delete(tool.id); else favorites.add(tool.id);
        save('hd-toolbox-favorites', [...favorites]);
        renderFinder();
        const replacement = [...results.querySelectorAll('.finder-row')].find(item => item.querySelector('[data-choose]')?.dataset.choose === tool.id)?.querySelector('.finder-star');
        if (replacement) replacement.focus(); else $('#tool-search').focus();
        toast(wasFavorite ? '已取消收藏' : '已加入我的收藏');
      });
      row.append(choice, star); results.append(row);
    });
    $('#favorite-count').textContent = favorites.size;
    const empty = $('#finder-empty'); empty.hidden = list.length > 0;
    empty.textContent = $('#tool-search').value.trim() ? '暂时没有相关工具，试试“重量”“绕组”或“电阻”。' : scope === 'favorites' ? '点亮工具右侧的星标，把常用的留下来。' : '打开一个工具，从这里继续下一次设计。';
    $$('[data-scope]').forEach(button => { const active = button.dataset.scope === scope; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function openFinder() {
    if (document.querySelector('dialog[open]')) return;
    focusTool(null); scope = 'all'; $('#tool-search').value = ''; renderFinder(); finder.showModal(); $('#tool-search').focus();
  }
  $('#finder-open').addEventListener('click', openFinder);
  $('#finder-close').addEventListener('click', () => finder.close());
  $('#tool-search').addEventListener('input', renderFinder);
  $$('[data-scope]').forEach(button => button.addEventListener('click', () => { scope = button.dataset.scope; renderFinder(); }));
  finder.addEventListener('keydown', event => {
    const choices = [...finder.querySelectorAll('.finder-choice')];
    if (!choices.length) return;
    const index = choices.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? (index + 1) % choices.length : (index < 0 ? choices.length - 1 : (index - 1 + choices.length) % choices.length);
      choices[next].focus();
    }
    if (event.key === 'Enter' && document.activeElement === $('#tool-search')) { event.preventDefault(); openTool(choices[0].dataset.choose); }
  });
  document.addEventListener('keydown', event => {
    const editing = event.target instanceof Element && event.target.matches('input,textarea,select,[contenteditable=true]');
    const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if ((commandK || event.key === '/' && !editing) && !document.querySelector('dialog[open]')) { event.preventDefault(); openFinder(); }
  });

  function openFuture() { if (!document.querySelector('dialog[open]')) { focusTool(null); future.showModal(); } }
  $('#future-open').addEventListener('click', openFuture);
  $('#future-node').addEventListener('click', openFuture);
  $('#future-close').addEventListener('click', () => future.close());
  [finder, future].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));

  function updateMotion() {
    $('#visual-motion').setAttribute('aria-label', paused ? '播放粒子动画' : '暂停粒子动画');
    $('#visual-motion').title = paused ? '播放粒子动画' : '暂停粒子动画';
    $('#visual-motion').setAttribute('aria-pressed', String(!paused));
    $('#visual-motion use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    $('#motor-interaction-hint').innerHTML = '<span class="hint-dot"></span>' + (paused ? '静静思考 · 仍可探索结构' : '拖动探索 · 点击激发磁场');
    window.toolboxFlow?.setPaused(paused);
    scheduleLines();
  }
  $('#visual-motion').addEventListener('click', () => { paused = !paused; save('hd-toolbox-motion', !paused); updateMotion(); });
  $('#motor-explode').addEventListener('click', () => {
    exploded = !exploded;
    $('#motor-explode').setAttribute('aria-pressed', String(exploded));
    $('#motor-explode span').textContent = exploded ? '聚合电机' : '解构电机';
    window.toolboxFlow?.setExploded(exploded); drawConnections();
  });
  $('#motor-reset').addEventListener('click', () => { window.toolboxFlow?.resetView(); drawConnections(); toast('已复位电机视角'); });
  reduced.addEventListener('change', event => { if (event.matches) paused = true; updateMotion(); });

  function measureConnections() { connections.forEach(connection => { connection.rect = connection.node.getBoundingClientRect(); }); drawConnections(); }
  function drawConnections() {
    for (const connection of connections) {
      const target = window.toolboxFlow?.getAttachment?.(connection.node.dataset.tool);
      const rect = connection.rect;
      if (!target || !rect) { connection.group.style.display = 'none'; continue; }
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      if (rect.bottom < 0 || rect.top > innerHeight) { connection.group.style.display = 'none'; continue; }
      connection.group.style.display = '';
      const dx = target.x - cx, dy = target.y - cy;
      let x, y, path;
      if (Math.abs(dy) > Math.abs(dx) * 1.1) {
        x = cx; y = dy > 0 ? rect.bottom + 4 : rect.top - 5;
        const mid = y + (target.y - y) * .43;
        path = 'M ' + x + ' ' + y + ' C ' + x + ' ' + mid + ' ' + target.x + ' ' + mid + ' ' + target.x + ' ' + target.y;
      } else {
        x = dx > 0 ? rect.right + 11 : rect.left - 11; y = cy;
        const mid = x + (target.x - x) * .42;
        path = 'M ' + x + ' ' + y + ' C ' + mid + ' ' + y + ' ' + mid + ' ' + target.y + ' ' + target.x + ' ' + target.y;
      }
      connection.group.querySelector('path').setAttribute('d', path);
      const dot = connection.group.querySelector('circle'); dot.setAttribute('cx', target.x); dot.setAttribute('cy', target.y);
      connection.group.style.opacity = focusedTool && focusedTool !== connection.node.dataset.tool ? '.32' : '1';
    }
  }
  function tickLines(time) { frame = 0; if (document.hidden || paused || reduced.matches) return; if (time - lastLineTime > 40) { drawConnections(); lastLineTime = time; } frame = requestAnimationFrame(tickLines); }
  function scheduleLines() { if (frame) cancelAnimationFrame(frame); frame = 0; drawConnections(); if (!paused && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tickLines); }
  const observer = new ResizeObserver(measureConnections); observer.observe($('.workspace'));
  window.addEventListener('resize', measureConnections, { passive: true });
  window.addEventListener('scroll', measureConnections, { passive: true });
  document.addEventListener('visibilitychange', scheduleLines);
  // Old #tools links keep working, but no longer jump into a card grid.
  if (location.hash === '#tools') history.replaceState(null, '', location.pathname + location.search);
  measureConnections(); updateMotion();
})();
