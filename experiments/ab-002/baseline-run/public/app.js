export function calculateWeeklyTotal(selectedDays, hoursPerDay) {
  const days = Math.max(0, Number(selectedDays) || 0);
  const hours = Math.min(6, Math.max(1, Number(hoursPerDay) || 1));
  return days * hours;
}

export function getPlannerMessage(total, selectedDays) {
  if (selectedDays === 0) return "Choose at least one day to give your focus somewhere to land.";
  if (total <= 6) return "Light and intentional — a good rhythm for a crowded week.";
  if (total <= 14) return "Spacious and steady — enough momentum without crowding the week.";
  if (total <= 24) return "A full creative week — protect your breaks as carefully as your focus.";
  return "That is an ambitious load — make sure the rest of your week has room for you.";
}

export function formatHours(total) {
  return `${total} ${total === 1 ? "hour" : "hours"}`;
}

function initPlanner() {
  const days = [...document.querySelectorAll(".day")];
  const slider = document.querySelector("#focus-hours");
  const totalOutput = document.querySelector("#weekly-total");
  const hoursOutput = document.querySelector("#hours-output");
  const message = document.querySelector("#planner-message");

  if (!days.length || !slider || !totalOutput || !hoursOutput || !message) return;

  function render() {
    const selectedDays = days.filter((day) => day.getAttribute("aria-pressed") === "true").length;
    const hours = Number(slider.value);
    const total = calculateWeeklyTotal(selectedDays, hours);

    totalOutput.textContent = formatHours(total);
    hoursOutput.textContent = `${hours}h`;
    message.textContent = getPlannerMessage(total, selectedDays);

    const range = Number(slider.max) - Number(slider.min);
    const position = ((hours - Number(slider.min)) / range) * 100;
    slider.style.setProperty("--range-position", `${position}%`);
  }

  days.forEach((day) => {
    day.addEventListener("click", () => {
      const isActive = day.getAttribute("aria-pressed") === "true";
      day.setAttribute("aria-pressed", String(!isActive));
      day.classList.toggle("active", !isActive);
      render();
    });
  });

  slider.addEventListener("input", render);
  render();
}

function initPage() {
  initPlanner();
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage);
  else initPage();
}
