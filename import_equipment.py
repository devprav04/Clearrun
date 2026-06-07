"""
One-shot import script: reads the CPCL equipment Excel and populates
Instrument + CalibrationRecord tables.

Run: python import_equipment.py
"""
import os, sys, django
from datetime import datetime, date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cleanrun.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

import xlrd
from instruments.models import Instrument
from maintenance.models import CalibrationRecord

XLS_PATH = '/home/cyber/Documents/List of Equipment and Calibration status 25-04-26 dup.xls'
SHEET    = 'NOV 2022'
LOCATION = 'Quality Control Laboratory'


def parse_date(val, datemode):
    val = str(val).strip()
    if not val or val.upper() in ('NOT WORKING', 'N/A', '-', '23', ''):
        return None
    try:
        f = float(val)
        if f > 1000:
            t = xlrd.xldate_as_tuple(f, datemode)
            return datetime(*t[:3]).date() if t[0] else None
    except Exception:
        pass
    for fmt in ('%d.%m.%Y', '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            pass
    return None


def map_status(raw):
    raw = raw.lower()
    if 'not working' in raw or 'breakdown' in raw or 'broken' in raw:
        return Instrument.Status.BROKEN_DOWN
    if 'calibrat' in raw:
        return Instrument.Status.CALIBRATING
    if 'service' in raw or 'maintenance' in raw:
        return Instrument.Status.SCHEDULED_MAINTENANCE
    if 'out of service' in raw or 'decommission' in raw:
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


def run():
    wb = xlrd.open_workbook(XLS_PATH)
    sh = wb.sheet_by_name(SHEET)

    created_instruments = 0
    skipped_duplicates  = 0
    created_cal         = 0

    for r in range(sh.nrows):
        sn_raw = str(sh.cell_value(r, 0)).strip()
        name   = str(sh.cell_value(r, 1)).strip()

        # Only process rows where col0 is a number and col1 is a real name
        try:
            float(sn_raw)
        except ValueError:
            continue
        if not name or name == 'Name of the Equipment':
            continue

        make   = str(sh.cell_value(r, 2)).strip()
        model  = str(sh.cell_value(r, 3)).strip()
        serial = str(sh.cell_value(r, 4)).strip()
        equip  = str(sh.cell_value(r, 5)).strip()
        cal_on = parse_date(sh.cell_value(r, 6), wb.datemode)
        cal_due= parse_date(sh.cell_value(r, 7), wb.datemode)
        status_raw = str(sh.cell_value(r, 8)).strip()

        # Clean float serials like "10291810.0" → "10291810"
        if serial.endswith('.0'):
            serial = serial[:-2]
        if not serial:
            serial = f"UNKNOWN-{r}"

        # Deduplicate by serial number or equipment code
        qr = equip or f"CR-{serial}"
        if Instrument.objects.filter(serial_number=serial).exists() or \
           Instrument.objects.filter(qr_code=qr).exists():
            skipped_duplicates += 1
            continue

        inst = Instrument.objects.create(
            name=name,
            manufacturer=make,
            model=model or 'N/A',
            serial_number=serial,
            qr_code=qr,
            location=LOCATION,
            status=map_status(status_raw),
            notes=status_raw if status_raw.lower() not in ('working', '') else '',
        )
        created_instruments += 1

        # Create calibration record if we have dates
        if cal_on or cal_due:
            CalibrationRecord.objects.create(
                instrument=inst,
                calibration_date=cal_on or date(2022, 1, 1),
                next_due_date=cal_due or date(2023, 1, 1),
                status=cal_status(cal_due),
                notes=f"Imported from CPCL equipment register",
            )
            created_cal += 1

    print(f"\n✅ Import complete!")
    print(f"   Instruments created : {created_instruments}")
    print(f"   Calibration records : {created_cal}")
    print(f"   Skipped (duplicate) : {skipped_duplicates}")


if __name__ == '__main__':
    run()
