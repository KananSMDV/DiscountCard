import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const sheetId = process.env.SHEET_ID;

  const serviceAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

  // ➕ Добавление карты
  if (req.method === "POST") {
    try {
      const { user, shop_name, card_number, color, logo_url, type } = req.body;

      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: user.id,
        username: user.username || "",
        shop_name,
        card_number,
        color,
        logo_url,
        type,
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Ошибка при записи:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 📄 Получение карт пользователя
  if (req.method === "GET") {
    try {
      const userId = req.query.user_id;
      if (!userId) {
        return res.status(400).json({ error: "user_id обязателен" });
      }

      const rows = await sheet.getRows();
      const cards = rows
        .filter(r => String(r.get("user_id")) === String(userId))
        .map(r => ({
          shop_name: r.get("shop_name"),
          card_number: r.get("card_number"),
          color: r.get("color"),
          logo_url: r.get("logo_url"),
          type: r.get("type"),
        }));

      return res.status(200).json(cards);
    } catch (err) {
      console.error("❌ Ошибка при чтении:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
