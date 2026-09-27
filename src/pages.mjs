const css = {
  workspace: 'staff_workspace__RoqSX', header: 'staff_header__i7Cnh', brand: 'staff_brand__jhOkl',
  eyebrow: 'staff_eyebrow__YkwuU', headerMeta: 'staff_headerMeta__FuZ01', signout: 'staff_signout__ZBOon',
  main: 'staff_main__UXz_T', titleRow: 'staff_titleRow__1dSgH', intro: 'staff_intro__bD52x',
  counts: 'staff_counts__EtqSP', count: 'staff_count__EFM_r', panel: 'staff_panel__zyWLA',
  inboxTabs: 'staff_inboxTabs__FYGrZ', viewHint: 'staff_viewHint__jtRJQ', filters: 'staff_filters__nR8Jm',
  searchLabel: 'staff_searchLabel__rGolY', primary: 'staff_primary__43XWl', clear: 'staff_clear__EkDZ7',
  tableWrap: 'staff_tableWrap__r_7Q5', table: 'staff_table__yEBPI', unreadRow: 'staff_unreadRow__uykqu',
  unreadDot: 'staff_unreadDot__kOyAA', snippet: 'staff_snippet__1VwXY', name: 'staff_name___EKMh',
  email: 'staff_email__2gjZG', badge: 'staff_badge__xY0Xy', openLink: 'staff_openLink__uEVmL',
  rowActionStack: 'staff_rowActionStack__p0pI2', rowActions: 'staff_rowActions__SKIKf',
  requestActions: 'staff_requestActions__cYiA_', dangerAction: 'staff_dangerAction__7sMJq',
  actionError: 'staff_actionError__64_Wv', detailActions: 'staff_detailActions__zgjZM',
  readState: 'staff_readState__9o_uM', pagination: 'staff_pagination___7uxK', empty: 'staff_empty__PhYy_',
  back: 'staff_back__0canr', detailGrid: 'staff_detailGrid__pBplX', detailBody: 'staff_detailBody__oN9yT',
  message: 'staff_message__Q4_HR', metadata: 'staff_metadata__TyTkL', history: 'staff_history___biZI',
  error: 'staff_error__S_1yp', statusForm: 'staff_statusForm__3wX_U', loginPage: 'staff_loginPage__fAe3U',
  loginCard: 'staff_loginCard__1taKn', loginAppearance: 'staff_loginAppearance__GVUCm',
  loginLogo: 'staff_loginLogo__aFjJn', loginForm: 'staff_loginForm__5280p', return: 'staff_return__n0d7u'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function head(title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="color-scheme" content="light dark"><title>${escapeHtml(title)} | Osteon</title><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/css/theme.css"><link rel="stylesheet" href="/_next/static/css/c9daa8516f1c5e8f.css"><link rel="stylesheet" href="/_next/static/css/63d3093f53b69cb3.css"><link rel="stylesheet" href="/css/refinement.css"><script src="/js/theme.js"></script></head>`;
}

function themePicker() {
  return `<details class="theme-picker"><summary aria-label="Change appearance" title="Appearance"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"></path></svg></summary><div class="theme-options" role="group" aria-label="Color theme"><p>Appearance</p><button type="button" data-theme-choice="system" aria-pressed="false">Device setting<span class="theme-check" aria-hidden="true">✓</span></button><button type="button" data-theme-choice="light" aria-pressed="false">Light<span class="theme-check" aria-hidden="true">✓</span></button><button type="button" data-theme-choice="dark" aria-pressed="false">Dark<span class="theme-check" aria-hidden="true">✓</span></button></div></details>`;
}

function loginCard(kind) {
  const setup = kind === 'setup';
  return `${head(setup ? 'Set up staff workspace' : 'Staff sign-in')}<body><main class="${css.loginPage}"><div class="${css.loginCard}"><div class="${css.loginAppearance}">${themePicker()}</div><a href="/" class="${css.loginLogo}"><img src="/assets/osteon-logo-mark.svg" alt="" width="30" height="30">Osteon</a><span class="${css.eyebrow}">Team workspace</span><h1>${setup ? 'Set up your workspace.' : 'Welcome back.'}</h1><p>${setup ? 'Create the local staff account. Messages sent through this local site will appear in your inbox.' : 'Sign in to review enquiries and coordinate the next step in each person’s care.'}</p><form class="${css.loginForm}" data-auth-form="${kind}"><label for="email">Email address</label><input id="email" type="email" autocomplete="username" required name="email"><label for="password">Password</label><input id="password" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" required name="password" ${setup ? 'minlength="12"' : ''}>${setup ? '<label for="confirm">Confirm password</label><input id="confirm" type="password" autocomplete="new-password" required name="confirm" minlength="12">' : ''}<p role="alert" class="${css.error}" hidden></p><button class="${css.primary}" type="submit">${setup ? 'Create staff account' : 'Sign in to workspace'}</button></form><a class="${css.return}" href="/">Return to the website</a></div></main><script src="/js/staff-local.js"></script></body></html>`;
}

export const loginPage = () => loginCard('login');
export const setupPage = () => loginCard('setup');

function staffShell(title, admin, content) {
  return `${head(title)}<body><div class="${css.workspace}"><header class="${css.header}"><a class="${css.brand}" href="/staff?view=unread"><img src="/assets/osteon-logo-mark.svg" alt="" width="32" height="32">Osteon <span>staff</span></a><div class="${css.headerMeta}"><span>${escapeHtml(admin.email)}</span>${themePicker()}<a href="/" target="_blank" rel="noopener">Website ↗</a><button class="${css.signout}" type="button" data-signout>Sign out</button></div></header><main class="${css.main}">${content}</main></div><script src="/js/staff-local.js"></script></body></html>`;
}

function queryWith(filters, changes = {}) {
  const values = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const key of ['view', 'kind', 'status', 'q', 'page']) if (values[key]) params.set(key, values[key]);
  return `/staff?${params}`;
}

function requestActions(row, compact = false) {
  return `<div class="${compact ? css.rowActions : css.requestActions}" data-request="${row.id}" data-version="${row.version}">
    ${!row.is_trashed ? `<button type="button" data-action="${row.is_read ? 'MARK_UNREAD' : 'MARK_READ'}">${row.is_read ? 'Mark unread' : 'Mark read'}</button>` : ''}
    <button type="button" data-action="${row.is_trashed ? 'RESTORE' : 'TRASH'}" class="${row.is_trashed ? '' : css.dangerAction}">${row.is_trashed ? 'Restore' : 'Move to Trash'}</button>
    ${row.is_trashed ? `<button type="button" data-action="DELETE" class="${css.dangerAction}">Delete permanently</button>` : ''}
    <span class="${css.actionError}" role="alert" hidden></span></div>`;
}

function formattedDate(iso) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
}

export function inboxPage(admin, counts, listing, filters) {
  const { rows, count, page, pages } = listing;
  const tabs = [['unread', 'Unread', counts.unread], ['all', 'All enquiries', counts.total - counts.trash], ['trash', 'Trash', counts.trash]];
  const tabHtml = tabs.map(([view, label, n]) => `<a href="${queryWith(filters, { view, page: '' })}" ${filters.view === view ? 'aria-current="page"' : ''}>${label}<span>${n}</span></a>`).join('');
  const rowsHtml = rows.map(row => `<tr class="${row.is_read ? '' : css.unreadRow}"><td>${row.is_read ? '' : `<span class="${css.unreadDot}" aria-label="Unread"></span>`}${escapeHtml(formattedDate(row.created_at))}</td><td><span class="${css.name}">${escapeHtml(row.name)}</span><span class="${css.email}">${escapeHtml(row.email)}</span></td><td><span class="${css.badge}" data-status="${escapeHtml(row.status)}">${escapeHtml(row.status)}</span><div class="${css.snippet}">${escapeHtml(row.message)}</div></td><td>${escapeHtml(row.kind === 'consultation' ? 'Consultation' : row.kind === 'membership' ? 'Membership' : 'Contact')}</td><td><div class="${css.rowActionStack}"><a class="${css.openLink}" href="/staff/requests/${row.id}">Open request</a>${requestActions(row, true)}</div></td></tr>`).join('');
  const filtersHtml = `<form class="${css.filters}" method="get" action="/staff"><input type="hidden" name="view" value="${escapeHtml(filters.view)}"><label>Type<select name="kind"><option value="">All types</option><option value="contact" ${filters.kind === 'contact' ? 'selected' : ''}>Contact</option><option value="consultation" ${filters.kind === 'consultation' ? 'selected' : ''}>Consultation</option><option value="membership" ${filters.kind === 'membership' ? 'selected' : ''}>Membership</option></select></label><label>Handling status<select name="status"><option value="">All statuses</option><option value="NEW" ${filters.status === 'NEW' ? 'selected' : ''}>New</option><option value="CONTACTED" ${filters.status === 'CONTACTED' ? 'selected' : ''}>Contacted</option><option value="CLOSED" ${filters.status === 'CLOSED' ? 'selected' : ''}>Closed</option></select></label><label class="${css.searchLabel}">Search<input name="q" value="${escapeHtml(filters.q)}" placeholder="Name, email, or message"></label><button class="${css.primary}" type="submit">Apply filters</button><a class="${css.clear}" href="/staff?view=${escapeHtml(filters.view)}">Clear</a></form>`;
  const pageLinks = `<div class="${css.pagination}"><span>${count} request${count === 1 ? '' : 's'} · Page ${page} of ${pages}</span><span>${page > 1 ? `<a href="${queryWith(filters, { page: String(page - 1) })}">Previous</a>` : ''} ${page < pages ? `<a href="${queryWith(filters, { page: String(page + 1) })}">Next</a>` : ''}</span></div>`;
  const content = `<div class="${css.titleRow}"><div><span class="${css.eyebrow}">Team workspace</span><h1>Enquiries</h1><p class="${css.intro}">Review messages sent through the Osteon website.</p></div><div class="${css.counts}"><div class="${css.count}"><strong>${counts.unread}</strong><span>Unread</span></div><div class="${css.count}"><strong>${counts.total - counts.trash}</strong><span>Inbox</span></div></div></div><section class="${css.panel}"><nav class="${css.inboxTabs}" aria-label="Inbox views">${tabHtml}</nav><p class="${css.viewHint}">${filters.view === 'trash' ? 'Trashed requests can be restored or deleted permanently.' : 'Contact and consultation requests are saved here as soon as they are submitted.'}</p>${filtersHtml}${rows.length ? `<div class="${css.tableWrap}"><table class="${css.table}"><thead><tr><th>Received</th><th>Person</th><th>Request</th><th>Type</th><th>Actions</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>` : `<div class="${css.empty}"><h2>No requests here yet.</h2><p>New messages will appear as soon as someone sends the contact form.</p></div>`}${pageLinks}</section>`;
  return staffShell('Enquiries', admin, content);
}

export function detailPage(admin, row, events) {
  const history = events.length ? events.map(event => `<p>${escapeHtml(event.action.replaceAll('_', ' ').toLowerCase())} · ${escapeHtml(formattedDate(event.created_at))}</p>`).join('') : '<p>No staff changes yet.</p>';
  const content = `<a class="${css.back}" href="/staff?view=${row.is_trashed ? 'trash' : 'all'}">← Back to enquiries</a><div class="${css.titleRow}"><div><span class="${css.eyebrow}">Request detail</span><h1>${escapeHtml(row.name)}</h1><p class="${css.intro}">Received ${escapeHtml(formattedDate(row.created_at))}</p></div></div><div class="${css.detailActions}">${requestActions(row)}<span class="${css.readState}">${row.is_read ? 'Read' : 'Unread'}</span></div><div class="${css.detailGrid}"><section class="${css.panel} ${css.detailBody}"><h2>Message</h2><div class="${css.message}">${escapeHtml(row.message)}</div></section><aside class="${css.panel}"><dl class="${css.metadata}"><div><dt>Name</dt><dd>${escapeHtml(row.name)}</dd></div><div><dt>Email</dt><dd><a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a></dd></div><div><dt>Type</dt><dd>${escapeHtml(row.kind)}</dd></div>${row.visitor_type ? `<div><dt>Visitor type</dt><dd>${escapeHtml(row.visitor_type)}</dd></div>` : ''}<div><dt>Received</dt><dd>${escapeHtml(formattedDate(row.created_at))}</dd></div></dl><form class="${css.statusForm}" data-status-form data-request="${row.id}" data-version="${row.version}"><label for="request-status">Handling status</label><div><select id="request-status" name="status"><option value="NEW" ${row.status === 'NEW' ? 'selected' : ''}>New</option><option value="CONTACTED" ${row.status === 'CONTACTED' ? 'selected' : ''}>Contacted</option><option value="CLOSED" ${row.status === 'CLOSED' ? 'selected' : ''}>Closed</option></select><button class="${css.primary}" type="submit">Save status</button></div><p role="status"></p></form><div class="${css.history}"><h3>Staff history</h3>${history}</div></aside></div>`;
  return staffShell('Request detail', admin, content);
}
