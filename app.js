import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm";

const SUPABASE_URL = "https://ueuvavxdvclnfffujafz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AhkBD0Tcki8RECDar7_vkw_fsV_wxX0";
const AUTH_REDIRECT_URL = new URL(".", window.location.href).href;

const configured =
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("YOUR-PUBLISHABLE-KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const pillars = [
  "Financial Sustainability",
  "Digital & Data Transformation",
  "Governance Stewardship",
  "Customer Experience Transformation",
  "Workforce & Leadership Transformation"
];

const COMPARISON_YEARS = [2026, 2027];
const DEFAULT_ADMIN_YEAR = "2027";

const EXECUTIVE_COLORS = {
  navy: "#102f49",
  grid: "rgba(141,178,200,.17)",
  text: "#b4c6d2",
  white: "#edf4f8",
  gold: "#d1ad63",
  teal: "#57999b",
  blue: "#7f99af",
  lightBlue: "#78a8c4",
  red: "#d26066",
  green: "#6ca69b",
  amber: "#d1ad63",
  slate: "#7892a6"
};

const EXECUTIVE_SERIES_COLORS = {
  neutral: "#7f99af",
  gold: "#d1ad63",
  teal: "#57999b",
  green: "#6ca69b",
  red: "#d26066",
  blue: "#78a8c4",
  slate: "#7892a6"
};

const EXECUTIVE_PANEL_STATE_KEY = "home31-executive-panel-state-v1";

const QUADRANT_GUIDE_PLUGIN = {
  id: "quadrantGuide",
  beforeDatasetsDraw(chart, _args, options = {}) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales?.x || !scales?.y) return;
    const { left, right, top, bottom } = chartArea;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const xSplit = clamp(scales.x.getPixelForValue(options.xThreshold || 0), left, right);
    const ySplit = clamp(scales.y.getPixelForValue(options.yThreshold || 1), top, bottom);

    ctx.save();
    ctx.fillStyle = "rgba(87,153,155,.055)";
    ctx.fillRect(left, top, xSplit - left, ySplit - top);
    ctx.fillStyle = "rgba(209,173,99,.055)";
    ctx.fillRect(xSplit, top, right - xSplit, ySplit - top);
    ctx.fillStyle = "rgba(127,153,175,.04)";
    ctx.fillRect(left, ySplit, xSplit - left, bottom - ySplit);
    ctx.fillStyle = "rgba(210,96,102,.045)";
    ctx.fillRect(xSplit, ySplit, right - xSplit, bottom - ySplit);

    ctx.strokeStyle = "rgba(180,198,210,.34)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xSplit, top);
    ctx.lineTo(xSplit, bottom);
    ctx.moveTo(left, ySplit);
    ctx.lineTo(right, ySplit);
    ctx.stroke();
    ctx.restore();
  },
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { left, right, top, bottom } = chartArea;
    ctx.save();
    ctx.fillStyle = "rgba(214,226,234,.72)";
    ctx.font = "600 10px IBM Plex Sans, sans-serif";
    ctx.fillText("HIGH BENEFIT · LOWER COST", left + 8, top + 16);
    const highCost = "HIGH BENEFIT · HIGHER COST";
    ctx.fillText(highCost, right - ctx.measureText(highCost).width - 8, top + 16);
    ctx.fillStyle = "rgba(169,189,204,.62)";
    ctx.fillText("LOWER BENEFIT · LOWER COST", left + 8, bottom - 8);
    const review = "LOWER BENEFIT · HIGHER COST";
    ctx.fillText(review, right - ctx.measureText(review).width - 8, bottom - 8);
    ctx.restore();
  }
};

let pillarMetric = "count";
let selectedAdminYear = DEFAULT_ADMIN_YEAR;

const DISPLAY_SETTINGS_KEY = "home31-display-settings-v2";
const DISPLAY_MODES = ["standard", "comfortable", "large"];
const SIDEBAR_STATE_KEY = "home31-sidebar-collapsed-v1";
const MOBILE_NAVIGATION_QUERY = "(max-width: 850px)";
const WORKSPACE_STATE_KEY = "home31-workspace-state-v1";
const EXECUTIVE_TAB_STATE_KEY = "home31-executive-tab-v1";
let currentDisplaySize = "standard";
let highContrastEnabled = false;
let tableEnhancementScheduled = false;
let responsiveTableObserver = null;
let sidebarMediaQuery = null;
let sidebarCollapsed = false;
let adminQuickFilter = "";
let activeExecutiveTab = "summary";
let workspaceScrollTimer = null;

const CONTINUITY_STOP_WORDS = new Set([
  "a","an","and","annual","amp","for","from","in","of","on","project","programme",
  "the","to","with","implementation","initiative","initiatives","phase","year"
]);

let currentUser = null;
let currentProfile = null;
let userProjects = [];
let adminProjects = [];
let adminProfiles = [];
let charts = {};
let currentInitiativeFormStep = 1;
let lastModalTrigger = null;
let authRouteTimer = null;
let authRouteRevision = 0;

const INITIATIVE_DRAFT_PREFIX = "home31-initiative-draft-v1";
const INITIATIVE_DRAFT_DELAY = 800;
let initiativeFormInitialising = false;
let initiativeFormDirty = false;
let initiativeDraftTimer = null;
let activeInitiativeDraftKey = null;
let pendingInitiativeDraft = null;

let excelImportRawRows = [];
let excelImportPreparedRows = [];
let excelImportLastTrigger = null;

document.addEventListener("DOMContentLoaded", initialise);

async function initialise() {
  initialiseDisplaySettings();
  initialiseNavigation();
  initialiseExecutiveInteractions();
  initialiseExecutiveWorkspaceTabs();
  initialiseWorkspacePersistence();
  initialiseDepartmentUserControls();
  bindEvents();
  populatePillars();
  handleResetLink();
  initialiseResponsiveTables();

  if (!configured) {
    $("#configuration-warning").classList.remove("hidden");
    return;
  }

  // Keep the auth callback synchronous. Supabase can deadlock when another
  // Supabase API call is awaited directly inside onAuthStateChange.
  supabase.auth.onAuthStateChange((event, session) => {
    if (shouldRouteAuthEvent(event, session)) {
      scheduleAuthRoute(session);
    } else if (session?.user) {
      currentUser = session.user;
    }
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showToast(error.message || "Unable to restore your session.", true);
    showAuth();
    return;
  }
  scheduleAuthRoute(data.session);
}

function initialiseNavigation() {
  sidebarMediaQuery = window.matchMedia(MOBILE_NAVIGATION_QUERY);

  try {
    sidebarCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  } catch (_error) {
    sidebarCollapsed = false;
  }

  if (typeof sidebarMediaQuery.addEventListener === "function") {
    sidebarMediaQuery.addEventListener("change", handleSidebarBreakpointChange);
  } else if (typeof sidebarMediaQuery.addListener === "function") {
    sidebarMediaQuery.addListener(handleSidebarBreakpointChange);
  }

  applySidebarState();
}

function isMobileNavigation() {
  return sidebarMediaQuery?.matches ?? window.innerWidth <= 850;
}

function applySidebarState() {
  const mobile = isMobileNavigation();
  document.body.classList.toggle("sidebar-collapsed", !mobile && sidebarCollapsed);

  if (mobile) {
    closeSidebarDrawer();
  } else {
    document.body.classList.remove("sidebar-drawer-open", "navigation-scroll-locked");
    $("#sidebar")?.classList.remove("open");
    $("#sidebar-overlay")?.classList.remove("visible");
    if ($("#sidebar")) $("#sidebar").inert = false;
  }

  updateSidebarControls();
  window.setTimeout(() => Object.values(charts).forEach(chart => chart?.resize?.()), 220);
}

function toggleNavigation() {
  if (isMobileNavigation()) {
    if (document.body.classList.contains("sidebar-drawer-open")) {
      closeSidebarDrawer({ restoreFocus: true });
    } else {
      openSidebarDrawer();
    }
    return;
  }

  sidebarCollapsed = !sidebarCollapsed;
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
  } catch (_error) {
    // The interface remains usable when browser storage is unavailable.
  }
  applySidebarState();
}

function openSidebarDrawer() {
  if (!isMobileNavigation()) return;

  const sidebar = $("#sidebar");
  document.body.classList.add("sidebar-drawer-open", "navigation-scroll-locked");
  sidebar?.classList.add("open");
  $("#sidebar-overlay")?.classList.add("visible");
  if (sidebar) sidebar.inert = false;
  updateSidebarControls();

  window.requestAnimationFrame(() => $("#sidebar-collapse-button")?.focus());
}

function closeSidebarDrawer({ restoreFocus = false } = {}) {
  const sidebar = $("#sidebar");
  const wasOpen = document.body.classList.contains("sidebar-drawer-open");

  document.body.classList.remove("sidebar-drawer-open", "navigation-scroll-locked");
  sidebar?.classList.remove("open");
  $("#sidebar-overlay")?.classList.remove("visible");

  if (sidebar) sidebar.inert = isMobileNavigation();
  updateSidebarControls();

  if (restoreFocus && wasOpen) $("#menu-toggle")?.focus();
}

function updateSidebarControls() {
  const mobile = isMobileNavigation();
  const drawerOpen = document.body.classList.contains("sidebar-drawer-open");
  const expanded = mobile ? drawerOpen : !sidebarCollapsed;
  const menuButton = $("#menu-toggle");
  const sidebarButton = $("#sidebar-collapse-button");
  const sidebarIcon = sidebarButton?.querySelector("span");

  menuButton?.setAttribute("aria-expanded", String(expanded));
  menuButton?.setAttribute("aria-label", mobile
    ? (drawerOpen ? "Close navigation menu" : "Open navigation menu")
    : (sidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"));
  if (menuButton) menuButton.title = menuButton.getAttribute("aria-label");

  sidebarButton?.setAttribute("aria-expanded", String(expanded));
  sidebarButton?.setAttribute("aria-label", mobile
    ? "Close navigation menu"
    : (sidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"));
  if (sidebarButton) sidebarButton.title = sidebarButton.getAttribute("aria-label");
  if (sidebarIcon) sidebarIcon.textContent = mobile ? "×" : (sidebarCollapsed ? "›" : "‹");
}

function handleSidebarBreakpointChange() {
  applySidebarState();
}

function handleNavigationKeydown(event) {
  if (event.altKey && event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    toggleNavigation();
    return;
  }

  if (event.key === "Escape" && document.body.classList.contains("sidebar-drawer-open")) {
    event.preventDefault();
    closeSidebarDrawer({ restoreFocus: true });
    return;
  }

  if (event.key === "Tab" && document.body.classList.contains("sidebar-drawer-open")) {
    trapSidebarDrawerFocus(event);
  }
}

function trapSidebarDrawerFocus(event) {
  const sidebar = $("#sidebar");
  if (!sidebar) return;

  const focusable = [...sidebar.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.closest(".hidden") && element.getClientRects().length > 0);

  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindEvents() {
  $("#login-form").addEventListener("submit", login);
  $("#forgot-password-button").addEventListener("click", () => toggleAuthCard("forgot"));
  $("#back-to-login-button").addEventListener("click", () => toggleAuthCard("login"));
  $("#forgot-password-form").addEventListener("submit", sendPasswordReset);

  $("#force-password-form").addEventListener("submit", completeForcedPasswordChange);
  $("#force-new-password").addEventListener("input", updatePasswordStrength);
  $("#force-logout-button").addEventListener("click", logout);

  $("#logout-button").addEventListener("click", logout);
  $("#menu-toggle").addEventListener("click", toggleNavigation);
  $("#sidebar-collapse-button").addEventListener("click", toggleNavigation);
  $("#sidebar-overlay").addEventListener("click", () => closeSidebarDrawer({ restoreFocus: true }));
  document.addEventListener("keydown", handleNavigationKeydown);
  $("#top-account-button").addEventListener("click", () => showModule("account"));
  $("#top-new-initiative").addEventListener("click", () => openInitiativeModal());
  $("#admin-year-select").addEventListener("change", handleAdminYearChange);

  $$(".nav-item").forEach(button =>
    button.addEventListener("click", () => {
      if (button.dataset.module === "admin-portfolio") {
        adminQuickFilter = "";
        resetAdminFilterControls();
      }
      showModule(button.dataset.module);
    })
  );
  $$("[data-jump]").forEach(button =>
    button.addEventListener("click", () => {
      if (button.dataset.jump === "admin-portfolio") {
        adminQuickFilter = "";
        resetAdminFilterControls();
      }
      showModule(button.dataset.jump);
    })
  );
  $$("[data-open-initiative]").forEach(button =>
    button.addEventListener("click", () => openInitiativeModal())
  );

  $("#profile-form").addEventListener("submit", updateProfile);
  $("#change-password-form").addEventListener("submit", updatePasswordFromAccount);

  $("#user-search").addEventListener("input", renderUserInitiatives);
  $("#user-status-filter").addEventListener("change", renderUserInitiatives);
  $("#user-clear-filters").addEventListener("click", () => {
    $("#user-search").value = "";
    $("#user-status-filter").value = "";
    renderUserInitiatives();
  });

  $("#admin-search").addEventListener("input", () => {
    adminQuickFilter = "";
    renderAdminPortfolio();
  });
  ["#admin-department-filter", "#admin-status-filter", "#admin-pillar-filter", "#admin-risk-filter"].forEach(selector =>
    $(selector).addEventListener("change", () => {
      adminQuickFilter = "";
      renderAdminPortfolio();
    })
  );
  $("#admin-clear-filters").addEventListener("click", clearAdminFilters);
  $("#continuity-type-filter").addEventListener("change", renderContinuityRegister);
  $("#continuity-search").addEventListener("input", renderContinuityRegister);
  $("#continuity-clear-filters").addEventListener("click", () => {
    $("#continuity-type-filter").value = "";
    $("#continuity-search").value = "";
    renderContinuityRegister();
  });

  $("#admin-create-user-form").addEventListener("submit", createUserAsAdmin);
  $("#generate-password-button").addEventListener("click", generateTemporaryPassword);
  $("#refresh-admin-data").addEventListener("click", loadAdminData);
  $("#admin-overview-refresh").addEventListener("click", loadAdminData);
  $("#admin-portfolio-refresh").addEventListener("click", loadAdminData);
  $("#admin-export-portfolio").addEventListener("click", exportAdminPortfolioCsv);
  $("#admin-download-template").addEventListener("click", downloadExcelImportTemplate);
  $("#admin-import-excel").addEventListener("click", openExcelImportModal);
  $$('[data-management-view]').forEach(button =>
    button.addEventListener('click', () => applyManagementView(button.dataset.managementView))
  );
  $("#admin-user-search").addEventListener("input", renderAdminUsers);
  $("#admin-user-role-filter").addEventListener("change", renderAdminUsers);
  $("#admin-user-password-filter").addEventListener("change", renderAdminUsers);
  $("#admin-clear-user-filters").addEventListener("click", clearAdminUserFilters);
  $$("[data-pillar-metric]").forEach(button =>
    button.addEventListener("click", () => {
      pillarMetric = button.dataset.pillarMetric;
      $$("[data-pillar-metric]").forEach(item => item.classList.toggle("active", item === button));
      renderExecutivePillarChart();
    })
  );

  $("#initiative-form").addEventListener("submit", saveInitiative);
  $("#close-initiative-modal").addEventListener("click", () => requestCloseInitiativeModal());
  $("#cancel-initiative-modal").addEventListener("click", saveDraftAndCloseInitiativeModal);
  $("#initiative-save-draft").addEventListener("click", () => saveInitiativeDraft({ announce: true }));
  $("#initiative-clear-draft").addEventListener("click", discardActiveInitiativeDraft);
  $("#initiative-restore-draft").addEventListener("click", restorePendingInitiativeDraft);
  $("#initiative-discard-recovery").addEventListener("click", discardPendingInitiativeDraft);
  $("#initiative-modal").addEventListener("mousedown", event => {
    if (event.target === event.currentTarget) {
      setInitiativeDraftStatus("The form remains open. Use Save Draft & Close when you are finished.", "safe");
    }
  });
  document.addEventListener("keydown", handleInitiativeModalKeydown);
  window.addEventListener("beforeunload", handleInitiativeBeforeUnload);

  $("#close-excel-import").addEventListener("click", closeExcelImportModal);
  $("#cancel-excel-import").addEventListener("click", closeExcelImportModal);
  $("#excel-import-modal").addEventListener("mousedown", event => {
    if (event.target === event.currentTarget) closeExcelImportModal();
  });
  $("#excel-import-file").addEventListener("change", handleExcelImportFileSelection);
  $("#excel-download-template").addEventListener("click", downloadExcelImportTemplate);
  $("#excel-validate-file").addEventListener("click", reviewExcelImportFile);
  $("#confirm-excel-import").addEventListener("click", importPreparedExcelRows);
  ["#excel-import-created-by", "#excel-import-owner", "#excel-import-pillar", "#excel-import-year", "#excel-import-skip-duplicates"].forEach(selector =>
    $(selector).addEventListener("change", () => {
      if (excelImportRawRows.length) prepareExcelImportRows();
    })
  );
  document.addEventListener("keydown", handleExcelImportKeydown);
  $("#initiative-next-step").addEventListener("click", nextInitiativeStep);
  $("#initiative-previous-step").addEventListener("click", previousInitiativeStep);
  $$(".initiative-step").forEach(button =>
    button.addEventListener("click", () => goToInitiativeStep(Number(button.dataset.formStep)))
  );
  $$("#initiative-form input, #initiative-form select, #initiative-form textarea").forEach(element => {
    element.addEventListener("input", () => {
      updateInitiativeFormMetrics();
      renderBudgetSummary();
      markInitiativeFormChanged();
    });
    element.addEventListener("change", () => {
      updateInitiativeFormMetrics();
      renderBudgetSummary();
      markInitiativeFormChanged();
    });
  });
  $$(".evidence-status").forEach(element =>
    element.addEventListener("change", updateEvidencePresentation)
  );
}

function scheduleAuthRoute(session) {
  const revision = ++authRouteRevision;
  const user = session?.user ?? null;

  if (authRouteTimer) window.clearTimeout(authRouteTimer);

  // Defer database work until the auth state-change callback has fully returned.
  authRouteTimer = window.setTimeout(async () => {
    authRouteTimer = null;
    if (revision !== authRouteRevision) return;

    currentUser = user;

    try {
      await routeSession(revision);
    } catch (error) {
      console.error("HOME31 session routing failed", error);
      if (revision !== authRouteRevision) return;
      resetSessionState();
      showAuth();
      showToast(error?.message || "Unable to open your HOME31 workspace. Please sign in again.", true);
    }
  }, 0);
}

function isCurrentAuthRoute(revision, userId = null) {
  return revision === authRouteRevision &&
    (!userId || currentUser?.id === userId);
}

function resetSessionState() {
  currentUser = null;
  currentProfile = null;
  userProjects = [];
  adminProjects = [];
  adminProfiles = [];
  destroyCharts();
  document.body.classList.remove("super-admin-shell", "admin-command-active");
  closeSidebarDrawer();
  $("#initiative-modal")?.classList.add("hidden");
  $("#excel-import-modal")?.classList.add("hidden");
  if (initiativeDraftTimer) window.clearTimeout(initiativeDraftTimer);
  initiativeDraftTimer = null;
  initiativeFormDirty = false;
  activeInitiativeDraftKey = null;
  pendingInitiativeDraft = null;
  excelImportRawRows = [];
  excelImportPreparedRows = [];
}

async function routeSession(revision = authRouteRevision) {
  const routeUser = currentUser;

  if (!routeUser) {
    resetSessionState();
    showAuth();
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", routeUser.id)
    .maybeSingle();

  if (!isCurrentAuthRoute(revision, routeUser.id)) return;

  if (error || !profile) {
    showToast(error?.message || "Unable to load your user profile.", true);
    await supabase.auth.signOut();
    return;
  }

  currentProfile = profile;

  if (profile.account_status !== "active") {
    showToast(`This account is ${profile.account_status || "not active"}. Contact a HOME31 administrator.`, true);
    await supabase.auth.signOut();
    return;
  }

  if (profile.must_change_password) {
    showForcedPassword();
    return;
  }

  await openPlatform(revision, routeUser.id);
}

function showAuth() {
  $("#auth-screen").classList.remove("hidden");
  $("#force-password-screen").classList.add("hidden");
  $("#platform").classList.add("hidden");
  toggleAuthCard("login");
}

function showForcedPassword() {
  $("#auth-screen").classList.add("hidden");
  $("#force-password-screen").classList.remove("hidden");
  $("#platform").classList.add("hidden");
}

async function openPlatform(revision = authRouteRevision, userId = currentUser?.id) {
  if (!isCurrentAuthRoute(revision, userId) || !currentProfile) return;

  renderIdentity();
  applyDepartmentProfileControl();
  await loadUserProjects();
  if (!isCurrentAuthRoute(revision, userId)) return;

  const isSuperAdmin = currentProfile.role === "super_admin";
  document.body.classList.toggle("super-admin-shell", isSuperAdmin);

  if (isSuperAdmin) {
    $("#user-nav").classList.add("hidden");
    $("#admin-nav").classList.remove("hidden");
    $("#initiative-owner-field").classList.remove("hidden");
    await loadAdminData();
    if (!isCurrentAuthRoute(revision, userId)) return;
  } else {
    $("#user-nav").classList.remove("hidden");
    $("#admin-nav").classList.add("hidden");
    $("#initiative-owner-field").classList.add("hidden");
  }

  $("#auth-screen").classList.add("hidden");
  $("#force-password-screen").classList.add("hidden");
  $("#platform").classList.remove("hidden");
  const defaultModule = isSuperAdmin ? "admin-overview" : "user-home";
  const targetModule = resolveRestoredModule(defaultModule, isSuperAdmin);
  showModule(targetModule, { preserveScroll: true, restore: true });
  restoreWorkspaceScroll(targetModule);
}

function renderIdentity() {
  const name = currentProfile.full_name || currentUser.email;
  $("#sidebar-name").textContent = name;
  $("#sidebar-role").textContent = labelRole(currentProfile.role);
  $("#sidebar-avatar").textContent = initials(name);
  $("#welcome-title").textContent = `Welcome, ${name.split(" ")[0] || "User"}.`;
  $("#welcome-role").textContent = labelRole(currentProfile.role);
  $("#account-full-name").value = currentProfile.full_name || "";
  $("#account-email").value = currentUser.email || "";
  $("#account-department").value = currentProfile.department || "";
}

async function login(event) {
  event.preventDefault();
  if (!configured) return showToast("Configure Supabase in app.js first.", true);

  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Signing in...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: $("#login-email").value.trim(),
    password: $("#login-password").value
  });

  button.disabled = false;
  button.textContent = "Sign in";

  if (error) return showToast(error.message, true);
  $("#login-form").reset();
  scheduleAuthRoute(data.session);
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) return showToast(error.message || "Unable to sign out.", true);

  authRouteRevision += 1;
  if (authRouteTimer) {
    window.clearTimeout(authRouteTimer);
    authRouteTimer = null;
  }

  clearWorkspaceState();
  resetSessionState();
  showAuth();
}

function toggleAuthCard(target) {
  $("#login-form").classList.toggle("hidden", target !== "login");
  $("#forgot-password-form").classList.toggle("hidden", target !== "forgot");
}

async function sendPasswordReset(event) {
  event.preventDefault();
  const { error } = await supabase.auth.resetPasswordForEmail(
    $("#forgot-email").value.trim(),
    { redirectTo: AUTH_REDIRECT_URL }
  );
  if (error) return showToast(error.message, true);
  showToast("Password reset email sent.");
  toggleAuthCard("login");
}

function handleResetLink() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.get("type") === "recovery") {
    window.setTimeout(() => showModule("account"), 700);
  }
}

async function completeForcedPasswordChange(event) {
  event.preventDefault();
  const password = $("#force-new-password").value;
  const confirm = $("#force-confirm-password").value;

  if (password !== confirm) return showToast("The passwords do not match.", true);
  if (!isStrongPassword(password)) {
    return showToast("Use at least 10 characters with uppercase, lowercase, number and symbol.", true);
  }

  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Updating...";

  const error = await changeOwnPassword(password);

  button.disabled = false;
  button.textContent = "Change Password & Continue";
  if (error) return showToast(error, true);

  currentProfile.must_change_password = false;
  currentProfile.password_changed_at = new Date().toISOString();
  $("#force-password-form").reset();
  showToast("Password changed successfully.");
  await openPlatform();
}

function updatePasswordStrength() {
  const password = $("#force-new-password").value;
  let score = 0;
  if (password.length >= 10) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[a-z]/.test(password) && /\d/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  $("#password-strength span").style.width = `${score}%`;
}

function isStrongPassword(password) {
  return password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

async function updateProfile(event) {
  event.preventDefault();
  const updates = {
    full_name: $("#account-full-name").value.trim(),
    updated_at: new Date().toISOString()
  };

  if (currentProfile?.role === "super_admin") {
    updates.department = $("#account-department").value.trim();
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", currentUser.id);
  if (error) return showToast(error.message, true);

  Object.assign(currentProfile, updates);
  renderIdentity();
  applyDepartmentProfileControl();
  await loadUserProjects();
  showToast("Profile updated.");
}

async function updatePasswordFromAccount(event) {
  event.preventDefault();
  const password = $("#account-new-password").value;
  const confirm = $("#account-confirm-password").value;

  if (password !== confirm) return showToast("The passwords do not match.", true);
  if (!isStrongPassword(password)) {
    return showToast("Use at least 10 characters with uppercase, lowercase, number and symbol.", true);
  }

  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Updating...";
  const error = await changeOwnPassword(password);
  button.disabled = false;
  button.textContent = "Update Password";

  if (error) return showToast(error, true);
  $("#change-password-form").reset();
  showToast("Password updated successfully.");
}

async function changeOwnPassword(password) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return "Your session has expired. Sign in again.";

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/change-own-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ password })
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok ? null : (payload.error || `Password update failed with HTTP ${response.status}.`);
  } catch (_error) {
    return "Unable to reach the protected password service.";
  }
}

function showModule(name, options = {}) {
  rememberCurrentModuleScroll();
  $$(".module").forEach(module => module.classList.remove("active"));
  $$(".nav-item").forEach(button => button.classList.remove("active"));

  const module = $(`#module-${name}`);
  const matchingNavItems = $$(`.nav-item[data-module="${name}"]`);
  const nav = matchingNavItems.find(button => !button.closest(".hidden")) || matchingNavItems[0];
  if (!module) return;

  module.classList.add("active");
  nav?.classList.add("active");
  $("#page-title").textContent = nav?.querySelector("b")?.textContent || "HOME31";
  if (isMobileNavigation()) closeSidebarDrawer();
  document.body.classList.toggle("admin-command-active", name.startsWith("admin-"));
  const yearAwareModules = ["admin-overview", "admin-portfolio", "admin-exceptions"];
  $("#admin-year-control").classList.toggle("hidden", !yearAwareModules.includes(name));
  saveWorkspaceModule(name);
  if (!options.preserveScroll) {
    window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
  }

  if (name === "user-home") renderUserDashboard();
  if (name === "my-initiatives") renderUserInitiatives();
  if (name === "readiness") renderReadiness();
  if (name === "admin-overview") renderAdminOverview();
  if (name === "admin-portfolio") renderAdminPortfolio();
  if (name === "admin-users") renderAdminUsers();
  if (name === "admin-exceptions") renderAdminExceptions();
  if (name === "admin-overview") applyExecutiveTab(activeExecutiveTab, { focus: false, persist: false, preserveViewport: false });
  window.setTimeout(() => Object.values(charts).forEach(chart => chart?.resize?.()), 80);
}

/* ================================================================
   V7.9.5 DEPARTMENT END-USER WORKSPACE
   ================================================================ */
function normaliseDepartmentValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function departmentProjectIsOwn(project) {
  return Boolean(project && currentUser?.id && project.created_by === currentUser.id);
}

function departmentBudgetConfirmed(project) {
  return project?.approved_budget !== null && project?.approved_budget !== undefined && project?.approved_budget !== "";
}

function departmentApprovedBudget(project) {
  return departmentBudgetConfirmed(project) ? Number(project.approved_budget || 0) : 0;
}

function departmentProjectIsOverdue(project) {
  if (!project?.target_date || project.status === "Completed") return false;
  const target = new Date(`${project.target_date}T23:59:59`);
  return !Number.isNaN(target.getTime()) && target.getTime() < Date.now();
}

function departmentRiskRank(project) {
  const map = { Extreme: 4, High: 3, Medium: 2, Low: 1 };
  return (map[project?.risk_level] || 0) + (project?.status === "At Risk" ? 2 : 0) + (departmentProjectIsOverdue(project) ? 1 : 0);
}

function departmentProjectSearchText(project) {
  return [
    project.initiative_name,
    project.project_description,
    project.accountable_owner,
    project.executive_sponsor,
    project.delivery_lead,
    project.strategic_pillar,
    project.status,
    project.risk_level
  ].join(" ").toLowerCase();
}

async function loadUserProjects() {
  if (currentProfile?.role === "super_admin") {
    userProjects = [];
    return;
  }

  const department = String(currentProfile?.department || "").trim();
  if (!department) {
    userProjects = [];
    renderUserDashboard();
    renderUserInitiatives();
    renderReadiness();
    return;
  }

  const { data, error } = await supabase
    .from("initiatives")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return showToast(error.message, true);

  const departmentKey = normaliseDepartmentValue(department);
  userProjects = (data || []).filter(project => normaliseDepartmentValue(project.department) === departmentKey);
  renderUserDashboard();
  renderUserInitiatives();
  renderReadiness();
}

function renderUserDashboard() {
  if (currentProfile?.role === "super_admin") return;

  const department = String(currentProfile?.department || "").trim();
  const total = userProjects.length;
  const inProgress = userProjects.filter(project => project.status === "In Progress").length;
  const atRisk = userProjects.filter(project => project.status === "At Risk" || ["High", "Extreme"].includes(project.risk_level)).length;
  const averageProgress = total ? Math.round(userProjects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / total) : 0;
  const averageReadiness = total ? Math.round(userProjects.reduce((sum, project) => sum + Number(project.readiness_score || 0), 0) / total) : 0;
  const budgetConfirmed = userProjects.filter(departmentBudgetConfirmed);
  const approvedBudget = budgetConfirmed.reduce((sum, project) => sum + departmentApprovedBudget(project), 0);
  const budgetCoverage = total ? Math.round(budgetConfirmed.length / total * 100) : 0;
  const overdue = userProjects.filter(departmentProjectIsOverdue).length;
  const ownCount = userProjects.filter(departmentProjectIsOwn).length;
  const ownerCount = new Set(userProjects.map(project => String(project.accountable_owner || "").trim()).filter(Boolean)).size;

  $("#user-department-name").textContent = department || "Department not assigned";
  $("#welcome-copy").textContent = department
    ? `Live department view for ${department}. All initiatives in this department are visible; you may edit only records you created.`
    : "Your profile does not have a department. Ask a HOME31 administrator to assign one before using the portfolio.";

  const note = $("#user-department-access-note");
  note.classList.toggle("warning", !department);
  note.innerHTML = department
    ? `<strong>Department-level access:</strong> showing ${total} initiative${total === 1 ? "" : "s"} assigned to <strong>${escapeHtml(department)}</strong>. Shared records are view-only; your own records remain editable.`
    : "<strong>Department assignment required.</strong> No portfolio data is shown until an administrator assigns your account to a department.";

  $("#user-kpi-total").textContent = total;
  $("#user-kpi-progress").textContent = inProgress;
  $("#user-kpi-risk").textContent = atRisk;
  $("#user-kpi-average").textContent = `${averageProgress}%`;
  $("#user-kpi-readiness").textContent = `${averageReadiness}%`;
  $("#user-kpi-budget").textContent = compactRinggit(approvedBudget);
  $("#user-kpi-budget-coverage").textContent = `${budgetCoverage}%`;
  $("#user-kpi-overdue").textContent = overdue;
  $("#user-contribution-count").textContent = ownCount;
  $("#user-shared-count").textContent = Math.max(0, total - ownCount);
  $("#user-budget-confirmed-count").textContent = budgetConfirmed.length;
  $("#user-department-owner-count").textContent = ownerCount;

  $("#user-recent-table tbody").innerHTML = total
    ? userProjects.slice(0, 8).map(project => `
      <tr>
        <td><strong>${escapeHtml(project.initiative_name)}</strong><small>${escapeHtml(project.strategic_pillar || "Pillar not recorded")}</small></td>
        <td>${escapeHtml(project.accountable_owner || "Not recorded")}</td>
        <td><span class="status-pill">${escapeHtml(project.status || "Not recorded")}</span></td>
        <td><span class="risk-pill">${escapeHtml(project.risk_level || "Not recorded")}</span></td>
        <td>${departmentBudgetConfirmed(project) ? formatRinggit(project.approved_budget) : "Not confirmed"}</td>
        <td>${Number(project.readiness_score || 0)}%</td>
        <td>${progressBar(project.progress)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="7">No initiatives are currently assigned to this department.</td></tr>';

  const gaps = userProjects
    .filter(project => Number(project.readiness_score || 0) < 70)
    .sort((a, b) => Number(a.readiness_score || 0) - Number(b.readiness_score || 0));
  $("#user-gap-list").innerHTML = gaps.length
    ? gaps.slice(0, 6).map(project => futureItem(project, `${Number(project.readiness_score || 0)}% readiness · ${project.accountable_owner || "Owner not recorded"}`)).join("")
    : '<div class="notice blue">No department initiatives are below 70% readiness.</div>';

  const attention = userProjects
    .filter(project => departmentRiskRank(project) >= 3 || Number(project.readiness_score || 0) < 70)
    .sort((a, b) => departmentRiskRank(b) - departmentRiskRank(a) || Number(a.readiness_score || 0) - Number(b.readiness_score || 0));
  $("#user-attention-list").innerHTML = attention.length
    ? attention.slice(0, 7).map(project => {
        const reasons = [
          project.status === "At Risk" ? "At-risk status" : "",
          ["High", "Extreme"].includes(project.risk_level) ? `${project.risk_level} risk` : "",
          departmentProjectIsOverdue(project) ? "Overdue" : "",
          Number(project.readiness_score || 0) < 70 ? `${Number(project.readiness_score || 0)}% ready` : ""
        ].filter(Boolean);
        return `<article class="department-attention-item"><div><strong>${escapeHtml(project.initiative_name)}</strong><span>${escapeHtml(project.accountable_owner || "Owner not recorded")} · ${escapeHtml(reasons.join(" · "))}</span></div><em>${escapeHtml(project.next_action || "Review required")}</em></article>`;
      }).join("")
    : '<div class="notice blue">No current risk, overdue or low-readiness exception requires attention.</div>';

  renderUserStatusChart();
  renderUserRiskChart();
  renderUserPillarChart();
}

function renderUserStatusChart() {
  charts.userStatus?.destroy();
  const canvas = $("#user-status-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const statuses = ["Planning", "In Progress", "At Risk", "On Hold", "Completed"];
  charts.userStatus = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: statuses,
      datasets: [{
        data: statuses.map(status => userProjects.filter(project => project.status === status).length),
        backgroundColor: [EXECUTIVE_COLORS.blue, EXECUTIVE_COLORS.teal, EXECUTIVE_COLORS.red, EXECUTIVE_COLORS.amber, EXECUTIVE_COLORS.green],
        borderWidth: 0
      }]
    },
    options: { ...baseChartOptions(), cutout: "62%" }
  });
}

function renderUserRiskChart() {
  charts.userRisk?.destroy();
  const canvas = $("#user-risk-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const levels = ["Low", "Medium", "High", "Extreme"];
  charts.userRisk = new Chart(canvas, {
    type: "bar",
    data: {
      labels: levels,
      datasets: [{
        label: "Initiatives",
        data: levels.map(level => userProjects.filter(project => project.risk_level === level).length),
        backgroundColor: [EXECUTIVE_COLORS.green, EXECUTIVE_COLORS.blue, EXECUTIVE_COLORS.amber, EXECUTIVE_COLORS.red],
        borderRadius: 7
      }]
    },
    options: {
      ...baseChartOptions(),
      plugins: { ...baseChartOptions().plugins, legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderUserPillarChart() {
  charts.userPillar?.destroy();
  const canvas = $("#user-pillar-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const values = pillars.map(pillar => ({
    pillar,
    count: userProjects.filter(project => project.strategic_pillar === pillar).length
  }));
  charts.userPillar = new Chart(canvas, {
    type: "bar",
    data: {
      labels: values.map(item => shortPillar(item.pillar)),
      datasets: [{ label: "Initiatives", data: values.map(item => item.count), backgroundColor: EXECUTIVE_COLORS.teal, borderRadius: 7 }]
    },
    options: {
      ...baseChartOptions(),
      indexAxis: "y",
      plugins: { ...baseChartOptions().plugins, legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function departmentInitiativeCard(project) {
  const own = departmentProjectIsOwn(project);
  const dates = [project.start_date, project.target_date].filter(Boolean).join(" → ") || "Dates not recorded";
  return `
    <article class="initiative-card department-initiative-card ${own ? "own-record" : "shared-record"}">
      <div class="initiative-card-head">
        <div>
          <strong>${escapeHtml(project.initiative_name)}</strong>
          <span>${escapeHtml(project.strategic_pillar || "Pillar not recorded")} · ${escapeHtml(project.accountable_owner || "Project owner not recorded")}</span>
        </div>
        <span class="status-pill">${escapeHtml(project.status || "Not recorded")}</span>
      </div>
      <span>${escapeHtml(project.initiative_category || "Category not recorded")} · ${escapeHtml(project.system_type || "System not recorded")} · ${escapeHtml(project.priority_status || "Priority not assessed")}</span>
      <span>Risk: ${escapeHtml(project.risk_level || "Not recorded")} · Department: ${escapeHtml(project.department || "Not recorded")}</span>
      <div class="department-card-metrics">
        <article><span>Approved Budget</span><strong>${departmentBudgetConfirmed(project) ? formatRinggit(project.approved_budget) : "Not confirmed"}</strong></article>
        <article><span>Readiness</span><strong>${Number(project.readiness_score || 0)}%</strong></article>
        <article><span>Progress</span><strong>${Number(project.progress || 0)}%</strong></article>
        <article><span>Evidence</span><strong>${Number(project.evidence_completeness || 0)}%</strong></article>
      </div>
      <details class="department-record-details">
        <summary>View comprehensive record summary</summary>
        <div class="department-record-details-grid">
          <article><span>Description</span><strong>${escapeHtml(project.project_description || project.problem_opportunity || "Not recorded")}</strong></article>
          <article><span>Executive sponsor</span><strong>${escapeHtml(project.executive_sponsor || "Not recorded")}</strong></article>
          <article><span>Delivery lead</span><strong>${escapeHtml(project.delivery_lead || "Not recorded")}</strong></article>
          <article><span>Delivery dates</span><strong>${escapeHtml(dates)}</strong></article>
          <article><span>Strategic priority area</span><strong>${escapeHtml(project.strategic_priority_area || "Not recorded")}</strong></article>
          <article><span>ICT classification</span><strong>${escapeHtml(project.ict_classification || "Not recorded")}</strong></article>
          <article><span>CBA ratio</span><strong>${project.cba_ratio ?? "Not recorded"}</strong></article>
          <article><span>Next action</span><strong>${escapeHtml(project.next_action || "Not recorded")}</strong></article>
        </div>
      </details>
      ${own ? `
        <div class="initiative-actions">
          <button class="button secondary small" data-edit-project="${project.id}" type="button">Edit My Record</button>
          <button class="button light small" data-delete-project="${project.id}" type="button">Delete</button>
        </div>
      ` : '<span class="department-record-access">Shared department record · view only</span>'}
    </article>
  `;
}

function renderUserInitiatives() {
  const query = ($("#user-search").value || "").toLowerCase();
  const status = $("#user-status-filter").value || "";
  const filtered = userProjects.filter(project =>
    (!query || departmentProjectSearchText(project).includes(query)) &&
    (!status || project.status === status)
  );

  if ($("#department-initiative-count")) {
    $("#department-initiative-count").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
  }
  $("#user-initiative-list").innerHTML = filtered.length
    ? filtered.map(departmentInitiativeCard).join("")
    : '<div class="notice blue">No department initiatives match the selected filters.</div>';

  $('[data-edit-project]').forEach(button =>
    button.addEventListener("click", () => openInitiativeModal(button.dataset.editProject))
  );
  $('[data-delete-project]').forEach(button =>
    button.addEventListener("click", () => deleteInitiative(button.dataset.deleteProject))
  );
}

function renderReadiness() {
  const total = userProjects.length;
  const average = total ? Math.round(userProjects.reduce((sum, project) => sum + Number(project.readiness_score || 0), 0) / total) : 0;
  const low = userProjects.filter(project => Number(project.readiness_score || 0) < 70).length;
  const hr = userProjects.filter(project => ["Required", "To be confirmed"].includes(project.hr_collaboration_status)).length;
  const risk = userProjects.filter(project => ["High", "Extreme"].includes(project.risk_level)).length;

  $("#readiness-average").textContent = `${average}%`;
  $("#readiness-low").textContent = low;
  $("#readiness-hr").textContent = hr;
  $("#readiness-risk").textContent = risk;

  $("#readiness-list").innerHTML = userProjects.length
    ? [...userProjects].sort((a, b) => Number(a.readiness_score || 0) - Number(b.readiness_score || 0)).map(project => `
      <article class="readiness-card">
        <div class="initiative-card-head">
          <div>
            <strong>${escapeHtml(project.initiative_name)}</strong>
            <span>${escapeHtml(project.accountable_owner || "Project owner not recorded")} · ${escapeHtml(project.strategic_pillar || "Pillar not recorded")} · ${escapeHtml(project.risk_level || "Not recorded")} risk</span>
          </div>
          <span class="status-pill">${Number(project.readiness_score || 0)}% ready</span>
        </div>
        <div class="progress-track"><span style="width:${Number(project.readiness_score || 0)}%"></span></div>
        <span>HR collaboration: ${escapeHtml(project.hr_collaboration_status || "Not required")} · People impact: ${escapeHtml(project.people_impact_level || "Not assessed")}</span>
        <span>Training plan: ${escapeHtml(project.training_plan_status || "Not assessed")} · Change plan: ${escapeHtml(project.change_plan_status || "Not assessed")} · Evidence: ${Number(project.evidence_completeness || 0)}%</span>
      </article>
    `).join("")
    : '<div class="notice blue">No department initiatives are available.</div>';
}

async function loadAdminData() {
  if (currentProfile?.role !== "super_admin") return;

  const [projectsResponse, profilesResponse] = await Promise.all([
    supabase.from("initiatives").select("*").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
  ]);

  if (projectsResponse.error) return showToast(projectsResponse.error.message, true);
  if (profilesResponse.error) return showToast(profilesResponse.error.message, true);

  adminProjects = projectsResponse.data || [];
  adminProfiles = profilesResponse.data || [];
  populateAdminYearOptions();
  populateOwnerOptions();
  populateAdminDepartmentOptions();
  renderAdminOverview();
  renderAdminPortfolio();
  renderAdminUsers();
  renderAdminExceptions();
}



function populateAdminDepartmentOptions() {
  const select = $("#admin-department-filter");
  if (!select) return;
  const current = select.value;
  const departments = [...new Set(adminProjects
    .map(project => String(project.department || "").trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  select.innerHTML = [
    '<option value="">All departments</option>',
    ...departments.map(department => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`)
  ].join("");
  if (departments.includes(current)) select.value = current;
}

function deriveHome31Fit(project) {
  if (!project.strategic_pillar || !project.project_description) return "Needs Validation";
  if (project.home31_fit_override) return project.home31_fit_override;
  if (project.initiative_category === "Business as usual") return "BAU · Supporting Enhancement";
  if (["Strategic Priority", "Corporate Priority"].includes(project.priority_status) || project.priority === "Strategic") {
    return "Core Initiative";
  }
  if ((project.system_type && project.system_type !== "Non System") ||
      !["N/A", "None", null, undefined, ""].includes(project.ict_classification)) {
    return "Enabler";
  }
  if (project.strategic_thrust === "Good Governance" && project.priority_status === "Watchlist / Under Review") {
    return "Policy Review";
  }
  return "Supporting Activity";
}







function bindExecutiveRecordButtons() {
  $$("[data-executive-open]").forEach(button =>
    button.addEventListener("click", () => openInitiativeModal(button.dataset.executiveOpen))
  );
}

function initialiseExecutiveInteractions() {
  $$('[data-kpi-action]').forEach(card => {
    const activate = () => handleExecutiveNavigation(card.dataset.kpiAction);
    card.addEventListener('click', activate);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });

  $$('[data-executive-route]').forEach(button =>
    button.addEventListener('click', () => handleExecutiveNavigation(button.dataset.executiveRoute))
  );

  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(EXECUTIVE_PANEL_STATE_KEY) || '[]');
  } catch (_error) {
    stored = [];
  }
  const collapsed = new Set(Array.isArray(stored) ? stored : []);

  $$('#module-admin-overview .chart-panel').forEach((panel, index) => {
    const key = panel.id || panel.querySelector('canvas')?.id || `executive-panel-${index + 1}`;
    panel.dataset.panelKey = key;
    const heading = panel.querySelector('.executive-panel-heading');
    if (!heading || heading.querySelector('.executive-panel-collapse')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'executive-panel-collapse';
    button.setAttribute('aria-controls', key);
    if (collapsed.has(key)) panel.classList.add('panel-collapsed');
    updateExecutivePanelButton(panel, button);
    button.addEventListener('click', () => {
      panel.classList.toggle('panel-collapsed');
      const active = new Set();
      $$('#module-admin-overview .chart-panel.panel-collapsed').forEach(item => active.add(item.dataset.panelKey));
      try {
        localStorage.setItem(EXECUTIVE_PANEL_STATE_KEY, JSON.stringify([...active]));
      } catch (_error) {
        // The interaction still works when storage is unavailable.
      }
      updateExecutivePanelButton(panel, button);
      if (!panel.classList.contains('panel-collapsed')) {
        window.setTimeout(() => Object.values(charts).forEach(chart => chart?.resize?.()), 80);
      }
    });
    heading.appendChild(button);
  });
}

function updateExecutivePanelButton(panel, button) {
  const collapsed = panel.classList.contains('panel-collapsed');
  button.textContent = collapsed ? 'Show chart' : 'Hide chart';
  button.setAttribute('aria-expanded', String(!collapsed));
}

function resetAdminFilterControls() {
  $('#admin-search').value = '';
  $('#admin-department-filter').value = '';
  $('#admin-status-filter').value = '';
  $('#admin-pillar-filter').value = '';
  $('#admin-risk-filter').value = '';
}

function handleExecutiveNavigation(action) {
  if (currentProfile?.role !== 'super_admin') return;

  if (action === 'scroll-budget') {
    $('#executive-budget-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const map = {
    all: '',
    budget: 'cost-populated',
    readiness: 'readiness-followup',
    delivery: 'active',
    matrix: 'cost-benefit',
    'readiness-followup': 'readiness-followup',
    'cost-populated': 'cost-populated',
    priority: 'priority',
    risk: 'risk',
    'approved-populated': 'approved-populated',
    'budget-gaps': 'budget-gaps'
  };

  adminQuickFilter = map[action] ?? '';
  resetAdminFilterControls();
  showModule('admin-portfolio');
}

function matchesAdminQuickFilter(project) {
  switch (adminQuickFilter) {
    case 'readiness-followup':
      return calculateProjectReadiness(project).score < 100;
    case 'cost-populated':
      return hasPortfolioCost(project);
    case 'priority':
      return normalizePriorityGroup(project) === 'Strategic Priority';
    case 'risk':
      return project.status === 'At Risk' || ['High', 'Extreme'].includes(project.risk_level);
    case 'approved-populated':
      return financialFieldConfirmed(project, 'approved_budget');
    case 'budget-gaps':
      return !financialFieldConfirmed(project, 'approved_budget');
    case 'active':
      return project.status !== 'Completed';
    case 'cost-benefit':
      return hasPortfolioCost(project) && numericValue(project.cba_ratio) !== null;
    case 'finance-review':
      return managementViewMatches(project, 'finance');
    case 'ict-review':
      return managementViewMatches(project, 'ict');
    case 'watchlist':
      return managementViewMatches(project, 'watchlist');
    case 'missing-information':
      return managementViewMatches(project, 'missing');
    case 'department-readiness':
      return managementViewMatches(project, 'readiness');
    default:
      return true;
  }
}

function adminQuickFilterLabel() {
  return {
    'readiness-followup': 'Readiness follow-up',
    'cost-populated': 'Cost populated',
    priority: 'Strategic priority',
    risk: 'Risk attention',
    'approved-populated': 'Approved budget populated',
    'budget-gaps': 'Approved budget gaps',
    active: 'Active delivery',
    'cost-benefit': 'Cost-benefit assessed',
    'finance-review': 'Finance review',
    'ict-review': 'ICT review',
    watchlist: 'Watchlist',
    'missing-information': 'Missing information',
    'department-readiness': 'Department readiness'
  }[adminQuickFilter] || '';
}

function applyManagementView(view) {
  if (currentProfile?.role !== 'super_admin') return;
  const map = {
    executive: '',
    finance: 'finance-review',
    ict: 'ict-review',
    watchlist: 'watchlist',
    missing: 'missing-information',
    readiness: 'department-readiness'
  };
  adminQuickFilter = map[view] ?? '';
  resetAdminFilterControls();
  showModule('admin-portfolio');
}

function managementViewMatches(project, view) {
  const readiness = Number(project.readiness_score || 0);
  const systemDependent = Boolean(project.system_type && project.system_type !== 'Non System');
  const ictPending = project.ict_classification === 'New - Pending ICT review' || (systemDependent && (!project.ict_classification || ['N/A', 'None'].includes(project.ict_classification)));
  const financePending = !financialFieldConfirmed(project, 'approved_budget') || (financialFieldConfirmed(project, 'approved_budget') && !String(project.finance_remarks || '').trim());
  const watch = ['Watchlist / Under Review', 'Not Assessed'].includes(project.priority_status) || project.status === 'At Risk' || ['High', 'Extreme'].includes(project.risk_level);
  const missing = calculateProjectReadiness(project).score < 100 || !String(project.accountable_owner || '').trim() || !String(project.department || '').trim();
  if (view === 'finance') return financePending;
  if (view === 'ict') return ictPending;
  if (view === 'watchlist') return watch;
  if (view === 'missing') return missing;
  if (view === 'readiness') return readiness < 70;
  return true;
}

function renderManagementViews(records = projectsForYear()) {
  const counts = {
    executive: records.length,
    finance: records.filter(project => managementViewMatches(project, 'finance')).length,
    ict: records.filter(project => managementViewMatches(project, 'ict')).length,
    watchlist: records.filter(project => managementViewMatches(project, 'watchlist')).length,
    missing: records.filter(project => managementViewMatches(project, 'missing')).length,
    readiness: records.filter(project => managementViewMatches(project, 'readiness')).length
  };
  Object.entries(counts).forEach(([key, value]) => {
    const target = $(`#management-view-count-${key}`);
    if (target) target.textContent = `${value} record${value === 1 ? '' : 's'}`;
  });
}

function renderPortfolioActiveFilters() {
  const container = $('#portfolio-active-filters');
  if (!container) return;
  const chips = [];
  if (adminQuickFilter) chips.push({ key: 'quick', label: adminQuickFilterLabel() });
  const query = $('#admin-search').value.trim();
  if (query) chips.push({ key: 'search', label: `Search: ${query}` });
  if ($('#admin-department-filter').value) chips.push({ key: 'department', label: `Department: ${$('#admin-department-filter').value}` });
  if ($('#admin-status-filter').value) chips.push({ key: 'status', label: `Status: ${$('#admin-status-filter').value}` });
  if ($('#admin-pillar-filter').value) chips.push({ key: 'pillar', label: `Pillar: ${shortPillar($('#admin-pillar-filter').value)}` });
  if ($('#admin-risk-filter').value) chips.push({ key: 'risk', label: `Risk: ${$('#admin-risk-filter').value}` });
  if (!chips.length) {
    container.innerHTML = '<span class="portfolio-filter-empty">No active filters. Showing the selected portfolio year.</span>';
    return;
  }
  container.innerHTML = chips.map(chip => `<button class="portfolio-filter-chip" type="button" data-clear-portfolio-filter="${chip.key}"><span>${escapeHtml(chip.label)}</span><b aria-hidden="true">×</b><span class="sr-only">Remove filter</span></button>`).join('');
  $$('[data-clear-portfolio-filter]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.clearPortfolioFilter;
    if (key === 'quick') adminQuickFilter = '';
    if (key === 'search') $('#admin-search').value = '';
    if (key === 'department') $('#admin-department-filter').value = '';
    if (key === 'status') $('#admin-status-filter').value = '';
    if (key === 'pillar') $('#admin-pillar-filter').value = '';
    if (key === 'risk') $('#admin-risk-filter').value = '';
    renderAdminPortfolio();
  }));
}


function executiveChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: EXECUTIVE_COLORS.text,
          usePointStyle: true,
          boxWidth: 9,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "#061b2b",
        titleColor: "#f0f5f8",
        bodyColor: "#b6c8d3",
        borderColor: "#476b84",
        borderWidth: 1,
        padding: 11
      }
    }
  };
}

function executiveCountScales() {
  return {
    x: {
      beginAtZero: true,
      grid: { color: EXECUTIVE_COLORS.grid },
      ticks: { color: EXECUTIVE_COLORS.text, precision: 0 }
    },
    y: {
      beginAtZero: true,
      grid: { color: EXECUTIVE_COLORS.grid },
      ticks: { color: EXECUTIVE_COLORS.text, precision: 0 }
    }
  };
}

function executiveMoneyScales() {
  return {
    x: {
      beginAtZero: true,
      grid: { color: EXECUTIVE_COLORS.grid },
      ticks: { color: EXECUTIVE_COLORS.text, callback: value => compactRinggit(value) }
    },
    y: {
      beginAtZero: true,
      grid: { color: EXECUTIVE_COLORS.grid },
      ticks: { color: EXECUTIVE_COLORS.text, callback: value => compactRinggit(value) }
    }
  };
}

function normalizePriorityGroup(project) {
  const value = project.priority_status;
  if (value === "Strategic Priority" || project.priority === "Strategic") return "Strategic Priority";
  if (value === "Watchlist / Under Review" || value === "Not Assessed") return "Watchlist / Under Review";
  if (value === "Recommended" || value === "Dept Monitoring") return "Recommended";
  return "Not Classified";
}

function financialFieldConfirmed(project, field) {
  const confirmationField = {
    estimated_cost: "estimated_cost_confirmed",
    estimated_cost_post_challenge: "post_challenge_cost_confirmed",
    proposed_budget_post_retreat: "proposed_budget_confirmed",
    approved_budget: "approved_budget_confirmed"
  }[field];
  if (confirmationField && typeof project?.[confirmationField] === "boolean") {
    return project[confirmationField];
  }
  return numericValue(project?.[field]) !== null;
}

function effectiveProjectCost(project) {
  if (financialFieldConfirmed(project, "estimated_cost_post_challenge")) {
    return Number(project.estimated_cost_post_challenge) || 0;
  }
  if (financialFieldConfirmed(project, "estimated_cost")) {
    return Number(project.estimated_cost) || 0;
  }
  return 0;
}


function shortPillar(value) {
  const names = {
    "Financial Sustainability": "Financial Sustainability",
    "Digital & Data Transformation": "Digital & Data",
    "Governance Stewardship": "Governance",
    "Customer Experience Transformation": "Customer Experience",
    "Workforce & Leadership Transformation": "Workforce & Leadership"
  };
  return names[value] || value;
}



function extractProjectDateRange(project) {
  const text = project.action_plan || "";
  const matches = [
    ...text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g),
    ...text.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)
  ];

  const dates = matches.map(match => {
    if (match[1]?.length === 4) return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
    return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`);
  }).filter(date => !Number.isNaN(date.getTime()));

  const fallback = [project.start_date, project.target_date]
    .filter(Boolean)
    .map(value => new Date(`${value}T00:00:00`))
    .filter(date => !Number.isNaN(date.getTime()));

  const all = [...dates, ...fallback].sort((a, b) => a - b);
  if (!all.length) return null;
  return { start: all[0], end: all[all.length - 1] };
}


function compactRinggit(value) {
  const number = Number(value || 0);
  const absolute = Math.abs(number);
  const sign = number < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) return `${sign}RM${(absolute / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${sign}RM${(absolute / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${sign}RM${(absolute / 1_000).toFixed(1)}K`;
  return `${sign}RM${absolute.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}


function aggregateFiltered(records, labelFn, valueFn) {
  const map = new Map();
  records.forEach(record => {
    const label = labelFn(record);
    map.set(label, (map.get(label) || 0) + Number(valueFn(record) || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function clearAdminFilters() {
  adminQuickFilter = "";
  $("#admin-search").value = "";
  $("#admin-status-filter").value = "";
  $("#admin-pillar-filter").value = "";
  $("#admin-risk-filter").value = "";
  renderAdminPortfolio();
}


function renderAdminUsers() {
  if (currentProfile?.role !== "super_admin") return;

  const query = ($("#admin-user-search").value || "").toLowerCase();
  const role = $("#admin-user-role-filter").value || "";
  const passwordStatus = $("#admin-user-password-filter").value || "";

  const filtered = adminProfiles.filter(profile => {
    const haystack = [
      profile.full_name,
      profile.email,
      profile.department,
      labelRole(profile.role)
    ].join(" ").toLowerCase();

    const matchesPassword =
      !passwordStatus ||
      (passwordStatus === "pending" && profile.must_change_password) ||
      (passwordStatus === "complete" && !profile.must_change_password);

    return (!query || haystack.includes(query)) &&
      (!role || profile.role === role) &&
      matchesPassword;
  });

  const total = adminProfiles.length;
  const admins = adminProfiles.filter(profile => profile.role === "super_admin").length;
  const normal = adminProfiles.filter(profile => profile.role === "normal_user").length;
  const pending = adminProfiles.filter(profile => profile.must_change_password).length;
  const departments = new Set(adminProfiles.map(profile => profile.department).filter(Boolean)).size;
  const accessReadiness = total ? Math.round((total - pending) / total * 100) : 0;

  $("#users-kpi-total").textContent = total;
  $("#users-kpi-admins").textContent = admins;
  $("#users-kpi-normal").textContent = normal;
  $("#users-kpi-password").textContent = pending;
  $("#users-kpi-departments").textContent = departments;
  $("#users-kpi-readiness").textContent = `${accessReadiness}%`;
  $("#users-assurance-pending").textContent = pending;
  $("#admin-user-directory-count").textContent = `${filtered.length} user${filtered.length === 1 ? "" : "s"}`;

  $("#admin-user-list").innerHTML = filtered.length
    ? filtered.map(profile => `
      <article class="admin-command-user-card">
        <div>
          <strong>${escapeHtml(profile.full_name || profile.email)}</strong>
          <span>${escapeHtml(profile.email)}</span>
          <span>${escapeHtml(profile.department || "No department")} · Account: ${escapeHtml(profile.account_status || "active")} · Password change: ${profile.must_change_password ? "Required" : "Completed"}</span>
        </div>
        <div>
          <span class="role-pill">${labelRole(profile.role)}</span>
          ${profile.id !== currentUser.id ? `
            <button class="text-button" data-toggle-role="${profile.id}" type="button">
              ${profile.role === "super_admin" ? "Make Normal User" : "Make Super Admin"}
            </button>
            <button class="text-button" data-reset-password="${profile.id}" type="button">Reset temporary password</button>
          ` : '<span>Current account</span>'}
        </div>
      </article>
    `).join("")
    : '<div class="admin-command-empty">No users match the selected filters.</div>';

  $$("[data-toggle-role]").forEach(button =>
    button.addEventListener("click", () => toggleRole(button.dataset.toggleRole))
  );
  $$("[data-reset-password]").forEach(button =>
    button.addEventListener("click", () => resetUserPassword(button.dataset.resetPassword))
  );

  renderAdminUserGovernance();
}

function renderAdminUserGovernance() {
  charts.adminUserRole?.destroy();
  if (typeof Chart !== "undefined") {
    const roles = ["super_admin", "normal_user"];
    const roleLabels = ["Super Admin", "Normal User", "Legacy / unimplemented role"];
    const roleCounts = [
      adminProfiles.filter(profile => profile.role === "super_admin").length,
      adminProfiles.filter(profile => profile.role === "normal_user").length,
      adminProfiles.filter(profile => !roles.includes(profile.role)).length
    ];
    charts.adminUserRole = new Chart($("#admin-user-role-chart"), {
      type: "doughnut",
      data: {
        labels: roleLabels,
        datasets: [{
          data: roleCounts,
          backgroundColor: ["#d1ad63", "#57999b", "#7f99af", "#6ca69b", "#7892a6", "#a76a6f", "#58768b"],
          borderColor: "#102f49",
          borderWidth: 4,
          cutout: "62%"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: EXECUTIVE_COLORS.text, usePointStyle: true, boxWidth: 8, font: { size: 12 } }
          }
        }
      }
    });
  }

  const pending = adminProfiles.filter(profile => profile.must_change_password).length;
  const adminCount = adminProfiles.filter(profile => profile.role === "super_admin").length;
  const noDepartment = adminProfiles.filter(profile => !profile.department).length;
  const duplicateEmails = adminProfiles.length - new Set(adminProfiles.map(profile => String(profile.email || "").toLowerCase())).size;

  $("#admin-user-governance-list").innerHTML = [
    ["Privileged accounts", `${adminCount} super-admin account${adminCount === 1 ? "" : "s"}`, adminCount],
    ["First-login follow-up", `${pending} user${pending === 1 ? "" : "s"} must change password`, pending],
    ["Department incomplete", `${noDepartment} profile${noDepartment === 1 ? "" : "s"} without department`, noDepartment],
    ["Duplicate email check", `${duplicateEmails} duplicate profile email${duplicateEmails === 1 ? "" : "s"}`, duplicateEmails]
  ].map(([title, detail, value]) => `
    <div class="admin-command-list-item">
      <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>
      <em>${value}</em>
    </div>
  `).join("");
}

function clearAdminUserFilters() {
  $("#admin-user-search").value = "";
  $("#admin-user-role-filter").value = "";
  $("#admin-user-password-filter").value = "";
  renderAdminUsers();
}

async function createUserAsAdmin(event) {
  event.preventDefault();
  if (currentProfile?.role !== "super_admin") return;

  const password = $("#admin-user-password").value;
  if (!isStrongPassword(password)) {
    return showToast("Temporary password must contain at least 10 characters with uppercase, lowercase, number and symbol.", true);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return showToast("Your session has expired. Sign in again.", true);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify({
      full_name: $("#admin-user-name").value.trim(),
      department: $("#admin-user-department").value.trim(),
      email: $("#admin-user-email").value.trim().toLowerCase(),
      password
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return showToast(payload.error || `User creation failed with HTTP ${response.status}.`, true);

  $("#admin-create-user-form").reset();
  showToast("Active normal user created. The user must change the temporary password at first login.");
  await loadAdminData();
}

function secureRandomCharacter(characters) {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return characters[value[0] % characters.length];
}

function createStrongTemporaryPassword(length = 16) {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*?"
  ];
  const all = groups.join("");
  const characters = groups.map(secureRandomCharacter);
  while (characters.length < Math.max(10, length)) characters.push(secureRandomCharacter(all));

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    const swapIndex = value[0] % (index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

function generateTemporaryPassword() {
  $("#admin-user-password").value = createStrongTemporaryPassword();
}

async function resetUserPassword(profileId) {
  const profile = adminProfiles.find(item => item.id === profileId);
  if (!profile) return;

  const suggested = createStrongTemporaryPassword();
  const password = window.prompt(
    `Temporary password for ${profile.full_name || profile.email}. You may edit it before continuing:`,
    suggested
  );
  if (password === null) return;
  if (!isStrongPassword(password)) {
    return showToast("Temporary password must contain at least 10 characters with uppercase, lowercase, number and symbol.", true);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return showToast("Your session has expired. Sign in again.", true);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ user_id: profileId, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return showToast(payload.error || `Password reset failed with HTTP ${response.status}.`, true);

    window.prompt("Password reset completed. Copy this temporary password and share it securely:", password);
    showToast("Temporary password assigned. The user must change it at next login.");
    await loadAdminData();
  } catch (_error) {
    showToast("Unable to reach the protected password reset service.", true);
  }
}

async function toggleRole(profileId) {
  const profile = adminProfiles.find(item => item.id === profileId);
  if (!profile) return;

  const newRole = profile.role === "super_admin" ? "normal_user" : "super_admin";
  const { error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: profileId,
    new_role: newRole
  });

  if (error) return showToast(error.message, true);
  showToast(`Role updated to ${labelRole(newRole)}.`);
  await loadAdminData();
}


function renderExceptionList(records, detailBuilder) {
  return records.length
    ? records.slice(0, 8).map(project => `
      <div class="admin-command-list-item">
        <div>
          <strong>${escapeHtml(project.initiative_name)}</strong>
          <span>${escapeHtml(project.department || "No department")} · ${escapeHtml(detailBuilder(project))}</span>
        </div>
        <button data-exception-open="${project.id}" type="button">Open</button>
      </div>
    `).join("")
    : '<div class="admin-command-empty">No records in this category.</div>';
}



function initiativeDraftStorageKey(recordId = "new") {
  return `${INITIATIVE_DRAFT_PREFIX}:${currentUser?.id || "anonymous"}:${recordId || "new"}`;
}

function serializeInitiativeForm() {
  const values = {};
  const form = $("#initiative-form");
  [...form.elements].forEach(element => {
    if (!element.id || element.type === "submit" || element.type === "button") return;
    if (element.type === "checkbox" || element.type === "radio") {
      values[element.id] = Boolean(element.checked);
    } else {
      values[element.id] = element.value;
    }
  });
  return values;
}

function applyInitiativeDraftValues(values = {}) {
  initiativeFormInitialising = true;
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (!element) return;
    if (element.type === "checkbox" || element.type === "radio") {
      element.checked = Boolean(value);
    } else {
      element.value = value ?? "";
    }
  });
  initiativeFormInitialising = false;
  updateEvidencePresentation();
  renderBudgetSummary();
  updateInitiativeFormMetrics();
}

function markInitiativeFormChanged() {
  if (initiativeFormInitialising || $("#initiative-modal").classList.contains("hidden")) return;
  initiativeFormDirty = true;
  setInitiativeDraftStatus("Unsaved changes — saving draft…", "saving");
  if (initiativeDraftTimer) window.clearTimeout(initiativeDraftTimer);
  initiativeDraftTimer = window.setTimeout(() => saveInitiativeDraft(), INITIATIVE_DRAFT_DELAY);
}

function saveInitiativeDraft({ announce = false } = {}) {
  if (!activeInitiativeDraftKey || initiativeFormInitialising) return false;
  if (initiativeDraftTimer) window.clearTimeout(initiativeDraftTimer);
  initiativeDraftTimer = null;

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    recordId: $("#initiative-id").value || null,
    step: currentInitiativeFormStep,
    values: serializeInitiativeForm()
  };

  try {
    localStorage.setItem(activeInitiativeDraftKey, JSON.stringify(payload));
    $("#initiative-clear-draft").classList.remove("hidden");
    setInitiativeDraftStatus(`Draft saved ${formatDraftTimestamp(payload.savedAt)}.`, "saved");
    if (announce) showToast("Initiative draft saved on this device.");
    return true;
  } catch (error) {
    console.error("Unable to save initiative draft", error);
    setInitiativeDraftStatus("Draft could not be saved on this device.", "error");
    if (announce) showToast("Unable to save the draft in this browser.", true);
    return false;
  }
}

function readInitiativeDraft(key = activeInitiativeDraftKey) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft?.values ? draft : null;
  } catch (_error) {
    return null;
  }
}

function removeInitiativeDraft(key = activeInitiativeDraftKey) {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (_error) {
    // Browser storage can be unavailable in restricted environments.
  }
}

function checkForInitiativeDraft(project = null) {
  const draft = readInitiativeDraft();
  if (!draft) {
    $("#initiative-clear-draft").classList.add("hidden");
    return;
  }

  if (project?.updated_at && new Date(draft.savedAt).getTime() <= new Date(project.updated_at).getTime()) {
    removeInitiativeDraft();
    $("#initiative-clear-draft").classList.add("hidden");
    return;
  }

  pendingInitiativeDraft = draft;
  $("#initiative-clear-draft").classList.remove("hidden");
  $("#initiative-draft-recovery-copy").textContent =
    `A draft saved ${formatDraftTimestamp(draft.savedAt)} is available. Restore it or continue with the current record.`;
  $("#initiative-draft-recovery").classList.remove("hidden");
  setInitiativeDraftStatus("Saved draft available for recovery.", "recovery");
}

function restorePendingInitiativeDraft() {
  if (!pendingInitiativeDraft) return;
  applyInitiativeDraftValues(pendingInitiativeDraft.values);
  currentInitiativeFormStep = Math.max(1, Math.min(7, Number(pendingInitiativeDraft.step || 1)));
  renderInitiativeFormStep();
  initiativeFormDirty = true;
  $("#initiative-draft-recovery").classList.add("hidden");
  setInitiativeDraftStatus(`Draft restored from ${formatDraftTimestamp(pendingInitiativeDraft.savedAt)}.`, "saved");
  pendingInitiativeDraft = null;
  showToast("Your unfinished initiative draft has been restored.");
}

function discardPendingInitiativeDraft() {
  removeInitiativeDraft();
  pendingInitiativeDraft = null;
  $("#initiative-draft-recovery").classList.add("hidden");
  $("#initiative-clear-draft").classList.add("hidden");
  setInitiativeDraftStatus("Previous draft discarded. New changes will continue to save automatically.", "safe");
}

function discardActiveInitiativeDraft() {
  removeInitiativeDraft();
  pendingInitiativeDraft = null;
  $("#initiative-draft-recovery").classList.add("hidden");
  $("#initiative-clear-draft").classList.add("hidden");
  setInitiativeDraftStatus(
    initiativeFormDirty
      ? "Saved copy discarded. Current unsaved changes remain in the open form."
      : "Saved draft discarded.",
    "safe"
  );
}

function setInitiativeDraftStatus(message, tone = "safe") {
  const status = $("#initiative-draft-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function formatDraftTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function handleInitiativeBeforeUnload(event) {
  if (!initiativeFormDirty || $("#initiative-modal")?.classList.contains("hidden")) return;
  saveInitiativeDraft();
  event.preventDefault();
  event.returnValue = "";
}

function openInitiativeModal(projectId = null) {
  initiativeFormInitialising = true;
  initiativeFormDirty = false;
  pendingInitiativeDraft = null;
  if (initiativeDraftTimer) window.clearTimeout(initiativeDraftTimer);
  initiativeDraftTimer = null;
  $("#initiative-draft-recovery").classList.add("hidden");
  $("#initiative-clear-draft").classList.add("hidden");
  setInitiativeDraftStatus("Changes will be saved automatically on this device.", "safe");
  $("#initiative-form").reset();
  $("#initiative-id").value = "";
  $("#initiative-year").value = selectedAdminYear === "all" ? "2027" : String(selectedAdminYear);
  $("#initiative-category").value = "New Initiative";
  $("#initiative-priority").value = "High";
  $("#initiative-priority-status").value = "Not Assessed";
  $("#initiative-status").value = "Planning";
  $("#initiative-risk").value = "Medium";
  $("#initiative-system-type").value = "Non System";
  $("#initiative-ict-classification").value = "N/A";
  $("#initiative-home31-fit-override").value = "";
  $("#initiative-progress").value = "0";
  $("#initiative-readiness").value = "50";
  $("#initiative-estimated-cost").value = "";
  $("#initiative-estimated-cost-post-challenge").value = "";
  $("#initiative-proposed-budget").value = "";
  $("#initiative-approved-budget").value = "";
  $("#initiative-hr").value = "Not required";
  $("#initiative-people-impact").value = "Medium";
  $("#initiative-training-required").value = "To be assessed";
  $("#initiative-training-plan-status").value = "Not started";
  $("#initiative-change-required").value = "Yes";
  $("#initiative-change-plan-status").value = "Not started";
  $("#initiative-communication-plan-status").value = "Not started";
  $("#initiative-hr-review-status").value = "Not submitted";
  $("#initiative-created-by").value = currentUser.id;
  if (!projectId && currentProfile?.role !== "super_admin") {
    $("#initiative-owner").value = currentProfile?.full_name || currentUser?.email || "";
  }
  $("#initiative-modal-title").textContent = projectId ? "Edit Initiative" : "Create Initiative";

  const source = currentProfile?.role === "super_admin" ? adminProjects : userProjects;
  const project = source.find(item => String(item.id) === String(projectId));
  activeInitiativeDraftKey = initiativeDraftStorageKey(project?.id || projectId || "new");

  if (project) {
    $("#initiative-id").value = project.id;
    $("#initiative-created-by").value = project.created_by;
    $("#initiative-source-reference").value = project.source_reference_no || "";
    $("#initiative-year").value = project.implementation_year || 2027;
    $("#initiative-name").value = project.initiative_name || "";
    $("#initiative-project-description").value = project.project_description || "";
    $("#initiative-department").value = project.department || "";
    $("#initiative-category").value = project.initiative_category || "New Initiative";
    $("#initiative-priority").value = project.priority || "High";
    $("#initiative-priority-status").value = project.priority_status || "Not Assessed";
    $("#initiative-executive-sponsor").value = project.executive_sponsor || "";
    $("#initiative-owner").value = project.accountable_owner || "";
    $("#initiative-delivery-lead").value = project.delivery_lead || "";
    $("#initiative-start-date").value = project.start_date || "";
    $("#initiative-target-date").value = project.target_date || "";
    $("#initiative-status").value = project.status || "Planning";
    $("#initiative-risk").value = project.risk_level || "Medium";

    $("#initiative-pillar").value = project.strategic_pillar || pillars[0];
    $("#initiative-home31-fit-override").value = project.home31_fit_override || "";
    $("#initiative-strategic-thrust").value = project.strategic_thrust || "Operational Excellence";
    $("#initiative-strategic-priority-area").value = project.strategic_priority_area || "Improving Productivity, Efficiency and Delivery of Service (PEDS)";
    $("#initiative-system-type").value = project.system_type || "Non System";
    $("#initiative-ict-classification").value = project.ict_classification || "N/A";
    $("#initiative-ict-remarks").value = project.ict_remarks || "";

    $("#initiative-problem").value = project.problem_opportunity || "";
    $("#initiative-outcome").value = project.expected_outcome || "";
    $("#initiative-value-measure").value = project.value_measure || "";
    $("#initiative-value-baseline").value = project.value_baseline || "";
    $("#initiative-value-target").value = project.value_target || "";
    $("#initiative-value-frequency").value = project.value_frequency || "Quarterly";
    $("#initiative-value-owner").value = project.value_owner || "";
    $("#initiative-cba-ratio").value = project.cba_ratio ?? "";
    $("#initiative-progress").value = project.progress || 0;
    $("#initiative-readiness").value = project.readiness_score || 0;
    $("#initiative-action-plan").value = project.action_plan || "";
    $("#initiative-next-action").value = project.next_action || "";

    $("#initiative-estimated-cost").value = financialFieldConfirmed(project, "estimated_cost") ? (project.estimated_cost ?? 0) : "";
    $("#initiative-estimated-cost-post-challenge").value = financialFieldConfirmed(project, "estimated_cost_post_challenge") ? (project.estimated_cost_post_challenge ?? 0) : "";
    $("#initiative-proposed-budget").value = financialFieldConfirmed(project, "proposed_budget_post_retreat") ? (project.proposed_budget_post_retreat ?? 0) : "";
    $("#initiative-approved-budget").value = financialFieldConfirmed(project, "approved_budget") ? (project.approved_budget ?? 0) : "";
    $("#initiative-post-challenge-remarks").value = project.post_challenge_remarks || "";
    $("#initiative-finance-remarks").value = project.finance_remarks || "";
    $("#initiative-general-remarks").value = project.general_remarks || "";

    $("#initiative-hr").value = project.hr_collaboration_status || "Not required";
    $("#initiative-people-impact").value = project.people_impact_level || "Medium";
    $("#initiative-affected-groups").value = project.affected_workforce_groups || "";
    $("#initiative-roles-affected").value = project.roles_affected_count || 0;
    $("#initiative-hr-owner").value = project.hr_owner || "";
    $("#initiative-new-roles-required").checked = Boolean(project.new_roles_required);
    $("#initiative-redeployment-required").checked = Boolean(project.redeployment_required);
    $("#initiative-org-design-impact").value = project.organisation_design_impact || "";
    $("#initiative-capability-gap").value = project.capability_gap || "";
    $("#initiative-training-required").value = project.training_required || "To be assessed";
    $("#initiative-training-plan-status").value = project.training_plan_status || "Not started";
    $("#initiative-change-required").value = project.change_management_required || "Yes";
    $("#initiative-change-plan-status").value = project.change_plan_status || "Not started";
    $("#initiative-communication-plan-status").value = project.communication_plan_status || "Not started";
    $("#initiative-hr-review-status").value = project.hr_review_status || "Not submitted";
    $("#initiative-hr-comments").value = project.hr_comments || "";

    $("#evidence-problem").value = project.evidence_problem_status || "Not available";
    $("#evidence-baseline").value = project.evidence_baseline_status || "Not available";
    $("#evidence-business-case").value = project.evidence_business_case_status || "Not available";
    $("#evidence-financial").value = project.evidence_financial_status || "Not available";
    $("#evidence-risk").value = project.evidence_risk_status || "Not available";
    $("#evidence-implementation").value = project.evidence_implementation_status || "Not available";
    $("#evidence-hr").value = project.evidence_hr_status || "Not available";
    $("#evidence-ict").value = project.evidence_ict_status || "Not available";
    $("#evidence-stakeholder").value = project.evidence_stakeholder_status || "Not available";
    $("#evidence-challenge").value = project.evidence_challenge_status || "Not available";
    $("#initiative-evidence-reference").value = project.evidence_reference || "";
    $("#initiative-evidence-notes").value = project.evidence_notes || "";
  }

  currentInitiativeFormStep = 1;
  renderInitiativeFormStep();
  updateEvidencePresentation();
  renderBudgetSummary();
  updateInitiativeFormMetrics();
  lastModalTrigger = document.activeElement;
  const modal = $("#initiative-modal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  initiativeFormInitialising = false;
  checkForInitiativeDraft(project);
  window.setTimeout(() => $("#close-initiative-modal")?.focus(), 20);
}

function closeInitiativeModal({ clearDraft = false } = {}) {
  const modal = $("#initiative-modal");
  if (modal.classList.contains("hidden")) return;
  if (initiativeDraftTimer) window.clearTimeout(initiativeDraftTimer);
  initiativeDraftTimer = null;
  if (clearDraft) removeInitiativeDraft(activeInitiativeDraftKey);
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  initiativeFormDirty = false;
  initiativeFormInitialising = false;
  pendingInitiativeDraft = null;
  activeInitiativeDraftKey = null;
  const trigger = lastModalTrigger;
  lastModalTrigger = null;
  if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus();
}

function requestCloseInitiativeModal() {
  if (!initiativeFormDirty) {
    closeInitiativeModal();
    return;
  }

  saveInitiativeDraft();
  const shouldClose = window.confirm(
    "Your changes have been saved as a draft on this device. Close the form now? You can restore the draft when you reopen it."
  );
  if (shouldClose) closeInitiativeModal();
}

function saveDraftAndCloseInitiativeModal() {
  if (initiativeFormDirty) saveInitiativeDraft({ announce: true });
  closeInitiativeModal();
}

function handleInitiativeModalKeydown(event) {
  const modal = $("#initiative-modal");
  if (!modal || modal.classList.contains("hidden")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    requestCloseInitiativeModal();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll(
    'button:not([disabled]):not(.hidden), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function goToInitiativeStep(step) {
  if (step > currentInitiativeFormStep && !validateInitiativeStep(currentInitiativeFormStep)) return;
  currentInitiativeFormStep = Math.max(1, Math.min(7, step));
  renderInitiativeFormStep();
}

function nextInitiativeStep() {
  if (!validateInitiativeStep(currentInitiativeFormStep)) return;
  currentInitiativeFormStep = Math.min(7, currentInitiativeFormStep + 1);
  renderInitiativeFormStep();
}

function previousInitiativeStep() {
  currentInitiativeFormStep = Math.max(1, currentInitiativeFormStep - 1);
  renderInitiativeFormStep();
}

function renderInitiativeFormStep() {
  $$(".initiative-form-step").forEach(panel =>
    panel.classList.toggle("active", Number(panel.dataset.stepPanel) === currentInitiativeFormStep)
  );

  $$(".initiative-step").forEach(button => {
    const step = Number(button.dataset.formStep);
    button.classList.toggle("active", step === currentInitiativeFormStep);
    button.classList.toggle("completed", step < currentInitiativeFormStep);
  });

  $("#initiative-previous-step").classList.toggle("hidden", currentInitiativeFormStep === 1);
  $("#initiative-next-step").classList.toggle("hidden", currentInitiativeFormStep === 7);
  $("#save-initiative-button").classList.toggle("hidden", currentInitiativeFormStep !== 7);
  $("#initiative-current-step-label").textContent = `Step ${currentInitiativeFormStep} of 7`;

  if (currentInitiativeFormStep === 4) renderBudgetSummary();
  if (currentInitiativeFormStep === 7) renderInitiativeReviewSummary();
}

function validateInitiativeStep(step) {
  const panel = $(`.initiative-form-step[data-step-panel="${step}"]`);
  const required = [...panel.querySelectorAll("[required]")];

  for (const field of required) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (step === 1) {
    const start = $("#initiative-start-date").value;
    const target = $("#initiative-target-date").value;
    if (start && target && target < start) {
      showToast("Target completion date cannot be earlier than the start date.", true);
      return false;
    }
  }

  return true;
}

function calculateEvidenceScore() {
  const statuses = $$(".evidence-status").map(element => element.value);
  const applicable = statuses.filter(status => status !== "Not applicable");
  if (!applicable.length) return 100;

  const score = applicable.reduce((sum, status) => {
    if (status === "Available") return sum + 1;
    if (status === "In progress") return sum + 0.5;
    return sum;
  }, 0);

  return Math.round(score / applicable.length * 100);
}

function updateEvidencePresentation() {
  $$(".evidence-status").forEach(select => {
    const item = select.closest(".evidence-item");
    item.classList.remove("available", "in-progress", "not-available");
    if (select.value === "Available") item.classList.add("available");
    if (select.value === "In progress") item.classList.add("in-progress");
    if (select.value === "Not available") item.classList.add("not-available");
  });

  const score = calculateEvidenceScore();
  $("#initiative-evidence-score").textContent = `${score}%`;
  $("#initiative-evidence-bar").style.width = `${score}%`;
  updateInitiativeFormMetrics();
}

function updateInitiativeFormMetrics() {
  const fields = [
    "#initiative-year",
    "#initiative-name",
    "#initiative-project-description",
    "#initiative-department",
    "#initiative-category",
    "#initiative-priority-status",
    "#initiative-executive-sponsor",
    "#initiative-owner",
    "#initiative-delivery-lead",
    "#initiative-pillar",
    "#initiative-strategic-thrust",
    "#initiative-strategic-priority-area",
    "#initiative-system-type",
    "#initiative-ict-classification",
    "#initiative-problem",
    "#initiative-outcome",
    "#initiative-value-measure",
    "#initiative-value-target",
    "#initiative-action-plan",
    "#initiative-hr",
    "#evidence-problem",
    "#evidence-baseline"
  ];

  const complete = fields.filter(selector => {
    const element = $(selector);
    return element && String(element.value || "").trim() !== "";
  }).length;

  const score = Math.round(complete / fields.length * 100);
  $("#initiative-form-completion").textContent = `${score}%`;
  $("#initiative-form-completion-bar").style.width = `${score}%`;

  if (currentInitiativeFormStep === 7) renderInitiativeReviewSummary();
}

function numberValue(selector) {
  const raw = $(selector).value;
  return raw === "" ? null : Number(raw);
}

function formatRinggit(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Not recorded";
  return `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderBudgetSummary() {
  const initial = numberValue("#initiative-estimated-cost");
  const challenged = numberValue("#initiative-estimated-cost-post-challenge");
  const proposed = numberValue("#initiative-proposed-budget");
  const approved = numberValue("#initiative-approved-budget");
  const challengeVariance = initial === null || challenged === null ? null : challenged - initial;
  const approvalVariance = approved === null || challenged === null ? null : approved - challenged;

  $("#initiative-budget-summary").innerHTML = `
    <article><span>Initial estimate</span><strong>${formatRinggit(initial)}</strong></article>
    <article><span>Post-challenge variance</span><strong>${formatRinggit(challengeVariance)}</strong></article>
    <article><span>Proposed budget</span><strong>${formatRinggit(proposed)}</strong></article>
    <article><span>Approved vs challenge</span><strong>${formatRinggit(approvalVariance)}</strong></article>
  `;
}

function renderInitiativeReviewSummary() {
  const evidenceScore = calculateEvidenceScore();
  const evidenceGaps = $$(".evidence-status")
    .filter(element => element.value === "Not available")
    .map(element => element.closest(".evidence-item").querySelector("span").textContent.trim());

  const approved = numberValue("#initiative-approved-budget");
  const challenged = numberValue("#initiative-estimated-cost-post-challenge");

  $("#initiative-review-summary").innerHTML = `
    <article class="review-card">
      <span>Initiative / category</span>
      <strong>${escapeHtml($("#initiative-name").value || "Not completed")} · ${escapeHtml($("#initiative-category").value)}</strong>
    </article>
    <article class="review-card">
      <span>Department / year / priority</span>
      <strong>${escapeHtml($("#initiative-department").value || "Not completed")} · ${escapeHtml($("#initiative-year").value)} · ${escapeHtml($("#initiative-priority-status").value)}</strong>
    </article>
    <article class="review-card">
      <span>Executive sponsor</span>
      <strong>${escapeHtml($("#initiative-executive-sponsor").value || "Not completed")}</strong>
    </article>
    <article class="review-card">
      <span>Project owner / Delivery lead</span>
      <strong>${escapeHtml($("#initiative-owner").value || "Not completed")} / ${escapeHtml($("#initiative-delivery-lead").value || "Not completed")}</strong>
    </article>
    <article class="review-card">
      <span>HOME31 / strategic thrust</span>
      <strong>${escapeHtml($("#initiative-pillar").value)} · ${escapeHtml($("#initiative-strategic-thrust").value)}</strong>
    </article>
    <article class="review-card">
      <span>System / ICT classification</span>
      <strong>${escapeHtml($("#initiative-system-type").value)} · ${escapeHtml($("#initiative-ict-classification").value)}</strong>
    </article>
    <article class="review-card">
      <span>Value measure and target</span>
      <strong>${escapeHtml($("#initiative-value-measure").value || "Not completed")} → ${escapeHtml($("#initiative-value-target").value || "Not completed")}</strong>
    </article>
    <article class="review-card">
      <span>CBA / approved budget</span>
      <strong>${escapeHtml($("#initiative-cba-ratio").value || "Not recorded")} · ${formatRinggit(approved)}</strong>
    </article>
    <article class="review-card">
      <span>HR and people impact</span>
      <strong>${escapeHtml($("#initiative-hr").value)} · ${escapeHtml($("#initiative-people-impact").value)} impact · ${escapeHtml($("#initiative-hr-review-status").value)}</strong>
    </article>
    <article class="review-card ${evidenceScore >= 70 ? "good" : "warning"}">
      <span>Evidence completeness</span>
      <strong>${evidenceScore}%</strong>
    </article>
    <article class="review-card full">
      <span>Challenge-session decision</span>
      <strong>${escapeHtml($("#initiative-post-challenge-remarks").value || "No remarks recorded")}</strong>
    </article>
    <article class="review-card full">
      <span>Outstanding evidence gaps</span>
      ${
        evidenceGaps.length
          ? `<ul>${evidenceGaps.map(gap => `<li>${escapeHtml(gap)}</li>`).join("")}</ul>`
          : "<strong>No evidence item is marked unavailable.</strong>"
      }
    </article>
  `;
}

async function saveInitiative(event) {
  event.preventDefault();

  for (let step = 1; step <= 7; step += 1) {
    if (!validateInitiativeStep(step)) {
      currentInitiativeFormStep = step;
      renderInitiativeFormStep();
      return;
    }
  }

  const id = $("#initiative-id").value;
  const createdBy =
    currentProfile?.role === "super_admin" && $("#initiative-created-by").value
      ? $("#initiative-created-by").value
      : currentUser.id;

  const record = {
    source_reference_no: $("#initiative-source-reference").value.trim() || null,
    implementation_year: Number($("#initiative-year").value),
    initiative_name: $("#initiative-name").value.trim(),
    project_description: $("#initiative-project-description").value.trim(),
    department: $("#initiative-department").value.trim(),
    initiative_category: $("#initiative-category").value,
    priority: $("#initiative-priority").value,
    priority_status: $("#initiative-priority-status").value,
    executive_sponsor: $("#initiative-executive-sponsor").value.trim(),
    accountable_owner: $("#initiative-owner").value.trim(),
    delivery_lead: $("#initiative-delivery-lead").value.trim(),
    start_date: $("#initiative-start-date").value || null,
    target_date: $("#initiative-target-date").value || null,
    status: $("#initiative-status").value,
    risk_level: $("#initiative-risk").value,

    strategic_pillar: $("#initiative-pillar").value,
    home31_fit_override: $("#initiative-home31-fit-override").value || null,
    strategic_thrust: $("#initiative-strategic-thrust").value,
    strategic_priority_area: $("#initiative-strategic-priority-area").value,
    system_type: $("#initiative-system-type").value,
    ict_classification: $("#initiative-ict-classification").value,
    ict_remarks: $("#initiative-ict-remarks").value.trim() || null,

    problem_opportunity: $("#initiative-problem").value.trim(),
    expected_outcome: $("#initiative-outcome").value.trim(),
    value_measure: $("#initiative-value-measure").value.trim(),
    value_baseline: $("#initiative-value-baseline").value.trim() || null,
    value_target: $("#initiative-value-target").value.trim(),
    value_frequency: $("#initiative-value-frequency").value,
    value_owner: $("#initiative-value-owner").value.trim() || null,
    cba_ratio: numberValue("#initiative-cba-ratio"),
    progress: Number($("#initiative-progress").value),
    readiness_score: Number($("#initiative-readiness").value),
    action_plan: $("#initiative-action-plan").value.trim(),
    next_action: $("#initiative-next-action").value.trim() || null,

    estimated_cost: numberValue("#initiative-estimated-cost"),
    estimated_cost_confirmed: $("#initiative-estimated-cost").value !== "",
    estimated_cost_post_challenge: numberValue("#initiative-estimated-cost-post-challenge"),
    post_challenge_cost_confirmed: $("#initiative-estimated-cost-post-challenge").value !== "",
    proposed_budget_post_retreat: numberValue("#initiative-proposed-budget"),
    proposed_budget_confirmed: $("#initiative-proposed-budget").value !== "",
    approved_budget: numberValue("#initiative-approved-budget"),
    approved_budget_confirmed: $("#initiative-approved-budget").value !== "",
    post_challenge_remarks: $("#initiative-post-challenge-remarks").value.trim() || null,
    finance_remarks: $("#initiative-finance-remarks").value.trim() || null,
    general_remarks: $("#initiative-general-remarks").value.trim() || null,

    hr_collaboration_status: $("#initiative-hr").value,
    people_impact_level: $("#initiative-people-impact").value,
    affected_workforce_groups: $("#initiative-affected-groups").value.trim() || null,
    roles_affected_count: Number($("#initiative-roles-affected").value || 0),
    hr_owner: $("#initiative-hr-owner").value.trim() || null,
    new_roles_required: $("#initiative-new-roles-required").checked,
    redeployment_required: $("#initiative-redeployment-required").checked,
    organisation_design_impact: $("#initiative-org-design-impact").value.trim() || null,
    capability_gap: $("#initiative-capability-gap").value.trim() || null,
    training_required: $("#initiative-training-required").value,
    training_plan_status: $("#initiative-training-plan-status").value,
    change_management_required: $("#initiative-change-required").value,
    change_plan_status: $("#initiative-change-plan-status").value,
    communication_plan_status: $("#initiative-communication-plan-status").value,
    hr_review_status: $("#initiative-hr-review-status").value,
    hr_comments: $("#initiative-hr-comments").value.trim() || null,

    evidence_problem_status: $("#evidence-problem").value,
    evidence_baseline_status: $("#evidence-baseline").value,
    evidence_business_case_status: $("#evidence-business-case").value,
    evidence_financial_status: $("#evidence-financial").value,
    evidence_risk_status: $("#evidence-risk").value,
    evidence_implementation_status: $("#evidence-implementation").value,
    evidence_hr_status: $("#evidence-hr").value,
    evidence_ict_status: $("#evidence-ict").value,
    evidence_stakeholder_status: $("#evidence-stakeholder").value,
    evidence_challenge_status: $("#evidence-challenge").value,
    evidence_reference: $("#initiative-evidence-reference").value.trim() || null,
    evidence_notes: $("#initiative-evidence-notes").value.trim() || null,
    evidence_completeness: calculateEvidenceScore(),

    created_by: createdBy,
    updated_at: new Date().toISOString()
  };

  const response = id
    ? await supabase.from("initiatives").update(record).eq("id", id)
    : await supabase.from("initiatives").insert(record);

  if (response.error) return showToast(response.error.message, true);

  removeInitiativeDraft(activeInitiativeDraftKey);
  initiativeFormDirty = false;
  closeInitiativeModal({ clearDraft: true });
  showToast(id ? "Comprehensive initiative updated." : "Comprehensive initiative created.");

  await loadUserProjects();
  if (currentProfile.role === "super_admin") await loadAdminData();
}

async function deleteInitiative(projectId) {
  const project = userProjects.find(item => String(item.id) === String(projectId));
  if (!project) return;
  if (!window.confirm(`Delete "${project.initiative_name}"?`)) return;

  const { error } = await supabase.from("initiatives").delete().eq("id", projectId);
  if (error) return showToast(error.message, true);

  showToast("Initiative deleted.");
  await loadUserProjects();
}


const EXCEL_IMPORT_ALIASES = {
  source_reference_no: ["No.", "No", "Source Reference", "Source Reference No", "Legacy Reference"],
  implementation_year: ["YEAR", "Year", "Implementation Year"],
  department: ["Departments", "Department", "Lead Department"],
  initiative_name: ["Initiative", "Initiative Name", "Project Name"],
  project_description: ["Project Description", "Description"],
  accountable_owner: ["Project Owner Name", "Project Owner", "Accountable Owner", "Owner"],
  executive_sponsor: ["Executive Sponsor", "Sponsor"],
  delivery_lead: ["Delivery Lead", "Project Lead"],
  action_plan: ["Action Plan Date", "Action Plan", "Milestones"],
  start_date: ["Start Date"],
  target_date: ["Target Date", "Target Completion Date"],
  initiative_category: ["Category", "Initiative Category"],
  system_type: ["System", "System Type"],
  strategic_thrust: ["Strategic Thrust"],
  strategic_priority_area: ["Strategic Priority Area"],
  strategic_pillar: ["HOME31 Strategic Pillar", "Strategic Pillar", "HOME31 Pillar"],
  estimated_cost: ["Estimated Cost", "Initial Estimated Cost"],
  cba_ratio: ["CBA Ratio", "Cost Benefit Ratio"],
  post_challenge_remarks: ["Remarks (Post Challenge Session)", "Post Challenge Remarks", "Challenge Session Remarks"],
  estimated_cost_post_challenge: ["Estimated Cost (Post Challenge)", "Estimated Cost Post Challenge", "Post Challenge Cost"],
  ict_classification: ["ICT Classification"],
  ict_remarks: ["ICT Remarks", "Architecture Considerations"],
  priority_status: ["Priority Status"],
  proposed_budget_post_retreat: ["Proposed Budget (Post Retreat)", "Proposed Budget Post Retreat"],
  approved_budget: ["Approved Budget"],
  finance_remarks: ["Remarks from Finance (Approved Budget 2027)", "Finance Remarks"],
  general_remarks: ["Remarks", "General Remarks"],
  status: ["Status", "Delivery Status"],
  risk_level: ["Risk Level", "Risk"],
  progress: ["Progress", "Progress %"],
  readiness_score: ["Readiness Score", "Readiness %"],
  problem_opportunity: ["Problem / Opportunity", "Problem Opportunity"],
  expected_outcome: ["Expected Outcome", "Outcome"],
  value_measure: ["Value Measure"],
  value_baseline: ["Value Baseline", "Baseline"],
  value_target: ["Value Target", "Target"],
  value_owner: ["Value Owner"],
  next_action: ["Next Action"],
  hr_collaboration_status: ["HR Collaboration Status", "HR Collaboration"],
  people_impact_level: ["People Impact Level", "People Impact"]
};

function openExcelImportModal() {
  if (currentProfile?.role !== "super_admin") return;
  excelImportLastTrigger = document.activeElement;
  excelImportRawRows = [];
  excelImportPreparedRows = [];
  $("#excel-import-file").value = "";
  $("#excel-import-file-name").textContent = "No file selected.";
  $("#excel-import-owner").value = "";
  $("#excel-import-year").value = selectedAdminYear === "all" ? "2027" : String(selectedAdminYear || 2027);
  $("#excel-import-skip-duplicates").checked = true;
  $("#excel-import-summary").classList.add("hidden");
  $("#excel-import-preview-wrap").classList.add("hidden");
  $("#excel-import-preview-table tbody").innerHTML = "";
  $("#confirm-excel-import").disabled = true;
  $("#confirm-excel-import").textContent = "Import Valid Rows";

  if ([...$("#excel-import-created-by").options].some(option => option.value === currentUser?.id)) {
    $("#excel-import-created-by").value = currentUser.id;
  }

  const modal = $("#excel-import-modal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => $("#close-excel-import")?.focus(), 20);
}

function closeExcelImportModal() {
  const modal = $("#excel-import-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  if ($("#initiative-modal")?.classList.contains("hidden")) document.body.classList.remove("modal-open");
  const trigger = excelImportLastTrigger;
  excelImportLastTrigger = null;
  if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus();
}

function handleExcelImportKeydown(event) {
  const modal = $("#excel-import-modal");
  if (!modal || modal.classList.contains("hidden")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeExcelImportModal();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll(
    'button:not([disabled]):not(.hidden), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleExcelImportFileSelection() {
  const file = $("#excel-import-file").files?.[0];
  excelImportRawRows = [];
  excelImportPreparedRows = [];
  $("#excel-import-file-name").textContent = file
    ? `${file.name} · ${(file.size / 1024).toLocaleString("en-MY", { maximumFractionDigits: 1 })} KB`
    : "No file selected.";
  $("#excel-import-summary").classList.add("hidden");
  $("#excel-import-preview-wrap").classList.add("hidden");
  $("#confirm-excel-import").disabled = true;
}

async function reviewExcelImportFile() {
  const file = $("#excel-import-file").files?.[0];
  if (!file) return showToast("Select an Excel or CSV file first.", true);
  if (!window.XLSX) return showToast("Excel processing library is unavailable. Refresh the page and try again.", true);

  const button = $("#excel-validate-file");
  button.disabled = true;
  button.textContent = "Reading workbook…";

  try {
    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { cellDates: true });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
    const worksheet = workbook.Sheets[firstSheet];
    excelImportRawRows = window.XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
      blankrows: false
    });
    if (!excelImportRawRows.length) throw new Error("No data rows were found in the first worksheet.");
    prepareExcelImportRows();
  } catch (error) {
    console.error("Excel import review failed", error);
    excelImportRawRows = [];
    excelImportPreparedRows = [];
    $("#excel-import-summary").classList.add("hidden");
    $("#excel-import-preview-wrap").classList.add("hidden");
    $("#confirm-excel-import").disabled = true;
    showToast(error?.message || "Unable to read the selected workbook.", true);
  } finally {
    button.disabled = false;
    button.textContent = "Review File";
  }
}

function prepareExcelImportRows() {
  if (!excelImportRawRows.length) return;
  const settings = {
    createdBy: $("#excel-import-created-by").value,
    fallbackOwner: $("#excel-import-owner").value.trim(),
    fallbackPillar: $("#excel-import-pillar").value,
    fallbackYear: Number($("#excel-import-year").value || 2027),
    skipDuplicates: $("#excel-import-skip-duplicates").checked
  };

  excelImportPreparedRows = excelImportRawRows.map((rawRow, index) =>
    mapExcelImportRow(rawRow, index + 2, settings)
  );
  renderExcelImportPreview();
}

function mapExcelImportRow(rawRow, worksheetRow, settings) {
  const row = normalizeExcelRow(rawRow);
  const get = field => excelFieldValue(row, EXCEL_IMPORT_ALIASES[field] || []);
  const warnings = [];
  const errors = [];

  const yearValue = parseExcelNumber(get("implementation_year"));
  const implementationYear = Number.isInteger(yearValue) ? yearValue : settings.fallbackYear;
  if (!yearValue) warnings.push(`Implementation year defaulted to ${settings.fallbackYear}.`);
  if (!Number.isInteger(implementationYear) || implementationYear < 2026 || implementationYear > 2100) {
    errors.push("Implementation year must be between 2026 and 2100.");
  }

  const initiativeName = cleanExcelText(get("initiative_name"));
  const department = cleanExcelText(get("department"));
  const rowOwner = cleanExcelText(get("accountable_owner"));
  const accountableOwner = rowOwner || settings.fallbackOwner;
  if (!rowOwner && accountableOwner) warnings.push("Fallback project owner used.");

  const rowPillar = cleanExcelText(get("strategic_pillar"));
  let strategicPillar = rowPillar || settings.fallbackPillar;
  if (rowPillar && !pillars.includes(rowPillar)) {
    warnings.push(`Unrecognised pillar “${rowPillar}”; fallback pillar used.`);
    strategicPillar = settings.fallbackPillar;
  } else if (!rowPillar && strategicPillar) {
    warnings.push("Fallback strategic pillar used.");
  }

  if (!initiativeName) errors.push("Initiative name is required.");
  if (initiativeName.length > 150) errors.push("Initiative name must not exceed 150 characters.");
  if (!department) errors.push("Department is required.");
  if (!accountableOwner) errors.push("Project owner name is required.");
  if (!strategicPillar || !pillars.includes(strategicPillar)) errors.push("A valid HOME31 strategic pillar is required.");
  if (!settings.createdBy) errors.push("Record account / submitter is required.");

  const estimatedCost = parseExcelNumber(get("estimated_cost"));
  const challengedCost = parseExcelNumber(get("estimated_cost_post_challenge"));
  const proposedBudget = parseExcelNumber(get("proposed_budget_post_retreat"));
  const approvedBudget = parseExcelNumber(get("approved_budget"));
  const cbaRatio = parseExcelRatio(get("cba_ratio"));
  if (!cleanExcelText(get("project_description"))) warnings.push("Project description is blank.");
  if (approvedBudget === null) warnings.push("Approved Budget is blank; portfolio cost basis will remain unconfirmed.");
  [
    ["Estimated cost", estimatedCost],
    ["Post-challenge cost", challengedCost],
    ["Proposed budget", proposedBudget],
    ["Approved budget", approvedBudget],
    ["CBA ratio", cbaRatio]
  ].forEach(([label, value]) => {
    if (value !== null && (!Number.isFinite(value) || value < 0)) errors.push(`${label} must be zero or greater.`);
  });

  const status = normalizeExcelEnum(get("status"), ["Planning", "In Progress", "At Risk", "On Hold", "Completed"], "Planning", warnings, "status");
  const riskLevel = normalizeExcelEnum(get("risk_level"), ["Low", "Medium", "High", "Extreme"], "Medium", warnings, "risk level");
  const hrStatus = normalizeExcelEnum(get("hr_collaboration_status"), ["Not required", "Required", "To be confirmed"], "Not required", warnings, "HR collaboration status");
  const progress = clampExcelPercent(parseExcelNumber(get("progress")), 0, warnings, "Progress");
  const readiness = clampExcelPercent(parseExcelNumber(get("readiness_score")), 0, warnings, "Readiness");

  const record = {
    source_reference_no: cleanExcelText(get("source_reference_no")) || null,
    implementation_year: implementationYear,
    initiative_name: initiativeName,
    project_description: cleanExcelText(get("project_description")) || null,
    department,
    initiative_category: cleanExcelText(get("initiative_category")) || "New Initiative",
    priority: "High",
    priority_status: cleanExcelText(get("priority_status")) || "Not Assessed",
    executive_sponsor: cleanExcelText(get("executive_sponsor")) || null,
    accountable_owner: accountableOwner,
    delivery_lead: cleanExcelText(get("delivery_lead")) || null,
    start_date: parseExcelDate(get("start_date")),
    target_date: parseExcelDate(get("target_date")),
    status,
    risk_level: riskLevel,
    strategic_pillar: strategicPillar,
    strategic_thrust: cleanExcelText(get("strategic_thrust")) || null,
    strategic_priority_area: cleanExcelText(get("strategic_priority_area")) || null,
    system_type: cleanExcelText(get("system_type")) || "Non System",
    ict_classification: cleanExcelText(get("ict_classification")) || "N/A",
    ict_remarks: cleanExcelText(get("ict_remarks")) || null,
    problem_opportunity: cleanExcelText(get("problem_opportunity")) || null,
    expected_outcome: cleanExcelText(get("expected_outcome")) || null,
    value_measure: cleanExcelText(get("value_measure")) || null,
    value_baseline: cleanExcelText(get("value_baseline")) || null,
    value_target: cleanExcelText(get("value_target")) || null,
    value_frequency: "Quarterly",
    value_owner: cleanExcelText(get("value_owner")) || null,
    cba_ratio: cbaRatio,
    progress,
    readiness_score: readiness,
    action_plan: cleanExcelText(get("action_plan")) || null,
    next_action: cleanExcelText(get("next_action")) || null,
    estimated_cost: estimatedCost,
    estimated_cost_confirmed: estimatedCost !== null,
    estimated_cost_post_challenge: challengedCost,
    post_challenge_cost_confirmed: challengedCost !== null,
    proposed_budget_post_retreat: proposedBudget,
    proposed_budget_confirmed: proposedBudget !== null,
    approved_budget: approvedBudget,
    approved_budget_confirmed: approvedBudget !== null,
    post_challenge_remarks: cleanExcelText(get("post_challenge_remarks")) || null,
    finance_remarks: cleanExcelText(get("finance_remarks")) || null,
    general_remarks: cleanExcelText(get("general_remarks")) || null,
    hr_collaboration_status: hrStatus,
    people_impact_level: cleanExcelText(get("people_impact_level")) || "Medium",
    roles_affected_count: 0,
    new_roles_required: false,
    redeployment_required: false,
    training_required: "To be assessed",
    training_plan_status: "Not started",
    change_management_required: "Yes",
    change_plan_status: "Not started",
    communication_plan_status: "Not started",
    hr_review_status: "Not submitted",
    evidence_problem_status: "Not available",
    evidence_baseline_status: "Not available",
    evidence_business_case_status: "Not available",
    evidence_financial_status: "Not available",
    evidence_risk_status: "Not available",
    evidence_implementation_status: "Not available",
    evidence_hr_status: "Not available",
    evidence_ict_status: "Not available",
    evidence_stakeholder_status: "Not available",
    evidence_challenge_status: "Not available",
    evidence_completeness: 0,
    created_by: settings.createdBy,
    updated_at: new Date().toISOString()
  };

  const duplicate = errors.length ? false : isLikelyExcelDuplicate(record);
  if (duplicate) warnings.push(settings.skipDuplicates ? "Likely duplicate — excluded from import." : "Likely duplicate — will be imported because duplicate skipping is off.");

  const importable = errors.length === 0 && !(duplicate && settings.skipDuplicates);
  const statusType = errors.length ? "error" : (warnings.length ? "warning" : "valid");

  return {
    worksheetRow,
    record,
    errors,
    warnings,
    duplicate,
    importable,
    status: statusType
  };
}

function normalizeExcelRow(rawRow) {
  const normalized = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    normalized[normalizeExcelHeader(key)] = value;
  });
  return normalized;
}

function normalizeExcelHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function excelFieldValue(normalizedRow, aliases) {
  for (const alias of aliases) {
    const key = normalizeExcelHeader(alias);
    if (Object.prototype.hasOwnProperty.call(normalizedRow, key)) return normalizedRow[key];
  }
  return "";
}

function cleanExcelText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseExcelNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  const cleaned = text.replace(/\s/g, "").replace(/RM/gi, "").replace(/,/g, "").replace(/%$/, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
}

function parseExcelRatio(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const ratio = text.match(/^\s*([\d.]+)\s*:\s*([\d.]+)\s*$/);
  if (ratio) {
    const left = Number(ratio[1]);
    const right = Number(ratio[2]);
    return left > 0 && Number.isFinite(right / left) ? right / left : NaN;
  }
  return parseExcelNumber(value);
}

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeExcelEnum(value, allowed, fallback, warnings, label) {
  const text = cleanExcelText(value);
  if (!text) return fallback;
  const match = allowed.find(item => item.toLowerCase() === text.toLowerCase());
  if (match) return match;
  warnings.push(`Unrecognised ${label} “${text}”; ${fallback} used.`);
  return fallback;
}

function clampExcelPercent(value, fallback, warnings, label) {
  if (value === null) return fallback;
  if (!Number.isFinite(value)) {
    warnings.push(`${label} was invalid; ${fallback}% used.`);
    return fallback;
  }
  if (value < 0 || value > 100) {
    warnings.push(`${label} was limited to the 0–100 range.`);
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return Math.round(value);
}

function isLikelyExcelDuplicate(record) {
  return adminProjects.some(project => {
    const sameYear = projectImplementationYear(project) === Number(record.implementation_year);
    if (!sameYear) return false;
    const sourceReference = String(record.source_reference_no || "").trim().toLowerCase();
    if (sourceReference && String(project.source_reference_no || "").trim().toLowerCase() === sourceReference) return true;
    return String(project.initiative_name || "").trim().toLowerCase() === String(record.initiative_name || "").trim().toLowerCase() &&
      String(project.department || "").trim().toLowerCase() === String(record.department || "").trim().toLowerCase();
  });
}

function renderExcelImportPreview() {
  const ready = excelImportPreparedRows.filter(row => row.importable);
  const warnings = excelImportPreparedRows.filter(row => row.warnings.length).length;
  const blocked = excelImportPreparedRows.filter(row => !row.importable).length;

  $("#excel-summary-total").textContent = excelImportPreparedRows.length;
  $("#excel-summary-valid").textContent = ready.length;
  $("#excel-summary-warning").textContent = warnings;
  $("#excel-summary-error").textContent = blocked;
  $("#excel-import-summary").classList.remove("hidden");
  $("#excel-import-preview-wrap").classList.remove("hidden");

  $("#excel-import-preview-table tbody").innerHTML = excelImportPreparedRows.slice(0, 25).map(row => {
    const notes = [...row.errors, ...row.warnings].join(" ") || "Ready to import.";
    const label = row.status === "valid" ? "Ready" : (row.status === "warning" ? (row.importable ? "Review" : "Skipped") : "Blocked");
    return `
      <tr>
        <td>${row.worksheetRow}</td>
        <td><span class="excel-row-status ${row.status}">${label}</span></td>
        <td>${escapeHtml(String(row.record.implementation_year || ""))}</td>
        <td><strong>${escapeHtml(row.record.initiative_name || "Not provided")}</strong></td>
        <td>${escapeHtml(row.record.accountable_owner || "Not provided")}</td>
        <td>${escapeHtml(row.record.department || "Not provided")}</td>
        <td>${row.record.approved_budget_confirmed ? escapeHtml(compactRinggit(row.record.approved_budget)) : "Not recorded"}</td>
        <td>${escapeHtml(notes)}</td>
      </tr>`;
  }).join("");

  const previewStatus = $("#excel-import-preview-status");
  previewStatus.textContent = ready.length ? `${ready.length} ready` : "No valid rows";
  previewStatus.classList.toggle("good", ready.length > 0);
  $("#confirm-excel-import").disabled = ready.length === 0;
  $("#confirm-excel-import").textContent = ready.length ? `Import ${ready.length} Valid Row${ready.length === 1 ? "" : "s"}` : "Import Valid Rows";
}

async function importPreparedExcelRows() {
  if (currentProfile?.role !== "super_admin") return;
  const records = excelImportPreparedRows.filter(row => row.importable).map(row => row.record);
  if (!records.length) return showToast("There are no validated rows to import.", true);

  const button = $("#confirm-excel-import");
  button.disabled = true;
  button.textContent = `Importing 0 of ${records.length}…`;
  let imported = 0;

  try {
    for (let index = 0; index < records.length; index += 100) {
      const batch = records.slice(index, index + 100);
      const { error } = await supabase.from("initiatives").insert(batch);
      if (error) throw error;
      imported += batch.length;
      button.textContent = `Importing ${imported} of ${records.length}…`;
    }

    showToast(`${imported} initiative${imported === 1 ? "" : "s"} imported successfully.`);
    closeExcelImportModal();
    await loadAdminData();
  } catch (error) {
    console.error("Excel import failed", error);
    if (imported) {
      showToast(
        `${imported} row${imported === 1 ? " was" : "s were"} imported before the error. Reopen Excel Import to review the remaining rows: ${error.message}`,
        true
      );
      closeExcelImportModal();
      await loadAdminData();
      return;
    }

    showToast(error.message || "Excel import failed.", true);
    button.disabled = false;
    button.textContent = `Retry ${records.length} Row${records.length === 1 ? "" : "s"}`;
  }
}

function downloadExcelImportTemplate() {
  const link = document.createElement('a');
  link.href = 'HOME31-Initiative-Import-Template.xlsx?v=7.9.0';
  link.download = 'HOME31-Initiative-Import-Template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Official HOME31 Excel template download started.');
}

function populatePillars() {
  ["#initiative-pillar", "#admin-pillar-filter", "#excel-import-pillar"].forEach(selector => {
    const element = $(selector);
    if (!element) return;

    if (selector === "#admin-pillar-filter") {
      element.innerHTML = '<option value="">All pillars</option>';
    } else if (selector === "#excel-import-pillar") {
      element.innerHTML = '<option value="">Select fallback pillar</option>';
    } else {
      element.innerHTML = "";
    }

    element.insertAdjacentHTML(
      "beforeend",
      pillars.map(pillar => `<option>${escapeHtml(pillar)}</option>`).join("")
    );
  });
}

function populateOwnerOptions() {
  if (currentProfile?.role !== "super_admin") return;

  const activeProfiles = adminProfiles.filter(profile => profile.account_status === "active");
  const options = activeProfiles.map(profile => `
    <option value="${profile.id}">
      ${escapeHtml(profile.full_name || profile.email)} — ${escapeHtml(profile.department || "No department")}
    </option>
  `).join("");

  $("#initiative-created-by").innerHTML = options;
  $("#excel-import-created-by").innerHTML = options;
}

function profileFor(userId) {
  return adminProfiles.find(profile => profile.id === userId);
}

function initiativeCard(project) {
  return `
    <article class="initiative-card">
      <div class="initiative-card-head">
        <div>
          <strong>${escapeHtml(project.initiative_name)}</strong>
          <span>${escapeHtml(project.strategic_pillar)} · ${escapeHtml(project.department)}</span>
        </div>
        <span class="status-pill">${escapeHtml(project.status)}</span>
      </div>
      <span>${escapeHtml(project.initiative_category || "Unclassified")} · ${escapeHtml(project.system_type || "System not recorded")} · ${escapeHtml(project.priority_status || "Not assessed")}</span>
      <span>Project owner: ${escapeHtml(project.accountable_owner || "Not recorded")} · Sponsor: ${escapeHtml(project.executive_sponsor || "Not recorded")} · Delivery lead: ${escapeHtml(project.delivery_lead || "Not recorded")}</span>
      <span>Risk: ${escapeHtml(project.risk_level)} · Readiness: ${Number(project.readiness_score || 0)}% · HR: ${escapeHtml(project.hr_collaboration_status || "Not required")} · Evidence: ${Number(project.evidence_completeness || 0)}%</span>
      <div class="progress-track"><span style="width:${Number(project.progress || 0)}%"></span></div>
      <div class="initiative-actions">
        <button class="button secondary small" data-edit-project="${project.id}" type="button">Edit</button>
        <button class="text-button" data-delete-project="${project.id}" type="button">Delete</button>
      </div>
    </article>
  `;
}

function futureItem(project, detail) {
  return `
    <article class="future-item">
      <strong>${escapeHtml(project.initiative_name)}</strong>
      <span>${escapeHtml(project.department || "No department")} · ${escapeHtml(detail)}</span>
    </article>
  `;
}

function listOrEmpty(items, detailBuilder) {
  return items.length
    ? items.map(project => futureItem(project, detailBuilder(project))).join("")
    : '<div class="notice blue">No records in this category.</div>';
}

function progressBar(value) {
  const progress = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div>${progress}%</div><div class="progress-track"><span style="width:${progress}%"></span></div>`;
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 10, usePointStyle: true }
      }
    }
  };
}

function destroyCharts() {
  Object.values(charts).forEach(chart => chart?.destroy());
  charts = {};
}

function showToast(message, error = false) {
  $("#toast").textContent = message;
  $("#toast").style.background = error ? "#8e1019" : "#1d1d20";
  $("#toast").classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => $("#toast").classList.add("hidden"), 4300);
}

function labelRole(role) {
  const labels = {
    super_admin: "Super Admin",
    normal_user: "Normal User",
    department_admin: "Department Admin",
    hr_admin: "HR Admin",
    finance_admin: "Finance Admin",
    auditor: "Auditor",
    viewer: "Viewer"
  };
  return labels[role] || role;
}

function initials(name) {
  return String(name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ================================================================
   V7.5 YEAR-AWARE LIVE PORTFOLIO OVERRIDES
   ================================================================ */
function populateAdminYearOptions() {
  const years = new Set(COMPARISON_YEARS);
  adminProjects.forEach(project => years.add(projectImplementationYear(project)));
  const sorted = [...years].filter(Number.isFinite).sort((a,b)=>a-b);
  $("#admin-year-select").innerHTML = [
    '<option value="all">All Years</option>',
    ...sorted.map(year => `<option value="${year}">AMP${year}</option>`)
  ].join("");
  const valid = new Set(["all", ...sorted.map(String)]);
  if (!valid.has(String(selectedAdminYear))) selectedAdminYear = valid.has(DEFAULT_ADMIN_YEAR) ? DEFAULT_ADMIN_YEAR : String(sorted.at(-1) || "all");
  $("#admin-year-select").value = String(selectedAdminYear);
  updateAdminYearBadge();
}
function handleAdminYearChange(event) {
  selectedAdminYear = event.target.value;
  updateAdminYearBadge();
  renderAdminOverview();
  renderAdminPortfolio();
  renderAdminExceptions();
}
function updateAdminYearBadge() {
  const badge=$("#admin-year-source-badge");
  if (badge) badge.textContent = selectedAdminYear === "all" ? "Live all years" : `Live AMP${selectedAdminYear}`;
}
function projectImplementationYear(project) {
  const year=Number(project?.implementation_year);
  return Number.isFinite(year) && year >= 2000 ? year : 2027;
}
function projectsForYear(year=selectedAdminYear) {
  if (String(year)==="all") return adminProjects.slice();
  return adminProjects.filter(project => projectImplementationYear(project)===Number(year));
}
function selectedYearLabel(year=selectedAdminYear) { return String(year)==="all" ? "All Years" : `AMP${year}`; }
function costBasisLabel() {
  return "Approved budget";
}
function numericValue(value) {
  if (value===null || value===undefined || value==="") return null;
  const n=Number(value); return Number.isFinite(n) ? n : null;
}
function projectPortfolioCost(project) {
  return financialFieldConfirmed(project, "approved_budget")
    ? (numericValue(project.approved_budget) || 0)
    : 0;
}
function hasPortfolioCost(project) {
  return financialFieldConfirmed(project, "approved_budget");
}
function calculateProjectReadiness(project) {
  const checks=[
    Boolean(project.project_description || project.problem_opportunity),
    Boolean(project.start_date || project.target_date || extractProjectDateRange(project)),
    hasPortfolioCost(project),
    Boolean(project.priority_status && project.priority_status!=="Not Assessed"),
    Boolean(project.ict_classification && project.ict_classification!=="New - Pending ICT review"),
    Boolean(project.strategic_pillar),
    deriveHome31Fit(project)!=="Needs Validation"
  ];
  const checksMet=checks.filter(Boolean).length;
  return {project,checksMet,totalChecks:checks.length,score:Math.round(checksMet/checks.length*100)};
}
function calculateExecutiveMetrics(records=projectsForYear()) {
  const today=new Date().toISOString().slice(0,10), total=records.length;
  const confirmedSum=field=>records.reduce((sum,project)=>
    sum + (financialFieldConfirmed(project, field) ? (numericValue(project[field]) || 0) : 0), 0);
  const originalCost=confirmedSum("estimated_cost");
  const effectiveCost=confirmedSum("estimated_cost_post_challenge");
  const proposedBudget=confirmedSum("proposed_budget_post_retreat");
  const approvedBudget=confirmedSum("approved_budget");
  const portfolioCost=approvedBudget;
  const originalCostCount=records.filter(p=>financialFieldConfirmed(p,"estimated_cost")).length;
  const effectiveCostCount=records.filter(p=>financialFieldConfirmed(p,"estimated_cost_post_challenge")).length;
  const proposedBudgetCount=records.filter(p=>financialFieldConfirmed(p,"proposed_budget_post_retreat")).length;
  const approvedBudgetCount=records.filter(p=>financialFieldConfirmed(p,"approved_budget")).length;
  const readinessScores=records.map(calculateProjectReadiness);
  const strategicReadiness=total?Math.round(readinessScores.reduce((s,i)=>s+i.score,0)/total):0;
  const fullyReady=readinessScores.filter(i=>i.checksMet===i.totalChecks).length;
  const critical=records.filter(p=>p.risk_level==="Extreme"||p.status==="At Risk"||(p.target_date&&p.target_date<today&&p.status!=="Completed")||!p.accountable_owner);
  const watch=records.filter(p=>!critical.includes(p)&&(p.risk_level==="High"||Number(p.readiness_score||0)<70||Number(p.evidence_completeness||0)<70||p.ict_classification==="New - Pending ICT review"||(["Required","To be confirmed"].includes(p.hr_collaboration_status)&&!["Supported","Not required"].includes(p.hr_review_status))));
  const decisionCounts={
    approvedBudget:records.filter(p=>!financialFieldConfirmed(p,"approved_budget")).length,
    postChallengeCost:records.filter(p=>!financialFieldConfirmed(p,"estimated_cost_post_challenge")).length,
    ict:records.filter(p=>p.ict_classification==="New - Pending ICT review"||((p.system_type&&p.system_type!=="Non System")&&!p.ict_classification)).length,
    hr:records.filter(p=>["Required","To be confirmed"].includes(p.hr_collaboration_status)&&!["Supported","Not required"].includes(p.hr_review_status)).length,
    evidence:records.filter(p=>Number(p.evidence_completeness||0)<70).length,
    priority:records.filter(p=>["Not Assessed","Watchlist / Under Review"].includes(p.priority_status)).length
  };
  return {
    records,total,originalCost,effectiveCost,proposedBudget,approvedBudget,portfolioCost,challengeReduction:originalCost-effectiveCost,
    originalCostCount,effectiveCostCount,portfolioCostCount:approvedBudgetCount,proposedBudgetCount,approvedBudgetCount,
    strategicPriority:records.filter(p=>["Strategic Priority","Corporate Priority"].includes(p.priority_status)||p.priority==="Strategic").length,
    watchlist:records.filter(p=>["Watchlist / Under Review","Not Assessed"].includes(p.priority_status)).length,
    atRisk:records.filter(p=>p.status==="At Risk"||["High","Extreme"].includes(p.risk_level)).length,
    overdue:records.filter(p=>p.target_date&&p.target_date<today&&p.status!=="Completed").length,
    departments:[...new Set(records.map(p=>p.department).filter(Boolean))],strategicReadiness,fullyReady,followUp:total-fullyReady,
    ownershipCompleteness:total?Math.round(records.filter(p=>p.executive_sponsor&&p.accountable_owner&&p.delivery_lead).length/total*100):0,
    evidenceAverage:total?Math.round(records.reduce((s,p)=>s+Number(p.evidence_completeness||0),0)/total):0,
    approvedBudgetCoverage:total?Math.round(approvedBudgetCount/total*100):0,
    critical,watch,stable:Math.max(0,total-critical.length-watch.length),decisionCounts,readinessScores
  };
}
function renderAdminOverview() {
  if (currentProfile?.role!=="super_admin") return;
  const metrics=calculateExecutiveMetrics();
  $("#admin-kpi-total").textContent=metrics.total;
  $("#admin-kpi-total-note").textContent=`${selectedYearLabel()} · ${metrics.departments.length} departments`;
  $("#admin-kpi-health").textContent=`${metrics.strategicReadiness}%`;
  $("#admin-kpi-health-note").textContent=`${metrics.fullyReady} initiatives meet all seven checks`;
  $("#admin-kpi-cost-label").textContent="Portfolio cost basis";
  $("#admin-kpi-effective-cost").textContent=compactRinggit(metrics.approvedBudget);
  $("#admin-kpi-effective-note").textContent=`Approved Budget · ${metrics.approvedBudgetCount}/${metrics.total||0} records populated`;
  const challengeMovement=metrics.challengeReduction;
  $("#admin-kpi-reduction").textContent=compactRinggit(Math.abs(challengeMovement));
  $("#admin-kpi-reduction-note").textContent=metrics.originalCost
    ? `${formatPercent(Math.abs(challengeMovement)/metrics.originalCost*100)} ${challengeMovement>=0?"reduction":"increase"} versus original estimate`
    : "Original estimate not yet populated";
  const challengeCard=$("#admin-kpi-reduction").closest(".executive-kpi-card");
  challengeCard?.classList.toggle("positive", challengeMovement>=0);
  challengeCard?.classList.toggle("danger", challengeMovement<0);
  $("#admin-kpi-priority").textContent=metrics.strategicPriority;
  $("#admin-kpi-risk").textContent=metrics.atRisk;
  $("#admin-kpi-approved-budget").textContent=compactRinggit(metrics.effectiveCost);
  $("#admin-kpi-approved-budget-note").textContent=metrics.effectiveCostCount
    ? `${metrics.effectiveCostCount}/${metrics.total || 0} records with confirmed post-challenge cost`
    : "Post-challenge cost not yet populated";
  $("#admin-kpi-approved-coverage").textContent=`${metrics.approvedBudgetCoverage}%`;
  $("#admin-kpi-approved-coverage-note").textContent=`${metrics.approvedBudgetCount}/${metrics.total || 0} records populated`;
  $("#admin-kpi-users").textContent=adminProfiles.length;
  $("#admin-assurance-ownership").textContent=`${metrics.ownershipCompleteness}%`;
  $("#admin-assurance-evidence").textContent=`${metrics.evidenceAverage}%`;
  $("#admin-assurance-budget").textContent=`${metrics.approvedBudgetCoverage}%`;
  $("#admin-assurance-overdue").textContent=metrics.overdue;
  renderManagementViews(metrics.records);
  renderExecutiveNarrative(metrics); renderExecutiveAttention(metrics); renderExecutiveBudget(metrics); renderExecutiveReadiness(metrics); renderExecutiveComparison(); renderExecutiveLists(metrics); renderAdminCharts(metrics); bindExecutiveRecordButtons();
}
function renderExecutiveNarrative(metrics) {
  const topDepartment=departmentCostData(metrics.records)[0], topPillar=pillarData("count",metrics.records)[0];
  const health=metrics.strategicReadiness>=85&&metrics.atRisk<=Math.max(1,metrics.total*.1)?"Healthy":metrics.strategicReadiness>=70?"Watch":"Intervention required";
  const badge=$("#admin-portfolio-health-badge"); badge.textContent=`${selectedYearLabel()} · ${health}`; badge.className=`executive-status-chip ${health==="Healthy"?"good":health==="Watch"?"watch":"critical"}`;
  $("#admin-executive-insight").textContent=metrics.total?`${selectedYearLabel()} contains ${metrics.total} initiatives across ${metrics.departments.length} departments, with strategic readiness of ${metrics.strategicReadiness}%. ${costBasisLabel()} is ${formatRinggit(metrics.portfolioCost)}, with ${metrics.portfolioCostCount} records populated. ${topPillar?topPillar.label+" carries the largest initiative concentration":"Pillar concentration is not yet available"}${topDepartment?", while "+topDepartment.label+" has the highest selected cost exposure.":"."}`:`No initiative records are currently entered for ${selectedYearLabel()}.`;
  $("#admin-insight-facts").innerHTML=`<article><strong>${metrics.strategicPriority} strategic-priority initiatives</strong><span>${metrics.watchlist} remain on watchlist or unassessed.</span></article><article><strong>${metrics.ownershipCompleteness}% ownership completeness</strong><span>Executive sponsor, accountable owner and delivery lead.</span></article><article><strong>${metrics.evidenceAverage}% evidence maturity</strong><span>Average evidence completeness for ${selectedYearLabel()}.</span></article>`;
}
function renderExecutiveAttention(metrics) {
  $("#admin-attention-critical").textContent=metrics.critical.length; $("#admin-attention-watch").textContent=metrics.watch.length; $("#admin-attention-stable").textContent=metrics.stable;
  const rows=[["Approved budget still blank",metrics.decisionCounts.approvedBudget],["Post-challenge cost still blank",metrics.decisionCounts.postChallengeCost],["ICT review / classification pending",metrics.decisionCounts.ict],["HR review or collaboration pending",metrics.decisionCounts.hr],["Evidence completeness below 70%",metrics.decisionCounts.evidence],["Priority decision outstanding",metrics.decisionCounts.priority]];
  $("#admin-attention-summary").innerHTML=rows.map(([l,v])=>`<div class="attention-row"><span>${escapeHtml(l)}</span><strong>${v}</strong></div>`).join("");
}
function renderExecutiveBudget(metrics) {
  $("#admin-budget-metrics").innerHTML=`<article><strong>${formatRinggit(metrics.challengeReduction)}</strong><span>Challenge movement versus original estimate</span></article><article><strong>${metrics.proposedBudgetCount}/${metrics.total}</strong><span>Initiatives with proposed budget populated</span></article><article><strong>${metrics.approvedBudgetCount}/${metrics.total}</strong><span>Initiatives with approved budget populated</span></article>`;
  $("#admin-budget-footnote").textContent=`${selectedYearLabel()} contains ${metrics.total} records. The headline KPI uses ${costBasisLabel().toLowerCase()}; the chart displays all four financial stages where populated.`;
}
function renderExecutiveReadiness(metrics) {
  const score = metrics.strategicReadiness;
  $("#admin-readiness-gauge-value").textContent = `${score}%`;
  $("#admin-readiness-progress").style.width = `${score}%`;
  const track = $("#admin-readiness-progress").closest('[role="progressbar"]');
  track?.setAttribute("aria-valuenow", String(score));
  const status = score >= 85 ? "Strong register readiness" : score >= 70 ? "Readiness follow-up required" : "Management intervention required";
  $("#admin-readiness-status").textContent = `${status} · ${metrics.fullyReady}/${metrics.total || 0} records meet all checks`;

  const departments = departmentReadinessData(metrics.records).slice(0, 10);
  $("#admin-department-readiness-bars").innerHTML = departments.length
    ? departments.map(item => `<button class="department-readiness-row" type="button" data-readiness-department="${escapeHtml(item.label)}"><span>${escapeHtml(item.label)}</span><div class="department-readiness-track"><i style="width:${item.value}%"></i></div><strong>${item.value}%</strong></button>`).join("")
    : '<div class="executive-empty">No departmental readiness data for this year.</div>';

  $$('[data-readiness-department]').forEach(button => button.addEventListener('click', () => {
    adminQuickFilter = 'readiness-followup';
    resetAdminFilterControls();
    $("#admin-search").value = button.dataset.readinessDepartment;
    showModule('admin-portfolio');
  }));

  $("#admin-readiness-footnote").innerHTML = `<strong>${metrics.fullyReady}</strong> ${selectedYearLabel()} initiatives meet all seven checks; <strong>${metrics.followUp}</strong> have at least one follow-up.`;
}
function comparisonMetricsForYear(year) {
  const records=projectsForYear(String(year));
  return {year,records,portfolioItems:records.length,portfolioCost:records.reduce((s,p)=>s+projectPortfolioCost(p),0),strategicPriority:records.filter(p=>["Strategic Priority","Corporate Priority"].includes(p.priority_status)||p.priority==="Strategic").length,watchlist:records.filter(p=>["Watchlist / Under Review","Not Assessed"].includes(p.priority_status)).length,zeroBudgetOrConfirmedCost:records.filter(p=>!hasPortfolioCost(p)||projectPortfolioCost(p)===0).length,departments:new Set(records.map(p=>p.department).filter(Boolean)).size};
}
function renderExecutiveComparison() {
  const a=comparisonMetricsForYear(2026), b=comparisonMetricsForYear(2027);
  const cards=[["Portfolio items","portfolioItems",String],["Portfolio cost basis","portfolioCost",compactRinggit],["Priority / corporate priority","strategicPriority",String],["Watchlist / under review","watchlist",String],["Zero / unconfirmed approved budget","zeroBudgetOrConfirmedCost",String],["Departments represented","departments",String]];
  $("#admin-comparison-grid").innerHTML=cards.map(([label,key,fmt])=>{const old=a[key],now=b[key],d=now-old,p=old?d/old*100:0;return `<article class="comparison-card"><span>${escapeHtml(label)}</span><div class="comparison-values"><div><span>AMP2026</span><strong>${fmt(old)}</strong></div><div><span>AMP2027</span><strong>${fmt(now)}</strong></div></div><div class="comparison-delta ${d>0?"negative":""}">${d>=0?"+":""}${key==="portfolioCost"?compactRinggit(d):d.toLocaleString("en-MY")} (${d>=0?"+":""}${p.toFixed(1)}%)</div></article>`;}).join("");
  const badge=$("#admin-comparison-source-status");
  if(!a.records.length&&!b.records.length){badge.textContent="No live year data";badge.className="executive-status-chip critical";}else if(!a.records.length){badge.textContent="AMP2026 data pending";badge.className="executive-status-chip watch";}else if(!b.records.length){badge.textContent="AMP2027 data pending";badge.className="executive-status-chip watch";}else{badge.textContent="Live Supabase comparison";badge.className="executive-status-chip good";}
  $("#admin-comparison-notes").innerHTML=`<div class="comparison-note"><strong>AMP2026 source:</strong> ${a.records.length} live records. Portfolio cost uses Approved Budget.</div><div class="comparison-note"><strong>AMP2027 source:</strong> ${b.records.length} live records. Portfolio cost also uses Approved Budget.</div><div class="comparison-note"><strong>Consistent basis:</strong> Both years use confirmed Approved Budget values; adding, editing or deleting records updates the comparison automatically.</div>`;
}
function renderExecutiveLists(metrics) {
  const records=metrics.records;
  const decisions=[["Approved budget coverage",metrics.decisionCounts.approvedBudget],["Post-challenge cost confirmation",metrics.decisionCounts.postChallengeCost],["ICT assessment",metrics.decisionCounts.ict],["HR and workforce review",metrics.decisionCounts.hr],["Evidence closure",metrics.decisionCounts.evidence],["Priority determination",metrics.decisionCounts.priority]].filter(x=>x[1]>0);
  $("#admin-decision-queue").innerHTML=decisions.length?decisions.map(([t,c])=>`<div class="executive-list-item"><div><strong>${escapeHtml(t)}</strong><span>${c} initiatives require follow-up in ${selectedYearLabel()}.</span></div><em>${c}</em></div>`).join(""):'<div class="executive-empty">No executive decision queue is currently outstanding.</div>';
  const top=records.slice().sort((a,b)=>projectPortfolioCost(b)-projectPortfolioCost(a)).filter(p=>projectPortfolioCost(p)>0).slice(0,5);
  $("#admin-top-cost-list").innerHTML=top.length?top.map(p=>`<div class="executive-list-item"><div><strong>${escapeHtml(p.initiative_name)}</strong><span>AMP${projectImplementationYear(p)} · ${escapeHtml(p.department||"No department")}</span></div><button data-executive-open="${p.id}" type="button">${compactRinggit(projectPortfolioCost(p))}</button></div>`).join(""):'<div class="executive-empty">No selected-year cost records are available.</div>';
  const order={Extreme:4,High:3,Medium:2,Low:1}, risk=records.slice().sort((a,b)=>(order[b.risk_level]||0)-(order[a.risk_level]||0)||Number(a.readiness_score||0)-Number(b.readiness_score||0)).slice(0,5);
  $("#admin-top-risk-list").innerHTML=risk.length?risk.map(p=>`<div class="executive-list-item"><div><strong>${escapeHtml(p.initiative_name)}</strong><span>AMP${projectImplementationYear(p)} · ${escapeHtml(p.department||"No department")} · ${Number(p.readiness_score||0)}% readiness</span></div><button data-executive-open="${p.id}" type="button">${escapeHtml(p.risk_level||"Not rated")}</button></div>`).join(""):'<div class="executive-empty">No risk records are available.</div>';
}
function renderAdminCharts(metrics = calculateExecutiveMetrics()) {
  ["adminBudgetJourney", "adminDeliveryLoad", "adminCostBenefit", "adminPillar", "adminHome31Fit", "adminDepartmentCost"].forEach(key => charts[key]?.destroy());
  if (typeof Chart === "undefined") return;

  const records = metrics.records;
  const common = executiveChartOptions();
  const reduction = metrics.challengeReduction;
  const reductionRange = [Math.min(metrics.originalCost, metrics.effectiveCost), Math.max(metrics.originalCost, metrics.effectiveCost)];

  charts.adminBudgetJourney = new Chart($("#admin-budget-journey-chart"), {
    type: "bar",
    data: {
      labels: ["Original estimate", "Challenge movement", "Post-challenge", "Proposed budget", "Approved budget"],
      datasets: [
        {
          label: "Financial stage",
          data: [metrics.originalCost, null, metrics.effectiveCost, metrics.proposedBudget, metrics.approvedBudget],
          backgroundColor: [EXECUTIVE_SERIES_COLORS.blue, null, EXECUTIVE_SERIES_COLORS.gold, EXECUTIVE_SERIES_COLORS.teal, EXECUTIVE_SERIES_COLORS.green],
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 72
        },
        {
          label: reduction >= 0 ? "Challenge reduction" : "Challenge increase",
          data: [null, reductionRange, null, null, null],
          backgroundColor: reduction >= 0 ? EXECUTIVE_SERIES_COLORS.green : EXECUTIVE_SERIES_COLORS.red,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 72
        }
      ]
    },
    options: {
      ...common,
      interaction: { mode: "index", intersect: false },
      plugins: {
        ...common.plugins,
        legend: { display: false },
        tooltip: {
          ...common.plugins.tooltip,
          callbacks: {
            label: context => context.dataIndex === 1
              ? `${reduction >= 0 ? "Reduction" : "Increase"}: ${formatRinggit(Math.abs(reduction))}`
              : formatRinggit(context.parsed.y)
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: EXECUTIVE_COLORS.text, maxRotation: 0, minRotation: 0 } },
        y: { beginAtZero: true, grid: { color: EXECUTIVE_COLORS.grid }, ticks: { color: EXECUTIVE_COLORS.text, callback: value => compactRinggit(value) } }
      }
    }
  });

  const delivery = quarterlyDeliveryData(records);
  charts.adminDeliveryLoad = new Chart($("#admin-delivery-load-chart"), {
    data: {
      labels: delivery.labels,
      datasets: [
        { type: "bar", label: "Planning / On Hold", data: delivery.planning, backgroundColor: "rgba(127,153,175,.78)", borderRadius: 4, stack: "delivery" },
        { type: "bar", label: "In Progress", data: delivery.inProgress, backgroundColor: "rgba(87,153,155,.88)", borderRadius: 4, stack: "delivery" },
        { type: "bar", label: "At Risk", data: delivery.atRisk, backgroundColor: "rgba(210,96,102,.9)", borderRadius: 4, stack: "delivery" },
        { type: "bar", label: "Completed", data: delivery.completed, backgroundColor: "rgba(108,166,155,.78)", borderRadius: 4, stack: "delivery" },
        { type: "line", label: "Strategic Priority", data: delivery.priority, borderColor: EXECUTIVE_SERIES_COLORS.gold, backgroundColor: EXECUTIVE_SERIES_COLORS.gold, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: .28, yAxisID: "y" }
      ]
    },
    options: {
      ...common,
      plugins: { ...common.plugins, legend: { ...common.plugins.legend, position: "bottom" } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: EXECUTIVE_COLORS.text } },
        y: { stacked: true, beginAtZero: true, grid: { color: EXECUTIVE_COLORS.grid }, ticks: { color: EXECUTIVE_COLORS.text, precision: 0 } }
      }
    }
  });

  const matrixRecords = records.filter(project => hasPortfolioCost(project) && numericValue(project.cba_ratio) !== null);
  const costs = matrixRecords.map(projectPortfolioCost).filter(value => value > 0).sort((a, b) => a - b);
  const medianCost = costs.length ? costs[Math.floor(costs.length / 2)] : 0;
  const groups = ["Strategic Priority", "Watchlist / Under Review", "Recommended", "Not Classified"];
  const colors = {
    "Strategic Priority": EXECUTIVE_SERIES_COLORS.gold,
    "Watchlist / Under Review": EXECUTIVE_SERIES_COLORS.blue,
    Recommended: EXECUTIVE_SERIES_COLORS.teal,
    "Not Classified": EXECUTIVE_SERIES_COLORS.red
  };

  charts.adminCostBenefit = new Chart($("#admin-cost-benefit-chart"), {
    type: "bubble",
    plugins: [QUADRANT_GUIDE_PLUGIN],
    data: {
      datasets: groups.map(group => ({
        label: group,
        data: matrixRecords.filter(project => normalizePriorityGroup(project) === group).map(project => ({
          x: projectPortfolioCost(project),
          y: Number(project.cba_ratio || 0),
          r: project.people_impact_level === "Enterprise-wide" ? 14 : project.people_impact_level === "High" ? 11 : 8,
          project
        })),
        backgroundColor: `${colors[group]}cc`,
        borderColor: colors[group],
        borderWidth: 1.5
      }))
    },
    options: {
      ...common,
      onClick: (_event, elements, chart) => {
        if (!elements.length) return;
        const point = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];
        if (point?.project?.id) openInitiativeModal(point.project.id);
      },
      plugins: {
        ...common.plugins,
        legend: { ...common.plugins.legend, position: "bottom" },
        quadrantGuide: { xThreshold: medianCost, yThreshold: 1 },
        tooltip: {
          ...common.plugins.tooltip,
          callbacks: {
            title: items => items[0]?.raw?.project?.initiative_name || "Initiative",
            label: context => [
              `Approved budget: ${formatRinggit(context.raw.x)}`,
              `CBA ratio: ${Number(context.raw.y).toFixed(2)}`,
              `Priority: ${normalizePriorityGroup(context.raw.project)}`
            ]
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: EXECUTIVE_COLORS.grid }, ticks: { color: EXECUTIVE_COLORS.text, callback: value => compactRinggit(value) }, title: { display: true, text: `${selectedYearLabel()} approved budget`, color: EXECUTIVE_COLORS.text } },
        y: { beginAtZero: true, grid: { color: EXECUTIVE_COLORS.grid }, ticks: { color: EXECUTIVE_COLORS.text }, title: { display: true, text: "CBA ratio", color: EXECUTIVE_COLORS.text } }
      }
    }
  });

  renderExecutivePillarChart(records);

  const fitOrder = ["Core Initiative", "Enabler", "Supporting Activity", "BAU · Supporting Enhancement", "Policy Review", "Duplicate / Consolidate", "Needs Validation"];
  const fitPalette = [EXECUTIVE_SERIES_COLORS.gold, EXECUTIVE_SERIES_COLORS.teal, EXECUTIVE_SERIES_COLORS.blue, EXECUTIVE_SERIES_COLORS.slate, EXECUTIVE_SERIES_COLORS.green, "#9a7c6f", EXECUTIVE_SERIES_COLORS.red];
  const fitData = fitOrder.map((label, index) => ({ label, value: records.filter(project => deriveHome31Fit(project) === label).length, color: fitPalette[index] })).filter(item => item.value > 0);
  const safeFitData = fitData.length ? fitData : [{ label: "No classified records", value: 1, color: "#47667c" }];

  charts.adminHome31Fit = new Chart($("#admin-home31-fit-chart"), {
    type: "doughnut",
    data: {
      labels: safeFitData.map(item => item.label),
      datasets: [{ data: safeFitData.map(item => item.value), backgroundColor: safeFitData.map(item => item.color), borderColor: "#102f49", borderWidth: 3, cutout: "66%" }]
    },
    options: { ...common, plugins: { ...common.plugins, legend: { ...common.plugins.legend, position: "bottom" } } }
  });

  renderLiveDepartmentComparison();
  $("#admin-delivery-footnote").textContent = `${selectedYearLabel()} quarter load uses action-plan, start and target dates. Undated initiatives are excluded.`;
  $("#admin-matrix-footnote").textContent = matrixRecords.length
    ? `Quadrants use median approved budget ${compactRinggit(medianCost)} and CBA ratio 1.00 as decision guides. Click a bubble to open its record.`
    : `Add both ${costBasisLabel().toLowerCase()} and CBA ratio to display initiatives in the matrix.`;
}
function renderLiveDepartmentComparison() {
  charts.adminDepartmentCost?.destroy(); if(typeof Chart==="undefined") return;
  const d26=departmentCostData(projectsForYear("2026")),d27=departmentCostData(projectsForYear("2027")),m26=new Map(d26.map(i=>[i.label,i.value])),m27=new Map(d27.map(i=>[i.label,i.value]));
  const labels=[...new Set([...m26.keys(),...m27.keys()])].map(label=>({label,total:(m26.get(label)||0)+(m27.get(label)||0)})).sort((a,b)=>b.total-a.total).slice(0,12).map(i=>i.label);
  charts.adminDepartmentCost=new Chart($("#admin-department-cost-chart"),{type:"bar",data:{labels,datasets:[{label:"AMP2026 Approved Budget",data:labels.map(l=>m26.get(l)||0),backgroundColor:EXECUTIVE_COLORS.blue,borderRadius:6},{label:"AMP2027 Approved Budget",data:labels.map(l=>m27.get(l)||0),backgroundColor:EXECUTIVE_COLORS.gold,borderRadius:6}]},options:{...executiveChartOptions(),indexAxis:"y",onClick:(_e,elements)=>{if(!elements.length)return;selectedAdminYear=elements[0].datasetIndex===0?"2026":"2027";$("#admin-year-select").value=selectedAdminYear;updateAdminYearBadge();$("#admin-search").value=labels[elements[0].index];showModule("admin-portfolio");renderAdminPortfolio();},scales:executiveMoneyScales()}});
  const t26=projectsForYear("2026").reduce((s,p)=>s+projectPortfolioCost(p),0),t27=projectsForYear("2027").reduce((s,p)=>s+projectPortfolioCost(p),0);
  $("#admin-cost-concentration-footnote").textContent=`Live sources: AMP2026 approved budget ${formatRinggit(t26)}; AMP2027 approved budget ${formatRinggit(t27)}. Click a bar to open that year and department.`;
}
function renderExecutivePillarChart(records = projectsForYear()) {
  charts.adminPillar?.destroy();
  if (typeof Chart === "undefined") return;
  const data = pillarData(pillarMetric, records);
  const palette = ["#d1ad63", "#57999b", "#78a8c4", "#6ca69b", "#7892a6"];
  charts.adminPillar = new Chart($("#admin-pillar-chart"), {
    type: "bar",
    data: {
      labels: data.map(item => shortPillar(item.label)),
      datasets: [{
        label: pillarMetric === "count" ? "Initiatives" : "Portfolio cost",
        data: data.map(item => item.value),
        backgroundColor: data.map((_item, index) => palette[index % palette.length]),
        borderRadius: 7,
        borderSkipped: false,
        maxBarThickness: 34
      }]
    },
    options: {
      ...executiveChartOptions(),
      indexAxis: "y",
      onClick: (_event, elements) => {
        if (!elements.length) return;
        adminQuickFilter = "";
        resetAdminFilterControls();
        $("#admin-pillar-filter").value = data[elements[0].index].label;
        showModule("admin-portfolio");
      },
      plugins: { ...executiveChartOptions().plugins, legend: { display: false } },
      scales: pillarMetric === "cost" ? executiveMoneyScales() : executiveCountScales()
    }
  });
}
function pillarData(metric="count",records=projectsForYear()) {return pillars.map(p=>{const related=records.filter(r=>r.strategic_pillar===p);return{label:p,value:metric==="cost"?related.reduce((s,r)=>s+projectPortfolioCost(r),0):related.length};}).sort((a,b)=>b.value-a.value);}
function departmentCostData(records=projectsForYear()) {const map=new Map();records.forEach(p=>{const d=p.department||"Not recorded";map.set(d,(map.get(d)||0)+projectPortfolioCost(p));});return[...map.entries()].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);}
function departmentReadinessData(records=projectsForYear()) {const map=new Map();records.forEach(p=>{const d=p.department||"Not recorded",c=map.get(d)||{total:0,count:0};c.total+=calculateProjectReadiness(p).score;c.count++;map.set(d,c);});return[...map.entries()].map(([label,d])=>({label,value:Math.round(d.total/d.count)})).sort((a,b)=>a.value-b.value);}
function quarterlyDeliveryData(records = projectsForYear()) {
  const ranges = records.map(project => ({ project, range: extractProjectDateRange(project) })).filter(item => item.range);
  const fallback = selectedAdminYear === "all" ? new Date().getFullYear() : Number(selectedAdminYear);
  const min = ranges.length ? Math.min(...ranges.map(item => item.range.start.getFullYear())) : fallback;
  const max = ranges.length ? Math.max(...ranges.map(item => item.range.end.getFullYear())) : fallback;
  const quarters = [];
  for (let year = min; year <= Math.min(min + 4, Math.max(min, max)); year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const startMonth = (quarter - 1) * 3;
      quarters.push({ label: `${year} Q${quarter}`, start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 0, 23, 59, 59) });
    }
  }
  const activeInQuarter = quarter => ranges.filter(item => item.range.start <= quarter.end && item.range.end >= quarter.start);
  return {
    labels: quarters.map(quarter => quarter.label),
    planning: quarters.map(quarter => activeInQuarter(quarter).filter(item => ["Planning", "On Hold"].includes(item.project.status)).length),
    inProgress: quarters.map(quarter => activeInQuarter(quarter).filter(item => item.project.status === "In Progress").length),
    atRisk: quarters.map(quarter => activeInQuarter(quarter).filter(item => item.project.status === "At Risk").length),
    completed: quarters.map(quarter => activeInQuarter(quarter).filter(item => item.project.status === "Completed").length),
    priority: quarters.map(quarter => activeInQuarter(quarter).filter(item => normalizePriorityGroup(item.project) === "Strategic Priority").length)
  };
}
function getFilteredAdminPortfolioRecords() {
  const query = ($("#admin-search").value || "").toLowerCase();
  const department = $("#admin-department-filter").value || "";
  const status = $("#admin-status-filter").value || "";
  const pillar = $("#admin-pillar-filter").value || "";
  const risk = $("#admin-risk-filter").value || "";
  return projectsForYear().filter(project => {
    const haystack = [projectImplementationYear(project), project.initiative_name, project.accountable_owner, project.executive_sponsor, project.delivery_lead, project.department, project.initiative_category, project.system_type, project.priority_status].join(" ").toLowerCase();
    return matchesAdminQuickFilter(project) &&
      (!query || haystack.includes(query)) &&
      (!department || project.department === department) &&
      (!status || project.status === status) &&
      (!pillar || project.strategic_pillar === pillar) &&
      (!risk || project.risk_level === risk);
  });
}
function renderAdminPortfolio() {
  if(currentProfile?.role!=="super_admin")return;const yearRecords=projectsForYear(),filtered=getFilteredAdminPortfolioRecords(),cost=filtered.reduce((s,p)=>s+projectPortfolioCost(p),0),approved=filtered.filter(p=>financialFieldConfirmed(p,"approved_budget")).length,atRisk=filtered.filter(p=>p.status==="At Risk"||["High","Extreme"].includes(p.risk_level)).length,ready=filtered.filter(p=>Number(p.readiness_score||0)>=80&&!["High","Extreme"].includes(p.risk_level)&&p.status!=="At Risk").length,today=new Date().toISOString().slice(0,10),ownership=filtered.filter(p=>p.executive_sponsor&&p.accountable_owner&&p.delivery_lead).length,evidence=filtered.length?Math.round(filtered.reduce((s,p)=>s+Number(p.evidence_completeness||0),0)/filtered.length):0,ict=filtered.filter(p=>p.ict_classification==="New - Pending ICT review"||((p.system_type&&p.system_type!=="Non System")&&!p.ict_classification)).length,hr=filtered.filter(p=>["Required","To be confirmed"].includes(p.hr_collaboration_status)&&!["Supported","Not required"].includes(p.hr_review_status)).length,overdue=filtered.filter(p=>p.target_date&&p.target_date<today&&p.status!=="Completed").length;
  $("#portfolio-kpi-total").textContent=yearRecords.length;$("#portfolio-kpi-filtered").textContent=filtered.length;$("#portfolio-kpi-cost").textContent=compactRinggit(cost);$("#portfolio-kpi-budget").textContent=`${filtered.length?Math.round(approved/filtered.length*100):0}%`;$("#portfolio-kpi-risk").textContent=atRisk;$("#portfolio-kpi-ready").textContent=ready;$("#portfolio-table-count").textContent=`${selectedYearLabel()} · ${filtered.length} record${filtered.length===1?"":"s"}`;$("#portfolio-assurance-ownership").textContent=`${filtered.length?Math.round(ownership/filtered.length*100):0}%`;$("#portfolio-assurance-evidence").textContent=`${evidence}%`;$("#portfolio-assurance-ict").textContent=ict;$("#portfolio-assurance-hr").textContent=hr;$("#portfolio-assurance-overdue").textContent=overdue;
  const filterCount=[$("#admin-search").value,$("#admin-department-filter").value,$("#admin-status-filter").value,$("#admin-pillar-filter").value,$("#admin-risk-filter").value].filter(Boolean).length+(adminQuickFilter?1:0);const quickLabel=adminQuickFilterLabel();$("#portfolio-selection-badge").textContent=quickLabel?`${selectedYearLabel()} · ${quickLabel}`:filterCount?`${selectedYearLabel()} · ${filterCount} active filters`:selectedYearLabel();
  const topD=aggregateFiltered(filtered,p=>p.department||"Not recorded",projectPortfolioCost)[0],topP=aggregateFiltered(filtered,p=>p.strategic_pillar||"Not recorded",()=>1)[0];
  $("#portfolio-selection-insight").textContent=filtered.length?`${selectedYearLabel()} selection contains ${filtered.length} initiatives with ${formatRinggit(cost)} under the ${costBasisLabel().toLowerCase()} rule. ${atRisk} require risk attention and ${ready} meet the delivery-ready rule.`:`No ${selectedYearLabel()} initiative matches the selected filters.`;
  $("#portfolio-selection-facts").innerHTML=`<article><strong>${escapeHtml(topD?.label||"No data")}</strong><span>Highest approved budget: ${topD?compactRinggit(topD.value):"RM0"}</span></article><article><strong>${escapeHtml(shortPillar(topP?.label||"No data"))}</strong><span>Largest concentration: ${topP?.value||0} records</span></article><article><strong>${evidence}% evidence maturity</strong><span>${hr} HR and ${ict} ICT follow-ups remain.</span></article>`;
  $("#admin-portfolio-table tbody").innerHTML=filtered.length?filtered.map(p=>`<tr><td><span class="portfolio-year-pill">AMP${projectImplementationYear(p)}</span></td><td><strong>${escapeHtml(p.initiative_name)}</strong></td><td>${escapeHtml(p.accountable_owner||"Not recorded")}</td><td>${escapeHtml(p.department)}</td><td>${escapeHtml(p.initiative_category||"Not recorded")}</td><td>${escapeHtml(p.system_type||"Not recorded")}</td><td>${escapeHtml(p.priority_status||"Not assessed")}</td><td>${escapeHtml(p.strategic_pillar)}</td><td><span class="status-pill">${escapeHtml(p.status)}</span></td><td><span class="risk-pill">${escapeHtml(p.risk_level)}</span></td><td>${financialFieldConfirmed(p,"approved_budget") ? formatRinggit(p.approved_budget) : "Not recorded"}</td><td>${Number(p.readiness_score||0)}%</td><td>${progressBar(p.progress)}</td><td><button class="text-button" data-admin-edit="${p.id}" type="button">Edit</button></td></tr>`).join(""):'<tr><td colspan="14">No records match the active year and filters.</td></tr>';
  renderPortfolioActiveFilters();
  renderContinuityRegister();
  $$('[data-admin-edit]').forEach(b=>b.addEventListener('click',()=>openInitiativeModal(b.dataset.adminEdit)));
}

function continuityNormalisedTitle(project) {
  return String(project?.initiative_name || "")
    .toLowerCase()
    .replace(/\b(?:amp)?20(?:26|27)\b/g, " ")
    .replace(/\bno\.?\s*\d+[a-z]?\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function continuityTokens(value) {
  return new Set(String(value || "")
    .toLowerCase()
    .replace(/\b(?:amp)?20(?:26|27)\b/g, " ")
    .replace(/\bno\.?\s*\d+[a-z]?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2 && !CONTINUITY_STOP_WORDS.has(token)));
}

function continuitySetScores(left, right) {
  const a = continuityTokens(left);
  const b = continuityTokens(right);
  if (!a.size || !b.size) return { jaccard: 0, containment: 0, shared: 0 };
  const shared = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return {
    jaccard: union ? shared / union : 0,
    containment: Math.min(a.size, b.size) ? shared / Math.min(a.size, b.size) : 0,
    shared
  };
}

function continuityCandidateScore(previous, current) {
  const previousTitle = continuityNormalisedTitle(previous);
  const currentTitle = continuityNormalisedTitle(current);
  const title = continuitySetScores(previousTitle, currentTitle);
  const previousRef = String(previous.source_reference_no || "").trim().toLowerCase();
  const currentRef = String(current.source_reference_no || "").trim().toLowerCase();
  const exactReference = Boolean(previousRef && currentRef && previousRef === currentRef);
  const exactTitle = Boolean(previousTitle && previousTitle === currentTitle);
  const departmentMatch = Boolean(previous.department && current.department && previous.department === current.department);
  const pillarMatch = Boolean(previous.strategic_pillar && current.strategic_pillar && previous.strategic_pillar === current.strategic_pillar);
  const description = continuitySetScores(previous.project_description || previous.problem_opportunity, current.project_description || current.problem_opportunity);
  const meaningfulTitle = title.shared >= 2 || (title.shared >= 1 && title.containment >= .66);
  if (!exactReference && !exactTitle && !meaningfulTitle) return null;
  let score = exactReference ? 1 : exactTitle ? .97 : (title.jaccard * .38 + title.containment * .37);
  if (!exactReference && !exactTitle) {
    if (departmentMatch) score += .11;
    if (pillarMatch) score += .08;
    score += Math.min(.06, description.containment * .06);
  }
  score = Math.max(0, Math.min(1, score));
  if (!exactReference && !exactTitle && score < .50) return null;
  return { score, exactReference, exactTitle, title };
}

function buildContinuityRegister() {
  const previous = adminProjects.filter(project => projectImplementationYear(project) === 2026);
  const current = adminProjects.filter(project => projectImplementationYear(project) === 2027);
  const candidates = [];
  previous.forEach(previousProject => {
    current.forEach(currentProject => {
      const result = continuityCandidateScore(previousProject, currentProject);
      if (result) candidates.push({ previous: previousProject, current: currentProject, ...result });
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  const usedPrevious = new Set();
  const usedCurrent = new Set();
  const pairs = [];
  candidates.forEach(candidate => {
    if (usedPrevious.has(candidate.previous.id) || usedCurrent.has(candidate.current.id)) return;
    usedPrevious.add(candidate.previous.id);
    usedCurrent.add(candidate.current.id);
    pairs.push({ ...candidate, continuityType: classifyContinuityPair(candidate) });
  });
  current.filter(project => !usedCurrent.has(project.id)).forEach(project => pairs.push({
    previous: null, current: project, score: 0, continuityType: "New / unmatched"
  }));
  previous.filter(project => !usedPrevious.has(project.id)).forEach(project => pairs.push({
    previous: project, current: null, score: 0, continuityType: "No identified continuation"
  }));
  return pairs;
}

function classifyContinuityPair(pair) {
  const previous = pair.previous;
  const current = pair.current;
  if (!previous) return "New / unmatched";
  if (!current) return "No identified continuation";
  const title = `${continuityNormalisedTitle(previous)} ${continuityNormalisedTitle(current)}`;
  const recurringTerms = /\b(annual|annually|yearly|renewal|maintenance|audit|write off|writeoff)\b/i.test(`${previous.initiative_name || ""} ${current.initiative_name || ""}`);
  const currentTokens = continuityTokens(current.initiative_name);
  const previousTokens = continuityTokens(previous.initiative_name);
  const addedTokens = [...currentTokens].filter(token => !previousTokens.has(token)).length;
  const previousCost = financialFieldConfirmed(previous, "approved_budget") ? projectPortfolioCost(previous) : null;
  const currentCost = financialFieldConfirmed(current, "approved_budget") ? projectPortfolioCost(current) : null;
  const materialIncrease = previousCost !== null && currentCost !== null && previousCost > 0 && (currentCost - previousCost) / previousCost >= .20;
  if (recurringTerms && (pair.exactTitle || pair.score >= .78)) return "Recurring annual activity";
  if (addedTokens >= 2 || materialIncrease) return "Expanded continuation";
  if (pair.exactReference || pair.exactTitle || pair.score >= .72 || current.initiative_category === "Carry Forward Initiative") return "Direct carry-forward";
  return "Evolved / reframed";
}

function continuityTheme(pair) {
  const project = pair.current || pair.previous;
  return String(project?.initiative_name || "Unclassified initiative")
    .replace(/\b(?:AMP)?20(?:26|27)\b/gi, "")
    .replace(/\bNo\.?\s*\d+[A-Za-z]?\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,:;–—-]+|[\s,:;–—-]+$/g, "") || project?.initiative_name || "Unclassified initiative";
}

function continuityTreatment(type) {
  return {
    "Recurring annual activity": "Track annual approval, delivery and year-on-year outcome consistently.",
    "Direct carry-forward": "Manage as one continuing programme with a shared benefits baseline.",
    "Expanded continuation": "Confirm expanded scope, incremental budget and accountable ownership.",
    "Evolved / reframed": "Validate the changed scope and document the transition from AMP2026.",
    "New / unmatched": "Confirm that this is genuinely new and not a renamed prior-year initiative.",
    "No identified continuation": "Confirm closure, completion, deferral or omission from AMP2027."
  }[type] || "Management review required.";
}

function continuityPairMatchesControlFilters(pair) {
  const projects = [pair.previous, pair.current].filter(Boolean);
  const query = ($("#admin-search").value || "").trim().toLowerCase();
  const department = $("#admin-department-filter").value || "";
  const status = $("#admin-status-filter").value || "";
  const pillar = $("#admin-pillar-filter").value || "";
  const risk = $("#admin-risk-filter").value || "";
  const haystack = projects.map(project => [
    project.initiative_name, project.accountable_owner, project.department,
    project.source_reference_no, project.strategic_pillar
  ].join(" ")).join(" ").toLowerCase();
  return (!adminQuickFilter || projects.some(project => matchesAdminQuickFilter(project))) &&
    (!query || haystack.includes(query)) &&
    (!department || projects.some(project => project.department === department)) &&
    (!status || projects.some(project => project.status === status)) &&
    (!pillar || projects.some(project => project.strategic_pillar === pillar)) &&
    (!risk || projects.some(project => project.risk_level === risk));
}

function continuityBudgetMovement(pair) {
  const previousConfirmed = pair.previous && financialFieldConfirmed(pair.previous, "approved_budget");
  const currentConfirmed = pair.current && financialFieldConfirmed(pair.current, "approved_budget");
  if (!previousConfirmed || !currentConfirmed) return { text: "Not comparable", percent: "Approved Budget missing", className: "neutral" };
  const previousCost = projectPortfolioCost(pair.previous);
  const currentCost = projectPortfolioCost(pair.current);
  const movement = currentCost - previousCost;
  const percent = previousCost ? movement / previousCost * 100 : (currentCost ? 100 : 0);
  return {
    text: `${movement > 0 ? "+" : ""}${formatRinggit(movement)}`,
    percent: `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`,
    className: movement > 0 ? "increase" : movement < 0 ? "reduction" : "neutral"
  };
}

function continuityProjectCell(project, year) {
  if (!project) return `<span class="continuity-empty">No identified ${year === 2026 ? "source" : "continuation"}</span>`;
  const budget = financialFieldConfirmed(project, "approved_budget") ? `${formatRinggit(project.approved_budget)} approved` : "Approved Budget not confirmed";
  return `<button class="continuity-project-button" type="button" data-continuity-open="${project.id}"><strong>${escapeHtml(project.source_reference_no ? `${project.source_reference_no} · ` : "")}${escapeHtml(project.initiative_name)}</strong></button><span>${escapeHtml(project.department || "Department not recorded")}</span><em>${escapeHtml(budget)}</em>`;
}

function renderContinuityRegister() {
  if (currentProfile?.role !== "super_admin" || !$("#portfolio-continuity-table")) return;
  const allPairs = buildContinuityRegister();
  const identified = allPairs.filter(pair => pair.previous && pair.current).length;
  const newCount = allPairs.filter(pair => !pair.previous && pair.current).length;
  const endedCount = allPairs.filter(pair => pair.previous && !pair.current).length;
  $("#continuity-kpi-identified").textContent = identified;
  $("#continuity-kpi-new").textContent = newCount;
  $("#continuity-kpi-carried").textContent = identified;
  $("#continuity-kpi-ended").textContent = endedCount;

  const type = $("#continuity-type-filter").value || "";
  const search = ($("#continuity-search").value || "").trim().toLowerCase();
  const filtered = allPairs.filter(pair => {
    const text = `${continuityTheme(pair)} ${pair.previous?.initiative_name || ""} ${pair.current?.initiative_name || ""}`.toLowerCase();
    return continuityPairMatchesControlFilters(pair) && (!type || pair.continuityType === type) && (!search || text.includes(search));
  });

  $("#continuity-table-count").textContent = `${filtered.length} continuity row${filtered.length === 1 ? "" : "s"}`;
  $("#portfolio-continuity-table tbody").innerHTML = filtered.length ? filtered.map(pair => {
    const movement = continuityBudgetMovement(pair);
    const confidence = pair.previous && pair.current ? `${Math.round(pair.score * 100)}% match confidence` : "Unmatched record";
    return `<tr>
      <td><strong>${escapeHtml(continuityTheme(pair))}</strong><span>${escapeHtml(continuityTreatment(pair.continuityType))}</span></td>
      <td>${continuityProjectCell(pair.previous, 2026)}</td>
      <td>${continuityProjectCell(pair.current, 2027)}</td>
      <td><strong class="continuity-movement ${movement.className}">${escapeHtml(movement.text)}</strong><span>${escapeHtml(movement.percent)}</span></td>
      <td><span class="continuity-type-badge">${escapeHtml(pair.continuityType)}</span><small>${escapeHtml(confidence)}</small></td>
    </tr>`;
  }).join("") : '<tr><td colspan="5">No AMP2026–AMP2027 continuity rows match the selected filters.</td></tr>';

  $$('[data-continuity-open]').forEach(button => button.addEventListener('click', () => openInitiativeModal(button.dataset.continuityOpen)));
}

function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function exportAdminPortfolioCsv() {if(currentProfile?.role!=="super_admin")return;const records=getFilteredAdminPortfolioRecords(),headers=["Implementation Year","Initiative","Department","Executive Sponsor","Project Owner Name","Delivery Lead","Category","System Type","Priority Status","Strategic Pillar","Status","Risk","Approved Budget","Post-Challenge Cost","Readiness","Progress","Evidence Completeness"],rows=records.map(p=>[projectImplementationYear(p),p.initiative_name,p.department,p.executive_sponsor,p.accountable_owner,p.delivery_lead,p.initiative_category,p.system_type,p.priority_status,p.strategic_pillar,p.status,p.risk_level,financialFieldConfirmed(p,"approved_budget")?(p.approved_budget??0):"",financialFieldConfirmed(p,"estimated_cost_post_challenge")?(p.estimated_cost_post_challenge??0):"",p.readiness_score??0,p.progress??0,p.evidence_completeness??0]),csv="\uFEFF"+[headers,...rows].map(r=>r.map(safeCsvCell).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`HOME31-${selectedYearLabel().replaceAll(' ','-')}-Portfolio-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);}
function renderAdminExceptions() {
  if(currentProfile?.role!=="super_admin")return;const records=projectsForYear(),today=new Date().toISOString().slice(0,10),risk=records.filter(p=>["High","Extreme"].includes(p.risk_level)),readiness=records.filter(p=>Number(p.readiness_score||0)<70),overdue=records.filter(p=>p.target_date&&p.target_date<today&&p.status!=="Completed"),hrPending=records.filter(p=>["Required","To be confirmed"].includes(p.hr_collaboration_status)&&!["Supported","Not required"].includes(p.hr_review_status)),ictPending=records.filter(p=>p.ict_classification==="New - Pending ICT review"||((p.system_type&&p.system_type!=="Non System")&&!p.ict_classification)),evidence=records.filter(p=>Number(p.evidence_completeness||0)<70);
  $("#admin-exception-risk-count").textContent=risk.length;$("#admin-exception-readiness-count").textContent=readiness.length;$("#admin-exception-overdue-count").textContent=overdue.length;$("#admin-exception-hr-count").textContent=hrPending.length;$("#admin-exception-ict-count").textContent=ictPending.length;$("#admin-exception-evidence-count").textContent=evidence.length;$("#admin-exception-risk-badge").textContent=risk.length;$("#admin-exception-readiness-badge").textContent=readiness.length;$("#admin-exception-overdue-badge").textContent=overdue.length;
  $("#admin-exception-risk-list").innerHTML=renderExceptionList(risk,p=>`AMP${projectImplementationYear(p)} · ${p.risk_level} risk · ${p.status}`);$("#admin-exception-readiness-list").innerHTML=renderExceptionList(readiness,p=>`AMP${projectImplementationYear(p)} · ${Number(p.readiness_score||0)}% readiness`);$("#admin-exception-overdue-list").innerHTML=renderExceptionList(overdue,p=>`AMP${projectImplementationYear(p)} · Target ${p.target_date}`);$("#admin-exception-hr-list").innerHTML=renderExceptionList(hrPending,p=>`AMP${projectImplementationYear(p)} · ${p.hr_review_status||"Not reviewed"}`);$("#admin-exception-ict-list").innerHTML=renderExceptionList(ictPending,p=>`AMP${projectImplementationYear(p)} · ${p.ict_classification||"Classification missing"}`);$("#admin-exception-evidence-list").innerHTML=renderExceptionList(evidence,p=>`AMP${projectImplementationYear(p)} · ${Number(p.evidence_completeness||0)}% evidence`);
  const critical=new Set([...risk.filter(p=>p.risk_level==="Extreme"),...overdue.filter(p=>p.status==="At Risk")]),watch=new Set([...risk,...readiness,...overdue,...hrPending,...ictPending,...evidence]);critical.forEach(p=>watch.delete(p));const stable=Math.max(0,records.length-critical.size-watch.size),treatment=risk.length?Math.round(risk.filter(p=>p.next_action&&Number(p.readiness_score||0)>=60).length/risk.length*100):100,avg=records.length?Math.round(records.reduce((s,p)=>s+Number(p.readiness_score||0),0)/records.length):0;
  $("#exception-assurance-stable").textContent=stable;$("#exception-assurance-watch").textContent=watch.size;$("#exception-assurance-critical").textContent=critical.size;$("#exception-assurance-treatment").textContent=`${treatment}%`;$("#exception-assurance-average").textContent=`${avg}%`;
  renderAdminExceptionCharts({records,risk,readiness,overdue,hrPending,ictPending,evidence});$$('[data-exception-open]').forEach(b=>b.addEventListener('click',()=>openInitiativeModal(b.dataset.exceptionOpen)));
}
function renderAdminExceptionCharts(data) {
  charts.adminExceptionRisk?.destroy();charts.adminExceptionHealth?.destroy();if(typeof Chart==="undefined")return;const risks=["Low","Medium","High","Extreme"];
  charts.adminExceptionRisk=new Chart($("#admin-exception-risk-chart"),{type:"doughnut",data:{labels:risks,datasets:[{data:risks.map(r=>data.records.filter(p=>p.risk_level===r).length),backgroundColor:["#6ca69b","#7f99af","#d1ad63","#d26066"],borderColor:"#102f49",borderWidth:4,cutout:"62%"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:EXECUTIVE_COLORS.text,usePointStyle:true,boxWidth:8,font: { size: 12 }}}}}});
  charts.adminExceptionHealth=new Chart($("#admin-exception-health-chart"),{type:"bar",data:{labels:["Risk","Low readiness","Overdue","HR","ICT","Evidence"],datasets:[{data:[data.risk.length,data.readiness.length,data.overdue.length,data.hrPending.length,data.ictPending.length,data.evidence.length],backgroundColor:["#d26066","#d1ad63","#b97859","#57999b","#7f99af","#6f86a0"],borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:EXECUTIVE_COLORS.text,font: { size: 12 }}},y:{beginAtZero:true,grid:{color:EXECUTIVE_COLORS.grid},ticks:{color:EXECUTIVE_COLORS.text,precision:0}}}}});
}


/* ================================================================
   V7.7.1 DISPLAY SETTINGS AND RESPONSIVE READABILITY
   ================================================================ */

function initialiseDisplaySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(DISPLAY_SETTINGS_KEY) || "{}");
    if (DISPLAY_MODES.includes(saved.size)) currentDisplaySize = saved.size;
    highContrastEnabled = Boolean(saved.highContrast);
  } catch (_error) {
    currentDisplaySize = "standard";
    highContrastEnabled = false;
  }

  applyDisplaySettings(false);

  $("#display-settings-toggle").addEventListener("click", toggleDisplaySettingsPanel);
  $("#display-settings-close").addEventListener("click", closeDisplaySettingsPanel);
  $("#display-settings-reset").addEventListener("click", resetDisplaySettings);
  $("#display-high-contrast").addEventListener("change", event => {
    highContrastEnabled = event.target.checked;
    applyDisplaySettings();
  });

  $$("[data-display-size]").forEach(button => {
    button.addEventListener("click", () => {
      currentDisplaySize = button.dataset.displaySize;
      applyDisplaySettings();
    });
  });

  document.addEventListener("click", event => {
    const settings = $("#display-settings");
    if (settings && !settings.contains(event.target)) closeDisplaySettingsPanel();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDisplaySettingsPanel();

    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      toggleDisplaySettingsPanel();
    }
  });
}

function applyDisplaySettings(announce = true) {
  document.documentElement.dataset.displaySize = currentDisplaySize;
  document.documentElement.dataset.contrast = highContrastEnabled ? "high" : "normal";

  $$("[data-display-size]").forEach(button => {
    const active = button.dataset.displaySize === currentDisplaySize;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });

  const contrastToggle = $("#display-high-contrast");
  if (contrastToggle) contrastToggle.checked = highContrastEnabled;

  const labels = {
    standard: "Standard display",
    comfortable: "Comfortable display",
    large: "Large display"
  };
  const status = `${labels[currentDisplaySize]}${highContrastEnabled ? " with high contrast" : ""} is active.`;
  const statusElement = $("#display-settings-status");
  if (statusElement) statusElement.textContent = status;

  try {
    localStorage.setItem(
      DISPLAY_SETTINGS_KEY,
      JSON.stringify({
        size: currentDisplaySize,
        highContrast: highContrastEnabled
      })
    );
  } catch (_error) {
    // The interface still works when local storage is unavailable.
  }

  updateChartReadability();
  scheduleResponsiveTableEnhancement();

  if (announce && typeof showToast === "function") {
    showToast(status);
  }
}

function resetDisplaySettings() {
  currentDisplaySize = "standard";
  highContrastEnabled = false;
  applyDisplaySettings();
}

function toggleDisplaySettingsPanel() {
  const panel = $("#display-settings-panel");
  const toggle = $("#display-settings-toggle");
  const opening = panel.classList.contains("hidden");

  panel.classList.toggle("hidden", !opening);
  toggle.setAttribute("aria-expanded", String(opening));

  if (opening) {
    window.setTimeout(() => {
      const active = $(`[data-display-size="${currentDisplaySize}"]`);
      active?.focus();
    }, 20);
  }
}

function closeDisplaySettingsPanel() {
  const panel = $("#display-settings-panel");
  const toggle = $("#display-settings-toggle");
  if (!panel || panel.classList.contains("hidden")) return;

  panel.classList.add("hidden");
  toggle?.setAttribute("aria-expanded", "false");
}

function initialiseResponsiveTables() {
  scheduleResponsiveTableEnhancement();

  const platform = $("#platform");
  if (!platform || responsiveTableObserver) return;

  responsiveTableObserver = new MutationObserver(() => {
    scheduleResponsiveTableEnhancement();
  });

  responsiveTableObserver.observe(platform, {
    childList: true,
    subtree: true
  });
}

function scheduleResponsiveTableEnhancement() {
  if (tableEnhancementScheduled) return;
  tableEnhancementScheduled = true;

  window.requestAnimationFrame(() => {
    tableEnhancementScheduled = false;
    enhanceResponsiveTables();
  });
}

function enhanceResponsiveTables() {
  $$("table").forEach(table => {
    table.classList.add("responsive-table");

    const headers = [...table.querySelectorAll("thead th")]
      .map(header => header.textContent.trim());

    [...table.querySelectorAll("tbody tr")].forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (!cell.dataset.label) {
          cell.dataset.label = headers[index] || `Field ${index + 1}`;
        }
      });
    });
  });
}

function chartFontSize() {
  if (currentDisplaySize === "large") return 15;
  if (currentDisplaySize === "standard") return 11;
  return 13;
}

function updateChartReadability() {
  if (typeof Chart === "undefined") return;

  const size = chartFontSize();
  Chart.defaults.font.family =
    '"IBM Plex Sans", "Aptos", "Segoe UI Variable", "Segoe UI", Arial, sans-serif';
  Chart.defaults.font.size = size;
  Chart.defaults.color = "#33424c";

  Object.values(charts).forEach(chart => {
    if (!chart?.options) return;
    const darkSurface = Boolean(chart.canvas?.closest(".executive-command-centre, .admin-command-module"));
    const readableColor = darkSurface
      ? (highContrastEnabled ? "#ffffff" : EXECUTIVE_COLORS.text)
      : "#251b1c";

    const legendLabels = chart.options.plugins?.legend?.labels;
    if (legendLabels) {
      legendLabels.font = {
        ...(typeof legendLabels.font === "object" ? legendLabels.font : {}),
        family: Chart.defaults.font.family,
        size
      };
      legendLabels.color = readableColor;
      legendLabels.padding = Math.max(Number(legendLabels.padding || 12), 14);
    }

    Object.values(chart.options.scales || {}).forEach(scale => {
      if (scale?.ticks) {
        scale.ticks.font = {
          ...(typeof scale.ticks.font === "object" ? scale.ticks.font : {}),
          family: Chart.defaults.font.family,
          size
        };
        scale.ticks.color = readableColor;
      }

      if (scale?.title) {
        scale.title.font = {
          ...(typeof scale.title.font === "object" ? scale.title.font : {}),
          family: Chart.defaults.font.family,
          size: size + 1,
          weight: "600"
        };
        scale.title.color = readableColor;
      }
    });

    chart.resize();
    chart.update("none");
  });
}


/* ================================================================
   V7.9.4 WORKSPACE STATE & EXECUTIVE TABS
   ================================================================ */
function workspaceUserKey() {
  return currentUser?.id || "anonymous";
}

function readWorkspaceState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(WORKSPACE_STATE_KEY) || "{}");
    return parsed.userId === workspaceUserKey() ? parsed : { userId: workspaceUserKey(), scrollPositions: {} };
  } catch (_error) {
    return { userId: workspaceUserKey(), scrollPositions: {} };
  }
}

function writeWorkspaceState(patch = {}) {
  if (!currentUser?.id) return;
  const current = readWorkspaceState();
  const next = {
    ...current,
    ...patch,
    userId: workspaceUserKey(),
    scrollPositions: patch.scrollPositions || current.scrollPositions || {}
  };
  try {
    sessionStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(next));
  } catch (_error) {
    // Navigation remains functional when storage is unavailable.
  }
}

function shouldRouteAuthEvent(event, session) {
  if (event === "SIGNED_OUT" || !session?.user) return true;
  const sameUser = Boolean(currentUser?.id && currentUser.id === session.user.id);
  const platformOpen = Boolean(currentProfile && !$("#platform")?.classList.contains("hidden"));
  if (sameUser && platformOpen && ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED"].includes(event)) {
    return false;
  }
  return true;
}

function resolveRestoredModule(defaultModule, isSuperAdmin) {
  const state = readWorkspaceState();
  const requested = state.activeModule;
  if (!requested || !$(`#module-${requested}`)) return defaultModule;
  if (!isSuperAdmin && requested.startsWith("admin-")) return defaultModule;
  return requested;
}

function currentModuleName() {
  return $(".module.active")?.id?.replace(/^module-/, "") || "";
}

function rememberCurrentModuleScroll() {
  if (!currentUser?.id) return;
  const name = currentModuleName();
  if (!name) return;
  const state = readWorkspaceState();
  writeWorkspaceState({
    scrollPositions: { ...(state.scrollPositions || {}), [name]: Math.max(0, Math.round(window.scrollY)) }
  });
}

function saveWorkspaceModule(name) {
  writeWorkspaceState({ activeModule: name, executiveTab: activeExecutiveTab });
}

function restoreWorkspaceScroll(name) {
  const state = readWorkspaceState();
  const top = Number(state.scrollPositions?.[name] || 0);
  window.setTimeout(() => window.scrollTo({ top, behavior: "auto" }), 90);
}

function clearWorkspaceState() {
  try {
    sessionStorage.removeItem(WORKSPACE_STATE_KEY);
  } catch (_error) {
    // Nothing else is required.
  }
  activeExecutiveTab = "summary";
}

function initialiseWorkspacePersistence() {
  const state = readWorkspaceState();
  try {
    activeExecutiveTab = state.executiveTab || localStorage.getItem(EXECUTIVE_TAB_STATE_KEY) || "summary";
  } catch (_error) {
    activeExecutiveTab = state.executiveTab || "summary";
  }
  window.addEventListener("scroll", () => {
    if (workspaceScrollTimer) window.clearTimeout(workspaceScrollTimer);
    workspaceScrollTimer = window.setTimeout(rememberCurrentModuleScroll, 140);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") rememberCurrentModuleScroll();
  });
}

function initialiseExecutiveWorkspaceTabs() {
  const overview = $("#module-admin-overview");
  const hero = overview?.querySelector(":scope > .executive-hero");
  if (!overview || !hero || overview.querySelector(".executive-workspace-tabs")) return;

  const tabs = document.createElement("div");
  tabs.className = "executive-workspace-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Executive Overview workspace");
  tabs.innerHTML = `
    <span class="executive-tab-summary-note">Choose a focused management view</span>
    <button class="executive-workspace-tab" type="button" role="tab" data-executive-tab="summary" aria-selected="false">Management Summary</button>
    <button class="executive-workspace-tab" type="button" role="tab" data-executive-tab="analytics" aria-selected="false">Visual Analytics</button>
  `;
  hero.insertAdjacentElement("afterend", tabs);

  [...overview.children].forEach(child => {
    if (child === hero || child === tabs) return;
    const analytics = child.classList.contains("executive-dashboard-grid") || child.classList.contains("full-width-panel");
    child.dataset.executiveTabSection = analytics ? "analytics" : "summary";
  });

  const tabButtons = [...tabs.querySelectorAll("[data-executive-tab]")];
  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => applyExecutiveTab(button.dataset.executiveTab));
    button.addEventListener("keydown", event => {
      let targetIndex = null;
      if (event.key === "ArrowRight") targetIndex = (index + 1) % tabButtons.length;
      if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = tabButtons.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      const target = tabButtons[targetIndex];
      applyExecutiveTab(target.dataset.executiveTab);
      target.focus();
    });
  });

  applyExecutiveTab(activeExecutiveTab, { focus: false, persist: false, preserveViewport: false });
}

function applyExecutiveTab(tab, { focus = false, persist = true, preserveViewport = true } = {}) {
  const overview = $("#module-admin-overview");
  const tabBar = overview?.querySelector(".executive-workspace-tabs");
  if (!overview || !tabBar) return;
  const nextTab = tab === "analytics" ? "analytics" : "summary";
  const anchorTop = preserveViewport ? tabBar.getBoundingClientRect().top : null;
  activeExecutiveTab = nextTab;

  overview.querySelectorAll("[data-executive-tab-section]").forEach(section => {
    section.classList.toggle("executive-tab-hidden", section.dataset.executiveTabSection !== nextTab);
  });
  tabBar.querySelectorAll("[data-executive-tab]").forEach(button => {
    const selected = button.dataset.executiveTab === nextTab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });

  if (persist) {
    writeWorkspaceState({ executiveTab: nextTab });
    try { localStorage.setItem(EXECUTIVE_TAB_STATE_KEY, nextTab); } catch (_error) {}
  }

  if (anchorTop !== null) {
    const shift = tabBar.getBoundingClientRect().top - anchorTop;
    if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: "auto" });
  }
  window.setTimeout(() => Object.values(charts).forEach(chart => chart?.resize?.()), 100);
}


function applyDepartmentProfileControl() {
  const field = $("#account-department");
  const note = $("#account-department-note");
  if (!field) return;
  const managed = currentProfile?.role !== "super_admin";
  field.readOnly = managed;
  field.classList.toggle("account-department-managed", managed);
  field.title = managed ? "Department assignment is managed by a HOME31 administrator." : "";
  if (note) note.textContent = managed
    ? "Department assignment controls portfolio access and can only be changed by a HOME31 administrator."
    : "Super admins may maintain their own profile department.";
}

function applyDepartmentInitiativeControl() {
  if (currentProfile?.role === "super_admin") return;
  const field = $("#initiative-department");
  if (!field) return;
  field.value = String(currentProfile?.department || "").trim();
  field.readOnly = true;
  field.classList.add("account-department-managed");
  field.title = "New initiatives are restricted to your assigned department.";
}

function initialiseDepartmentUserControls() {
  applyDepartmentProfileControl();
  const modal = $("#initiative-modal");
  if (!modal) return;
  const observer = new MutationObserver(() => {
    if (!modal.classList.contains("hidden")) applyDepartmentInitiativeControl();
  });
  observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
}
