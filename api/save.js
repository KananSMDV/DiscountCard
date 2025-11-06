import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
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

    // POST: добавить строку
    if (req.method === "POST") {
      const { user, shop_name, card_number, color, logo_url, type } = req.body;
      if (!user || !user.id) return res.status(400).json({ error: "user.id обязателен" });

      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: String(user.id),
        username: user.username || "",
        shop_name: shop_name || "",
        card_number: String(card_number || ""),
        color: color || "",
        logo_url: logo_url || "",
        type: type || "barcode",
      });

      return res.status(200).json({ success: true });
    }

    // GET: вернуть только карты пользователя
    if (req.method === "GET") {
      const userId = req.query.user_id;
      if (!userId) return res.status(400).json({ error: "user_id обязателен" });

      const rows = await sheet.getRows();
      const cards = rows
        .filter(r => String(r.user_id || r.get?.("user_id") || "").trim() === String(userId).trim())
        .map(r => ({
          shop_name: r.shop_name || r.get?.("shop_name") || "",
          card_number: r.card_number || r.get?.("card_number") || "",
          color: r.color || r.get?.("color") || "",
          logo_url: r.logo_url || r.get?.("logo_url") || "",
          type: r.type || r.get?.("type") || "barcode",
        }));
      return res.status(200).json(cards);
    }

    // DELETE: удалить карту (user_id + card_number)
    if (req.method === "DELETE") {
      const { user_id, card_number } = req.body || {};
      if (!user_id || !card_number) return res.status(400).json({ error: "user_id и card_number обязателен" });

      const rows = await sheet.getRows();
      let deleted = 0;
      for (const row of rows) {
        const rUser = String(row.user_id || row.get?.("user_id") || "").trim();
        const rNum = String(row.card_number || row.get?.("card_number") || "").trim();
        if (rUser === String(user_id).trim() && rNum === String(card_number).trim()) {
          try {
            await row.delete();
            deleted++;
          } catch (e) {
            console.error("Ошибка удаления строки:", e);
          }
        }
      }

      return res.status(200).json({ success: true, deleted });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error("❌ API error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
