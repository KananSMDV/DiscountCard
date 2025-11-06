import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📩 Получены данные:", req.body);

    const { email, user } = req.body;
    if (!email || !user) {
      return res.status(400).json({ error: "Missing data" });
    }

    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const sheetId = process.env.SHEET_ID;

    const serviceAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.addRow({
      timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
      user_id: user.id,
      username: user.username || "",
      first_name: user.first_name || "",
      email,
    });

    console.log("✅ Данные добавлены в Google Sheets");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка при записи в таблицу:", err);
    return res.status(500).json({ error: err.message });
  }
}
