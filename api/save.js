export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    console.log("📩 Получены данные:", data);

    // здесь можешь добавить сохранение в базу данных, Google Sheets и т.д.

    return res.status(200).json({ success: true, received: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
