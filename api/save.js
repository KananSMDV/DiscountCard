import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, user } = req.body;

    // Подключаемся к таблице
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const sheetId = process.env.SHEET_ID;

    const serviceAuth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      username: user.username,
      email,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка:", err);
    res.status(500).json({ error: "Ошибка при записи в Google Sheets" });
  }
}
