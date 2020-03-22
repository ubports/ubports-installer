const dots = window.setInterval(function() {
  const wait = document.getElementById("wait-dot");
  if (wait.innerText.length > 4) wait.innerText = "";
  else wait.innerText += ".";
}, 400);
