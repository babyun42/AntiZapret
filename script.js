/* ЛОГИКА ЭКРАНА ЗАГРУЗКИ */
window.addEventListener('load', () => {
    // Задержка внутри 1–3с, чтобы экран загрузки не мигал слишком быстро,
    // плюс сам фейд теперь длиннее (0.6с в CSS) — исчезновение выглядит плавным.
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.classList.add('hidden');
    }, 1800);
});

// Переключает иконку внутри кнопки-гайда: Keyboard Arrow Down <-> close (открыто),
// с небольшой анимацией — иконка сначала сжимается/поворачивается и исчезает,
// затем на её месте появляется новая.
function setGuideBtnIcon(btn, isOpen) {
    if(!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    if(!icon) return;
    icon.style.transform = 'scale(0.4) rotate(-90deg)';
    icon.style.opacity = '0';
    setTimeout(() => {
        icon.textContent = isOpen ? 'close' : 'Keyboard_Arrow_Down';
        icon.style.transform = 'scale(1) rotate(0deg)';
        icon.style.opacity = '1';
    }, 140);
}

// Переключение обычных гайдов
function toggleGuide(id, btn) {
    const guide = document.getElementById(id);
    if(guide) guide.classList.toggle('visible');
    const isOpen = guide && guide.classList.contains('visible');
    // Пока гайд открыт — левая (иконочная) кнопка остаётся полностью
    // скруглённой капсулой, а не только на время наведения/нажатия.
    if(btn) btn.classList.toggle('open', isOpen);
    setGuideBtnIcon(btn, isOpen);
}

// Специальное переключение для Tor Android (ссылки + текст)
function toggleTorGuide(btn) {
    const links = document.getElementById('tor-android-links');
    const guide = document.getElementById('guide-tor-android');
    if(links) links.classList.toggle('visible');
    if(guide) guide.classList.toggle('visible');
    const isOpen = guide && guide.classList.contains('visible');
    if(btn) btn.classList.toggle('open', isOpen);
    setGuideBtnIcon(btn, isOpen);
}


/* ЛОГИКА ТЕМЫ: ТЁМНЫЙ/СВЕТЛЫЙ РЕЖИМ + ДИНАМИЧЕСКИЙ АКЦЕНТНЫЙ ЦВЕТ
   Кнопка теперь не переключает тему сама, а открывает панель-редактор:
   внутри — переключатель светлой/тёмной темы, набор готовых цветов, свой
   цвет и сброс. Активный акцентный цвет задаётся одним "оттенком" (hue),
   из которого на лету пересчитываются все 10 цветовых токенов сайта. */
const THEME_STORAGE_KEY = 'site-theme-settings';
const THEME_TOKENS = [
    '--md-sys-color-background', '--md-sys-color-on-background',
    '--md-sys-color-surface', '--md-sys-color-surface-variant', '--md-sys-color-on-surface-variant',
    '--md-sys-color-primary', '--md-sys-color-on-primary',
    '--md-sys-color-primary-container', '--md-sys-color-on-primary-container',
    '--md-sys-color-outline'
];

function loadThemeSettings() {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function saveThemeSettings(settings) {
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
}

// Оттенок (0-360) из HEX — нужен, чтобы понять, какой hue выбрали через
// нативный input[type=color].
function hexToHue(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    return h;
}

// Обратно: HSL -> HEX, чтобы показать текущий акцент в input[type=color].
function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function hueToHex(hue) {
    return hslToHex(hue, 90, 38);
}

// Приблизительная генерация M3-подобной палитры из одного оттенка. Это не
// полноценный алгоритм HCT из material-color-utilities, а лёгкое
// HSL-приближение — но токенов всего 10, и подобранные S/L неплохо держат
// контраст текста на фоне в обоих режимах.
function buildPalette(hue, isDark) {
    return isDark ? {
        '--md-sys-color-background': `hsl(${hue}, 12%, 10%)`,
        '--md-sys-color-on-background': `hsl(${hue}, 8%, 90%)`,
        '--md-sys-color-surface': `hsl(${hue}, 10%, 13%)`,
        '--md-sys-color-surface-variant': `hsl(${hue}, 10%, 28%)`,
        '--md-sys-color-on-surface-variant': `hsl(${hue}, 12%, 79%)`,
        '--md-sys-color-primary': `hsl(${hue}, 80%, 83%)`,
        '--md-sys-color-on-primary': `hsl(${hue}, 60%, 18%)`,
        '--md-sys-color-primary-container': `hsl(${hue}, 55%, 27%)`,
        '--md-sys-color-on-primary-container': `hsl(${hue}, 80%, 90%)`,
        '--md-sys-color-outline': `hsl(${hue}, 6%, 58%)`,
    } : {
        '--md-sys-color-background': `hsl(${hue}, 30%, 99%)`,
        '--md-sys-color-on-background': `hsl(${hue}, 10%, 11%)`,
        '--md-sys-color-surface': `hsl(${hue}, 24%, 96%)`,
        '--md-sys-color-surface-variant': `hsl(${hue}, 20%, 90%)`,
        '--md-sys-color-on-surface-variant': `hsl(${hue}, 8%, 29%)`,
        '--md-sys-color-primary': `hsl(${hue}, 90%, 38%)`,
        '--md-sys-color-on-primary': '#ffffff',
        '--md-sys-color-primary-container': `hsl(${hue}, 95%, 92%)`,
        '--md-sys-color-on-primary-container': `hsl(${hue}, 85%, 15%)`,
        '--md-sys-color-outline': `hsl(${hue}, 6%, 48%)`,
    };
}

// hue === null значит "заводская палитра" — просто снимаем инлайн-переопределения
// и в силу вступают обычные значения из :root / body.dark-theme в style.css.
// ВАЖНО: переопределяем именно на <body>, а не на <html> — иначе в тёмной
// теме правило body.dark-theme{...} (объявлено прямо на самом body) всё
// равно победило бы унаследованное с html значение, и кастомный цвет просто
// не был бы виден при переключении на тёмную тему.
function applyHue(hue, isDark) {
    const rootStyle = document.body.style;
    if (hue === null || hue === undefined) {
        THEME_TOKENS.forEach(t => rootStyle.removeProperty(t));
        return;
    }
    const palette = buildPalette(hue, isDark);
    THEME_TOKENS.forEach(t => rootStyle.setProperty(t, palette[t]));
}

function syncMapTiles(isDark) {
    if (map && window.currentTiles) {
        const newTilesUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        window.currentTiles.setUrl(newTilesUrl);
    }
}

// 1. Считываем сохранённые настройки и сразу применяем их — ещё до того, как
//    настроится сама панель, чтобы страница не "мигала" заводской темой.
const themeSettings = loadThemeSettings();
const legacySavedTheme = localStorage.getItem('site-theme'); // старый ключ, для обратной совместимости
let isDarkMode = typeof themeSettings.dark === 'boolean' ? themeSettings.dark : (legacySavedTheme === 'dark');
let currentHue = typeof themeSettings.hue === 'number' ? themeSettings.hue : null;

document.body.classList.toggle('dark-theme', isDarkMode);
applyHue(currentHue, isDarkMode);

// 2. Сама панель: открытие/закрытие, переключатель, пресеты, свой цвет, сброс.
(function setupThemeEditor() {
    const btn = document.getElementById('theme-btn');
    const panel = document.getElementById('theme-editor-panel');
    const darkSwitch = document.getElementById('dark-mode-switch');
    const colorInput = document.getElementById('custom-color-input');
    const resetBtn = document.getElementById('theme-reset-btn');
    const presetButtons = document.querySelectorAll('.theme-preset');
    if (!btn) return;

    if (darkSwitch) darkSwitch.checked = isDarkMode;
    if (colorInput && currentHue !== null) colorInput.value = hueToHex(currentHue);

    function highlightPreset() {
        presetButtons.forEach(p => {
            p.classList.toggle('selected', Number(p.dataset.hue) === currentHue);
        });
    }
    highlightPreset();

    function persist() {
        saveThemeSettings({ dark: isDarkMode, hue: currentHue });
        localStorage.setItem('site-theme', isDarkMode ? 'dark' : 'light'); // держим старый ключ синхронным
    }

    if (panel) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });
        panel.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('click', () => panel.classList.remove('open'));
    }

    if (darkSwitch) {
        darkSwitch.addEventListener('change', () => {
            isDarkMode = darkSwitch.checked;
            document.body.classList.toggle('dark-theme', isDarkMode);
            applyHue(currentHue, isDarkMode);
            syncMapTiles(isDarkMode);
            persist();
        });
    }

    presetButtons.forEach(p => {
        p.addEventListener('click', () => {
            currentHue = Number(p.dataset.hue);
            applyHue(currentHue, isDarkMode);
            if (colorInput) colorInput.value = hueToHex(currentHue);
            highlightPreset();
            persist();
        });
    });

    if (colorInput) {
        colorInput.addEventListener('input', () => {
            currentHue = hexToHue(colorInput.value);
            applyHue(currentHue, isDarkMode);
            highlightPreset();
            persist();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentHue = null;
            applyHue(null, isDarkMode);
            if (colorInput) colorInput.value = '#005ac1';
            highlightPreset();
            persist();
        });
    }
})();

/* ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК */
const navContainer = document.querySelector('.nav-container');
const navItems = document.querySelectorAll('.nav-item[data-target]');
const sections = document.querySelectorAll('.page-section');
const mainEl = document.querySelector('main');
// Порядок вкладок берём прямо из шапки — этим же порядком идём при свайпе
const tabOrder = Array.from(navItems).map(item => item.getAttribute('data-target'));

function activateTab(targetId, options = {}) {
    const targetItem = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    const targetSection = document.getElementById(targetId);
    if (!targetItem || !targetSection) return;

    navItems.forEach(nav => nav.classList.remove('active'));
    sections.forEach(sec => sec.classList.remove('active'));

    targetItem.classList.add('active');
    targetSection.classList.add('active');

    // Если вкладку переключили свайпом, а не кликом по шапке — она может
    // быть не видна в горизонтально прокручиваемой шапке. Докручиваем
    // шапку так, чтобы активная вкладка отобразилась и "следовала" за выбором.
    if (options.scrollNavIntoView) {
        targetItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetId === 'home' && typeof map !== 'undefined' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => activateTab(item.getAttribute('data-target')));
});

/* --- СВАЙП ВЛЕВО/ВПРАВО ДЛЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК (МОБИЛЬНЫЕ) --- */
(function setupSwipeNavigation() {
    if (!mainEl) return;

    const SWIPE_MIN_DISTANCE = 60; // минимальная длина свайпа по горизонтали, px
    const SWIPE_MAX_DRIFT = 75;    // допустимый "съезд" по вертикали, px
    let startX = 0, startY = 0, startTarget = null;

    mainEl.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTarget = e.target;
    }, { passive: true });

    mainEl.addEventListener('touchend', (e) => {
        // Не мешаем управлению картой (перетаскивание/зум) на главной вкладке
        if (startTarget && startTarget.closest('#map')) return;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dy) > SWIPE_MAX_DRIFT) return;

        const currentId = document.querySelector('.page-section.active')?.id;
        const currentIndex = tabOrder.indexOf(currentId);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (dx < 0 && currentIndex < tabOrder.length - 1) nextIndex = currentIndex + 1; // влево — следующая вкладка
        if (dx > 0 && currentIndex > 0) nextIndex = currentIndex - 1;                    // вправо — предыдущая вкладка

        if (nextIndex !== currentIndex) {
            activateTab(tabOrder[nextIndex], { scrollNavIntoView: true });
        }
    }, { passive: true });
})();

/* --- ПРОКРУТКА ШАПКИ КОЛЕСОМ МЫШИ (УЗКОЕ ОКНО НА КОМПЬЮТЕРЕ) ---
   На телефоне вкладки листаются пальцем. На компьютере с обычной мышью
   (без трекпада) в узком окне часть вкладок может не помещаться, а
   тащить скрытый скроллбар нечем — переводим вертикальную прокрутку
   колеса в горизонтальную, пока курсор над шапкой. Трекпад, который и
   так шлёт горизонтальный deltaX, не трогаем — там нативный жест уже
   работает. */
if (navContainer) {
    navContainer.addEventListener('wheel', (e) => {
        if (navContainer.scrollWidth <= navContainer.clientWidth) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        navContainer.scrollLeft += e.deltaY;
    }, { passive: false });
}

/* --- СТИЛЬНАЯ КАРТА CARTO DB И ОБНОВЛЕНИЕ IP --- */
var map;
var marker;

function updateIpInfo(ip = '') {
    const userIsp = document.getElementById('user-isp');
    const userCountry = document.getElementById('user-country');
    const userIp = document.getElementById('user-ip');

    if(userIsp) userIsp.innerText = 'Определяем...';
    if(userCountry) userCountry.innerText = 'Определяем...';

    const url = ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : 'https://get.geojs.io/v1/ip/geo.json';

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if(userIp) userIp.innerText = data.ip || ip || 'Неизвестно';
            if(userIsp) userIsp.innerText = data.organization_name || 'Неизвестно';

            if (userCountry) {
                const country = data.country || '';
                const city = data.city || '';
                userCountry.innerText = (country && city) ? `${country}, ${city}` : (country || city || 'Неизвестно');
            }

            var lat = parseFloat(data.latitude) || 55.75;
            var lon = parseFloat(data.longitude) || 37.61;

            const mapEl = document.getElementById('map');
            if(mapEl) {
                if (!map) {
                    // Инициализируем карту
                    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([lat, lon], 12);

                    // Определяем тему карты
                    const tilesUrl = document.body.classList.contains('dark-theme')
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

                    window.currentTiles = L.tileLayer(tilesUrl).addTo(map);
                    marker = L.marker([lat, lon]).addTo(map);
                } else {
                    map.setView([lat, lon], 12);
                    marker.setLatLng([lat, lon]);
                }
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            if(userIsp) userIsp.innerText = 'Ошибка данных';
        });
}

// Стартовый запуск
updateIpInfo();

/* ЛОГИКА КЛИКА И ИЗМЕНЕНИЯ IP (АДАПТИРОВАНО ПОД CSS ИКОНКУ) */
const ipSpan = document.getElementById('user-ip');
if(ipSpan) {
    ipSpan.addEventListener('click', () => {
        // Поскольку иконка карандаша теперь сделана через псевдоэлемент ::after,
        // она больше не попадает в innerText, так что нам не нужно удалять эмодзи через replace
        let currentIp = ipSpan.innerText.trim();
        if (currentIp === 'Загрузка...' || currentIp === 'Определяем...') currentIp = '';

        // Раньше клик сразу превращал строку в поле ввода и ничего не копировал.
        // Теперь сначала копируем текущий IP в буфер обмена (с тостом), и только
        // после этого включаем редактирование.
        const startEditing = () => {
            // Замеряем точный размер строки ДО подмены на input — так рамка не
            // "прыгнет" в размере, даже если у input чуть другие метрики
            // шрифта или box-sizing по умолчанию, отличные от span.
            const rect = ipSpan.getBoundingClientRect();
            const computed = getComputedStyle(ipSpan);

            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentIp;
            input.classList.add('ip-edit-input');
            input.style.width = `${rect.width}px`;
            input.style.height = `${rect.height}px`;
            input.style.boxSizing = 'border-box';
            input.style.fontSize = computed.fontSize;

            ipSpan.replaceWith(input);
            input.focus();
            input.select();

            const saveIp = () => {
                const newIp = input.value.trim();
                if (newIp) {
                    ipSpan.innerText = newIp;
                    input.replaceWith(ipSpan);
                    updateIpInfo(newIp);
                } else {
                    input.replaceWith(ipSpan);
                }
            };

            input.addEventListener('blur', saveIp);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveIp(); });
        };

        if (currentIp && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentIp)
                .then(() => showToast('IP скопирован!'))
                .catch(() => {})
                .finally(startEditing);
        } else {
            startEditing();
        }
    });
}

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    if (message) toast.innerText = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function copyKey(elementId, btn) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const textToCopy = el.innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Ключ скопирован!');
    }).catch(err => {
        console.error("Ошибка: ", err);
    });
}

/* --- "мосты" РЯДОМ С TOR BRIDGES: подсветка при наведении ---
   Наводим — сразу становится хорошо видно (opacity: 1), держим так пару
   секунд, потом медленно гасим до 0.6 (было статично 0.5). */
(function setupBridgesHint() {
    const hint = document.querySelector('.bridges-hint');
    if (!hint) return;
    let settleTimeout = null;

    hint.addEventListener('mouseenter', () => {
        if (settleTimeout) return; // эффект уже идёт — не перезапускаем заново
        hint.classList.remove('is-settled');
        hint.classList.add('is-peeking');

        settleTimeout = setTimeout(() => {
            hint.classList.remove('is-peeking');
            hint.classList.add('is-settled');
            settleTimeout = null;
        }, 2000);
    });
})();

/* --- ПОДСКАЗКА НАД КНОПКОЙ ТЕСТА СКОРОСТИ ---
   Наводишь на кнопку (в любом её состоянии — и активна, и пока идёт тест) и
   держишь курсор ~2 секунды — всплывает подсказка. Работает и на десктопе
   (наведение мышью), и на телефоне (тап и удержание — mouseenter там тоже
   срабатывает). Слушаем hover не на самой кнопке, а на обёртке — задизейбленная
   кнопка не всегда стабильно отдаёт мышиные события в разных браузерах. */
(function setupSpeedtestHint() {
    const btn = document.getElementById('start-speedtest-btn');
    const tooltip = document.getElementById('speedtest-tooltip');
    const wrap = btn ? (btn.closest('.speedtest-btn-wrap') || btn.parentElement) : null;
    if (!btn || !tooltip || !wrap) return;

    let holdTimeout = null;

    wrap.addEventListener('mouseenter', () => {
        holdTimeout = setTimeout(() => {
            tooltip.classList.add('show');
        }, 2000);
    });

    wrap.addEventListener('mouseleave', () => {
        clearTimeout(holdTimeout);
        tooltip.classList.remove('show');
    });
})();

const btnSpeed = document.getElementById('start-speedtest-btn');
const resPing = document.getElementById('res-ping');
const resDown = document.getElementById('res-down');
const resUp = document.getElementById('res-up');

// Фронтенд лежит на GitHub Pages, а бэкенд (/ping, /download, /upload) —
// на отдельном сервере, поэтому тут прямой адрес, а не пустая строка.
// ВАЖНО: обязательно https — Pages отдаёт страницу по https, и запрос на
// http браузер заблокирует как смешанный контент.
const BACKEND_URL = 'https://babyun.fun';

// Тест ограничен по ВРЕМЕНИ, а не по фиксированному объёму: так на
// медленном канале он не будет тянуться минутами, а на быстром — не
// закончится раньше, чем скорость успеет разогнаться. Значения ниже —
// это "потолок" объёма, который мы готовы передать за один тест.
const MAX_DOWNLOAD_BYTES = 300 * 1024 * 1024; // 300 MB
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;   // 100 MB (генерируется в браузере)
const TEST_DURATION_MS = 8000;                // максимальная длительность замера
const WARMUP_MS = 300;                        // не учитываем самое начало (разгон TCP/TLS)

function formatSpeed(mbps) {
    if (mbps >= 1000) {
        return `${(mbps / 1000).toFixed(2).replace('.', ',')} <span>Гбит/с</span>`;
    }
    return `${Math.round(mbps)} <span>Мбит/с</span>`;
}

// --- Скачивание: читаем поток кусками и считаем скорость "на лету" ---
async function measureDownload(onProgress) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_DURATION_MS);
    const startTime = performance.now();
    let bytesReceived = 0;

    try {
        const response = await fetch(`${BACKEND_URL}/download?size=${MAX_DOWNLOAD_BYTES}`, {
            cache: 'no-store',
            signal: controller.signal
        });

        if (!response.body || !response.body.getReader) {
            // Совсем старые браузеры без потоков — считаем по факту полной загрузки
            const buf = await response.arrayBuffer();
            bytesReceived = buf.byteLength;
        } else {
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                bytesReceived += value.length;
                const elapsedMs = performance.now() - startTime;
                if (elapsedMs > WARMUP_MS) {
                    onProgress((bytesReceived * 8) / (elapsedMs / 1000) / 1000000);
                }
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') throw err;
    } finally {
        clearTimeout(timeoutId);
    }

    const totalElapsed = (performance.now() - startTime) / 1000;
    return totalElapsed > 0 ? (bytesReceived * 8) / totalElapsed / 1000000 : 0;
}

// --- Отдача: шлём случайные данные, прогресс отслеживаем через XHR ---
function measureUpload(onProgress) {
    return new Promise((resolve) => {
        const data = new Uint8Array(MAX_UPLOAD_BYTES);
        const xhr = new XMLHttpRequest();
        const startTime = performance.now();
        let lastLoaded = 0;
        let finished = false;

        const timeoutId = setTimeout(() => {
            if (!finished) xhr.abort();
        }, TEST_DURATION_MS);

        xhr.upload.addEventListener('progress', (e) => {
            if (!e.lengthComputable) return;
            lastLoaded = e.loaded;
            const elapsedMs = performance.now() - startTime;
            if (elapsedMs > WARMUP_MS) {
                onProgress((lastLoaded * 8) / (elapsedMs / 1000) / 1000000);
            }
        });

        function finish() {
            if (finished) return;
            finished = true;
            clearTimeout(timeoutId);
            const elapsed = (performance.now() - startTime) / 1000;
            resolve(elapsed > 0 ? (lastLoaded * 8) / elapsed / 1000000 : 0);
        }

        xhr.addEventListener('load', finish);
        xhr.addEventListener('error', finish);
        xhr.addEventListener('abort', finish);

        xhr.open('POST', `${BACKEND_URL}/upload`);
        xhr.send(data);
    });
}

if (btnSpeed) {
    btnSpeed.addEventListener('click', async () => {
        btnSpeed.disabled = true;

        btnSpeed.innerHTML = `
        <svg class="material-spinner" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M41.7,3.3C46.6-1.1,53.4-1.1,58.3,3.3l5,4.5c2.3,2.1,5.4,3.2,8.5,3.2l6.7,0.1c6.5,0.1,11.8,5.4,11.9,11.9l0.1,6.7 c0,3.1,1.1,6.2,3.2,8.5l4.5,5c4.4,4.9,4.4,11.7,0,16.6l-4.5,5c-2.1,2.3-3.2,5.4-3.2,8.5l-0.1,6.7c-0.1,6.5-5.4,11.8-11.9,11.9 l-6.7,0.1c-3.1,0-6.2,1.1-8.5,3.2l-5,4.5c-4.9,4.4-11.7,4.4-16.6,0l-5-4.5c-2.3-2.1-5.4-3.2-8.5-3.2l-6.7-0.1 c-6.5-0.1-11.8-5.4-11.9-11.9l-0.1-6.7c0-3.1-1.1-6.2-3.2-8.5l-4.5-5c-4.4-4.9-4.4-11.7,0-16.6l4.5-5c2.1-2.3,3.2-5.4,3.2-8.5 l0.1-6.7c0.1-6.5,5.4-11.8,11.9-11.9l6.7-0.1c3.1,0,6.2-1.1,8.5-3.2L41.7,3.3z"></path>
        </svg>`;
        btnSpeed.style.opacity = '0.7';

        resPing.innerHTML = '-- <span>мс</span>';
        resDown.innerHTML = '-- <span>Мбит/с</span>';
        resUp.innerHTML = '-- <span>Мбит/с</span>';

        try {
            // 1. Пинг — несколько замеров подряд, показываем медиану
            //    (устойчивее к разовым сетевым всплескам, чем один замер)
            const pings = [];
            for (let i = 0; i < 5; i++) {
                const t0 = performance.now();
                await fetch(`${BACKEND_URL}/ping`, { cache: 'no-store' });
                pings.push(performance.now() - t0);
            }
            pings.sort((a, b) => a - b);
            const medianPing = Math.round(pings[Math.floor(pings.length / 2)]);
            resPing.innerHTML = `${medianPing} <span>мс</span>`;

            // 2. Скачивание — идёт до TEST_DURATION_MS, цифра обновляется вживую
            const dlMbps = await measureDownload((mbps) => {
                resDown.innerHTML = formatSpeed(mbps);
            });
            resDown.innerHTML = formatSpeed(dlMbps);

            // 3. Отдача — аналогично, тоже с живым обновлением
            const ulMbps = await measureUpload((mbps) => {
                resUp.innerHTML = formatSpeed(mbps);
            });
            resUp.innerHTML = formatSpeed(ulMbps);

            btnSpeed.innerText = 'Повторить';
        } catch (err) {
            console.error(err);
            btnSpeed.innerText = 'Ошибка соединения!';
            alert('Не удалось подключиться к серверу проверки скорости. Проверьте подключение к интернету и попробуйте ещё раз.');
        } finally {
            btnSpeed.disabled = false;
            btnSpeed.style.opacity = '1';
        }
    });
}

