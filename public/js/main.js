const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const transactionsList = document.getElementById('transactionsList');
const error = document.getElementById('error');
const jsonPreview = document.getElementById('jsonPreview');
const jsonContent = document.getElementById('jsonContent');
const toggleJson = document.getElementById('toggleJson');
const exportExcelBtn = document.getElementById('exportExcel');
const uploadCard = document.getElementById('uploadCard');
const showDebugBtn = document.getElementById('showDebugBtn');
const debugInfo = document.getElementById('debugInfo');

let selectedFile = null;
let currentResultsData = null;

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-primary', 'bg-blue-50', 'scale-105');
    uploadCard.classList.add('ring-2', 'ring-primary');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-primary', 'bg-blue-50', 'scale-105');
    uploadCard.classList.remove('ring-2', 'ring-primary');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-primary', 'bg-blue-50', 'scale-105');
    uploadCard.classList.remove('ring-2', 'ring-primary');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFile(file);
    } else {
        showError('Пожалуйста, загрузите PDF файл');
    }
});

function handleFile(file) {
    if (file && file.type === 'application/pdf') {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            showError(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(2)}MB). Максимальный размер: 5MB для быстрой обработки.`);
            return;
        }
        
        selectedFile = file;
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        fileName.textContent = `Выбран файл: ${file.name} (${fileSizeMB}MB)`;
        fileInfo.classList.remove('hidden');
        processBtn.disabled = false;
        error.classList.add('hidden');
        results.classList.add('hidden');
    } else {
        showError('Пожалуйста, выберите PDF файл');
    }
}

processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    loading.classList.remove('hidden');
    processBtn.disabled = true;
    error.classList.add('hidden');
    results.classList.add('hidden');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    let errorData = null;
    try {
        const response = await fetch('/api/process-pdf', {
            method: 'POST',
            body: formData
        });

                const data = await response.json();

                if (!response.ok) {
                    errorData = data;
                    let errorMessage = data.error || 'Ошибка обработки файла';
                    throw new Error(errorMessage);
                }

                displayResults(data);
    } catch (err) {
        showError(err.message, errorData);
    } finally {
        loading.classList.add('hidden');
        processBtn.disabled = false;
    }
});

function displayResults(data) {
    currentResultsData = data;
    
    const expensesCard = document.getElementById('expensesCard');
    const incomeCard = document.getElementById('incomeCard');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalIncomeEl = document.getElementById('totalIncome');
    
    transactionsList.innerHTML = '';
    
    if (data.totalExpenses !== undefined || data.totalIncome !== undefined) {
        if (expensesCard && totalExpensesEl) {
            totalExpensesEl.textContent = `${(data.totalExpenses || 0).toFixed(2)} ₸`;
            expensesCard.classList.remove('hidden');
        }
        
        if (incomeCard && totalIncomeEl) {
            totalIncomeEl.textContent = `+${(data.totalIncome || 0).toFixed(2)} ₸`;
            incomeCard.classList.remove('hidden');
        }
    } else {
        if (expensesCard) expensesCard.classList.add('hidden');
        if (incomeCard) incomeCard.classList.add('hidden');
    }
    
    if (data.transactions && Object.keys(data.transactions).length > 0) {
        for (const [store, info] of Object.entries(data.transactions)) {
            const item = document.createElement('div');
            const isPositive = info.total > 0;
            item.className = 'bg-white p-5  cursor-pointer rounded-lg border-l-4 transition-all duration-300 hover:shadow-md hover:translate-x-1 ' + 
                (isPositive ? 'border-accent' : 'border-warning');
            item.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="text-xl font-bold text-slate-800 mb-1">${store}</div>
                        <div class="text-sm text-slate-600 flex items-center">
                            <span class="inline-block w-2 h-2 rounded-full mr-2 ${info.type === 'Покупка' ? 'bg-warning' : 'bg-accent'}"></span>
                            ${info.type}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold ${isPositive ? 'text-accent' : 'text-warning'}">
                            ${info.total > 0 ? '+' : ''}${info.total.toFixed(2)} ₸
                        </div>
                    </div>
                </div>
            `;
            transactionsList.appendChild(item);
        }
    } else {
        transactionsList.innerHTML = `
            <div class="text-center py-8 text-slate-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-lg">Транзакции не найдены</p>
            </div>
        `;
    }

    jsonContent.textContent = JSON.stringify(data, null, 2);
    results.classList.remove('hidden');
}

function showError(message, errorData = null) {
    const errorText = error.querySelector('span');
    errorText.textContent = message;
    error.classList.remove('hidden');
    
    if (errorData && errorData.debug) {
        showDebugBtn.classList.remove('hidden');
        debugInfo.textContent = `Длина текста: ${errorData.debug.textLength} символов\n\nПервые строки PDF:\n${errorData.debug.firstLines}`;
    } else {
        showDebugBtn.classList.add('hidden');
        debugInfo.classList.add('hidden');
    }
}

showDebugBtn.addEventListener('click', () => {
    const isVisible = !debugInfo.classList.contains('hidden');
    if (isVisible) {
        debugInfo.classList.add('hidden');
        showDebugBtn.textContent = 'Показать отладочную информацию';
    } else {
        debugInfo.classList.remove('hidden');
        showDebugBtn.textContent = 'Скрыть отладочную информацию';
    }
});

toggleJson.addEventListener('click', () => {
    const isVisible = !jsonPreview.classList.contains('hidden');
    if (isVisible) {
        jsonPreview.classList.add('hidden');
        toggleJson.textContent = 'Показать JSON';
    } else {
        jsonPreview.classList.remove('hidden');
        toggleJson.textContent = 'Скрыть JSON';
    }
});

exportExcelBtn.addEventListener('click', () => {
    if (!currentResultsData || !currentResultsData.transactions) {
        showError('Нет данных для экспорта');
        return;
    }

    try {
        const transactions = currentResultsData.transactions;
        const rawData = currentResultsData.rawData || [];

        const excelData = [];

        excelData.push(['Магазин', 'Тип операции', 'Общая сумма (₸)']);

        for (const [store, info] of Object.entries(transactions)) {
            excelData.push([
                store,
                info.type,
                info.total.toFixed(2)
            ]);
        }

        excelData.push([]);
        excelData.push(['ИТОГО']);
        excelData.push(['Итого расходов', '', (currentResultsData.totalExpenses || 0).toFixed(2)]);
        excelData.push(['Итого доходов', '', (currentResultsData.totalIncome || 0).toFixed(2)]);
        excelData.push([]);

        if (rawData.length > 0) {
            excelData.push(['Детальные транзакции']);
            excelData.push(['Дата', 'Сумма', 'Тип', 'Магазин']);

            rawData.forEach(transaction => {
                const date = Object.values(transaction)[0] || '';
                const amount = transaction.Column2 || '';
                const type = transaction.Column3 || '';
                const store = transaction.Column4 || '';
                excelData.push([date, amount, type, store]);
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 30 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const fileName = `kaspi-transactions-${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);

        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-secondary text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMsg.textContent = `✅ Файл ${fileName} успешно скачан!`;
        document.body.appendChild(successMsg);

        setTimeout(() => {
            successMsg.remove();
        }, 3000);

    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showError('Ошибка при экспорте в Excel: ' + error.message);
    }
});
