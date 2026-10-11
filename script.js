const DENSITY = 1.1; // г/см³
const STATE_KEY = 'epoxyCalcState';
const PRESETS_KEY = 'epoxyCalcPresets';
const FIELDS = ['rectLength', 'rectWidth', 'rectHeight', 'circleDiameter', 'circleHeight', 'partA', 'partB'];
const SHAPE_FIELDS = {
    rect: ['rectLength', 'rectWidth', 'rectHeight'],
    circle: ['circleDiameter', 'circleHeight']
};

const $ = id => document.getElementById(id);
const fmt = (n, digits = 1) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits });
const fmtInput = v => fmt(parseFloat(v) || 0, 2);

function readStorage(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Хранилище недоступно (приватный режим и т.п.) — калькулятор работает и без него
    }
}

// ---------- Состояние ----------

function getShape() {
    return document.querySelector('.shape-card.selected').dataset.shape;
}

function setShape(shape) {
    document.querySelectorAll('.shape-card').forEach(card => {
        const isSelected = card.dataset.shape === shape;
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-checked', isSelected);
    });
    $('rectFields').hidden = shape !== 'rect';
    $('circleFields').hidden = shape !== 'circle';
}

function getState() {
    const state = { shape: getShape() };
    FIELDS.forEach(id => { state[id] = $(id).value; });
    return state;
}

function applyState(state) {
    if (SHAPE_FIELDS[state.shape]) setShape(state.shape);
    FIELDS.forEach(id => {
        if (state[id]) $(id).value = state[id];
    });
}

function compute(state) {
    const v = id => parseFloat(state[id]) || 0;
    const volume = state.shape === 'rect'
        ? v('rectLength') * v('rectWidth') * v('rectHeight')
        : Math.PI * Math.pow(v('circleDiameter') / 2, 2) * v('circleHeight');
    const mass = volume * DENSITY;
    const partA = v('partA');
    const partB = v('partB');
    const sum = partA + partB;
    return {
        volume,
        mass,
        amountA: sum > 0 ? mass * partA / sum : 0,
        amountB: sum > 0 ? mass * partB / sum : 0
    };
}

function describe(state) {
    return state.shape === 'rect'
        ? `${fmtInput(state.rectLength)} × ${fmtInput(state.rectWidth)} × ${fmtInput(state.rectHeight)} см`
        : `⌀ ${fmtInput(state.circleDiameter)} × ${fmtInput(state.circleHeight)} см`;
}

function sameState(a, b) {
    if (a.shape !== b.shape) return false;
    return [...SHAPE_FIELDS[a.shape], 'partA', 'partB']
        .every(id => parseFloat(a[id]) === parseFloat(b[id]));
}

// ---------- Расчёт ----------

function calculate() {
    const state = getState();
    const { mass, amountA, amountB } = compute(state);

    $('totalMass').textContent = fmt(mass);
    $('totalMassKg').textContent = fmt(mass / 1000, 2);
    $('amountA').textContent = fmt(amountA);
    $('amountB').textContent = fmt(amountB);

    renderViz(state);
    markActivePreset(state);
    writeStorage(STATE_KEY, state);
}

// ---------- Визуализация ----------

const VIZ_W = 440;
const VIZ_H = 230;
const VIZ_PAD = 34;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

// Изометрическая проекция: x уходит вправо-вниз, y — влево-вниз, z — вверх
const iso = (x, y, z) => [(x - y) * COS30, (x + y) * SIN30 - z];

// Подбирает масштаб и сдвиг, чтобы все точки поместились в viewBox
function fitTo(points) {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = Math.min((VIZ_W - VIZ_PAD * 2) / (maxX - minX || 1), (VIZ_H - VIZ_PAD * 2) / (maxY - minY || 1));
    const dx = (VIZ_W - (maxX - minX) * k) / 2 - minX * k;
    const dy = (VIZ_H - (maxY - minY) * k) / 2 - minY * k;
    return { k, pt: ([x, y]) => [x * k + dx, y * k + dy] };
}

// Высота заливки для картинки: реальная, но не тоньше 4% и не выше 90% от размера формы
function visualHeight(h, size) {
    return Math.min(Math.max(h, size * 0.04), size * 0.9);
}

const VIZ_DEFS = `
<defs>
    <linearGradient id="resinTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffdf9a"/>
        <stop offset=".55" stop-color="#e3a445"/>
        <stop offset="1" stop-color="#b8681a"/>
    </linearGradient>
    <linearGradient id="resinLeft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cf8a2f"/>
        <stop offset="1" stop-color="#7a400d"/>
    </linearGradient>
    <linearGradient id="resinRight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a7621b"/>
        <stop offset="1" stop-color="#552a06"/>
    </linearGradient>
    <linearGradient id="resinCyl" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6b3508"/>
        <stop offset=".35" stop-color="#c98330"/>
        <stop offset=".5" stop-color="#e9ab52"/>
        <stop offset="1" stop-color="#5a2c06"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
        <stop offset=".3" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".42" stop-color="#fff" stop-opacity=".35"/>
        <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="16"/>
    </filter>
</defs>`;

const GLASS = 'fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-linejoin="round"';

function renderViz(state) {
    const svg = $('vizSvg');
    const v = id => parseFloat(state[id]) || 0;
    if (!SHAPE_FIELDS[state.shape].every(id => v(id) > 0)) {
        svg.innerHTML = '';
        return;
    }

    const realH = state.shape === 'rect' ? v('rectHeight') : v('circleHeight');
    const size = state.shape === 'rect' ? Math.max(v('rectLength'), v('rectWidth')) : v('circleDiameter');
    const hv = visualHeight(realH, size);

    svg.innerHTML = VIZ_DEFS + (state.shape === 'rect'
        ? rectViz(v('rectLength'), v('rectWidth'), hv, state)
        : circleViz(v('circleDiameter'), hv, state));
}

function rectViz(L, W, hv, state) {
    const mh = hv + Math.max(hv * 0.35, Math.max(L, W) * 0.08); // высота бортов формы
    const corners = [[0, 0], [L, 0], [L, W], [0, W]];
    const { pt } = fitTo(corners.flatMap(([x, y]) => [iso(x, y, 0), iso(x, y, mh)]));
    const P = (x, y, z) => pt(iso(x, y, z));
    const poly = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    const face = (pts, attrs) => `<polygon points="${poly(pts)}" ${attrs}/>`;

    const top = corners.map(([x, y]) => P(x, y, hv));
    const label = (x, y, angle, text) =>
        `<text class="viz-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" transform="rotate(${angle} ${x.toFixed(1)} ${y.toFixed(1)})">${text}</text>`;

    const [lx, ly] = P(L / 2, W, 0);
    const [wx, wy] = P(L, W / 2, 0);
    const [hx, hy] = P(L, 0, hv / 2);

    return [
        // Тёплое свечение под формой
        face(corners.map(([x, y]) => P(x, y, 0)), 'fill="#e3a445" opacity=".28" filter="url(#glow)"'),
        // Задние стенки формы
        face([P(0, 0, 0), P(0, W, 0), P(0, W, mh), P(0, 0, mh)], GLASS),
        face([P(0, 0, 0), P(L, 0, 0), P(L, 0, mh), P(0, 0, mh)], GLASS),
        // Смола
        face([P(0, W, 0), P(L, W, 0), P(L, W, hv), P(0, W, hv)], 'fill="url(#resinLeft)"'),
        face([P(L, 0, 0), P(L, W, 0), P(L, W, hv), P(L, 0, hv)], 'fill="url(#resinRight)"'),
        face(top, 'fill="url(#resinTop)"'),
        face(top, 'fill="url(#gloss)"'),
        `<polyline points="${poly([P(0, W, hv), P(L, W, hv), P(L, 0, hv)])}" fill="none" stroke="#ffe6b5" stroke-opacity=".7" stroke-width="1"/>`,
        // Передние стенки (стекло поверх смолы) и верхний край
        face([P(0, W, 0), P(L, W, 0), P(L, W, mh), P(0, W, mh)], GLASS),
        face([P(L, 0, 0), P(L, W, 0), P(L, W, mh), P(L, 0, mh)], GLASS),
        face(corners.map(([x, y]) => P(x, y, mh)), 'fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1"'),
        // Размеры
        label(lx - 10, ly + 20, 30, `${fmtInput(state.rectLength)} см`),
        label(wx + 10, wy + 20, -30, `${fmtInput(state.rectWidth)} см`),
        `<text class="viz-label" x="${(hx + 12).toFixed(1)}" y="${(hy + 4).toFixed(1)}">${fmtInput(state.rectHeight)} см</text>`
    ].join('');
}

function circleViz(D, hv, state) {
    const R = D / 2;
    const mh = hv + Math.max(hv * 0.35, D * 0.08);
    // Окружность в изометрии — эллипс с полуосями R·√2·cos30 и R·√2·sin30
    const rx0 = R * Math.SQRT2 * COS30;
    const ry0 = R * Math.SQRT2 * SIN30;
    const { k, pt } = fitTo([[-rx0, ry0], [rx0, ry0], [-rx0, -ry0 - mh], [rx0, -ry0 - mh]]);
    const rx = rx0 * k;
    const ry = ry0 * k;
    const [cx, cy0] = pt([0, 0]);
    const cyAt = z => cy0 - z * k;

    // Боковая поверхность цилиндра от высоты z1 до z2 (видимая передняя половина)
    const side = (z1, z2, attrs) => {
        const b = cyAt(z1), t = cyAt(z2);
        return `<path d="M${cx - rx},${t} L${cx - rx},${b} A${rx},${ry} 0 0 0 ${cx + rx},${b} L${cx + rx},${t} A${rx},${ry} 0 0 1 ${cx - rx},${t} Z" ${attrs}/>`;
    };
    const ellipse = (z, attrs) => `<ellipse cx="${cx}" cy="${cyAt(z)}" rx="${rx}" ry="${ry}" ${attrs}/>`;

    return [
        ellipse(0, 'fill="#e3a445" opacity=".3" filter="url(#glow)"'),
        // Задняя стенка формы
        ellipse(mh, 'fill="rgba(255,255,255,0.025)" stroke="none"'),
        side(0, mh, 'fill="rgba(255,255,255,0.02)" stroke="none"'),
        `<path d="M${cx - rx},${cyAt(mh)} A${rx},${ry} 0 0 1 ${cx + rx},${cyAt(mh)}" fill="none" stroke="rgba(255,255,255,0.22)"/>`,
        // Смола
        side(0, hv, 'fill="url(#resinCyl)"'),
        ellipse(hv, 'fill="url(#resinTop)"'),
        ellipse(hv, 'fill="url(#gloss)"'),
        `<path d="M${cx - rx},${cyAt(hv)} A${rx},${ry} 0 0 0 ${cx + rx},${cyAt(hv)}" fill="none" stroke="#ffe6b5" stroke-opacity=".7"/>`,
        // Передняя стенка и край
        side(0, mh, GLASS),
        `<path d="M${cx - rx},${cyAt(mh)} A${rx},${ry} 0 0 0 ${cx + rx},${cyAt(mh)}" fill="none" stroke="rgba(255,255,255,0.32)"/>`,
        // Размеры
        `<text class="viz-label" x="${cx}" y="${cyAt(0) + ry + 24}" text-anchor="middle">⌀ ${fmtInput(state.circleDiameter)} см</text>`,
        `<text class="viz-label" x="${cx + rx + 12}" y="${cyAt(hv / 2) + 4}">${fmtInput(state.circleHeight)} см</text>`
    ].join('');
}

// ---------- Сохранённые расчёты ----------

let presets = readStorage(PRESETS_KEY, []);

function savePresets() {
    writeStorage(PRESETS_KEY, presets);
}

function renderPresets(highlightId) {
    const list = $('savedList');
    const current = getState();
    list.innerHTML = '';
    $('savedEmpty').hidden = presets.length > 0;
    $('savedCount').hidden = presets.length === 0;
    $('savedCount').textContent = presets.length;

    presets.forEach(preset => {
        const { mass } = compute(preset.state);
        const item = document.createElement('li');
        item.className = 'saved-item';
        item.dataset.id = preset.id;
        item.classList.toggle('active', sameState(preset.state, current));
        if (preset.id === highlightId) item.classList.add('just-saved');

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'saved-apply';
        apply.title = 'Подставить расчёт';

        const name = document.createElement('span');
        name.className = 'saved-name';
        name.textContent = preset.name;

        const massEl = document.createElement('span');
        massEl.className = 'saved-mass';
        massEl.textContent = mass >= 1000 ? `${fmt(mass / 1000, 2)} кг` : `${fmt(mass)} г`;

        const meta = document.createElement('span');
        meta.className = 'saved-meta';
        meta.textContent = `${describe(preset.state)} · ${fmtInput(preset.state.partA)}:${fmtInput(preset.state.partB)}`;

        apply.append(name, massEl, meta);
        apply.addEventListener('click', () => {
            applyState(preset.state);
            calculate();
            $('savedSheet').close();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'saved-delete';
        del.textContent = '×';
        del.setAttribute('aria-label', `Удалить «${preset.name}»`);
        let confirmTimer;
        del.addEventListener('click', () => {
            if (!del.classList.contains('confirm')) {
                del.classList.add('confirm');
                del.textContent = 'Удалить';
                confirmTimer = setTimeout(() => {
                    del.classList.remove('confirm');
                    del.textContent = '×';
                }, 3000);
                return;
            }
            clearTimeout(confirmTimer);
            presets = presets.filter(p => p.id !== preset.id);
            savePresets();
            renderPresets();
        });

        item.append(apply, del);
        list.append(item);
    });
}

function markActivePreset(state) {
    document.querySelectorAll('.saved-item').forEach(item => {
        const preset = presets.find(p => p.id === item.dataset.id);
        item.classList.toggle('active', !!preset && sameState(preset.state, state));
    });
}

$('saveForm').addEventListener('submit', e => {
    e.preventDefault();
    const state = getState();
    const name = $('saveName').value.trim() || describe(state);
    const existing = presets.find(p => p.name.toLowerCase() === name.toLowerCase());
    const preset = existing || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name };

    preset.state = state;
    preset.updatedAt = Date.now();
    // Новый или обновлённый расчёт — наверх списка
    presets = [preset, ...presets.filter(p => p !== preset)];
    savePresets();
    renderPresets(preset.id);
    $('saveName').value = '';
    $('saveName').blur();
});

const sheet = $('savedSheet');
$('savedOpen').addEventListener('click', () => {
    renderPresets();
    sheet.showModal();
});
$('savedClose').addEventListener('click', () => sheet.close());
// Тап по затемнённому фону закрывает шторку
sheet.addEventListener('click', e => {
    if (e.target === sheet) sheet.close();
});

// ---------- События ----------

document.querySelectorAll('.shape-card').forEach(card => {
    card.addEventListener('click', () => {
        setShape(card.dataset.shape);
        calculate();
    });
});

$('formInputs').addEventListener('input', calculate);
$('formInputs').addEventListener('submit', e => e.preventDefault());

// «Далее» на клавиатуре телефона переводит к следующему полю, на последнем — прячет клавиатуру
$('formInputs').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = [...$('formInputs').querySelectorAll('input')].filter(input => input.offsetParent);
    const next = inputs[inputs.indexOf(e.target) + 1];
    next ? next.focus() : e.target.blur();
});

applyState(readStorage(STATE_KEY, {}));
renderPresets();
calculate();
