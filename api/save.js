import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    // Авторизация
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    // 🟩 POST — добавляем карту
    if (req.method === "POST") {
      const { user, shop_name, card_number, color } = req.body;
      if (!user?.id || !shop_name || !card_number) {
        return res.status(400).json({ success: false, error: "Неполные данные" });
      }

      await sheet.addRow({
        user_id: user.id,
        username: user.username || "",
        shop_name,
        card_number,
        color,
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({ success: true });
    }

    // 🟦 GET — получаем все карты пользователя
    if (req.method === "GET") {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id обязателен" });

      await sheet.loadCells("A1:F");
      const rows = await sheet.getRows();

      const userCards = rows
        .filter((r) => r.user_id === user_id.toString())
        .map((r) => ({
          shop_name: r.shop_name,
          card_number: r.card_number,
          color: r.color,
        }));

      return res.status(200).json(userCards);
    }

    return res.status(405).json({ error: "Метод не поддерживается" });
  } catch (err) {
    console.error("Ошибка Google Sheets:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
