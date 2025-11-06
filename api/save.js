import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }));

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

    // ===== GET =====
    if (req.method === "GET") {
      const { user_id } = req.query;
      const rows = await sheet.getRows();

      const userCards = rows
        .filter(r => String(r.user_id).trim() === String(user_id).trim())
        .map(r => ({
          shop_name: r.shop_name || "",
          card_number: r.card_number || "",
          color: r.color || "#333"
        }));

      return res.status(200).json(userCards);
    }

    // ===== POST =====
    if (req.method === "POST") {
      const { user, shop_name, card_number, color } = req.body;
      if (!user?.id || !shop_name || !card_number) {
        return res.status(400).json({ success: false, error: "Missing fields" });
      }

      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: String(user.id),
        username: user.username || "",
        shop_name,
        card_number,
        color,
      });

      return res.status(200).json({ success: true });
    }

    // ===== INVALID METHOD =====
    return res.status(405).json({ success: false, error: "Method not allowed" });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
