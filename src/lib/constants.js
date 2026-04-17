export const ROOF_TYPES = ['Asphalt & Gravel', 'Modified Bitumen', 'EPDM', 'TPO', 'PVC', 'Metal', 'Other']

export const SERVICE_TYPES = ['Leak Investigation', 'Repair', 'Maintenance', 'Emergency Service', 'Completion Report']

export const LEAK_SOURCES = [
  'Drain', 'Vent Pipe', 'Tall Cone', 'Scupper', 'Pitch Pan', 'Field Membrane',
  'HVAC Unit', 'Duct Work', 'Rain Collar', 'Expansion Joint', 'Skylight',
  'Metal Flashing', 'Plumbing Vent', 'Curbs', 'Perimeter Flashing',
  'Window', 'Inside Corner', 'Outside Corner',
  'Supply and Install New Drain',
  'Snow Cleaning',
  'Roof Maintenance',
  'Supply and Install Tall Cones',
  'Remove Redundant Equipment / Cones',
  'Other',
]

export const WORK_STATUSES = [
  { key: 'in_progress',       title: 'Work in Progress',            description: 'Roofing work is currently underway in accordance with the approved scope.' },
  { key: 'completed',          title: 'Work Completed',              description: 'All work has been successfully completed, and the site has been cleaned and finalized.' },
  { key: 'waiting_metal',      title: 'Waiting on Sheet Metal Fabrication', description: 'Project is pending fabrication and installation of required sheet metal components.' },
  { key: 'waiting_approval',   title: 'Waiting on Client Approval',  description: 'Project has not commenced and is pending formal approval from the client.' },
]
