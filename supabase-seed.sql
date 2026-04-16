-- supabase-seed.sql
-- Deletes all existing data and creates fresh test data.
-- Run in Supabase SQL editor AFTER the schema setup.
-- Schema: clients → job_sites → reports

-- ── Clean slate ──────────────────────────────────────────────────────────────
truncate clients cascade;

do $$
declare
  -- Client 1
  c1   uuid := gen_random_uuid();
  s1a  uuid := gen_random_uuid();
  s1b  uuid := gen_random_uuid();
  r1   uuid := gen_random_uuid();
  r2   uuid := gen_random_uuid();
  r3   uuid := gen_random_uuid();

  -- Client 2
  c2   uuid := gen_random_uuid();
  s2a  uuid := gen_random_uuid();
  r4   uuid := gen_random_uuid();
  r5   uuid := gen_random_uuid();
begin

  -- ── Client 1 ───────────────────────────────────────────────────────────────
  insert into clients (id, client_name, client_address, billing_address, contact_person, phone, email)
  values (
    c1,
    'Milestone Property Management Ltd.',
    '570 Alden Road, Markham, ON L3R 4C5',
    '1600 Steeles Ave W, Concord, ON L4K 4M2',
    'Mr. Andrew Thompson',
    '(905) 938-1838',
    'andrew.thompson@milestonepm.ca'
  );

  -- Site 1A
  insert into job_sites (id, client_id, job_address)
  values (s1a, c1, '570 Alden Road, Markham, ON L3R 4C5');

  -- Site 1B
  insert into job_sites (id, client_id, job_address)
  values (s1b, c1, '88 Queens Quay W, Toronto, ON M5J 0B6');

  -- Report 1 — under Site 1A
  insert into reports (id, job_site_id, report_date, supervisor, po_number, wo_number, data)
  values (r1, s1a, '2026-04-10', 'Mike Rossi', 'PO-2026-041', 'WO-8812',
  $j${
    "roofType": "TPO",
    "serviceType": "Repair",
    "leakSources": ["Skylight", "Perimeter Flashing"],
    "findings": "Active leak traced to failed skylight dome on the northwest corner of the roof. Dome had significant UV degradation and cracking along the curb flashing. Adjacent TPO membrane showed signs of ponding water and minor blistering within a 2m radius of the unit.",
    "workPerformed": "Removed and disposed of failed skylight dome. Cleaned and primed curb flashing. Installed premium-grade plywood cover board with white finish. Applied two-ply modified bitumen cap sheet over curb and extended onto field membrane 300mm. Sealed all edges with elastomeric caulking.",
    "materials": "Premium white plywood cover board (1 sheet)\nHigh-performance modified bitumen cap sheet (4m x 1m)\nElastomeric flashing sealant (1 tube)\nCorrosion-resistant fasteners",
    "notes": "Recommend full skylight replacement within 12 months if client wishes to restore natural light. Current repair is watertight and warrantied for 2 years.",
    "signedBy": "Mike Rossi",
    "total": "4250",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r1b1/600/800", "caption": "Failed skylight dome — UV degradation and cracking"},
        {"url": "https://picsum.photos/seed/r1b2/600/800", "caption": "Curb flashing detail — separation at base"}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r1p1/600/800", "caption": "Dome removed, curb cleaned and primed"},
        {"url": "https://picsum.photos/seed/r1p2/600/800", "caption": "Plywood cover board installed"}
      ],
      "after": [
        {"url": "https://picsum.photos/seed/r1a1/600/800", "caption": "Completed cap sheet over curb"},
        {"url": "https://picsum.photos/seed/r1a2/600/800", "caption": "Sealed edges — repair complete"}
      ]
    }
  }$j$::jsonb);

  -- Report 2 — under Site 1A
  insert into reports (id, job_site_id, report_date, supervisor, po_number, wo_number, data)
  values (r2, s1a, '2026-03-18', 'Derek Fonseca', 'PO-2026-022', 'WO-8791',
  $j${
    "roofType": "TPO",
    "serviceType": "Maintenance",
    "leakSources": ["Drain", "Pitch Pan"],
    "findings": "General spring inspection completed. Two interior drains found partially blocked with debris and standing water from winter melt. Pitch pan on HVAC curb on east side showing sealant shrinkage and minor separation at edges.",
    "workPerformed": "Cleared and flushed both interior roof drains. Removed debris from all four scuppers. Ground out and re-poured pitch pan on east HVAC curb using pourable sealer. Applied reinforcing membrane patch 150mm around pitch pan perimeter. Conducted water test — no leaks found.",
    "materials": "Pourable pitch pan sealer (1 can)\nReinforcing membrane strip 6in x 6ft\nDrain cleaning tools",
    "notes": "Overall roof condition is good for age. Recommend scheduling full re-coat of TPO field membrane before end of summer.",
    "signedBy": "Derek Fonseca",
    "total": "1800",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r2b1/600/800", "caption": "Blocked interior drain with standing water"},
        {"url": "https://picsum.photos/seed/r2b2/600/800", "caption": "Pitch pan — sealant shrinkage on east HVAC curb"}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r2p1/600/800", "caption": "Drain cleared and flushed"},
        {"url": "https://picsum.photos/seed/r2p2/600/800", "caption": "Pitch pan ground out, ready for re-pour"}
      ],
      "after": [
        {"url": "https://picsum.photos/seed/r2a1/600/800", "caption": "New pitch pan sealer with reinforcing membrane"},
        {"url": "https://picsum.photos/seed/r2a2/600/800", "caption": "Water test — no leaks"}
      ]
    }
  }$j$::jsonb);

  -- Report 3 — under Site 1B
  insert into reports (id, job_site_id, report_date, supervisor, po_number, wo_number, data)
  values (r3, s1b, '2026-04-12', 'Mike Rossi', 'PO-2026-048', 'WO-8830',
  $j${
    "roofType": "Modified Bitumen",
    "serviceType": "Emergency Service",
    "leakSources": ["Field Membrane", "Metal Flashing"],
    "findings": "Emergency call for active leak in the 3rd floor conference room. Water infiltrating through a split in the modified bitumen field membrane approximately 2m from the east parapet. Metal counter flashing along the parapet had pulled away from the wall, allowing wind-driven rain entry.",
    "workPerformed": "Applied emergency torch-down patch over the membrane split, extending 300mm in all directions. Re-secured metal counter flashing with new fasteners and sealed the top edge with polyurethane caulking. Confirmed no further leaks after 30-minute water test.",
    "materials": "Modified bitumen patch (1m x 1m)\nPolyurethane caulking (2 tubes)\nCorrosion-resistant fasteners\nPropane torch fuel",
    "notes": "This is a temporary emergency repair. Full membrane replacement along the east parapet (approx. 12 linear metres) recommended within 60 days.",
    "signedBy": "Mike Rossi",
    "total": "2100",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r3b1/600/800", "caption": "Membrane split — active water infiltration"},
        {"url": "https://picsum.photos/seed/r3b2/600/800", "caption": "Counter flashing pulled away from parapet wall"}
      ],
      "progress": [
        {"url": "https://picsum.photos/seed/r3p1/600/800", "caption": "Torch-down patch being applied over split"}
      ],
      "after": [
        {"url": "https://picsum.photos/seed/r3a1/600/800", "caption": "Completed patch — 300mm overlap all sides"},
        {"url": "https://picsum.photos/seed/r3a2/600/800", "caption": "Counter flashing re-secured and sealed"}
      ]
    }
  }$j$::jsonb);

  -- ── Client 2 ───────────────────────────────────────────────────────────────
  insert into clients (id, client_name, client_address, billing_address, contact_person, phone, email)
  values (
    c2,
    'Bayshore Commercial Real Estate Group',
    '3250 Bloor St W, Toronto, ON M8X 2X9',
    '150 King St W, Suite 2400, Toronto, ON M5H 1J9',
    'Ms. Patricia Huang',
    '(416) 252-8800',
    'p.huang@bayshorecre.com'
  );

  -- Site 2A
  insert into job_sites (id, client_id, job_address)
  values (s2a, c2, '3250 Bloor St W, Toronto, ON M8X 2X9');

  -- Report 4 — under Site 2A (all leak sources, stress test)
  insert into reports (id, job_site_id, report_date, supervisor, po_number, wo_number, data)
  values (r4, s2a, '2026-04-14', 'Christopher Benjamin Abara-Ogunyemi', 'PO-2026-EMERGENCY-099', 'WO-9999-A',
  $j${
    "roofType": "Metal",
    "serviceType": "Leak Investigation",
    "leakSources": ["Drain", "Vent Pipe", "Tall Cone", "Scupper", "Pitch Pan", "Field Membrane", "HVAC Unit", "Duct Work", "Rain Collar", "Expansion Joint", "Skylight", "Metal Flashing", "Plumbing Vent", "Curbs", "Perimeter Flashing", "Window", "Inside Corner", "Outside Corner", "Other"],
    "findings": "Emergency multi-zone investigation initiated following a reported ceiling collapse in the east wing server room. Active leaking observed at 11 distinct locations spanning the entire roof footprint. Metal roofing panels in the northeast section had suffered wind uplift — three panels fully displaced, seven partially raised with standing water pooled beneath. All expansion joints showed compromised sealant with three exhibiting complete joint failure and open gaps of 15 to 40mm.",
    "workPerformed": "Emergency tarping of three displaced metal roof panels. Temporary sealant applied to all open expansion joints. Cleared both east face scuppers and the northeast interior drain. Emergency sealant injected at five vent pipe collar failures. All active leakage areas marked and photographed for insurance documentation.",
    "materials": "Emergency tarps x3 (heavy duty, 4m x 6m)\nExpansion joint sealant, temporary (4 tubes)\nRoof cement (2 pails)\nTemporary fasteners (assorted)\nAnchoring straps x4",
    "notes": "THIS REPORT DOCUMENTS AN EMERGENCY MITIGATION VISIT ONLY. Permanent repairs require a comprehensive restoration scope under separate cover. Estimated permanent repair: $85,000 to $120,000. Insurance claim documentation initiated.",
    "signedBy": "Christopher Benjamin Abara-Ogunyemi",
    "total": "8500",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r4b1/600/800", "caption": "Arrival — displaced metal panel and active standing water"}
      ],
      "progress": [],
      "after": [
        {"url": "https://picsum.photos/seed/r4a1/600/800", "caption": "Emergency tarp securing displaced panel 1"},
        {"url": "https://picsum.photos/seed/r4a2/600/800", "caption": "Temporary sealant applied to expansion joint"},
        {"url": "https://picsum.photos/seed/r4a3/600/800", "caption": "East scupper cleared — debris removed"}
      ]
    }
  }$j$::jsonb);

  -- Report 5 — under Site 2A (minimal fields, inspection only)
  insert into reports (id, job_site_id, report_date, supervisor, po_number, wo_number, data)
  values (r5, s2a, '2026-02-14', '', 'PO-2026-011', '',
  $j${
    "roofType": "EPDM",
    "serviceType": "Maintenance",
    "leakSources": ["Drain", "Vent Pipe", "Scupper", "Outside Corner"],
    "findings": "Full inspection of the EPDM single-ply roof system completed. Membrane is approximately 14 years old showing widespread oxidation. Seven ponding water zones mapped — largest measuring approximately 6m x 4m in the northeast quadrant. Four vent pipe collars showed elastomeric boot cracking. Both outside corners at the northeast and northwest parapet showed seam separation.",
    "workPerformed": "",
    "materials": "",
    "notes": "",
    "signedBy": "",
    "total": "",
    "photos": {
      "before": [
        {"url": "https://picsum.photos/seed/r5b1/600/800", "caption": "Northeast ponding zone — approx. 6m x 4m"},
        {"url": "https://picsum.photos/seed/r5b2/600/800", "caption": "Cracked EPDM pipe boot collar — 4in vent"},
        {"url": "https://picsum.photos/seed/r5b3/600/800", "caption": "Northwest outside corner — seam separation"},
        {"url": "https://picsum.photos/seed/r5b4/600/800", "caption": "South face scupper — bent face plate"}
      ],
      "progress": [],
      "after": []
    }
  }$j$::jsonb);

end $$;
