-- supabase-seed-bayshore.sql
-- New test client: Bayshore Commercial Real Estate Group
-- 4 reports covering: full, full, mixed (some maxed/some blank), stress-test
-- Run in Supabase SQL editor AFTER supabase-setup.sql
-- Photos use picsum.photos placeholders (portrait 600x800 = smartphone vertical)

do $$
declare
  cid uuid := gen_random_uuid();
  r1  uuid := gen_random_uuid();
  r2  uuid := gen_random_uuid();
  r3  uuid := gen_random_uuid();
  r4  uuid := gen_random_uuid();
begin

  -- ── Client ──────────────────────────────────────────────────────────────────
  insert into clients (id, name, building, address, billing, contact, phone, email)
  values (
    cid,
    'Bayshore Commercial Real Estate Group',
    'The Colonnade Business Park - Tower A',
    '3250 Bloor St W, Toronto, ON M8X 2X9',
    '150 King St W, Suite 2400, Toronto, ON M5H 1J9',
    'Ms. Patricia Huang',
    '(416) 252-8800',
    'p.huang@bayshorecre.com'
  );


  -- ── Report 1: Everything filled — Emergency Storm Repair ────────────────────
  -- 2 before / 3 progress / 3 after  (tests the 2+3+3 photo layout)
  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (r1, cid, 'Storm Damage Emergency Repair', '2026-04-02', 'James Warwick', 'PO-2026-089', 'WO-9101',
  $j1${
    "roofType": "Modified Bitumen",
    "serviceType": "Emergency Service",
    "leakSources": ["Field Membrane", "Perimeter Flashing", "Metal Flashing"],
    "findings": "Severe storm damage observed across the south quadrant of the Modified Bitumen roof system. Approximately 18 square metres of cap sheet found uplifted and partially detached along the southwest parapet wall. Perimeter metal flashing had separated at two locations, allowing water infiltration into the building envelope. Interior water damage reported on the 4th floor ceiling tiles directly below the affected area. Multiple blisters present in the field membrane adjacent to the lifted section, consistent with previous moisture entrapment.",
    "workPerformed": "Temporarily secured all loose membrane sections using weighted ballast. Cut out and removed the 18 sqm of damaged cap sheet including two plies of base sheet. Cleaned and primed the substrate. Installed new two-ply modified bitumen base sheet followed by granulated cap sheet, heat welded throughout. Replaced and re-secured 14 linear metres of perimeter metal counter flashing, resealing with elastomeric sealant at all lap joints and fastener heads. Applied roof cement at all penetrations within the repair zone. Conducted flood test — no leaks detected.",
    "materials": "Modified bitumen base sheet 2-ply (22 sqm)\nGranulated modified bitumen cap sheet (22 sqm)\nElastomeric perimeter sealant (3 tubes)\nRoof cement (1 pail)\nPerimeter metal counter flashing (14 linear metres)\nCorrosion-resistant fasteners\nPrimer (1 gallon)",
    "notes": "Interior ceiling tile replacement required — not in scope of this work order. Recommend full perimeter metal flashing inspection across all four sides before winter. Two additional areas of concern identified on the north face near the mechanical penthouse — flagged for next scheduled maintenance visit.",
    "signedBy": "James Warwick",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r1b1/600/800", "caption": "Southwest corner — uplifted cap sheet after storm"},
        {"url": "https://picsum.photos/seed/r1b2/600/800", "caption": "Perimeter flashing separation at parapet wall"}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r1p1/600/800", "caption": "Damaged cap sheet removed, substrate exposed"},
        {"url": "https://picsum.photos/seed/r1p2/600/800", "caption": "Base sheet installation — first ply heat welded"},
        {"url": "https://picsum.photos/seed/r1p3/600/800", "caption": ""}
      ],
      "after": [
        {"url": "https://picsum.photos/seed/r1a1/600/800", "caption": "Completed repair — cap sheet and counter flashing installed"},
        {"url": "https://picsum.photos/seed/r1a2/600/800", "caption": ""},
        {"url": "https://picsum.photos/seed/r1a3/600/800", "caption": "Flood test — no leaks detected"}
      ]
    }
  }$j1$::jsonb);


  -- ── Report 2: Everything filled — HVAC Curb Flashing Replacement ────────────
  -- 3 before / 2 progress / 2 after
  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (r2, cid, 'HVAC Curb Flashing Replacement - Units 3 and 4', '2026-03-25', 'Sandra Okonkwo', 'PO-2026-067', 'WO-9044',
  $j2${
    "roofType": "TPO",
    "serviceType": "Repair",
    "leakSources": ["HVAC Unit", "Curbs", "Pitch Pan"],
    "findings": "Two HVAC rooftop units on the east elevation found with failed curb flashing. Both units showed complete sealant failure at the base of the curb, with visible gaps between the TPO membrane and the curb cladding. Unit 3 pitch pan was cracked and fully voided. Unit 4 pitch pan was intact but showed significant shrinkage and debonding at the edges. Water staining observed on the deck underside directly below both units during the interior inspection.",
    "workPerformed": "Cleaned and prepared all curb surfaces for Units 3 and 4. Removed failed curb wrap on both units and replaced with new TPO-clad metal curb cladding, mechanically fastened and sealed at all corners. Stripped and re-poured pitch pan on Unit 3 using hot-applied pourable sealer, topped with a reinforcing membrane patch extending 150mm onto the field membrane. Applied new sealant bead at base of Unit 4 curb and installed a reinforcing strip around the full perimeter. All seams heat welded and tested. Water test performed on both units — no leaks.",
    "materials": "TPO-clad metal curb cladding — Unit 3 (perimeter: 4.2m)\nTPO-clad metal curb cladding — Unit 4 (perimeter: 3.8m)\nPourable pitch pan sealer, hot-applied (2 cans)\nReinforcing membrane strip 6in (3 metres)\nTPO welding rod\nSilicone sealant (2 tubes)\nCorrosion-resistant fasteners",
    "notes": "Both HVAC units are 12 years old and the manufacturer recommends replacement within 3 years. Curb flashing condition across the remaining 6 units is fair — suggest incorporating all units into the next annual maintenance contract. Coordinate with the building mechanical team before the next service visit for unit access.",
    "signedBy": "Sandra Okonkwo",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r2b1/600/800", "caption": "Unit 3 — failed curb cladding and voided pitch pan"},
        {"url": "https://picsum.photos/seed/r2b2/600/800", "caption": "Unit 4 — sealant failure and membrane debonding"},
        {"url": "https://picsum.photos/seed/r2b3/600/800", "caption": ""}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r2p1/600/800", "caption": "Unit 3 curb stripped — new cladding being installed"},
        {"url": "https://picsum.photos/seed/r2p2/600/800", "caption": "Unit 4 reinforcing strip applied and sealed"}
      ],
      "after": [
        {"url": "https://picsum.photos/seed/r2a1/600/800", "caption": "Both units complete — new curb cladding and pitch pans"},
        {"url": "https://picsum.photos/seed/r2a2/600/800", "caption": "Water test — no infiltration at either unit"}
      ]
    }
  }$j2$::jsonb);


  -- ── Report 3: Mixed — findings and materials maxed, other fields blank ───────
  -- No supervisor, no WO, no workPerformed, no notes, no signature
  -- 4 before / 1 progress / 0 after  (tests empty after section)
  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (r3, cid, 'Annual EPDM Roof Inspection', '2026-02-14', '', 'PO-2026-011', '',
  $j3${
    "roofType": "EPDM",
    "serviceType": "Maintenance",
    "leakSources": ["Drain", "Vent Pipe", "Scupper", "Outside Corner"],
    "findings": "Full inspection of the EPDM single-ply roof system was completed. The membrane is approximately 14 years old and is showing widespread signs of age-related oxidation across the field, particularly in areas with sustained ponding. Oxidation presents as a white chalky residue on the surface indicating loss of plasticizers from the EPDM compound. Seven ponding water zones were mapped and photographed — the largest measuring approximately 6m x 4m in the northeast quadrant. All four scuppers are functional but one on the south face has a bent face plate reducing the effective drain opening by approximately 40%. Three of the four interior drains are flowing freely; the northeast drain is partially blocked and is likely contributing to the ponding in that quadrant. Four vent pipe collars showed elastomeric boot cracking — two with minor splits and two with full circumferential cracking at the pipe interface. Both outside corners at the northeast and northwest parapet intersections showed seam separation measuring 75mm and 110mm respectively. No active leaks were found at the time of inspection but the building maintenance team reported two interior wet events over the preceding winter.",
    "workPerformed": "",
    "materials": "No materials were consumed during this inspection visit. However, the following materials will be required for the recommended remedial scope:\n\nImmediate remedial work (recommended within 30 days):\n- EPDM pipe boot replacement collars x4 (pipe diameters: 3in x2, 4in x1, 6in x1)\n- EPDM lap sealant — 4 tubes\n- Outside corner fabricated patches x2\n- Bonding adhesive — 1 gallon\n- EPDM membrane seam tape 3in (10 linear metres)\n\nDeferred scope (recommended within 90 days):\n- Tapered insulation crickets for northeast ponding zone (approx. 24 sqm)\n- Scupper face plate replacement x1 (south face, custom dimension required)\n- Drain ring and strainer replacement x1 (northeast interior drain, 4in)\n- Full surface clean and EPDM roof coating — 150 sqm field area",
    "notes": "",
    "signedBy": "",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r3b1/600/800", "caption": "Northeast ponding zone — largest area approx. 6m x 4m"},
        {"url": "https://picsum.photos/seed/r3b2/600/800", "caption": "Cracked EPDM pipe boot collar — 4in vent pipe"},
        {"url": "https://picsum.photos/seed/r3b3/600/800", "caption": "Northwest outside corner — 110mm seam separation"},
        {"url": "https://picsum.photos/seed/r3b4/600/800", "caption": "South face scupper — bent face plate reducing drain opening"}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r3p1/600/800", "caption": "Drain flush in progress — northeast interior drain"}
      ],
      "after": []
    }
  }$j3$::jsonb);


  -- ── Report 4: Stress test ────────────────────────────────────────────────────
  -- All 19 leak sources checked, very long job name, long PO, long supervisor/
  -- signature name, all text fields maxed, 1 before / 0 progress / 5 after
  -- (empty section in middle, odd after count spanning 3 rows)
  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (
    r4, cid,
    'Emergency Multi-Zone Leak Investigation and Full Roof System Condition Assessment Following Severe Weather',
    '2026-04-14',
    'Christopher Benjamin Abara-Ogunyemi',
    'PO-2026-EMERGENCY-RESPONSE-099',
    'WO-9999-A',
  $j4${
    "roofType": "Metal",
    "serviceType": "Leak Investigation",
    "leakSources": ["Drain", "Vent Pipe", "Tall Cone", "Scupper", "Pitch Pan", "Field Membrane", "HVAC Unit", "Duct Work", "Rain Collar", "Expansion Joint", "Skylight", "Metal Flashing", "Plumbing Vent", "Curbs", "Perimeter Flashing", "Window", "Inside Corner", "Outside Corner", "Other"],
    "findings": "Emergency multi-zone investigation was initiated following a reported ceiling collapse in the east wing server room and simultaneous water infiltration events across four separate floors of the building. Upon arrival, active leaking was observed at 11 distinct locations spanning the entire roof footprint. Primary leak concentrations were in the northeast quadrant near the mechanical penthouse and along the full length of the east parapet. Metal roofing panels in the northeast section had suffered wind uplift — three panels were fully displaced, and a further seven were partially raised with standing water pooled beneath. All expansion joints showed compromised sealant, with three exhibiting complete joint failure and open gaps of 15 to 40mm. Every roof penetration in the affected zone was assessed: vent pipes showed collar failure at five locations, the tall cone on the northeast corner was displaced entirely from its mount, and all HVAC units in the zone showed curb separation consistent with differential thermal movement. The rain collar on the main stack had corroded through and separated. Interior inspection confirmed active water travel within the ceiling plenum space over the east wing, with staining patterns suggesting chronic leakage predating the current storm event by 6 to 18 months. Scuppers on the east face were both blocked with debris and overflow conditions had contributed to water backing up behind the parapet cap. The single interior drain in the northeast mechanical room was also blocked and surrounded by a standing water zone measuring approximately 3m in diameter.",
    "workPerformed": "Emergency tarping of three displaced metal roof panels to prevent further ingress pending permanent repair. Temporary sealant applied to all open expansion joints as an emergency measure — not a permanent fix. Partially re-seated two of the displaced panels using temporary fasteners; third panel removed and stored due to structural deformation. Cleared both east face scuppers and the northeast interior drain. Emergency sealant injected at five vent pipe collar failures. Tall cone on northeast corner re-set and secured with temporary anchor straps. All active leakage areas marked and photographed for insurance documentation purposes. Full scope repair proposal to follow — current visit is emergency mitigation only.",
    "materials": "Emergency tarps x3 (heavy duty, 4m x 6m)\nExpansion joint sealant, temporary (4 tubes)\nRoof cement (2 pails)\nTemporary fasteners (assorted)\nAnchoring straps x4",
    "notes": "THIS REPORT DOCUMENTS AN EMERGENCY MITIGATION VISIT ONLY. Permanent repairs require a comprehensive restoration scope that will be provided under separate cover. Estimated permanent repair scope is substantial — budgetary estimate $85,000 to $120,000 depending on extent of substrate damage confirmed upon full panel removal. Insurance claim documentation has been initiated. Client should contact their property insurer immediately if not already done. All affected interior areas should be assessed for mold and moisture damage within 72 hours. HSX Roofing will return within 5 business days to complete the permanent repair assessment. Do not allow trades or building staff access to the northeast quadrant of the roof until permanent repairs are complete.",
    "signedBy": "Christopher Benjamin Abara-Ogunyemi",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r4b1/600/800", "caption": "Arrival — displaced metal panel and active standing water"}
      ],
      "progress": [],
      "after": [
        {"url": "https://picsum.photos/seed/r4a1/600/800", "caption": "Emergency tarp securing displaced panel 1"},
        {"url": "https://picsum.photos/seed/r4a2/600/800", "caption": "Temporary sealant applied to expansion joint — east face"},
        {"url": "https://picsum.photos/seed/r4a3/600/800", "caption": "Tall cone re-set and temporarily anchored"},
        {"url": "https://picsum.photos/seed/r4a4/600/800", "caption": "East scupper cleared — debris removed"},
        {"url": "https://picsum.photos/seed/r4a5/600/800", "caption": "Overview — northeast quadrant emergency tarp coverage complete"}
      ]
    }
  }$j4$::jsonb);

end $$;
