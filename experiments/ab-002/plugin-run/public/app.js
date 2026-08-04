const DAY_ABBREVIATIONS = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function calculateWeeklyTotal(selectedCount, focusHours) {
  const days = Math.max(0, Math.min(7, Number(selectedCount) || 0));
  const hours = Math.max(1, Math.min(6, Number(focusHours) || 1));
  return days * hours;
}

export function getFocusStatus(total, selectedCount) {
  if (selectedCount === 0) return "Choose at least one day to give your week a starting point.";
  if (total <= 6) return "A light week—good for recovery or one clear priority.";
  if (total <= 14) return "A calm, workable rhythm with room to breathe.";
  if (total <= 24) return "A full week. Protect your breaks as carefully as your focus.";
  return "That is an ambitious load. Consider leaving more margin for real life.";
}

export function formatSelectedDays(dayNames) {
  if (!dayNames.length) return "None yet";
  return dayNames.map((day) => DAY_ABBREVIATIONS[day]).join(", ");
}

export function initializePlanner(root = document) {
  const planner = root.querySelector("#focus-planner");
  if (!planner) return;

  const dayButtons = [...planner.querySelectorAll(".day-toggle")];
  const hoursInput = planner.querySelector("#focus-hours");
  const hoursValue = planner.querySelector("#hours-value");
  const weeklyTotal = root.querySelector("#weekly-total");
  const plannerStatus = root.querySelector("#planner-status");
  const selectedDays = planner.querySelector("#selected-days");

  if (
    dayButtons.length !== 7 ||
    !hoursInput ||
    !hoursValue ||
    !weeklyTotal ||
    !plannerStatus ||
    !selectedDays
  ) return;

  const updatePlanner = () => {
    const selected = dayButtons.filter((button) => button.getAttribute("aria-pressed") === "true");
    const hours = Number(hoursInput.value);
    const total = calculateWeeklyTotal(selected.length, hours);
    const names = selected.map((button) => button.dataset.day);

    hoursValue.textContent = `${hours} ${hours === 1 ? "hour" : "hours"}`;
    weeklyTotal.textContent = String(total);
    plannerStatus.textContent = getFocusStatus(total, selected.length);
    selectedDays.textContent = formatSelectedDays(names);
  };

  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isSelected = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!isSelected));
      button.classList.toggle("is-selected", !isSelected);
      updatePlanner();
    });
  });

  hoursInput.addEventListener("input", updatePlanner);
  updatePlanner();
}

if (typeof document !== "undefined") {
  initializePlanner(document);
}
