const students = {
  maya: "Maya Chen",
  jordan: "Jordan Lee",
  sam: "Sam Rivera",
};

const storageKey = "hallpass-restroom-passes";
const initialState = { passes: [] };
const studentSelect = document.querySelector("#student-select");
const studentStatus = document.querySelector("#student-status");
const studentAvatar = document.querySelector("#student-avatar");
const studentTab = document.querySelector("#student-tab");
const teacherTab = document.querySelector("#teacher-tab");
const studentView = document.querySelector("#student-view");
const teacherView = document.querySelector("#teacher-view");
const notice = document.querySelector("#notice");

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return initialState;

    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.passes)) {
      throw new Error("Saved pass data has an unexpected format.");
    }
    return parsed;
  } catch (error) {
    notice.textContent = `Could not load saved pass data: ${error.message}`;
    return initialState;
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    notice.textContent = "";
    return true;
  } catch (error) {
    notice.textContent = `Could not save this change: ${error.message}`;
    return false;
  }
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function currentPass(studentId) {
  return state.passes.find((pass) => pass.studentId === studentId);
}

function button(label, action, className = "button") {
  const element = document.createElement("button");
  element.className = className;
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", action);
  return element;
}

function changePass(pass, status, timestampKey = status) {
  const previousStatus = pass.status;
  const previousTime = pass[`${timestampKey}At`];
  pass.status = status;
  pass[`${timestampKey}At`] = new Date().toISOString();
  if (!saveState()) {
    pass.status = previousStatus;
    delete pass[`${timestampKey}At`];
    if (previousTime) pass[`${timestampKey}At`] = previousTime;
    return false;
  }
  render();
  return true;
}

function renderStudent() {
  const studentId = studentSelect.value;
  const name = students[studentId];
  const pass = currentPass(studentId);
  studentAvatar.textContent = name.charAt(0);
  studentStatus.replaceChildren();

  const box = document.createElement("div");
  const title = document.createElement("p");
  const description = document.createElement("p");
  title.className = "status-title";
  description.className = "status-description";

  if (pass?.status === "pending") {
    box.className = "status-box status-pending";
    title.textContent = "Waiting for teacher approval";
    description.textContent = `Your request was sent at ${formatTime(pass.requestedAt)}. You’ll see an update here when your teacher responds.`;
  } else if (pass?.status === "out") {
    box.className = "status-box status-out";
    title.textContent = "You’re checked out";
    description.textContent = `Approved at ${formatTime(pass.approvedAt)}. Remember to check back in when you return to class.`;
    box.append(
      title,
      description,
      button("I’m back — check me in", () => changePass(pass, "returned")),
    );
    studentStatus.append(box);
    return;
  } else if (pass?.status === "denied") {
    box.className = "status-box status-denied";
    title.textContent = "Your request wasn’t approved";
    description.textContent = `Your teacher responded at ${formatTime(pass.deniedAt)}. Please speak with your teacher if you need help.`;
    box.append(title, description, button("Request a pass", () => requestPass(studentId)));
    studentStatus.append(box);
    return;
  } else {
    box.className = "status-box";
    title.textContent = "Need to use the restroom?";
    description.textContent = "Send your teacher a request. You’ll need approval before leaving class.";
    box.append(title, description, button("Request a restroom pass", () => requestPass(studentId)));
    studentStatus.append(box);
    return;
  }

  box.append(title, description);
  studentStatus.append(box);
}

function requestPass(studentId) {
  const pass = {
    id: crypto.randomUUID(),
    studentId,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  state.passes.unshift(pass);
  if (!saveState()) {
    state.passes.shift();
    return;
  }
  render();
}

function renderTeacher() {
  const pending = state.passes.filter((pass) => pass.status === "pending");
  const out = state.passes.filter((pass) => pass.status === "out");
  const active = [...pending, ...out];
  const stats = document.querySelector("#teacher-stats");
  stats.replaceChildren();

  [
    [pending.length, "Waiting for approval"],
    [out.length, "Currently out"],
    [state.passes.filter((pass) => pass.status === "returned").length, "Back in class"],
  ].forEach(([count, label]) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    const number = document.createElement("span");
    number.className = "stat-number";
    number.textContent = count;
    const caption = document.createElement("span");
    caption.className = "stat-label";
    caption.textContent = label;
    card.append(number, caption);
    stats.append(card);
  });

  const requests = document.querySelector("#teacher-requests");
  requests.replaceChildren();
  document.querySelector("#requests-label").textContent =
    `${active.length} active ${active.length === 1 ? "pass" : "passes"}`;
  document.querySelector("#pending-count").textContent = pending.length;
  document.querySelector("#pending-count").hidden = pending.length === 0;

  if (active.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No active passes. New student requests will show up here.";
    requests.append(empty);
  }

  active.forEach((pass) => {
    const card = document.createElement("article");
    card.className = "request-card";
    const top = document.createElement("div");
    top.className = "request-top";
    const info = document.createElement("div");
    const name = document.createElement("p");
    name.className = "student-name";
    name.textContent = students[pass.studentId] ?? "Unknown student";
    const meta = document.createElement("p");
    meta.className = "request-meta";
    meta.textContent =
      pass.status === "pending"
        ? `Requested at ${formatTime(pass.requestedAt)}`
        : `Approved at ${formatTime(pass.approvedAt)} · waiting to check in`;
    info.append(name, meta);
    const badge = document.createElement("span");
    badge.className = `activity-state${pass.status === "out" ? " is-out" : ""}`;
    badge.textContent = pass.status === "pending" ? "Needs approval" : "Out";
    top.append(info, badge);
    card.append(top);

    if (pass.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "request-actions";
      actions.append(
        button("Approve pass", () => changePass(pass, "out", "approved"), "button"),
        button("Deny", () => changePass(pass, "denied"), "button button-danger"),
      );
      card.append(actions);
    }
    requests.append(card);
  });

  const history = document.querySelector("#teacher-history");
  history.replaceChildren();
  const completed = state.passes.filter((pass) =>
    ["returned", "denied"].includes(pass.status),
  );
  if (completed.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Completed passes will appear here.";
    history.append(empty);
    return;
  }

  completed.forEach((pass) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const info = document.createElement("div");
    const name = document.createElement("p");
    name.className = "student-name";
    name.textContent = students[pass.studentId] ?? "Unknown student";
    const meta = document.createElement("p");
    meta.className = "request-meta";
    meta.textContent =
      pass.status === "returned"
        ? `Checked back in at ${formatTime(pass.returnedAt)}`
        : `Request denied at ${formatTime(pass.deniedAt)}`;
    info.append(name, meta);
    const badge = document.createElement("span");
    badge.className = `activity-state${pass.status === "denied" ? " is-denied" : ""}`;
    badge.textContent = pass.status === "returned" ? "Returned" : "Denied";
    item.append(info, badge);
    history.append(item);
  });
}

function setView(view) {
  const isStudent = view === "student";
  studentView.hidden = !isStudent;
  teacherView.hidden = isStudent;
  studentTab.classList.toggle("is-active", isStudent);
  teacherTab.classList.toggle("is-active", !isStudent);
  studentTab.setAttribute("aria-pressed", String(isStudent));
  teacherTab.setAttribute("aria-pressed", String(!isStudent));
}

function render() {
  renderStudent();
  renderTeacher();
}

studentTab.addEventListener("click", () => setView("student"));
teacherTab.addEventListener("click", () => setView("teacher"));
studentSelect.addEventListener("change", renderStudent);
window.addEventListener("storage", (event) => {
  if (event.key !== storageKey) return;
  state = loadState();
  render();
});

render();
