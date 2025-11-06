<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Discount Cards</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--tg-theme-bg-color, #f4f4f6);
      color: var(--tg-theme-text-color, #222);
      margin: 0;
      padding: 0;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      font-size: 22px;
      background: var(--tg-theme-bg-color, #fff);
      border-bottom: 1px solid #ddd;
      font-weight: 600;
    }

    #addBtn {
      font-size: 28px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--tg-theme-button-color, #2a9d8f);
    }

    /* Форма добавления */
    .form {
      display: none;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      background: #fff;
      border-bottom: 1px solid #eee;
    }

    input, select, button {
      padding: 12px;
      font-size: 16px;
      border-radius: 12px;
      border: 1px solid #ccc;
    }

    .colors {
      display: flex;
      gap: 10px;
      margin-top: 5px;
    }

    .color {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.2s ease;
    }
    .color:hover { transform: scale(1.1); }
    .color.active { border: 2px solid #000; }

    /* Сетка карточек */
    #cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 20px;
      padding: 20px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    .card .shop {
      font-size: 20px;
      letter-spacing: 0.5px;
    }

    .card .number {
      opacity: 0.8;
      font-size: 14px;
      text-align: right;
      margin-top: 30px;
    }

    /* Модалка */
    .modal {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
    }

    .modal-content {
      background: #fff;
      border-radius: 20px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-content h3 {
      margin-top: 0;
      font-size: 22px;
    }

    svg, #qrcode {
      margin-top: 10px;
      width: 100%;
    }

    #closeModal {
      margin-top: 18px;
      background: #2a9d8f;
      color: #fff;
      border: none;
      padding: 12px 20px;
      font-size: 16px;
      border-radius: 12px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <span>Мои карты</span>
    <button id="addBtn">＋</button>
  </header>

  <div class="form" id="form">
    <input id="shop_name" placeholder="Название магазина" />
    <input id="card_number" placeholder="Номер карты" />
    <label>Тип кода:</label>
    <select id="code_type">
      <option value="barcode">Штрихкод</option>
      <option value="qr">QR-код</option>
    </select>
    <div class="colors" id="colorSelect">
      <div class="color" style="background:#2a9d8f" data-color="#2a9d8f"></div>
      <div class="color" style="background:#264653" data-color="#264653"></div>
      <div class="color" style="background:#e76f51" data-color="#e76f51"></div>
      <div class="color" style="background:#f4a261" data-color="#f4a261"></div>
      <div class="color" style="background:#457b9d" data-color="#457b9d"></div>
    </div>
    <button id="saveCard">Сохранить карту</button>
  </div>

  <div id="cards"></div>

  <!-- Modal -->
  <div class="modal" id="modal">
    <div class="modal-content">
      <h3 id="modal-shop"></h3>
      <p id="modal-number"></p>
      <div id="qrcode"></div>
      <svg id="barcode"></svg>
      <button id="closeModal">Закрыть</button>
    </div>
  </div>

  <script>
    const tg = window.Telegram.WebApp;
    tg.expand();

    const API_URL = "https://discount-cards.vercel.app/api/save";
    const cardsDiv = document.getElementById("cards");
    const form = document.getElementById("form");
    const addBtn = document.getElementById("addBtn");
    const saveCard = document.getElementById("saveCard");

    let selectedColor = "#2a9d8f";
    document.querySelectorAll(".color").forEach(c => {
      c.onclick = () => {
        document.querySelectorAll(".color").forEach(el => el.classList.remove("active"));
        c.classList.add("active");
        selectedColor = c.dataset.color;
      };
    });

    addBtn.onclick = () => {
      form.style.display = form.style.display === "flex" ? "none" : "flex";
    };

    async function loadCards() {
      const res = await fetch(API_URL);
      const cards = await res.json();
      cardsDiv.innerHTML = "";
      cards.forEach(c => {
        const div = document.createElement("div");
        div.className = "card";
        div.style.background = c.color || "#2a9d8f";
        div.innerHTML = `
          <div class="shop">${c.shop_name}</div>
          <div class="number">№ ${c.card_number}</div>
        `;
        div.onclick = () => openModal(c);
        cardsDiv.appendChild(div);
      });
    }

    saveCard.onclick = async () => {
      const shop_name = document.getElementById("shop_name").value.trim();
      const card_number = document.getElementById("card_number").value.trim();
      const type = document.getElementById("code_type").value;
      if (!shop_name || !card_number) return alert("Заполните все поля!");

      const user = tg.initDataUnsafe?.user || { id: "unknown", username: "anonymous" };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, shop_name, card_number, color: selectedColor, type }),
      });
      if (res.ok) {
        form.style.display = "none";
        document.getElementById("shop_name").value = "";
        document.getElementById("card_number").value = "";
        loadCards();
      } else alert("Ошибка при добавлении!");
    };

    // Modal
    const modal = document.getElementById("modal");
    const closeModal = document.getElementById("closeModal");
    const modalShop = document.getElementById("modal-shop");
    const modalNumber = document.getElementById("modal-number");
    const barcode = document.getElementById("barcode");
    const qrcodeDiv = document.getElementById("qrcode");

    function openModal(card) {
      modal.style.display = "flex";
      modalShop.textContent = card.shop_name;
      modalNumber.textContent = "№ " + card.card_number;
      qrcodeDiv.innerHTML = "";
      barcode.innerHTML = "";

      if (card.type === "qr") {
        new QRCode(qrcodeDiv, { text: card.card_number, width: 200, height: 200 });
      } else {
        JsBarcode("#barcode", card.card_number, { format: "CODE128", displayValue: true });
      }
    }

    closeModal.onclick = () => modal.style.display = "none";
    window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

    loadCards();
  </script>
</body>
</html>
