import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID, new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  }));

  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

  // Получить карты конкретного пользователя (GET)
  if (req.method === "GET") {
    try {
      const { user_id } = req.query;
      const rows = await sheet.getRows();
      
      // ИСПРАВЛЕНИЕ 1: Используем r.get() для корректного доступа к user_id для фильтрации
      const userCards = rows.filter(r => r.get('user_id') === user_id);
      
      return res.status(200).json(userCards.map(r => ({
        // ИСПРАВЛЕНИЕ 2: Используем r.get() для корректного доступа к данным
        shop_name: r.get('shop_name'),
        card_number: r.get('card_number'),
        color: r.get('color')
      })));
    } catch (error) {
        console.error("❌ Ошибка при получении карт:", error);
        return res.status(500).json({ error: error.message });
    }
  }

  // Добавить новую карту (POST)
  if (req.method === "POST") {
    try {
      const { user, shop_name, card_number, color } = req.body;
      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: String(user.id),
        username: user.username || "",
        shop_name,
        card_number,
        color,
      });
      return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Ошибка при записи карты:", error);
        return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
