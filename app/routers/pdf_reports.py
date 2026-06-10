import io
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import (
    AMCContract, CalibrationRecord, MaintenanceLog,
    PDFTemplate, User, Vendor, CompanySettings,
)

router = APIRouter(prefix='/api/reports/pdf', tags=['pdf'])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_template(db: Session, report_type: str) -> PDFTemplate:
    tmpl = db.query(PDFTemplate).filter(PDFTemplate.report_type == report_type).first()
    if not tmpl:
        tmpl = PDFTemplate(report_type=report_type)
    return tmpl


def _hex_to_color(hex_str: str):
    h = hex_str.lstrip('#')
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return colors.Color(r/255, g/255, b/255)
    except Exception:
        return colors.HexColor('#1e3a5f')


def _build_pdf(title: str, headers: list, rows: list, tmpl: PDFTemplate, cs: CompanySettings | None) -> io.BytesIO:
    buf = io.BytesIO()
    page_size = landscape(A4) if getattr(tmpl, 'orientation', 'portrait') == 'landscape' else A4
    ml = getattr(tmpl, 'margin_left', 2.0) * cm
    mr = getattr(tmpl, 'margin_right', 2.0) * cm
    mt = getattr(tmpl, 'margin_top', 2.0) * cm
    mb = getattr(tmpl, 'margin_bottom', 2.0) * cm

    doc = SimpleDocTemplate(buf, pagesize=page_size,
                            leftMargin=ml, rightMargin=mr, topMargin=mt, bottomMargin=mb)
    primary = _hex_to_color(getattr(tmpl, 'primary_color', '#1e3a5f'))
    accent  = _hex_to_color(getattr(tmpl, 'accent_color', '#2563eb'))
    font_size = getattr(tmpl, 'body_font_size', 10)
    styles = getSampleStyleSheet()

    story = []

    # Header
    company_name = (cs and cs.company_name) or 'CleanRun IMMS'
    header_text  = getattr(tmpl, 'header_text', '') or company_name
    story.append(Paragraph(f'<font size=14><b>{header_text}</b></font>', styles['Normal']))
    story.append(Paragraph(f'<font size=12>{title}</font>', styles['Normal']))
    if getattr(tmpl, 'show_generated_date', True):
        story.append(Paragraph(
            f'<font size=9 color="grey">Generated: {datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC")}</font>',
            styles['Normal']
        ))
    story.append(Spacer(1, 0.4 * cm))

    # Table
    table_data = [headers] + rows
    col_count = len(headers)
    page_w = page_size[0] - ml - mr
    col_w = page_w / col_count

    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), primary),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, -1), font_size),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.97, 1.0)])
            if getattr(tmpl, 'show_alt_row_color', True) else ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID',       (0, 0), (-1, -1), 0.3, colors.lightgrey)
            if getattr(tmpl, 'show_table_borders', True) else ('LINEBELOW', (0, 0), (-1, 0), 0.5, primary),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    t = Table(table_data, colWidths=[col_w] * col_count, repeatRows=1)
    t.setStyle(TableStyle(ts))
    story.append(t)

    # Footer
    if getattr(tmpl, 'footer_text', ''):
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph(
            f'<font size=8 color="grey">{tmpl.footer_text}</font>', styles['Normal']
        ))

    doc.build(story)
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
    tmpl = _get_template(db, 'calibration')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    records = db.query(CalibrationRecord).order_by(CalibrationRecord.calibration_date.desc()).all()
    headers = ['Instrument', 'Calibration Date', 'Next Due', 'Status', 'Calibrated By']
    rows = []
    for r in records:
        cb = r.calibrated_by
        by = (f'{cb.first_name} {cb.last_name}'.strip() or cb.username) if cb else (r.calibrated_by_vendor.name if r.calibrated_by_vendor else '—')
        rows.append([r.instrument.name if r.instrument else '—', str(r.calibration_date), str(r.next_due_date), r.status.upper(), by])
    buf = _build_pdf('Calibration Records', headers, rows, tmpl, cs)
    return _pdf_response(buf, 'calibration_report.pdf')


@router.get('/amc/')
def pdf_amc(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl = _get_template(db, 'amc')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    contracts = db.query(AMCContract).order_by(AMCContract.end_date).all()
    headers = ['Instrument', 'Vendor', 'Type', 'Start', 'End', 'Value (₹)', 'Status']
    rows = [
        [
            a.instrument.name if a.instrument else '—',
            a.vendor.name if a.vendor else '—',
            a.contract_type.replace('_', ' ').title(),
            str(a.start_date), str(a.end_date),
            f'{float(a.contract_value):,.0f}',
            a.status.upper(),
        ]
        for a in contracts
    ]
    buf = _build_pdf('AMC / Contract Report', headers, rows, tmpl, cs)
    return _pdf_response(buf, 'amc_report.pdf')


@router.get('/vendors/')
def pdf_vendors(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl = _get_template(db, 'vendors')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    vendors = db.query(Vendor).order_by(Vendor.name).all()
    headers = ['Name', 'Contact', 'Email', 'Phone', 'Service Type', 'Active']
    rows = [
        [v.name, v.contact_person, v.email, v.phone,
         v.service_type.replace('_', ' ').title(),
         'Yes' if v.is_active else 'No']
        for v in vendors
    ]
    buf = _build_pdf('Vendor List', headers, rows, tmpl, cs)
    return _pdf_response(buf, 'vendor_list.pdf')


@router.get('/service-month/')
def pdf_service_month(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl = _get_template(db, 'service_month')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    today = date.today()
    start = today.replace(day=1)
    logs = db.query(MaintenanceLog).filter(
        MaintenanceLog.performed_at >= start
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
    buf = _build_pdf(f'Service Report — {today.strftime("%B %Y")}', headers, rows, tmpl, cs)
    return _pdf_response(buf, 'service_month_report.pdf')


@router.get('/audit/')
def pdf_audit(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from ..models import Instrument
    tmpl = _get_template(db, 'audit')
    cs   = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    today = date.today()
    instruments = db.query(Instrument).order_by(Instrument.name).all()
    headers = ['Instrument', 'Cal. Status', 'AMC Active', 'Last Maint.', 'Score', 'Audit Ready']
    rows = []
    for inst in instruments:
        latest_cal   = sorted(inst.calibration_records, key=lambda c: c.calibration_date, reverse=True)
        latest_cal   = latest_cal[0] if latest_cal else None
        active_amc   = [a for a in inst.amc_contracts if a.status == 'active']
        active_amc   = sorted(active_amc, key=lambda a: a.end_date, reverse=True)
        active_amc   = active_amc[0] if active_amc else None
        latest_maint = sorted(inst.maintenance_logs, key=lambda m: m.performed_at, reverse=True)
        latest_maint = latest_maint[0] if latest_maint else None
        cal_ok  = bool(latest_cal  and latest_cal.status == 'valid'  and latest_cal.next_due_date >= today)
        amc_ok  = bool(active_amc  and active_amc.end_date >= today)
        score   = (50 if cal_ok else 0) + (30 if amc_ok else 0) + (20 if latest_maint else 0)
        rows.append([
            inst.name,
            latest_cal.status.upper() if latest_cal else 'NONE',
            'YES' if amc_ok else 'NO',
            str(latest_maint.performed_at.date()) if latest_maint else '—',
            str(score),
            'YES' if score >= 80 else 'NO',
        ])
    buf = _build_pdf('Audit Readiness Report', headers, rows, tmpl, cs)
    return _pdf_response(buf, 'audit_report.pdf')
