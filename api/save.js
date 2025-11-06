async function loadCards() {
  const user = tg.initDataUnsafe?.user || { id: "unknown" };
  const res = await fetch(`${API_URL}?user_id=${user.id}`);
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
