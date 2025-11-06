import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

    // ✅ ЗАГРУЗКА КАРТ
    if (req.method === "GET") {
      const { user_id } = req.query;
      const rows = await sheet.getRows();

      const userCards = rows
        .filter((r) => String(r.user_id) === String(user_id))
        .map((r) => ({
          shop_name: r.shop_name,
          card_number: r.card_number,
          color: r.color,
        }));

      return res.status(200).json(userCards);
    }

    // ✅ ДОБАВЛЕНИЕ КАРТ
    if (req.method === "POST") {
      const { user, shop_name, card_number, color } = req.body;

      if (!user?.id || !shop_name || !card_number) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await sheet.addRow({
        timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
        user_id: String(user.id),
        username: user.username || "",
        shop_name,
        card_number,
        color: color || "#007aff",
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
