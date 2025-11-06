// api/cards.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Убедитесь, что лист в Google Sheets называется 'Cards'
const SHEET_NAME = 'Cards'; 
const SHEET_INDEX = 0; // Используем индекс 0, как в вашем коде (первый лист)

// Функция инициализации и авторизации
async function getSpreadsheetSheet() {
    // ВАЖНО: Используем ваше название переменной окружения
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.SHEET_ID;
    
    if (!credentials || !spreadsheetId) {
        throw new Error('Missing environment variables (Credentials or Sheet ID).');
    }

    const serviceAuth = new JWT({
        email: credentials.client_email,
        // private_key: в Vercel часто нужно заменить \\n на \n, 
        // но JSON.parse обычно справляется, если ключ правильно скопирован.
        key: credentials.private_key, 
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAuth);
    await doc.loadInfo(); 
    
    // Используем doc.sheetsByIndex[0], как в вашем коде
    let sheet = doc.sheetsByIndex[SHEET_INDEX];

    if (!sheet) {
        throw new Error(`Sheet with index ${SHEET_INDEX} not found.`);
    }
    
    // Загружаем заголовки для работы с именованными полями
    await sheet.loadHeaderRow(); 

    return sheet;
}

export default async function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const sheet = await getSpreadsheetSheet();
        
        // --------------------------------------------------
        // A. GET-ЗАПРОС (Получение карт по UserID)
        // --------------------------------------------------
        if (req.method === 'GET') {
            const { userId } = req.query; // Получаем ID пользователя из Mini App
            if (!userId) {
                return res.status(400).json({ error: 'Missing userId query parameter.' });
            }
            
            const rows = await sheet.getRows(); 

            const cards = rows
                // row.UserID должен соответствовать заголовку столбца в Sheets
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
            // Ожидаем эти поля от фронтенда (Mini App)
            const { userId, cardName, cardNumber, barcodeType = 'CODE128' } = req.body;
            
            if (!userId || !cardName || !cardNumber) {
                return res.status(400).json({ error: 'Missing required card data (userId, cardName, cardNumber).' });
            }

            // Добавляем новую строку, используя названия заголовков столбцов
            await sheet.addRow({
                UserID: userId,
                CardName: cardName,
                CardNumber: cardNumber,
                BarcodeType: barcodeType
            });

            return res.status(201).json({ success: true, message: 'Card added successfully.', card: req.body });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ error: 'Failed to process request.', details: error.message || 'Internal server error.' });
    }
}
