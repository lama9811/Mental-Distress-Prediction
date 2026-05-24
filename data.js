/* ------------------------------------------------------------------
   Wellbeing — per-state CDC PLACES aggregates
   Source: chronicdata.cdc.gov/resource/swc5-untb.json
            (CDC PLACES, county-level → averaged to state level)

   Fields:
     abbr, name             — USPS code + full state name
     depression             — % depression among adults (crude prevalence)
     housing, utility,      — 4 financial-hardship components (%)
     food, stamps
     financial_threat       — mean of the 4 hardship components (%)
     distress_actual        — CDC-reported frequent mental distress (%)
     imputed                — fields filled w/ national mean (no CDC data)
   ------------------------------------------------------------------ */

const STATES = Object.freeze([
  { abbr: 'AL', name: 'Alabama', depression: 23.628, housing: 15.825, utility: 11.207, food: 22.742, stamps: 17.824, financial_threat: 16.899, distress_actual: 17.976, imputed: [] },
  { abbr: 'AK', name: 'Alaska', depression: 19.21, housing: 14.55, utility: 10.097, food: 18.717, stamps: 13.307, financial_threat: 14.168, distress_actual: 16.29, imputed: [] },
  { abbr: 'AZ', name: 'Arizona', depression: 19.78, housing: 14.18, utility: 9.273, food: 19.24, stamps: 14.267, financial_threat: 14.24, distress_actual: 16.207, imputed: [] },
  { abbr: 'AR', name: 'Arkansas', depression: 24.661, housing: 15.392, utility: 11.455, food: 20.881, stamps: 13.945, financial_threat: 15.418, distress_actual: 18.991, imputed: [] },
  { abbr: 'CA', name: 'California', depression: 21.869, housing: 14.064, utility: 7.486, food: 17.153, stamps: 15.836, financial_threat: 13.635, distress_actual: 17.102, imputed: [] },
  { abbr: 'CO', name: 'Colorado', depression: 22.139, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 15.861, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'CT', name: 'Connecticut', depression: 21.089, housing: 11.8, utility: 7.922, food: 13.956, stamps: 11.033, financial_threat: 11.178, distress_actual: 15.8, imputed: [] },
  { abbr: 'DE', name: 'Delaware', depression: 21.3, housing: 11.633, utility: 7.467, food: 14.1, stamps: 12.033, financial_threat: 11.308, distress_actual: 15.667, imputed: [] },
  { abbr: 'DC', name: 'District of Columbia', depression: 21.6, housing: 12.2, utility: 7.8, food: 13.9, stamps: 13.0, financial_threat: 11.725, distress_actual: 14.1, imputed: [] },
  { abbr: 'FL', name: 'Florida', depression: 18.294, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 17.054, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'GA', name: 'Georgia', depression: 20.37, housing: 16.342, utility: 10.85, food: 20.867, stamps: 17.957, financial_threat: 16.504, distress_actual: 18.176, imputed: [] },
  { abbr: 'HI', name: 'Hawaii', depression: 16.32, housing: 12.16, utility: 7.18, food: 18.72, stamps: 15.12, financial_threat: 13.295, distress_actual: 14.58, imputed: [] },
  { abbr: 'ID', name: 'Idaho', depression: 22.282, housing: 10.998, utility: 7.198, food: 14.286, stamps: 10.15, financial_threat: 10.658, distress_actual: 16.073, imputed: [] },
  { abbr: 'IL', name: 'Illinois', depression: 22.115, housing: 11.461, utility: 7.408, food: 14.502, stamps: 14.079, financial_threat: 11.863, distress_actual: 17.002, imputed: [] },
  { abbr: 'IN', name: 'Indiana', depression: 25.638, housing: 10.597, utility: 7.809, food: 14.15, stamps: 8.357, financial_threat: 10.228, distress_actual: 17.874, imputed: [] },
  { abbr: 'IA', name: 'Iowa', depression: 20.245, housing: 9.132, utility: 6.299, food: 12.036, stamps: 10.192, financial_threat: 9.415, distress_actual: 16.112, imputed: [] },
  { abbr: 'KS', name: 'Kansas', depression: 20.534, housing: 10.947, utility: 8.11, food: 13.265, stamps: 7.766, financial_threat: 10.022, distress_actual: 16.141, imputed: [] },
  { abbr: 'KY', name: 'Kentucky', depression: 22.706, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 16.728, imputed: ["depression", "housing", "utility", "food", "stamps", "distress"] },
  { abbr: 'LA', name: 'Louisiana', depression: 26.864, housing: 18.189, utility: 13.616, food: 25.273, stamps: 22.227, financial_threat: 19.826, distress_actual: 20.039, imputed: [] },
  { abbr: 'ME', name: 'Maine', depression: 27.019, housing: 10.238, utility: 7.781, food: 11.525, stamps: 15.625, financial_threat: 11.292, distress_actual: 17.806, imputed: [] },
  { abbr: 'MD', name: 'Maryland', depression: 20.908, housing: 12.438, utility: 7.979, food: 14.508, stamps: 11.933, financial_threat: 11.714, distress_actual: 15.812, imputed: [] },
  { abbr: 'MA', name: 'Massachusetts', depression: 24.064, housing: 10.514, utility: 6.843, food: 11.821, stamps: 13.686, financial_threat: 10.716, distress_actual: 16.193, imputed: [] },
  { abbr: 'MI', name: 'Michigan', depression: 26.669, housing: 10.663, utility: 7.933, food: 14.496, stamps: 13.913, financial_threat: 11.751, distress_actual: 17.523, imputed: [] },
  { abbr: 'MN', name: 'Minnesota', depression: 23.88, housing: 9.317, utility: 5.934, food: 12.054, stamps: 8.777, financial_threat: 9.021, distress_actual: 15.387, imputed: [] },
  { abbr: 'MS', name: 'Mississippi', depression: 19.357, housing: 18.818, utility: 12.923, food: 25.827, stamps: 16.755, financial_threat: 18.581, distress_actual: 17.783, imputed: [] },
  { abbr: 'MO', name: 'Missouri', depression: 25.081, housing: 12.233, utility: 9.167, food: 15.128, stamps: 12.559, financial_threat: 12.272, distress_actual: 18.137, imputed: [] },
  { abbr: 'MT', name: 'Montana', depression: 23.704, housing: 9.864, utility: 7.229, food: 13.27, stamps: 9.818, financial_threat: 10.045, distress_actual: 17.084, imputed: [] },
  { abbr: 'NE', name: 'Nebraska', depression: 16.999, housing: 8.781, utility: 6.103, food: 12.009, stamps: 8.625, financial_threat: 8.88, distress_actual: 13.592, imputed: [] },
  { abbr: 'NV', name: 'Nevada', depression: 21.182, housing: 13.182, utility: 8.788, food: 16.571, stamps: 14.524, financial_threat: 13.266, distress_actual: 17.782, imputed: [] },
  { abbr: 'NH', name: 'New Hampshire', depression: 23.17, housing: 8.2, utility: 5.55, food: 9.88, stamps: 7.16, financial_threat: 7.698, distress_actual: 15.41, imputed: [] },
  { abbr: 'NJ', name: 'New Jersey', depression: 15.857, housing: 11.938, utility: 6.91, food: 13.943, stamps: 8.343, financial_threat: 10.284, distress_actual: 14.929, imputed: [] },
  { abbr: 'NM', name: 'New Mexico', depression: 22.115, housing: 16.685, utility: 11.573, food: 22.148, stamps: 18.503, financial_threat: 17.227, distress_actual: 15.988, imputed: [] },
  { abbr: 'NY', name: 'New York', depression: 20.044, housing: 12.04, utility: 7.229, food: 14.248, stamps: 12.74, financial_threat: 11.564, distress_actual: 16.031, imputed: [] },
  { abbr: 'NC', name: 'North Carolina', depression: 24.513, housing: 12.937, utility: 8.874, food: 17.015, stamps: 14.555, financial_threat: 13.345, distress_actual: 16.956, imputed: [] },
  { abbr: 'ND', name: 'North Dakota', depression: 19.991, housing: 9.26, utility: 6.179, food: 11.958, stamps: 7.817, financial_threat: 8.803, distress_actual: 13.936, imputed: [] },
  { abbr: 'OH', name: 'Ohio', depression: 25.969, housing: 10.801, utility: 7.881, food: 13.807, stamps: 11.683, financial_threat: 11.043, distress_actual: 18.023, imputed: [] },
  { abbr: 'OK', name: 'Oklahoma', depression: 25.117, housing: 14.281, utility: 10.661, food: 19.71, stamps: 16.731, financial_threat: 15.346, distress_actual: 18.174, imputed: [] },
  { abbr: 'OR', name: 'Oregon', depression: 26.333, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 17.497, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'PA', name: 'Pennsylvania', depression: 22.706, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 16.728, imputed: ["depression", "housing", "utility", "food", "stamps", "distress"] },
  { abbr: 'RI', name: 'Rhode Island', depression: 23.14, housing: 9.68, utility: 6.16, food: 11.1, stamps: 9.76, financial_threat: 9.175, distress_actual: 15.3, imputed: [] },
  { abbr: 'SC', name: 'South Carolina', depression: 22.052, housing: 16.013, utility: 10.993, food: 22.017, stamps: 14.457, financial_threat: 15.87, distress_actual: 17.12, imputed: [] },
  { abbr: 'SD', name: 'South Dakota', depression: 20.645, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 15.682, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'TN', name: 'Tennessee', depression: 29.525, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 20.117, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'TX', name: 'Texas', depression: 22.111, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 17.408, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'UT', name: 'Utah', depression: 26.176, housing: 9.924, utility: 6.876, food: 12.9, stamps: 7.193, financial_threat: 9.223, distress_actual: 17.097, imputed: [] },
  { abbr: 'VT', name: 'Vermont', depression: 26.314, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 15.957, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'VA', name: 'Virginia', depression: 23.169, housing: 11.823, utility: 7.971, food: 15.03, stamps: 13.285, financial_threat: 12.027, distress_actual: 17.122, imputed: [] },
  { abbr: 'WA', name: 'Washington', depression: 24.926, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 16.692, imputed: ["housing", "utility", "food", "stamps"] },
  { abbr: 'WV', name: 'West Virginia', depression: 30.467, housing: 12.633, utility: 11.287, food: 17.038, stamps: 19.198, financial_threat: 15.039, distress_actual: 21.138, imputed: [] },
  { abbr: 'WI', name: 'Wisconsin', depression: 23.136, housing: 9.231, utility: 5.371, food: 11.918, stamps: 12.649, financial_threat: 9.792, distress_actual: 15.518, imputed: [] },
  { abbr: 'WY', name: 'Wyoming', depression: 21.022, housing: 12.274, utility: 8.384, food: 15.843, stamps: 12.935, financial_threat: 12.359, distress_actual: 15.457, imputed: ["housing", "utility", "food", "stamps"] },
].map(Object.freeze));

/* Sorted descending by predicted distress for top/bottom widgets */
const STATES_BY_ABBR = Object.freeze(Object.fromEntries(STATES.map(s => [s.abbr, s])));