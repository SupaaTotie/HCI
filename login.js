const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const passwordInput = document.querySelector("#login-password");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPassword = document.querySelector("#forgot-password");

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.textContent = isVisible ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
});

forgotPassword.addEventListener("click", () => {
  loginMessage.textContent = "Password recovery will be available when account services are connected.";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;

  loginMessage.textContent = "Opening the dashboard demo…";
  window.location.href = "dashboard.html";
});
