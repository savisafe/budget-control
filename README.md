## Description
This project is a web application for budget management that processes transaction data from Kaspi Gold bank statements. It calculates total expenses and income for each store, based on purchases and deposits. The application features a modern web interface with drag-and-drop file upload, PDF parsing, and Excel export functionality.

## Features
- **Drag-and-drop PDF upload** - Easy file upload interface
- **PDF to JSON conversion** - Automatic extraction of transaction data
- **Transaction calculations** - Total expenses and income per store
- **Beautiful UI** - Modern interface built with Tailwind CSS
- **JSON preview** - View raw transaction data
- **Excel export** - Export results to Excel format
- **Security** - Rate limiting, file validation, and secure headers

## Changelog
[1.2.0] - 2026-01-12
- Added Excel export functionality
- Enhanced security features (rate limiting, file validation)
- Improved error handling and user feedback
- Added file size limits (5MB for Hobby plan)

[1.1.0] - 2025-03-01
- Added web interface with drag-and-drop PDF upload
- Implemented PDF to JSON conversion
- Created beautiful UI for displaying transaction calculations
- Added Express server for file processing

[1.0.0] - 2025-03-01
- Initial release of the project with basic transaction parsing
- Added calculation and grouping of transactions by store
- Implemented console output for transaction results

## How to start:

### Local Development:
```bash
git clone https://github.com/savisafe/budget-control.git
cd budget-control
npm install
npm run dev
```

Then open http://localhost:3000 in your browser:
1. Drag and drop your Kaspi Gold PDF statement or click to select file
2. Click "Обработать PDF" to process and view results
3. View JSON data or export to Excel

---------------------------------------------------------------------------------------------------------------

## Описание
Проект представляет собой веб-приложение для управления бюджетом, которое обрабатывает данные о транзакциях из выписок Kaspi Gold. Оно вычисляет общие расходы и доходы для каждого магазина на основе покупок и пополнений. Приложение имеет современный веб-интерфейс с drag-and-drop загрузкой файлов, парсингом PDF и экспортом в Excel.

## Возможности
- **Загрузка PDF файлов** - через drag-and-drop или выбор файла
- **Автоматическая конвертация** - PDF в JSON формат
- **Расчет транзакций** - общие суммы по каждому магазину
- **Красивый интерфейс** - современный UI на Tailwind CSS
- **Просмотр JSON** - просмотр исходных данных
- **Экспорт в Excel** - экспорт результатов в Excel формат
- **Безопасность** - rate limiting, валидация файлов, безопасные заголовки

## Журнал изменений
[1.2.0] - 12 Января 2026
- Добавлен экспорт в Excel формат
- Улучшена безопасность (rate limiting, валидация файлов)
- Улучшена обработка ошибок и обратная связь с пользователем
- Добавлены ограничения размера файла (5MB для Hobby плана)

[1.1.0] - 1 марта 2025
- Добавлен веб-интерфейс с drag-and-drop для загрузки PDF
- Реализована конвертация PDF в JSON
- Создан красивый UI для отображения расчетов транзакций
- Добавлен Express сервер для обработки файлов

[1.0.0] - 1 марта 2025
- Первый релиз с базовой обработкой транзакций
- Добавлены расчёты и группировка транзакций по магазинам
- Реализован вывод результатов транзакций в консоль

## Как начать:

### Локальная разработка:
```bash
git clone https://github.com/savisafe/budget-control.git
cd budget-control
npm install
npm run dev
```

Затем откройте http://localhost:3000 в браузере:
1. Перетащите PDF файл выписки Kaspi Gold или выберите файл
2. Нажмите "Обработать PDF" для обработки и просмотра результатов
3. Просмотрите JSON данные или экспортируйте в Excel

## License & Terms / Лицензия и условия использования

This project is licensed under a **Non-Commercial License**. 

**⚠️ Important**: By using this software, you agree to the terms and conditions outlined in [TERMS.md](./TERMS.md), including:
- Non-commercial use only
- No warranties or guarantees regarding data security
- You assume all risks and responsibilities

**⚠️ Важно**: Используя это программное обеспечение, вы соглашаетесь с условиями, изложенными в [TERMS.md](./TERMS.md), включая:
- Только некоммерческое использование
- Отсутствие гарантий безопасности данных
- Вы принимаете на себя все риски и ответственность

See [TERMS.md](./TERMS.md) for full license text and disclaimer.

См. [TERMS.md](./TERMS.md) для полного текста лицензии и отказа от ответственности.