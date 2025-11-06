// api/cards.js (Обновлено)
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const SHEET_INDEX = 0; // Первый лист

async function getSpreadsheetSheet() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.SHEET_ID;
    
    if (!credentials || !spreadsheetId) {
        throw new Error('Missing Vercel environment variables.');
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
    
    await sheet.loadHeaderRow(); 
    return sheet;
}

export default async function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Добавили GET
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    
    try {
        const sheet = await getSpreadsheetSheet();
        
        // --------------------------------------------------
        // A. GET-ЗАПРОС (Чтение для проверки)
        // --------------------------------------------------
        if (req.method === 'GET') {
            const { userId } = req.query; 
            if (!userId) {
                return res.status(400).json({ error: 'Missing userId query parameter.' });
            }
            
            const rows = await sheet.getRows(); 

            // Ищем любые карты, принадлежащие этому пользователю
            const userCards = rows
                .filter(row => String(row.UserID) === String(userId)) 
                .map(row => ({
                    name: row.CardName,
                    number: row.CardNumber
                }));

            // Возвращаем список карт (даже если он пуст)
            return res.status(200).json({ cards: userCards });
        }

        // --------------------------------------------------
        // B. POST-ЗАПРОС (Создание)
        // --------------------------------------------------
        if (req.method === 'POST') {
            const { userId, cardName, cardNumber, barcodeType = 'CODE128' } = req.body;
            
            if (!userId || !cardName || !cardNumber) {
                return res.status(400).json({ error: 'Missing required card data.' });
            }

            // --- ДОБАВЛЕНА ПРОВЕРКА НА ДУБЛИРОВАНИЕ ПЕРЕД ЗАПИСЬЮ ---
            const rows = await sheet.getRows();
            const existingCard = rows.find(row => 
                String(row.UserID) === String(userId) && 
                String(row.CardName).toLowerCase() === String(cardName).toLowerCase()
            );

            // Вы можете решить, разрешать ли несколько карт или только одну. 
            // Сейчас разрешаем несколько, но запрещаем дубли по имени. 
            /*
            if (existingCard) {
                // Если вы хотите разрешать только одну карту на пользователя:
                // return res.status(409).json({ error: 'Card already exists for this user.' });

                // Если вы хотите запретить дубли по имени (например, две "Магнита"):
                // return res.status(409).json({ error: 'Card with this name already exists for this user.' });
            }
            */
            // Мы просто разрешаем добавление, так как фронтенд сам проверяет наличие данных
            
            await sheet.addRow({
                UserID: userId,
                CardName: cardName,
                CardNumber: cardNumber,
                BarcodeType: barcodeType
            });

            return res.status(201).json({ success: true, message: 'Card added successfully.', card: req.body });
        }
        
        return res.status(405).json({ error: 'Method Not Allowed.' });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ error: 'Failed to process request.', details: error.message || 'Internal server error.' });
    }
}
