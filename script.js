
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
        const navItems = document.querySelectorAll('.nav-item[data-target]');
        const sections = document.querySelectorAll('.page-section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                sections.forEach(sec => sec.classList.remove('active'));

                item.classList.add('active');
                const targetId = item.getAttribute('data-target');
                const targetSection = document.getElementById(targetId);
                if(targetSection) targetSection.classList.add('active');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                if (targetId === 'home' && typeof map !== 'undefined') {
                    setTimeout(() => map.invalidateSize(), 100);
                }
            });
        });

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
        }

        let toastTimeout; 

        function copyKey(elementId, btn) {
            const el = document.getElementById(elementId);
            if(!el) return;
            const textToCopy = el.innerText;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const toast = document.getElementById("toast");
                if(!toast) return;
                
                toast.classList.add("show");
                clearTimeout(toastTimeout);
                
                toastTimeout = setTimeout(() => {
                    toast.classList.remove("show");
                }, 3000);
                
            }).catch(err => {
                console.error("Ошибка: ", err);
            });
        }