import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, ScrollText, ChevronDown, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ROLE_LABELS = { manager: 'Manager', technician: 'Technician', employee: 'Employee' };
const ROLE_BADGE  = { manager: '#a855f7', technician: '#3b82f6', employee: '#22c55e' };

function getInitials(user) {
  if (!user) return '?';
  return (`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`).toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
}

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username;
  const badgeColor  = ROLE_BADGE[user.role] || 'var(--tx-2)';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 h-auto py-1.5 px-2 hover:bg-[var(--bg-3)]">
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {getInitials(user)}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tx-1)' }}>{displayName}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: 3, color: badgeColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <ChevronDown size={12} color="var(--tx-3)" className="flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 bg-[var(--bg-2)] border-[var(--line-2)]">
        <DropdownMenuLabel className="px-3 py-2">
          <p className="text-sm font-semibold text-[var(--tx-1)]">{displayName}</p>
          <p className="text-xs text-[var(--tx-3)] mt-0.5">{user.email || user.username}</p>
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}30`, padding: '2px 8px', borderRadius: '4px' }}>
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 text-[var(--tx-2)] hover:text-[var(--tx-1)] cursor-pointer">
            <User size={13} strokeWidth={1.8} /><span className="text-sm font-medium">My Profile</span>
          </Link>
        </DropdownMenuItem>
        {user.role === 'manager' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/users" className="flex items-center gap-2.5 px-3 py-2 text-[var(--tx-2)] hover:text-[var(--tx-1)] cursor-pointer">
                <UsersRound size={13} strokeWidth={1.8} /><span className="text-sm font-medium">Manage Users</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/audit-log" className="flex items-center gap-2.5 px-3 py-2 text-[var(--tx-2)] hover:text-[var(--tx-1)] cursor-pointer">
                <ScrollText size={13} strokeWidth={1.8} /><span className="text-sm font-medium">Activity Log</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem
          className="flex items-center gap-2.5 px-3 py-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={13} strokeWidth={1.8} /><span className="text-sm font-medium">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
