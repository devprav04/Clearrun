"""PDF report generation for CleanRun IMMS — fully template-driven."""
from io import BytesIO
from datetime import date
import math

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from reportlab.lib.pagesizes import A4, letter, A3, landscape as rl_landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from instruments.models import Instrument, Vendor
from maintenance.models import CalibrationRecord, AMCContract, BreakdownTicket, MaintenanceLog
from settings_app.models import CompanySettings, PDFTemplate


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def get_settings():
    try:
        return CompanySettings.objects.first()
    except Exception:
        return None


def get_template(report_type):
    obj, _ = PDFTemplate.objects.get_or_create(report_type=report_type)
    return obj


def hex_to_rgb(hex_str, fallback=(0.12, 0.23, 0.37)):
    try:
        h = hex_str.lstrip('#')
        if len(h) != 6:
            return fallback
        return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255)
    except Exception:
        return fallback


def hex_to_color(hex_str, fallback='#1e3a5f'):
    try:
        h = (hex_str or fallback).lstrip('#')
        if len(h) != 6:
            h = fallback.lstrip('#')
        return colors.HexColor(f'#{h}')
    except Exception:
        return colors.HexColor(fallback)


def resolve_primary(company, tmpl):
    """Template color takes precedence; fall back to company, then default."""
    if tmpl and tmpl.primary_color:
        return tmpl.primary_color
    if company and company.primary_color:
        return company.primary_color
    return '#1e3a5f'


def get_pagesize(tmpl):
    size_map = {'A4': A4, 'Letter': letter, 'A3': A3}
    base = size_map.get(tmpl.paper_size if tmpl else 'A4', A4)
    if tmpl and tmpl.orientation == 'landscape':
        return rl_landscape(base)
    return base


def build_doc(response, tmpl):
    pagesize = get_pagesize(tmpl)
    mt = (tmpl.margin_top    if tmpl else 20) * mm
    mb = (tmpl.margin_bottom if tmpl else 20) * mm
    ml = (tmpl.margin_left   if tmpl else 15) * mm
    mr = (tmpl.margin_right  if tmpl else 15) * mm
    doc = SimpleDocTemplate(
        response, pagesize=pagesize,
        rightMargin=mr, leftMargin=ml,
        topMargin=mt + 30 * mm,   # reserve space for custom header
        bottomMargin=mb + 12 * mm,
    )
    return doc, getSampleStyleSheet()


# ─────────────────────────────────────────────────────────────
# Header / Footer callback
# ─────────────────────────────────────────────────────────────

def header_footer(canvas, doc, company, default_title, tmpl=None):
    canvas.saveState()
    w, h = doc.pagesize

    primary_hex = resolve_primary(company, tmpl)
    r, g, b = hex_to_rgb(primary_hex)

    company_name = (company.company_name if company else 'CleanRun IMMS')
    display_title = (tmpl.title if tmpl and tmpl.title else default_title)

    # ── WATERMARK ───────────────────────────────────────────
    if tmpl and tmpl.show_watermark and tmpl.watermark_text:
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 64)
        canvas.setFillColorRGB(0.85, 0.85, 0.85, alpha=0.18)
        canvas.translate(w / 2, h / 2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, tmpl.watermark_text.upper())
        canvas.restoreState()

    # ── HEADER BAR ──────────────────────────────────────────
    header_h = 28 * mm
    canvas.setFillColorRGB(r, g, b)
    canvas.rect(0, h - header_h, w, header_h, fill=1, stroke=0)

    # Subtle gradient stripe at bottom of header
    canvas.setFillColorRGB(0, 0, 0, alpha=0.15)
    canvas.rect(0, h - header_h, w, 1.5 * mm, fill=1, stroke=0)

    canvas.setFillColor(colors.white)

    # Company name (left)
    canvas.setFont('Helvetica-Bold', 13)
    canvas.drawString(15 * mm, h - 11 * mm, company_name)

    # Report title (left, smaller)
    canvas.setFont('Helvetica', 8.5)
    canvas.drawString(15 * mm, h - 18 * mm, display_title)

    # Header sub-text
    if tmpl and tmpl.header_text:
        canvas.setFont('Helvetica', 7)
        canvas.setFillColorRGB(1, 1, 1, alpha=0.75)
        canvas.drawString(15 * mm, h - 24 * mm, tmpl.header_text[:120])

    # Tagline / generated date (right)
    canvas.setFillColor(colors.white)
    if not tmpl or tmpl.show_generated_date:
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(w - 15 * mm, h - 11 * mm, f'Date: {date.today().strftime("%d %b %Y")}')
    if company and company.tagline:
        canvas.setFont('Helvetica-Oblique', 7.5)
        canvas.setFillColorRGB(1, 1, 1, alpha=0.8)
        canvas.drawRightString(w - 15 * mm, h - 18 * mm, company.tagline)

    # ── FOOTER BAR ──────────────────────────────────────────
    footer_h = 10 * mm
    canvas.setFillColorRGB(r, g, b)
    canvas.rect(0, 0, w, footer_h, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica', 7)

    footer_left = ''
    if tmpl and tmpl.footer_text:
        footer_left = tmpl.footer_text[:100]
    elif not tmpl or tmpl.show_address:
        if company and company.address:
            footer_left = company.address[:100]
    if footer_left:
        canvas.drawString(15 * mm, 3.2 * mm, footer_left)

    if not tmpl or tmpl.show_page_number:
        canvas.drawRightString(w - 15 * mm, 3.2 * mm, f'Page {doc.page}')

    # ── CONFIDENTIAL BANNER ─────────────────────────────────
    if tmpl and tmpl.show_confidential_banner and tmpl.confidential_text:
        canvas.setFont('Helvetica-Bold', 6.5)
        canvas.setFillColorRGB(r * 0.7, g * 0.7, b * 0.7)
        canvas.drawCentredString(w / 2, 11.5 * mm, tmpl.confidential_text)

    canvas.restoreState()


# ─────────────────────────────────────────────────────────────
# Table style builder
# ─────────────────────────────────────────────────────────────

def make_table_style(tmpl=None, company=None):
    primary_hex = resolve_primary(company, tmpl)
    header_color = hex_to_color(primary_hex)
    alt_color = hex_to_color(tmpl.accent_color if tmpl and tmpl.accent_color else '#f1f5f9', '#f1f5f9')
    font_size = tmpl.body_font_size if tmpl else 8
    borders = not tmpl or tmpl.show_table_borders
    alt_rows = not tmpl or tmpl.show_alt_row_color

    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, 0), font_size + 1),
        ('FONTNAME',   (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',   (0, 1), (-1, -1), font_size),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
    ]
    if alt_rows:
        cmds.append(('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, alt_color]))
    if borders:
        cmds.append(('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cbd5e1')))
    else:
        cmds.append(('LINEBELOW', (0, 0), (-1, 0), 1, header_color))
        cmds.append(('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor('#e2e8f0')))

    return TableStyle(cmds)


# ─────────────────────────────────────────────────────────────
# Signature block builder
# ─────────────────────────────────────────────────────────────

def signature_block(tmpl, company):
    if not tmpl or not tmpl.show_signature_block:
        return []
    label = tmpl.signature_label or 'Authorised Signatory'
    story = [
        Spacer(1, 14 * mm),
        HRFlowable(width='40%', thickness=0.6, color=colors.HexColor('#94a3b8')),
        Paragraph(label, ParagraphStyle('sig', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#475569'))),
    ]
    return story


# ─────────────────────────────────────────────────────────────
# Vendor section (shared helper)
# ─────────────────────────────────────────────────────────────

def vendor_section(tmpl, company, styles):
    """Rich vendor info section appended to PDF reports."""
    from instruments.models import Vendor as V
    vendors = V.objects.filter(is_active=True).order_by('name')
    if not vendors.exists():
        return []

    primary_hex = resolve_primary(company, tmpl)
    primary_color = hex_to_color(primary_hex)
    font_size = tmpl.body_font_size if tmpl else 8

    heading_style = ParagraphStyle(
        'VendorHeading', fontName='Helvetica-Bold', fontSize=11,
        textColor=primary_color, spaceAfter=2,
    )
    sub_style = ParagraphStyle(
        'VendorSub', fontName='Helvetica', fontSize=8,
        textColor=colors.HexColor('#64748b'), spaceAfter=4,
    )

    story = [
        Spacer(1, 10 * mm),
        HRFlowable(width='100%', thickness=1.2, color=primary_color),
        Spacer(1, 4 * mm),
        Paragraph('Vendor / Supplier Information', heading_style),
        Paragraph(f'Active vendors on record as of {date.today().strftime("%d %b %Y")}', sub_style),
        Spacer(1, 3 * mm),
    ]

    # ── Summary table ────────────────────────────────────────
    summary_data = [['#', 'Vendor Name', 'Service Type', 'Contact Person', 'Phone', 'Email', 'Active AMC']]
    for idx, v in enumerate(vendors, 1):
        amc_count = 0
        try:
            amc_count = v.amccontract_set.filter(status='active').count()
        except Exception:
            pass
        summary_data.append([
            str(idx),
            v.name,
            v.get_service_type_display() if v.service_type else '—',
            v.contact_person or '—',
            v.phone or '—',
            v.email or '—',
            str(amc_count) if amc_count else '—',
        ])

    col_w = [8 * mm, 42 * mm, 28 * mm, 32 * mm, 26 * mm, 44 * mm, 18 * mm]
    summary_t = Table(summary_data, colWidths=col_w, repeatRows=1)
    summary_t.setStyle(make_table_style(tmpl, company))
    story.append(summary_t)

    # ── Detailed cards (one per vendor) ──────────────────────
    story.append(Spacer(1, 6 * mm))
    detail_heading = ParagraphStyle(
        'DetailHeading', fontName='Helvetica-Bold', fontSize=9,
        textColor=primary_color, spaceAfter=2,
    )
    field_style = ParagraphStyle(
        'VField', fontName='Helvetica', fontSize=font_size,
        textColor=colors.HexColor('#1e293b'), leading=12,
    )
    label_style = ParagraphStyle(
        'VLabel', fontName='Helvetica-Bold', fontSize=font_size - 0.5,
        textColor=colors.HexColor('#64748b'),
    )

    for v in vendors:
        # vendor card header row
        card_header = [[
            Paragraph(f'{v.name}', detail_heading),
            Paragraph(v.get_service_type_display() if v.service_type else '', label_style),
        ]]
        card_header_t = Table(card_header, colWidths=[100 * mm, 88 * mm])
        card_header_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('LINEBELOW', (0, 0), (-1, 0), 0.8, hex_to_color(primary_hex, '#1e3a5f')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(card_header_t)

        # two-column detail grid
        def row(label, value):
            return [
                Paragraph(label, label_style),
                Paragraph(str(value) if value else '—', field_style),
            ]

        details = [
            row('Contact Person', v.contact_person),
            row('Phone', f'{v.phone}  {("| Alt: " + v.alternate_phone) if v.alternate_phone else ""}'),
            row('Email', v.email),
            row('Website', v.website),
            row('Address', v.address),
        ]
        biz = [
            row('GSTIN / Tax ID', v.gstin),
            row('PAN', v.pan),
            row('Payment Terms', v.payment_terms),
            row('Bank Name', v.bank_name),
            row('Bank Account', v.bank_account),
            row('IFSC / Swift', v.bank_ifsc),
        ]

        # filter out blank rows
        details = [r for r in details if r[1].text and r[1].text != '—']
        biz = [r for r in biz if r[1].text and r[1].text != '—']

        if details or biz:
            max_rows = max(len(details), len(biz), 1)
            # pad to same length
            while len(details) < max_rows:
                details.append([Paragraph('', label_style), Paragraph('', field_style)])
            while len(biz) < max_rows:
                biz.append([Paragraph('', label_style), Paragraph('', field_style)])

            combined = [[d[0], d[1], b[0], b[1]] for d, b in zip(details, biz)]
            detail_t = Table(combined, colWidths=[28 * mm, 57 * mm, 28 * mm, 75 * mm])
            detail_t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), font_size),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, -1), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
            ]))
            story.append(detail_t)

        if v.notes:
            notes_t = Table(
                [[Paragraph('Notes:', label_style), Paragraph(v.notes, field_style)]],
                colWidths=[20 * mm, 168 * mm],
            )
            notes_t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#fde68a')),
            ]))
            story.append(notes_t)

        story.append(Spacer(1, 4 * mm))

    return story


# ─────────────────────────────────────────────────────────────
# PDF Reports
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_calibration_report(request):
    company = get_settings()
    default_title = 'Calibration Report'
    tmpl = get_template('calibration')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="calibration_report_{date.today()}.pdf"'

    doc, styles = build_doc(response, tmpl)

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    story = [Spacer(1, 4 * mm)]

    records = CalibrationRecord.objects.select_related('instrument').order_by('-calibration_date')
    data = [['Instrument', 'Serial No.', 'Cal. Date', 'Next Due', 'Status', 'Performed By']]
    for r in records:
        data.append([
            r.instrument.name,
            r.instrument.serial_number,
            str(r.calibration_date),
            str(r.next_due_date) if r.next_due_date else '—',
            r.get_status_display(),
            r.calibrated_by_name or '—',
        ])
    if len(data) == 1:
        data.append(['No calibration records found', '', '', '', '', ''])

    col_w = [52 * mm, 32 * mm, 26 * mm, 26 * mm, 22 * mm, 30 * mm]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(make_table_style(tmpl, company))
    story.append(t)
    story += vendor_section(tmpl, company, styles)
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_amc_report(request):
    company = get_settings()
    default_title = 'AMC / Contract Report'
    tmpl = get_template('amc')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="amc_report_{date.today()}.pdf"'

    doc, styles = build_doc(response, tmpl)

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    story = [Spacer(1, 4 * mm)]

    records = AMCContract.objects.select_related('instrument', 'vendor').order_by('end_date')
    data = [['Instrument', 'Vendor', 'Type', 'Start', 'End', 'Value (₹)', 'Status']]
    for r in records:
        days_left = (r.end_date - date.today()).days if r.end_date else None
        status_text = r.get_status_display()
        if days_left is not None and days_left <= 30 and r.status == 'active':
            status_text = f'⚠ Exp. {days_left}d'
        data.append([
            r.instrument.name,
            r.vendor.name,
            r.get_contract_type_display(),
            str(r.start_date),
            str(r.end_date),
            f'{float(r.contract_value):,.0f}' if r.contract_value else '—',
            status_text,
        ])
    if len(data) == 1:
        data.append(['No AMC records found', '', '', '', '', '', ''])

    col_w = [42 * mm, 34 * mm, 22 * mm, 22 * mm, 22 * mm, 22 * mm, 20 * mm]
    t = Table(data, colWidths=col_w, repeatRows=1)
    ts = make_table_style(tmpl, company)
    # highlight expiring soon rows
    for i, row in enumerate(data[1:], 1):
        if '⚠' in str(row[6]):
            ts.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fff7ed'))
    t.setStyle(ts)
    story.append(t)
    story += vendor_section(tmpl, company, styles)
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_vendor_list(request):
    company = get_settings()
    default_title = 'Vendor / Supplier List'
    tmpl = get_template('vendors')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="vendor_list_{date.today()}.pdf"'

    doc, styles = build_doc(response, tmpl)

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    story = [Spacer(1, 4 * mm)]

    vendors = Vendor.objects.all().order_by('name')
    data = [['Vendor Name', 'Contact Person', 'Email', 'Phone', 'Address']]
    for v in vendors:
        data.append([
            v.name,
            v.contact_person or '—',
            v.email or '—',
            v.phone or '—',
            (v.address or '—')[:45],
        ])
    if len(data) == 1:
        data.append(['No vendors found', '', '', '', ''])

    col_w = [45 * mm, 35 * mm, 48 * mm, 28 * mm, 32 * mm]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(make_table_style(tmpl, company))
    story.append(t)
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_service_month_report(request):
    company = get_settings()
    today = date.today()
    default_title = f'Service Report — {today.strftime("%B %Y")}'
    tmpl = get_template('service_month')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="service_report_{today.strftime("%Y_%m")}.pdf"'

    doc, styles = build_doc(response, tmpl)

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    story = [Spacer(1, 4 * mm)]

    month_start = today.replace(day=1)
    logs = MaintenanceLog.objects.filter(
        performed_at__date__gte=month_start
    ).select_related('instrument', 'performed_by').order_by('performed_at')

    data = [['Instrument', 'Type', 'Date', 'Technician', 'Cost (₹)', 'Notes']]
    for l in logs:
        data.append([
            l.instrument.name,
            l.get_maintenance_type_display(),
            str(l.performed_at.date()),
            l.performed_by.get_full_name() if l.performed_by else '—',
            f'{float(l.cost):,.0f}' if l.cost else '0',
            (l.description or '')[:40],
        ])
    if len(data) == 1:
        data.append(['No services this month', '', '', '', '', ''])

    col_w = [45 * mm, 28 * mm, 22 * mm, 30 * mm, 20 * mm, 43 * mm]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(make_table_style(tmpl, company))
    story.append(t)

    # Vendor section
    story += vendor_section(tmpl, company, styles)
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_audit_report(request):
    company = get_settings()
    default_title = 'Audit Readiness Report'
    tmpl = get_template('audit')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="audit_report_{date.today()}.pdf"'

    doc, styles = build_doc(response, tmpl)

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    story = [Spacer(1, 4 * mm)]

    instruments = Instrument.objects.all()
    today = date.today()
    data = [['Instrument', 'Serial No.', 'Status', 'Cal. Date', 'Next Cal.', 'AMC Vendor', 'Score']]
    for inst in instruments:
        cal = CalibrationRecord.objects.filter(instrument=inst).order_by('-calibration_date').first()
        amc = AMCContract.objects.filter(instrument=inst, status='active').order_by('-end_date').first()
        score = 0
        if inst.status == 'operational':
            score += 30
        if cal and cal.status == 'valid':
            score += 40
        if amc:
            score += 30
        data.append([
            inst.name,
            inst.serial_number,
            inst.get_status_display(),
            str(cal.calibration_date) if cal else 'None',
            str(cal.next_due_date) if cal and cal.next_due_date else '—',
            amc.vendor.name if amc else 'None',
            f'{score}%',
        ])
    if len(data) == 1:
        data.append(['No instruments', '', '', '', '', '', ''])

    col_w = [42 * mm, 28 * mm, 24 * mm, 22 * mm, 22 * mm, 28 * mm, 16 * mm]
    t = Table(data, colWidths=col_w, repeatRows=1)
    ts = make_table_style(tmpl, company)
    for i, row in enumerate(data[1:], 1):
        try:
            sc = int(str(row[6]).replace('%', ''))
            if sc >= 80:
                ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#16a34a'))
            elif sc >= 50:
                ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#d97706'))
            else:
                ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#dc2626'))
        except Exception:
            pass
    t.setStyle(ts)
    story.append(t)

    # Vendor section
    story += vendor_section(tmpl, company, styles)
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)
    return response


# ─────────────────────────────────────────────────────────────
# Preview endpoint — generates a sample 1-page PDF for the editor
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pdf_preview(request, report_type):
    """Return a preview PDF using the current template settings + dummy data."""
    company = get_settings()
    tmpl = get_template(report_type)

    TITLES = {
        'calibration': 'Calibration Report',
        'amc': 'AMC / Contract Report',
        'vendors': 'Vendor / Supplier List',
        'service_month': f'Service Report — {date.today().strftime("%B %Y")}',
        'audit': 'Audit Readiness Report',
    }
    default_title = TITLES.get(report_type, 'Report Preview')

    buf = BytesIO()
    doc_tmp = get_template(report_type)  # same object

    from reportlab.lib.pagesizes import A4 as _A4
    pagesize = get_pagesize(tmpl)
    mt = (tmpl.margin_top    if tmpl else 20) * mm
    mb = (tmpl.margin_bottom if tmpl else 20) * mm
    ml = (tmpl.margin_left   if tmpl else 15) * mm
    mr = (tmpl.margin_right  if tmpl else 15) * mm

    doc = SimpleDocTemplate(
        buf, pagesize=pagesize,
        rightMargin=mr, leftMargin=ml,
        topMargin=mt + 30 * mm,
        bottomMargin=mb + 12 * mm,
    )

    def _hf(canvas, d):
        header_footer(canvas, d, company, default_title, tmpl)

    # Sample table rows (dummy)
    SAMPLE = {
        'calibration': {
            'headers': ['Instrument', 'Serial No.', 'Cal. Date', 'Next Due', 'Status', 'Performed By'],
            'rows': [
                ['HPLC Unit A', 'SN-0001', '2024-01-15', '2025-01-15', 'Valid', 'ABC Calibrators'],
                ['GC Analyser', 'SN-0002', '2024-03-20', '2025-03-20', 'Valid', 'XYZ Instruments'],
                ['pH Meter B', 'SN-0003', '2023-11-10', '2024-11-10', 'Due', 'Internal'],
                ['Balances ×4', 'SN-0004', '2024-06-01', '2025-06-01', 'Valid', 'PQR Labs'],
            ],
            'col_w': [52*mm, 32*mm, 26*mm, 26*mm, 22*mm, 30*mm],
        },
        'amc': {
            'headers': ['Instrument', 'Vendor', 'Type', 'Start', 'End', 'Value (₹)', 'Status'],
            'rows': [
                ['HPLC Unit A', 'ABC Corp', 'Comprehensive', '2024-01-01', '2025-01-01', '85,000', 'Active'],
                ['GC Analyser', 'XYZ Instr.', 'Labour Only', '2024-03-01', '2025-03-01', '40,000', 'Active'],
                ['UV-Vis Spec', 'PQR Labs', 'Comprehensive', '2023-07-01', '2024-07-01', '60,000', '⚠ Exp. 12d'],
            ],
            'col_w': [42*mm, 34*mm, 22*mm, 22*mm, 22*mm, 22*mm, 20*mm],
        },
        'vendors': {
            'headers': ['Vendor Name', 'Contact Person', 'Email', 'Phone', 'Address'],
            'rows': [
                ['ABC Calibrators Pvt Ltd', 'Ramesh Kumar', 'info@abc.com', '9800001111', 'Mumbai, MH'],
                ['XYZ Instruments', 'Suresh Patel', 'sales@xyz.in', '9800002222', 'Chennai, TN'],
                ['PQR Laboratory Svcs', 'Anjali Singh', 'support@pqr.co.in', '9800003333', 'Bengaluru, KA'],
            ],
            'col_w': [45*mm, 35*mm, 48*mm, 28*mm, 32*mm],
        },
        'service_month': {
            'headers': ['Instrument', 'Type', 'Date', 'Technician', 'Cost (₹)', 'Notes'],
            'rows': [
                ['HPLC Unit A', 'Preventive', '2024-06-03', 'Raj Kumar', '2,500', 'Filter replaced'],
                ['GC Analyser', 'Corrective', '2024-06-10', 'Priya Sharma', '5,000', 'Injector cleaned'],
                ['Balances ×4', 'Calibration', '2024-06-15', 'Internal', '0', 'Annual check'],
            ],
            'col_w': [45*mm, 28*mm, 22*mm, 30*mm, 20*mm, 43*mm],
        },
        'audit': {
            'headers': ['Instrument', 'Serial No.', 'Status', 'Cal. Date', 'Next Cal.', 'AMC Vendor', 'Score'],
            'rows': [
                ['HPLC Unit A', 'SN-0001', 'Operational', '2024-01-15', '2025-01-15', 'ABC Corp', '100%'],
                ['GC Analyser', 'SN-0002', 'Operational', '2024-03-20', '2025-03-20', 'XYZ Instr.', '100%'],
                ['pH Meter B', 'SN-0003', 'Calibrating', '2023-11-10', '2024-11-10', 'None', '30%'],
                ['Dosing Pump', 'SN-0004', 'Broken Down', '—', '—', 'None', '0%'],
            ],
            'col_w': [42*mm, 28*mm, 24*mm, 22*mm, 22*mm, 28*mm, 16*mm],
        },
    }

    sample = SAMPLE.get(report_type, SAMPLE['calibration'])
    data = [sample['headers']] + sample['rows']
    t = Table(data, colWidths=sample['col_w'], repeatRows=1)
    ts = make_table_style(tmpl, company)
    if report_type == 'audit':
        for i, row in enumerate(data[1:], 1):
            try:
                sc = int(str(row[6]).replace('%', ''))
                if sc >= 80:
                    ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#16a34a'))
                elif sc >= 50:
                    ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#d97706'))
                else:
                    ts.add('TEXTCOLOR', (6, i), (6, i), colors.HexColor('#dc2626'))
            except Exception:
                pass
    t.setStyle(ts)

    story = [Spacer(1, 4 * mm), t]
    story += signature_block(tmpl, company)

    doc.build(story, onFirstPage=_hf, onLaterPages=_hf)

    buf.seek(0)
    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="preview_{report_type}.pdf"'
    return response
