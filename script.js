const $ = id => document.getElementById(id);

let students = JSON.parse(localStorage.getItem("students") || "[]");
let attendance = JSON.parse(localStorage.getItem("attendance") || "[]");
let html5QrCode = null;
let scannerStarting = false;
let filteredReports = [];

// UPGRADE OLD ATTENDANCE RECORDS
// Previous attendance time is preserved as Time In.
attendance = attendance.map(record => ({
  ...record,
  timeIn: record.timeIn || record.time || "",
  timeOut: record.timeOut || ""
}));

// SAVE DATA
function saveData() {
  localStorage.setItem("students", JSON.stringify(students));
  localStorage.setItem("attendance", JSON.stringify(attendance));
}

// DATE HELPERS
function getLocalISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(dateValue) {
  if (!dateValue) return "";

  const value = String(dateValue).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = value.split("/");

  if (parts.length === 3) {
    let month = parts[0];
    let day = parts[1];
    let year = parts[2];

    if (year.length === 2) year = "20" + year;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return "";
}

function displayDate(dateValue) {
  const normalized = normalizeDate(dateValue);

  if (!normalized) return dateValue || "";

  const [year, month, day] = normalized.split("-");
  return `${month}/${day}/${year}`;
}

// LOGIN
$("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  $("loginPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");

  $("welcomeUser").textContent =
    "Welcome, " + $("username").value;

  showPage("dashboard");
});

// LOGOUT
$("logoutBtn").addEventListener("click", async () => {
  await stopScanner();

  $("appPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
});

// NAVIGATION
document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", async () => {
    if (button.dataset.page !== "attendance") {
      await stopScanner();
    }

    showPage(button.dataset.page);
  });
});

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.add("hidden");
  });

  $(page).classList.remove("hidden");

  $("pageTitle").textContent =
    page === "students" ? "Student Management" :
    page === "attendance" ? "Barcode Attendance" :
    page === "reports" ? "Attendance Reports" : "Dashboard";

  if (page === "dashboard") updateDashboard();
  if (page === "students") renderStudents();
  if (page === "attendance") renderAttendance();

  if (page === "reports") {
    applyReportFilter();
  }
}

// REGISTER STUDENT
$("studentForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const id = $("studentId").value.trim();
  const name = $("studentName").value.trim();
  const section = $("studentSection").value.trim();

  if (students.some(student =>
    student.id.toLowerCase() === id.toLowerCase()
  )) {
    alert("This Student ID is already registered.");
    return;
  }

  students.push({ id, name, section });

  saveData();
  this.reset();

  renderStudents();
  updateDashboard();

  alert("Student successfully registered!");
});

// DISPLAY STUDENTS
function renderStudents() {
  $("studentTable").innerHTML = "";

  students.forEach((student, index) => {
    const row = document.createElement("tr");

    [student.id, student.name, student.section].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");

    const viewButton = document.createElement("button");
    viewButton.textContent = "View / Print ID";
    viewButton.addEventListener("click", () => showIdCard(index));

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.style.marginLeft = "5px";
    editButton.style.background = "#d18b16";
    editButton.addEventListener("click", () => editStudent(index));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.marginLeft = "5px";
    deleteButton.style.background = "#b83232";
    deleteButton.addEventListener("click", () => deleteStudent(index));

    actionCell.append(viewButton, editButton, deleteButton);
    row.appendChild(actionCell);

    $("studentTable").appendChild(row);
  });
}

// EDIT STUDENT
function editStudent(index) {
  const student = students[index];

  const newId = prompt("Enter Student ID:", student.id);
  if (newId === null || !newId.trim()) return;

  const newName = prompt("Enter Student Name:", student.name);
  if (newName === null || !newName.trim()) return;

  const newSection = prompt("Enter Student Section:", student.section);
  if (newSection === null || !newSection.trim()) return;

  const cleanId = newId.trim();

  const duplicate = students.some((s, i) =>
    i !== index && s.id.toLowerCase() === cleanId.toLowerCase()
  );

  if (duplicate) {
    alert("That Student ID is already being used.");
    return;
  }

  const oldId = student.id;

  students[index] = {
    id: cleanId,
    name: newName.trim(),
    section: newSection.trim()
  };

  attendance.forEach(record => {
    if (record.id.toLowerCase() === oldId.toLowerCase()) {
      record.id = cleanId;
      record.name = newName.trim();
      record.section = newSection.trim();
    }
  });

  saveData();
  renderStudents();
  renderAttendance();
  updateDashboard();

  if (!$("reports").classList.contains("hidden")) {
    applyReportFilter();
  }

  alert("Student information successfully updated!");
}

// DELETE STUDENT
function deleteStudent(index) {
  const student = students[index];

  if (!confirm("Are you sure you want to delete " + student.name + "?")) {
    return;
  }

  students.splice(index, 1);

  saveData();
  renderStudents();
  updateDashboard();

  alert("Student deleted. Previous attendance records were kept.");
}

// BARCODE ID CARD
function showIdCard(index) {
  const student = students[index];

  $("cardName").textContent = student.name;
  $("cardId").textContent = student.id;
  $("cardSection").textContent = student.section;
  $("barcodeNumber").textContent = student.id;

  if (typeof JsBarcode === "undefined") {
    alert("Barcode library did not load. Check your internet connection.");
    return;
  }

  JsBarcode("#barcode", student.id, {
    format: "CODE128",
    lineColor: "#000000",
    width: 2,
    height: 70,
    displayValue: false,
    margin: 5
  });

  $("idModal").classList.remove("hidden");
}

$("printBtn").addEventListener("click", () => window.print());

$("closeCardBtn").addEventListener("click", () => {
  $("idModal").classList.add("hidden");
});

// RECORD BUTTON
$("recordBtn").addEventListener("click", () => {
  recordAttendance($("attendanceId").value.trim());
});

// TIME IN / TIME OUT
function recordAttendance(id) {
  if (!id) {
    alert("Please enter or scan a Student ID.");
    return;
  }

  const student = students.find(s =>
    s.id.toLowerCase() === id.toLowerCase()
  );

  if (!student) {
    alert("Student not found. Please register the student first.");
    $("attendanceId").value = "";
    return;
  }

  const today = getLocalISODate();

  // Find today's attendance record for this student.
  const existingRecord = attendance.find(record =>
    record.id.toLowerCase() === student.id.toLowerCase() &&
    normalizeDate(record.date) === today
  );

  const currentTime = new Date().toLocaleTimeString();

  // FIRST SCAN: TIME IN
  if (!existingRecord) {
    attendance.push({
      id: student.id,
      name: student.name,
      section: student.section,
      date: today,
      timeIn: currentTime,
      timeOut: ""
    });

    saveData();

    $("attendanceId").value = "";

    renderAttendance();
    updateDashboard();

    if (!$("reports").classList.contains("hidden")) {
      applyReportFilter();
    }

    alert("TIME IN successfully recorded for " + student.name + "!\nTime: " + currentTime);

    return;
  }

  // SECOND SCAN: TIME OUT
  if (!existingRecord.timeOut) {
    existingRecord.timeOut = currentTime;

    saveData();

    $("attendanceId").value = "";

    renderAttendance();
    updateDashboard();

    if (!$("reports").classList.contains("hidden")) {
      applyReportFilter();
    }

    alert("TIME OUT successfully recorded for " + student.name + "!\nTime: " + currentTime);

    return;
  }

  // THIRD SCAN: ALREADY COMPLETED
  $("attendanceId").value = "";

  alert(
    student.name +
    " has already completed Time In and Time Out for today."
  );
}

// GET STATUS
function getAttendanceStatus(record) {
  return record.timeOut ? "Completed" : "Timed In";
}

// DISPLAY ATTENDANCE
function renderAttendance() {
  $("attendanceTable").innerHTML = "";

  attendance.forEach(record => {
    const row = document.createElement("tr");

    [
      record.id,
      record.name,
      record.section,
      displayDate(record.date),
      record.timeIn || "",
      record.timeOut || "Not yet recorded",
      getAttendanceStatus(record)
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    $("attendanceTable").appendChild(row);
  });
}

// DASHBOARD
function updateDashboard() {
  const today = getLocalISODate();

  $("totalStudents").textContent = students.length;

  $("presentToday").textContent = attendance.filter(record =>
    normalizeDate(record.date) === today
  ).length;

  $("totalRecords").textContent = attendance.length;
}

// ATTENDANCE REPORT FILTER
$("filterReportBtn").addEventListener("click", applyReportFilter);

$("resetReportBtn").addEventListener("click", () => {
  $("reportStartDate").value = "";
  $("reportEndDate").value = "";
  applyReportFilter();
});

function applyReportFilter() {
  const startDate = $("reportStartDate").value;
  const endDate = $("reportEndDate").value;

  if (startDate && endDate && startDate > endDate) {
    alert("Start Date cannot be later than End Date.");
    return;
  }

  filteredReports = attendance.filter(record => {
    const recordDate = normalizeDate(record.date);

    if (!recordDate) return false;
    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;

    return true;
  });

  renderReports();
}

// DISPLAY REPORTS
function renderReports() {
  $("reportTable").innerHTML = "";

  filteredReports.forEach(record => {
    const row = document.createElement("tr");

    [
      record.id,
      record.name,
      record.section,
      displayDate(record.date),
      record.timeIn || "",
      record.timeOut || "Not yet recorded",
      getAttendanceStatus(record)
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    $("reportTable").appendChild(row);
  });

  $("filteredRecordCount").textContent = filteredReports.length;

  $("reportMessage").textContent =
    filteredReports.length === 0
      ? "No attendance records found for the selected date range."
      : "Showing " + filteredReports.length + " attendance record(s).";
}

// EXPORT CSV
$("exportCsvBtn").addEventListener("click", exportCSV);

function exportCSV() {
  if (filteredReports.length === 0) {
    alert("No attendance records to export.");
    return;
  }

  const headers = [
    "Student ID",
    "Student Name",
    "Section",
    "Date",
    "Time In",
    "Time Out",
    "Status"
  ];

  const rows = filteredReports.map(record => [
    record.id,
    record.name,
    record.section,
    displayDate(record.date),
    record.timeIn || "",
    record.timeOut || "",
    getAttendanceStatus(record)
  ]);

  function escapeCSV(value) {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
  }

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map(row => row.map(escapeCSV).join(","))
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "Attendance_Report_" + getLocalISODate() + ".csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  alert("Attendance report successfully exported!");
}

// CAMERA SCANNER
$("startScannerBtn").addEventListener("click", startScanner);
$("stopScannerBtn").addEventListener("click", stopScanner);

async function startScanner() {
  if (scannerStarting) return;

  if (typeof Html5Qrcode === "undefined") {
    alert("Scanner library did not load. Check your internet connection.");
    return;
  }

  scannerStarting = true;

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    if (html5QrCode.isScanning) return;

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 280, height: 130 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR
        ]
      },
      async decodedText => {
        $("attendanceId").value = decodedText;
        await stopScanner();
        recordAttendance(decodedText);
      },
      () => {}
    );

  } catch (error) {
    console.error("CAMERA ERROR:", error);

    let message = "Unable to open camera.";

    if (error.name === "NotAllowedError") {
      message = "Camera access was denied. Check browser permission.";
    } else if (error.name === "NotFoundError") {
      message = "No camera was found.";
    } else if (error.name === "NotReadableError") {
      message = "Camera is being used by another application.";
    } else {
      message += " Error: " + error.message;
    }

    alert(message);

  } finally {
    scannerStarting = false;
  }
}

async function stopScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
    } catch (error) {
      console.error("Scanner stop error:", error);
    }
  }
}

// INITIAL DISPLAY
saveData();
renderStudents();
renderAttendance();
updateDashboard();