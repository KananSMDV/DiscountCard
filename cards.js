// api/cards.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Проверьте, что имя листа в Google Sheets именно 'Cards'
const SHEET_NAME = 'Cards'; 
const SHEET_INDEX = 0; // Первый лист

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
        key: credentials.private_key, 
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAuth);
    await doc.loadInfo(); 
    
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const sheet = await getSpreadsheetSheet();
        
        // --------------------------------------------------
        // ТОЛЬКО POST-ЗАПРОС (Добавление новой карты)
        // --------------------------------------------------
        if (req.method === 'POST') {
            // Ожидаем эти поля от фронтенда
            const { userId, cardName, cardNumber, barcodeType = 'CODE128' } = req.body;
            
            if (!userId || !cardName || !cardNumber) {
                return res.status(400).json({ error: 'Missing required card data.' });
            }

            // Добавляем новую строку. Имена полей должны соответствовать заголовкам Google Sheets!
            await sheet.addRow({
                UserID: userId,
                CardName: cardName,
                CardNumber: cardNumber,
                BarcodeType: barcodeType 
            });

            return res.status(201).json({ success: true, message: 'Card added successfully.', card: req.body });
        }

        // Блокируем GET и другие методы, пока не понадобится
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ error: 'Failed to process request.', details: error.message || 'Internal server error.' });
    }
}
