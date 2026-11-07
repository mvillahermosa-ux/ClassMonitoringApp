
// ATTENDANCE SUMMARY DASHBOARD

function updateDashboard() {
  const today = getLocalISODate();

  const todayRecords = attendance.filter(record =>
    normalizeDate(record.date) === today
  );

  const completed = todayRecords.filter(record =>
    record.timeOut && record.timeOut.trim() !== ""
  ).length;

  const incomplete = todayRecords.length - completed;

  const percentage = students.length > 0
    ? (todayRecords.length / students.length) * 100
    : 0;

  // ORIGINAL DASHBOARD CARDS
  document.getElementById("totalStudents").textContent =
    students.length;

  document.getElementById("presentToday").textContent =
    todayRecords.length;

  document.getElementById("totalRecords").textContent =
    attendance.length;

  // NEW SUMMARY CARDS
  document.getElementById("timeInToday").textContent =
    todayRecords.length;

  document.getElementById("completedToday").textContent =
    completed;

  document.getElementById("incompleteToday").textContent =
    incomplete;

  document.getElementById("attendancePercentage").textContent =
    percentage.toFixed(1) + "%";

  renderDailySummary();
}


// DAILY ATTENDANCE SUMMARY - LAST 7 DAYS
function renderDailySummary() {
  const table = document.getElementById("dailySummaryTable");

  table.innerHTML = "";

  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const dateString = `${year}-${month}-${day}`;

    const dailyRecords = attendance.filter(record =>
      normalizeDate(record.date) === dateString
    );

    const completed = dailyRecords.filter(record =>
      record.timeOut && record.timeOut.trim() !== ""
    ).length;

    const incomplete = dailyRecords.length - completed;

    const percentage = students.length > 0
      ? (dailyRecords.length / students.length) * 100
      : 0;

    const row = document.createElement("tr");

    const values = [
      displayDate(dateString),
      dailyRecords.length,
      completed,
      incomplete,
      percentage.toFixed(1) + "%"
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    table.appendChild(row);
  }
}


// REFRESH SUMMARY WHEN DASHBOARD OPENS
const originalShowPage = showPage;

showPage = function(page) {
  originalShowPage(page);

  if (page === "dashboard") {
    updateDashboard();
  }
};


// INITIAL REFRESH
updateDashboard();
