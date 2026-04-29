const messages = document.getElementById("messages");
const taskList = document.getElementById("taskList");
const instanceLabel = document.getElementById("instanceLabel");
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const loginPanel = document.getElementById("loginPanel");
const registerPanel = document.getElementById("registerPanel");
const welcomeText = document.getElementById("welcomeText");

let token = sessionStorage.getItem("token") || "";
let currentUser = JSON.parse(sessionStorage.getItem("user") || "null");

function setMessage(content) {
  messages.textContent = content;
}

function rememberInstance(instance) {
  if (instance) {
    instanceLabel.textContent = instance;
  }
}

function showLogin() {
  loginPanel.classList.remove("hidden");
  registerPanel.classList.add("hidden");
  document.getElementById("showLoginBtn").classList.add("active");
  document.getElementById("showRegisterBtn").classList.remove("active");
}

function showRegister() {
  registerPanel.classList.remove("hidden");
  loginPanel.classList.add("hidden");
  document.getElementById("showRegisterBtn").classList.add("active");
  document.getElementById("showLoginBtn").classList.remove("active");
}

function updateSessionUI() {
  const loggedIn = Boolean(token);
  authSection.classList.toggle("hidden", loggedIn);
  appSection.classList.toggle("hidden", !loggedIn);

  if (loggedIn && currentUser) {
    welcomeText.textContent = `Sesion iniciada como ${currentUser.name} (${currentUser.email}).`;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  rememberInstance(data.instance || response.headers.get("x-instance-id"));

  if (!response.ok) {
    throw new Error(data.message || "Error en la solicitud");
  }

  return data;
}

async function refreshTasks() {
  if (!token) {
    taskList.innerHTML = "";
    setMessage("Inicia sesion para ver y administrar tus tareas.");
    return;
  }

  try {
    const data = await api("/api/tasks");
    taskList.innerHTML = "";

    data.items.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description || "Sin descripcion"}</p>
        <div class="task-actions">
          <button class="secondary" data-edit="${task.id}">Editar</button>
          <button class="danger" data-delete="${task.id}">Eliminar</button>
        </div>
      `;
      taskList.appendChild(li);
    });

    if (data.items.length === 0) {
      taskList.innerHTML =
        "<li class='empty-state'>Aun no hay tareas registradas. Crea la primera para probar el CRUD.</li>";
    }

    setMessage(`Tareas cargadas correctamente desde ${data.instance}.`);
  } catch (error) {
    setMessage(error.message);
  }
}

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("registerName").value,
        email: document.getElementById("registerEmail").value,
        password: document.getElementById("registerPassword").value,
      }),
    });
    document.getElementById("registerForm").reset();
    setMessage(`Cuenta creada para ${data.user.email}. Ahora inicia sesion.`);
    showLogin();
    document.getElementById("loginEmail").value = data.user.email;
  } catch (error) {
    setMessage(error.message);
  }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
      }),
    });
    token = data.token;
    currentUser = data.user;
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(currentUser));
    setMessage(`Bienvenido ${data.user.name}. Sesion iniciada desde ${data.instance}.`);
    updateSessionUI();
    refreshTasks();
  } catch (error) {
    setMessage(error.message);
  }
});

document.getElementById("taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("taskTitle").value,
        description: document.getElementById("taskDescription").value,
      }),
    });
    document.getElementById("taskForm").reset();
    setMessage(`Tarea creada correctamente en ${data.instance}.`);
    refreshTasks();
  } catch (error) {
    setMessage(error.message);
  }
});

document.getElementById("refreshBtn").addEventListener("click", refreshTasks);
document.getElementById("showLoginBtn").addEventListener("click", showLogin);
document.getElementById("showRegisterBtn").addEventListener("click", showRegister);
document.getElementById("goRegisterLink").addEventListener("click", showRegister);
document.getElementById("goLoginLink").addEventListener("click", showLogin);
document.getElementById("logoutBtn").addEventListener("click", () => {
  token = "";
  currentUser = null;
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  taskList.innerHTML = "";
  updateSessionUI();
  showLogin();
  setMessage("Sesion cerrada correctamente.");
});

taskList.addEventListener("click", async (event) => {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");

  try {
    if (editId) {
      const title = prompt("Nuevo titulo:");
      const description = prompt("Nueva descripcion:");
      if (!title) {
        return;
      }
      const data = await api(`/api/tasks/${editId}`, {
        method: "PUT",
        body: JSON.stringify({ title, description }),
      });
      setMessage(`Tarea actualizada correctamente en ${data.instance}.`);
      refreshTasks();
    }

    if (deleteId) {
      const data = await api(`/api/tasks/${deleteId}`, {
        method: "DELETE",
      });
      setMessage(`Tarea eliminada correctamente en ${data.instance}.`);
      refreshTasks();
    }
  } catch (error) {
    setMessage(error.message);
  }
});

updateSessionUI();
showLogin();
refreshTasks();
