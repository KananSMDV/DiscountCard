// api/cards.js
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Проверьте, что имя листа в Google Sheets именно 'Cards' или используйте индекс
const SHEET_INDEX = 0; // Первый лист

// Функция для инициализации и авторизации
async function getSpreadsheetSheet() {
    // ВАЖНО: Используем вашу рабочую переменную окружения
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.SHEET_ID;
    
    if (!credentials || !spreadsheetId) {
        throw new Error('Missing Vercel environment variables (Service Account Key or Sheet ID).');
    }

    const serviceAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key, 
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAuth);
    await doc.loadInfo(); 
    
    const sheet = doc.sheetsByIndex[SHEET_INDEX]; 
    
    if (!sheet) {
        throw new Error(`Sheet with index ${SHEET_INDEX} not found.`);
    }
    
    await sheet.loadHeaderRow(); // Загрузка заголовков

    return sheet;
}

export default async function handler(req, res) {
    // Настройка CORS для Mini App
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка OPTIONS-запроса (проверка CORS)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    
    try {
        const sheet = await getSpreadsheetSheet();
        
        // --------------------------------------------------
        // A. GET-ЗАПРОС (Получение карт по UserID)
        // --------------------------------------------------
        if (req.method === 'GET') {
            const { userId } = req.query; 
            if (!userId) {
                return res.status(400).json({ error: 'Missing userId query parameter.' });
            }
            
            const rows = await sheet.getRows(); 

            // row.UserID должен соответствовать заголовку столбца в Sheets
            const cards = rows
                .filter(row => String(row.UserID) === String(userId)) 
                .map(row => ({
                    userId: row.UserID,
                    name: row.CardName || 'Без названия',
                    number: row.CardNumber || '',          
                    barcodeType: row.BarcodeType || 'CODE128' 
                }));

            return res.status(200).json({ cards });
        }

        // --------------------------------------------------
        // B. POST-ЗАПРОС (Добавление новой карты)
        // --------------------------------------------------
        if (req.method === 'POST') {
            const { userId, cardName, cardNumber, barcodeType = 'CODE128' } = req.body;
            
            if (!userId || !cardName || !cardNumber) {
                return res.status(400).json({ error: 'Missing required card data.' });
            }

            // Добавляем новую строку (имена полей должны совпадать с заголовками Google Sheets!)
            await sheet.addRow({
                UserID: userId,
                CardName: cardName,
                CardNumber: cardNumber,
                BarcodeType: barcodeType
            });

            return res.status(201).json({ success: true, message: 'Card added successfully.', card: req.body });
        }
        
        // Блокируем другие методы
        return res.status(405).json({ error: 'Method Not Allowed.' });

    } catch (error) {
        console.error('❌ API Error:', error);
        // Возвращаем детали ошибки, чтобы помочь с отладкой
        return res.status(500).json({ error: 'Failed to process request.', details: error.message || 'Internal server error.' });
    }
}
