import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export default async function handler(req, res) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID, new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  }));

  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Cards"] || doc.sheetsByIndex[0];

  if (req.method === "GET") {
    const { user_id } = req.query;
    const rows = await sheet.getRows();
    const userCards = rows.filter(r => r.user_id === user_id);
    return res.status(200).json(userCards.map(r => ({
      shop_name: r.shop_name,
      card_number: r.card_number,
      color: r.color
    })));
  }

  if (req.method === "POST") {
    const { user, shop_name, card_number, color } = req.body;
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

  return res.status(405).json({ error: "Method not allowed" });
}
