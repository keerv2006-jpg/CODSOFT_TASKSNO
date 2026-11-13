// ---------- Grab the parts of the page we need ----------
const displayEl = document.getElementById("display");
const historyEl = document.getElementById("history");
const keys = document.querySelectorAll(".key");

// ---------- The calculator's memory (its "state") ----------
const MAX_DIGITS = 12;
const SYMBOLS = { add: "+", subtract: "\u2212", multiply: "\u00d7", divide: "\u00f7" };

let current = "0";        // the number being typed (kept as text)
let previous = null;      // the first number, saved when an operator is pressed
let operator = null;      // "add", "subtract", "multiply" or "divide"
let awaitingNext = false; // true right after pressing an operator
let justEvaluated = false;// true right after pressing "="
let hasError = false;     // true after dividing by zero
let historyText = "";     // small line above the main display

// ---------- Maths ----------
// Cleans up floating-point noise, e.g. 0.1 + 0.2 -> 0.3
function format(n) {
  return String(parseFloat(n.toPrecision(12)));
}

// Does one calculation. Returns null if it cannot be done (divide by zero).
function calculate(aText, bText, op) {
  const a = parseFloat(aText);
  const b = parseFloat(bText);
  let result;

  if (op === "add") {
    result = a + b;
  } else if (op === "subtract") {
    result = a - b;
  } else if (op === "multiply") {
    result = a * b;
  } else if (op === "divide") {
    if (b === 0) {
      return null;
    }
    result = a / b;
  } else {
    return null;
  }
  return format(result);
}

// ---------- Drawing on the screen ----------
function render() {
  // Main display
  displayEl.textContent = hasError ? "Cannot divide by 0" : current;

  // Shrink the text when the number gets long so it always fits
  const length = displayEl.textContent.length;
  if (hasError) {
    displayEl.style.fontSize = "1.4rem";
  } else if (length > 14) {
    displayEl.style.fontSize = "1.5rem";
  } else if (length > 9) {
    displayEl.style.fontSize = "2rem";
  } else {
    displayEl.style.fontSize = "2.6rem";
  }

  // Small history line
  if (operator !== null && !justEvaluated) {
    historyEl.textContent = previous + " " + SYMBOLS[operator];
  } else {
    historyEl.textContent = historyText;
  }

  // Loop over every key and highlight the operator that is waiting
  for (const key of keys) {
    const isWaiting =
      key.dataset.action === "operator" &&
      key.dataset.value === operator &&
      awaitingNext;
    key.classList.toggle("active", isWaiting);
  }
}

// ---------- What each key does ----------
function inputDigit(digit) {
  if (hasError) {
    clearAll();
  }
  if (awaitingNext || justEvaluated) {
    current = digit;
    awaitingNext = false;
    justEvaluated = false;
    historyText = "";
  } else if (current === "0") {
    current = digit;
  } else if (current.replace(/[-.]/g, "").length < MAX_DIGITS) {
    current += digit;
  }
  render();
}

function inputDecimal() {
  if (hasError) {
    clearAll();
  }
  if (awaitingNext || justEvaluated) {
    current = "0.";
    awaitingNext = false;
    justEvaluated = false;
    historyText = "";
  } else if (!current.includes(".")) {
    current += ".";
  }
  render();
}

function chooseOperator(op) {
  if (hasError) {
    return;
  }
  // Chain calculations: 2 + 3 + ... works out 2 + 3 first
  if (operator !== null && !awaitingNext) {
    const result = calculate(previous, current, operator);
    if (result === null) {
      showError();
      return;
    }
    previous = result;
    current = result;
  } else {
    previous = current;
  }
  operator = op;
  awaitingNext = true;
  justEvaluated = false;
  render();
}

function equals() {
  if (hasError || operator === null || awaitingNext) {
    return;
  }
  const result = calculate(previous, current, operator);
  if (result === null) {
    showError();
    return;
  }
  historyText = previous + " " + SYMBOLS[operator] + " " + current + " =";
  current = result;
  previous = null;
  operator = null;
  justEvaluated = true;
  render();
}

function percent() {
  if (hasError) {
    return;
  }
  current = format(parseFloat(current) / 100);
  render();
}

function toggleSign() {
  if (hasError || current === "0") {
    return;
  }
  if (current.startsWith("-")) {
    current = current.slice(1);
  } else {
    current = "-" + current;
  }
  render();
}

function deleteLast() {
  if (hasError || awaitingNext || justEvaluated) {
    return;
  }
  current = current.slice(0, -1);
  if (current === "" || current === "-") {
    current = "0";
  }
  render();
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  awaitingNext = false;
  justEvaluated = false;
  hasError = false;
  historyText = "";
  render();
}

function showError() {
  hasError = true;
  previous = null;
  operator = null;
  awaitingNext = false;
  historyText = "";
  render();
}

// ---------- Mouse / touch: one click listener per key (using a loop) ----------
keys.forEach(function (key) {
  key.addEventListener("click", function () {
    const action = key.dataset.action;
    const value = key.dataset.value;

    if (action === "digit") {
      inputDigit(value);
    } else if (action === "decimal") {
      inputDecimal();
    } else if (action === "operator") {
      chooseOperator(value);
    } else if (action === "equals") {
      equals();
    } else if (action === "percent") {
      percent();
    } else if (action === "sign") {
      toggleSign();
    } else if (action === "delete") {
      deleteLast();
    } else if (action === "clear") {
      clearAll();
    }
  });
});

// ---------- Keyboard support ----------
const KEY_TO_OPERATOR = { "+": "add", "-": "subtract", "*": "multiply", "/": "divide" };

document.addEventListener("keydown", function (event) {
  const k = event.key;

  if (k >= "0" && k <= "9") {
    inputDigit(k);
  } else if (k === ".") {
    inputDecimal();
  } else if (KEY_TO_OPERATOR[k]) {
    event.preventDefault(); // stops "/" opening browser quick-find
    chooseOperator(KEY_TO_OPERATOR[k]);
  } else if (k === "Enter" || k === "=") {
    event.preventDefault(); // stops Enter re-clicking a focused button
    equals();
  } else if (k === "%") {
    percent();
  } else if (k === "Backspace") {
    deleteLast();
  } else if (k === "Escape" || k === "Delete") {
    clearAll();
  }
});

// Draw the starting screen
render();