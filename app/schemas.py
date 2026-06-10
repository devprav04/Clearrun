from __future__ import annotations
from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


# ── Shared ────────────────────────────────────────────────────────────────────
class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def paginated(results: list, count: int) -> dict:
    return {'count': count, 'results': results}


# ── User ─────────────────────────────────────────────────────────────────────
class UserOut(OrmBase):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    phone: str
    department: str
    employee_id: str
    profile_picture: Optional[str] = None
    profile_picture_url: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    email: str = ''
    password: str
    first_name: str = ''
    last_name: str = ''
    role: str = 'employee'
    phone: str = ''
    department: str = ''
    employee_id: str = ''


class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access: str
    refresh: str
    user: UserOut


class RefreshRequest(BaseModel):
    refresh: str


# ── AuditLog ─────────────────────────────────────────────────────────────────
class AuditLogOut(OrmBase):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    action_display: Optional[str] = None
    resource_type: str
    resource_name: str
    detail: str
    ip_address: Optional[str] = None
    timestamp: datetime


# ── Vendor ───────────────────────────────────────────────────────────────────
class VendorOut(OrmBase):
    id: int
    name: str
    contact_person: str
    email: str
    phone: str
    alternate_phone: str
    address: str
    website: str
    service_type: str
    service_type_display: Optional[str] = None
    gstin: str
    pan: str
    payment_terms: str
    bank_name: str
    bank_account: str
    bank_ifsc: str
    is_active: bool
    rating: Optional[int] = None
    notes: str
    created_at: datetime
    updated_at: datetime
    instruments_count: Optional[int] = None
    active_amc_count: Optional[int] = None


class VendorCreate(BaseModel):
    name: str
    contact_person: str = ''
    email: str = ''
    phone: str = ''
    alternate_phone: str = ''
    address: str = ''
    website: str = ''
    service_type: str = ''
    gstin: str = ''
    pan: str = ''
    payment_terms: str = ''
    bank_name: str = ''
    bank_account: str = ''
    bank_ifsc: str = ''
    is_active: bool = True
    rating: Optional[int] = None
    notes: str = ''


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    service_type: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    payment_terms: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    is_active: Optional[bool] = None
    rating: Optional[int] = None
    notes: Optional[str] = None


# ── Instrument ───────────────────────────────────────────────────────────────
class InstrumentOut(OrmBase):
    id: int
    name: str
    model: str
    serial_number: str
    manufacturer: str
    installation_date: Optional[date] = None
    location: str
    status: str
    status_display: Optional[str] = None
    qr_code: str
    user_manual: Optional[str] = None
    calibration_guideline: Optional[str] = None
    notes: str
    created_at: datetime
    updated_at: datetime
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None


class InstrumentCreate(BaseModel):
    name: str
    model: str
    serial_number: str
    manufacturer: str = ''
    installation_date: Optional[date] = None
    location: str
    status: str = 'operational'
    notes: str = ''
    vendor_id: Optional[int] = None


class InstrumentUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    installation_date: Optional[date] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    vendor_id: Optional[int] = None


# ── AMC Contract ─────────────────────────────────────────────────────────────
class AMCContractOut(OrmBase):
    id: int
    instrument_id: int
    instrument_name: Optional[str] = None
    vendor_id: int
    vendor_name: Optional[str] = None
    contract_type: str
    start_date: date
    end_date: date
    contract_value: float
    contract_document: Optional[str] = None
    status: str
    notes: str
    created_at: datetime
    days_until_expiry: Optional[int] = None


class AMCContractCreate(BaseModel):
    instrument_id: int
    vendor_id: int
    contract_type: str
    start_date: date
    end_date: date
    contract_value: float
    status: str = 'active'
    notes: str = ''


class AMCContractUpdate(BaseModel):
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    contract_value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ── Breakdown Ticket ──────────────────────────────────────────────────────────
class BreakdownTicketOut(OrmBase):
    id: int
    ticket_id: str
    instrument_id: int
    instrument_name: Optional[str] = None
    reported_by_id: Optional[int] = None
    reported_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    priority: str
    status: str
    description: str
    resolution_notes: str
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    mttr_hours: Optional[float] = None


class BreakdownTicketCreate(BaseModel):
    instrument: int
    priority: str = 'medium'
    description: str


class BreakdownTicketUpdate(BaseModel):
    assigned_to: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    resolution_notes: Optional[str] = None


# ── Maintenance Log ───────────────────────────────────────────────────────────
class MaintenanceLogOut(OrmBase):
    id: int
    instrument_id: int
    instrument_name: Optional[str] = None
    ticket_id: Optional[int] = None
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    maintenance_type: str
    description: str
    parts_used: str
    labor_cost: float
    parts_cost: float
    performed_at: datetime
    next_maintenance_due: Optional[date] = None
    created_at: datetime


class MaintenanceLogCreate(BaseModel):
    instrument: int
    ticket: Optional[int] = None
    maintenance_type: str
    description: str
    parts_used: str = ''
    labor_cost: float = 0
    parts_cost: float = 0
    performed_at: datetime
    next_maintenance_due: Optional[date] = None


class MaintenanceLogUpdate(BaseModel):
    maintenance_type: Optional[str] = None
    description: Optional[str] = None
    parts_used: Optional[str] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    performed_at: Optional[datetime] = None
    next_maintenance_due: Optional[date] = None


# ── Calibration Record ────────────────────────────────────────────────────────
class CalibrationRecordOut(OrmBase):
    id: int
    instrument_id: int
    instrument_name: Optional[str] = None
    calibrated_by_id: Optional[int] = None
    calibrated_by_vendor_id: Optional[int] = None
    calibrated_by_name: Optional[str] = None
    calibrated_by_vendor_name: Optional[str] = None
    calibration_date: date
    next_due_date: date
    certificate: Optional[str] = None
    status: str
    notes: str
    created_at: datetime


class CalibrationRecordCreate(BaseModel):
    instrument: int
    calibrated_by_vendor: Optional[int] = None
    calibration_date: date
    next_due_date: date
    status: str = 'valid'
    notes: str = ''


class CalibrationRecordUpdate(BaseModel):
    calibration_date: Optional[date] = None
    next_due_date: Optional[date] = None
    calibrated_by_vendor: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ── Inventory ─────────────────────────────────────────────────────────────────
class SparePartOut(OrmBase):
    id: int
    name: str
    part_number: str
    description: str
    vendor_id: Optional[int] = None
    unit_cost: float
    quantity_in_stock: int
    minimum_stock_level: int
    location: str
    is_low_stock: Optional[bool] = None
    created_at: datetime
    updated_at: datetime


class SparePartCreate(BaseModel):
    name: str
    part_number: str
    description: str = ''
    vendor_id: Optional[int] = None
    unit_cost: float
    quantity_in_stock: int = 0
    minimum_stock_level: int = 2
    location: str = ''


class SparePartUpdate(BaseModel):
    name: Optional[str] = None
    part_number: Optional[str] = None
    description: Optional[str] = None
    vendor_id: Optional[int] = None
    unit_cost: Optional[float] = None
    quantity_in_stock: Optional[int] = None
    minimum_stock_level: Optional[int] = None
    location: Optional[str] = None


class StockTransactionOut(OrmBase):
    id: int
    part_id: int
    part_name: Optional[str] = None
    transaction_type: str
    quantity: int
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    reference: str
    notes: str
    created_at: datetime


class StockTransactionCreate(BaseModel):
    part: int
    transaction_type: str
    quantity: int
    reference: str = ''
    notes: str = ''


# ── Settings ──────────────────────────────────────────────────────────────────
class CompanySettingsOut(OrmBase):
    id: int
    company_name: str
    tagline: str
    logo: Optional[str] = None
    logo_url: Optional[str] = None
    address: str
    phone: str
    email: str
    primary_color: str
    company_code: str
    department_code: str
    sub_dept_code: str
    equipment_code_prefix: str
    equipment_code_separator: str
    equipment_code_digits: int
    updated_at: datetime


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    primary_color: Optional[str] = None
    company_code: Optional[str] = None
    department_code: Optional[str] = None
    sub_dept_code: Optional[str] = None
    equipment_code_prefix: Optional[str] = None
    equipment_code_separator: Optional[str] = None
    equipment_code_digits: Optional[int] = None


class CustomOptionOut(OrmBase):
    id: int
    field: str
    label: str
    value: str
    sort_order: int
    is_active: bool


class CustomOptionCreate(BaseModel):
    field: str
    label: str
    value: str
    sort_order: int = 0
    is_active: bool = True


class UserPermissionOut(OrmBase):
    id: int
    user_id: int
    instruments_view: bool
    instruments_edit: bool
    calibration_view: bool
    calibration_edit: bool
    service_view: bool
    service_edit: bool
    inventory_view: bool
    inventory_edit: bool
    reports_view: bool


class UserPermissionUpdate(BaseModel):
    instruments_view: Optional[bool] = None
    instruments_edit: Optional[bool] = None
    calibration_view: Optional[bool] = None
    calibration_edit: Optional[bool] = None
    service_view: Optional[bool] = None
    service_edit: Optional[bool] = None
    inventory_view: Optional[bool] = None
    inventory_edit: Optional[bool] = None
    reports_view: Optional[bool] = None


class PDFTemplateOut(OrmBase):
    id: int
    report_type: str
    title: str
    header_text: str
    footer_text: str
    primary_color: str
    accent_color: str
    body_font_size: int
    paper_size: str
    orientation: str
    margin_top: float
    margin_bottom: float
    margin_left: float
    margin_right: float
    include_logo: bool
    show_address: bool
    show_page_number: bool
    show_generated_date: bool
    show_table_borders: bool
    show_alt_row_color: bool
    show_watermark: bool
    watermark_text: str
    show_confidential_banner: bool
    confidential_text: str
    show_signature_block: bool
    signature_label: str
    custom_columns: Any
    updated_at: datetime


class PDFTemplateUpdate(BaseModel):
    title: Optional[str] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    body_font_size: Optional[int] = None
    paper_size: Optional[str] = None
    orientation: Optional[str] = None
    margin_top: Optional[float] = None
    margin_bottom: Optional[float] = None
    margin_left: Optional[float] = None
    margin_right: Optional[float] = None
    include_logo: Optional[bool] = None
    show_address: Optional[bool] = None
    show_page_number: Optional[bool] = None
    show_generated_date: Optional[bool] = None
    show_table_borders: Optional[bool] = None
    show_alt_row_color: Optional[bool] = None
    show_watermark: Optional[bool] = None
    watermark_text: Optional[str] = None
    show_confidential_banner: Optional[bool] = None
    confidential_text: Optional[str] = None
    show_signature_block: Optional[bool] = None
    signature_label: Optional[str] = None
    custom_columns: Optional[Any] = None
