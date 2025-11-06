import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  
  const serviceAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);

  await doc.loadInfo();
  // Используем 'Cards' или первый лист. 
  // Если вы не переименовали лист, оставьте его по умолчанию.
  const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0]; 

  // --- Получить КАРТЫ (GET) ---
  if (req.method === "GET") {
    try {
      const user_id_query = req.query.user_id; // ID, которое пришло из запроса
      if (!user_id_query) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const rows = await sheet.getRows();

      // ФИЛЬТРАЦИЯ И ИСПРАВЛЕНИЕ: 
      // 1. Используем r.get('user_id') для чтения.
      // 2. Сравниваем, приводя оба значения к строке, чтобы избежать ошибок типов.
      const userCards = rows.filter(r => String(r.get('user_id')) === String(user_id_query));
      
      // ИСПРАВЛЕНИЕ: Маппинг с использованием r.get('поле')
      return res.status(200).json(userCards.map(r => ({
        shop_name: r.get('shop_name'),
        card_number: r.get('card_number'),
        color: r.get('color'),
        // Добавьте logo_url, если оно есть в таблице
        logo_url: r.get('logo_url') || '',
      })));

    } catch (err) {
      console.error("❌ Ошибка при чтении:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- Добавить КАРТУ (POST) ---
  if (req.method === "POST") {
    try {
      const { user, shop_name, card_number, color, logo_url } = req.body;
      
      // Логика POST-запроса была почти верна, 
      // но добавил logo_url в деструктуризацию (req.body) для полноты.
      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: String(user.id), // Оставляем приведение к строке, чтобы избежать проблем
        username: user.username || "",
        shop_name,
        card_number,
        color,
        logo_url: logo_url || ''
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Ошибка при записи:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
