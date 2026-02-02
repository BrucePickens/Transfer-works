/* ========== GLOBAL ========== */
body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f6f6f6;
}

.hidden { display: none; }

/* ========== HEADER & TABS ========== */
.app-header {
  background: #fff;
  padding: 15px;
  border-bottom: 1px solid #ccc;
  text-align: center;
}

.top-nav {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.tab-btn {
  background: #e9e9e9;
  border: 1px solid #bdbdbd;
  border-bottom: none;
  padding: 10px 18px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 15px;
}

.tab-btn.active {
  background: #fff;
  font-weight: bold;
}

/* ========== SECTIONS ========== */
.section {
  background: #fff;
  border: 1px solid #bbb;
  border-top: none;
  padding: 20px;
}

/* ========== PLANNER ========== */
#weekGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.day-card {
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
}

/* ========== MEALS LIST ========== */
#mealList div {
  background: #f9f9f9;
  padding: 10px;
  margin-top: 10px;
  border-radius: 6px;
}

/* ========== MODAL ========== */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
}

.modal:not(.hidden) {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.modal-content {
  background: #fff;
  max-width: 420px;
  max-height: 80vh;
  padding: 20px;
  border-radius: 8px;
  overflow-y: auto;
  margin-top: 60px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.25);
}

input, textarea, select {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #c9c9c9;
  font-size: 14px;
}

/* ========== BUTTONS (GLOBAL) ========== */
button {
  background: linear-gradient(#ffffff, #f0f0f0);
  border: 1px solid #bdbdbd;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
}

#clearWeekBtn {
  background: linear-gradient(#fff3f3, #ffdede);
  border-color: #e0a5a5;
}


/* ========== FULL-SCREEN RECIPE WORKSPACE ========== */
.recipe-overlay {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.recipe-overlay.hidden { display: none; }

/* Header */
.recipe-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  background: #fafafa;
}

.recipe-header h2 {
  flex: 1;
  margin: 0;
}

.recipe-header-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

#closeRecipeBtn {
  font-size: 28px;
  border: none;
  background: none;
  cursor: pointer;
}

/* Workspace body */
.recipe-workspace {
  flex: 1;
  overflow: hidden; /* contain internal scroll */
  display: flex;
  flex-direction: column;
}

/* Columns container */
.recipe-columns {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

/* Panels */
.recipe-panel {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
  overflow-y: auto;
}

.recipe-panel h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

/* Text blocks */
.recipe-text,
.recipe-notes {
  white-space: pre-wrap;
  line-height: 1.5;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
}

/* Attachments panel */
.recipe-attachments-panel {
  border-top: 1px solid #ddd;
  padding: 12px 16px;
  background: #fafafa;
}

.recipe-attachments a {
  display: block;
  word-break: break-all;
}

/* Expanded attachments (existing behavior preserved) */
.recipe-overlay.is-expanded
  .recipe-attachments-panel {
  position: fixed;
  left: 5vw;
  right: 5vw;
  bottom: 5vh;
  top: 10vh;
  background: #fff;
  z-index: 10001;
  padding: 16px;
  overflow: auto;
  box-shadow: 0 8px 30px rgba(0,0,0,0.35);
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 900px) {
  .recipe-columns {
    grid-template-columns: 1fr;
  }
}

/* Print */
@media print {
  button { display: none !important; }
  body { margin: 20px; }
}

/* ================================
   RECIPE ATTACHMENTS — CLEAN LIST
================================ */

.recipe-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-attachment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fafafa;
}

.recipe-attachment-row button {
  font-size: 14px;
}

.recipe-attachment-row button:first-child {
  flex: 1;
  text-align: left;
}

.recipe-attachment-row button:last-child {
  background: transparent;
  border: none;
  color: #900;
  font-size: 16px;
  cursor: pointer;
}

.recipe-attachment-row button:last-child:hover {
  color: #c00;
}

/* =========================================================
   MEALS PAGE CLEANUP — STEP 1 (CSS ONLY)
   Safe: no logic changes
========================================================= */

/* ---------- Ingredient Groups: collapsed by default ---------- */

#ingredientGroupDisplay ul {
  display: none;
}

/* Group headers look clickable */
.ingredient-group-header {
  cursor: pointer;
  user-select: none;
}

/* ---------- Ingredient rows: single-line, readable ---------- */

#ingredientGroupDisplay li {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;        /* prevents word stacking */
}

#ingredientGroupDisplay li span {
  white-space: nowrap;
}

/* ---------- Reduce visual clutter ---------- */

#ingredientGroupDisplay button {
  padding: 2px 6px;
  font-size: 0.85em;
}

#ingredientGroupDisplay input[type="checkbox"] {
  margin-right: 6px;
}

/* ---------- Meals page breathing room ---------- */

#mealsSection h3 {
  margin-top: 24px;
}

#ingredientGroupDisplay > div {
  margin-bottom: 16px;
}
/* =========================================================
   GROCERY PRINT PREVIEW — STEP 2
========================================================= */

/* Grocery preview checkboxes (screen only) */
#groceryListPreview input[type="checkbox"] {
  margin-right: 8px;
}

/* Hide unchecked items when printing */
@media print {
  #groceryListPreview input[type="checkbox"]:not(:checked) {
    display: none;
  }

  #groceryListPreview input[type="checkbox"]:not(:checked) + span {
    display: none;
  }
}
/* ===============================
   PLANNER OVERLAY — CLICK FIX
================================ */

#plannerOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

#plannerOverlay.hidden {
  display: none;
}

#plannerOverlay .modal-content {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  max-height: 80vh;
  overflow-y: auto;
  pointer-events: auto;
}

/* clickable rows */
#plannerCategoryList > div {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #ddd;
}

#plannerCategoryList > div:hover {
  background: #f2f2f2;
}
