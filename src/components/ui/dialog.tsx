import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className="modal-content">
        <div className="flex items-start justify-between gap-5"><div><Dialog.Title className="text-2xl font-bold">{title}</Dialog.Title>{description && <Dialog.Description className="muted mt-2">{description}</Dialog.Description>}</div>
          <Dialog.Close aria-label="Fechar diálogo" className="icon-button"><X size={20} /></Dialog.Close>
        </div>
        <div className="mt-6">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
