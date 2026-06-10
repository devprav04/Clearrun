import io
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import AMCContract, CalibrationRecord, CompanySettings, MaintenanceLog, PDFTemplate, User, Vendor
from ..routers.reports import _build_audit_data

router = APIRouter(prefix='/api/reports/pdf', tags=['pdf'])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_template(db: Session, report_type: str) -> PDFTemplate:
    tmpl = db.query(PDFTemplate).filter(PDFTemplate.report_type == report_type).first()
    return tmpl or PDFTemplate(report_type=report_type)


def _hex_to_color(hex_str: str, fallback='#1e3a5f'):
    h = (hex_str or fallback).strip().lstrip('#')
    if len(h) not in (3, 6):
        h = fallback.lstrip('#')
    try:
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        return colors.Color(int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255)
    except Exception:
        return colors.HexColor(fallback)


def _page_number_canvas(canvas, doc, tmpl: PDFTemplate, primary):
    """Draw page number and optional watermark on every page."""
    canvas.saveState()
    if getattr(tmpl, 'show_watermark', False) and getattr(tmpl, 'watermark_text', ''):
        canvas.setFont('Helvetica', 60)
        canvas.setFillColor(colors.Color(0.85, 0.85, 0.85, alpha=0.35))
        canvas.translate(doc.pagesize[0] / 2, doc.pagesize[1] / 2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, tmpl.watermark_text)
        canvas.rotate(-45)
        canvas.translate(-doc.pagesize[0] / 2, -doc.pagesize[1] / 2)
    if getattr(tmpl, 'show_page_number', True):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.grey)
        canvas.drawRightString(
            doc.pagesize[0] - doc.rightMargin,
            doc.bottomMargin - 10,
            f'Page {doc.page}',
        )
    canvas.restoreState()


def _build_pdf(title: str, headers: list, rows: list, tmpl: PDFTemplate, cs: CompanySettings | None) -> io.BytesIO:
    buf = io.BytesIO()
    page_size = landscape(A4) if getattr(tmpl, 'orientation', 'portrait') == 'landscape' else A4
    ml = (getattr(tmpl, 'margin_left',  15.0) or 15.0) * mm
    mr = (getattr(tmpl, 'margin_right', 15.0) or 15.0) * mm
    mt = (getattr(tmpl, 'margin_top',   20.0) or 20.0) * mm
    mb = (getattr(tmpl, 'margin_bottom',20.0) or 20.0) * mm

    primary   = _hex_to_color(getattr(tmpl, 'primary_color', '') or '#1e3a5f')
    font_size = max(6, min(14, getattr(tmpl, 'body_font_size', 10) or 10))
    styles    = getSampleStyleSheet()

    doc = SimpleDocTemplate(buf, pagesize=page_size,
                            leftMargin=ml, rightMargin=mr, topMargin=mt, bottomMargin=mb)

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    company_name = (cs and cs.company_name) or 'CleanRun IMMS'
    header_text  = getattr(tmpl, 'header_text', '') or company_name
    story.append(Paragraph(f'<font size=14><b>{header_text}</b></font>', styles['Normal']))
    story.append(Paragraph(f'<font size=12>{title}</font>', styles['Normal']))

    if getattr(tmpl, 'show_address', False) and cs and cs.address:
        story.append(Paragraph(f'<font size=8 color="grey">{cs.address}</font>', styles['Normal']))

    if getattr(tmpl, 'show_generated_date', True):
        story.append(Paragraph(
            f'<font size=9 color="grey">Generated: {datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC")}</font>',
            styles['Normal'],
        ))

    if getattr(tmpl, 'show_confidential_banner', False) and getattr(tmpl, 'confidential_text', ''):
        story.append(Paragraph(
            f'<font size=9 color="red"><b>{tmpl.confidential_text}</b></font>', styles['Normal']
        ))

    story.append(Spacer(1, 4 * mm))

    # ── Table ─────────────────────────────────────────────────────────────────
    if rows:
        table_data = [headers] + rows
        col_count  = len(headers)
        page_w     = page_size[0] - ml - mr
        col_w      = page_w / col_count

        alt_bg = colors.Color(0.95, 0.97, 1.0)
        row_bgs = [colors.white, alt_bg] if getattr(tmpl, 'show_alt_row_color', True) else [colors.white, colors.white]

        ts = [
            ('BACKGROUND',    (0, 0), (-1, 0), primary),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, -1), font_size),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), row_bgs),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING',   (0, 0), (-1, -1), 5),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 5),
        ]
        if getattr(tmpl, 'show_table_borders', True):
            ts.append(('GRID', (0, 0), (-1, -1), 0.3, colors.lightgrey))
        else:
            ts.append(('LINEBELOW', (0, 0), (-1, 0), 0.5, primary))

        t = Table(table_data, colWidths=[col_w] * col_count, repeatRows=1)
        t.setStyle(TableStyle(ts))
        story.append(t)
    else:
        story.append(Paragraph('<font size=10 color="grey">No records found.</font>', styles['Normal']))

    # ── Footer ────────────────────────────────────────────────────────────────
    if getattr(tmpl, 'footer_text', ''):
        story.append(Spacer(1, 5 * mm))
        story.append(Paragraph(f'<font size=8 color="grey">{tmpl.footer_text}</font>', styles['Normal']))

    if getattr(tmpl, 'show_signature_block', False) and getattr(tmpl, 'signature_label', ''):
        story.append(Spacer(1, 15 * mm))
        story.append(Paragraph('_' * 40, styles['Normal']))
        story.append(Paragraph(f'<font size=9>{tmpl.signature_label}</font>', styles['Normal']))

    doc.build(
        story,
        onFirstPage=lambda c, d: _page_number_canvas(c, d, tmpl, primary),
        onLaterPages=lambda c, d: _page_number_canvas(c, d, tmpl, primary),
    )
    buf.seek(0)
    return buf


def _pdf_response(buf: io.BytesIO, filename: str) -> StreamingResponse:
    return StreamingResponse(
        buf,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get('/calibration/')
def pdf_calibration(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl    = _get_template(db, 'calibration')
    cs      = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    records = db.query(CalibrationRecord).order_by(CalibrationRecord.calibration_date.desc()).all()
    headers = ['Instrument', 'Cal. Date', 'Next Due', 'Status', 'Calibrated By']
    rows = []
    for r in records:
        cb = r.calibrated_by
        by = (f'{cb.first_name} {cb.last_name}'.strip() or cb.username) if cb \
             else (r.calibrated_by_vendor.name if r.calibrated_by_vendor else '—')
        rows.append([
            r.instrument.name if r.instrument else '—',
            str(r.calibration_date),
            str(r.next_due_date),
            r.status.upper(),
            by,
        ])
    return _pdf_response(_build_pdf('Calibration Records', headers, rows, tmpl, cs), 'calibration_report.pdf')


@router.get('/amc/')
def pdf_amc(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl      = _get_template(db, 'amc')
    cs        = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    contracts = db.query(AMCContract).order_by(AMCContract.end_date).all()
    headers   = ['Instrument', 'Vendor', 'Type', 'Start', 'End', 'Value (₹)', 'Status']
    rows = [
        [
            a.instrument.name if a.instrument else '—',
            a.vendor.name     if a.vendor     else '—',
            a.contract_type.replace('_', ' ').title(),
            str(a.start_date), str(a.end_date),
            f'{float(a.contract_value):,.0f}',
            a.status.upper(),
        ]
        for a in contracts
    ]
    return _pdf_response(_build_pdf('AMC / Contract Report', headers, rows, tmpl, cs), 'amc_report.pdf')


@router.get('/vendors/')
def pdf_vendors(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl    = _get_template(db, 'vendors')
    cs      = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    vendors = db.query(Vendor).order_by(Vendor.name).all()
    headers = ['Name', 'Contact', 'Email', 'Phone', 'Service Type', 'Active']
    rows = [
        [v.name, v.contact_person, v.email, v.phone,
         v.service_type.replace('_', ' ').title(),
         'Yes' if v.is_active else 'No']
        for v in vendors
    ]
    return _pdf_response(_build_pdf('Vendor List', headers, rows, tmpl, cs), 'vendor_list.pdf')


@router.get('/service-month/')
def pdf_service_month(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl  = _get_template(db, 'service_month')
    cs    = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    today = date.today()
    logs  = db.query(MaintenanceLog).filter(
        MaintenanceLog.performed_at >= today.replace(day=1)
    ).order_by(MaintenanceLog.performed_at).all()
    headers = ['Instrument', 'Type', 'Date', 'Performed By', 'Labour ₹', 'Parts ₹']
    rows = []
    for l in logs:
        pb = l.performed_by
        by = (f'{pb.first_name} {pb.last_name}'.strip() or pb.username) if pb else '—'
        rows.append([
            l.instrument.name if l.instrument else '—',
            l.maintenance_type.replace('_', ' ').title(),
            l.performed_at.strftime('%d %b %Y'),
            by,
            f'{float(l.labor_cost):,.0f}',
            f'{float(l.parts_cost):,.0f}',
        ])
    return _pdf_response(
        _build_pdf(f'Service Report — {today.strftime("%B %Y")}', headers, rows, tmpl, cs),
        'service_month_report.pdf',
    )


@router.get('/audit/')
def pdf_audit(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl = _get_template(db, 'audit')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    # Reuse the SQL-aggregated audit data — no N+1 queries
    data = _build_audit_data(db, date.today())
    headers = ['Instrument', 'Cal. Status', 'AMC Active', 'Last Maint.', 'Score', 'Audit Ready']
    rows = [
        [
            d['instrument_name'],
            d['calibration_status'].upper(),
            'YES' if d['amc_active'] else 'NO',
            d['last_maintenance_date'] or '—',
            str(d['compliance_score']),
            'YES' if d['audit_ready'] else 'NO',
        ]
        for d in data
    ]
    return _pdf_response(_build_pdf('Audit Readiness Report', headers, rows, tmpl, cs), 'audit_report.pdf')
