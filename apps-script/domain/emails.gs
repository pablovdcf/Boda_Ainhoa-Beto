/** Envío de emails + plantillas */

function sendRsvpEmail(opts) {
  if (!opts || !opts.email) return;
  var asistencia = String(opts.asistencia || '').toLowerCase();
  var subjectBase = CFG.EVENT.title || 'Nuestra boda';
  var html = asistencia === 'si' ? renderEmailSi(opts) : renderEmailNo(opts);
  var mailOptions = {
    to: opts.email,
    subject: asistencia === 'si'
      ? ('Confirmación · ' + subjectBase)
      : ('¡Gracias por avisarnos! · ' + subjectBase),
    htmlBody: html,
    name: 'Ainhoa & Alberto'
  };
  if (CFG.EMAIL_FROM) mailOptions.from = CFG.EMAIL_FROM;
  if (CFG.EMAIL_REPLY_TO) mailOptions.replyTo = CFG.EMAIL_REPLY_TO;
  if (asistencia === 'si') {
    var ics = buildIcs(CFG.EVENT);
    mailOptions.attachments = [Utilities.newBlob(ics, 'text/calendar', 'boda.ics')];
  }
  MailApp.sendEmail(mailOptions);
}

function renderEmailSi(opts) {
  var nombre = opts.nombre || 'invitad@';
  return '<div style="font-family:Arial,sans-serif;line-height:1.5">'
    + '<h2>¡Gracias, ' + nombre + '!</h2>'
    + '<p>Hemos registrado tu confirmación para <b>' + CFG.EVENT.title + '</b>.</p>'
    + '<p>Adjuntamos un archivo <b>.ics</b> para guardar la fecha en tu calendario.</p>'
    + '<p>Si necesitas cambiar algo, responde a este correo.</p>'
    + '</div>';
}

function renderEmailNo(opts) {
  var nombre = opts.nombre || 'invitad@';
  return '<div style="font-family:Arial,sans-serif;line-height:1.5">'
    + '<h2>¡Gracias por avisarnos, ' + nombre + '!</h2>'
    + '<p>Lamentamos que no puedas venir, pero apreciamos que nos lo hayas dicho.</p>'
    + '<p>Si finalmente cambia la situación, escríbenos sin problema.</p>'
    + '<p>Un abrazo,<br/><b>Ainhoa & Alberto</b></p>'
    + '</div>';
}

function buildIcs(evento) {
  var ev = evento || {};
  var start = toUtc(ev.start, ev.tz || 'Europe/Madrid');
  var end = toUtc(ev.end, ev.tz || 'Europe/Madrid');
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boda//ES',
    'BEGIN:VEVENT',
    'UID:' + Utilities.getUuid() + '@boda',
    'DTSTAMP:' + formatIcs(new Date()),
    'DTSTART:' + formatIcs(start) + 'Z',
    'DTEND:' + formatIcs(end) + 'Z',
    'SUMMARY:' + (ev.title || 'Nuestra boda'),
    'LOCATION:' + (ev.location || ''),
    'DESCRIPTION:' + (ev.description || ''),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\n');
}

function toUtc(isoString) {
  if (!isoString) return new Date();
  var date = new Date(isoString);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

function formatIcs(date) {
  var d = date;
  function pad(n) { return String(n).padStart(2, '0'); }
  return d.getUTCFullYear()
    + pad(d.getUTCMonth() + 1)
    + pad(d.getUTCDate()) + 'T'
    + pad(d.getUTCHours())
    + pad(d.getUTCMinutes())
    + pad(d.getUTCSeconds());
}
