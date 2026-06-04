let observer;

const ISSUE_KEY_RE = /([A-Z][A-Z0-9]+-\d+)/;

let scanScheduled = false;

function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    addCopyButton();
    addBoardCardButtons();
  });
}

function init() {
  observer = new MutationObserver(scheduleScan);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  scheduleScan();
}

function addCopyButton() {
  const summaryHeading = document.querySelector(
    'h1[data-testid="issue.views.issue-base.foundation.summary.heading"]',
  );

  if (summaryHeading && !document.getElementById("jira-copier-btn")) {
    const btn = document.createElement("button");
    btn.id = "jira-copier-btn";
    btn.innerText = "Copy Key - Title";
    btn.title = "Copy ticket details to clipboard";

    Object.assign(btn.style, {
      marginLeft: "10px",
      padding: "4px 8px",
      cursor: "pointer",
      backgroundColor: "#0052cc",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "14px",
      fontWeight: "500",
      verticalAlign: "middle",
      display: "inline-block",
    });

    btn.onmouseover = () => (btn.style.backgroundColor = "#0065ff");
    btn.onmouseout = () => (btn.style.backgroundColor = "#0052cc");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCopy(btn);
    });

    summaryHeading.appendChild(btn);
  }
}

const CARD_KEY_SELECTOR = '[data-testid="platform-card.common.ui.key.key"]';
const CARD_TITLE_SELECTORS = [
  '[data-testid="issue-field-single-line-text-readview-card.ui.single-line-text.container.box"]',
  '[data-testid*="summary"]',
];

function getCardKey(keyEl) {
  const link = keyEl.querySelector('a[href*="/browse/"]');
  if (link) {
    const match = link.getAttribute("href").match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (match) return match[1];
  }

  const match = keyEl.innerText.match(ISSUE_KEY_RE);
  return match ? match[1] : null;
}

function findCardTitleEl(keyEl) {
  let node = keyEl;
  for (let i = 0; i < 10 && node.parentElement; i++) {
    node = node.parentElement;
    for (const selector of CARD_TITLE_SELECTORS) {
      const titleEl = node.querySelector(selector);
      if (titleEl && titleEl.innerText.trim()) return titleEl;
    }
  }
  return null;
}

function addBoardCardButtons() {
  document.querySelectorAll(CARD_KEY_SELECTOR).forEach((keyEl) => {
    const key = getCardKey(keyEl);
    const titleEl = findCardTitleEl(keyEl);
    if (!titleEl) return;

    const title = titleEl.innerText.trim();
    const host = titleEl.parentElement;
    if (!key || !title || !host) return;
    if (host.querySelector(".jira-copier-card-btn")) return;

    const btn = document.createElement("button");
    btn.className = "jira-copier-card-btn";
    btn.type = "button";
    btn.innerText = "Copy";
    btn.title = "Copy key - title to clipboard";

    Object.assign(btn.style, {
      marginLeft: "6px",
      padding: "2px 6px",
      cursor: "pointer",
      backgroundColor: "#0052cc",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      fontWeight: "500",
      lineHeight: "1.4",
      verticalAlign: "middle",
      flex: "0 0 auto",
    });

    btn.onmouseover = () => (btn.style.backgroundColor = "#0065ff");
    btn.onmouseout = () => (btn.style.backgroundColor = "#0052cc");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(`${key} - ${title}`, btn, "Copy");
    });

    host.appendChild(btn);
  });
}

function copyToClipboard(text, btn, originalText) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      btn.innerText = "Copied!";
      btn.style.backgroundColor = "#36b37e";
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = "#0052cc";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy to clipboard.");
    });
}

function getIssueKey() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("selectedIssue")) {
    return urlParams.get("selectedIssue");
  }

  const pathParts = window.location.pathname.split("/");
  const browseIndex = pathParts.indexOf("browse");
  if (browseIndex !== -1 && pathParts.length > browseIndex + 1) {
    return pathParts[browseIndex + 1];
  }

  const issuesIndex = pathParts.indexOf("issues");
  if (issuesIndex !== -1 && pathParts.length > issuesIndex + 1) {
    return pathParts[issuesIndex + 1];
  }

  const breadcrumb = document.querySelector(
    '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue-link"]',
  );
  if (breadcrumb) return breadcrumb.innerText.trim();

  const match = document.title.match(/\[([A-Z]+-\d+)\]/);
  if (match) return match[1];

  return null;
}

function getIssueTitle() {
  const summaryHeading = document.querySelector(
    'h1[data-testid="issue.views.issue-base.foundation.summary.heading"]',
  );
  if (!summaryHeading) return null;

  const clone = summaryHeading.cloneNode(true);
  const btn = clone.querySelector("#jira-copier-btn");
  if (btn) btn.remove();

  return clone.innerText.trim();
}

function handleCopy(btn) {
  const key = getIssueKey();
  const title = getIssueTitle();

  if (key && title) {
    copyToClipboard(`${key} - ${title}`, btn, "Copy Key - Title");
  } else {
    const titleText = document.title;
    const match = titleText.match(/^\[([A-Z]+-\d+)\]\s+(.*)\s+-\s+Jira$/);
    if (match) {
      const fallbackText = `${match[1]} - ${match[2]}`;
      navigator.clipboard.writeText(fallbackText);
      btn.innerText = "Copied (Fallback)!";
      setTimeout(() => (btn.innerText = "Copy Key - Title"), 2000);
      return;
    }

    console.error("Could not find Key or Title", { key, title });
    alert("Could not detect Jira ticket info.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
