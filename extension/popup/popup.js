// Trustline extension popup (prototype).
const APP = "http://localhost:3000";

function text(el, value, className) {
  el.textContent = value;
  if (className) el.className = className;
}

async function loadYou() {
  const status = document.getElementById("you-status");
  try {
    const res = await fetch(`${APP}/api/wallet`, { credentials: "include" });
    if (!res.ok) throw new Error("signed out");
    const data = await res.json();
    const you = document.getElementById("you");
    you.innerHTML = "";
    const eyebrow = document.createElement("p");
    text(eyebrow, `Your Trustline · ${data.wallet.trustlineId}`, "eyebrow");
    const big = document.createElement("p");
    text(big, data.reputation.bookingReliability === null ? "—" : `${data.reputation.bookingReliability}%`, "big");
    const label = document.createElement("p");
    text(label, "booking reliability", "muted");
    const note = document.createElement("p");
    text(note, "Bookings you complete can contribute to your Trustline reputation.", "muted");
    note.style.marginTop = "8px";
    note.style.fontSize = "12.5px";
    you.append(eyebrow, big, label, note);
  } catch {
    text(status, "Sign in at Trustline to see your reputation here.", "muted");
  }
}

async function loadPage() {
  const status = document.getElementById("page-status");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !/^http:\/\/(localhost|127\.0\.0\.1):3000\/marketplace/.test(tab.url)) {
      text(status, "Not a supported marketplace page.", "muted");
      return;
    }
    text(status, "Active — sellers on this page are checked against the Trustline ledger.", "muted");
  } catch {
    text(status, "Trustline runs on supported marketplace pages.", "muted");
  }
}

loadYou();
loadPage();
