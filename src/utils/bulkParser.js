/**
 * Parses tab-separated (Excel copy-paste) or comma/semicolon-separated (CSV) text
 * Columns: passport, visa, nationality (optional), email (optional), password (optional)
 */
export function parseBulkInput(rawText, defaultNationality = 'مصر') {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const skipped = [];

  lines.forEach((line, idx) => {
    let delimiter = ',';
    if (line.includes('\t')) {
      delimiter = '\t';
    } else if (line.includes(';') && !line.includes(',')) {
      delimiter = ';';
    }

    const cols = splitLine(line, delimiter).map((c) => c.trim().replace(/^["']|["']$/g, '').trim());
    if (cols.length < 2) {
      skipped.push({ lineNumber: idx + 1, raw: line, reason: 'أقل من عمودين (مطلوب الجواز والتأشيرة)' });
      return;
    }

    const firstLower = cols[0].toLowerCase();
    const secondLower = cols[1].toLowerCase();
    const isHeader =
      (firstLower.includes('passport') || firstLower.includes('جواز') || firstLower.includes('وثيقة')) &&
      (secondLower.includes('visa') || secondLower.includes('تأشيرة') || secondLower.includes('تاشير') || secondLower.includes('فيزا'));

    if (isHeader) return;

    const passport = cols[0];
    const visa = cols[1];
    const nationality = cols[2] || defaultNationality || 'مصر';
    const email = cols[3] || '';
    const password = cols[4] || '';

    if (!passport || !visa) {
      skipped.push({ lineNumber: idx + 1, raw: line, reason: 'رقم الجواز أو التأشيرة فارغ' });
      return;
    }

    items.push({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      passport,
      visa,
      nationality,
      email,
      password,
      status: 'pending', // pending | running | success | ineligible | error
      role: null,
      pilgrimName: '',
      nusukId: '',
      eligible: null,
      message: '',
      details: null,
      screenshot: null,
      finishedAt: null,
    });
  });

  return { items, skipped };
}

function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t');
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const STATUS_AR_LABELS = {
  pending: 'قيد الانتظار',
  running: 'جاري التنفيذ',
  success: 'تم بنجاح',
  ineligible: 'غير مؤهل للروضة',
  error: 'خطأ',
};

function escapeCsvCell(val) {
  const str = String(val ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportQueueToCsv(rows) {
  const headers = [
    '#',
    'رقم الجواز',
    'رقم التأشيرة',
    'الجنسية',
    'الإيميل',
    'الحالة',
    'الدور',
    'الاسم',
    'Nusuk ID',
    'أهلية الروضة',
    'النتيجة / الرسالة',
    'وقت الانتهاء',
  ];

  const csvRows = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row, idx) =>
      [
        idx + 1,
        row.passport,
        row.visa,
        row.nationality,
        row.email || '',
        STATUS_AR_LABELS[row.status] || row.status,
        row.role === 'leader' ? 'رئيسي' : row.role === 'companion' ? 'مرافق' : '',
        row.pilgrimName || '',
        row.nusukId || '',
        row.eligible === true ? 'مؤهل' : row.eligible === false ? 'غير مؤهل' : '',
        row.message || '',
        row.finishedAt ? new Date(row.finishedAt).toLocaleString('ar-EG') : '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  // UTF-8 BOM for seamless Arabic rendering in Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `nusuk-results-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
