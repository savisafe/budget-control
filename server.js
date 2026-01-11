const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 0,
        fieldNameSize: 50
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Разрешены только PDF файлы'), false);
        }
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
            return cb(new Error('Файл должен иметь расширение .pdf'), false);
        }
        cb(null, true);
    }
});

app.use(express.json({ limit: '10mb' }));
app.get('/terms', (req, res) => {
    console.log('Маршрут /terms вызван');
    const filePath = path.join(__dirname, 'public', 'terms.html');
    console.log('Путь к файлу:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Ошибка отправки файла:', err);
            res.status(500).send('Ошибка загрузки страницы');
        }
    });
});

app.get('/TERMS.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public', { index: false }));

app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

function parsePDFText(text) {
    console.log('\n=== НАЧАЛО ПАРСИНГА PDF ===');
    console.log('Длина исходного текста:', text.length);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('Количество строк после обработки:', lines.length);
    console.log('Первые 10 строк:', lines.slice(0, 10));
    
    const transactions = [];
    
    let periodHeader = null;

    console.log('\n--- Поиск заголовка периода ---');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Выписка по Kaspi Gold за период')) {
            periodHeader = lines[i];
            console.log('✓ Найден заголовок:', periodHeader);
            break;
        }
    }
    if (!periodHeader) {
        console.log('✗ Заголовок периода не найден');
    }

    console.log('\n--- Основной метод парсинга ---');
    const transactionPattern = /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение)\s+(.+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g;

    const fullText = lines.join(' ');
    console.log('Длина объединенного текста:', fullText.length);
    console.log('Образец текста (500 символов):', fullText.substring(0, 500));

    transactionPattern.lastIndex = 0;
    
    let match;
    let matchCount = 0;
    while ((match = transactionPattern.exec(fullText)) !== null) {
        matchCount++;
        const date = match[1];
        const amount = match[2].trim();
        const type = match[3];
        const store = match[4].trim();
        
        console.log(`\nНайдено совпадение #${matchCount}:`);
        console.log('  Дата:', date);
        console.log('  Сумма:', amount);
        console.log('  Тип:', type);
        console.log('  Магазин:', store);
        console.log('  Полное совпадение:', match[0]);
        
        if (store && store.length > 1 && !store.includes('Выписка') && !store.includes('Доступно')) {
            console.log('  ✓ Транзакция добавлена');
            transactions.push({
                [periodHeader || 'Выписка по Kaspi Gold']: date,
                Column2: amount,
                Column3: type,
                Column4: store
            });
        } else {
            console.log('  ✗ Транзакция отклонена (проверка магазина не пройдена)');
        }
    }
    
    console.log(`\nОсновной метод: найдено совпадений: ${matchCount}, добавлено транзакций: ${transactions.length}`);
    
    if (transactions.length === 0) {
        console.log('\n--- Построчный анализ ---');
        console.log('Основной метод не сработал, пробуем построчный анализ...');
        
        const linePattern = /^(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение)\s+(.+)$/;
        let lineMatchCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const lineMatch = line.match(linePattern);
            
            if (lineMatch) {
                lineMatchCount++;
                const date = lineMatch[1];
                const amount = lineMatch[2].trim();
                const type = lineMatch[3];
                const store = lineMatch[4].trim();
                
                console.log(`\nСтрока #${i}: "${line}"`);
                console.log(`  ✓ Совпадение найдено:`);
                console.log(`    Дата: ${date}, Сумма: ${amount}, Тип: ${type}, Магазин: ${store}`);
                
                if (store && store.length > 1) {
                    transactions.push({
                        [periodHeader || 'Выписка по Kaspi Gold']: date,
                        Column2: amount,
                        Column3: type,
                        Column4: store
                    });
                    console.log(`  ✓ Транзакция добавлена`);
                } else {
                    console.log(`  ✗ Транзакция отклонена (магазин не прошел проверку)`);
                }
            } else if (line.match(/^\d{2}\.\d{2}\.\d{2}/)) {
                console.log(`\nСтрока #${i} начинается с даты, но не совпала: "${line}"`);
            }
        }
        
        console.log(`\nПострочный анализ: найдено совпадений: ${lineMatchCount}, добавлено транзакций: ${transactions.length}`);
    }

    if (transactions.length === 0) {
        console.log('\n--- Альтернативный метод парсинга ---');
        console.log('Пробуем альтернативный метод парсинга...');
        const combinedText = text.replace(/\n/g, ' ');
        console.log('Длина объединенного текста (без переносов):', combinedText.length);
        
        const patterns = [
            { name: 'Паттерн 1 (строгий)', regex: /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение)\s+([A-ZА-Я][A-ZА-Яa-zа-я\s&]+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g },
            { name: 'Паттерн 2 (с точкой/запятой)', regex: /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+[.,]\d{2}\s*₸)\s+(Покупка|Пополнение)\s+([A-ZА-Я][^₸]+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g },
            { name: 'Паттерн 3 (свободный)', regex: /(\d{2}\.\d{2}\.\d{2})[^\d]*([+-][\d\s,]+₸)[^\d]*(Покупка|Пополнение)[^\d]*([A-ZА-Я][A-ZА-Яa-zа-я\s&]+)/g }
        ];
        
        for (const pattern of patterns) {
            console.log(`\nПробуем ${pattern.name}...`);
            pattern.regex.lastIndex = 0;
            let match;
            const foundTransactions = [];
            let matchCount = 0;
            
            while ((match = pattern.regex.exec(combinedText)) !== null) {
                matchCount++;
                if (match.length >= 4) {
                    const date = match[1];
                    const amount = match[2] || '';
                    const type = match[3] || '';
                    const store = match[4] ? match[4].trim() : '';
                    
                    console.log(`  Совпадение #${matchCount}:`);
                    console.log(`    Дата: ${date}, Сумма: ${amount}, Тип: ${type}, Магазин: ${store}`);
                    console.log(`    Полное совпадение: "${match[0]}"`);
                    
                    if (date && amount && type && store && store.length > 2) {
                        console.log(`    ✓ Транзакция добавлена`);
                        foundTransactions.push({
                            [periodHeader || 'Выписка']: date,
                            Column2: amount,
                            Column3: type,
                            Column4: store
                        });
                    } else {
                        console.log(`    ✗ Транзакция отклонена (не все поля заполнены или магазин слишком короткий)`);
                    }
                }
            }
            
            console.log(`${pattern.name}: найдено совпадений: ${matchCount}, добавлено транзакций: ${foundTransactions.length}`);
            
            if (foundTransactions.length > 0) {
                console.log(`✓ Альтернативный метод нашел ${foundTransactions.length} транзакций`);
                return foundTransactions;
            }
        }
        
        console.log('\n--- Финальный построчный анализ ---');
        console.log('Пробуем финальный построчный анализ...');
        const finalLines = text.split('\n');
        const lineTransactions = [];
        let tempTransaction = {};
        
        console.log(`Обрабатываем ${finalLines.length} строк...`);
        
        for (let i = 0; i < finalLines.length; i++) {
            const line = finalLines[i].trim();
            
            const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{2,4})/);
            if (dateMatch) {
                if (tempTransaction.date && tempTransaction.amount && tempTransaction.type && tempTransaction.store) {
                    console.log(`  Сохраняем транзакцию: ${JSON.stringify(tempTransaction)}`);
                    lineTransactions.push({
                        [periodHeader || 'Выписка']: tempTransaction.date,
                        Column2: tempTransaction.amount,
                        Column3: tempTransaction.type,
                        Column4: tempTransaction.store
                    });
                }
                tempTransaction = { date: dateMatch[1] };
                console.log(`  Строка #${i}: найдена дата ${dateMatch[1]} в "${line}"`);
            }
            
            if (!tempTransaction.amount) {
                const amountMatch = line.match(/([+-][\d\s,]+₸)/);
                if (amountMatch) {
                    tempTransaction.amount = amountMatch[1].trim();
                    console.log(`  Строка #${i}: найдена сумма ${tempTransaction.amount}`);
                }
            }
            
            if (!tempTransaction.type) {
                if (line.includes('Покупка')) {
                    tempTransaction.type = 'Покупка';
                    console.log(`  Строка #${i}: найден тип Покупка`);
                }
                if (line.includes('Пополнение')) {
                    tempTransaction.type = 'Пополнение';
                    console.log(`  Строка #${i}: найден тип Пополнение`);
                }
            }
            
            if (!tempTransaction.store && tempTransaction.date && tempTransaction.amount && tempTransaction.type) {
                if (line.length > 3 && !line.match(/^\d/) && !line.includes('₸') && !line.includes('Выписка')) {
                    tempTransaction.store = line;
                    console.log(`  Строка #${i}: найден магазин "${line}"`);
                }
            }
        }
        
        if (tempTransaction.date && tempTransaction.amount && tempTransaction.type && tempTransaction.store) {
            console.log(`  Сохраняем последнюю транзакцию: ${JSON.stringify(tempTransaction)}`);
            lineTransactions.push({
                [periodHeader || 'Выписка']: tempTransaction.date,
                Column2: tempTransaction.amount,
                Column3: tempTransaction.type,
                Column4: tempTransaction.store
            });
        }
        
        if (lineTransactions.length > 0) {
            console.log(`✓ Финальный построчный анализ нашел ${lineTransactions.length} транзакций`);
            return lineTransactions;
        } else {
            console.log(`✗ Финальный построчный анализ не нашел транзакций`);
        }
    }

    console.log(`\n=== КОНЕЦ ПАРСИНГА ===`);
    console.log(`Итого найдено транзакций: ${transactions.length}`);
    if (transactions.length > 0) {
        console.log('Найденные транзакции:');
        transactions.forEach((t, i) => {
            console.log(`  ${i + 1}. ${JSON.stringify(t)}`);
        });
    }
    console.log('========================\n');
    
    return transactions;
}

function processTransactions(expArr) {
    const formattedPrices = expArr.map(item => {
        if (item.Column2) {
            const valueWithoutCurrency = item.Column2.replace(/[^\d.-₸()]/g, "");
            const numericValue = parseFloat(valueWithoutCurrency);

            const sign = item.Column2.includes('+') ? 1 : -1;

            const formattedValue = (numericValue / 100 * sign).toFixed(2);
            return parseFloat(formattedValue);
        }
        return 0;
    });

    const allTransactions = {};

    expArr.forEach((item, index) => {
        if (item.Column4 && item.Column3) {
            if (!allTransactions[item.Column4]) {
                allTransactions[item.Column4] = {
                    type: item.Column3,
                    total: 0
                };
            }

            allTransactions[item.Column4].total += formattedPrices[index];
        }
    });

    return allTransactions;
}

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function rateLimitMiddleware(req, res, next) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(clientIp)) {
        requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const clientData = requestCounts.get(clientIp);
    
    if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ 
            error: 'Слишком много запросов. Пожалуйста, подождите минуту.' 
        });
    }
    
    clientData.count++;
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
            requestCounts.delete(ip);
        }
    }
}, 5 * 60 * 1000);

app.post('/api/process-pdf', rateLimitMiddleware, upload.single('pdf'), async (req, res) => {
    const MAX_PROCESSING_TIME = 8000;
    
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(504).json({ 
                error: 'Превышено время обработки файла. Попробуйте файл меньшего размера или обновите план до Pro.' 
            });
        }
    }, MAX_PROCESSING_TIME);
    
    try {
        if (!req.file) {
            clearTimeout(timeout);
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const fileBuffer = req.file.buffer;
        
        if (!fileBuffer || fileBuffer.length === 0) {
            clearTimeout(timeout);
            return res.status(400).json({ error: 'Файл пустой' });
        }
        
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (fileBuffer.length > MAX_FILE_SIZE) {
            clearTimeout(timeout);
            return res.status(400).json({ 
                error: `Файл слишком большой (максимум 5MB для быстрой обработки). Размер файла: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB` 
            });
        }
        
        const pdfHeader = fileBuffer.slice(0, 4).toString();
        if (pdfHeader !== '%PDF') {
            clearTimeout(timeout);
            return res.status(400).json({ error: 'Файл не является корректным PDF' });
        }

        const pdfData = await pdfParse(fileBuffer, { max: 100 });
        const text = pdfData.text;

        const MAX_TEXT_SIZE = 500000;
        if (text.length > MAX_TEXT_SIZE) {
            clearTimeout(timeout);
            return res.status(400).json({ 
                error: 'PDF файл слишком большой для обработки на Hobby плане. Попробуйте файл меньшего размера или обновите план до Pro.' 
            });
        }

        console.log('Начинаем парсинг PDF...');
        console.log('Длина текста:', text.length);
        
        const transactions = parsePDFText(text);
        console.log('Найдено транзакций:', transactions.length);

        if (transactions.length === 0) {
            clearTimeout(timeout);
            return res.status(400).json({ 
                error: 'Не удалось извлечь транзакции из PDF. Возможно, формат файла отличается от ожидаемого.'
            });
        }

        const processedTransactions = processTransactions(transactions);

        clearTimeout(timeout);

        res.json({
            success: true,
            transactions: processedTransactions,
            rawData: transactions,
            totalTransactions: transactions.length
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('Ошибка обработки PDF:', error);
        
        const isClientError = error.message.includes('PDF') || 
                             error.message.includes('файл') ||
                             error.message.includes('file');
        
        res.status(isClientError ? 400 : 500).json({ 
            error: isClientError 
                ? error.message 
                : 'Ошибка при обработке PDF файла. Пожалуйста, попробуйте другой файл.'
        });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    });
}

module.exports = app;
