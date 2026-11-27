// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: robotDetail/SaveNameDialog.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Asks for the name of the trajectory file to save, inside the page: window.prompt() would freeze it, with the STOP button in it.
// =============================================================================
import { useEffect, useRef } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';

export function SaveNameDialog({ label, name, onChange, onConfirm, onCancel }: {
  label: string;
  /** null while the dialog is closed. */
  name: string | null;
  onChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const open = name !== null;
  // runs after the effect of the dialog, which focuses Cancel
  useEffect(() => { if (open) input.current?.select(); if (open) input.current?.focus(); }, [open]);
  return (
    <ConfirmDialog
      open={open}
      message={label}
      danger={false}
      details={<input ref={input} type="text" value={name ?? ''} aria-label={label} data-testid="save-name" autoComplete="off" spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(); } }}
        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-slate-200" />}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
