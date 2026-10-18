(() => {
  "use strict";
  const STORAGE_KEY = "schoolInventoryTracker.records.v1";
  const $ = (id) => document.getElementById(id);
  const form = $("equipmentForm");
  const fields = {
    editId: $("editId"),
    name: $("equipmentName"),
    quantity: $("quantity"),
    condition: $("condition"),
    status: $("status"),
    location: $("location"),
  };
  let records = loadRecords();
  let toastTimer;

  function loadRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      showToast("Unable to save. Browser storage may be full or disabled.");
      return false;
    }
  }
  function makeId() {
    return window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char])
    );
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function resetForm() {
    form.reset();
    fields.editId.value = "";
    $("formTitle").textContent = "Add School Equipment";
    $("saveButton").textContent = "Save Equipment";
    $("cancelEdit").hidden = true;
  }
  function getFilteredRecords() {
    const query = $("searchInput").value.trim().toLowerCase();
    const status = $("statusFilter").value;
    const sort = $("sortBy").value;
    return records
      .filter((record) => {
        const matchesQuery = [
          record.name,
          record.location,
          record.condition,
          record.status,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );
        return matchesQuery && (!status || record.status === status);
      })
      .sort((a, b) => {
        if (sort === "quantity") return Number(b.quantity) - Number(a.quantity);
        if (sort === "location") return a.location.localeCompare(b.location);
        if (sort === "status") return a.status.localeCompare(b.status);
        return a.name.localeCompare(b.name);
      });
  }
  function render() {
    const filtered = getFilteredRecords();
    $("inventoryBody").innerHTML = filtered
      .map(
        (record, index) => ` <tr> <td>${index + 1}</td> <td>${escapeHtml(record.name)}</td> <td>${escapeHtml(record.quantity)}</td> <td>${escapeHtml(record.location)}</td> <td>${escapeHtml(record.condition)}</td> <td>${escapeHtml(record.status)}</td> <td><div class="action-group"> <button class="action-btn edit-btn" type="button" data-action="edit" data-id="${escapeHtml( record.id )}">Edit</button> <button class="action-btn delete-btn" type="button" data-action="delete" data-id="${escapeHtml( record.id )}">Delete</button> </div></td> </tr>`
      )
      .join("");
    $("emptyState").hidden = filtered.length > 0;
    if (filtered.length)
      $("emptyState").textContent = "No matching records found.";
    else
      $("emptyState").textContent = records.length
        ? "No matching records found."
        : "No equipment records yet. Add your first record above.";
    $("totalRecords").textContent = records.length;
    $("totalQuantity").textContent = records.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );
    $("availableCount").textContent = records.filter(
      (item) => item.status === "Available"
    ).length;
    $("attentionCount").textContent = records.filter(
      (item) =>
        ["Under Repair", "Missing", "Condemned", "Disposed"].includes(
          item.status
        ) || ["Damaged", "For Repair", "Beyond Repair"].includes(item.condition)
    ).length;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = fields.name.value.trim();
    const quantity = Number(fields.quantity.value);
    const condition = fields.condition.value;
    const status = fields.status.value;
    const location = fields.location.value.trim();
    if (
      !name ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !condition ||
      !status ||
      !location
    ) {
      showToast("Please complete all fields with valid values.");
      return;
    }
    const editId = fields.editId.value;
    if (editId) {
      const index = records.findIndex((record) => record.id === editId);
      if (index !== -1)
        records[index] = {
          ...records[index],
          name,
          quantity,
          condition,
          status,
          location,
          updatedAt: new Date().toISOString(),
        };
      showToast("Equipment record updated.");
    } else {
      records.push({
        id: makeId(),
        name,
        quantity,
        condition,
        status,
        location,
        createdAt: new Date().toISOString(),
      });
      showToast("Equipment record saved.");
    }
    persist();
    resetForm();
    render();
  });

  $("inventoryBody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const record = records.find((item) => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "edit") {
      fields.editId.value = record.id;
      fields.name.value = record.name;
      fields.quantity.value = record.quantity;
      fields.condition.value = record.condition;
      fields.status.value = record.status;
      fields.location.value = record.location;
      $("formTitle").textContent = "Edit School Equipment";
      $("saveButton").textContent = "Update Equipment";
      $("cancelEdit").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (button.dataset.action === "delete") {
      if (
        !window.confirm(
          `Delete "${record.name}" from the inventory? This cannot be undone.`
        )
      )
        return;
      records = records.filter((item) => item.id !== record.id);
      persist();
      if (fields.editId.value === record.id) resetForm();
      render();
      showToast("Equipment record deleted.");
    }
  });
  $("cancelEdit").addEventListener("click", resetForm);
  $("clearForm").addEventListener("click", () => {
    resetForm();
    showToast("Form cleared.");
  });
  ["searchInput", "statusFilter", "sortBy"].forEach((id) =>
    $(id).addEventListener(id === "searchInput" ? "input" : "change", render)
  );
  $("exportPdf").addEventListener("click", downloadPdf);
  $("exportPdfTop").addEventListener("click", downloadPdf);

  function downloadPdf() {
    if (!records.length) {
      showToast(
        "Add at least one equipment record before downloading a report."
      );
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast(
        "PDF library could not load. Connect to the internet and try again."
      );
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SCHOOL EQUIPMENT INVENTORY REPORT", pageWidth / 2, 17, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("School Property and Equipment Inventory", pageWidth / 2, 23, {
      align: "center",
    });
    doc.text(`Date Generated: ${generatedDate}`, pageWidth / 2, 28, {
      align: "center",
    });
    doc.text("Prepared By: ______________________________", 14, 37);
    const reportRows = [...records]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item, index) => [
        String(index + 1),
        item.name,
        String(item.quantity),
        item.location,
        item.condition,
        item.status,
      ]);
    doc.autoTable({
      startY: 43,
      head: [["#", "Equipment", "Qty", "Location", "Condition", "Status"]],
      body: reportRows,
      theme: "grid",
      margin: { left: 10, right: 10, top: 12, bottom: 16 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        lineColor: [210, 216, 225],
        lineWidth: 0.2,
        textColor: [35, 43, 58],
      },
      headStyles: {
        fillColor: [22, 184, 154],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [246, 249, 252] },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { cellWidth: 18 },
        3: { cellWidth: 55 },
        4: { cellWidth: 45 },
        5: { cellWidth: 45 },
      },
      didDrawPage: () => {
        doc.setFontSize(7);
        doc.setTextColor(80, 88, 100);
        doc.text("School Inventory Tracker", 10, pageHeight - 7);
        const pageText = `Page ${doc.internal.getNumberOfPages()}`;
        doc.text(pageText, pageWidth - 10, pageHeight - 7, { align: "right" });
      },
    });
    const filenameInput = window.prompt(
      "Enter a filename for the PDF report:",
      "School_Equipment_Inventory_Report"
    );
    if (filenameInput === null) return;
    const safeName = filenameInput
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\.pdf$/i, "");
    doc.save(`${safeName || "School_Equipment_Inventory_Report"}.pdf`);
    showToast("PDF report downloaded.");
  }

  render();
})();