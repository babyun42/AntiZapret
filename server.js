const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 2202;

// --- Автообновление index.html с GitHub ---
// Секрет задаётся переменной окружения при запуске (GITHUB_WEBHOOK_SECRET=...
// node server.js) и должен СОВПАДАТЬ с секретом, который ты укажешь в
// настройках вебхука на GitHub. Без него никто чужой не сможет дёрнуть
// перезапись файла — см. проверку подписи в самом хендлере ниже.
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '42babyun';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/babyun42/AntiZapret/main/full.html';
const HTML_FILE_PATH = path.join(__dirname, 'index.html');

// --- Настройки теста скорости ---
const DEFAULT_DOWNLOAD_SIZE = 25 * 1024 * 1024; // 25 MB, если размер не передан в запросе
const MAX_DOWNLOAD_SIZE = 300 * 1024 * 1024;    // сервер никогда не отдаёт больше 300 MB за раз
const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;      // и не принимает больше 150 MB за один запрос
const CHUNK_SIZE = 256 * 1024;                  // размер одного «куска» в потоке (256 KB)
const RANDOM_POOL_SIZE = 8;                     // сколько разных случайных кусков держим в памяти
const MAX_CONCURRENT_DOWNLOADS = 20;            // защита слабого телефона от перегрузки

app.use(cors());

// Заранее готовим несколько РАЗНЫХ случайных кусков и переиспользуем их по кругу.
// Так мы не тратим CPU телефона на генерацию случайных байт при каждом запросе,
// но и не гоняем один и тот же кусок бесконечно — иначе любой прокси/CDN со
// сжатием на пути сожмёт такой ответ почти до нуля и результат теста будет враньём.
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => crypto.randomBytes(CHUNK_SIZE));

let activeDownloads = 0;

app.get('/ping', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).send('pong');
});

app.get('/download', (req, res) => {
    if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
        res.status(503).send('Сервер перегружен, попробуйте чуть позже');
        return;
    }

    let size = parseInt(req.query.size, 10);
    if (!Number.isFinite(size) || size <= 0) size = DEFAULT_DOWNLOAD_SIZE;
    size = Math.min(size, MAX_DOWNLOAD_SIZE);

    res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(size),
        // no-transform запрещает прокси/CDN на пути пересжимать или иначе менять тело ответа
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, no-transform'
    });

    activeDownloads++;
    let sent = 0;
    let chunkIndex = 0;
    let finished = false;

    const cleanup = () => {
        if (!finished) {
            finished = true;
            activeDownloads--;
        }
    };

    req.on('close', cleanup);
    res.on('error', cleanup);

    // Пишем поток кусками с учётом backpressure (res.write() может вернуть false,
    // если внутренний буфер ещё не разгрёбся) — это не даёт памяти телефона расти
    // бесконтрольно, даже если клиент запросил все 300 MB разом.
    function pump() {
        try {
            while (!finished && sent < size) {
                const remaining = size - sent;
                const source = randomPool[chunkIndex % RANDOM_POOL_SIZE];
                const piece = remaining >= CHUNK_SIZE ? source : source.subarray(0, remaining);
                chunkIndex++;
                sent += piece.length;

                if (!res.write(piece)) {
                    res.once('drain', pump);
                    return;
                }
            }
            if (!finished) {
                res.end();
                cleanup();
            }
        } catch (err) {
            cleanup();
        }
    }

    pump();
});

app.post('/upload', (req, res) => {
    // Тело НЕ буферизуем целиком в памяти (как это делал express.raw()) — читаем
    // поток и сразу отбрасываем данные. Это позволяет держать тест отдачи на
    // 100+ МБ, не раздувая RAM на слабом телефоне.
    let received = 0;
    let rejected = false;

    req.on('data', (chunk) => {
        received += chunk.length;
        if (received > MAX_UPLOAD_SIZE && !rejected) {
            rejected = true;
            res.status(413).end();
            req.destroy();
        }
    });

    req.on('end', () => {
        if (!rejected) res.status(200).send('ok');
    });

    req.on('error', () => {
        if (!res.headersSent) res.status(400).end();
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GitHub при каждом пуше шлёт сюда POST с телом пуша и подписью в заголовке
// X-Hub-Signature-256. express.raw() навешан ТОЛЬКО на этот роут (а не
// глобально через app.use), потому что подпись сверяется по сырым байтам
// тела — если бы тело уже распарсили в объект, байты для сверки были бы
// потеряны, и подпись никогда бы не совпала.
app.post('/webhook/github', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!GITHUB_WEBHOOK_SECRET) {
        console.error('Вебхук вызван, но GITHUB_WEBHOOK_SECRET не задан на сервере.');
        return res.status(500).send('Секрет вебхука не настроен на сервере');
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).send('Нет подписи');
    }

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');

    // timingSafeEqual требует буферы одинаковой длины, поэтому сначала
    // проверяем длину — иначе сама функция бросит исключение
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureValid = sigBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!signatureValid) {
        return res.status(401).send('Неверная подпись');
    }

    let payload;
    try {
        payload = JSON.parse(req.body.toString('utf-8'));
    } catch (err) {
        return res.status(400).send('Некорректное тело запроса');
    }

    // Реагируем только на пуш в main — пуши в другие ветки игнорируем
    if (payload.ref && payload.ref !== 'refs/heads/main') {
        return res.status(200).send('Пуш не в main — пропускаю');
    }

    // Отвечаем GitHub сразу (у вебхуков ограничение по времени ответа),
    // а само скачивание и запись файла делаем уже после ответа
    res.status(202).send('Принято, обновляю файл');

    try {
        const response = await fetch(GITHUB_RAW_URL, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`GitHub ответил статусом ${response.status}`);
        }
        const html = await response.text();
        fs.writeFileSync(HTML_FILE_PATH, html, 'utf-8');
        console.log(`[${new Date().toISOString()}] index.html обновлён с GitHub (${html.length} байт)`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Не удалось обновить index.html с GitHub:`, err.message);
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Бэкенд проверки скорости запущен на http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Порт ${PORT} уже занят другим процессом. Останови его или задай другой порт: PORT=xxxx node server.js`);
        process.exit(1);
    } else {
        throw err;
    }
});

process.on('unhandledRejection', (err) => {
    console.error('Необработанный отказ промиса:', err);
});
