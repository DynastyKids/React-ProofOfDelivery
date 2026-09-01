export const seedTasks = [
  {
    id: 'ORD-1028',
    recipient: 'Harbour Homewares',
    contact: 'Mia Chen',
    address: '12 Wynyard Walk, Sydney NSW 2000',
    window: '09:15 – 10:00',
    eta: '18 min',
    packages: 3,
    type: 'Standard delivery',
    status: 'assigned',
    priority: 'high',
    note: 'Ring the loading dock bell on arrival.',
    coordinates: [-33.8642, 151.2068],
  },
  {
    id: 'ORD-1034',
    recipient: 'Surry Hills Grocer',
    contact: 'Tom Alvarez',
    address: '402 Crown Street, Surry Hills NSW 2010',
    window: '10:30 – 11:15',
    eta: '31 min',
    packages: 1,
    type: 'Signature required',
    status: 'assigned',
    priority: 'normal',
    note: 'Customer requested a call 5 minutes before arrival.',
    coordinates: [-33.8847, 151.2093],
  },
  {
    id: 'ORD-1041',
    recipient: 'North Shore Medical',
    contact: 'Reception desk',
    address: '8 Pacific Highway, North Sydney NSW 2060',
    window: '12:00 – 12:45',
    eta: '54 min',
    packages: 5,
    type: 'Fragile items',
    status: 'assigned',
    priority: 'normal',
    note: 'Deliver to the ground floor reception desk.',
    coordinates: [-33.8406, 151.2073],
  },
  {
    id: 'ORD-1021',
    recipient: 'The Little Pantry',
    contact: 'Olivia Park',
    address: '71 Oxford Street, Darlinghurst NSW 2010',
    window: '08:00 – 08:45',
    eta: 'Completed',
    packages: 2,
    type: 'Standard delivery',
    status: 'synced',
    priority: 'normal',
    note: '',
    coordinates: [-33.8794, 151.2181],
  },
]

export const historyOrders = [
  {
    id: 'ORD-0987',
    recipient: 'Redfern Studio',
    address: '18 Regent Street, Redfern NSW 2016',
    date: '28 Aug 2026',
    status: 'synced',
  },
  {
    id: 'ORD-0994',
    recipient: 'Newtown Books',
    address: '155 King Street, Newtown NSW 2042',
    date: '27 Aug 2026',
    status: 'synced',
  },
  {
    id: 'ORD-1002',
    recipient: 'Bayside Dental',
    address: '7 Military Road, Neutral Bay NSW 2089',
    date: '26 Aug 2026',
    status: 'synced',
  },
]

export const DEFAULT_NETWORK_ALERT_DURATION = 3

export function getNetworkAlertDuration() {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_ALERT_DURATION
  const configured = Number(window.localStorage.getItem('pod-network-alert-duration'))
  return Number.isFinite(configured) && configured >= 1 && configured <= 30 ? configured : DEFAULT_NETWORK_ALERT_DURATION
}

export const statusLabels = {
  assigned: 'Ready to deliver',
  in_progress: 'In progress',
  proof_saved_local: 'Saved on device',
  upload_pending: 'Waiting to sync',
  synced: 'Completed',
  failed: 'Sync needs attention',
}
