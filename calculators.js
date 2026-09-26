/* Design Toolbox · dependency-free, local engineering calculators. */
(function () {
  'use strict';

  const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const icons = {
    casting: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5m8 4.5v9M8 5.3l8 4.5"/>',
    inertia: '<ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="2.5"/><path d="m15 3 3 1-1 3M9 21l-3-1 1-3"/>',
    efficiency: '<path d="M20 4C8 3 2 10 6 17c7 4 14-2 14-13ZM5 20l10-10M8 17v-5m0 5h5"/>',
    wire: '<path d="M4 7c0-4 4-4 4 0v10c0 4 4 4 4 0V7c0-4 4-4 4 0v10c0 4 4 4 4 0M2 12h2m16 0h2"/>',
    resistance: '<path d="M2 12h3l2-5 3 10 4-10 3 10 2-5h3"/>'
  };

  function numberField(name, label, value, unit, options) {
    const opts = options || {};
    return '<label class="calc-field' + (opts.fullWidth ? ' calc-field-wide' : '') + '"><span>' + label + '</span><span class="calc-input-wrap"><input type="number" inputmode="' + (opts.integer ? 'numeric' : 'decimal') + '" name="' + name + '" value="' + value + '" step="' + (opts.integer ? '1' : 'any') + '"' + (opts.min !== undefined ? ' min="' + opts.min + '"' : '') + ' autocomplete="off" required aria-label="' + label + (unit ? '，单位' + unit : '') + '"><span class="calc-unit">' + unit + '</span></span></label>';
  }

  function selectField(name, label, options) {
    return '<label class="calc-field"><span>' + label + '</span><select name="' + name + '">' + options.map(function (item) { return '<option value="' + item[0] + '">' + item[1] + '</option>'; }).join('') + '</select></label>';
  }

  function readNumber(form, name, label, options) {
    const opts = options || {};
    const input = form.elements.namedItem(name);
    const raw = input.value.trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) fail(input, '请为“' + label + '”输入有效数值。');
    if (opts.min !== undefined ? value < opts.min : value <= 0) fail(input, label + (opts.min !== undefined ? '不能小于 ' + opts.min + '。' : '必须大于 0。'));
    if (opts.max !== undefined && value > opts.max) fail(input, label + '不能大于 ' + opts.max + '。');
    if (opts.integer && !Number.isSafeInteger(value)) fail(input, label + '必须为有效的正整数。');
    return value;
  }

  function fail(input, message) {
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    throw new Error(message);
  }

  function finite(value) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('数值超出可计算范围，请检查单位并缩小输入数值。');
    return value;
  }

  function format(value, unit) {
    if (unit === 'kg') return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
    if (value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 1e9)) return value.toExponential(5);
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value);
  }

  const configurations = {
    casting: {
      title: '铸件重量计算', english: 'CASTING MASS', index: '01',
      description: '从净体积出发，快速得到单件与批量理论重量。',
      formula: 'm = V × ρ / 1000',
      note: '密度预设仅为典型估算值，可按材料牌号修改。输入铸件净体积；浇冒口、加工余量和损耗请自行计入体积。',
      fields: function () {
        return selectField('material', '材料预设', [['7.2', '铸铁 · 典型 7.20'], ['7.85', '铸钢 · 典型 7.85'], ['2.7', '铝合金 · 典型 2.70'], ['8.9', '铜合金 · 典型 8.90'], ['custom', '自定义密度']]) + numberField('density', '材料密度', '7.2', 'g/cm³') + numberField('volume', '单件净体积', '1250', 'cm³') + numberField('quantity', '铸件数量', '1', '件', { integer: true });
      },
      calculate: function (form) {
        const volume = readNumber(form, 'volume', '单件净体积');
        const density = readNumber(form, 'density', '材料密度');
        const quantity = readNumber(form, 'quantity', '铸件数量', { integer: true });
        const single = finite(volume * density / 1000);
        return { value: finite(single * quantity), unit: 'kg', label: '铸件总重量', details: [['单件重量', format(single, 'kg') + ' kg'], ['计算数量', quantity + ' 件']], context: '净体积 ' + volume + ' cm³ · 密度 ' + density + ' g/cm³' };
      }
    },
    inertia: {
      title: '转子转动惯量计算', english: 'ROTOR INERTIA', index: '02',
      description: '计算均匀圆柱转子绕自身中心轴的转动惯量。',
      formula: 'J = m × (Dₒ² + Dᵢ²) / 8 × 10⁻⁶',
      note: '直径单位为 mm。模型假设质量沿圆柱或圆环均匀分布，实心圆柱的内径为 0；复杂转子应按部件分别计算后求和。',
      fields: function () {
        return selectField('shape', '转子简化模型', [['hollow', '空心圆柱'], ['solid', '实心圆柱']]) + numberField('mass', '转子质量', '12', 'kg') + numberField('outer', '转子外径 Dₒ', '180', 'mm') + numberField('inner', '转子内径 Dᵢ', '45', 'mm', { min: 0 });
      },
      calculate: function (form) {
        const mass = readNumber(form, 'mass', '转子质量');
        const outer = readNumber(form, 'outer', '转子外径');
        const inner = form.elements.shape.value === 'solid' ? 0 : readNumber(form, 'inner', '转子内径', { min: 0 });
        if (inner >= outer) fail(form.elements.inner, '转子内径必须小于外径。');
        const result = finite(mass * (outer * outer + inner * inner) / 8 * 1e-6);
        return { value: result, unit: 'kg·m²', label: '中心轴转动惯量', details: [['回转半径', format(Math.sqrt((outer * outer + inner * inner) / 8)) + ' mm'], ['模型', inner === 0 ? '实心圆柱' : '空心圆柱']], context: '质量 ' + mass + ' kg · 外径 ' + outer + ' mm · 内径 ' + inner + ' mm' };
      }
    },
    wire: {
      title: '线规分重', english: 'WIRE WEIGHT ALLOCATION', index: '04',
      description: '输入两种铜线的直径、根数与合计重量，拆分每种规格的重量。',
      formula: 'mₐ = M × dₐ²nₐ / (dₐ²nₐ + dᵦ²nᵦ)\nmᵦ = M − mₐ',
      note: '按两种铜线每根长度相同、铜密度相同计算，重量比例为“直径² × 根数”。直径取裸铜线直径，总重量取铜净重，不含漆膜、绝缘或包装；单根长度不同时不适用。',
      fields: function () {
        return numberField('diameterA', '规格 A · 铜线直径', '1.0', 'mm') + numberField('countA', '规格 A · 根数', '2', '根', { integer: true }) + numberField('diameterB', '规格 B · 铜线直径', '2.0', 'mm') + numberField('countB', '规格 B · 根数', '1', '根', { integer: true }) + numberField('totalWeight', '两种铜线总重量', '12', 'kg', { fullWidth: true });
      },
      calculate: function (form) {
        const diameterA = readNumber(form, 'diameterA', '规格 A 铜线直径');
        const countA = readNumber(form, 'countA', '规格 A 根数', { integer: true });
        const diameterB = readNumber(form, 'diameterB', '规格 B 铜线直径');
        const countB = readNumber(form, 'countB', '规格 B 根数', { integer: true });
        const total = readNumber(form, 'totalWeight', '两种铜线总重量');
        // A common diameter scale cancels out and avoids overflowing d².
        const scale = Math.max(diameterA, diameterB);
        const scoreA = finite(Math.pow(diameterA / scale, 2) * countA);
        const scoreB = finite(Math.pow(diameterB / scale, 2) * countB);
        const ratioA = scoreA / (scoreA + scoreB);
        const ratioB = scoreB / (scoreA + scoreB);
        // Compute the smaller share directly to preserve its precision.
        const weightA = finite(scoreA <= scoreB ? total * ratioA : total - total * ratioB);
        const weightB = finite(scoreA <= scoreB ? total - weightA : total * ratioB);
        const specA = 'Ø ' + format(diameterA) + ' mm × ' + countA + ' 根';
        const specB = 'Ø ' + format(diameterB) + ' mm × ' + countB + ' 根';
        return {
          value: total, unit: 'kg', label: '铜线总重量',
          allocations: [
            { label: '规格 A 重量', value: weightA, spec: specA, percent: ratioA * 100 },
            { label: '规格 B 重量', value: weightB, spec: specB, percent: ratioB * 100 }
          ],
          details: [['合计重量', format(total, 'kg') + ' kg'], ['分配依据', '等长铜线 · 按截面积 × 根数']],
          context: '规格 A：' + specA + '\n规格 B：' + specB
        };
      }
    },
    resistance: {
      title: '电阻换算', english: 'RESISTANCE CONVERSION', index: '05',
      description: '由单相绕组电阻，换算目标温度下的相电阻及两种接法的线电阻。',
      formula: 'R相₂ = R相₁ × (K + t₂) / (K + t₁)\nR线Δ = 2R相₂ / 3    R线Y = 2R相₂',
      note: '输入单相绕组直流电阻（相电阻）。假设三相绕组电阻相等，线电阻指任意两个线端之间的直流电阻，第三线端悬空；全部结果对应目标温度。铜 K = 235、铝 K = 225，适用温度 −50～200 °C，不计接触电阻与交流效应。',
      fields: function () {
        return selectField('material', '导体材料', [['235', '铜 · K = 235'], ['225', '铝 · K = 225']]) + numberField('resistance', '测量相电阻 R相₁', '1.25', 'Ω') + numberField('from', '测量温度 t₁', '75', '°C', { min: -50 }) + numberField('to', '目标温度 t₂', '20', '°C', { min: -50 });
      },
      calculate: function (form) {
        const resistance = readNumber(form, 'resistance', '测量相电阻');
        const from = readNumber(form, 'from', '测量温度', { min: -50, max: 200 });
        const to = readNumber(form, 'to', '目标温度', { min: -50, max: 200 });
        const constant = Number(form.elements.material.value);
        const ratio = (constant + to) / (constant + from);
        const phase = finite(resistance * ratio);
        return {
          value: phase, unit: 'Ω', label: to + ' °C · 单相绕组电阻',
          connections: [
            { label: '三角接法 Δ · 线电阻', value: finite(phase * (2 / 3)), spec: 'R线Δ = 2R相 / 3' },
            { label: '星型接法 Y · 线电阻', value: finite(phase * 2), spec: 'R线Y = 2R相' }
          ],
          details: [['温度变化', from + ' → ' + to + ' °C'], ['电阻变化', (ratio >= 1 ? '+' : '') + format((ratio - 1) * 100) + '%']],
          context: (constant === 235 ? '铜' : '铝') + '导体 · K = ' + constant + ' · 测量相电阻 ' + resistance + ' Ω · 测量温度 ' + from + ' °C · 目标温度 ' + to + ' °C'
        };
      }
    },
    efficiency: {
      title: '能效查询', english: 'EFFICIENCY LOOKUP', index: '03',
      description: '按转速与功率，查询变频控制同步电机的一级能效参考值。'
    }
  };

  let dialog;
  let currentId;
  let copyText = '';
  let previousOverflow;
  let hasScrollLock = false;
  let cleanupEfficiency;

  function cleanupTool() {
    if (cleanupEfficiency) { cleanupEfficiency(); cleanupEfficiency = null; }
  }

  function releaseScrollLock() {
    if (!hasScrollLock) return;
    document.documentElement.style.overflow = previousOverflow || '';
    hasScrollLock = false;
  }

  function makeDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'calc-dialog';
    dialog.setAttribute('aria-labelledby', 'calc-title');
    dialog.setAttribute('aria-describedby', 'calc-description');
    document.body.appendChild(dialog);
    dialog.addEventListener('close', function () {
      if (!dialog.open && hasScrollLock) {
        cleanupTool();
        releaseScrollLock();
        window.dispatchEvent(new CustomEvent('toolbox:closed', { detail: { id: currentId } }));
      }
    });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }

  function clearResult() {
    copyText = '';
    dialog.querySelectorAll('[aria-invalid]').forEach(function (element) { element.removeAttribute('aria-invalid'); });
    const output = dialog.querySelector('.calc-result');
    if (output) {
      output.classList.remove('calc-result-ready');
      output.innerHTML = '<span class="calc-result-label">计算结果</span><div class="calc-placeholder">— <span>等待计算</span></div><p class="calc-result-hint">调整参数，开始一次精确计算。</p>';
    }
    const copy = dialog.querySelector('.calc-copy');
    if (copy) copy.disabled = true;
    const message = dialog.querySelector('.calc-message');
    if (message) message.textContent = '';
  }

  function showResult(result, config) {
    const output = dialog.querySelector('.calc-result');
    output.classList.add('calc-result-ready');
    const values = result.allocations ? '<div class="calc-allocation">' + result.allocations.map(function (part) {
      return '<div class="calc-allocation-part"><span class="calc-result-label">' + part.label + '</span><div class="calc-result-value">' + format(part.value, result.unit) + '<span>' + result.unit + '</span></div><p class="calc-allocation-spec">' + part.spec + '</p><span class="calc-allocation-percent">占总重 ' + format(part.percent) + '%</span></div>';
    }).join('') + '</div><div class="calc-allocation-bar" aria-hidden="true"><span style="width:' + result.allocations[0].percent + '%"></span></div>' : '<span class="calc-result-label">' + result.label + '</span><div class="calc-result-value">' + format(result.value, result.unit) + '<span>' + result.unit + '</span></div>';
    const connectionValues = result.connections ? '<div class="calc-allocation calc-connections">' + result.connections.map(function (part) {
      return '<div class="calc-allocation-part"><span class="calc-result-label">' + part.label + '</span><div class="calc-result-value">' + format(part.value, result.unit) + '<span>' + result.unit + '</span></div><p class="calc-allocation-spec">' + part.spec + '</p></div>';
    }).join('') + '</div>' : '';
    output.innerHTML = values + connectionValues + '<dl class="calc-result-details">' + result.details.map(function (row) { return '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>'; }).join('') + '</dl>';
    const allocationText = result.allocations ? result.allocations.map(function (part) { return part.label + '：' + format(part.value, result.unit) + ' ' + result.unit + '（占总重 ' + format(part.percent) + '%）'; }).join('\n') + '\n' : '';
    const connectionText = result.connections ? result.connections.map(function (part) { return part.label + '：' + format(part.value, result.unit) + ' ' + result.unit; }).join('\n') + '\n' : '';
    copyText = config.title + '\n' + result.context + '\n' + allocationText + result.label + '：' + format(result.value, result.unit) + ' ' + result.unit + '\n' + connectionText + result.details.map(function (row) { return row[0] + '：' + row[1]; }).join('\n') + '\n公式：' + config.formula + '\n说明：' + config.note;
    dialog.querySelector('.calc-copy').disabled = false;
  }

  async function copyResult() {
    const message = dialog.querySelector('.calc-message');
    const text = copyText;
    if (!text) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (copyText === text) message.textContent = '已复制计算结果与参数。';
    } catch (_) {
      if (copyText === text) message.textContent = '无法访问剪贴板，请选择结果文字手动复制。';
    }
  }

  function efficiencyContent() {
    return window.ToolboxEfficiency ? window.ToolboxEfficiency.content() : '<p class="calc-note">能效工具暂时无法加载，请刷新后重试。</p>';
  }

  function open(id) {
    if (!Object.prototype.hasOwnProperty.call(configurations, id)) return false;
    const config = configurations[id];
    makeDialog();
    cleanupTool();
    if (dialog.open) dialog.close();
    releaseScrollLock();
    currentId = id;
    copyText = '';
    const header = '<div class="calc-topline"><span>DESIGN TOOLBOX <span class="calc-topline-divider">/</span> ' + config.index + '</span><button class="calc-close" type="button" aria-label="关闭工具"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></div><header class="calc-header"><span class="calc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[id] + '</svg></span><div><span class="calc-eyebrow">' + config.english + '</span><h2 id="calc-title">' + config.title + '</h2></div></header><p id="calc-description" class="calc-description">' + config.description + '</p>';
    const body = id === 'efficiency' ? efficiencyContent() : '<form class="calc-form" novalidate><div class="calc-fields">' + config.fields() + '</div><div class="calc-formula"><span>FORMULA</span><code>' + config.formula + '</code></div><p class="calc-note">' + config.note + '</p><div class="calc-actions"><button class="calc-primary" type="submit">开始计算' + arrow + '</button><button class="calc-reset" type="reset">重置参数</button></div></form><section class="calc-result" aria-live="polite" aria-atomic="true"></section><div class="calc-result-footer"><p class="calc-message" role="status"></p><button class="calc-copy" type="button" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>复制结果</button></div>';
    const footerNote = id === 'efficiency' ? '本地查询 · 重新打开时恢复默认参数' : '本地计算 · 重新打开时恢复默认参数';
    dialog.innerHTML = '<div class="calc-shell">' + header + body + '<footer class="calc-footer"><span class="calc-footer-dot"></span> ' + footerNote + '<span>ESC 关闭</span></footer></div>';
    dialog.querySelector('.calc-close').addEventListener('click', function () { dialog.close(); });
    if (id !== 'efficiency') {
      const form = dialog.querySelector('form');
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearResult();
        try { showResult(config.calculate(form), config); }
        catch (error) { dialog.querySelector('.calc-message').textContent = error.message; }
      });
      form.addEventListener('input', function (event) {
        clearResult();
        if (event.target.name === 'density') form.elements.material.value = 'custom';
      });
      form.addEventListener('change', function (event) {
        clearResult();
        if (event.target.name === 'material' && form.elements.density && event.target.value !== 'custom') form.elements.density.value = event.target.value;
        if (event.target.name === 'shape') {
          const solid = event.target.value === 'solid';
          form.elements.inner.disabled = solid;
          if (solid) form.elements.inner.value = '0';
        }
      });
      form.addEventListener('reset', function () {
        clearResult();
        if (form.elements.inner) form.elements.inner.disabled = false;
      });
      dialog.querySelector('.calc-copy').addEventListener('click', copyResult);
      clearResult();
    } else if (window.ToolboxEfficiency) {
      cleanupEfficiency = window.ToolboxEfficiency.mount(dialog, { setCopyText: function (text) {
        copyText = text;
        dialog.querySelector('.calc-copy').disabled = !text;
      } });
      dialog.querySelector('.calc-copy').addEventListener('click', copyResult);
    }
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    dialog.scrollTop = 0;
    document.documentElement.style.overflow = 'hidden';
    hasScrollLock = true;
    document.dispatchEvent(new CustomEvent('toolbox:used', { detail: { id: currentId, title: config.title }, bubbles: true }));
    return true;
  }

  window.ToolboxCalculator = Object.freeze({ open: open });
})();
