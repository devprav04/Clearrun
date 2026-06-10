import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true, confirmLabel = 'Confirm' }) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${danger ? 'bg-destructive/10 border border-destructive/25' : 'bg-blue-500/10 border border-blue-500/25'}`}>
              <AlertTriangle size={16} className={danger ? 'text-destructive' : 'text-blue-500'} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
              <DialogDescription className="text-xs mt-1">{message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant={danger ? 'destructive' : 'default'} size="sm" onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
