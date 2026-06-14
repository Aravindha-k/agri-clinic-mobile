/**
 * Problem catalog audit — run against local Django DB (same machine as agri_clinic).
 * Usage: py -3 scripts/audit-problem-catalog.py  (preferred)
 * Or from agri_clinic root: py -3 ../agri-clinic-mobile/scripts/audit-problem-catalog.py
 *
 * This .mjs documents expected API shapes for mobile; DB audit is in the .py sibling.
 */
console.log(`
Problem Catalog Audit
=====================
Run DB audit from agri_clinic repo:

  cd D:\\agri_clinic
  py -3 scripts/audit_problem_catalog.py

Mobile API endpoints:
  GET /api/v1/masters/problem-categories/dropdown/
  GET /api/v1/masters/problem-items/?category=pest&crop_id={id}&page_size=200

Root cause (Amla): 0 ProblemMaster rows have crop_id=Amla in DB.
Web shows 141 items because list is not crop-filtered.
`);
