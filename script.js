/* ЛОГИКА ЭКРАНА ЗАГРУЗКИ */
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.classList.add('hidden');
    }, 400);
});

// Переключение обычных гайдов
function toggleGuide(id) {
    const guide = document.getElementById(id);
    if(guide) guide.classList.toggle('visible');
}

// Специальное переключение для Tor Android (ссылки + текст)
function toggleTorGuide() {
    const links = document.getElementById('tor-android-links');
    const guide = document.getElementById('guide-tor-android');
    if(links) links.classList.toggle('visible');
    if(guide) guide.classList.toggle('visible');
}

/* ЛОГИКА ТЕМНОЙ ТЕМЫ С ИКОНКАМИ MATERIAL */
const themeBtn = document.getElementById('theme-btn');

// 1. Проверяем память СРАЗУ при загрузке скрипта
const savedTheme = localStorage.getItem('site-theme');

// Если в памяти есть темная тема, сразу включаем её и ставим иконку light_mode (солнце)
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if(themeBtn) themeBtn.innerText = 'light_mode';
} else {
    document.body.classList.remove('dark-theme');
    if(themeBtn) themeBtn.innerText = 'dark_mode'; // Иконка луны для светлой темы
}

// 2. Логика при нажатии на кнопку
if(themeBtn) {
    themeBtn.addEventListener('click', () => {
        // Переключаем тему
        document.body.classList.toggle('dark-theme');

        // Проверяем, включилась ли темная тема
        const isDark = document.body.classList.contains('dark-theme');

        // Меняем иконку (если включили темную - показываем солнце для обратного переключения)
        themeBtn.innerText = isDark ? 'light_mode' : 'dark_mode';

        // Записываем результат в память браузера (localStorage)
        localStorage.setItem('site-theme', isDark ? 'dark' : 'light');

        // Если карта уже загружена, меняем её стиль на лету
        if (map && window.currentTiles) {
            const newTilesUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            window.currentTiles.setUrl(newTilesUrl);
        }
    });
}

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
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentIp;
            input.classList.add('ip-edit-input');
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
   Если навести на кнопку и продержать курсор 3 секунды, пока идёт сам тест
   (кнопка задизейблена), показываем шутливую подсказку. Слушаем hover не на
   самой кнопке, а на обёртке — задизейбленная кнопка не всегда стабильно
   отдаёт мышиные события в разных браузерах. */
(function setupSpeedtestHint() {
    const btn = document.getElementById('start-speedtest-btn');
    const tooltip = document.getElementById('speedtest-tooltip');
    const wrap = btn ? (btn.closest('.speedtest-btn-wrap') || btn.parentElement) : null;
    if (!btn || !tooltip || !wrap) return;

    let holdTimeout = null;

    wrap.addEventListener('mouseenter', () => {
        if (!btn.disabled) return; // подсказка нужна только пока реально идёт тест
        holdTimeout = setTimeout(() => {
            if (btn.disabled) tooltip.classList.add('show');
        }, 3000);
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
