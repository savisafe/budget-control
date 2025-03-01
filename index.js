const expArr = [
    {
        "Выписка по Kaspi Gold за период с 10.02.25 по 15.02.25": "12.02.25",
        "Column2": "- 23 456,00 ₸",
        "Column3": "Покупка",
        "Column4": "SuperMart"
    },
    {
        "Выписка по Kaspi Gold за период с 10.02.25 по 15.02.25": "13.02.25",
        "Column2": "+ 15 000,00 ₸",
        "Column3": "Пополнение",
        "Column4": "ElectroShop"
    },
    {
        "Выписка по Kaspi Gold за период с 01.03.25 по 05.03.25": "02.03.25",
        "Column2": "- 10 500,00 ₸",
        "Column3": "Покупка",
        "Column4": "MegaStore"
    },
    {
        "Выписка по Kaspi Gold за период с 01.03.25 по 05.03.25": "03.03.25",
        "Column2": "+ 50 000,00 ₸",
        "Column3": "Пополнение",
        "Column4": "CityMall"
    },
    {
        "Выписка по Kaspi Gold за период с 01.03.25 по 05.03.25": "04.03.25",
        "Column2": "- 5 000,00 ₸",
        "Column3": "Покупка",
        "Column4": "TechHouse"
    }
]

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
                type: item.Column3, total: 0
            };
        }

        allTransactions[item.Column4].total += formattedPrices[index];
    }
});

let transactionsHTML = '';
for (const key in allTransactions) {
    transactionsHTML += `${key}: ${allTransactions[key].type} - Total: ${allTransactions[key].total.toFixed(2)}\n`;
}
console.log(transactionsHTML);
