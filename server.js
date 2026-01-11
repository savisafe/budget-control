const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

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
    const filePath = path.join(__dirname, 'public', 'terms.html');
    res.sendFile(filePath, (err) => {
        if (err) {
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
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const transactions = [];
    
    let periodHeader = null;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Выписка по Kaspi Gold за период')) {
            periodHeader = lines[i];
            break;
        }
    }

    const transactionPattern = /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение|Переводы?|Разное)\s+(.+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g;

    const fullText = lines.join(' ');

    transactionPattern.lastIndex = 0;
    
    let match;
    while ((match = transactionPattern.exec(fullText)) !== null) {
        const date = match[1];
        const amount = match[2].trim();
        const type = match[3].trim();
        const store = match[4].trim();
        
        if (store && store.length > 1 && 
            !store.includes('Выписка') && 
            !store.includes('Доступно') &&
            !store.includes('ДатаСуммаОперация') &&
            !store.match(/^Дата.*Сумма.*Операция/i) &&
            (type === 'Покупка' || type === 'Пополнение' || type === 'Переводы' || type === 'Перевод' || type === 'Разное')) {
            transactions.push({
                [periodHeader || 'Выписка по Kaspi Gold']: date,
                Column2: amount,
                Column3: type,
                Column4: store
            });
        }
    }
    
    if (transactions.length === 0) {
        const linePattern = /^(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение|Переводы?|Разное)\s+(.+)$/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineMatch = line.match(linePattern);
            
            if (lineMatch) {
                const date = lineMatch[1];
                const amount = lineMatch[2].trim();
                const type = lineMatch[3];
                const store = lineMatch[4].trim();
                
                if (store && store.length > 1 && 
                    !store.includes('ДатаСуммаОперация') &&
                    !store.match(/^Дата.*Сумма.*Операция/i) &&
                    (type === 'Покупка' || type === 'Пополнение' || type === 'Переводы' || type === 'Перевод' || type === 'Разное')) {
                    transactions.push({
                        [periodHeader || 'Выписка по Kaspi Gold']: date,
                        Column2: amount,
                        Column3: type,
                        Column4: store
                    });
                }
            }
        }
    }

    if (transactions.length === 0) {
        const combinedText = text.replace(/\n/g, ' ');
        
        const patterns = [
            { name: 'Паттерн 1 (строгий)', regex: /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+,\d{2}\s*₸)\s+(Покупка|Пополнение|Переводы?|Разное)\s+([A-ZА-Я][A-ZА-Яa-zа-я\s&]+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g },
            { name: 'Паттерн 2 (с точкой/запятой)', regex: /(\d{2}\.\d{2}\.\d{2})\s*([+-]\s*[\d\s]+[.,]\d{2}\s*₸)\s+(Покупка|Пополнение|Переводы?|Разное)\s+([A-ZА-Я][^₸]+?)(?=\d{2}\.\d{2}\.\d{2}|$)/g },
            { name: 'Паттерн 3 (свободный)', regex: /(\d{2}\.\d{2}\.\d{2})[^\d]*([+-][\d\s,]+₸)[^\d]*(Покупка|Пополнение|Переводы?|Разное)[^\d]*([A-ZА-Я][A-ZА-Яa-zа-я\s&]+)/g }
        ];
        
        for (const pattern of patterns) {
            pattern.regex.lastIndex = 0;
            let match;
            const foundTransactions = [];
            
            while ((match = pattern.regex.exec(combinedText)) !== null) {
                if (match.length >= 4) {
                    const date = match[1];
                    const amount = match[2] || '';
                    const type = match[3] || '';
                    const store = match[4] ? match[4].trim() : '';
                    
                    if (date && amount && type && store && store.length > 2 &&
                        !store.includes('ДатаСуммаОперация') &&
                        !store.match(/^Дата.*Сумма.*Операция/i) &&
                        (type === 'Покупка' || type === 'Пополнение' || type === 'Переводы' || type === 'Перевод' || type === 'Разное')) {
                        foundTransactions.push({
                            [periodHeader || 'Выписка']: date,
                            Column2: amount,
                            Column3: type,
                            Column4: store
                        });
                    }
                }
            }
            
            if (foundTransactions.length > 0) {
                return foundTransactions;
            }
        }
        
        const finalLines = text.split('\n');
        const lineTransactions = [];
        let tempTransaction = {};
        
        for (let i = 0; i < finalLines.length; i++) {
            const line = finalLines[i].trim();
            
            const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{2,4})/);
            if (dateMatch) {
                if (tempTransaction.date && tempTransaction.amount && tempTransaction.type && tempTransaction.store) {
                    lineTransactions.push({
                        [periodHeader || 'Выписка']: tempTransaction.date,
                        Column2: tempTransaction.amount,
                        Column3: tempTransaction.type,
                        Column4: tempTransaction.store
                    });
                }
                tempTransaction = { date: dateMatch[1] };
            }
            
            if (!tempTransaction.amount) {
                const amountMatch = line.match(/([+-][\d\s,]+₸)/);
                if (amountMatch) {
                    tempTransaction.amount = amountMatch[1].trim();
                }
            }
            
            if (!tempTransaction.type) {
                if (line.includes('Покупка')) {
                    tempTransaction.type = 'Покупка';
                } else if (line.includes('Пополнение')) {
                    tempTransaction.type = 'Пополнение';
                } else if (line.includes('Перевод')) {
                    tempTransaction.type = 'Переводы';
                } else if (line.includes('Разное')) {
                    tempTransaction.type = 'Разное';
                }
            }
            
            if (!tempTransaction.store && tempTransaction.date && tempTransaction.amount && tempTransaction.type) {
                if (line.length > 3 && 
                    !line.match(/^\d/) && 
                    !line.includes('₸') && 
                    !line.includes('Выписка') &&
                    !line.includes('ДатаСуммаОперация') &&
                    !line.match(/^Дата.*Сумма.*Операция/i)) {
                    tempTransaction.store = line;
                }
            }
        }
        
        if (tempTransaction.date && tempTransaction.amount && tempTransaction.type && tempTransaction.store) {
            lineTransactions.push({
                [periodHeader || 'Выписка']: tempTransaction.date,
                Column2: tempTransaction.amount,
                Column3: tempTransaction.type,
                Column4: tempTransaction.store
            });
        }
        
        if (lineTransactions.length > 0) {
            return lineTransactions;
        }
    }
    
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
        
        const transactions = parsePDFText(text);

        if (transactions.length === 0) {
            clearTimeout(timeout);
            return res.status(400).json({ 
                error: 'Не удалось извлечь транзакции из PDF. Возможно, формат файла отличается от ожидаемого.'
            });
        }

        const processedTransactions = processTransactions(transactions);

        let totalExpenses = 0;
        let totalIncome = 0;

        for (const [store, info] of Object.entries(processedTransactions)) {
            const type = info.type || '';
            if (type === 'Покупка' || type === 'Снятия') {
                totalExpenses += Math.abs(info.total);
            } else if (type === 'Пополнение' || type === 'Пополнения') {
                totalIncome += info.total;
            } else if (type === 'Переводы' || type === 'Перевод' || type === 'Разное') {
                if (info.total < 0) {
                    totalExpenses += Math.abs(info.total);
                } else {
                    totalIncome += info.total;
                }
            } else {
                if (info.total < 0) {
                    totalExpenses += Math.abs(info.total);
                } else {
                    totalIncome += info.total;
                }
            }
        }

        clearTimeout(timeout);

        res.json({
            success: true,
            transactions: processedTransactions,
            rawData: transactions,
            totalTransactions: transactions.length,
            totalExpenses: totalExpenses,
            totalIncome: totalIncome
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
