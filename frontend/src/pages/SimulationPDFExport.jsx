/*
import jsPDF from "jspdf";

import html2canvas from "html2canvas";
*/
/**
 * Generates and downloads a PDF for a PK simulation result.
 *
 * @param {Object} sim         - The simulation object from your API response
 * @param {React.RefObject} chartRef - A ref attached to the chart DOM element
 */ /*
export async function downloadSimulationPDF(sim, chartRef) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addText = (text, size = 10, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(String(text ?? "N/A"), contentW);
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.4) + 2;
  };

  const addSectionTitle = (title) => {
    y += 3;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y - 4, contentW, 7, "F");
    addText(title, 11, true);
    y += 1;
  };

  const addKeyValue = (label, value, unit = "") => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}: `, margin, y);
    const labelWidth = pdf.getTextWidth(`${label}: `);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${value ?? "N/A"}${unit ? " " + unit : ""}`, margin + labelWidth, y);
    y += 6;
  };

  const checkPageBreak = (neededHeight = 20) => {
    if (y + neededHeight > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  pdf.setFillColor(30, 64, 175); // blue-800
  pdf.rect(0, 0, pageW, 22, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("PK Simulation Report", margin, 14);
  pdf.setTextColor(0, 0, 0);
  y = 30;

  // Date + Simulation ID
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  pdf.text(`Simulation ID: ${sim.id ?? "—"}`, pageW - margin, y, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  y += 8;

  // ── Medication & Dose ────────────────────────────────────────────────────
  addSectionTitle("Medication & Dosing");
  addKeyValue("Medication ID", sim.medication_id);
  addKeyValue("Dose", sim.dose_mg, "mg");
  addKeyValue("Dosing Interval", sim.interval_hr, "hr");
  addKeyValue("Simulation Duration", sim.duration_hr, "hr");

  // ── PK Metrics ───────────────────────────────────────────────────────────
  checkPageBreak(40);
  addSectionTitle("Pharmacokinetic Metrics");
  addKeyValue("Cmax", sim.cmax_mg_l?.toFixed(4), "mg/L");
  addKeyValue("Cmin", sim.cmin_mg_l?.toFixed(4), "mg/L");
  addKeyValue("AUC",  sim.auc_mg_h_l?.toFixed(4), "mg·h/L");

  // Flags
  y += 2;
  const flagColor = sim.flag_too_high || sim.flag_too_low ? [200, 0, 0] : [0, 140, 0];
  pdf.setTextColor(...flagColor);
  addText(
    `⚠ Flags: ${sim.flag_too_high ? "Concentration TOO HIGH  " : ""}${sim.flag_too_low ? "Concentration TOO LOW" : ""}${!sim.flag_too_high && !sim.flag_too_low ? "None — within therapeutic range" : ""}`,
    10, true
  );
  pdf.setTextColor(0, 0, 0);

  // ── Therapeutic Window ───────────────────────────────────────────────────
  checkPageBreak(30);
  addSectionTitle("Therapeutic Window");
  const tw = sim.therapeutic_window ?? {};
  addKeyValue("Lower Bound", tw.lower_mg_l?.toFixed(4), "mg/L");
  addKeyValue("Upper Bound", tw.upper_mg_l?.toFixed(4), "mg/L");
  addKeyValue("Source", tw.source);

  // ── Therapeutic Evaluation ───────────────────────────────────────────────
  checkPageBreak(40);
  addSectionTitle("Therapeutic Evaluation");
  const te = sim.therapeutic_eval ?? {};
  Object.entries(te).forEach(([k, v]) => {
    addKeyValue(k, typeof v === "number" ? v.toFixed(3) : v);
    checkPageBreak(8);
  });

  // ── Patient Context ───────────────────────────────────────────────────────
  checkPageBreak(50);
  addSectionTitle("Patient Context");
  const pc = sim.patient_context ?? {};
  const patientFields = [
    ["Age",                  pc.age,                          ""],
    ["Sex",                  pc.sex,                          ""],
    ["Weight",               pc.weight_kg,                    "kg"],
    ["Height",               pc.height_cm,                    "cm"],
    ["Serum Creatinine",     pc.serum_creatinine_mg_dl,       "mg/dL"],
    ["Creatinine Clearance", pc.creatinine_clearance_ml_min,  "mL/min"],
    ["CKD Stage",            pc.ckd_stage,                    ""],
    ["Pregnant",             pc.is_pregnant,                  ""],
    ["Liver Disease",        pc.liver_disease_status,         ""],
    ["Albumin",              pc.albumin_g_dl,                 "g/dL"],
  ];
  patientFields.forEach(([label, val, unit]) => {
    checkPageBreak(8);
    addKeyValue(label, val, unit);
  });

  if (pc.conditions?.length) {
    checkPageBreak(10);
    addKeyValue("Conditions", pc.conditions.join(", "));
  }
  if (pc.current_medications?.length) {
    checkPageBreak(10);
    addKeyValue("Current Medications", pc.current_medications.join(", "));
  }

  // ── ADE Screening ─────────────────────────────────────────────────────────
  checkPageBreak(30);
  addSectionTitle("ADE Screening");
  const ade = sim.ade_screening ?? {};
  Object.entries(ade).forEach(([k, v]) => {
    checkPageBreak(8);
    const display = typeof v === "object" ? JSON.stringify(v) : v;
    addKeyValue(k, display);
  });

  // ── Concentration–Time Chart (screenshot) ─────────────────────────────────
  if (chartRef?.current) {
    checkPageBreak(90);
    addSectionTitle("Concentration–Time Profile");
    y += 2;
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgH = (canvas.height / canvas.width) * contentW;
      checkPageBreak(imgH + 5);
      pdf.addImage(imgData, "PNG", margin, y, contentW, imgH);
      y += imgH + 5;
    } catch (err) {
      addText("(Chart could not be rendered)", 9);
      console.warn("Chart screenshot failed:", err);
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}  |  Confidential – For clinical use only`,
      pageW / 2,
      pdf.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  pdf.save(`simulation_${sim.id ?? "report"}.pdf`);
} 
// Working on finalizing the design of the pdf export
*/
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BRAND_BLUE   = [30, 64, 175];
const BRAND_LIGHT  = [239, 246, 255];
const GREEN        = [22, 163, 74];
const YELLOW       = [202, 138, 4];
const RED          = [220, 38, 38];
const GRAY         = [107, 114, 128];
const DARK         = [17, 24, 39];

function riskColor(level) {
  if (!level) return GRAY;
  const l = level.toLowerCase();
  if (l === "low")    return GREEN;
  if (l === "medium") return YELLOW;
  if (l === "high")   return RED;
  return GRAY;
}

export async function downloadSimulationPDF(sim, chartRef) {
  const pdf    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW  = pdf.internal.pageSize.getWidth();
  const pageH  = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const cW     = pageW - margin * 2;
  let y        = margin;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const rgb = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });

  const setColor = (arr, type = "text") => {
    if (type === "text") pdf.setTextColor(arr[0], arr[1], arr[2]);
    else                 pdf.setFillColor(arr[0], arr[1], arr[2]);
  };

  const resetColor = () => pdf.setTextColor(DARK[0], DARK[1], DARK[2]);

  const addText = (text, size = 10, bold = false, color = DARK) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    setColor(color);
    const lines = pdf.splitTextToSize(String(text ?? "N/A"), cW);
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.4) + 2;
    resetColor();
  };

  const addKV = (label, value, unit = "", valueColor = DARK) => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    resetColor();
    pdf.text(`${label}: `, margin, y);
    const lw = pdf.getTextWidth(`${label}: `);
    pdf.setFont("helvetica", "normal");
    setColor(valueColor);
    pdf.text(`${value ?? "N/A"}${unit ? " " + unit : ""}`, margin + lw, y);
    resetColor();
    y += 6;
  };

  const addSectionTitle = (title) => {
    y += 4;
    checkPage(12);
    setColor(BRAND_LIGHT, "fill");
    pdf.rect(margin, y - 5, cW, 8, "F");
    setColor(BRAND_BLUE, "fill");
    pdf.rect(margin, y - 5, 3, 8, "F");
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    setColor(BRAND_BLUE);
    pdf.text(title, margin + 5, y);
    resetColor();
    y += 5;
  };

  const checkPage = (needed = 20) => {
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const drawHRule = () => {
    setColor(GRAY, "fill"); // not a fill but reuse for draw color
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y, margin + cW, y);
    y += 4;
  };

  // ── Header bar ────────────────────────────────────────────────────────────
  setColor(BRAND_BLUE, "fill");
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("PK Simulation Report", margin, 13);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Pharmacokinetic Analysis — Patient Copy", margin, 20);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 20, { align: "right" });
  resetColor();
  y = 36;

  // ── Simulation meta ───────────────────────────────────────────────────────
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  setColor(GRAY);
  pdf.text(`Simulation ID: ${sim.id ?? "—"}`, margin, y);
  pdf.text(`Shared by: ${sim.shared_by ?? "—"}   |   Shared at: ${sim.shared_at ?? "—"}`, pageW - margin, y, { align: "right" });
  resetColor();
  y += 8;
  drawHRule();

  // ── Summary box ───────────────────────────────────────────────────────────
  const te       = sim.therapeutic_eval ?? {};
  const tw       = sim.therapeutic_window ?? {};
  const pc       = sim.patient_context ?? {};
  const ade      = sim.ade_screening ?? {};
  const params   = sim.params_used ?? {};
  const evalData = te;
  const pctWithin = typeof evalData.pct_within === "number" ? evalData.pct_within : null;
  const pctAbove  = typeof evalData.pct_above  === "number" ? evalData.pct_above  : null;
  const pctBelow  = typeof evalData.pct_below  === "number" ? evalData.pct_below  : null;
  const riskLevel = typeof evalData.ade_risk_level === "string" ? evalData.ade_risk_level : null;
  const alerts    = Array.isArray(evalData.alerts) ? evalData.alerts : [];

  // summary card background
  setColor(BRAND_LIGHT, "fill");
  pdf.rect(margin, y, cW, 38, "F");
  pdf.setDrawColor(...BRAND_BLUE);
  pdf.rect(margin, y, cW, 38, "S");
  y += 6;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  setColor(BRAND_BLUE);
  pdf.text("At-a-Glance Summary", margin + 4, y);
  y += 7;

  // 3-column summary stats
  const cols = [
    { label: "Time in Range",   value: pctWithin != null ? `${pctWithin}%` : "N/A", color: pctWithin >= 70 ? GREEN : pctWithin >= 50 ? YELLOW : RED },
    { label: "Time Too High",   value: pctAbove  != null ? `${pctAbove}%`  : "N/A", color: pctAbove  > 10  ? RED   : GREEN },
    { label: "Time Too Low",    value: pctBelow  != null ? `${pctBelow}%`  : "N/A", color: pctBelow  > 20  ? RED   : GREEN },
  ];
  const colW = cW / 3;
  cols.forEach((col, i) => {
    const cx = margin + i * colW + colW / 2;
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    setColor(col.color);
    pdf.text(col.value, cx, y, { align: "center" });
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    setColor(GRAY);
    pdf.text(col.label, cx, y + 6, { align: "center" });
  });
  y += 18;

  // Risk badge
  const rc = riskColor(riskLevel);
  setColor(rc, "fill");
  pdf.roundedRect(margin + 4, y - 2, 50, 7, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Risk Level: ${riskLevel ? riskLevel.toUpperCase() : "UNKNOWN"}`, margin + 8, y + 3);
  resetColor();

  // Flags
  if (sim.flag_too_high || sim.flag_too_low) {
    setColor(RED);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    const flagText = [
      sim.flag_too_high ? "⚠ Concentration TOO HIGH" : "",
      sim.flag_too_low  ? "⚠ Concentration TOO LOW"  : "",
    ].filter(Boolean).join("   ");
    pdf.text(flagText, margin + 60, y + 3);
    resetColor();
  }
  y += 12;

  // ── Medication & Dosing ───────────────────────────────────────────────────
  addSectionTitle("Medication & Dosing");
  addKV("Medication", sim.medication_name || sim.medication_id);
  addKV("Dose",               sim.dose_mg,      "mg");
  addKV("Dosing Interval",    sim.interval_hr,  "hr");
  addKV("Simulation Duration",sim.duration_hr,  "hr");

  // ── PK Metrics ────────────────────────────────────────────────────────────
  checkPage(40);
  addSectionTitle("Pharmacokinetic Metrics");
  addKV("Cmax (Peak)",  sim.cmax_mg_l?.toFixed(4), "mg/L");
  addKV("Cmin (Trough)",sim.cmin_mg_l?.toFixed(4), "mg/L");
  addKV("AUC",          sim.auc_mg_h_l?.toFixed(4),"mg·h/L");
  y += 2;

  // Therapeutic window bar
  if (tw.lower_mg_l != null && tw.upper_mg_l != null) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    resetColor();
    pdf.text("Therapeutic Window:", margin, y);
    y += 5;
    const barX = margin;
    const barW = cW;
    const barH = 8;
    // background
    pdf.setFillColor(230, 230, 230);
    pdf.rect(barX, y, barW, barH, "F");
    // safe zone
    const lo = tw.lower_mg_l, hi = tw.upper_mg_l;
    const cmax = sim.cmax_mg_l ?? hi;
    const scale = barW / (hi * 1.5);
    const safeX = barX + lo * scale;
    const safeW = (hi - lo) * scale;
    setColor(GREEN, "fill");
    pdf.rect(safeX, y, safeW, barH, "F");
    // cmax marker
    const cmaxX = Math.min(barX + cmax * scale, barX + barW - 1);
    setColor(RED, "fill");
    pdf.rect(cmaxX - 0.5, y - 1, 1.5, barH + 2, "F");
    // labels
    pdf.setFontSize(7);
    setColor(GRAY);
    pdf.text(`${lo} mg/L`, safeX, y + barH + 4);
    pdf.text(`${hi} mg/L`, safeX + safeW, y + barH + 4, { align: "right" });
    setColor(RED);
    pdf.text("▲ Cmax", cmaxX, y - 2, { align: "center" });
    pdf.setFontSize(7);
    setColor(GRAY);
    pdf.text(`Source: ${tw.source ?? "N/A"}`, margin, y + barH + 9);
    resetColor();
    y += barH + 14;
  }

  // ── Therapeutic Evaluation ────────────────────────────────────────────────
  checkPage(50);
  addSectionTitle("Therapeutic Evaluation");
  Object.entries(te).forEach(([k, v]) => {
    checkPage(8);
    if (k === "alerts") return; // handled separately
    addKV(k, typeof v === "number" ? v.toFixed(3) : v);
  });

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (alerts.length > 0) {
    checkPage(30);
    addSectionTitle("What This Means For You");
    alerts.forEach((a) => {
      checkPage(10);
      setColor(RED, "fill");
      pdf.rect(margin, y - 3.5, 2.5, 5, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      resetColor();
      const lines = pdf.splitTextToSize(a, cW - 6);
      pdf.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
  }

  // ── PK Parameters Used ────────────────────────────────────────────────────
  if (Object.keys(params).length > 0) {
    checkPage(40);
    addSectionTitle("PK Parameters Used");
    Object.entries(params).forEach(([k, v]) => {
      checkPage(8);
      addKV(k, typeof v === "number" ? v.toFixed(4) : v);
    });
  }

  // ── Patient Context ───────────────────────────────────────────────────────
  checkPage(60);
  addSectionTitle("Patient Context");
  const patientFields = [
    ["Age",                  pc.age,                         ""],
    ["Sex",                  pc.sex,                         ""],
    ["Weight",               pc.weight_kg,                   "kg"],
    ["Height",               pc.height_cm,                   "cm"],
    ["Serum Creatinine",     pc.serum_creatinine_mg_dl,      "mg/dL"],
    ["Creatinine Clearance", pc.creatinine_clearance_ml_min, "mL/min"],
    ["CKD Stage",            pc.ckd_stage,                   ""],
    ["Pregnant",             pc.is_pregnant,                 ""],
    ["Pregnancy Trimester",  pc.pregnancy_trimester,         ""],
    ["Breastfeeding",        pc.is_breastfeeding,            ""],
    ["Liver Disease",        pc.liver_disease_status,        ""],
    ["Albumin",              pc.albumin_g_dl,                "g/dL"],
    ["Systolic BP",          pc.systolic_bp_mm_hg,           "mmHg"],
    ["Diastolic BP",         pc.diastolic_bp_mm_hg,          "mmHg"],
    ["Heart Rate",           pc.heart_rate_bpm,              "bpm"],
  ];
  patientFields.forEach(([label, val, unit]) => {
    if (val == null) return;
    checkPage(8);
    addKV(label, val, unit);
  });
  if (pc.conditions?.length) {
    checkPage(10);
    addKV("Conditions", pc.conditions.join(", "));
  }
  if (pc.current_medications?.length) {
    checkPage(10);
    addKV("Current Medications", pc.current_medications.join(", "));
  }

  // ── ADE Screening ─────────────────────────────────────────────────────────
  if (Object.keys(ade).length > 0) {
    checkPage(40);
    addSectionTitle("ADE / Drug Interaction Screening");
    Object.entries(ade).forEach(([k, v]) => {
      checkPage(8);
      const display = typeof v === "object" ? JSON.stringify(v) : v;
      addKV(k, display);
    });
  }

  // ── Concentration–Time Chart ──────────────────────────────────────────────
  if (chartRef?.current) {
    checkPage(90);
    addSectionTitle("Concentration–Time Profile");
    y += 2;
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgH    = (canvas.height / canvas.width) * cW;
      checkPage(imgH + 5);
      pdf.addImage(imgData, "PNG", margin, y, cW, imgH);
      y += imgH + 5;
    } catch (err) {
      addText("(Chart could not be rendered)", 9, false, GRAY);
      console.warn("Chart screenshot failed:", err);
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const total = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    setColor(BRAND_BLUE, "fill");
    pdf.rect(0, pageH - 12, pageW, 12, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 255, 255);
    pdf.text(
      `Page ${i} of ${total}  |  Confidential – For clinical use only  |  Generated ${new Date().toLocaleDateString()}`,
      pageW / 2,
      pageH - 4.5,
      { align: "center" }
    );
  }

  pdf.save(`simulation_${sim.medication_name ?? sim.id ?? "report"}.pdf`);
}