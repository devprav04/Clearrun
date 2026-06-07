"""
Full data import from CPCL Equipment Excel:
  1. Vendors  — from 'Calibrated by' column across all sheets
  2. Instruments — from feb 2026 sheets (most recent data), update existing
  3. Calibration records — latest per instrument linked to vendor
  4. Backfill from NOV 2022 for any missing instruments

Run: python import_full.py
"""
import os, sys, django
from datetime import datetime, date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cleanrun.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

import xlrd
from instruments.models import Instrument, Vendor
from maintenance.models import CalibrationRecord

XLS = '/home/cyber/Documents/List of Equipment and Calibration status 25-04-26 dup.xls'
LAB = 'Quality Control Laboratory'

wb = xlrd.open_workbook(XLS)

# ── helpers ───────────────────────────────────────────────────────────────────

def parse_date(val):
    val = str(val).strip()
    if not val or val in ('0', '', '-', '23', 'NOT WORKING', 'Not working'):
        return None
    try:
        f = float(val)
        if f > 1000:
            t = xlrd.xldate_as_tuple(f, wb.datemode)
            return datetime(*t[:3]).date() if t[0] else None
    except Exception:
        pass
    for fmt in ('%d.%m.%Y', '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            pass
    return None


def clean_serial(raw):
    s = str(raw).strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s


def map_status(raw):
    r = raw.lower()
    if 'not working' in r or 'breakdown' in r or 'broken' in r or 'waiting' in r:
        return Instrument.Status.BROKEN_DOWN
    if 'calibrat' in r:
        return Instrument.Status.CALIBRATING
    if 'service' in r or 'maintenance' in r:
        return Instrument.Status.SCHEDULED_MAINTENANCE
    if 'out of service' in r or 'decommission' in r:
        return Instrument.Status.OUT_OF_SERVICE
    return Instrument.Status.OPERATIONAL


def cal_status(cal_due):
    if not cal_due:
        return CalibrationRecord.Status.EXPIRED
    today = date.today()
    if cal_due < today:
        return CalibrationRecord.Status.EXPIRED
    if (cal_due - today).days <= 30:
        return CalibrationRecord.Status.DUE_SOON
    return CalibrationRecord.Status.VALID


def normalize_vendor(name):
    """Normalize minor spelling variants to a canonical name."""
    name = name.strip()
    aliases = {
        'Ace Instrument': 'Ace Instruments',
        'Ace Instrument Delhi': 'Ace Instruments',
        'Labcon': 'Labcon Scientific',
        'LabIndia': 'Lab India',
        'Skytech system': 'Skytech System',
        'Perkin Elmar': 'Perkin Elmer',
    }
    return aliases.get(name, name)


def read_sheet(sheet_name, sn_col=0, name_col=1, make_col=2, model_col=3,
               serial_col=4, equip_col=5, cal_on_col=6, cal_due_col=7,
               cal_by_col=8, status_col=None):
    try:
        sh = wb.sheet_by_name(sheet_name)
    except Exception:
        return []
    # find header row
    hrow = -1
    for r in range(sh.nrows):
        row = [str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
        if 'Name of the Equipment' in row:
            hrow = r
            break
    if hrow == -1:
        return []
    rows = []
    for r in range(hrow + 1, sh.nrows):
        sn_raw = str(sh.cell_value(r, sn_col)).strip()
        name = str(sh.cell_value(r, name_col)).strip()
        try:
            float(sn_raw)
        except ValueError:
            continue
        if not name or name == 'Name of the Equipment':
            continue
        serial = clean_serial(sh.cell_value(r, serial_col))
        if not serial:
            continue
        rows.append({
            'name':    name,
            'make':    str(sh.cell_value(r, make_col)).strip(),
            'model':   str(sh.cell_value(r, model_col)).strip() or 'N/A',
            'serial':  serial,
            'equip':   str(sh.cell_value(r, equip_col)).strip(),
            'cal_on':  parse_date(sh.cell_value(r, cal_on_col)),
            'cal_due': parse_date(sh.cell_value(r, cal_due_col)),
            'cal_by':  normalize_vendor(str(sh.cell_value(r, cal_by_col)).strip()) if cal_by_col is not None and cal_by_col < sh.ncols else '',
            'status':  str(sh.cell_value(r, status_col)).strip() if status_col is not None else 'Working',
        })
    return rows


# ── 1. Collect all rows from all sheets ───────────────────────────────────────

print("Reading sheets...")

# feb 2026 = most recent calibration data
feb26_rows   = read_sheet('feb 2026',    sn_col=1, name_col=2, make_col=3, model_col=4, serial_col=5, equip_col=6, cal_on_col=7, cal_due_col=8, cal_by_col=9)
feb26b_rows  = read_sheet('feb 2026 (2)',sn_col=1, name_col=2, make_col=3, model_col=4, serial_col=5, equip_col=6, cal_on_col=7, cal_due_col=8, cal_by_col=9)
sheet1_rows  = read_sheet('Sheet1',      sn_col=1, name_col=2, make_col=3, model_col=4, serial_col=5, equip_col=6, cal_on_col=7, cal_due_col=8, cal_by_col=9)
nov22_rows   = read_sheet('NOV 2022',    status_col=8, cal_by_col=None)
entry_rows   = read_sheet('entry',       sn_col=0, name_col=1, make_col=2, model_col=3, serial_col=4, equip_col=5, cal_on_col=6, cal_due_col=7, cal_by_col=8)
sheet4_rows  = read_sheet('Sheet4',      sn_col=0, name_col=1, make_col=2, model_col=3, serial_col=4, equip_col=5, cal_on_col=6, cal_due_col=7, cal_by_col=8)

# Merge: later sheets override older ones per serial (most recent wins)
by_serial = {}
for row in nov22_rows + entry_rows + sheet4_rows + feb26b_rows + feb26_rows + sheet1_rows:
    s = row['serial']
    if s:
        by_serial[s] = row

all_rows = list(by_serial.values())
print(f"  Unique instruments across all sheets: {len(all_rows)}")

# ── 2. Create vendors ─────────────────────────────────────────────────────────

print("\nImporting vendors...")
vendor_names = set(
    r['cal_by'] for r in all_rows
    if r['cal_by'] and r['cal_by'].lower() not in ('in house', 'inhouse', '0', '')
)

vendor_map = {}   # name → Vendor instance
vcreated = 0
for name in sorted(vendor_names):
    v, created = Vendor.objects.get_or_create(
        name=name,
        defaults={
            'service_type': 'calibration',
            'is_active': True,
        }
    )
    vendor_map[name] = v
    if created:
        vcreated += 1

print(f"  Vendors created: {vcreated}  (existing: {len(vendor_names) - vcreated})")

# ── 3. Import / update instruments ────────────────────────────────────────────

print("\nImporting instruments...")
inst_created = 0
inst_updated = 0
cal_created  = 0
cal_skipped  = 0

for row in all_rows:
    serial = row['serial']
    qr     = row['equip'] or f"CR-{serial}"
    status = map_status(row.get('status', 'Working'))

    # Get or create instrument
    inst = Instrument.objects.filter(serial_number=serial).first()
    if inst:
        # Update fields with fresher data
        inst.name         = row['name']
        inst.manufacturer = row['make']
        inst.model        = row['model'] or inst.model
        inst.location     = LAB
        inst.status       = status
        inst.save()
        inst_updated += 1
    else:
        # Check qr_code uniqueness
        if Instrument.objects.filter(qr_code=qr).exists():
            qr = f"{qr}-{serial}"
        try:
            inst = Instrument.objects.create(
                name=row['name'],
                manufacturer=row['make'],
                model=row['model'],
                serial_number=serial,
                qr_code=qr,
                location=LAB,
                status=status,
            )
            inst_created += 1
        except Exception as e:
            print(f"  SKIP {serial}: {e}")
            continue

    # Add calibration record if dates exist and not already recorded
    cal_on  = row['cal_on']
    cal_due = row['cal_due']
    vendor  = vendor_map.get(row['cal_by'])

    if cal_on or cal_due:
        already = CalibrationRecord.objects.filter(
            instrument=inst,
            calibration_date=cal_on or date(2022, 1, 1),
        ).exists()
        if not already:
            CalibrationRecord.objects.create(
                instrument=inst,
                calibration_date=cal_on or date(2022, 1, 1),
                next_due_date=cal_due or date(2023, 1, 1),
                status=cal_status(cal_due),
                calibrated_by_vendor=vendor,
                notes=f"Imported from CPCL equipment register",
            )
            cal_created += 1
        else:
            cal_skipped += 1

print(f"  Instruments created : {inst_created}")
print(f"  Instruments updated : {inst_updated}")
print(f"  Calibration records created: {cal_created}")
print(f"  Calibration records skipped (duplicate): {cal_skipped}")

# ── 4. Summary ────────────────────────────────────────────────────────────────

print(f"\n✅ Import complete!")
print(f"   Total instruments in DB : {Instrument.objects.count()}")
print(f"   Total calibration records: {CalibrationRecord.objects.count()}")
print(f"   Total vendors            : {Vendor.objects.count()}")
from django.db.models import Count
for s in Instrument.objects.values('status').annotate(n=Count('id')).order_by('-n'):
    print(f"     {s['status']:30s}: {s['n']}")
