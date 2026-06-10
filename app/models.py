from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, JSON, Numeric, SmallInteger, String, Table, Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ── M2M association ──────────────────────────────────────────────────────────
spare_part_instruments = Table(
    'inventory_sparepart_compatible_instruments',
    Base.metadata,
    Column('id', BigInteger, primary_key=True, autoincrement=True),
    Column('sparepart_id', BigInteger, ForeignKey('inventory_sparepart.id')),
    Column('instrument_id', BigInteger, ForeignKey('instruments_instrument.id')),
)


def _now():
    return datetime.now(timezone.utc)


# ── Accounts ─────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = 'accounts_user'

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    password      = Column(String(128))
    last_login    = Column(DateTime(timezone=True), nullable=True)
    is_superuser  = Column(Boolean, default=False)
    username      = Column(String(150), unique=True)
    first_name    = Column(String(150), default='')
    last_name     = Column(String(150), default='')
    email         = Column(String(254), default='')
    is_staff      = Column(Boolean, default=False)
    is_active     = Column(Boolean, default=True)
    date_joined   = Column(DateTime(timezone=True), default=_now)
    role          = Column(String(20), default='employee')
    phone         = Column(String(20), default='')
    department    = Column(String(100), default='')
    employee_id   = Column(String(50), default='')
    profile_picture = Column(String(100), nullable=True)

    audit_logs       = relationship('AuditLog',         back_populates='user',         foreign_keys='AuditLog.user_id')
    reported_tickets = relationship('BreakdownTicket',  back_populates='reported_by',  foreign_keys='BreakdownTicket.reported_by_id')
    assigned_tickets = relationship('BreakdownTicket',  back_populates='assigned_to',  foreign_keys='BreakdownTicket.assigned_to_id')
    maintenance_logs = relationship('MaintenanceLog',   back_populates='performed_by')
    calibrations     = relationship('CalibrationRecord',back_populates='calibrated_by')
    user_permission  = relationship('UserPermission',   back_populates='user', uselist=False)


class AuditLog(Base):
    __tablename__ = 'accounts_auditlog'

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id       = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    action        = Column(String(20))
    resource_type = Column(String(100), default='')
    resource_name = Column(String(255), default='')
    detail        = Column(Text, default='')
    ip_address    = Column(String(39), nullable=True)
    timestamp     = Column(DateTime(timezone=True), default=_now)

    user = relationship('User', back_populates='audit_logs', foreign_keys=[user_id])


# ── Instruments ──────────────────────────────────────────────────────────────
class Vendor(Base):
    __tablename__ = 'instruments_vendor'

    id             = Column(BigInteger, primary_key=True, autoincrement=True)
    name           = Column(String(200))
    contact_person = Column(String(100), default='')
    email          = Column(String(254), default='')
    phone          = Column(String(20), default='')
    alternate_phone= Column(String(20), default='')
    address        = Column(Text, default='')
    website        = Column(String(200), default='')
    service_type   = Column(String(20), default='')
    gstin          = Column(String(20), default='')
    pan            = Column(String(15), default='')
    payment_terms  = Column(String(100), default='')
    bank_name      = Column(String(100), default='')
    bank_account   = Column(String(30), default='')
    bank_ifsc      = Column(String(15), default='')
    is_active      = Column(Boolean, default=True)
    rating         = Column(SmallInteger, nullable=True)
    notes          = Column(Text, default='')
    created_at     = Column(DateTime(timezone=True), default=_now)
    updated_at     = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    instruments   = relationship('Instrument',        back_populates='vendor')
    amc_contracts = relationship('AMCContract',       back_populates='vendor')
    calibrations  = relationship('CalibrationRecord', back_populates='calibrated_by_vendor')
    spare_parts   = relationship('SparePart',         back_populates='vendor')


class Instrument(Base):
    __tablename__ = 'instruments_instrument'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    name                 = Column(String(200))
    model                = Column(String(200))
    serial_number        = Column(String(100), unique=True)
    manufacturer         = Column(String(200), default='')
    installation_date    = Column(Date, nullable=True)
    location             = Column(String(200))
    status               = Column(String(30), default='operational')
    qr_code              = Column(String(100), unique=True, default='')
    user_manual          = Column(String(100), nullable=True)
    calibration_guideline= Column(String(100), nullable=True)
    notes                = Column(Text, default='')
    created_at           = Column(DateTime(timezone=True), default=_now)
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)
    vendor_id            = Column(BigInteger, ForeignKey('instruments_vendor.id', ondelete='SET NULL'), nullable=True)

    vendor              = relationship('Vendor',            back_populates='instruments')
    amc_contracts       = relationship('AMCContract',       back_populates='instrument')
    breakdown_tickets   = relationship('BreakdownTicket',   back_populates='instrument')
    maintenance_logs    = relationship('MaintenanceLog',    back_populates='instrument')
    calibration_records = relationship('CalibrationRecord', back_populates='instrument')
    spare_parts         = relationship('SparePart', secondary=spare_part_instruments, back_populates='compatible_instruments')


# ── Maintenance ──────────────────────────────────────────────────────────────
class AMCContract(Base):
    __tablename__ = 'maintenance_amccontract'

    id                = Column(BigInteger, primary_key=True, autoincrement=True)
    instrument_id     = Column(BigInteger, ForeignKey('instruments_instrument.id', ondelete='CASCADE'))
    vendor_id         = Column(BigInteger, ForeignKey('instruments_vendor.id', ondelete='CASCADE'))
    contract_type     = Column(String(20))
    start_date        = Column(Date)
    end_date          = Column(Date)
    contract_value    = Column(Numeric(12, 2))
    contract_document = Column(String(100), nullable=True)
    status            = Column(String(20), default='active')
    notes             = Column(Text, default='')
    created_at        = Column(DateTime(timezone=True), default=_now)

    instrument = relationship('Instrument', back_populates='amc_contracts')
    vendor     = relationship('Vendor',     back_populates='amc_contracts')


class BreakdownTicket(Base):
    __tablename__ = 'maintenance_breakdownticket'

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    ticket_id        = Column(String(20), unique=True, default='')
    instrument_id    = Column(BigInteger, ForeignKey('instruments_instrument.id', ondelete='CASCADE'))
    reported_by_id   = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    assigned_to_id   = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    priority         = Column(String(10), default='medium')
    status           = Column(String(15), default='open')
    description      = Column(Text)
    resolution_notes = Column(Text, default='')
    reported_at      = Column(DateTime(timezone=True), default=_now)
    resolved_at      = Column(DateTime(timezone=True), nullable=True)

    instrument   = relationship('Instrument',     back_populates='breakdown_tickets')
    reported_by  = relationship('User', back_populates='reported_tickets', foreign_keys=[reported_by_id])
    assigned_to  = relationship('User', back_populates='assigned_tickets', foreign_keys=[assigned_to_id])
    maintenance_logs = relationship('MaintenanceLog', back_populates='ticket')


class MaintenanceLog(Base):
    __tablename__ = 'maintenance_maintenancelog'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    instrument_id        = Column(BigInteger, ForeignKey('instruments_instrument.id', ondelete='CASCADE'))
    ticket_id            = Column(BigInteger, ForeignKey('maintenance_breakdownticket.id', ondelete='SET NULL'), nullable=True)
    performed_by_id      = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    maintenance_type     = Column(String(15))
    description          = Column(Text)
    parts_used           = Column(Text, default='')
    labor_cost           = Column(Numeric(10, 2), default=0)
    parts_cost           = Column(Numeric(10, 2), default=0)
    performed_at         = Column(DateTime(timezone=True))
    next_maintenance_due = Column(Date, nullable=True)
    created_at           = Column(DateTime(timezone=True), default=_now)

    instrument   = relationship('Instrument',     back_populates='maintenance_logs')
    ticket       = relationship('BreakdownTicket',back_populates='maintenance_logs')
    performed_by = relationship('User',           back_populates='maintenance_logs')


class CalibrationRecord(Base):
    __tablename__ = 'maintenance_calibrationrecord'

    id                    = Column(BigInteger, primary_key=True, autoincrement=True)
    instrument_id         = Column(BigInteger, ForeignKey('instruments_instrument.id', ondelete='CASCADE'))
    calibrated_by_id      = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    calibrated_by_vendor_id = Column(BigInteger, ForeignKey('instruments_vendor.id', ondelete='SET NULL'), nullable=True)
    calibration_date      = Column(Date)
    next_due_date         = Column(Date)
    certificate           = Column(String(100), nullable=True)
    status                = Column(String(10), default='valid')
    notes                 = Column(Text, default='')
    created_at            = Column(DateTime(timezone=True), default=_now)

    instrument            = relationship('Instrument', back_populates='calibration_records')
    calibrated_by         = relationship('User',   back_populates='calibrations')
    calibrated_by_vendor  = relationship('Vendor', back_populates='calibrations')


# ── Inventory ────────────────────────────────────────────────────────────────
class SparePart(Base):
    __tablename__ = 'inventory_sparepart'

    id                  = Column(BigInteger, primary_key=True, autoincrement=True)
    name                = Column(String(200))
    part_number         = Column(String(100), unique=True)
    description         = Column(Text, default='')
    vendor_id           = Column(BigInteger, ForeignKey('instruments_vendor.id', ondelete='SET NULL'), nullable=True)
    unit_cost           = Column(Numeric(10, 2))
    quantity_in_stock   = Column(Integer, default=0)
    minimum_stock_level = Column(Integer, default=2)
    location            = Column(String(100), default='')
    created_at          = Column(DateTime(timezone=True), default=_now)
    updated_at          = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    vendor                = relationship('Vendor',      back_populates='spare_parts')
    transactions          = relationship('StockTransaction', back_populates='part')
    compatible_instruments = relationship('Instrument', secondary=spare_part_instruments, back_populates='spare_parts')


class StockTransaction(Base):
    __tablename__ = 'inventory_stocktransaction'

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    part_id          = Column(BigInteger, ForeignKey('inventory_sparepart.id', ondelete='CASCADE'))
    transaction_type = Column(String(15))
    quantity         = Column(Integer)
    performed_by_id  = Column(BigInteger, ForeignKey('accounts_user.id', ondelete='SET NULL'), nullable=True)
    reference        = Column(String(200), default='')
    notes            = Column(Text, default='')
    created_at       = Column(DateTime(timezone=True), default=_now)

    part         = relationship('SparePart', back_populates='transactions')
    performed_by = relationship('User')


# ── Settings ─────────────────────────────────────────────────────────────────
class CompanySettings(Base):
    __tablename__ = 'settings_app_companysettings'

    id                      = Column(BigInteger, primary_key=True, autoincrement=True)
    company_name            = Column(String(200), default='CleanRun IMMS')
    tagline                 = Column(String(300), default='')
    logo                    = Column(String(100), nullable=True)
    address                 = Column(Text, default='')
    phone                   = Column(String(30), default='')
    email                   = Column(String(254), default='')
    primary_color           = Column(String(7), default='#2563eb')
    company_code            = Column(String(20), default='')
    department_code         = Column(String(20), default='')
    sub_dept_code           = Column(String(20), default='')
    equipment_code_prefix   = Column(String(20), default='EQ')
    equipment_code_separator= Column(String(5), default='-')
    equipment_code_digits   = Column(SmallInteger, default=3)
    updated_at              = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class CustomOption(Base):
    __tablename__ = 'settings_app_customoption'

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    field      = Column(String(50))
    label      = Column(String(100))
    value      = Column(String(100))
    sort_order = Column(SmallInteger, default=0)
    is_active  = Column(Boolean, default=True)


class UserPermission(Base):
    __tablename__ = 'settings_app_userpermission'

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id          = Column(BigInteger, ForeignKey('accounts_user.id'), unique=True)
    instruments_view = Column(Boolean, default=True)
    instruments_edit = Column(Boolean, default=False)
    calibration_view = Column(Boolean, default=True)
    calibration_edit = Column(Boolean, default=False)
    service_view     = Column(Boolean, default=True)
    service_edit     = Column(Boolean, default=False)
    inventory_view   = Column(Boolean, default=True)
    inventory_edit   = Column(Boolean, default=False)
    reports_view     = Column(Boolean, default=True)

    user = relationship('User', back_populates='user_permission')


class PDFTemplate(Base):
    __tablename__ = 'settings_app_pdftemplate'

    id                     = Column(BigInteger, primary_key=True, autoincrement=True)
    report_type            = Column(String(50), unique=True)
    title                  = Column(String(200), default='')
    header_text            = Column(Text, default='')
    footer_text            = Column(Text, default='')
    primary_color          = Column(String(20), default='#1e3a5f')
    accent_color           = Column(String(20), default='#2563eb')
    body_font_size         = Column(SmallInteger, default=10)
    paper_size             = Column(String(10), default='A4')
    orientation            = Column(String(15), default='portrait')
    margin_top             = Column(Float, default=2.0)
    margin_bottom          = Column(Float, default=2.0)
    margin_left            = Column(Float, default=2.0)
    margin_right           = Column(Float, default=2.0)
    include_logo           = Column(Boolean, default=True)
    show_address           = Column(Boolean, default=True)
    show_page_number       = Column(Boolean, default=True)
    show_generated_date    = Column(Boolean, default=True)
    show_table_borders     = Column(Boolean, default=True)
    show_alt_row_color     = Column(Boolean, default=True)
    show_watermark         = Column(Boolean, default=False)
    watermark_text         = Column(String(100), default='')
    show_confidential_banner = Column(Boolean, default=False)
    confidential_text      = Column(String(100), default='')
    show_signature_block   = Column(Boolean, default=False)
    signature_label        = Column(String(100), default='')
    custom_columns         = Column(JSON, default=dict)
    updated_at             = Column(DateTime(timezone=True), default=_now, onupdate=_now)
