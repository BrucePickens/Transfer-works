// =========================================================
// STABLE VERSION — AUTO CLEANUP REMOVED
// Unified Import / Export v2.0
// =========================================================

console.log("SCRIPT LOADED");

/* =========================================================
   GLOBAL ERROR HANDLER (MOBILE SAFE)
========================================================= */
window.onerror = function (msg, src, line, col, err) {
  alert(
    "JS ERROR:\n" +
    msg + "\nLine: " + line + "\n" +
    (err ? err.stack : "")
  );
  return true;
};

/* =========================================================
   INDEXEDDB — ATTACHMENTS ONLY
========================================================= */

const ATTACHMENT_DB_NAME = "mealPlannerAttachments";
const ATTACHMENT_STORE = "files";
const ATTACHMENT_DB_VERSION = 1;

let attachmentDB = null;

function openAttachmentDB() {
  if (attachmentDB) return Promise.resolve(attachmentDB);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ATTACHMENT_DB_NAME, ATTACHMENT_DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        db.createObjectStore(ATTACHMENT_STORE);
      }
    };

    req.onsuccess = e => {
      attachmentDB = e.target.result;
      resolve(attachmentDB);
    };

    req.onerror = () => reject(req.error);
  });
}

async function storeAttachmentBlob(id, blob) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    tx.objectStore(ATTACHMENT_STORE).put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAttachmentBlob(id) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readonly");
    const req = tx.objectStore(ATTACHMENT_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/* =========================================================
   DATA STORAGE
========================================================= */

let categories = JSON.parse(localStorage.getItem("mp_categories")) || [];
let meals = JSON.parse(localStorage.getItem("mp_meals")) || [];
let plan = JSON.parse(localStorage.getItem("mp_plan")) || {
  sun:null, mon:null, tue:null, wed:null,
  thu:null, fri:null, sat:null
};

let ingredientGroups =
  JSON.parse(localStorage.getItem("mp_ingredientGroups")) || { Ungrouped: [] };

let ingredientGroupOrder =
  JSON.parse(localStorage.getItem("mp_ingredientGroupOrder")) ||
  Object.keys(ingredientGroups);

let groceryPrintList =
  JSON.parse(localStorage.getItem("mp_groceryPrintList")) || {};

let ingredientSelections =
  JSON.parse(localStorage.getItem("mp_ingredientSelections")) || {};

function saveAll() {
  localStorage.setItem("mp_categories", JSON.stringify(categories));
  localStorage.setItem("mp_meals", JSON.stringify(meals));
  localStorage.setItem("mp_plan", JSON.stringify(plan));
}

function saveIngredientGroups() {
  localStorage.setItem("mp_ingredientGroups", JSON.stringify(ingredientGroups));
  localStorage.setItem("mp_ingredientGroupOrder", JSON.stringify(ingredientGroupOrder));
}

function saveGroceryPrintList() {
  localStorage.setItem("mp_groceryPrintList", JSON.stringify(groceryPrintList));
}

function saveIngredientSelections() {
  localStorage.setItem("mp_ingredientSelections", JSON.stringify(ingredientSelections));
}

/* =========================================================
   DOM READY
========================================================= */

window.addEventListener("load", () => {

  // ================= DATA EXPORT / IMPORT =================

  const exportDataBtn = document.getElementById("exportDataBtn");
  const importDataBtn = document.getElementById("importDataBtn");
  const importFileInput = document.getElementById("importFileInput");

  /* ================= IMPORT (UNIFIED v2.0) ================= */

  if (importDataBtn && importFileInput) {
    importDataBtn.onclick = () => importFileInput.click();

    importFileInput.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);

          // Restore core data
          categories = data.categories || [];
          meals = data.meals || [];
          plan = data.plan || plan;
          ingredientGroups = data.ingredientGroups || ingredientGroups;
          ingredientGroupOrder = data.ingredientGroupOrder || ingredientGroupOrder;
          groceryPrintList = data.groceryPrintList || {};
          ingredientSelections = data.ingredientSelections || {};

          // Restore attachments
          if (Array.isArray(data.attachments)) {
            const db = await openAttachmentDB();
            for (const a of data.attachments) {
              const bytes = atob(a.data.split(",")[1]);
              const buf = new Uint8Array(bytes.length);
              for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
              await new Promise((res, rej) => {
                const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
                tx.objectStore(ATTACHMENT_STORE).put(
                  new Blob([buf], { type: a.type }),
                  a.id
                );
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
              });
            }
          }

          saveAll();
          saveIngredientGroups();
          saveGroceryPrintList();
          saveIngredientSelections();

          alert("Import complete.");
          location.reload();

        } catch (err) {
          alert("Import failed: " + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  /* ================= EXPORT (UNIFIED v2.0) ================= */

  if (exportDataBtn) {
    exportDataBtn.onclick = async () => {

      const payload = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        categories,
        meals,
        plan,
        ingredientGroups,
        ingredientGroupOrder,
        groceryPrintList,
        ingredientSelections,
        attachments: []
      };

      const db = await openAttachmentDB();
      const blobs = [];

      await new Promise((resolve, reject) => {
        const tx = db.transaction(ATTACHMENT_STORE, "readonly");
        const store = tx.objectStore(ATTACHMENT_STORE);
        const req = store.openCursor();
        req.onsuccess = e => {
          const cur = e.target.result;
          if (!cur) return resolve();
          blobs.push({ id: cur.key, blob: cur.value, type: cur.value.type });
          cur.continue();
        };
        req.onerror = () => reject(req.error);
      });

      for (const b of blobs) {
        const data = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => rej(r.error);
          r.readAsDataURL(b.blob);
        });
        payload.attachments.push({ id: b.id, type: b.type, data });
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meal-planner-complete-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Export complete.");
    };
  }

});
