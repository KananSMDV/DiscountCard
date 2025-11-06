import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID, new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  }));

  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

    if (req.method === "GET") {
      const { user_id } = req.query;
      
      const rows = await sheet.getRows();

      // ИСПРАВЛЕНИЕ 1: Фильтруем, используя r.get('user_id')
      const userCards = rows.filter(r => String(r.get('user_id')) === user_id);
      
      // ИСПРАВЛЕНИЕ 2: Используем r.get() для получения данных в финальный объект
      return res.status(200).json(userCards.map(r => ({
        shop_name: r.get('shop_name'),
        card_number: r.get('card_number'),
        color: r.get('color')
      })));
    }

    if (req.method === "POST") {
      const { user, shop_name, card_number, color } = req.body;
      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        // Гарантируем, что ID сохраняется как строка, чтобы избежать проблем при сравнении
        user_id: String(user.id), 
        username: user.username || "",
        shop_name,
        card_number,
        color,
      });
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("❌ Глобальная ошибка:", err);
    return res.status(500).json({ error: "Ошибка сервера: " + err.message });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
