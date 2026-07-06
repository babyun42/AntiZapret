/* ЛОГИКА ЭКРАНА ЗАГРУЗКИ */
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 400); 
});

// Функция для открытия/закрытия гайдов (если она сломалась, замени на эту)
        function toggleGuide(guideId) {
            var guide = document.getElementById(guideId);
            if (guide.style.display === "none" || guide.style.display === "") {
                guide.style.display = "block";
            } else {
                guide.style.display = "none";
            }
        }

// Специальное переключение для Tor Android (ссылки + текст)
function toggleTorGuide() {
    document.getElementById('tor-android-links').classList.toggle('visible');
    document.getElementById('guide-tor-android').classList.toggle('visible');
}

/* ЛОГИКА ТЕМНОЙ ТЕМЫ С ОБНОВЛЕНИЕМ КАРТЫ */
const themeBtn = document.getElementById('theme-btn');
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    themeBtn.innerText = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    
    // Если карта уже загружена, меняем её стиль на лету
    if (map && window.currentTiles) {
        const newTilesUrl = document.body.classList.contains('dark-theme')
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        window.currentTiles.setUrl(newTilesUrl);
    }
});

/* ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК */
const navItems = document.querySelectorAll('.nav-item[data-target]');
const sections = document.querySelectorAll('.page-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));

        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        targetSection.classList.add('active');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (targetId === 'home' && map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    });
});

/* --- СТИЛЬНАЯ КАРТА CARTO DB И ОБНОВЛЕНИЕ IP --- */
var map;
var marker;

function updateIpInfo(ip = '') {
    document.getElementById('user-isp').innerText = 'Определяем...';
    if (document.getElementById('user-country')) {
        document.getElementById('user-country').innerText = 'Определяем...';
    }

    const url = ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : 'https://get.geojs.io/v1/ip/geo.json';

    fetch(url)
        .then(response => response.json())
        .then(data => {
            document.getElementById('user-ip').innerText = data.ip || ip || 'Неизвестно';
            document.getElementById('user-isp').innerText = data.organization_name || 'Неизвестно';
            
            const countryEl = document.getElementById('user-country');
            if (countryEl) {
                const country = data.country || '';
                const city = data.city || '';
                countryEl.innerText = (country && city) ? `${country}, ${city}` : (country || city || 'Неизвестно');
            }

            var lat = parseFloat(data.latitude) || 55.75;
            var lon = parseFloat(data.longitude) || 37.61;
            
            if (!map) {
                // Инициализируем карту (zoomControl: false и attributionControl: false убирают мусор)
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
        })
        .catch(error => {
            console.error('Ошибка:', error);
            document.getElementById('user-isp').innerText = 'Ошибка данных';
        });
}

// Стартовый запуск
updateIpInfo();

/* ЛОГИКА КЛИКА И ИЗМЕНЕНИЯ IP */
const ipSpan = document.getElementById('user-ip');
ipSpan.addEventListener('click', () => {
    let currentIp = ipSpan.innerText.replace('✏️', '').trim();
    if (currentIp === 'Загрузка...' || currentIp === 'Определяем...') currentIp = '';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentIp;
    input.classList.add('ip-edit-input');
    ipSpan.replaceWith(input);
    input.focus();

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
});

function copyKey(elementId, btn) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // 1. Запускаем анимацию вращения кнопки
        btn.classList.add("spinning");
        
        // Убираем класс вращения через полсекунды, чтобы можно было покрутить снова
        setTimeout(() => {
            btn.classList.remove("spinning");
        }, 500);

        // 2. Показываем уведомление внизу экрана
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        
        // 3. Прячем уведомление через 3 секунды
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
        
    }).catch(err => {
        console.error("Ошибка при копировании: ", err);
        alert("Не удалось скопировать текст.");
    });
}
