/**
 * Admin “Management” sidebar: API datasets (order = sidebar order).
 * Used by admin dataset config (`AdminDatasetView`, sidebar labels).
 */
const fileTypes = ['file', 'image']

export function isFileType(type) {
  return fileTypes.includes(type)
}

/**
 * Keys for `/dashboard/admin/manage/:key` (order = sidebar order).
 * `users` is only in the primary “Users” nav link, not duplicated here.
 */
export const ADMIN_MANAGEMENT_KEYS = [
  'employers',
  'job_seekers',
  'jobs',
  'job_categories',
  'job_applications',
  'job_payments',
  'equipment',
  'equipment_bookings',
  'materials',
  'material_orders',
  'technicians',
  'service_requests',
  'technician_assignments',
  'request_quotes',
  'projects',
  'media_posts',
  'contact_messages',
]

/** All keys allowed for `/dashboard/admin/manage/:key` (includes Users dataset). */
export const ALL_ADMIN_MANAGE_KEYS = ['users', ...ADMIN_MANAGEMENT_KEYS]

/** Sidebar labels (API keys unchanged). */
export const ADMIN_SIDEBAR_LABELS = {
  employers: 'Employers',
  job_seekers: 'Job Seekers',
  jobs: 'Jobs',
  job_categories: 'Job categories',
  job_applications: 'Job applications',
  job_payments: 'Job payments',
  equipment: 'Equipment',
  equipment_bookings: 'Equipment rental',
  materials: 'Materials',
  material_orders: 'Material orders',
  technicians: 'Technicians',
  service_requests: 'Service requests',
  technician_assignments: 'Technician assignments',
  request_quotes: 'Request quotes',
  projects: 'Projects',
  media_posts: 'Advertisements',
  contact_messages: 'Contact messages',
}

/** Datasets that use Accept / Reject workflow in the UI. */
export const APPROVAL_RESOURCE_KEYS = [
  'service_requests',
  'request_quotes',
  'job_applications',
  'material_orders',
  'equipment_bookings',
]

/**
 * Admin cards: hide the generic “View” modal trigger — details are on the card and Edit covers full record.
 * (Legacy detail modals e.g. job applications are unchanged.)
 */
export const ADMIN_DATASET_HIDE_VIEW_BUTTON = new Set([
  'employers',
  'jobs',
  'job_categories',
  'job_payments',
  'equipment',
  'technicians',
  'technician_assignments',
  'request_quotes',
  'projects',
  'media_posts',
])

/** Full CRUD field definitions + endpoints for each dataset. */
export const ADMIN_DATASETS = [
  {
    key: 'users',
    label: 'Users',
    endpoint: '/users',
    idKey: 'user_id',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'password', label: 'Password', type: 'password', requiredOnCreate: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'approval_status', label: 'Approval Status', type: 'select', options: ['pending', 'approved', 'rejected'] },
      { key: 'payment_proof', label: 'Payment Proof', type: 'file' },
    ],
  },
  {
    key: 'employers',
    label: 'Employers',
    endpoint: '/employers',
    idKey: 'employer_id',
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'text' },
      { key: 'company_address', label: 'Company Address', type: 'textarea' },
    ],
  },
  {
    key: 'job_seekers',
    label: 'Job Seekers',
    endpoint: '/job-seekers',
    idKey: 'jobseeker_id',
    fields: [
      { key: 'jobseeker_name', label: 'Job seeker name', type: 'text' },
      { key: 'jobseeker_email', label: 'Job seeker email', type: 'email' },
      { key: 'jobseeker_phone', label: 'Job seeker phone', type: 'text' },
      { key: 'skills', label: 'Skills', type: 'textarea' },
      { key: 'experience', label: 'Experience', type: 'textarea' },
      { key: 'cv_file', label: 'CV File', type: 'file', requiredOnCreate: true },
    ],
  },
  {
    key: 'job_categories',
    label: 'Job Categories',
    endpoint: '/job-categories',
    idKey: 'category_id',
    fields: [{ key: 'category_name', label: 'Category Name', type: 'text', requiredOnCreate: true }],
  },
  {
    key: 'jobs',
    label: 'Jobs',
    endpoint: '/jobs',
    idKey: 'job_id',
    fields: [
      { key: 'employer_name', label: 'Employer', type: 'text' },
      { key: 'category_name', label: 'Category', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'salary', label: 'Salary', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'terms_accepted', label: 'Terms Accepted', type: 'boolean' },
    ],
  },
  {
    key: 'job_applications',
    label: 'Job Applications',
    endpoint: '/job-applications',
    idKey: 'application_id',
    fields: [
      { key: 'job_id', label: 'Job ID', type: 'number' },
      { key: 'jobseeker_id', label: 'Jobseeker ID', type: 'number' },
      { key: 'cv_file', label: 'CV File', type: 'file', requiredOnCreate: true },
      { key: 'cover_message', label: 'Cover Message', type: 'textarea' },
      { key: 'employer_status', label: 'Employer Status', type: 'text' },
      { key: 'jobseeker_status', label: 'Jobseeker Status', type: 'text' },
      { key: 'education_level', label: 'Education Level', type: 'text' },
      { key: 'experience_years', label: 'Experience Years', type: 'number' },
      { key: 'diploma_file', label: 'Diploma File', type: 'file' },
    ],
  },
  {
    key: 'job_payments',
    label: 'Job Payments',
    endpoint: '/job-payments',
    idKey: 'payment_id',
    fields: [
      { key: 'employer_id', label: 'Employer ID', type: 'number' },
      { key: 'jobseeker_id', label: 'Jobseeker ID', type: 'number' },
      { key: 'job_id', label: 'Job ID', type: 'number' },
      { key: 'salary_amount', label: 'Salary Amount', type: 'number' },
      { key: 'service_fee_amount', label: 'Service Fee Amount', type: 'number' },
      { key: 'fee_type', label: 'Fee Type', type: 'text' },
      { key: 'fee_rate', label: 'Fee Rate', type: 'number' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'payment_method', label: 'Payment Method', type: 'text' },
      { key: 'payment_proof', label: 'Payment Proof', type: 'file', requiredOnCreate: true },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'paid', 'unpaid'] },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment',
    endpoint: '/equipment',
    idKey: 'equipment_id',
    fields: [
      { key: 'name', label: 'Name', type: 'text', requiredOnCreate: true },
      { key: 'category', label: 'Category', type: 'text', requiredOnCreate: true },
      { key: 'description', label: 'Description', type: 'textarea', requiredOnCreate: true },
      { key: 'terms_and_conditions', label: 'Terms & Conditions', type: 'textarea' },
      { key: 'price_per_day', label: 'Price Per Day', type: 'number', requiredOnCreate: true },
      { key: 'total_stock', label: 'Fleet (total units)', type: 'number' },
      { key: 'current_stock', label: 'Available units', type: 'number' },
      { key: 'availability', label: 'Availability', type: 'boolean', requiredOnCreate: true },
      { key: 'image', label: 'Image', type: 'file', requiredOnCreate: true },
    ],
  },
  {
    key: 'equipment_bookings',
    label: 'Equipment Bookings',
    endpoint: '/equipment-bookings',
    idKey: 'booking_id',
    fields: [
      { key: 'equipment_name', label: 'Equipment', type: 'text' },
      { key: 'quantity', label: 'Quantity (units)', type: 'number' },
      { key: 'customer_name', label: 'Customer Name', type: 'text', requiredOnCreate: true },
      { key: 'customer_email', label: 'Customer Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text', requiredOnCreate: true },
      { key: 'start_date', label: 'Start Date', type: 'date', requiredOnCreate: true },
      { key: 'end_date', label: 'End Date', type: 'date', requiredOnCreate: true },
      { key: 'total_price', label: 'Total Price', type: 'number', requiredOnCreate: true },
      { key: 'payment_proof', label: 'Payment Proof', type: 'file', requiredOnCreate: true },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'returned', label: 'Returned', type: 'boolean' },
      { key: 'returned_at', label: 'Returned At', type: 'datetime' },
      { key: 'terms_accepted', label: 'Terms Accepted', type: 'boolean' },
      { key: 'terms_accepted_at', label: 'Terms Accepted At', type: 'datetime' },
    ],
  },
  {
    key: 'materials',
    label: 'Materials',
    endpoint: '/materials',
    idKey: 'material_id',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'image', label: 'Image', type: 'file', requiredOnCreate: true },
    ],
  },
  {
    key: 'material_orders',
    label: 'Material Orders',
    endpoint: '/material-orders',
    idKey: 'order_id',
    fields: [
      { key: 'material_id', label: 'Material ID', type: 'number' },
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'delivery_address', label: 'Delivery Address', type: 'textarea' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'total_price', label: 'Total Price', type: 'number' },
      { key: 'payment_proof', label: 'Payment Proof', type: 'file', requiredOnCreate: true },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  },
  {
    key: 'technicians',
    label: 'Technicians',
    endpoint: '/technicians',
    idKey: 'technician_id',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'specialization', label: 'Specialization', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'status', label: 'Status', type: 'boolean' },
    ],
  },
  {
    key: 'service_requests',
    label: 'Service Requests',
    endpoint: '/service-requests',
    idKey: 'request_id',
    fields: [
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'customer_email', label: 'Customer Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'service_type', label: 'Service Type', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'technician_name', label: 'Technician', type: 'text' },
    ],
  },
  {
    key: 'technician_assignments',
    label: 'Technician Assignments',
    endpoint: '/technician-assignments',
    idKey: 'assignment_id',
    fields: [
      { key: 'customer_name', label: 'Requested by', type: 'text' },
      { key: 'customer_email', label: 'Customer Email', type: 'email' },
      { key: 'phone', label: 'Customer Phone', type: 'text' },
      { key: 'location', label: 'Request Location', type: 'text' },
      { key: 'service_type', label: 'Service Type', type: 'text' },
      { key: 'description', label: 'Request Details', type: 'textarea' },
      { key: 'technician_name', label: 'Technician', type: 'text' },
      { key: 'technician_email', label: 'Technician Email', type: 'email' },
      { key: 'technician_phone', label: 'Technician Phone', type: 'text' },
      { key: 'technician_specialization', label: 'Technician Specialization', type: 'text' },
    ],
  },
  {
    key: 'request_quotes',
    label: 'Request Quotes',
    endpoint: '/request-quotes',
    idKey: 'quote_id',
    fields: [
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'service_type', label: 'Service Type', type: 'text' },
      { key: 'project_description', label: 'Project Description', type: 'textarea' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'attachment', label: 'Attachment', type: 'file', requiredOnCreate: true },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    endpoint: '/projects',
    idKey: 'project_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', maxLength: 2000 },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'image', label: 'Image', type: 'file', requiredOnCreate: true },
      { key: 'completion_date', label: 'Completion Date', type: 'date' },
    ],
  },
  {
    key: 'media_posts',
    label: 'Advertisements',
    endpoint: '/media-posts',
    idKey: 'post_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'content', label: 'Content', type: 'textarea' },
      { key: 'media_type', label: 'Media Type', type: 'select', requiredOnCreate: true, options: ['image', 'video', 'text'] },
      { key: 'media_source', label: 'Media Source File / URL', type: 'file' },
      { key: 'thumbnail', label: 'Thumbnail (optional)', type: 'file' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'position', label: 'Position', type: 'text' },
    ],
  },
  {
    key: 'contact_messages',
    label: 'Contact Messages',
    endpoint: '/contact-messages',
    idKey: 'message_id',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'message', label: 'Message', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  },
  {
    key: 'admin_logs',
    label: 'Admin Logs',
    endpoint: '/admin-logs',
    idKey: 'log_id',
    fields: [
      { key: 'admin_id', label: 'Admin ID', type: 'number' },
      { key: 'action', label: 'Action', type: 'textarea' },
    ],
  },
]

/** Legacy name — prefer `ADMIN_DATASETS`. */
export const resourcesConfig = ADMIN_DATASETS
