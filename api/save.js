import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const { user_id, username, shop_name, card_number, color } =
      req.method === "POST" ? req.body : req.query;

    // Авторизация
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const auth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0]; // Лист "Cards"

    // Если есть данные — сохраняем новую карту
    if (shop_name && card_number && color) {
      await sheet.addRow({
        timestamp: new Date().toISOString(),
        user_id: String(user_id),
        username: username || "",
        shop_name,
        card_number,
        color,
      });
    }

    // Загружаем все строки
    const rows = await sheet.getRows();

    // ✅ Фикс фильтрации по user_id
    const cards = rows
      .filter((r) => String(r.user_id) === String(user_id))
      .map((r) => ({
        shop_name: r.shop_name,
        card_number: r.card_number,
        color: r.color,
      }));

    return res.status(200).json({ success: true, cards });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
