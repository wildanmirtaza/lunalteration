// ================= IMPORT =================
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= DOM =================
const form = document.getElementById("form");
const list = document.getElementById("list");
const rowLimit = document.getElementById("rowLimit");
const filterStatus = document.getElementById("filterStatus");
const searchInput = document.getElementById("searchInput");

let allData = [];
let selectedPrintData = null;

// =====================================================
// ================= INVOICE COUNTER ===================
// =====================================================
async function generateInvoice() {
  const counterRef = doc(db, "system", "counter");

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let newNumber = 1;

    if (!counterDoc.exists()) {
      transaction.set(counterRef, { lastInvoice: 1 });
    } else {
      newNumber = counterDoc.data().lastInvoice + 1;
      transaction.update(counterRef, { lastInvoice: newNumber });
    }

    return newNumber;
  });
}

// =====================================================
// ================= BACKUP SHEET ======================
// =====================================================
async function backupToSheet(data) {
  try {
    await fetch("https://script.google.com/macros/s/AKfycbxtzindux2ij-W93TMYU4xpmkuRyKaH16SRe1REKTotSw7S1hRo-qN4C7zubXe01r21/exec", {
      method: "POST",
      body: JSON.stringify(data)
    });
  } catch (err) {
    showToast("Backup gagal", "error");
  }
}

// =====================================================
// ================= FORM SUBMIT =======================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const invoice = await generateInvoice();

  const newData = {
    invoice,
    customer: customer.value,
    produk: produk.value,
    no_hp: nohp.value,
    status: "Masuk",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    history: [{
      status: "Masuk",
      tanggal: new Date()
    }]
  };

  await addDoc(collection(db, "alteration"), newData);
  backupToSheet(newData);

  form.reset();
  showToast("Data berhasil ditambahkan", "success");
});

// =====================================================
// ================= REALTIME LISTENER =================
function listenRealtime() {
  const q = query(
    collection(db, "alteration"),
    orderBy("created_at", "desc")
  );

  onSnapshot(q, (snapshot) => {
    allData = [];
    snapshot.forEach(doc => {
      allData.push({ id: doc.id, ...doc.data() });
    });

    render();
    updateDashboard();
  });
}

// =====================================================
// ================= RENDER LIST =======================
function render() {
  list.innerHTML = "";

  const filter = filterStatus.value;
  const keyword = searchInput.value.toLowerCase();

  const filtered = allData.filter(item => {
    const matchStatus = filter === "all" || item.status === filter;
    const matchSearch =
      item.customer.toLowerCase().includes(keyword) ||
      item.no_hp.includes(keyword) ||
      item.invoice.toString().includes(keyword); // tambah filter invoice

    return matchStatus && matchSearch;
  });

let limitValue = rowLimit.value === "all"
  ? filtered.length
  : parseInt(rowLimit.value);

filtered.slice(0, limitValue).forEach(item => {
    const div = document.createElement("div");
    div.className = `item status-${item.status}`;

    div.innerHTML = `
      <b>${item.invoice}</b><br>
      ${item.customer} - ${item.produk}<br>
      HP: ${item.no_hp}<br>
      Status: <b>${item.status}</b><br>
      <button onclick="directPrint(${item.invoice})">Print</button>
    `;

    list.appendChild(div);
  });
}

// =====================================================
// ================= UPDATE STATUS =====================
window.changeStatus = async (id, current) => {
  let next = "";

  if (current === "Masuk") next = "Jadi";
  else if (current === "Jadi") next = "Diambil";
  else return showToast("Status sudah selesai", "info");

  await updateDoc(doc(db, "alteration", id), {
    status: next,
    updated_at: serverTimestamp(),
    history: arrayUnion({
      status: next,
      tanggal: new Date()
    })
  });

  showToast("Status berhasil diupdate", "success");
};

// =====================================================
// ================= DASHBOARD =========================
function updateDashboard() {
  countMasuk.textContent = allData.filter(i => i.status === "Masuk").length;
  countJadi.textContent = allData.filter(i => i.status === "Jadi").length;
  countDiambil.textContent = allData.filter(i => i.status === "Diambil").length;
}

// =====================================================
// ================= DIRECT PRINT ======================
window.directPrint = (invoice) => {
  const item = allData.find(i => i.invoice == invoice);
  if (!item) return showToast("Data tidak ditemukan", "error");

  const now = new Date();
  const tanggal = now.toLocaleDateString("id-ID");
  const jam = now.toLocaleTimeString("id-ID");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(item.invoice)}`;

  const content = `
  <html>
  <head>
    <style>
      @page { size: 58mm auto; margin: 0; }

      body {
        width: 58mm;
        margin: 0;
        font-family: monospace;
        font-size: 12px;
        padding: 5px;
      }

      .center { text-align: center; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      img { display:block; margin:auto; }

      .big-number {
        font-size: 14mm;
        font-weight: 900;
        text-align: center;
        margin: 4mm 0;
      }

      table { width:100%; border-collapse:collapse; }
      td { padding:2px 0; }
      td:nth-child(1){ width:35%; }
      td:nth-child(2){ width:5%; text-align:center; }
      td:nth-child(3){ width:60%; }
    </style>
  </head>
  <body>

    <div class="center">
      <b>LUNA</b><br>
      Nota Servis Jahit
    </div>

    <div class="line"></div>

    <div class="big-number">
      ${item.invoice}
    </div>

    Tgl : ${tanggal}<br>
    Jam : ${jam}<br>

    <div class="line"></div>

    <table>
      <tr><td>Customer</td><td>:</td><td>${item.customer}</td></tr>
      <tr><td>Produk</td><td>:</td><td>${item.produk}</td></tr>
      <tr><td>No HP</td><td>:</td><td>${item.no_hp}</td></tr>
    </table>

    <div class="line"></div>

    <div class="center">
      <img src="${qrUrl}" width="90"><br>
      Tunjukkan nota ini saat mengambil
    </div>

    <div class="line"></div>

    <div class="center">
      Terima kasih 🙏
    </div>

  </body>
  </html>
  `;

  const printWindow = window.open("", "", "width=400,height=600");
  printWindow.document.write(content);
  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 500);
  };

  showToast("Nota berhasil diprint", "success");
};

// =====================================================
// ================= SCAN MODE (SEARCH ONLY) ===========
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    render();          // hanya trigger filter
    showToast("Pencarian berhasil ✔", "success");
  }
});

// =====================================================
// ================= TOAST =============================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ================= LIMIT MODE =================

const LIMIT_MODE = true; // ubah false untuk membuka aplikasi

if (LIMIT_MODE) {

    document.getElementById("limitOverlay").style.display = "flex";

    document.body.style.overflow = "hidden";

    throw new Error("Application usage limit exceeded.");

}

// =====================================================
// ================= FILTER EVENT ======================
rowLimit.addEventListener("change", render);
filterStatus.addEventListener("change", render);
searchInput.addEventListener("input", render);

// =====================================================
listenRealtime();