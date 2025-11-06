// api/cards.js
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  // Настройка CORS для Mini App (важно для работы)
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    // ВАЖНО: Теперь мы ожидаем данные карты с фронтенда
    const { userId, cardName, cardNumber, barcodeType = 'CODE128' } = req.body; 

    if (!userId || !cardName || !cardNumber) {
        return res.status(400).json({ error: 'Missing required card data (userId, cardName, cardNumber).' });
    }

    // ВАША ЛОГИКА ПОДКЛЮЧЕНИЯ (использует GOOGLE_SERVICE_ACCOUNT_KEY)
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const sheetId = process.env.SHEET_ID;

    const serviceAuth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow(); // Нужна, чтобы обращаться по имени столбца

    // ВАЖНО: Сохраняем данные карты
    await sheet.addRow({
      UserID: userId,         // Должно совпадать с заголовком в Google Sheets
      CardName: cardName,     // Должно совпадать с заголовком в Google Sheets
      CardNumber: cardNumber, // Должно совпадать с заголовком в Google Sheets
      BarcodeType: barcodeType // Должно совпадать с заголовком в Google Sheets
    });

    res.status(201).json({ success: true, message: 'Карта успешно сохранена.' });
  } catch (err) {
    console.error("❌ Ошибка:", err);
    res.status(500).json({ error: "Ошибка при записи в Google Sheets", details: err.message });
  }
}
