-- Run this in the Supabase SQL editor AFTER running supabase-setup.sql
-- Adds 1 test client with 2 test reports

do $$
declare
  client_id uuid := gen_random_uuid();
  report1_id uuid := gen_random_uuid();
  report2_id uuid := gen_random_uuid();
begin

  insert into clients (id, name, building, address, billing, contact, phone, email)
  values (
    client_id,
    'Milestone Property Management Ltd.',
    'Markham Gate Investments',
    '570 Alden Road, Markham, ON L3R 4C5',
    '1600 Steeles Ave W, Concord, ON L4K 4M2',
    'Mr. Andrew Thompson',
    '(905) 938-1838',
    'andrew.thompson@milestonepm.ca'
  );

  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (
    report1_id,
    client_id,
    'Skylight Dome Replacement',
    '2026-04-10',
    'Mike Rossi',
    'PO-2026-041',
    'WO-8812',
    '{
      "roofType": "TPO",
      "serviceType": "Repair",
      "leakSources": ["Skylight", "Perimeter Flashing"],
      "findings": "Active leak traced to failed skylight dome on the northwest corner of the roof. Dome had significant UV degradation and cracking along the curb flashing. Adjacent TPO membrane showed signs of ponding water and minor blistering within a 2m radius of the unit.",
      "workPerformed": "Removed and disposed of failed skylight dome. Cleaned and primed curb flashing. Installed premium-grade plywood cover board with white finish. Applied two-ply modified bitumen cap sheet over curb and extended onto field membrane 300mm. Sealed all edges with elastomeric caulking.",
      "materials": "Premium white plywood cover board (1 sheet)\nHigh-performance modified bitumen cap sheet (4m x 1m)\nElastomeric flashing sealant (1 tube)\nCorrosion-resistant fasteners",
      "notes": "Recommend full skylight replacement within 12 months if client wishes to restore natural light. Current repair is watertight and warrantied for 2 years. Two remaining skylights on south face showing early UV wear — monitor at next service visit.",
      "signedBy": "Mike Rossi",
      "photos": { "before": [], "progress": [], "after": [] }
    }'::jsonb
  );

  insert into reports (id, client_id, job_name, report_date, supervisor, po_number, wo_number, data)
  values (
    report2_id,
    client_id,
    'Spring Maintenance Inspection',
    '2026-03-18',
    'Derek Fonseca',
    'PO-2026-022',
    'WO-8791',
    '{
      "roofType": "TPO",
      "serviceType": "Maintenance",
      "leakSources": ["Drain", "Pitch Pan"],
      "findings": "General spring inspection completed. Two interior drains found partially blocked with debris and standing water from winter melt. Pitch pan on HVAC curb on east side showing sealant shrinkage and minor separation at edges. No active leaks detected at time of inspection.",
      "workPerformed": "Cleared and flushed both interior roof drains. Removed debris from all four scuppers. Ground out and re-poured pitch pan on east HVAC curb using pourable sealer. Applied reinforcing membrane patch 150mm around pitch pan perimeter. Conducted water test — no leaks found.",
      "materials": "Pourable pitch pan sealer (1 can)\nReinforcing membrane strip 6in x 6ft\nDrain cleaning tools",
      "notes": "Overall roof condition is good for age. Recommend scheduling full re-coat of TPO field membrane before end of summer. Drains should be cleared semi-annually given tree canopy on north side of building.",
      "signedBy": "Derek Fonseca",
      "photos": { "before": [], "progress": [], "after": [] }
    }'::jsonb
  );

end $$;
