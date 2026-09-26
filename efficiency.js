/* Local UI for the motor-efficiency- project, adapted to the shared instrument dialog. */
(function () {
  'use strict';

  const sourceURL = 'https://github.com/ka33u/motor-efficiency-';
  const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const methodLabels = { table: '项目表值', interpolation: '线性插值', extrapolation: '转速外推' };

  function content() {
    return '<div class="calc-eff-standard"><span>GB/T 30253—2024</span><span>一级能效参考</span></div>' +
      '<form class="calc-eff-form" novalidate><div class="calc-fields">' +
      '<label class="calc-field"><span>额定转速 n</span><span class="calc-input-wrap"><input name="speed" type="number" inputmode="decimal" value="1500" step="any" max="6000" required autocomplete="off" aria-label="额定转速，单位 r/min" aria-describedby="eff-speed-hint"><span class="calc-unit">r/min</span></span><small id="eff-speed-hint" class="calc-eff-field-hint">表内 45–6000 · 低于 45 支持外推</small></label>' +
      '<label class="calc-field"><span>额定功率 P</span><span class="calc-input-wrap"><input name="power" type="number" inputmode="decimal" value="15" step="any" min="0.55" max="1250" required autocomplete="off" aria-label="额定功率，单位 kW" aria-describedby="eff-power-hint"><span class="calc-unit">kW</span></span><small id="eff-power-hint" class="calc-eff-field-hint">查询范围 0.55–1250 kW</small></label>' +
      '</div><div class="calc-actions"><button class="calc-primary" type="submit">查询效率' + arrow + '</button><button class="calc-reset" type="reset">重置参数</button></div></form>' +
      '<section class="calc-result calc-eff-result" aria-live="polite" aria-atomic="true"></section>' +
      '<div class="calc-result-footer"><p class="calc-message" role="status"></p><button class="calc-copy" type="button" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>复制结果</button></div>' +
      '<p class="calc-eff-source">数据来源 <a href="' + sourceURL + '" target="_blank" rel="noopener noreferrer">motor-efficiency- 项目 ↗</a><span>28 × 14 表值 · 本地查询</span></p>';
  }

  function mount(root, options) {
    const form = root.querySelector('.calc-eff-form');
    const resultNode = root.querySelector('.calc-eff-result');
    const message = root.querySelector('.calc-message');
    const events = new AbortController();

    function clear() {
      options.setCopyText('');
      form.querySelectorAll('[aria-invalid]').forEach(function (input) { input.removeAttribute('aria-invalid'); });
      message.textContent = '';
      resultNode.classList.remove('calc-result-ready');
      resultNode.innerHTML = '<span class="calc-result-label">一级能效参考效率</span><div class="calc-placeholder">— <span>等待查询</span></div><p class="calc-result-hint">输入转速与功率，查询对应的效率参考值。</p>';
    }

    function error(input, text) {
      if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
      message.textContent = text;
    }

    function query(event) {
      event.preventDefault();
      clear();
      const speedInput = form.elements.namedItem('speed');
      const powerInput = form.elements.namedItem('power');
      const speed = Number(speedInput.value);
      const power = Number(powerInput.value);
      if (!speedInput.value.trim() || !Number.isFinite(speed) || speed <= 0) { error(speedInput, '请输入大于 0 的有效转速。'); return; }
      if (!powerInput.value.trim() || !Number.isFinite(power) || power <= 0) { error(powerInput, '请输入大于 0 的有效功率。'); return; }
      if (!window.MotorEfficiency) { error(null, '能效数据暂时无法加载，请刷新后重试。'); return; }
      const result = window.MotorEfficiency.query(speed, power);
      if (result.error) { error(speed > 6000 ? speedInput : powerInput, result.error); return; }
      const method = methodLabels[result.method];
      const efficiency = result.efficiency.toFixed(1);
      const warnings = [];
      if (result.method === 'extrapolation') warnings.push('当前转速低于表内最低转速 45 r/min，结果为源项目外推参考值，不是标准表内值。');
      resultNode.classList.add('calc-result-ready');
      resultNode.innerHTML = '<div class="calc-eff-result-heading"><span class="calc-result-label">一级能效参考效率</span><span class="calc-eff-method calc-eff-method-' + result.method + '"><i></i>' + method + '</span></div>' +
        '<div class="calc-result-value calc-eff-value">' + efficiency + '<span>%</span></div>' +
        '<div class="calc-eff-working-point"><span>' + speed + ' <small>r/min</small></span><i>×</i><span>' + power + ' <small>kW</small></span></div>' +
        '<dl class="calc-eff-references"><div><dt>转速参考</dt><dd>' + result.speedLabel + '</dd></div><div><dt>功率参考</dt><dd>' + result.powerLabel + '</dd></div></dl>' +
        (warnings.length ? '<div class="calc-eff-warnings">' + warnings.map(function (warning) { return '<p>' + warning + '</p>'; }).join('') + '</div>' : '');
      options.setCopyText('能效查询 · GB/T 30253—2024\n变频控制同步电机 · 一级能效参考\n额定转速：' + speed + ' r/min\n额定功率：' + power + ' kW\n参考效率：' + efficiency + '%\n查询方式：' + method + '\n转速参考：' + result.speedLabel + '\n功率参考：' + result.powerLabel + '\n' + (warnings.length ? '说明：' + warnings.join(' ') + '\n' : '') + '来源：' + sourceURL + '\n参考值不等同于实测效率或能效等级认证。');
    }

    form.addEventListener('submit', query, { signal: events.signal });
    form.addEventListener('input', clear, { signal: events.signal });
    form.addEventListener('reset', clear, { signal: events.signal });
    clear();
    return function () { events.abort(); };
  }

  window.ToolboxEfficiency = Object.freeze({ content: content, mount: mount });
})();
