import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const { user_id, username, shop_name, card_number, color } = req.method === "POST"
      ? req.body
      : req.query;

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }));

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    // Если добавляем карту
    if (req.method === "POST") {
      await sheet.addRow({
        timestamp: new Date().toISOString(),
        user_id,
        username,
        shop_name,
        card_number,
        color
      });

      return res.status(200).json({ success: true });
    }

    // Если получаем карты
    const rows = await sheet.getRows();
    const cards = rows
      .filter(r => r.user_id == user_id)
      .map(r => ({
        shop_name: r.shop_name,
        card_number: r.card_number,
        color: r.color
      }));

    return res.status(200).json({ success: true, cards });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
