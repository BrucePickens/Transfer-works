console.log("SCRIPT LOADED");
/* =========================================================
   INDEXEDDB — ATTACHMENTS ONLY (ISOLATED)
========================================================= */

const ATTACHMENT_DB_NAME = "mealPlannerAttachments";
const ATTACHMENT_STORE = "files";
const ATTACHMENT_DB_VERSION = 1;

let attachmentDB = null;

function openAttachmentDB() {
  if (attachmentDB) return Promise.resolve(attachmentDB);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(
      ATTACHMENT_DB_NAME,
      ATTACHMENT_DB_VERSION
    );

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
    const store = tx.objectStore(ATTACHMENT_STORE);
    store.put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAttachmentBlob(id) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readonly");
    const store = tx.objectStore(ATTACHMENT_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteAttachmentBlob(id) {
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    const store = tx.objectStore(ATTACHMENT_STORE);
    store.delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================================================
   DATA + STORAGE
========================================================= */

let categories = JSON.parse(localStorage.getItem("mp_categories")) || [];
let meals = JSON.parse(localStorage.getItem("mp_meals")) || [];
let plan = JSON.parse(localStorage.getItem("mp_plan")) || {
    sun: null, mon: null, tue: null, wed: null,
    thu: null, fri: null, sat: null
};

// =========================================================
// INGREDIENT GROUPS — SAFE INITIALIZATION (NO UI)
// =========================================================

let ingredientGroups = JSON.parse(localStorage.getItem("mp_ingredientGroups"));
let ingredientGroupOrder =
    JSON.parse(localStorage.getItem("mp_ingredientGroupOrder")) ||
    Object.keys(ingredientGroups || {});
let ingredientSelections =
    JSON.parse(localStorage.getItem("mp_ingredientSelections")) || {};

localStorage.setItem(
    "mp_ingredientGroupOrder",
    JSON.stringify(ingredientGroupOrder)
);

if (!ingredientGroups || typeof ingredientGroups !== "object") {
    ingredientGroups = { "Ungrouped": [] };
    localStorage.setItem("mp_ingredientGroups", JSON.stringify(ingredientGroups));
} else if (!ingredientGroups["Ungrouped"]) {
    ingredientGroups["Ungrouped"] = [];
    localStorage.setItem("mp_ingredientGroups", JSON.stringify(ingredientGroups));
}
// =========================================================
// INGREDIENT GROUP CREATION (DATA ONLY — NO UI)
// =========================================================

function createIngredientGroup(groupName) {
    if (!groupName) return;
    if (ingredientGroups[groupName]) return;

    ingredientGroups[groupName] = [];
    ingredientGroupOrder.push(groupName);

    localStorage.setItem(
        "mp_ingredientGroups",
        JSON.stringify(ingredientGroups)
    );
    localStorage.setItem(
        "mp_ingredientGroupOrder",
        JSON.stringify(ingredientGroupOrder)
    );
}



function saveAll() {
    localStorage.setItem("mp_categories", JSON.stringify(categories));
    localStorage.setItem("mp_meals", JSON.stringify(meals));
    localStorage.setItem("mp_plan", JSON.stringify(plan));
}
function saveIngredientSelections() {
    localStorage.setItem(
        "mp_ingredientSelections",
        JSON.stringify(ingredientSelections)
    );
}

function removeMealFromPlan(mealId) {
    Object.keys(plan).forEach(day => {
        if (plan[day] === mealId) {
            plan[day] = null;
        }
    });
}
function deleteIngredientGroup(groupName) {
        if (groupName === "Ungrouped") {
        alert('The "Ungrouped" group cannot be deleted.');
        return;
    }

    if (!ingredientGroups[groupName]) return;

    const items = ingredientGroups[groupName];

    if (!ingredientGroups["Ungrouped"]) {
        ingredientGroups["Ungrouped"] = [];
    }

    items.forEach(item => {
        if (!ingredientGroups["Ungrouped"].includes(item)) {
            ingredientGroups["Ungrouped"].push(item);
        }
    });

    delete ingredientGroups[groupName];

    ingredientGroupOrder = ingredientGroupOrder.filter(g => g !== groupName);

    localStorage.setItem(
        "mp_ingredientGroups",
        JSON.stringify(ingredientGroups)
    );
    localStorage.setItem(
        "mp_ingredientGroupOrder",
        JSON.stringify(ingredientGroupOrder)
    );

    renderIngredientGroups();
    renderGroceryListPreview();
}
function sanitizeIngredientGroups() {
    // Ensure Ungrouped always exists
    if (!ingredientGroups["Ungrouped"]) {
        ingredientGroups["Ungrouped"] = [];
    }

    // Remove non-existent groups from order
    ingredientGroupOrder = ingredientGroupOrder.filter(
        g => ingredientGroups[g]
    );

    // Add any missing groups to order
    Object.keys(ingredientGroups).forEach(g => {
        if (!ingredientGroupOrder.includes(g)) {
            ingredientGroupOrder.push(g);
        }
    });

    localStorage.setItem(
        "mp_ingredientGroups",
        JSON.stringify(ingredientGroups)
    );
    localStorage.setItem(
        "mp_ingredientGroupOrder",
        JSON.stringify(ingredientGroupOrder)
    );
}

function normalizeMeals() {
    let changed = false;

    meals.forEach(m => {
        if (!Array.isArray(m.categoryIds)) {
            m.categoryIds = [];
            changed = true;
        }
        if (!Array.isArray(m.ingredients)) {
            m.ingredients = [];
            changed = true;
        }
        if (typeof m.rating !== "string") {
            m.rating = "";
            changed = true;
        }
    });

    if (changed) {
        saveAll();
    }
}
  
function removeMealReferences(mealId) {
    removeMealFromPlan(mealId);
}
function sanitizePlanner() {
    const validMealIds = new Set(meals.map(m => m.id));

    Object.keys(plan).forEach(day => {
        if (plan[day] && !validMealIds.has(plan[day])) {
            plan[day] = null;
        }
    });

    saveAll();
}

/* =========================================================
   DOM REFERENCES (EXPLICIT — NO IMPLICIT GLOBALS)
========================================================= */

const btnPlanner = document.getElementById("btnPlanner");
const btnMeals = document.getElementById("btnMeals");
const btnCategories = document.getElementById("btnCategories");

const plannerSection = document.getElementById("plannerSection");
const mealsSection = document.getElementById("mealsSection");
const mealSearchInput = document.getElementById("mealSearchInput");
if (mealSearchInput) {
    mealSearchInput.oninput = () => renderMeals();
}

const categoriesSection = document.getElementById("categoriesSection");

const categoryList = document.getElementById("categoryList");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");

const mealList = document.getElementById("mealList");
const addMealBtn = document.getElementById("addMealBtn");
const mealModal = document.getElementById("mealModal");
const mealNameInput = document.getElementById("mealNameInput");

const mealInstructionsInput = document.getElementById("mealInstructionsInput");
const saveMealBtn = document.getElementById("saveMealBtn");
const closeMealModalBtn = document.querySelector(".closeModalBtn");

const plannerOverlay = document.getElementById("plannerOverlay");
const plannerOverlayCancel = document.getElementById("plannerOverlayCancel");
const plannerOverlayTitle = document.getElementById("plannerOverlayTitle");
const plannerCategoryList = document.getElementById("plannerCategoryList");
const mealIngredientsInput = document.getElementById("mealIngredientsInput");
const groceryListPreview = document.getElementById("groceryListPreview");
const printGroceryBtn = document.getElementById("printGroceryBtn");
console.log("groceryListPreview:", groceryListPreview);
const newIngredientGroupInput = document.getElementById("newIngredientGroupInput");
const addIngredientGroupBtn = document.getElementById("addIngredientGroupBtn");
const newIngredientInput = document.getElementById("newIngredientInput");
const addIngredientBtn = document.getElementById("addIngredientBtn");


/* =========================================================
   NAVIGATION / TABS
========================================================= */

function showSection(section) {
    [plannerSection, mealsSection, categoriesSection].forEach(s =>
        s.classList.add("hidden")
    );

    [btnPlanner, btnMeals, btnCategories].forEach(b =>
        b.classList.remove("active")
    );

    section.classList.remove("hidden");

    if (section === plannerSection) btnPlanner.classList.add("active");
    if (section === plannerSection) renderPlanner();
    if (section === mealsSection) renderGroceryListPreview();
    if (section === mealsSection) btnMeals.classList.add("active");
    if (section === categoriesSection) btnCategories.classList.add("active");
}

btnPlanner.onclick = () => showSection(plannerSection);
btnMeals.onclick = () => showSection(mealsSection);
btnCategories.onclick = () => showSection(categoriesSection);
// =========================================================
// INGREDIENT GROUP UI — CREATE ONLY
// =========================================================

if (addIngredientGroupBtn) {
    addIngredientGroupBtn.onclick = () => {
        const name = newIngredientGroupInput.value.trim();
        if (!name) return;

        createIngredientGroup(name);
        newIngredientGroupInput.value = "";

        renderIngredientGroups();   // ← THIS LINE
        renderGroceryListPreview(); // ← AND THIS LINE
    };
}
if (addIngredientBtn) {
    addIngredientBtn.onclick = () => {
        const item = newIngredientInput.value.trim();
        if (!item) return;

        const targetSelect = document.getElementById("ingredientTargetGroup");
        const group = targetSelect?.value || "Ungrouped";

        if (!ingredientGroups[group]) {
            ingredientGroups[group] = [];
        }

        if (!ingredientGroups[group].includes(item)) {
            ingredientGroups[group].push(item);
        }

        localStorage.setItem(
            "mp_ingredientGroups",
            JSON.stringify(ingredientGroups)
        );

        newIngredientInput.value = "";

        renderIngredientGroups();
        renderGroceryListPreview();
    };
}

// =========================================================
// INGREDIENT GROUP DISPLAY (READ-ONLY)
// =========================================================

const ingredientGroupDisplay = document.getElementById("ingredientGroupDisplay");
console.log("ingredientGroupDisplay:", ingredientGroupDisplay);

function renderIngredientGroups() {
    if (!ingredientGroupDisplay) return;

    ingredientGroupDisplay.innerHTML = "";
    const targetSelect = document.getElementById("ingredientTargetGroup");
if (targetSelect) {
    targetSelect.innerHTML = "";

   ingredientGroupOrder.forEach(groupName => {

        if (groupName === "Ungrouped") return;

        const option = document.createElement("option");
        option.value = groupName;
        option.textContent = groupName;
        targetSelect.appendChild(option);
    });
}


  ingredientGroupOrder.forEach(groupName => {

        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "12px";
wrapper.style.paddingBottom = "8px";
wrapper.style.borderBottom = "1px solid #ddd";


        const title = document.createElement("strong");
title.className = "ingredient-group-header";

        title.style.display = "block";
title.style.marginBottom = "6px";

        title.textContent = groupName;
const delBtn = document.createElement("button");
delBtn.textContent = "✕";
delBtn.style.marginLeft = "8px";

delBtn.onclick = () => {
    if (!confirm(`Delete group "${groupName}"? Items will move to Ungrouped.`)) return;
    deleteIngredientGroup(groupName);
};

title.appendChild(delBtn);

        wrapper.appendChild(title);
        const upBtn = document.createElement("button");
upBtn.textContent = "↑";
upBtn.style.marginLeft = "8px";

const downBtn = document.createElement("button");
downBtn.textContent = "↓";
downBtn.style.marginLeft = "4px";

upBtn.onclick = () => moveIngredientGroup(groupName, -1);
downBtn.onclick = () => moveIngredientGroup(groupName, 1);

title.appendChild(upBtn);
title.appendChild(downBtn);

let isCollapsed = false;

title.onclick = () => {
    isCollapsed = !isCollapsed;
    list.style.display = isCollapsed ? "none" : "block";
};
function moveIngredientGroup(groupName, direction) {
    const idx = ingredientGroupOrder.indexOf(groupName);
    if (idx === -1) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ingredientGroupOrder.length) return;

    const temp = ingredientGroupOrder[idx];
    ingredientGroupOrder[idx] = ingredientGroupOrder[newIdx];
    ingredientGroupOrder[newIdx] = temp;

    localStorage.setItem(
        "mp_ingredientGroupOrder",
        JSON.stringify(ingredientGroupOrder)
    );

    renderIngredientGroups();
}


        const list = document.createElement("ul");

ingredientGroups[groupName].forEach(item => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
checkbox.type = "checkbox";
checkbox.checked = !!ingredientSelections[item];
checkbox.style.marginRight = "6px";

checkbox.onchange = () => {
    ingredientSelections[item] = checkbox.checked;
    saveIngredientSelections();
    renderGroceryListPreview();
};


const label = document.createElement("span");
label.textContent = item;
const delItemBtn = document.createElement("button");
delItemBtn.textContent = "✕";
delItemBtn.style.marginLeft = "6px";

delItemBtn.onclick = () => {
    if (!confirm(`Delete ingredient "${item}"?`)) return;

    // remove from group
    ingredientGroups[groupName] =
        ingredientGroups[groupName].filter(i => i !== item);

    // cleanup checkbox state
    delete ingredientSelections[item];

    localStorage.setItem(
        "mp_ingredientGroups",
        JSON.stringify(ingredientGroups)
    );
    saveIngredientSelections();

    renderIngredientGroups();
    renderGroceryListPreview();
};

const rowWrap = document.createElement("span");
rowWrap.style.display = "inline-flex";
rowWrap.style.alignItems = "center";
rowWrap.style.gap = "6px";

rowWrap.appendChild(checkbox);
rowWrap.appendChild(label);

li.appendChild(rowWrap);

li.appendChild(delItemBtn);


    if (groupName === "Ungrouped") {
        const btn = document.createElement("button");
        btn.textContent = "→";
        btn.style.marginLeft = "8px";

        btn.onclick = () => {
            const targetSelect = document.getElementById("ingredientTargetGroup");

            if (!targetSelect || targetSelect.options.length === 0) return;

            const targetGroup = targetSelect.value;
            if (!targetGroup) return;

            ingredientGroups["Ungrouped"] =
                ingredientGroups["Ungrouped"].filter(i => i !== item);

            if (!ingredientGroups[targetGroup].includes(item)) {
                ingredientGroups[targetGroup].push(item);
            }

            localStorage.setItem(
                "mp_ingredientGroups",
                JSON.stringify(ingredientGroups)
            );

            renderIngredientGroups();
            renderGroceryListPreview();

        };

        li.appendChild(btn);
    } else {
        const backBtn = document.createElement("button");
        backBtn.textContent = "←";
        backBtn.style.marginLeft = "8px";

        backBtn.onclick = () => {
            ingredientGroups[groupName] =
                ingredientGroups[groupName].filter(i => i !== item);

            if (!ingredientGroups["Ungrouped"].includes(item)) {
                ingredientGroups["Ungrouped"].push(item);
            }

            localStorage.setItem(
                "mp_ingredientGroups",
                JSON.stringify(ingredientGroups)
            );

            renderIngredientGroups();
            renderGroceryListPreview();

        };

        li.appendChild(backBtn);
    }

    list.appendChild(li);
});



        wrapper.appendChild(list);
        ingredientGroupDisplay.appendChild(wrapper);
    });
}

/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories() {
    categoryList.innerHTML = "";

    categories.forEach(cat => {
        const li = document.createElement("li");
const text = document.createElement("span");
text.textContent = cat;

const delBtn = document.createElement("button");
delBtn.textContent = "✕";
delBtn.style.marginLeft = "8px";

delBtn.onclick = () => deleteCategory(cat);

li.appendChild(text);
li.appendChild(delBtn);
const list = document.createElement("ul");
list.style.marginTop = "6px";
list.style.display = "none";

meals
    .filter(m => Array.isArray(m.categoryIds) && m.categoryIds.includes(cat))
    .forEach(m => {
        const mi = document.createElement("li");
        mi.textContent = m.name;
        list.appendChild(mi);
    });

let open = false;
text.style.cursor = "pointer";
text.onclick = () => {
    open = !open;
    list.style.display = open ? "block" : "none";
};

li.appendChild(list);

        categoryList.appendChild(li);
    });
}

function deleteCategory(catName) {
    if (!confirm(`Delete category "${catName}"?`)) return;

    // Remove category from category list
    categories = categories.filter(c => c !== catName);

    // Remove category references from meals
    meals.forEach(meal => {
        if (Array.isArray(meal.categoryIds)) {
            meal.categoryIds = meal.categoryIds.filter(c => c !== catName);
        }
    });

    saveAll();
    renderCategories();
    renderMeals();
}

addCategoryBtn.onclick = () => {
    const val = newCategoryInput.value.trim();
    if (!val || categories.includes(val)) return;

    categories.push(val);
    newCategoryInput.value = "";
    saveAll();
    renderCategories();
};
function renderMealCategoryCheckboxes(selectedIds = []) {
    const container = document.getElementById("mealCategoryCheckboxes");
    if (!container) return;

    container.innerHTML = "";

    categories.forEach(cat => {
        if (!cat || !cat.trim()) return;

        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.marginBottom = "6px";
label.className = "meal-cat-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = cat;
        checkbox.checked = selectedIds.includes(cat);

        label.appendChild(checkbox);
        const text = document.createElement("span");
text.textContent = cat;
label.appendChild(text);

        container.appendChild(label);
    });
}


/* =========================================================
   MEALS
========================================================= */
function renderMeals() {
   
mealList.innerHTML = "";

const q = (mealSearchInput?.value || "").toLowerCase();

// Group meals by category (read-only)
const grouped = {};
categories.forEach(c => grouped[c] = []);
grouped["Uncategorized"] = [];

meals
    .filter(m => {
        if (!q) return true;
        const nameMatch = m.name?.toLowerCase().includes(q);
        const ingMatch = (m.ingredients || []).some(i =>
            i.toLowerCase().includes(q)
        );
        return nameMatch || ingMatch;
    })
    .forEach(m => {
        if (Array.isArray(m.categoryIds) && m.categoryIds.length) {
            m.categoryIds.forEach(c => {
                if (grouped[c]) grouped[c].push(m);
            });
        } else {
            grouped["Uncategorized"].push(m);
        }
    });

// Render grouped, collapsible
Object.keys(grouped).sort().forEach(cat => {

    if (grouped[cat].length === 0) return;

    const header = document.createElement("div");
    header.style.fontWeight = "bold";
    header.style.cursor = "pointer";
    header.style.marginTop = "12px";
    header.textContent = cat;

    const list = document.createElement("div");
    list.style.display = "none";
    list.style.marginLeft = "12px";

    let open = false;
    header.onclick = () => {
        open = !open;
        list.style.display = open ? "block" : "none";
    };

    grouped[cat].forEach(m => {
        const mealId = m.id;

        const row = document.createElement("div");

        const title = document.createElement("span");
        title.textContent = m.name;
        title.style.cursor = "pointer";
        title.onclick = () => openEditMeal(mealId);
      const viewBtn = document.createElement("button");
viewBtn.textContent = "View Recipe";
viewBtn.style.marginLeft = "8px";
viewBtn.onclick = (e) => {
    e.stopPropagation();
    openRecipeView(mealId);
};

        viewBtn.textContent = "View Recipe";
        viewBtn.style.marginLeft = "8px";
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            openRecipeView(mealId);
        };


        const dupBtn = document.createElement("button");
        dupBtn.textContent = "Duplicate";
        dupBtn.style.marginLeft = "10px";
        dupBtn.onclick = (e) => {
            e.stopPropagation();
            duplicateMeal(mealId);
        };

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.style.marginLeft = "6px";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (!confirm("Delete this meal?")) return;
            meals = meals.filter(x => x.id !== mealId);
            removeMealFromPlan(mealId);
            saveAll();
            renderMeals();
            renderPlanner();
            renderGroceryListPreview();
        };

        row.appendChild(title);
        row.appendChild(viewBtn);

        row.appendChild(dupBtn);
        row.appendChild(delBtn);
        list.appendChild(row);
    });

    mealList.appendChild(header);
    mealList.appendChild(list);
});

}

function duplicateMeal(mealId) {
    const original = meals.find(m => m.id === mealId);
    if (!original) return;

    const copy = {
        id: crypto.randomUUID(),
        name: original.name + " (copy)",
        ingredients: Array.isArray(original.ingredients)
            ? [...original.ingredients]
            : [],
        categoryIds: Array.isArray(original.categoryIds)
            ? [...original.categoryIds]
            : [],
        instructions: original.instructions || ""
    };

    meals.push(copy);
        // delete-prep: ensure planner safety hooks exist
    saveAll();
    renderMeals();
    renderGroceryListPreview();
}





addMealBtn.onclick = () => {
    editingMealId = null;
    renderMealCategoryCheckboxes([]);
    mealModal.classList.remove("hidden");

};

function openEditMeal(mealId) {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    editingMealId = mealId;

    mealNameInput.value = meal.name;
    mealInstructionsInput.value = meal.instructions || "";
    
mealIngredientsInput.value = (meal.ingredients || []).join("\n");
    renderMealCategoryCheckboxes(meal.categoryIds || []);


    // Select first category for now (multi-edit comes later)
    
document
  .querySelectorAll('input[name="mealRating"]')
  .forEach(r => r.checked = r.value === (meal.rating || ""));

    mealModal.classList.remove("hidden");
}

saveMealBtn.onclick = () => {
    const name = mealNameInput.value.trim();
    const checkedCategories = Array.from(
    document.querySelectorAll("#mealCategoryCheckboxes input:checked")
).map(cb => cb.value);

   
    const instructions = mealInstructionsInput.value.trim();
    
    const rating = document.querySelector('input[name="mealRating"]:checked')?.value || "";

const ingredients = mealIngredientsInput.value
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);

    if (!name) return;
    // Ensure ingredients exist in Ungrouped ingredient group
ingredients.forEach(ing => {
    if (!ingredientGroups["Ungrouped"].includes(ing)) {
        ingredientGroups["Ungrouped"].push(ing);
    }
});

localStorage.setItem(
    "mp_ingredientGroups",
    JSON.stringify(ingredientGroups)
);


  if (editingMealId) {
    const meal = meals.find(m => m.id === editingMealId);
    if (!meal) return;

    meal.name = name;
    meal.attachments = meal.attachments || [];
    meal.instructions = instructions;
    meal.ingredients = ingredients;
    meal.categoryIds = checkedCategories;
    meal.rating = rating;
meal.rating = meal.rating || "";
meals.forEach(m => {
    if (!("rating" in m)) m.rating = "";
});
saveAll();

    editingMealId = null;
} else {
    meals.push({
        id: crypto.randomUUID(),
        name,
        instructions,
        ingredients,
        categoryIds: checkedCategories,
        rating,
        attachments: []
    });

}
    mealNameInput.value = "";
    mealInstructionsInput.value = "";
    mealModal.classList.add("hidden");

    saveAll();
    renderMeals();
    renderPlanner();
    renderGroceryListPreview();

};


closeMealModalBtn.onclick = () => {
    editingMealId = null;
    mealIngredientsInput.value = "";
    mealModal.classList.add("hidden");
};



/* =========================================================
   PLANNER DISPLAY
========================================================= */

function getPlannerMealIds() {
    const ids = new Set();

    Object.values(plan).forEach(mealId => {
        if (mealId) ids.add(mealId);
    });

    return Array.from(ids);
}

function renderPlanner() {
  document.querySelectorAll(".day-card").forEach(card => {
    const day = card.dataset.day;
    const span = card.querySelector("span");
    const actions = card.querySelector(".planner-actions");

    const mealId = plan[day];
    const meal = meals.find(m => m.id === mealId);

    span.textContent = meal
      ? meal.rating
        ? `${meal.name} [${meal.rating}]`
        : meal.name
      : "";

    actions.innerHTML = "";

    if (mealId) {
      const btn = document.createElement("button");
      btn.textContent = "View Recipe";

      btn.onclick = e => {
        e.stopPropagation();
        openRecipeView(mealId);
      };

      actions.appendChild(btn);
    }
  });

  bindPlannerDayClicks();
}

function bindPlannerDayClicks() {
  document.querySelectorAll(".day-card").forEach(card => {
    card.onclick = () => {
      selectedPlannerDay = card.dataset.day;
      openPlannerCategoryOverlay();
    };
  });
}


/* =========================================================
   LAYER 2 — PLANNER OVERLAY (FINAL, SAFE)
========================================================= */

let selectedPlannerDay = null;

let editingRecipeTextMeal = null;


function openPlannerCategoryOverlay() {
    plannerCategoryList.innerHTML = "";
    plannerOverlayTitle.textContent = "Select Category";

    categories.forEach(cat => {
        const div = document.createElement("div");
        div.textContent = cat;
        div.onclick = () => openPlannerMealOverlay(cat);
        plannerCategoryList.appendChild(div);
    });

    plannerOverlay.classList.remove("hidden");
}

function openPlannerMealOverlay(category) {
    plannerCategoryList.innerHTML = "";
    plannerOverlayTitle.textContent = "Select Meal";

    const filteredMeals = meals.filter(m =>
    m.categoryIds && m.categoryIds.includes(category)
);


    filteredMeals.forEach(meal => {
        const div = document.createElement("div");
        div.textContent = meal.rating
    ? `${meal.name} [${meal.rating}]`
    : meal.name;

        div.onclick = () => {
            plan[selectedPlannerDay] = meal.id;
            saveAll();
            renderPlanner();
          renderGroceryListPreview();

            closePlannerOverlay();
        };
        plannerCategoryList.appendChild(div);
    });
}

function closePlannerOverlay() {
    plannerOverlay.classList.add("hidden");
    plannerCategoryList.innerHTML = "";
    plannerOverlayTitle.textContent = "Select Category";
    selectedPlannerDay = null;
}

plannerOverlayCancel.addEventListener("click", (e) => {
    e.stopPropagation();
    closePlannerOverlay();
});

/* =========================================================
   CLEAR WEEK
========================================================= */

const clearWeekBtn = document.getElementById("clearWeekBtn");

clearWeekBtn.onclick = () => {
    plan = {
        sun: null, mon: null, tue: null, wed: null,
        thu: null, fri: null, sat: null
    };
    saveAll();
    renderPlanner();
renderGroceryListPreview();

};
// =========================================================
// GROCERY LIST PREVIEW (READ-ONLY)
// =========================================================

function renderGroceryListPreview() {
    if (!groceryListPreview) return;

    groceryListPreview.innerHTML = "";

    // Build normalized ingredient -> group lookup
    const ingredientToGroup = {};
    Object.keys(ingredientGroups).forEach(groupName => {
        ingredientGroups[groupName].forEach(raw => {
            const key = raw.trim().toLowerCase();
            ingredientToGroup[key] = groupName;
        });
    });

    // Count normalized ingredients from planner meals
    const groupedCounts = {};
    

    // Include manually selected ingredients from Ingredient Groups
Object.keys(ingredientSelections).forEach(item => {
    if (!ingredientSelections[item]) return;

    const key = item.trim().toLowerCase();
    const group = ingredientToGroup[key] || "Ungrouped";

    if (!groupedCounts[group]) groupedCounts[group] = {};
    groupedCounts[group][key] = (groupedCounts[group][key] || 0) + 1;
});

    const plannerMealIds = getPlannerMealIds();
    const plannerMeals = meals.filter(m => plannerMealIds.includes(m.id));
   

    plannerMeals.forEach(meal => {
        if (!Array.isArray(meal.ingredients)) return;

        meal.ingredients.forEach(raw => {
            const ing = raw.trim().toLowerCase();
            if (!ing) return;

            const group = ingredientToGroup[ing] || "Ungrouped";
            if (!groupedCounts[group]) groupedCounts[group] = {};
            groupedCounts[group][ing] = (groupedCounts[group][ing] || 0) + 1;
        });
    });

    // Render grocery list in ingredientGroupOrder
    ingredientGroupOrder.forEach(groupName => {
        if (!groupedCounts[groupName]) return;
const groupWrapper = document.createElement("div");

const header = document.createElement("div");
header.className = "ingredient-group-header";
header.textContent = groupName;
header.style.fontWeight = "bold";
header.style.marginTop = "12px";
header.style.cursor = "pointer";

const groupItems = document.createElement("ul");
groupItems.style.listStyle = "none";
groupItems.style.paddingLeft = "16px";

groupWrapper.appendChild(header);
groupWrapper.appendChild(groupItems);
groceryListPreview.appendChild(groupWrapper);


        Object.keys(groupedCounts[groupName]).forEach(item => {
            const count = groupedCounts[groupName][item];
 const li = document.createElement("li");
li.textContent = `• ${item} × ${count}`;
li.style.cursor = "pointer";
li.dataset.item = item;

// toggle selection
li.onclick = () => {
  li.classList.toggle("grocery-selected");
};

groupItems.appendChild(li);

        });

        groceryListPreview.appendChild(groupItems);

        let isCollapsed = false;
        header.onclick = () => {
            isCollapsed = !isCollapsed;
            groupItems.style.display = isCollapsed ? "none" : "block";
        };
    });
}

function openRecipeView(mealId) {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    document.getElementById("recipeMealTitle").textContent = meal.name;

    renderRecipeIngredients(meal);
    renderRecipeNotes(meal);
    renderRecipeText(meal);
    renderRecipeAttachments(meal);

    document
        .getElementById("recipeOverlay")
        .classList.remove("hidden");
}
function renderRecipeIngredients(meal) {
    const list = document.getElementById("recipeIngredientList");
    if (!list) return;

    list.innerHTML = "";

    if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No ingredients listed.";
        list.appendChild(li);
        return;
    }

    meal.ingredients.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
    });
}

function renderRecipeNotes(meal) {
    const box = document.getElementById("recipeNotes");
    if (!box) return;

    box.textContent =
        meal.instructions && meal.instructions.trim()
            ? meal.instructions
            : "No notes added.";
}
function renderRecipeText(meal) {
    const box = document.getElementById("recipeTextDisplay");
    if (!box) return;

    box.textContent =
        meal.recipeText && meal.recipeText.trim()
            ? meal.recipeText
            : "No recipe text added.";
}

function renderRecipeAttachments(meal) {
  const box = document.getElementById("recipeAttachments");
  if (!box) return;

  box.innerHTML = "";

  if (!Array.isArray(meal.attachments) || meal.attachments.length === 0) {
    box.textContent = "No attachments.";
    return;
  }

  meal.attachments.forEach((att, idx) => {
 const row = document.createElement("div");
row.className = "recipe-attachment-row";

    row.style.marginBottom = "8px";

    const openBtn = document.createElement("button");
    openBtn.textContent = `Open attachment — ${att.name || ""}`;

openBtn.onclick = () => {

  // MUST open synchronously (browser popup rules)
  const win = window.open("", "_blank");

  if (!win) {
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  getAttachmentBlob(att.id).then(blob => {

    // ===== STEP A: Missing blob guard =====
if (!blob) {

  // === UI notice in popup ===
  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attachment Missing</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #f6f6f6;
          padding: 24px;
        }
        .card {
          max-width: 520px;
          margin: 40px auto;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 20px;
        }
        h2 { margin-top: 0; }
        .muted { color: #666; }
        button {
          margin-top: 12px;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid #ccc;
          background: #eee;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Attachment not found</h2>
        <p class="muted">
          This recipe references a file that no longer exists.
        </p>
        <p>
          This usually happens after an old import.
        </p>
        <button id="removeBtn">
          Remove broken attachment
        </button>
      </div>

      <script>
        document.getElementById("removeBtn").onclick = () => {
          window.opener.postMessage(
            {
              type: "REMOVE_BROKEN_ATTACHMENT",
              mealId: "${meal.id}",
              attachmentIndex: ${idx}
            },
            "*"
          );
          window.close();
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
  return;
}


// ===== Normal attachment load (DIRECT) =====
const url = URL.createObjectURL(blob);

// Navigate directly to the PDF
win.location.href = url;

// Cleanup after load
win.onload = () => {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

  });
};


    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.style.marginLeft = "6px";

    delBtn.onclick = () => {
      if (!confirm("Delete attachment?")) return;
      meal.attachments.splice(idx, 1);
      saveAll();
      renderRecipeAttachments(meal);
    };

    row.appendChild(openBtn);
    row.appendChild(delBtn);
    box.appendChild(row);
  });
}



window.addEventListener("load", () => {
   // ================= DATA EXPORT / IMPORT =================

const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
// ===== IMPORT MAIN DATA + ATTACHMENTS =====
if (importDataBtn && importFileInput) {
  importDataBtn.onclick = () => {
    importFileInput.click();
  };

  importFileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    // ATTACHMENTS FILE
    if (file.name.startsWith("meal-planner-attachments")) {
      const reader = new FileReader();
      reader.onload = async () => {
        const parsed = JSON.parse(reader.result);
        const attachments = parsed.attachments || [];

        const db = await openAttachmentDB();
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");

      attachments.forEach(a => {
  const byteString = atob(a.data.split(",")[1]);
  const mime = a.type;
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: mime });
  store.put(blob, a.id);
});


        tx.oncomplete = () => alert("Attachment import complete.");
      };
      reader.readAsText(file);
      return;
    }

    // MAIN DATA FILE
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);

      categories = data.categories || [];
      meals = data.meals || [];
      plan = data.plan || plan;
      ingredientGroups = data.ingredientGroups || ingredientGroups;
      ingredientGroupOrder =
        data.ingredientGroupOrder || ingredientGroupOrder;

      saveAll();
      renderCategories();
      renderMeals();
      renderPlanner();
      renderIngredientGroups();
      renderGroceryListPreview();

      alert("Import complete.");
    };
    reader.readAsText(file);
  };
}


if (exportDataBtn) {
  exportDataBtn.onclick = async () => {

    // ===== EXPORT MAIN DATA =====
    const payload = {
      categories,
      meals,
      plan,
      ingredientGroups,
      ingredientGroupOrder
    };

    const dataBlob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: "application/json" }
    );

    const dataUrl = URL.createObjectURL(dataBlob);
    const dataLink = document.createElement("a");
    dataLink.href = dataUrl;
    dataLink.download = "meal-planner-data.json";
    dataLink.click();
    URL.revokeObjectURL(dataUrl);
// ===== EXPORT ATTACHMENTS =====
const db = await openAttachmentDB();
const tx = db.transaction("files", "readonly");
const store = tx.objectStore("files");

const collected = [];

store.openCursor().onsuccess = e => {
  const cursor = e.target.result;

  if (!cursor) {
    const attachBlob = new Blob(
      [JSON.stringify({ attachments: collected }, null, 2)],
      { type: "application/json" }
    );

    const attachUrl = URL.createObjectURL(attachBlob);
    const attachLink = document.createElement("a");
    attachLink.href = attachUrl;
    attachLink.download = "meal-planner-attachments.json";
    attachLink.click();
    URL.revokeObjectURL(attachUrl);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    collected.push({
      id: cursor.key,
      type: cursor.value.type,
      data: reader.result
    });
    cursor.continue();
  };
  reader.readAsDataURL(cursor.value);
};
  };
}

    // ===== Recipe Attachment Upload (LOCKED) =====
const addAttachmentBtn =
  document.getElementById("addRecipeAttachmentBtn");
const recipeAttachmentFileInput =
  document.getElementById("recipeAttachmentFileInput");

if (addAttachmentBtn && recipeAttachmentFileInput) {
  addAttachmentBtn.onclick = () => {
    recipeAttachmentFileInput.click();
  };

  recipeAttachmentFileInput.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const title =
      document.getElementById("recipeMealTitle").textContent;
    const meal = meals.find(m => m.name === title);
    if (!meal) return;

    const attachmentId = crypto.randomUUID();

meal.attachments = meal.attachments || [];
meal.attachments.push({
  id: attachmentId,
  name: file.name,
  type: file.type
});

await storeAttachmentBlob(attachmentId, file);

saveAll();
renderRecipeAttachments(meal);

recipeAttachmentFileInput.value = "";

    saveAll();
    renderRecipeAttachments(meal);

    recipeAttachmentFileInput.value = "";
  };
}

    const recipeTextEditor = document.getElementById("recipeTextEditor");
const recipeTextInput = document.getElementById("recipeTextInput");
const closeRecipeTextEditorBtn =
    document.getElementById("closeRecipeTextEditorBtn");
const saveRecipeTextBtn =
    document.getElementById("saveRecipeTextBtn");
const deleteRecipeTextBtn =
    document.getElementById("deleteRecipeTextBtn");

const editRecipeTextBtn =
  document.getElementById("editRecipeTextBtn");

let isEditingRecipeText = false;

if (editRecipeTextBtn) {
  editRecipeTextBtn.onclick = () => {
    if (isEditingRecipeText) return;

    const title =
      document.getElementById("recipeMealTitle").textContent;
    const meal = meals.find(m => m.name === title);
    if (!meal) return;

    isEditingRecipeText = true;

    const box = document.getElementById("recipeTextDisplay");
    if (!box) return;

    // Build textarea
    const textarea = document.createElement("textarea");
    textarea.style.width = "100%";
    textarea.style.minHeight = "300px";
    textarea.style.resize = "vertical";
    textarea.value = meal.recipeText || "";

    // Build buttons
    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "8px";
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";

    // Swap view → editor
    box.innerHTML = "";
    box.appendChild(textarea);
    box.appendChild(btnRow);
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);

    saveBtn.onclick = () => {
      meal.recipeText = textarea.value.trim();
      saveAll();
      renderRecipeText(meal);
      isEditingRecipeText = false;
    };

    cancelBtn.onclick = () => {
      renderRecipeText(meal);
      isEditingRecipeText = false;
    };
  };
}


if (closeRecipeTextEditorBtn) {
    closeRecipeTextEditorBtn.onclick = () => {
        recipeTextEditor.classList.add("hidden");
        editingRecipeTextMeal = null;
    };
}

if (saveRecipeTextBtn) {
    saveRecipeTextBtn.onclick = () => {
        if (!editingRecipeTextMeal) return;

        editingRecipeTextMeal.recipeText = recipeTextInput.value;
        saveAll();
        renderRecipeText(editingRecipeTextMeal);

        recipeTextEditor.classList.add("hidden");
        editingRecipeTextMeal = null;
    };
}

if (deleteRecipeTextBtn) {
    deleteRecipeTextBtn.onclick = () => {
        if (!editingRecipeTextMeal) return;
        if (!confirm("Delete recipe text?")) return;

        editingRecipeTextMeal.recipeText = "";
        saveAll();
        renderRecipeText(editingRecipeTextMeal);

        recipeTextEditor.classList.add("hidden");
        editingRecipeTextMeal = null;
    };
}

    const printRecipeBtn = document.getElementById("printRecipeBtn");
if (printRecipeBtn) {
    printRecipeBtn.onclick = () => {
        const overlay = document.getElementById("recipeOverlay");
        if (!overlay) return;

        const original = document.body.innerHTML;
        document.body.innerHTML = overlay.innerHTML;
        window.print();
        document.body.innerHTML = original;
        window.location.reload();
    };
}

 const editRecipeIngredientsBtn =
  document.getElementById("editRecipeIngredientsBtn");

let isEditingIngredients = false;

if (editRecipeIngredientsBtn) {
  editRecipeIngredientsBtn.onclick = () => {
    if (isEditingIngredients) return;

    const title =
      document.getElementById("recipeMealTitle").textContent;
    const meal = meals.find(m => m.name === title);
    if (!meal) return;

    isEditingIngredients = true;

    const list = document.getElementById("recipeIngredientList");
    if (!list) return;

    // Build textarea
    const textarea = document.createElement("textarea");
    textarea.style.width = "100%";
    textarea.style.height = "200px";
    textarea.value = (meal.ingredients || []).join("\n");

    // Build buttons
    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "8px";
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";

    // Clear list and insert editor
    list.innerHTML = "";
    list.appendChild(textarea);
    list.appendChild(btnRow);
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);

    saveBtn.onclick = () => {
      meal.ingredients = textarea.value
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      saveAll();
      renderRecipeIngredients(meal);
      renderGroceryListPreview();
      isEditingIngredients = false;
    };

    cancelBtn.onclick = () => {
      renderRecipeIngredients(meal);
      isEditingIngredients = false;
    };
  };
}

    if (mealSearchInput) {
    mealSearchInput.value = "";
    mealSearchInput.oninput = () => renderMeals();
}
const closeRecipeBtn = document.getElementById("closeRecipeBtn");
if (closeRecipeBtn) {
    closeRecipeBtn.onclick = () => {
        document
            .getElementById("recipeOverlay")
            .classList.add("hidden");
    };
}

const editRecipeNotesBtn =
  document.getElementById("editRecipeNotesBtn");

let isEditingNotes = false;

if (editRecipeNotesBtn) {
  editRecipeNotesBtn.onclick = () => {
    if (isEditingNotes) return;

    const title =
      document.getElementById("recipeMealTitle").textContent;
    const meal = meals.find(m => m.name === title);
    if (!meal) return;

    isEditingNotes = true;

    const box = document.getElementById("recipeNotes");
    if (!box) return;

    // Build textarea
    const textarea = document.createElement("textarea");
    textarea.style.width = "100%";
    textarea.style.minHeight = "200px";
    textarea.value = meal.instructions || "";

    // Build buttons
    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "8px";
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";

    // Swap view → editor
    box.innerHTML = "";
    box.appendChild(textarea);
    box.appendChild(btnRow);
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);

    saveBtn.onclick = () => {
      meal.instructions = textarea.value.trim();
      saveAll();
      renderRecipeNotes(meal);
      isEditingNotes = false;
    };

    cancelBtn.onclick = () => {
      renderRecipeNotes(meal);
      isEditingNotes = false;
    };
  };
}

    if (printGroceryBtn) {
    printGroceryBtn.onclick = () => window.print();
} 

const printSelectedGroceryBtn =
  document.getElementById("printSelectedGroceryBtn");

if (printSelectedGroceryBtn) {
  printSelectedGroceryBtn.onclick = () => {
    const selected =
      document.querySelectorAll(
        "#groceryListPreview .grocery-selected"
      );

    if (selected.length === 0) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items = Array.from(selected)
      .map(li => `<li>${li.textContent}</li>`)
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>Selected Grocery Items</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 24px;
          }
          li {
            margin-bottom: 6px;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h2>Grocery List</h2>
        <ul>${items}</ul>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };
}

// ================= ATTACHMENTS EXPAND / COLLAPSE =================

const toggleRecipeExpandBtn =
  document.getElementById("toggleRecipeExpandBtn");
const recipeOverlay =
  document.getElementById("recipeOverlay");

if (toggleRecipeExpandBtn && recipeOverlay) {
  toggleRecipeExpandBtn.onclick = () => {
    recipeOverlay.classList.toggle("is-expanded");

    toggleRecipeExpandBtn.textContent =
      recipeOverlay.classList.contains("is-expanded")
        ? "Collapse"
        : "Expand";
  };
}

renderCategories();
    renderMeals();
    sanitizePlanner();
    sanitizeIngredientGroups();
    renderIngredientGroups();
    normalizeMeals();
    renderPlanner();
    renderIngredientGroups();
    renderGroceryListPreview();
     showSection(plannerSection);
   /* =========================================================
   CLEANUP BROKEN ATTACHMENTS — BUTTON HANDLER
========================================================= */

const cleanupBrokenAttachmentsBtn =
  document.getElementById("cleanupBrokenAttachmentsBtn");

if (cleanupBrokenAttachmentsBtn) {
  cleanupBrokenAttachmentsBtn.onclick = async () => {
    const title =
      document.getElementById("recipeMealTitle").textContent;

    const meal = meals.find(m => m.name === title);
    if (!meal || !Array.isArray(meal.attachments)) {
      alert("No attachments to clean.");
      return;
    }

    let removed = 0;
    const kept = [];

    for (const att of meal.attachments) {
      if (!att || !att.id) continue;

      const blob = await getAttachmentBlob(att.id);
      if (blob) {
        kept.push(att);
      } else {
        removed++;
      }
    }

    if (removed === 0) {
      alert("No broken attachments found.");
      return;
    }

    meal.attachments = kept;
    saveAll();
    renderRecipeAttachments(meal);

    alert(`Removed ${removed} broken attachment(s).`);
  };
}
  
    /* =========================================================
   ONE-TIME BROKEN ATTACHMENT CLEANUP (AUTO)
========================================================= */

(async function removeBrokenAttachmentsOnce() {
  const done = localStorage.getItem("mp_brokenAttachmentCleanupDone");
  if (done) return;

  let removedCount = 0;

  for (const meal of meals) {
    if (!Array.isArray(meal.attachments)) continue;

    const kept = [];

    for (const att of meal.attachments) {
      if (!att || !att.id) continue;

      const blob = await getAttachmentBlob(att.id);
      if (blob) {
        kept.push(att);
      } else {
        removedCount++;
      }
    }

    meal.attachments = kept;
  }

  if (removedCount > 0) {
    saveAll();
    console.log(
      `Removed ${removedCount} broken attachment reference(s)`
    );
  }

  localStorage.setItem(
    "mp_brokenAttachmentCleanupDone",
    "true"
  );
})();
 
/* =========================================================
   ONE-TIME LEGACY MEAL MIGRATION (SAFE)
========================================================= */

(function migrateLegacyMealsOnce() {
    const alreadyMigrated =
        localStorage.getItem("mp_legacyMigrationDone");

    if (alreadyMigrated) return;

    const legacyRaw =
        localStorage.getItem("mealPlanner_meals");

    if (!legacyRaw) {
        localStorage.setItem("mp_legacyMigrationDone", "true");
        return;
    }

    let legacyMeals;
    try {
        legacyMeals = JSON.parse(legacyRaw);
    } catch {
        console.warn("Legacy meals unreadable");
        localStorage.setItem("mp_legacyMigrationDone", "true");
        return;
    }

    if (!Array.isArray(legacyMeals) || legacyMeals.length === 0) {
        localStorage.setItem("mp_legacyMigrationDone", "true");
        return;
    }

    const existingNames =
        new Set(meals.map(m => m.name.toLowerCase()));

    let importedCount = 0;

    legacyMeals.forEach(old => {
        if (!old.name) return;

        const nameKey = old.name.toLowerCase();
        if (existingNames.has(nameKey)) return;

        meals.push({
            id: crypto.randomUUID(),
            name: old.name,
            instructions: old.instructions || "",
            ingredients: Array.isArray(old.ingredients)
                ? old.ingredients
                : [],
            categoryIds: old.category
                ? [old.category]
                : [],
            rating: "",
            attachments: []
        });

        importedCount++;
    });

    if (importedCount > 0) {
        saveAll();
        console.log(
            `Legacy migration complete: ${importedCount} meals imported`
        );
    }

    localStorage.setItem("mp_legacyMigrationDone", "true");
})();
/* =========================================================
   ONE-TIME LEGACY STORAGE ARCHIVE
========================================================= */

(function archiveLegacyStorageOnce() {
    const done = localStorage.getItem("mp_legacyArchiveDone");
    if (done) return;

    const legacyKeys = Object.keys(localStorage)
        .filter(k => k.startsWith("mealPlanner_"));

    if (legacyKeys.length === 0) {
        localStorage.setItem("mp_legacyArchiveDone", "true");
        return;
    }

    const archive = {};

    legacyKeys.forEach(key => {
        archive[key] = localStorage.getItem(key);
    });

    localStorage.setItem(
        "mp_legacyArchive",
        JSON.stringify(archive, null, 2)
    );

    legacyKeys.forEach(key => localStorage.removeItem(key));

    localStorage.setItem("mp_legacyArchiveDone", "true");

    console.log(
        `Archived and removed ${legacyKeys.length} legacy keys`
    );
})();
/* =========================================================
   ONE-TIME INLINE ATTACHMENT MIGRATION
========================================================= */

(async function migrateInlineAttachmentsOnce() {
    const done = localStorage.getItem("mp_inlineAttachmentMigrationDone");
    if (done) return;

    let migratedCount = 0;

    for (const meal of meals) {
        if (!Array.isArray(meal.attachments)) continue;

        for (let i = 0; i < meal.attachments.length; i++) {
            const att = meal.attachments[i];

            // Skip already-correct attachments
            if (att.id && !att.data) continue;

            // Only migrate inline base64 attachments
            if (!att.data || !att.type) continue;

            try {
                const byteString = atob(att.data.split(",")[1]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);

                for (let j = 0; j < byteString.length; j++) {
                    ia[j] = byteString.charCodeAt(j);
                }

                const blob = new Blob([ab], { type: att.type });
                const newId = crypto.randomUUID();

                await storeAttachmentBlob(newId, blob);

                // Replace inline attachment with indexed version
                meal.attachments[i] = {
                    id: newId,
                    name: att.name || "Attachment",
                    type: att.type
                };

                migratedCount++;
            } catch (err) {
                console.error("Attachment migration failed:", err);
            }
        }
    }

    if (migratedCount > 0) {
        saveAll();
        console.log(`Migrated ${migratedCount} inline attachments`);
    }

    localStorage.setItem(
        "mp_inlineAttachmentMigrationDone",
        "true"
    );
})();

});



