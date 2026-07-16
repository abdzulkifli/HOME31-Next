/* HOME31 V7.9.3 — display docking and factual chart presentation layer. */
(() => {
  "use strict";

  const chartBasis = {
    "user-status-chart": "Initiative count grouped by the saved Status field.",
    "admin-budget-journey-chart": "Financial journey: Initial Estimate → Post-Challenge Estimate → Proposed Budget → Approved Budget. Blank stages remain unconfirmed.",
    "admin-readiness-gauge-chart": "Strategic readiness is derived from the seven documented completeness checks.",
    "admin-delivery-load-chart": "Quarterly load uses dated action-plan entries, Start Date and Target Completion Date.",
    "admin-cost-benefit-chart": "Horizontal position uses Approved Budget; vertical position uses CBA Ratio. Records missing either value are excluded.",
    "admin-department-cost-chart": "Department concentration uses confirmed Approved Budget only.",
    "admin-pillar-chart": "Count view uses initiative records; Cost view uses confirmed Approved Budget only.",
    "admin-home31-fit-chart": "HOME31 Fit is a derived management classification, not a formal approval decision.",
    "admin-user-role-chart": "User distribution is grouped by the saved profile Role field.",
    "admin-exception-risk-chart": "Risk exposure is grouped by the saved Risk Level field.",
    "admin-exception-health-chart": "Exception counts are derived from the current readiness, risk, overdue, HR, ICT and evidence rules."
  };

  const moneyCharts = new Set([
    "admin-budget-journey-chart",
    "admin-cost-benefit-chart",
    "admin-department-cost-chart"
  ]);

  const countCharts = new Set([
    "user-status-chart",
    "admin-delivery-load-chart",
    "admin-pillar-chart",
    "admin-home31-fit-chart",
    "admin-user-role-chart",
    "admin-exception-risk-chart",
    "admin-exception-health-chart"
  ]);

  const ringgit = value => {
    const number = Number(value || 0);
    const sign = number < 0 ? "-" : "";
    const absolute = Math.abs(number);
    if (absolute >= 1_000_000_000) return `${sign}RM${(absolute / 1_000_000_000).toFixed(2)}B`;
    if (absolute >= 1_000_000) return `${sign}RM${(absolute / 1_000_000).toFixed(2)}M`;
    if (absolute >= 1_000) return `${sign}RM${(absolute / 1_000).toFixed(1)}K`;
    return `${sign}RM${absolute.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
  };

  function syncDisplayLocation() {
    const settings = document.querySelector("#display-settings");
    const platform = document.querySelector("#platform");
    const topbarActions = document.querySelector(".topbar-actions");
    if (!settings || !platform) return;

    const platformVisible = !platform.classList.contains("hidden");
    document.body.classList.toggle("home31-platform-visible", platformVisible);

    if (platformVisible && topbarActions && settings.parentElement !== topbarActions) {
      topbarActions.appendChild(settings);
      settings.classList.add("display-settings-inline");
    } else if (!platformVisible && settings.parentElement !== document.body) {
      document.body.appendChild(settings);
      settings.classList.remove("display-settings-inline");
    }
  }

  function addBasisNote(canvas) {
    const text = chartBasis[canvas.id];
    if (!text) return;
    const panel = canvas.closest(".executive-panel, .admin-command-panel, .panel");
    if (!panel || panel.querySelector(`.home31-chart-basis[data-chart-id="${canvas.id}"]`)) return;
    const note = document.createElement("div");
    note.className = "home31-chart-basis";
    note.dataset.chartId = canvas.id;
    note.innerHTML = `<strong>Data basis:</strong> ${text}`;
    panel.appendChild(note);
  }

  function hasMeaningfulData(chart) {
    return (chart?.data?.datasets || []).some(dataset => {
      return (dataset.data || []).some(item => {
        if (typeof item === "number") return Number.isFinite(item) && item !== 0;
        if (item && typeof item === "object") {
          return [item.x, item.y, item.r].some(value => Number.isFinite(Number(value)) && Number(value) !== 0);
        }
        return false;
      });
    });
  }

  function applyChartConsistency(canvas) {
    if (!window.Chart?.getChart) return;
    const chart = window.Chart.getChart(canvas);
    if (!chart || chart.$home31ConsistencyApplied) return;

    const darkSurface = Boolean(canvas.closest(".executive-command-centre, .admin-command-module"));
    const text = darkSurface ? "#b4c6d2" : "#33424c";
    const grid = darkSurface ? "rgba(141,178,200,.17)" : "rgba(71,102,123,.13)";
    const isDoughnut = ["doughnut", "pie", "polarArea"].includes(chart.config.type);

    chart.options.responsive = true;
    chart.options.maintainAspectRatio = false;
    chart.options.animation = chart.options.animation === false ? false : { duration: 260 };
    chart.options.plugins ||= {};
    chart.options.plugins.legend ||= {};
    chart.options.plugins.legend.position = isDoughnut ? "bottom" : "top";
    chart.options.plugins.legend.labels ||= {};
    chart.options.plugins.legend.labels.color = text;
    chart.options.plugins.legend.labels.usePointStyle = true;
    chart.options.plugins.legend.labels.boxWidth = 9;
    chart.options.plugins.legend.labels.padding = 14;
    chart.options.plugins.legend.labels.font = { family: "IBM Plex Sans", size: 12, weight: "600" };
    chart.options.plugins.legend.labels.filter = item => {
      const dataset = chart.data.datasets?.[item.datasetIndex || 0];
      if (!dataset) return true;
      if (isDoughnut && Number(dataset.data?.[item.index] || 0) === 0) return false;
      return true;
    };

    chart.options.plugins.tooltip ||= {};
    chart.options.plugins.tooltip.callbacks ||= {};
    const existingLabel = chart.options.plugins.tooltip.callbacks.label;
    chart.options.plugins.tooltip.callbacks.label = context => {
      const raw = context.raw;
      if (moneyCharts.has(canvas.id)) {
        const value = typeof raw === "object" && raw !== null ? (raw.y ?? raw.x ?? 0) : raw;
        return `${context.dataset.label ? `${context.dataset.label}: ` : ""}${ringgit(value)}`;
      }
      if (isDoughnut) {
        const value = Number(raw || 0);
        const total = (context.dataset.data || []).reduce((sum, item) => sum + Number(item || 0), 0);
        const percent = total ? (value / total * 100).toFixed(1) : "0.0";
        return `${context.label}: ${value.toLocaleString("en-MY")} (${percent}%)`;
      }
      if (countCharts.has(canvas.id) && typeof raw === "number") {
        return `${context.dataset.label ? `${context.dataset.label}: ` : ""}${Math.round(raw).toLocaleString("en-MY")}`;
      }
      return typeof existingLabel === "function" ? existingLabel(context) : `${context.dataset.label || context.label}: ${context.formattedValue}`;
    };

    Object.values(chart.options.scales || {}).forEach(scale => {
      if (!scale) return;
      if (scale.type !== "category" && scale.beginAtZero === undefined) scale.beginAtZero = true;
      scale.grid ||= {};
      scale.grid.color = grid;
      scale.border ||= {};
      scale.border.color = grid;
      scale.ticks ||= {};
      scale.ticks.color = text;
      scale.ticks.font = { family: "IBM Plex Sans", size: 11 };
      if (countCharts.has(canvas.id) && !scale.ticks.callback) {
        scale.ticks.precision = 0;
      }
      if (moneyCharts.has(canvas.id) && !scale.ticks.callback) {
        scale.ticks.callback = value => ringgit(value);
      }
      if (scale.title) {
        scale.title.color = text;
        scale.title.font = { family: "IBM Plex Sans", size: 12, weight: "600" };
      }
    });

    canvas.setAttribute("role", "img");
    if (!canvas.getAttribute("aria-label")) {
      const heading = canvas.closest(".executive-panel, .admin-command-panel, .panel")?.querySelector("h3")?.textContent?.trim();
      canvas.setAttribute("aria-label", heading ? `${heading} chart` : "HOME31 portfolio chart");
    }

    addBasisNote(canvas);
    if (!hasMeaningfulData(chart)) {
      const note = canvas.closest(".executive-panel, .admin-command-panel, .panel")?.querySelector(`.home31-chart-basis[data-chart-id="${canvas.id}"]`);
      if (note) {
        note.dataset.status = "warning";
        note.innerHTML += " <strong>No populated values are available for the current selection.</strong>";
      }
    }

    chart.$home31ConsistencyApplied = true;
    chart.update("none");
  }

  function auditCharts() {
    document.querySelectorAll("canvas[id]").forEach(applyChartConsistency);
  }

  function initialise() {
    syncDisplayLocation();
    auditCharts();

    const platform = document.querySelector("#platform");
    if (platform) {
      new MutationObserver(() => {
        syncDisplayLocation();
        window.setTimeout(auditCharts, 80);
      }).observe(platform, { attributes: true, attributeFilter: ["class"] });
    }

    new MutationObserver(() => window.requestAnimationFrame(auditCharts))
      .observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", syncDisplayLocation, { passive: true });
    window.setInterval(auditCharts, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
